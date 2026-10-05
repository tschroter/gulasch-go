# Impl notes — ps1-visual-basis

- **Plan:** Project `docs/runs/ps1-visual-basis/plan.md` (approved 2026-10-05)
- **Date:** 2026-10-05
- **Branch:** `cursor/ps1-visual-basis-85df`
- **PR:** https://github.com/tschroter/gulasch-go/pull/6

## Summary

Replaced the Canvas 2D pseudo-3D presentation with a fixed 320×180 Three.js/WebGL
race. The slice includes one winding foggy mountain route, a damped rear chase
camera, low-poly OTTO/HANS/FRITZ box trucks built from shared dimensions, generated
nearest-filtered Gulasch and plate textures, deterministic rivals, a delivery gate,
DOM HUD, cargo condition, bilingual results, and restart/debug contracts.

The opening formation and raised camera keep both rivals visible above OTTO. The
ordinary opening frame measures 58 draw calls / 9,492 triangles; the steady race
snapshot measured 26–28 draw calls / about 9,000 triangles.

## Files touched

- `package.json`, `package-lock.json` — latest Three.js plus TypeScript declarations.
- `src/game/renderer.ts` — WebGL scene, low-resolution renderer, chase camera, disposal.
- `src/game/track3d.ts` — route ribbon, shoulders, markings, guardrails, trees, mountains, fog-ready finish gate.
- `src/game/truck.ts` — shared low-poly truck construction and generated cargo/plate textures.
- `src/game/game.ts` — three-racer simulation, rank, cargo, result, restart, performance/debug state.
- `src/game/ui.ts`, `index.html`, `src/style.css` — full-resolution minimal race HUD and results.
- `scripts/race-smoke.mjs` — WebGL, three-racer, finish, rank/cargo, and render-budget smoke checks.
- `README.md` — Three.js slice and run instructions.
- Removed `src/game/{palette,road,sprites}.ts` with the obsolete Canvas renderer.

## Checks run

- `npm run build` — pass (Vite reports a non-blocking >500 kB chunk warning).
- `npm run smoke:race` — pass: `A` projects OTTO left (`0.5000 → 0.4844`);
  `D` projects OTTO right (`0.5000 → 0.5156`); idle loses at the visible gate;
  held W wins; WebGL2; three unique racers; valid cargo/rank; under render budgets.
- Off-road check — cargo fell from 100% to 82.71% beyond the shoulder and reset to 100% with `R`.
- Chrome 148 headless, Linux cloud VM, 4 logical CPUs, 1280×720, 30.015 s:
  1,801 frames; median 16.7 ms; p95 16.7 ms; zero frames over 20 ms.

## Human-playtest correction

- Commit `944fee6` fixes reversed rear-chase steering reported during local playtest.
- Root cause: the route lateral vector used `up × forward`, which is opposite the
  screen-right axis for a camera looking down the route. Because trucks, road
  offsets, and chase-camera follow all shared that basis, the whole steering response
  was reversed rather than only the truck lean.
- Fix: use `forward × up` as route right and expose projected player screen X in the
  debug snapshot for a targeted A/D regression assertion.

## Visual-blocker correction

- Commits `4d12dbc` and `9924a51` fix the road/terrain and plate blockers from the
  second human playtest.
- Missing road root cause: the steering-basis correction reversed ribbon vertex
  orientation without updating triangle winding, so front-face culling removed the
  road and shoulder. The ribbon indices now keep all surfaces upward-facing.
- Floating road root cause: the route climbs roughly 36 world units while the old
  ground was one flat plane at the starting elevation. A faceted route-following
  terrain mesh now samples the route height and slopes away from it, keeping visible
  ground below every route segment.
- Unreadable player name root cause: the low bumper plate fell below the chase-camera
  crop and behind the bottom-center speed HUD. The nearest-filtered, name-only board
  is now enlarged and mounted high on the rear door; `OTTO` remains readable.
- Targeted checks sampled start, mid-route, high route, and finish approach without a
  full playthrough. All rendered in racing state at 19,734–20,242 triangles, below
  the 50,000 budget. `npm run build` passes.

## Deviations from plan

- No functional scope deviation.
- The final chase camera is raised relative to the first implementation pass so both
  rivals remain visible in the opening composition. Human-local still owns the
  mockup/feel judgment.
- Evidence video is a deterministic browser capture rather than a human playthrough;
  it demonstrates acceleration, rank/HUD updates, and restart. It predates the
  steering-basis correction and is not the steering-direction regression proof.

## Leftover / follow-ups

- Human-local visual/feel gate: mockup resemblance, truck/panel/plate readability,
  fog distance, HUD readability, and arcade control feel.
- Production bundling emits Vite's advisory Three.js chunk-size warning; no runtime or
  performance acceptance miss was observed.
- Test and review phases remain intentionally unstarted.

## Evidence

- `media/ps1-visual-basis/visual_fix_plate_v2.png`
- `media/ps1-visual-basis/visual_fix_mid_route.png`
- `media/ps1-visual-basis/visual_fix_high_route.png`
- `media/ps1-visual-basis/visual_fix_finish_approach.png`

## How to try it

```bash
npm install
npm run dev
```

Open `http://localhost:5173`, then use `W/S` to accelerate/brake, `A/D` to steer,
and `R` to restart.
