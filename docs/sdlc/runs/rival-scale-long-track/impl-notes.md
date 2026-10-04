# Impl notes — rival-scale-long-track

- **Plan:** `docs/runs/rival-scale-long-track/plan.md` (approved 2026-10-04 — human “approve”; gate defaults ~5.5× / longer smoke timeouts / player scale 28 / one rival)
- **Date:** 2026-10-04
- **Branch:** `cursor/rival-scale-long-track-6621` (from `main` post PR #3)
- **Repo mirror:** `docs/sdlc/runs/rival-scale-long-track/impl-notes.md`
- **PR:** _(filled after draft)_

## Summary

Equalized rival truck on-screen size with the player’s fixed arcade scale (~28) via a shared `truckScaleFromRoadHalf` helper, and stretched the curved delivery course to **~5.5×** post–PR #3 length (1075 → **5911** segments). Still one rival, finish-at-gate, light WASD, DE/EN, 2D Atari. Smoke timeouts/min-elapsed raised for the longer race (no near-finish debug jump).

## Files touched

- `src/game/sprites.ts` — `PLAYER_TRUCK_SCALE` (28) + `truckScaleFromRoadHalf()` (near-plane parity, cap at 28)
- `src/game/game.ts` — player uses `PLAYER_TRUCK_SCALE`; rival uses shared helper (replaces `roadHalf*0.55` / cap 48)
- `src/game/road.ts` — `buildTrack()` segment blocks ×~5.5; curves + one finish gate pattern unchanged
- `scripts/race-smoke.mjs` — Playwright wait timeout **360s**; rival-solo min elapsed **≥ 90s**
- `README.md` — slice blurb notes longer course
- `docs/sdlc/runs/rival-scale-long-track/impl-notes.md` — repo mirror of this file

## Numbers

| Metric | Before (main / PR #3) | After |
| --- | --- | --- |
| Segments | ~1075 | **5911** (~**5.499×**) |
| `totalLength` | 215000 | **1182200** |
| `finishZ` | 213000 | **1180200** (`finishZ/totalLength` ≈ 0.998) |
| Rival scale | `clamp(roadHalf*0.55, 10, 48)` | `truckScaleFromRoadHalf` → max **28** |
| Smoke timeout | 120s | **360s** |
| Smoke solo min | ≥ 18s | **≥ 90s** |

Expected smoke wall-clock (speeds unchanged): idle lose ~**2.5–3 min**, hold-W win ~**1.5–2 min**.

## Deviations from plan

- None material. Applied gate defaults as recommended.
- Did **not** retune rival pace (`0.52 * maxSpeed`) — relative win/lose reachability unchanged; only wall-clock grows with length.
- Prop stride still every 10 segments (slightly more props absolute, same density); drawDistance / blit caps untouched.

## Leftover / follow-ups

- Human-local confirm: rivals read same size near camera; course feels long enough without padding boredom
- Test/review agents (orchestrator) — not run by implement
- Multi-rival / combat / feel redesign — out of scope

## How to try it

```bash
npm install
npm run dev
```

Open Vite URL (default `http://localhost:5173`). WASD race; **R** restart. Judge rival size + track length locally.

```bash
npm run build
npm run smoke:race   # requires `npm run dev`; ~4–5 min wall-clock
```
