# AI Layer

Documentation for the **AI layer** (`src/modules/ai/`): the five AI components behind the
discovery loop, what they produce, and the shapes the rest of the backend consumes.

**Status:** implemented and exercised end to end.

| Script | Purpose |
|---|---|
| `python ai_smoke_test.py` | Runs the whole loop and prints every component's output |
| `python test_ai_layer.py` | Asserts the live-model parsing path using a fake provider (no key, no network) |
| `python demo_loop.py` | The whole product loop against the real catalogue and engine |

The two are complementary: without a key the smoke test runs the fallbacks, so the parsing
logic that executes during a real demo is only covered by `test_ai_layer.py`.

## Quick start

```bash
pip install -r requirements.txt
cp config.toml.example config.toml   # if you do not already have one
python ai_smoke_test.py
```

It runs with no API key, using the deterministic fallbacks described in §6. To enable live
model calls, put a free [Google AI Studio](https://aistudio.google.com) key under `[ai]` in
`config.toml`.

```python
from src.modules.ai import generate_profile, extract_context, generate_explanation, \
    analyse_reflection, companion_reply

profile = await generate_profile(questionnaire)
context = await extract_context("I have two hours free tonight and I'm tired")
why     = await generate_explanation(profile, activity, Tier.EXPLORE)
signals = await analyse_reflection(reflection, activity, profile)
reply   = await companion_reply("I'm bored", history, profile)
```

---

## 1. Scope boundary

The AI layer is exactly five components. Everything else named here is documented only so the
boundary is unambiguous — those pieces are not built yet.

| Component | Owner | Module |
|---|---|---|
| Profile Generator | **AI layer** | `ai/profile_generator.py` |
| Context Extractor | **AI layer** | `ai/context_extractor.py` |
| Explanation Generator | **AI layer** | `ai/explanation_generator.py` |
| Reflection Analyser | **AI layer** | `ai/reflection_analyser.py` |
| Companion Conversation | **AI layer** | `ai/companion.py` |
| Discovery Engine scoring / tiering | built | `src/modules/discovery.py` |
| Activity catalogue data | built | `scripts/seed.sql` + `src/modules/catalogue.py` |
| Profile update maths | *not built* | — |
| Tables, endpoints, UI | *not built* | — |

The AI layer is **stateless and persistence-free**. It never touches the database, never reads
`app()`, and knows nothing about users or auth. Callers load data, pass it in, and persist what
comes back.

---

## 2. Module layout

```
backend/src/modules/ai/
├── __init__.py                 # public surface — import from here only
├── types.py                    # every dataclass/enum in this document
├── provider.py                 # Gemini client, model choice, retries, JSON-schema calls
├── fallbacks.py                # deterministic non-LLM implementations
├── profile_generator.py
├── context_extractor.py
├── explanation_generator.py
├── reflection_analyser.py
└── companion.py
```

Callers import the five functions and the types from `src.modules.ai` and nothing deeper.

---

## 3. Shared vocabulary

### 3.1 Dimensions — the frozen key set

Seven dimensions, each a float in `[0.0, 1.0]` where `0.5` is neutral. Taken verbatim from §13
of the product document.

```python
DIMENSIONS = (
    "creative",           # making, expressing, aesthetic
    "analytical",         # systems, problem-solving, logic
    "hands_on",           # physical making and manipulation
    "physical",           # bodily exertion / active vs relaxed
    "social",             # 0.0 = strongly solo, 1.0 = strongly social
    "outdoor",            # 0.0 = strongly indoor, 1.0 = strongly outdoor
    "novelty_tolerance",  # appetite for the unfamiliar
)
```

`creative` and `analytical` are **independent axes, not opposite ends of one**. A user can be
high on both. This matters — see §4.1.

`types.py` also exports three helpers over this vocabulary: `empty_dimensions()`,
`normalise_dimensions(values)` and `nudge(value, amount)`.

These seven names are also the `TAGS` table in the database, and they double as an activity's
"categories" — there is one vocabulary, not two.

**This tuple is the contract.** The catalogue must tag activities with these exact keys, the
Discovery Engine scores against them, and the AI layer reads and writes them. Renaming one means
touching the catalogue, the engine and this layer together.

### 3.2 Enums

```python
class BudgetLevel(StrEnum):   FREE, LOW, MEDIUM, HIGH
class EnergyLevel(StrEnum):   LOW, MEDIUM, HIGH
class SocialContext(StrEnum): SOLO, WITH_FRIEND, GROUP, FAMILY, DATE
class Tier(StrEnum):          FAMILIAR, EXPLORE, WILDCARD
class Direction(StrEnum):     POSITIVE, NEGATIVE
class Strength(StrEnum):      WEAK, MODERATE, STRONG
class Intent(StrEnum):        ACTIVITY_DISCOVERY, CURIOSITY, REFLECTION, SMALL_TALK, UNCLEAR
class CompanionAction(StrEnum): NONE, REQUEST_RECOMMENDATIONS, ASK_FOLLOW_UP, START_QUEST, PROMPT_REFLECTION
```

### 3.3 `DiscoveryProfile`

Produced by the Profile Generator, consumed by every other component and by the Discovery Engine.
A single JSON column is fine for persistence — the product document explicitly endorses this.

```python
@dataclass(frozen=True)
class DiscoveryProfile:
    dimensions: dict[str, float]        # all 7 DIMENSIONS keys, always present, 0.0–1.0
    stated_interests: list[str]         # from onboarding — "photography", "cafés"
    emerging_interests: list[str]       # discovered through reflection; starts empty
    underexplored: list[str]            # categories with little/no evidence
    typical_duration_minutes: int | None
    budget_level: BudgetLevel | None
    summary: str                        # one line, user-facing: "Creative • Independent • Relaxed"
    fallback_used: bool                 # True when produced without a live model call
```

`dimensions` is guaranteed complete and clamped. Callers never need to handle a missing key —
`normalise_dimensions()` drops unknown keys and fills missing ones with neutral.

`fallback_used` appears on `DiscoveryProfile`, `DiscoveryContext`, `ReflectionAnalysis` and
`CompanionReply`. See §6.

### 3.4 `Activity` — required of the catalogue

The AI layer consumes this; it does not produce it. The catalogue must supply:

```python
@dataclass(frozen=True)
class Activity:
    id: str
    name: str
    description: str
    categories: list[str]
    attributes: dict[str, float]        # DIMENSIONS keys — the activity's own profile
    duration_min: int                   # minutes
    duration_max: int
    cost_level: BudgetLevel
    difficulty: int                     # 1–5
    related_interests: list[str]        # for novelty adjacency, e.g. ["photography", "drawing"]
```

**Design decision:** the catalogue is fully generic and location-agnostic — no city-specific
assumptions, so it works anywhere a judge runs it. It lives in the database; `catalogue.py` reads
`TASKS` plus their tag values and returns these objects. See
[discovery_engine.md](discovery_engine.md).

---

## 4. The five components

All five are `async def`, running on the SDK's native async client (`client.aio`) so nothing
blocks the event loop.

Every component has a deterministic fallback (§6); none of them raise on provider failure.

### 4.1 Profile Generator

```python
async def generate_profile(response: QuestionnaireResponse) -> DiscoveryProfile
```

Converts onboarding answers into the initial structured profile.

**Why this is an LLM job and not a lookup table:** FR1 asks a single creative-vs-analytical
slider, but §13 requires `creative` and `analytical` as independent values. Resolving that needs
the free-text interests read alongside the sliders — someone answering "balanced" who lists
*photography, chess and woodworking* should come out high on creative, analytical **and**
hands_on. A slider-to-dimension lookup cannot do this. The same pass derives `underexplored` by
finding which categories the stated interests leave untouched.

**Questionnaire the onboarding UI must collect** (covers FR1; these field names are the
contract, and the low end of each slider is named so the UI and the generator cannot drift):

| id | Question | Answer shape |
|---|---|---|
| `interests` | What do you already enjoy? | `list[str]` — chips + free text |
| `activity_types` | Which appeal to you? | `list[str]` — multi-select categories |
| `indoor_outdoor` | Indoors or outdoors? | `int` 1–5 (1 = indoor) |
| `solo_social` | Alone or with people? | `int` 1–5 (1 = solo) |
| `active_relaxed` | Active or relaxed? | `int` 1–5 (1 = relaxed) |
| `creative_analytical` | Creative or analytical? | `int` 1–5 (1 = creative) |
| `time_availability` | Typical free time? | `int` minutes (30/60/120/240) |
| `budget` | Usual spend? | `BudgetLevel` |
| `novelty` | Appetite for the unfamiliar? | `int` 1–5 |

```python
@dataclass(frozen=True)
class QuestionnaireResponse:
    interests: list[str]
    activity_types: list[str]
    indoor_outdoor: int
    solo_social: int
    active_relaxed: int
    creative_analytical: int
    time_availability_minutes: int
    budget: BudgetLevel
    novelty: int
```

### 4.2 Context Extractor

```python
async def extract_context(message: str, profile: DiscoveryProfile | None = None) -> DiscoveryContext
```

Turns a companion message into structured constraints (FR6).

```python
@dataclass(frozen=True)
class DiscoveryContext:
    intent: Intent
    duration_minutes: int | None
    budget_level: BudgetLevel | None
    energy_level: EnergyLevel | None
    social_context: SocialContext | None
    when: str | None                  # free text: "tonight", "tomorrow afternoon"
    activity_preference: list[str]    # ["creative", "relaxing"]
    novelty_appetite: float | None    # 0.0–1.0, a transient override for novelty_tolerance
    missing_fields: list[str]         # what a follow-up question could usefully resolve
    confidence: float                 # 0.0–1.0
```

**Critical rule (FR6):** context **supplements and never overwrites** the profile. It is returned
as a separate object with `None` for everything not stated, precisely so the Discovery Engine can
layer it on top for one request without mutating stored preferences. Do not merge it into a
`DiscoveryProfile` and persist the result.

`missing_fields` is what drives the companion's follow-up questions — for *"I'm bored, give me
something to do"* it returns roughly everything, which is the signal to ask rather than guess.

### 4.3 Explanation Generator

```python
async def generate_explanation(
    profile: DiscoveryProfile,
    activity: Activity,
    tier: Tier,
    context: DiscoveryContext | None = None,
) -> str
```

One or two sentences of user-facing "Why this?" (FR4). Returns plain text, no markdown.

Tone shifts by tier, because the honest reason differs: Familiar names the existing interest;
Explore names the shared underlying trait and the new element; Wildcard leads with the deeper
behavioural connection, since the surface activity looks unrelated. It must cite something real
from the profile — a generic "this looks fun!" is a failure of this component.

Results are cacheable on `(profile_version, activity.id, tier)`; the engine author may cache to
cut call volume during a demo.

### 4.4 Reflection Analyser

```python
async def analyse_reflection(
    reflection: ReflectionInput,
    activity: Activity,
    profile: DiscoveryProfile,
) -> ReflectionAnalysis
```

```python
@dataclass(frozen=True)
class ReflectionInput:
    rating: int                  # 1–5
    would_repeat: bool
    perceived_difficulty: int    # 1–5
    text: str | None             # optional free-text reflection

@dataclass(frozen=True)
class PreferenceSignal:
    dimension: str | None        # a DIMENSIONS key, or None for an interest-only signal
    interest: str | None         # free-text tag, e.g. "hands-on creation"
    direction: Direction
    strength: Strength
    evidence: str                # the phrase that justified it — shown in the UI

@dataclass(frozen=True)
class ReflectionAnalysis:
    signals: list[PreferenceSignal]
    discovered_summary: str      # user-facing: "You may enjoy hands-on creative activities more than we thought"
    surprised: bool              # did the outcome contradict the prediction?
```

FR10 requires distinguishing strong from weak evidence, hence `Strength`. *"It was fine"* at 3/5
yields weak signals; *"I didn't expect to enjoy this much — I loved making something with my
hands"* at 5/5 yields a strong `hands_on` positive plus a `creative` moderate.

**This component emits signals; it does not apply them.** Applying them belongs to the
profile-update logic. A suggested mapping:

| Strength | Δ per signal |
|---|---|
| weak | ±0.03 |
| moderate | ±0.07 |
| strong | ±0.12 |

Apply them with `nudge(value, amount)` from `types.py` rather than by plain addition. Addition
saturates: three positive signals in a row pin a dimension at 1.00, erasing the difference
between a mild preference and a defining one, and a dimension stuck at the bound can never
register a later negative signal proportionately. `nudge` scales the step by the remaining
headroom, so evidence about something already believed moves little while evidence about
something uncertain moves more.

One consequence worth knowing for the demo: headroom scaling makes individual changes *smaller*.
That is correct behaviour, but FR12 wants the before/after difference to be plainly visible, so
the weights above may need raising for demo purposes.

FR11's anti-bubble guard also matters here: a positive `hands_on` signal should lift
`novelty_tolerance` slightly too, so a success *widens* the search rather than narrowing it onto
whatever just worked.

### 4.5 Companion Conversation

```python
async def companion_reply(
    message: str,
    history: list[ChatTurn],
    profile: DiscoveryProfile,
    recommendations: list[Activity] | None = None,
) -> CompanionReply
```

```python
@dataclass(frozen=True)
class ChatTurn:
    role: Literal["user", "companion"]
    content: str

@dataclass(frozen=True)
class CompanionReply:
    message: str
    context: DiscoveryContext | None    # extracted from this turn, if any
    action: CompanionAction
    follow_up_question: str | None
```

Per §7 the companion is **an interface to the Discovery Engine, not a second brain.** It never
invents activities. When `action == REQUEST_RECOMMENDATIONS` the caller runs the Discovery Engine
with the returned `context` and calls back with `recommendations` populated so the companion can
present them in its own voice.

Flow: `message → extract context → decide action → (caller runs engine) → conversational reply`.

---

## 5. Configuration

Added per `code_standards.md` — typed dataclass, `SCHEMA` entry, and `config.toml.example`.

```toml
[ai]
#provider = "gemini"                    # gemini | stub
#api_key = "your-ai-studio-key"
#model = "gemini-3.8-flash"             # reasoning: profile, reflection, companion
#fast_model = "gemini-3.5-flash-lite"   # cheap: context extraction, explanations
#timeout_seconds = 20
#max_retries = 2
```

Free API key from [aistudio.google.com](https://aistudio.google.com). Dependency:
`google-genai` added to `requirements.txt`.

**Two notes on the free tier.** Content submitted on it *is* used to improve Google's products —
fine for synthetic demo profiles, so keep anything real out of it. And rate limits are per-project
and visible at [aistudio.google.com/rate-limit](https://aistudio.google.com/rate-limit); check
them before demo day, because a live demo tripping a per-minute cap is the classic way this
fails.

Structured output is used throughout: each component defines a Pydantic model and passes its
JSON schema to the API, which guarantees schema-valid responses. No prose parsing anywhere.

`provider.py` is the only file that imports the Gemini SDK, so swapping to Bedrock or Anthropic
later is a single-file change.

---

## 6. Failure behaviour

**No AI component ever raises to its caller, and none blocks the demo.** On timeout, rate limit,
malformed response or `provider = "stub"`, each falls back to a deterministic implementation in
`fallbacks.py`:

| Component | Fallback |
|---|---|
| Profile Generator | Arithmetic slider→dimension mapping; keyword match on interests |
| Context Extractor | Regex/keyword extraction of duration, budget, energy, social words |
| Explanation Generator | Template naming the highest-scoring shared dimension |
| Reflection Analyser | Signals derived from rating + the activity's own attributes |
| Companion | Canned reply that routes to the engine or asks a fixed follow-up |

Degraded results carry `fallback_used = True` so the API layer can surface it in logs. This also
means the whole product runs end-to-end with no API key at all — useful for teammates who haven't
set one up, and insurance if the venue wifi dies mid-demo.

---

## 7. Open items

These cross the layer boundary and still need deciding:

1. **Profile versioning.** Cache keys for explanations and the FR12 before/after comparison both
   want a monotonic `profile_version` on the profile row. Cheap now, awkward to retrofit.
2. **Signal persistence.** The TODO lists a `profile_signals` table. Storing raw signals rather
   than only the applied deltas is what makes "here's what we learned about you" demonstrable.
3. **FR12 demo delta.** The before/after recommendation change must be *visibly* obvious. Worth
   a seeded demo user whose reflection is known to move the tiers, plus the weight-tuning note
   in §4.4.
4. **Rate limits before demo day.** Free-tier limits are per-project and only visible at
   [aistudio.google.com/rate-limit](https://aistudio.google.com/rate-limit). The fallbacks mean a
   cap degrades quality rather than breaking the demo, but check anyway.
5. **Remaining boilerplate defect.** `modules/users.py:24` queries the dataclass `User` rather
   than the ORM model, so `User.c` raises `AttributeError` on any call; `code_standards.md` shows
   the correct `Session` + `UserRow` form. (The `config.toml.example` `postgresql`/`postgres`
   mismatch was fixed in passing while adding the `[ai]` section.)

---

## 8. What is not built

The AI layer is complete and exercised end to end, but it is one layer of the MVP. Still
outstanding, in the order the product document's loop needs them:

| # | Piece | Why it blocks the loop |
|---|---|---|
| 1 | Profile persistence (profiles, signals tables) | Profiles are rebuilt per request, never stored |
| 2 | Profile update logic | `demo_loop.py` applies signals inline; needs a real home |
| 3 | Quest tables and endpoints | No way to start or complete a quest |
| 4 | Frontend pages | No demo UI |

The catalogue and Discovery Engine are built — see [discovery_engine.md](discovery_engine.md).
Tasks, tags, users and completions already have tables, courtesy of the team's `dev` work.
