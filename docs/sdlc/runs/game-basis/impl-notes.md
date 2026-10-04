# Impl notes — game-basis

- **Plan:** Project store `docs/runs/game-basis/plan.md` (approved 2026-10-04 — **2D Atari pivot**)
- **Date:** 2026-10-04
- **Branch:** `cursor/game-basis-2d-atari-0ac2` (from `main`)
- **Project store mirror:** `/cursor/stores/bc-e63afbb0-8709-4483-8dd5-94fed871e355/docs/runs/game-basis/impl-notes.md`

## Summary

Greenfield Vite + TypeScript + **Canvas 2D** app that boots a short **curved** delivery race in **pseudo-3D Atari / Pole Position–style**: chubby procedural trucker sprites, light arcade WASD, one distinct rival AI, 320×200 nearest-neighbor upscale with a limited flat palette, bilingual DE/EN finish overlay, restart with **R**. No Three.js.

## Files touched

- `package.json`, `package-lock.json`, `tsconfig.json`, `vite.config.ts` — Vite/TS toolchain (**no** `three`)
- `index.html`, `src/main.ts`, `src/style.css`, `src/vite-env.d.ts` — app shell + HUD/result markup
- `src/game/game.ts` — race loop, framebuffer upscale, win/lose, debug snapshot
- `src/game/road.ts` — segment track + pseudo-3D projection helpers
- `src/game/sprites.ts` — chubby player/rival trucks + roadside props
- `src/game/palette.ts` — limited Atari-like colors
- `src/game/input.ts` — WASD + R
- `src/game/ui.ts` — bilingual result stub
- `scripts/race-smoke.mjs` — headless win/lose timing check (`npm run smoke:race`)
- `README.md` — run/controls (2D Atari copy)
- `.gitignore` — node_modules/dist
- `docs/sdlc/runs/game-basis/impl-notes.md` — this file (repo mirror)

## Deviations from plan

- None material. Gate defaults applied: pseudo-3D view; PR #2 3D supersede path; 320×200 framebuffer + limited palette; light/snappy steer.
- Branch is greenfield off `main` (not a rip commit on top of PR #2 tree) — same end state: no Three.js game path.
- Tiny non-graphic cig stub on drivers kept for cartoonish tone (allowed by plan).
- Audio one-shot stub not added (optional / not required).
- Dev-only `window.__gulasch` + Playwright smoke retained for outcome wiring.

## Playtest notes (implement)

- Steer uses high `steerSpeed` and near-immediate A/D response; centrifugal curve pull is mild — **human-local feel** remains the acceptance bar for “light enough”.
- Rival ~62% of max speed so a clean hold-W run wins; idle loses.
- Cloud/agent play is **not** the steering-feel gate.

## Leftover / follow-ups

- Human local feel tune after dedicated test phase if A/D still feels off
- Multi-level progression, combat, economy — out of scope
- Optional scanline overlay if a later visual pass wants more CRT
- Arrow keys / gamepad — out of scope

## How to try it

```bash
npm install
npm run dev
```

Open the Vite URL (default `http://localhost:5173`). Race with WASD; finish for DE/EN result; press **R** to restart. **Please judge steering feel locally.**

```bash
npm run build
npm run smoke:race   # requires `npm run dev` already running
```
