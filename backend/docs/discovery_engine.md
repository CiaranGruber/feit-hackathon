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

46 activities in `src/data/activities.json`, generic and location-agnostic so they work
wherever the demo is run.

```python
from src.modules.catalogue import load_activities, get_activity, all_categories
```

Each entry carries the seven `DIMENSIONS` attributes, categories, a duration range, cost level,
difficulty and `related_interests`. Attributes are normalised on load, so a typo in the data
cannot produce a missing key that breaks scoring at request time.

Coverage (activities scoring ≥ 0.6 on each dimension):

| Dimension | Count |
|---|---|
| novelty_tolerance | 22 |
| hands_on | 18 |
| creative | 15 |
| outdoor | 13 |
| analytical | 9 |
| social | 9 |
| physical | 7 |

24 of the 46 are free and 32 are difficulty 1–2, so a cautious or broke user still gets a full
set of three. `physical` is the thinnest at 7, which is worth knowing if you demo with a
sports-heavy profile.

Activities live in JSON rather than the database because the schema does not exist yet. When it
does, this module becomes the seeder and callers do not change.

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
| No overlap with their known interests | 0.40 |
| Category not yet explored | 0.35 |
| Distance from their dimensions | 0.25 |

Interest and category novelty outweigh dimension distance deliberately. If novelty were mostly
dimension distance it would collapse into "bad fit", and Wildcard would just surface whatever
suits the user least.

A category never completed but not flagged underexplored scores **0.55**, not higher. On day one
a user has completed nothing, so treating every category as strongly novel puts a floor under the
score that the Familiar tier can never reach — the tier then collapses into pure preference fit.

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
category already used by an earlier pick in the same set costs 0.12 (FR13).

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

Observed novelty for a fresh profile runs roughly 0.35 → 0.60 → 0.78 across the three tiers.

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

## 7. What is not built

| # | Piece | Why it blocks the loop |
|---|---|---|
| 1 | Database tables | Nothing persists between requests |
| 2 | Profile update module | `demo_loop.py` applies signals inline; needs a real home |
| 3 | API endpoints | The frontend has nothing to call |
| 4 | Frontend pages | No demo UI |

Quest creation and completion (FR7, FR8) are thin once the tables exist: a quest is an activity
plus a status and a reward.
