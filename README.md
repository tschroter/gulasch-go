# GulaschGo

Browser delivery race with low-poly **PS1-style Three.js/WebGL** visuals.

## Run

```bash
npm install
npm run dev
```

Open the URL Vite prints (default `http://localhost:5173`).

## Controls

| Key | Action |
| --- | --- |
| W | Accelerate |
| S | Brake |
| A / D | Steer (light / arcade-responsive) |
| R | Restart race |

## Slice

One winding foggy mountain delivery route. Drive OTTO against the same-scale HANS and
FRITZ box trucks. The Three.js scene renders at 320×180 and nearest-upscales behind a
full-resolution DOM HUD; leaving the shoulder slowly lowers cargo condition.

**Feel check:** steering, camera, composition, and truck readability are intended for a
**human local** playtest (`npm run dev`). Automated smoke checks race and WebGL wiring.

```bash
npm run build        # typecheck + production bundle
npm run smoke:race   # requires `npm run dev` already running
npm run smoke:decals # shared atlas filters/UVs + deterministic truck screenshots
```

Process docs: `docs/sdlc/`.
