import { PALETTE } from "./palette";

export type TruckPalette = {
  cab: string;
  body: string;
  accent: string;
  skin: string;
};

export const PLAYER_TRUCK: TruckPalette = {
  cab: PALETTE.playerCab,
  body: PALETTE.playerBody,
  accent: PALETTE.playerAccent,
  skin: PALETTE.playerSkin,
};

export const RIVAL_TRUCK: TruckPalette = {
  cab: "#c02818",
  body: "#f05040",
  accent: "#ffe060",
  skin: PALETTE.rivalSkin,
};

/** Chubby rear-view trucker + truck — procedural chunky pixels. */
export function drawTruck(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  scale: number,
  palette: TruckPalette,
  steerLean = 0,
): void {
  const s = Math.max(4, scale);
  const lean = Math.max(-1, Math.min(1, steerLean)) * s * 0.15;
  ctx.save();
  ctx.translate(Math.round(cx + lean), Math.round(cy));

  // Tires
  fillRect(ctx, -s * 0.85, -s * 0.15, s * 0.35, s * 0.35, PALETTE.tire);
  fillRect(ctx, s * 0.5, -s * 0.15, s * 0.35, s * 0.35, PALETTE.tire);

  // Chubby cargo box
  fillRect(ctx, -s * 0.95, -s * 1.05, s * 1.9, s * 0.95, palette.body);
  fillRect(ctx, -s * 0.75, -s * 0.95, s * 1.5, s * 0.35, palette.accent);
  // Tiny satirical “G” crate mark
  fillRect(ctx, -s * 0.15, -s * 0.88, s * 0.3, s * 0.22, PALETTE.ink);

  // Cab
  fillRect(ctx, -s * 0.7, -s * 1.55, s * 1.4, s * 0.55, palette.cab);
  fillRect(ctx, -s * 0.55, -s * 1.48, s * 1.1, s * 0.28, PALETTE.window);

  // Chubby driver silhouette (rear)
  fillRect(ctx, -s * 0.22, -s * 1.85, s * 0.44, s * 0.35, palette.skin);
  fillRect(ctx, -s * 0.32, -s * 1.7, s * 0.64, s * 0.28, palette.cab);
  // Soft hat / hair bump
  fillRect(ctx, -s * 0.18, -s * 2.0, s * 0.36, s * 0.18, PALETTE.ink);
  // Tiny cartoon cig stub (non-graphic placeholder tone)
  fillRect(ctx, s * 0.2, -s * 1.72, s * 0.18, s * 0.06, PALETTE.smoke);

  ctx.restore();
}

export function drawProp(
  ctx: CanvasRenderingContext2D,
  kind: "tree" | "barrel" | "finish",
  cx: number,
  cy: number,
  scale: number,
): void {
  const s = Math.max(2, scale);
  ctx.save();
  ctx.translate(Math.round(cx), Math.round(cy));

  if (kind === "tree") {
    fillRect(ctx, -s * 0.12, -s * 0.9, s * 0.24, s * 0.9, PALETTE.propTrunk);
    fillRect(ctx, -s * 0.55, -s * 1.55, s * 1.1, s * 0.85, PALETTE.propFoliage);
    fillRect(ctx, -s * 0.4, -s * 1.85, s * 0.8, s * 0.45, PALETTE.propFoliage);
  } else if (kind === "barrel") {
    fillRect(ctx, -s * 0.35, -s * 0.7, s * 0.7, s * 0.7, PALETTE.propBarrel);
    fillRect(ctx, -s * 0.35, -s * 0.55, s * 0.7, s * 0.12, PALETTE.rumbleA);
  } else {
    // Finish gate posts + banner
    fillRect(ctx, -s * 1.6, -s * 2.2, s * 0.25, s * 2.2, PALETTE.finish);
    fillRect(ctx, s * 1.35, -s * 2.2, s * 0.25, s * 2.2, PALETTE.finish);
    fillRect(ctx, -s * 1.6, -s * 2.2, s * 3.2, s * 0.45, PALETTE.finishStripe);
    fillRect(ctx, -s * 1.2, -s * 2.05, s * 0.35, s * 0.2, PALETTE.finish);
    fillRect(ctx, -s * 0.5, -s * 2.05, s * 0.35, s * 0.2, PALETTE.finish);
    fillRect(ctx, s * 0.2, -s * 2.05, s * 0.35, s * 0.2, PALETTE.finish);
    fillRect(ctx, s * 0.9, -s * 2.05, s * 0.35, s * 0.2, PALETTE.finish);
  }

  ctx.restore();
}

function fillRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
): void {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(w)), Math.max(1, Math.round(h)));
}
