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

/** Fixed bottom-anchored player arcade sprite scale. */
export const PLAYER_TRUCK_SCALE = 28;

/**
 * Projected road half-width (screenW) at which a rival should match
 * PLAYER_TRUCK_SCALE — near-camera size language shared with the player.
 */
const NEAR_ROAD_HALF_FOR_PLAYER_SIZE = 80;

/**
 * Rival/hostile truck scale from projected road half-width.
 * Caps at PLAYER_TRUCK_SCALE so near rivals never read larger than the player.
 */
export function truckScaleFromRoadHalf(roadHalf: number): number {
  const scale = roadHalf * (PLAYER_TRUCK_SCALE / NEAR_ROAD_HALF_FOR_PLAYER_SIZE);
  return Math.max(4, Math.min(PLAYER_TRUCK_SCALE, scale));
}

/** Chubby rear-view trucker + truck — procedural chunky pixels (no save/restore). */
export function drawTruck(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  scale: number,
  palette: TruckPalette,
  steerLean = 0,
): void {
  const s = scale > 4 ? scale : 4;
  const ox = ((cx + Math.max(-1, Math.min(1, steerLean)) * s * 0.15) + 0.5) | 0;
  const oy = (cy + 0.5) | 0;

  fill(ctx, ox - s * 0.85, oy - s * 0.15, s * 0.35, s * 0.35, PALETTE.tire);
  fill(ctx, ox + s * 0.5, oy - s * 0.15, s * 0.35, s * 0.35, PALETTE.tire);

  fill(ctx, ox - s * 0.95, oy - s * 1.05, s * 1.9, s * 0.95, palette.body);
  fill(ctx, ox - s * 0.75, oy - s * 0.95, s * 1.5, s * 0.35, palette.accent);
  fill(ctx, ox - s * 0.15, oy - s * 0.88, s * 0.3, s * 0.22, PALETTE.ink);

  fill(ctx, ox - s * 0.7, oy - s * 1.55, s * 1.4, s * 0.55, palette.cab);
  fill(ctx, ox - s * 0.55, oy - s * 1.48, s * 1.1, s * 0.28, PALETTE.window);

  fill(ctx, ox - s * 0.22, oy - s * 1.85, s * 0.44, s * 0.35, palette.skin);
  fill(ctx, ox - s * 0.32, oy - s * 1.7, s * 0.64, s * 0.28, palette.cab);
  fill(ctx, ox - s * 0.18, oy - s * 2.0, s * 0.36, s * 0.18, PALETTE.ink);
  fill(ctx, ox + s * 0.2, oy - s * 1.72, s * 0.18, s * 0.06, PALETTE.smoke);
}

export function drawProp(
  ctx: CanvasRenderingContext2D,
  kind: "tree" | "barrel" | "finish",
  cx: number,
  cy: number,
  scale: number,
): void {
  const s = scale > 2 ? scale : 2;
  const ox = (cx + 0.5) | 0;
  const oy = (cy + 0.5) | 0;

  if (kind === "tree") {
    fill(ctx, ox - s * 0.12, oy - s * 0.9, s * 0.24, s * 0.9, PALETTE.propTrunk);
    fill(ctx, ox - s * 0.55, oy - s * 1.55, s * 1.1, s * 0.85, PALETTE.propFoliage);
    fill(ctx, ox - s * 0.4, oy - s * 1.85, s * 0.8, s * 0.45, PALETTE.propFoliage);
  } else if (kind === "barrel") {
    fill(ctx, ox - s * 0.35, oy - s * 0.7, s * 0.7, s * 0.7, PALETTE.propBarrel);
    fill(ctx, ox - s * 0.35, oy - s * 0.55, s * 0.7, s * 0.12, PALETTE.rumbleA);
  } else {
    fill(ctx, ox - s * 1.6, oy - s * 2.2, s * 0.25, s * 2.2, PALETTE.finish);
    fill(ctx, ox + s * 1.35, oy - s * 2.2, s * 0.25, s * 2.2, PALETTE.finish);
    fill(ctx, ox - s * 1.6, oy - s * 2.2, s * 3.2, s * 0.45, PALETTE.finishStripe);
    fill(ctx, ox - s * 1.2, oy - s * 2.05, s * 0.35, s * 0.2, PALETTE.finish);
    fill(ctx, ox - s * 0.5, oy - s * 2.05, s * 0.35, s * 0.2, PALETTE.finish);
    fill(ctx, ox + s * 0.2, oy - s * 2.05, s * 0.35, s * 0.2, PALETTE.finish);
    fill(ctx, ox + s * 0.9, oy - s * 2.05, s * 0.35, s * 0.2, PALETTE.finish);
  }
}

function fill(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
): void {
  ctx.fillStyle = color;
  ctx.fillRect(x | 0, y | 0, w > 1 ? w | 0 : 1, h > 1 ? h | 0 : 1);
}
