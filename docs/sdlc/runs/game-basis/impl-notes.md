# Impl notes — game-basis

- **Plan:** Project store `docs/runs/game-basis/plan.md` (approved 2026-10-04 — **2D Atari pivot**)
- **Date:** 2026-10-04
- **Branch:** `cursor/game-basis-2d-atari-0ac2` (from `main`)
- **Project store mirror:** `/cursor/stores/bc-e63afbb0-8709-4483-8dd5-94fed871e355/docs/runs/game-basis/impl-notes.md`
- **PR:** https://github.com/tschroter/gulasch-go/pull/3

## Summary

Greenfield Vite + TypeScript + **Canvas 2D** app that boots a **curved** delivery race in **pseudo-3D Atari / Pole Position–style**: chubby procedural trucker sprites, light arcade WASD, one distinct rival AI, 320×200 nearest-neighbor upscale with a limited flat palette, bilingual DE/EN finish overlay, restart with **R**. No Three.js.

## Files touched

- `package.json`, `package-lock.json`, `tsconfig.json`, `vite.config.ts` — Vite/TS toolchain (**no** `three`)
- `index.html`, `src/main.ts`, `src/style.css`, `src/vite-env.d.ts` — app shell + HUD/result markup
- `src/game/game.ts` — race loop, framebuffer upscale, win/lose, rival draw, debug snapshot
- `src/game/road.ts` — longer segment track + pseudo-3D projection helpers
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
- Cloud/agent play is **not** the steering-feel gate.

### Human local follow-up (2026-10-04) — fixed on same PR

Feedback: rival not visible; track much too short.

- **Rival visibility:** prior sprite scale used camera-depth/`z` math that capped ~4px and often spawned under the near-camera. Rival now starts ~28 segments ahead, sized as a fraction of projected road width, brighter red/yellow, dedicated `drawRival`.
- **Track length:** ~4× prior segment count with more curves; still one finish stub.
- **Pace:** rival ~52% max — smoke idle-lose ~28s, hold-W win ~16s.

### Human local follow-up (2026-10-04) — lag / FPS

Feedback: game lagged badly (poor frame rate / stutter).

**Root causes addressed:**

1. **Full-width grass overdraw** — every segment painted `fillRect(0, y, FB_W, h)`. Now left/right grass strips only (+ one ground fill under horizon).
2. **Huge display blit** — canvas was `window × devicePixelRatio`. Now integer upscale of 320×200 capped at **3×** (`desynchronized` 2D contexts).
3. **Projector work** — `drawDistance` 180→90; precomputed segment `z`; cached track length in `findSegment`; early exit at horizon; 1px bands use `fillRect`; sparser props.
4. **Sprite path** — no per-sprite `save()/restore()/translate()`.
5. **Debug** — `getDebugSnapshot().frameMs` EMA for local checks.

Headless sample while racing: ~16.7ms/frame (~60fps).

### Review follow-up (2026-10-04) — early win blocker

Review `request-changes`: win used `FINISH_Z_RATIO = 0.92` while gate is at `segments.length - 10` (~99%) → ~76 segments early.

**Fix:** `buildTrack()` returns gate `finishZ`; `Game` ends only there. Smoke asserts finish near end (`finishZ/totalLength > 0.97`) and finisher Z ≥ `finishZ`.

Post-fix smoke: lose ~30.2s / win ~17.3s at `finishZ=213000` of `215000`.

## Leftover / follow-ups

- Short human confirm win/lose at delivery gate
- Multi-level progression, combat, economy — out of scope
- Optional scanline overlay if a later visual pass wants more CRT
- Arrow keys / gamepad — out of scope

## How to try it

```bash
npm install
npm run dev
```

Open the Vite URL (default `http://localhost:5173`). Race with WASD; finish for DE/EN result; press **R** to restart. **Please judge steering feel, rival visibility, and smoothness locally.**

```bash
npm run build
npm run smoke:race   # requires `npm run dev` already running
```
