# Test report — rival-scale-long-track

- **Plan:** Project store `docs/runs/rival-scale-long-track/plan.md` (approved 2026-10-04 — human “approve”)
- **Impl notes:** [impl-notes.md](./impl-notes.md)
- **Date:** 2026-10-04
- **Branch:** `cursor/rival-scale-long-track-6621` @ `6546f0e`
- **Project store:** `/cursor/stores/bc-e63afbb0-8709-4483-8dd5-94fed871e355/docs/runs/rival-scale-long-track/test-report.md`
- **Repo mirror:** `docs/sdlc/runs/rival-scale-long-track/test-report.md`
- **PR:** https://github.com/tschroter/gulasch-go/pull/4
- **Tester:** SDLC test agent (automated checks only — no full-race play)

## Verdict

| Gate | Result |
| --- | --- |
| Automated checks (`npm install`, `npm run build`, `npm run smoke:race`) | **pass** |
| Objectively checkable acceptance (scale helper, ~5.5× length, finish-at-gate, smoke timings, scope) | **pass** |
| Steering feel / light WASD response | **pending human playtest** |
| Rival size look (same world size near camera) | **pending human playtest** |
| Track “long enough” without padding boredom | **pending human playtest** |
| Desktop smoothness over longer course | **pending human playtest** |

**Overall for review handoff:** automchecks green; feel / rival-size glance / “long enough” remain human-local. No review in this phase.

## Commands run

```bash
npm install          # ok — 18 packages, 0 vulnerabilities
npm run build        # ok — tsc && vite build; dist emitted
npm run dev          # ok — http://127.0.0.1:5173/ → HTTP 200
npm run smoke:race   # ok — Playwright harness (~314s wall-clock)
```

### Smoke harness output

```text
rival_solo {
  phase: 'result', outcome: 'lose',
  elapsed: ~171.13, playerZ: 0, rivalZ: ~1180212,
  finishZ: 1180200, totalLength: 1182200, frameMs: ~16.66
}
player_w {
  phase: 'result', outcome: 'win',
  elapsed: ~140.18, playerZ: ~1180268, rivalZ: ~967780,
  finishZ: 1180200, totalLength: 1182200, frameMs: ~16.66
}
OK
```

Asserts held: idle → lose; solo elapsed ≥ 90s; hold-`W` → win; hold-`W` faster than solo; `finishZ/totalLength` ≈ 0.998 (> 0.97); finisher Z ≥ `finishZ`. No manual full-race drive.

### Static track / scale numbers (code)

| Metric | Value | Plan band |
| --- | --- | --- |
| `segments.length` | **5911** | ~5400–6500 (~5.5× of 1075 → **5.499×**) |
| `totalLength` | **1182200** | — |
| `finishZ` | **1180200** | near end |
| `finishZ/totalLength` | **≈0.998** | > 0.97 |
| Curve segments (nonzero `curve`) | **3409 / 5911** | visible curves kept |
| Player scale | `PLAYER_TRUCK_SCALE = 28` (fixed) | keep player at 28 |
| Rival scale | `truckScaleFromRoadHalf(roadHalf)` capped at **28** | shared helper; not old `*0.55` / cap 48 |
| Smoke timeout | **360000** ms | longer passive waits |
| Smoke solo min | **≥ 90** s | raised floor |

## Acceptance criteria

| Criterion | Result | Evidence |
| --- | --- | --- |
| Rival/hostile trucks use same truck scale language as player (shared formula); near rivals not obviously larger/smaller | **partial** | Code: shared `truckScaleFromRoadHalf` + cap 28; player fixed 28. **Visual “same size” read: pending human playtest** |
| Player stays bottom-anchored; rivals perspective-scaled but match body size near camera | **partial** | Code wiring pass (`drawTruck(..., PLAYER_TRUCK_SCALE, ...)` + rival helper). **Near-plane look: pending human** |
| Track ~5–6× current `main`; finish gate near end (`finishZ/totalLength > 0.97`) | **pass** (static + smoke) | 5911 segs (~5.5×); smoke `finishZ=1180200` / `totalLength=1182200` ≈ 0.998 |
| Visible curves; light WASD intent unchanged; DE/EN + `R`; finish-at-gate | **partial** | Curves in builder (3409 segs); WASD/`R` in `input.ts`; DE/EN in `ui.ts`; smoke win/lose at gate. **Curve visibility + steering feel: pending human** |
| `npm run build` + `npm run smoke:race` with updated timings | **pass** | Both green; timeout 360s; solo ≥90s; wall-clock ~5.2 min |
| Test agent does not manually drive a full race | **pass** | Smoke/build only |
| No scope creep (multi-level, combat, Three.js, feel overhaul) | **pass** (static) | No Three.js; single rival; no feel retune noted; slice files only |
| Desktop smoothness not obviously worse | **pending human playtest** | Smoke `frameMs` ≈ 16.7 under harness; human owns desktop feel |

## Playtest / visual notes

- **Steering feel:** pending human playtest — not signed off here.
- **Rival size look:** pending human playtest — numeric parity implemented; glance confirmation is human-local.
- **Track long enough:** pending human playtest — length is ~5.5× by numbers; boredom/padding judgment is human-local.
- Agent did **not** manually play a complete race.

## Gaps

- No unit tests beyond Playwright smoke.
- Visual same-size and “long enough” criteria are not automatable here.
- Smoke hold-`W` does not steer (player drifts; still wins) — does not validate steering feel.

## Blockers for review

- None from automchecks. Human playtest items above are gaps, not automcheck failures.
