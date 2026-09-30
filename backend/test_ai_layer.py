"""
AI Layer tests.

Exercises the LIVE-MODEL code path using a fake provider, with no network call and no API
key. This covers the response-parsing logic that ``ai_smoke_test.py`` cannot reach, since
that script runs the deterministic fallbacks whenever no key is configured - meaning the
code that actually runs during a demo would otherwise never be executed by either script.

Run with `python test_ai_layer.py` from the backend directory.
"""

import asyncio
from pathlib import Path

from src import DEFAULT_CONFIG_FILE
from src.config import parse_config

parse_config(DEFAULT_CONFIG_FILE if Path(DEFAULT_CONFIG_FILE).is_file() else Path("config.toml"))

from src.modules.ai import types as T
from src.modules.ai import (profile_generator as pg, context_extractor as ce,
                            explanation_generator as eg, reflection_analyser as ra,
                            companion as co)

# generate_explanations resolves the provider through its own module reference.

class FakeProvider:
    """Returns canned, schema-valid replies exactly as the real model would."""
    def __init__(self, payloads): self.payloads = payloads; self.calls = []
    async def generate_json(self, *, system, prompt, schema, fast=False):
        self.calls.append((schema.__name__, fast))
        return schema.model_validate(self.payloads[schema.__name__])
    async def generate_text(self, *, system, prompt, fast=False):
        self.calls.append(("text", fast))
        return '  "You enjoy visual creativity and independent work."  '

PAYLOADS = {
    "_ProfileSchema": dict(creative=0.85, analytical=0.62, hands_on=0.71, physical=0.25,
        social=0.3, outdoor=0.55, novelty_tolerance=0.6,
        normalised_interests=["photography","drawing","coffee"],
        underexplored=["performance","nature","physical"], summary="Creative • Independent • Relaxed"),
    "_ContextSchema": dict(intent="activity_discovery", duration_minutes=120, budget_level="low",
        energy_level="low", social_context="unknown", when="tonight",
        activity_preference=["relaxing"], novelty_appetite=-1.0,
        missing_fields=["social_context"], confidence=0.9),
    "_ReflectionSchema": dict(signals=[
        dict(dimension="hands_on", interest="", direction="positive", strength="strong",
             evidence="I really liked making something with my hands"),
        dict(dimension="none", interest="pottery", direction="positive", strength="moderate",
             evidence="Rated 5/5 and would repeat"),
        dict(dimension="none", interest="", direction="positive", strength="weak", evidence="dropped: no subject"),
    ], discovered_summary="You may enjoy hands-on creative work more than we thought.", surprised=True),
    "_CompanionSchema": dict(message="Let me find something for you.",
        action="request_recommendations", follow_up_question=""),
}

def patch_all(provider):
    """Swaps the provider lookup in every component module.

    Each component imports ``get_provider`` into its own namespace, so the patch has to be
    applied per module rather than once at the source.
    """
    for mod in (pg, ce, eg, ra, co):
        mod.get_provider = lambda: provider

async def main():
    fake = FakeProvider(PAYLOADS); patch_all(fake)

    q = T.QuestionnaireResponse(interests=["photography"], activity_types=["creative"],
        indoor_outdoor=3, solo_social=2, active_relaxed=2, creative_analytical=2,
        time_availability_minutes=120, budget=T.BudgetLevel.LOW, novelty=3)
    p = await pg.generate_profile(q)
    assert p.fallback_used is False, "should not have fallen back"
    assert set(p.dimensions) == set(T.DIMENSIONS), "dimension keys wrong"
    assert abs(p.dimensions["creative"] - 0.85) < 1e-9
    print(f"profile     OK  fallback={p.fallback_used} creative={p.dimensions['creative']} summary={p.summary!r}")

    c = await ce.extract_context("I have two hours free tonight")
    assert c.fallback_used is False
    assert c.social_context is None, "'unknown' sentinel must become None"
    assert c.novelty_appetite is None, "-1.0 sentinel must become None"
    assert c.budget_level is T.BudgetLevel.LOW and c.duration_minutes == 120
    print(f"context     OK  sentinel->None: social={c.social_context} novelty={c.novelty_appetite}; budget={c.budget_level}")

    act = T.Activity(id="a", name="Urban Sketching", description="d", categories=["creative"],
        attributes={"creative":0.8,"hands_on":0.7}, duration_min=30, duration_max=60,
        cost_level=T.BudgetLevel.FREE, difficulty=2, related_interests=["drawing"])
    why = await eg.generate_explanation(p, act, T.Tier.EXPLORE)
    assert not why.startswith('"') and not why.endswith('"'), "quotes not stripped"
    assert why == "You enjoy visual creativity and independent work."
    print(f"explanation OK  stripped+trimmed -> {why!r}")

    r = await ra.analyse_reflection(T.ReflectionInput(rating=5, would_repeat=True,
        perceived_difficulty=3, text="loved it"), act, p)
    assert r.fallback_used is False and r.surprised is True
    assert len(r.signals) == 2, f"subjectless signal should be dropped, got {len(r.signals)}"
    assert r.signals[0].dimension == "hands_on" and r.signals[1].interest == "pottery"
    print(f"reflection  OK  kept {len(r.signals)}/3 signals (subjectless dropped), surprised={r.surprised}")

    rep = await co.companion_reply("I'm bored", [], p)
    assert rep.fallback_used is False
    assert rep.action is T.CompanionAction.REQUEST_RECOMMENDATIONS
    assert rep.context is not None, "companion must attach extracted context"
    assert rep.follow_up_question is None, "follow_up only when action is ask_follow_up"
    print(f"companion   OK  action={rep.action.value} context_attached={rep.context is not None} follow_up={rep.follow_up_question}")

    # Batched explanations: one call for the whole set, mapped back by activity id.
    batch_payload = {"_BatchSchema": {"explanations": [
        {"activity_id": "b", "explanation": "second line"},
        {"activity_id": "a", "explanation": '"first line"'},
    ]}}
    batch = FakeProvider(batch_payload); patch_all(batch)
    act_b = T.Activity(id="b", name="Other", description="d", categories=["social"],
        attributes={"social": 0.8}, duration_min=30, duration_max=60,
        cost_level=T.BudgetLevel.FREE, difficulty=1, related_interests=[])
    act_a = T.Activity(id="a", name="First", description="d", categories=["creative"],
        attributes={"creative": 0.8}, duration_min=30, duration_max=60,
        cost_level=T.BudgetLevel.FREE, difficulty=1, related_interests=[])
    lines = await eg.generate_explanations(p, [(act_a, T.Tier.FAMILIAR), (act_b, T.Tier.EXPLORE)])
    assert lines == ["first line", "second line"], f"out-of-order reply not remapped: {lines}"
    assert len(batch.calls) == 1, f"batch should be one call, made {len(batch.calls)}"
    print(f"batch       OK  2 explanations in {len(batch.calls)} call, remapped by id, quotes stripped")

    # An id the model omits falls back for that activity only.
    partial = FakeProvider({"_BatchSchema": {"explanations": [
        {"activity_id": "a", "explanation": "only a"}]}}); patch_all(partial)
    lines = await eg.generate_explanations(p, [(act_a, T.Tier.FAMILIAR), (act_b, T.Tier.EXPLORE)])
    assert len(lines) == 2 and lines[0] == "only a" and lines[1], "missing id not backfilled"
    print(f"batch gaps  OK  omitted id fell back to a template, other line preserved")

    print(f"\nmodel calls: {fake.calls}")
    fast = [c for c in fake.calls if c[1]]
    print(f"used fast model for {len(fast)}/{len(fake.calls)} calls (context, explanation, companion)")
    print("\nAll live-path assertions passed.")

if __name__ == "__main__":
    asyncio.run(main())
