# Test report — game-basis

- **Plan:** Project store `docs/runs/game-basis/plan.md` (approved 2026-10-04 — 2D Atari pivot)
- **Impl notes:** [impl-notes.md](./impl-notes.md)
- **Date:** 2026-10-04
- **Branch:** `cursor/game-basis-2d-atari-0ac2` @ `ceb5845`
- **Project store:** `/cursor/stores/bc-e63afbb0-8709-4483-8dd5-94fed871e355/docs/runs/game-basis/test-report.md`
- **PR:** https://github.com/tschroter/gulasch-go/pull/3
- **Tester:** SDLC test agent (automated checks only — no full-race play)

## Verdict

| Gate | Result |
| --- | --- |
| Automated checks (`npm install`, `npm run build`, `npm run smoke:race`) | **pass** |
| Objectively checkable acceptance (stack / wiring / bilingual / restart / no Three.js) | **pass** |
| Steering feel / light arcade response | **pending human playtest** |
| Rival visibility / track length / Atari visual read / chubby tone | **pending human playtest** (see human-found issues) |

**Overall for review handoff:** automchecks green; feel and several visual/pacing criteria remain human-local. Human already reported blockers on rival visibility and track length — treat those as known product issues, not re-verified by this agent.

## Commands run

```bash
npm install          # ok — 18 packages, 0 vulnerabilities
npm run build        # ok — tsc && vite build; dist emitted
npm run dev          # ok — http://127.0.0.1:5173/ → HTTP 200, canvas shell
npm run smoke:race   # ok — Playwright harness against running dev server
```

### Smoke harness output (excerpt)

```text
rival_solo { phase: 'result', outcome: 'lose', elapsed: ~6.73, playerZ: 0, rivalZ: ~43061, ... }
player_w   { phase: 'result', outcome: 'win',  elapsed: ~4.13, playerZ: ~43196, rivalZ: ~26587, ... }
OK
```

Harness only: idle → lose; hold `W` → win. No manual full-race drive; no steering-feel judgment.

## Acceptance criteria

| Criterion | Result | Evidence |
| --- | --- | --- |
| Fresh clone install + documented run opens 2D race | **pass** (autom) | `npm install` + `npm run dev`; `/` serves canvas app; `__gulasch` ready for smoke |
| No Three.js / WebGL 3D scene; Vite + TS + Canvas 2D | **pass** (static) | no `three` in `package.json` / lockfile / `src` imports; `getContext("2d")` + 320×200 framebuffer |
| Atari-era 2D read (low-res, chunky, limited palette) | **pending human playtest** | Code has 320×200 nearest upscale + `palette.ts`; visual judgment not signed off here |
| Pseudo-3D rear racing view | **pending human playtest** | Segment projector + bottom truck draw present in code; no agent playthrough |
| WASD drives truck | **pass** (static + smoke) | `input.ts` maps WASD; smoke holds `W` to win |
| Steering light / arcade-responsive | **pending human playtest** | Not signed off by cloud test agent (plan gate) |
| Visible curves to steer through | **pending human playtest** | Track builder includes curve segments; human owns “visible enough” |
| ≥1 rival advances without input; visually distinct | **partial** | Smoke: idle → `lose`, `rivalZ` advances → wiring **pass**. **Visual presence / distinctness: pending human** (see human-found) |
| Finish win/lose stub DE+EN; `R` restarts | **pass** (static + smoke) | `ui.ts` DE/EN copy; smoke presses `R` between runs; HTML result panel |
| Chubby/funny trucker tone at a glance | **pending human playtest** | Procedural sprites exist; look not judged here |
| Scope: no map / multi-level / combat / economy | **pass** (static) | Single race loop only in `src/game/*` |
| 3D PR #2 basis removed/replaced | **pass** (static) | Greenfield 2D app; no Three.js game path |
| Smoke may check outcome wiring; cloud ≠ feel gate | **pass** | Followed; feel left pending |

## Human-found issues (not reproduced by playing)

Reported by human during/after implement (test agent did **not** play the level to confirm):

1. **No enemies / rivals visible** during play — despite rival AI + draw path existing and smoke proving rival finish wins when idle.
2. **Track much too short** — consistent with smoke timings (~4s hold-`W` win, ~6.7s idle lose) and config (~234 segments × 200 units, finish at 92% length). Length/pace acceptance is human-local.

These are **product / playtest findings** for implement follow-up; not automcheck failures.

## Playtest / visual notes

- **Steering feel:** `pending human playtest` — do not treat this report as feel sign-off.
- **Rival visibility / track length:** human-found; pending human local playtest / implement fix.
- Agent did **not** manually drive a complete race.

## Gaps

- No unit tests beyond Playwright smoke.
- Aesthetic criteria (Atari read, pseudo-3D “feel”, chubby tone) not automatable here.
- Rival draw code exists but human reports no visible enemies — needs implement investigation without relying on agent playthrough.

## Blockers for review

- Automchecks: **none**.
- Product issues already raised by human (rival not visible; track too short) should be treated as known open problems for review/implement — not cleared by this test pass.
- Steering feel remains **pending human playtest** before feel-related acceptance can close.
