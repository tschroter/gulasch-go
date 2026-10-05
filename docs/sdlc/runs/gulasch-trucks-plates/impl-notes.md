# Impl notes — gulasch-trucks-plates

- **Plan:** `docs/runs/gulasch-trucks-plates/plan.md` (approved 2026-10-05 — name-only Kennzeichen; both-lite cargo; base PR #4 tip)
- **Date:** 2026-10-05
- **Branch:** `cursor/gulasch-trucks-plates-f909` (from `cursor/rival-scale-long-track-6621` @ `7acc79f`)
- **PR:** _(filled after draft open)_

## Summary

Player and rival now share a rear-view **Gulasch transport** silhouette: taller **cargo box** + lid, stew-colored band, small **pot/barrel** cue, cab + chubby trucker above. Each vehicle has a stable unique **name-only Kennzeichen** (`OTTO` / `FRITZ`) drawn as chunky 3×5 glyphs on a rear plate (solid rect only when scale &lt; 12). `PLAYER_TRUCK_SCALE` (28) and `truckScaleFromRoadHalf` from PR #4 are unchanged. No feel / track / AI changes.

## Files touched

- `src/game/sprites.ts` — cab+cargo silhouette; pot cue; `PLAYER_PLATE` / `RIVAL_PLATE`; `drawPlate` + tiny glyph set; `drawTruck(..., plate)`
- `src/game/palette.ts` — `stew`, `stewLid`, `plate`, `plateEdge`
- `src/game/game.ts` — pass name plates into player/rival `drawTruck` calls
- `docs/sdlc/runs/gulasch-trucks-plates/impl-notes.md` — repo mirror

## Deviations from plan

- None material. Gate decisions applied as approved (name-only, both-lite, #4 tip base).
- Plate glyphs are procedural `fillRect` 3×5 bitmaps (not canvas `fillText`) so they stay Atari-chunky on the 320×200 FB.

## Leftover / follow-ups

- Human-local glance: cargo reads as Gulasch transport; `OTTO`/`FRITZ` readable at player scale
- Test/review agents (orchestrator) — not run by implement
- Extra name glyphs only if future plates use letters beyond F/I/O/R/T/Z

## How to try it

```bash
npm install
npm run dev
```

Open Vite URL. Player plate **OTTO**, rival **FRITZ**; cab+cargo+pot should read at a glance. WASD / finish-at-gate / **R** unchanged.

```bash
npm run build
npm run smoke:race   # requires `npm run dev`; ~4–5 min wall-clock (long track from #4)
```
