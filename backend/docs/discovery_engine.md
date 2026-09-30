# Discovery Engine and Catalogue

Documentation for `src/modules/discovery.py` and `src/modules/catalogue.py`: how activities
are stored, scored, and split into Familiar, Explore and Wildcard recommendations (FR3, FR13,
FR14).

**Status:** implemented. Run `python demo_loop.py` from `backend/` to see the whole loop.

---

## 1. Why this is not an LLM call

Section 13 of the product document sets the governing principle: *AI provides reasoning and
interpretation, while structured data provides consistency and control.* Selection is therefore
arithmetic over the profile and the catalogue. The AI layer writes the "Why this?" prose
afterwards — it does not choose.

Three things this buys, all of which matter for the demo:

- **Reproducibility.** The same profile and context always produce the same three activities,
  so a demo cannot surprise you on stage.
- **Inspectability.** Every recommendation carries a `ScoreBreakdown` showing exactly why it
  won, which is the difference between showing a judge a system and showing them a black box.
- **A provable FR12.** When recommendations change after a reflection, the change is traceable
  to specific profile movement rather than to model temperature.

---

## 2. The catalogue

30 tasks in the SQLite database, seeded from `scripts/seed.sql`. Generic and
location-agnostic so they work wherever the demo is run.

```python
from src.modules.catalogue import load_activities, get_activity, find_activity
```

`catalogue.py` reads the database and returns `Activity` objects. **Terminology:** a *task* in
the database is an *activity* to the engine, and a *tag* is one of the seven dimensions.

It deliberately does not reuse `tasks.py:get_available_tasks()`. That function serves the API —
it aggregates user feedback and omits the task id, while the engine needs the id for
deduplication and quest records plus the duration, cost and difficulty columns. Two readers over
the same tables lets the API shape and the engine shape change independently.

Coverage (tasks scoring ≥ 0.6 on each dimension):

| Dimension | Count |
|---|---|
| novelty_tolerance | 15 |
| creative | 11 |
| hands_on | 9 |
| social | 8 |
| outdoor | 8 |
| analytical | 6 |
| physical | 4 |

19 of the 30 are free and 21 are difficulty 1–2, so a cautious or low-budget user still gets a
full set of three. **`physical` is thin at 4**, which noticeably weakens Wildcards for
sports-heavy profiles — the first place to add tasks if recommendations feel repetitive.

---

## 3. Scoring

Section 6 of the product document gives the shape:

```
Discovery Score = Preference Fit + Context Fit + Novelty + Diversity − Previous Exposure
```

### Preference fit

Agreement between profile and activity across the seven dimensions, **weighted by salience** —
how far the activity sits from neutral on each. An activity indifferent about `social` cannot
drag the score around for a strongly solo user; one that is emphatically social will.

### Novelty

How new this is *to this user*, from three sources:

| Source | Weight |
|---|---|
| Subject matter unfamiliar to them | 0.40 |
| Dimension not yet explored | 0.35 |
| Distance from their dimensions | 0.25 |

Interest familiarity **saturates** rather than being a ratio of matches to tags. A proportional
measure punishes well-described activities: urban sketching tagged `drawing, art, observation`
would read as two-thirds novel to someone who draws, purely because it also lists two tags they
happen not to have. One match against a stated hobby means the activity is largely familiar
(0.75), and further matches add less.

Interest and category novelty outweigh dimension distance deliberately. If novelty were mostly
dimension distance it would collapse into "bad fit", and Wildcard would just surface whatever
suits the user least.

A dimension never completed but not flagged underexplored scores **0.55**, not higher. On day one
a user has completed nothing, so treating everything as strongly novel puts a floor under the
score that the Familiar tier can never reach — the tier then collapses into pure preference fit.

There is one vocabulary, not two. An activity's "categories" are the dimensions it is genuinely
about (value ≥ 0.6, from `TASK_TAGS` ordered weakest-first), and a profile's `underexplored` uses
the same seven names. The engine compares them by exact string match.

### Connection

The strongest genuine link between user and activity, counting **only dimensions the activity
actually exercises** (attribute ≥ 0.6). This is what stops a Wildcard being random: a
mostly-physical activity cannot claim a connection through a trait it barely involves. An
adjacent interest also counts, even without a shared dimension.

### Context fit

Duration and budget are **hard constraints** — no explanation makes a $60 class work for someone
who said they have no money, so infeasible activities are dropped rather than ranked low.
Energy, social setting and stated preferences are soft penalties. With no context supplied the
profile's usual time and budget are used instead, so the browsing and companion paths share one
function.

### Exposure and diversity

Completed activities are excluded. Recently shown ones lose 0.25. Disliked ones lose 0.45 but are
**never excluded** — FR14 is explicit that a rejection is a signal, not a permanent ban. Each
dimension already used by an earlier pick in the same set costs 0.12 (FR13).

---

## 4. Tiers

Every tier uses the same formula. What changes is how much novelty it is aiming for, and
candidates are scored on **closeness to that target** rather than more-is-better.

| Tier | Novelty target | Preference | Context | Novelty | Connection | Min connection |
|---|---|---|---|---|---|---|
| Familiar | 0.25 | 0.50 | 0.30 | 0.20 | 0.00 | 0.00 |
| Explore | 0.50 | 0.35 | 0.25 | 0.30 | 0.10 | 0.25 |
| Wildcard | 0.85 | 0.10 | 0.20 | 0.40 | 0.30 | 0.35 |

Weights sum to 1.0 so scores stay comparable. Wildcard carries both the heaviest connection
weight and a hard floor, which is how "not random" is enforced rather than just intended.

Tiers fill in order Familiar → Explore → Wildcard, so later picks are steered away from
categories already used. If no candidate clears a tier's connection floor the floor is relaxed
rather than returning an empty tier: a weakly connected Wildcard beats no Wildcard.

Observed novelty for a fresh profile runs roughly 0.33 → 0.60 → 0.80 across the three tiers.

The ladder is an emergent property, not an enforced constraint, so it can invert. A social
foodie's Explore pick came out at 0.28 against a Familiar of 0.35, because "Cook an unfamiliar
cuisine" shares the tag `cooking` with their stated interests and so reads as familiar even
though the novelty is in the word *unfamiliar*. The picks were still sensible; forcing
monotonicity would cost better candidates.

---

## 5. Usage

```python
from src.modules.discovery import recommend, explain, DiscoveryHistory

# Synchronous selection, no model calls
picks = recommend(profile, context=context, history=history)

# Optional: attach "Why this?" lines via the AI layer
picks = await explain(profile, picks, context)
```

Selection is deliberately synchronous and separate from `explain`, so it stays testable and
callers that do not need prose can skip the model calls entirely.

`DiscoveryHistory` carries `completed_ids`, `recently_shown_ids`, `disliked_ids` and
`completed_categories`. All are optional; an empty history is the new-user case.

---

## 6. Tuning

Everything adjustable sits at the top of `discovery.py` as named constants: `TIER_WEIGHTS`,
`DIVERSITY_PENALTY`, `RECENTLY_SHOWN_PENALTY`, `DISLIKED_PENALTY`.

If the FR12 before/after difference looks too subtle when demoing, the first lever is
`SIGNAL_WEIGHTS` in the AI layer (how far one reflection moves a profile), not these weights.

---

## 7. Schema additions

Five columns were added to `TASKS` for the engine:

| Column | Why |
|---|---|
| `duration_min`, `duration_max` | Hard constraint — "I have two hours" must filter (FR6) |
| `cost_level` | Hard constraint — "I don't want to spend much" must filter (FR6) |
| `difficulty` | Quest display and reward sizing (FR7) |
| `related_interests` | Comma-separated tags, compared against the user's stated interests for novelty |

`TAG_NAME_LENGTH` also went from 16 to 32, because `novelty_tolerance` is 17 characters.

`TASK_TAG_RELATIONSHIPS` needed no change — `(task_id, tag_id, value 0–1)` is already exactly the
shape the engine wants. Its **values** were re-authored, though: they had been derived from tag
position (`value = (position + 1) / tag_count`), so *Sunset walk* scored `outdoor 0.33`. Position
carries no information about strength, and the engine compares these directly against a user's
profile. They are now authored per task, where 0.5 means the task is indifferent, 1.0 strongly
this, and 0.0 strongly the opposite.

## 8. Profiles and persistence

`src/modules/profiles.py` stores the user side of the loop and owns the profile-update maths.

| Function | Does |
|---|---|
| `load_profile` / `save_profile` | Read and write `USER_PROFILES`; saving bumps a monotonic `version` |
| `record_signals` / `get_signals` | Append to and read `PROFILE_SIGNALS` |
| `apply_signals` | Folds signals into a profile (FR11) |
| `get_history` | Builds `DiscoveryHistory` from `USER_TASK_COMPLETIONS` (FR13) |

Two rules shape `apply_signals`:

**Movement uses `nudge`, not addition.** A step is a fraction of the remaining headroom, so
repeated evidence cannot saturate a dimension, evidence about something already strongly
believed moves it little, and a dimension at the bound can still register a later negative
signal.

**A positive signal also lifts `novelty_tolerance`** by `NOVELTY_SPILLOVER` (0.4) of its step.
That is FR11's anti-bubble rule: discovering you like making things should open woodworking,
cooking and gardening — not narrow everything to pottery.

A completion rated 1 or 2 counts as disliked in `get_history`, so the engine penalises similar
activities without excluding the category outright (FR14).

Three tables carry this. `USER_PROFILES` and `PROFILE_SIGNALS` are new; `USER_TASK_COMPLETIONS`
gained nullable `would_repeat` and `perceived_difficulty` for FR9, and `tasks.complete_task()`
takes them as optional arguments.

## 9. What is not built

| # | Piece | Why it blocks the loop |
|---|---|---|
| 1 | API endpoints for discovery | The frontend has nothing to call |
| 2 | Quest records | A completion is stored, but not the "started" state (FR7) |
| 3 | Recommendation history | `recently_shown_ids` is passed in, not persisted (FR13) |
| 4 | Frontend pages | No demo UI |

Quest creation is thin now that completions persist: it needs a status column and a reward.
