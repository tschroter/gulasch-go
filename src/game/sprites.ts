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

/** Stable name-only Kennzeichen (driver/vehicle) — not DE-style plates. */
export const PLAYER_PLATE = "OTTO";
export const RIVAL_PLATE = "FRITZ";

/** Fixed bottom-anchored player arcade sprite scale. */
export const PLAYER_TRUCK_SCALE = 28;

/**
 * Projected road half-width (screenW) at which a rival should match
 * PLAYER_TRUCK_SCALE — near-camera size language shared with the player.
 */
const NEAR_ROAD_HALF_FOR_PLAYER_SIZE = 80;

/** Below this scale, plate shows as a solid rect only (no glyphs). */
const PLATE_GLYPH_MIN_SCALE = 12;

/**
 * Rival/hostile truck scale from projected road half-width.
 * Caps at PLAYER_TRUCK_SCALE so near rivals never read larger than the player.
 */
export function truckScaleFromRoadHalf(roadHalf: number): number {
  const scale = roadHalf * (PLAYER_TRUCK_SCALE / NEAR_ROAD_HALF_FOR_PLAYER_SIZE);
  return Math.max(4, Math.min(PLAYER_TRUCK_SCALE, scale));
}

/**
 * Chubby rear-view Gulasch transport truck — cab + cargo box + pot cue + name plate.
 * Procedural chunky pixels (no save/restore).
 */
export function drawTruck(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  scale: number,
  palette: TruckPalette,
  steerLean = 0,
  plate = "",
): void {
  const s = scale > 4 ? scale : 4;
  const ox = ((cx + Math.max(-1, Math.min(1, steerLean)) * s * 0.15) + 0.5) | 0;
  const oy = (cy + 0.5) | 0;

  // Tires
  fill(ctx, ox - s * 0.88, oy - s * 0.18, s * 0.36, s * 0.36, PALETTE.tire);
  fill(ctx, ox + s * 0.52, oy - s * 0.18, s * 0.36, s * 0.36, PALETTE.tire);

  // Cargo box (taller delivery bed — Gulasch transport read)
  fill(ctx, ox - s * 0.98, oy - s * 1.22, s * 1.96, s * 1.12, palette.body);
  // Lid / roof lip on cargo
  fill(ctx, ox - s * 1.02, oy - s * 1.32, s * 2.04, s * 0.14, palette.accent);
  // Stew-colored cargo band
  fill(ctx, ox - s * 0.85, oy - s * 1.05, s * 1.7, s * 0.28, PALETTE.stew);
  fill(ctx, ox - s * 0.85, oy - s * 1.05, s * 1.7, s * 0.06, PALETTE.stewLid);

  // Small pot/barrel cue on cargo face (both-lite)
  if (s >= 8) {
    const potX = ox - s * 0.55;
    const potY = oy - s * 0.72;
    fill(ctx, potX, potY, s * 0.38, s * 0.32, PALETTE.propBarrel);
    fill(ctx, potX - s * 0.02, potY - s * 0.06, s * 0.42, s * 0.08, PALETTE.stewLid);
    fill(ctx, potX + s * 0.08, potY + s * 0.08, s * 0.22, s * 0.1, PALETTE.stew);
  }

  // Name-only Kennzeichen on rear of cargo
  if (plate) {
    drawPlate(ctx, ox, oy - s * 0.42, s, plate);
  }

  // Cab above cargo
  fill(ctx, ox - s * 0.72, oy - s * 1.78, s * 1.44, s * 0.52, palette.cab);
  fill(ctx, ox - s * 0.58, oy - s * 1.7, s * 1.16, s * 0.28, PALETTE.window);

  // Chubby trucker
  fill(ctx, ox - s * 0.22, oy - s * 2.08, s * 0.44, s * 0.35, palette.skin);
  fill(ctx, ox - s * 0.32, oy - s * 1.92, s * 0.64, s * 0.28, palette.cab);
  fill(ctx, ox - s * 0.18, oy - s * 2.22, s * 0.36, s * 0.18, PALETTE.ink);
  fill(ctx, ox + s * 0.2, oy - s * 1.94, s * 0.18, s * 0.06, PALETTE.smoke);
}

/** Rear plate rectangle + chunky name glyphs when large enough. */
function drawPlate(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  s: number,
  name: string,
): void {
  const pw = s * 1.15;
  const ph = s * 0.34;
  const px = cx - pw * 0.5;
  const py = cy - ph * 0.5;

  fill(ctx, px - 1, py - 1, pw + 2, ph + 2, PALETTE.plateEdge);
  fill(ctx, px, py, pw, ph, PALETTE.plate);

  if (s < PLATE_GLYPH_MIN_SCALE || !name) return;

  const label = name.toUpperCase();
  // Fit 3×5 glyphs + gaps inside the plate; prefer unit 2 at player scale (~28).
  const unit = Math.max(1, Math.min(2, ((pw - 2) / (label.length * 4 - 1)) | 0));
  const gw = unit * 3;
  const gh = unit * 5;
  const gap = unit;
  const totalW = label.length * gw + (label.length - 1) * gap;
  let x = ((cx - totalW * 0.5) + 0.5) | 0;
  const y = ((cy - gh * 0.5) + 0.5) | 0;
  for (let i = 0; i < label.length; i++) {
    drawGlyph(ctx, label[i], x, y, unit, PALETTE.ink);
    x += gw + gap;
  }
}

/** Tiny 3×5 uppercase glyphs (A–Z) for name plates — Atari-chunky. */
const GLYPHS: Record<string, number[]> = {
  // rows as 3-bit masks, MSB = left
  F: [0b111, 0b100, 0b111, 0b100, 0b100],
  I: [0b111, 0b010, 0b010, 0b010, 0b111],
  O: [0b111, 0b101, 0b101, 0b101, 0b111],
  R: [0b110, 0b101, 0b110, 0b101, 0b101],
  T: [0b111, 0b010, 0b010, 0b010, 0b010],
  Z: [0b111, 0b001, 0b010, 0b100, 0b111],
};

function drawGlyph(
  ctx: CanvasRenderingContext2D,
  ch: string,
  x: number,
  y: number,
  unit: number,
  color: string,
): void {
  const rows = GLYPHS[ch];
  if (!rows) return;
  for (let row = 0; row < 5; row++) {
    const bits = rows[row];
    for (let col = 0; col < 3; col++) {
      if (bits & (0b100 >> col)) {
        fill(ctx, x + col * unit, y + row * unit, unit, unit, color);
      }
    }
  }
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
