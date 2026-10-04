# GulaschGo

Browser race game with **2D Atari-era** optics (pseudo-3D / Pole Position–style). First playable slice: **game-basis**.

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

Short curved-track delivery race vs one rival, Canvas 2D low-res nearest upscale, bilingual (DE/EN) finish stub.

**Feel check:** steering lightness is meant for a **human local** playtest (`npm run dev`) — automated smoke only checks win/lose wiring.

```bash
npm run build        # typecheck + production bundle
npm run smoke:race   # requires `npm run dev` already running
```

Process docs: `docs/sdlc/`.
