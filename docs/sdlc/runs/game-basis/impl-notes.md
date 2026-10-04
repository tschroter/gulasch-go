# Impl notes — game-basis

- **Plan:** [plan.md](./plan.md) (approved 2026-10-04)
- **Date:** 2026-10-04
- **Branch:** `cursor/game-basis-c84f` (from `main`)
- **Repo mirror:** `docs/sdlc/runs/game-basis/impl-notes.md`

## Summary

Greenfield Vite + TypeScript + Three.js app that boots a short **curved** delivery race: chubby low-poly player truck (WASD), one distinct rival AI, classic behind-the-vehicle chase cam, PS1-style low-res nearest upscale, bilingual DE/EN finish overlay, restart with **R**.

## Files touched

- `package.json`, `package-lock.json`, `tsconfig.json`, `vite.config.ts` — Vite/TS/Three toolchain
- `index.html`, `src/main.ts`, `src/style.css`, `src/vite-env.d.ts` — app shell + HUD/result markup
- `src/game/game.ts` — race loop, PS1 render target, win/lose
- `src/game/track.ts` — Catmull-Rom curved road, curbs, props, finish gate
- `src/game/truck.ts` — arcade drive + chubby placeholder trucks (player/rival palettes)
- `src/game/chaseCamera.ts` — Road Rash-style rear chase cam with lag/shake
- `src/game/input.ts` — WASD + R
- `src/game/ui.ts` — bilingual result stub
- `README.md` — run/controls
- `.gitignore` — node_modules/dist
- `docs/sdlc/runs/game-basis/impl-notes.md` — repo copy of these notes

## Deviations from plan

- None material. Open questions resolved per approve defaults: restart via **R**; cartoonish satirical placeholders OK (tiny non-graphic cig stub on drivers; roadside barrels).
- CRT letterbox framing skipped (optional in plan); low-res framebuffer + chunky UI already sell the era.
- Audio one-shot stub not added (optional / not required).

## Leftover / follow-ups

- Tune chase-cam lag / rival fairness after playtest feedback
- Multi-level progression, combat, economy — explicitly out of scope (future slices)
- Optional CRT overlay / vertex jitter if a later visual pass wants more PS1 warp
- Arrow keys / gamepad — out of scope for this slice

## How to try it

```bash
npm install
npm run dev
```

Open the Vite URL (default `http://localhost:5173`). Race with WASD; finish for DE/EN result; press **R** to restart.

```bash
npm run build   # typecheck + production bundle
```
