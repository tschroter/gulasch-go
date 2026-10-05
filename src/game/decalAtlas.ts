import * as THREE from "three";

export const DECAL_ATLAS_SIZE = 1024;
export const DECAL_ANISOTROPY_CAP = 4;
export const DECAL_GUTTER = 24;
export const DECAL_UV_INSET = 8;
export const DECAL_STRINGS = ["GULASCH", "OTTO", "HANS", "FRITZ"] as const;

export const CARGO_PANEL_SIZE = { width: 3.56, height: 2.98 };
export const NAME_PLATE_SIZE = { width: 2.32, height: 0.66 };

export type AtlasCellId = "cargo" | "OTTO" | "HANS" | "FRITZ";

export type AtlasCell = {
  id: AtlasCellId;
  x: number;
  y: number;
  w: number;
  h: number;
  u0: number;
  v0: number;
  u1: number;
  v1: number;
};

export type DecalAtlasDebug = {
  size: number;
  powerOfTwo: boolean;
  createCount: number;
  disposeCount: number;
  live: boolean;
  refs: number;
  magFilter: string;
  minFilter: string;
  generateMipmaps: boolean;
  anisotropy: number;
  anisotropyCap: number;
  colorSpace: string;
  strings: readonly string[];
  cells: Record<AtlasCellId, AtlasCell>;
  uvInsideCells: boolean;
};

type CellBox = { x: number; y: number; w: number; h: number };

const CARGO_BOX: CellBox = { x: 24, y: 24, w: 976, h: 640 };
const PLATE_BOXES: Record<"OTTO" | "HANS" | "FRITZ", CellBox> = {
  OTTO: { x: 24, y: 688, w: 312, h: 312 },
  HANS: { x: 360, y: 688, w: 312, h: 312 },
  FRITZ: { x: 696, y: 688, w: 312, h: 312 },
};

const PLATE_DRAW: CellBox = { x: 8, y: 108, w: 296, h: 96 };

let liveTexture: THREE.CanvasTexture | null = null;
let liveCells: Record<AtlasCellId, AtlasCell> | null = null;
let liveAnisotropy = 0;
let refs = 0;
let createCount = 0;
let disposeCount = 0;

function filterName(value: THREE.MinificationTextureFilter | THREE.MagnificationTextureFilter): string {
  const names = {
    [THREE.NearestFilter]: "NearestFilter",
    [THREE.LinearFilter]: "LinearFilter",
    [THREE.LinearMipmapLinearFilter]: "LinearMipmapLinearFilter",
  } as Record<number, string>;
  return names[value] ?? String(value);
}

function canvasCellToUv(box: CellBox, inset = DECAL_UV_INSET): Pick<AtlasCell, "u0" | "v0" | "u1" | "v1"> {
  const u0 = (box.x + inset) / DECAL_ATLAS_SIZE;
  const u1 = (box.x + box.w - inset) / DECAL_ATLAS_SIZE;
  const top = (box.y + inset) / DECAL_ATLAS_SIZE;
  const bottom = (box.y + box.h - inset) / DECAL_ATLAS_SIZE;
  return {
    u0,
    u1,
    v0: 1 - bottom,
    v1: 1 - top,
  };
}

function makeCell(id: AtlasCellId, box: CellBox, uvBox = box): AtlasCell {
  return { id, ...box, ...canvasCellToUv(uvBox) };
}

function cellContainsUv(cell: AtlasCell): boolean {
  const uMin = cell.x / DECAL_ATLAS_SIZE;
  const uMax = (cell.x + cell.w) / DECAL_ATLAS_SIZE;
  const vMax = 1 - cell.y / DECAL_ATLAS_SIZE;
  const vMin = 1 - (cell.y + cell.h) / DECAL_ATLAS_SIZE;
  const pad = (DECAL_GUTTER * 0.25) / DECAL_ATLAS_SIZE;
  return (
    cell.u0 >= uMin + pad &&
    cell.u1 <= uMax - pad &&
    cell.v0 >= vMin + pad &&
    cell.v1 <= vMax - pad &&
    cell.u0 < cell.u1 &&
    cell.v0 < cell.v1
  );
}

function addOpenRing(
  path: Path2D,
  cx: number,
  cy: number,
  rxo: number,
  ryo: number,
  rxi: number,
  ryi: number,
  start: number,
  end: number,
): void {
  path.moveTo(cx + Math.cos(start) * rxo, cy + Math.sin(start) * ryo);
  path.ellipse(cx, cy, rxo, ryo, 0, start, end, false);
  path.lineTo(cx + Math.cos(end) * rxi, cy + Math.sin(end) * ryi);
  path.ellipse(cx, cy, rxi, ryi, 0, end, start, true);
  path.closePath();
}

function glyphPath(letter: string): Path2D {
  const p = new Path2D();
  switch (letter) {
    case "A":
      p.moveTo(0.06, 0.0);
      p.lineTo(0.36, 1.0);
      p.lineTo(0.64, 1.0);
      p.lineTo(0.94, 0.0);
      p.lineTo(0.72, 0.0);
      p.lineTo(0.64, 0.26);
      p.lineTo(0.36, 0.26);
      p.lineTo(0.28, 0.0);
      p.closePath();
      p.moveTo(0.41, 0.42);
      p.lineTo(0.5, 0.72);
      p.lineTo(0.59, 0.42);
      p.closePath();
      break;
    case "C":
      addOpenRing(p, 0.5, 0.5, 0.44, 0.48, 0.2, 0.23, Math.PI * 0.28, Math.PI * 1.72);
      break;
    case "F":
      p.rect(0.1, 0.0, 0.28, 1.0);
      p.rect(0.1, 0.74, 0.8, 0.26);
      p.rect(0.1, 0.4, 0.58, 0.22);
      break;
    case "G":
      addOpenRing(p, 0.46, 0.5, 0.46, 0.48, 0.2, 0.23, Math.PI * 0.18, Math.PI * 1.82);
      p.rect(0.46, 0.3, 0.5, 0.26);
      p.rect(0.78, 0.08, 0.18, 0.48);
      break;
    case "H":
      p.rect(0.08, 0.0, 0.24, 1.0);
      p.rect(0.68, 0.0, 0.24, 1.0);
      p.rect(0.08, 0.4, 0.84, 0.2);
      break;
    case "I":
      p.rect(0.16, 0.0, 0.68, 0.18);
      p.rect(0.38, 0.0, 0.24, 1.0);
      p.rect(0.16, 0.82, 0.68, 0.18);
      break;
    case "L":
      p.rect(0.12, 0.0, 0.26, 1.0);
      p.rect(0.12, 0.0, 0.76, 0.22);
      break;
    case "N":
      p.rect(0.08, 0.0, 0.22, 1.0);
      p.rect(0.7, 0.0, 0.22, 1.0);
      p.moveTo(0.08, 1.0);
      p.lineTo(0.3, 1.0);
      p.lineTo(0.92, 0.0);
      p.lineTo(0.7, 0.0);
      p.closePath();
      break;
    case "O":
      p.ellipse(0.5, 0.5, 0.42, 0.48, 0, 0, Math.PI * 2);
      p.ellipse(0.5, 0.5, 0.18, 0.22, 0, 0, Math.PI * 2, true);
      break;
    case "R":
      p.rect(0.1, 0.0, 0.26, 1.0);
      p.moveTo(0.1, 1.0);
      p.lineTo(0.68, 1.0);
      p.quadraticCurveTo(0.96, 1.0, 0.96, 0.74);
      p.quadraticCurveTo(0.96, 0.48, 0.62, 0.48);
      p.lineTo(0.36, 0.48);
      p.lineTo(0.36, 0.72);
      p.lineTo(0.6, 0.72);
      p.quadraticCurveTo(0.72, 0.72, 0.72, 0.76);
      p.quadraticCurveTo(0.72, 0.86, 0.58, 0.86);
      p.lineTo(0.36, 0.86);
      p.lineTo(0.36, 1.0);
      p.closePath();
      p.moveTo(0.48, 0.48);
      p.lineTo(0.92, 0.0);
      p.lineTo(0.64, 0.0);
      p.lineTo(0.28, 0.48);
      p.closePath();
      break;
    case "S":
      p.moveTo(0.86, 0.78);
      p.bezierCurveTo(0.86, 1.08, 0.1, 1.08, 0.12, 0.74);
      p.bezierCurveTo(0.14, 0.54, 0.88, 0.5, 0.88, 0.28);
      p.bezierCurveTo(0.88, -0.04, 0.12, -0.04, 0.14, 0.24);
      p.bezierCurveTo(0.16, 0.1, 0.72, 0.12, 0.72, 0.28);
      p.bezierCurveTo(0.72, 0.4, 0.2, 0.44, 0.18, 0.7);
      p.bezierCurveTo(0.16, 0.9, 0.7, 0.9, 0.72, 0.78);
      p.closePath();
      break;
    case "T":
      p.rect(0.06, 0.78, 0.88, 0.22);
      p.rect(0.38, 0.0, 0.24, 1.0);
      break;
    case "U":
      p.moveTo(0.1, 1.0);
      p.lineTo(0.34, 1.0);
      p.lineTo(0.34, 0.42);
      p.quadraticCurveTo(0.34, 0.16, 0.5, 0.16);
      p.quadraticCurveTo(0.66, 0.16, 0.66, 0.42);
      p.lineTo(0.66, 1.0);
      p.lineTo(0.9, 1.0);
      p.lineTo(0.9, 0.38);
      p.quadraticCurveTo(0.9, -0.02, 0.5, -0.02);
      p.quadraticCurveTo(0.1, -0.02, 0.1, 0.38);
      p.closePath();
      break;
    case "Z":
      p.moveTo(0.08, 1.0);
      p.lineTo(0.92, 1.0);
      p.lineTo(0.92, 0.78);
      p.lineTo(0.38, 0.22);
      p.lineTo(0.92, 0.22);
      p.lineTo(0.92, 0.0);
      p.lineTo(0.08, 0.0);
      p.lineTo(0.08, 0.22);
      p.lineTo(0.62, 0.78);
      p.lineTo(0.08, 0.78);
      p.closePath();
      break;
    default:
      throw new Error(`Unsupported decal letter ${letter}`);
  }
  return p;
}

function drawGlyph(
  ctx: CanvasRenderingContext2D,
  letter: string,
  x: number,
  y: number,
  w: number,
  h: number,
  fill: string,
  outline: string | null,
): void {
  ctx.save();
  ctx.translate(x, y + h);
  ctx.scale(w, -h);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.miterLimit = 2;
  const glyph = glyphPath(letter);
  if (outline) {
    ctx.strokeStyle = outline;
    ctx.lineWidth = 0.16;
    ctx.stroke(glyph);
  }
  ctx.fillStyle = fill;
  const evenodd = letter === "A" || letter === "O";
  ctx.fill(glyph, evenodd ? "evenodd" : "nonzero");
  ctx.restore();
}

function drawWord(
  ctx: CanvasRenderingContext2D,
  word: string,
  box: CellBox,
  fill: string,
  outline: string | null,
  letterAspect = 0.58,
): void {
  const letters = [...word];
  const tracking = 0.06;
  const letterH = box.h;
  const letterW = letterH * letterAspect;
  const total = letters.length * letterW + (letters.length - 1) * letterW * tracking;
  const scale = Math.min(1, box.w / total);
  const w = letterW * scale;
  const h = letterH * scale;
  const gap = w * tracking;
  let x = box.x + (box.w - (letters.length * w + (letters.length - 1) * gap)) / 2;
  const y = box.y + (box.h - h) / 2;
  for (const letter of letters) {
    drawGlyph(ctx, letter, x, y, w, h, fill, outline);
    x += w + gap;
  }
}

function drawStar(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number): void {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.fillStyle = "#f0c24a";
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (Math.PI / 4) * i - Math.PI / 2;
    const rad = i % 2 === 0 ? r : r * 0.42;
    const x = Math.cos(a) * rad;
    const y = Math.sin(a) * rad;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawPot(ctx: CanvasRenderingContext2D, box: CellBox): void {
  const cx = box.x + box.w * 0.5;
  const cy = box.y + box.h * 0.62;
  const s = Math.min(box.w * 0.82, box.h);

  ctx.save();
  ctx.strokeStyle = "#f7f1e3";
  ctx.lineCap = "round";
  ctx.lineWidth = s * 0.055;
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.12, cy - s * 0.28);
  ctx.bezierCurveTo(cx - s * 0.22, cy - s * 0.48, cx - s * 0.04, cy - s * 0.58, cx - s * 0.08, cy - s * 0.7);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx + s * 0.12, cy - s * 0.26);
  ctx.bezierCurveTo(cx + s * 0.24, cy - s * 0.46, cx + s * 0.06, cy - s * 0.56, cx + s * 0.1, cy - s * 0.68);
  ctx.stroke();

  ctx.fillStyle = "#241c17";
  ctx.beginPath();
  ctx.ellipse(cx, cy + s * 0.08, s * 0.34, s * 0.13, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(cx - s * 0.33, cy - s * 0.14, s * 0.66, s * 0.24);
  ctx.beginPath();
  ctx.ellipse(cx, cy - s * 0.14, s * 0.33, s * 0.12, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#c83b27";
  ctx.beginPath();
  ctx.ellipse(cx, cy - s * 0.16, s * 0.26, s * 0.08, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#f2a33a";
  ctx.beginPath();
  ctx.ellipse(cx - s * 0.08, cy - s * 0.17, s * 0.035, s * 0.02, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(cx + s * 0.07, cy - s * 0.15, s * 0.04, s * 0.018, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#1a1512";
  ctx.lineWidth = s * 0.03;
  ctx.beginPath();
  ctx.ellipse(cx, cy - s * 0.14, s * 0.33, s * 0.12, 0, 0, Math.PI * 2);
  ctx.stroke();

  drawStar(ctx, cx - s * 0.42, cy - s * 0.36, s * 0.04);
  drawStar(ctx, cx + s * 0.44, cy - s * 0.3, s * 0.032);
  ctx.restore();
}

function drawCargoCell(ctx: CanvasRenderingContext2D, box: CellBox): void {
  const inner: CellBox = {
    x: box.x + 36,
    y: box.y + 20,
    w: box.w - 72,
    h: box.h - 40,
  };
  drawPot(ctx, { x: inner.x, y: inner.y - inner.h * 0.08, w: inner.w, h: inner.h * 0.82 });
  drawWord(
    ctx,
    "GULASCH",
    {
      x: inner.x + 6,
      y: inner.y + inner.h * 0.5,
      w: inner.w - 12,
      h: inner.h * 0.32,
    },
    "#f0b83a",
    "#1a1410",
    0.52,
  );
}

function drawPlateCell(ctx: CanvasRenderingContext2D, box: CellBox, name: "OTTO" | "HANS" | "FRITZ"): void {
  const plate: CellBox = {
    x: box.x + PLATE_DRAW.x,
    y: box.y + PLATE_DRAW.y,
    w: PLATE_DRAW.w,
    h: PLATE_DRAW.h,
  };
  ctx.save();
  ctx.beginPath();
  ctx.rect(plate.x, plate.y, plate.w, plate.h);
  ctx.clip();
  ctx.fillStyle = "#eee6cc";
  ctx.fillRect(plate.x, plate.y, plate.w, plate.h);
  ctx.strokeStyle = "#161310";
  ctx.lineWidth = 10;
  ctx.strokeRect(plate.x + 5, plate.y + 5, plate.w - 10, plate.h - 10);
  ctx.strokeStyle = "#2a241c";
  ctx.lineWidth = 3;
  ctx.strokeRect(plate.x + 14, plate.y + 12, plate.w - 28, plate.h - 24);
  drawWord(
    ctx,
    name,
    {
      x: plate.x + 16,
      y: plate.y + 12,
      w: plate.w - 32,
      h: plate.h - 24,
    },
    "#14110e",
    null,
    name === "FRITZ" ? 0.44 : 0.52,
  );
  ctx.restore();
}

function paintAtlas(ctx: CanvasRenderingContext2D): Record<AtlasCellId, AtlasCell> {
  ctx.clearRect(0, 0, DECAL_ATLAS_SIZE, DECAL_ATLAS_SIZE);
  drawCargoCell(ctx, CARGO_BOX);
  drawPlateCell(ctx, PLATE_BOXES.OTTO, "OTTO");
  drawPlateCell(ctx, PLATE_BOXES.HANS, "HANS");
  drawPlateCell(ctx, PLATE_BOXES.FRITZ, "FRITZ");

  const ottoUv: CellBox = {
    x: PLATE_BOXES.OTTO.x + PLATE_DRAW.x,
    y: PLATE_BOXES.OTTO.y + PLATE_DRAW.y,
    w: PLATE_DRAW.w,
    h: PLATE_DRAW.h,
  };
  const hansUv: CellBox = {
    x: PLATE_BOXES.HANS.x + PLATE_DRAW.x,
    y: PLATE_BOXES.HANS.y + PLATE_DRAW.y,
    w: PLATE_DRAW.w,
    h: PLATE_DRAW.h,
  };
  const fritzUv: CellBox = {
    x: PLATE_BOXES.FRITZ.x + PLATE_DRAW.x,
    y: PLATE_BOXES.FRITZ.y + PLATE_DRAW.y,
    w: PLATE_DRAW.w,
    h: PLATE_DRAW.h,
  };

  const cells: Record<AtlasCellId, AtlasCell> = {
    cargo: makeCell("cargo", CARGO_BOX),
    OTTO: makeCell("OTTO", PLATE_BOXES.OTTO, ottoUv),
    HANS: makeCell("HANS", PLATE_BOXES.HANS, hansUv),
    FRITZ: makeCell("FRITZ", PLATE_BOXES.FRITZ, fritzUv),
  };
  for (const cell of Object.values(cells)) {
    if (!cellContainsUv(cell)) {
      throw new Error(`Decal UV for ${cell.id} escapes its padded cell`);
    }
  }
  return cells;
}

function createTexture(): { texture: THREE.CanvasTexture; cells: Record<AtlasCellId, AtlasCell> } {
  const canvas = document.createElement("canvas");
  canvas.width = DECAL_ATLAS_SIZE;
  canvas.height = DECAL_ATLAS_SIZE;
  const ctx = canvas.getContext("2d", { alpha: true });
  if (!ctx) throw new Error("Decal atlas canvas unavailable");
  const cells = paintAtlas(ctx);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.anisotropy = 1;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.needsUpdate = true;
  return { texture, cells };
}

export function acquireDecalAtlas(): {
  texture: THREE.CanvasTexture;
  cells: Record<AtlasCellId, AtlasCell>;
} {
  if (!liveTexture || !liveCells) {
    const created = createTexture();
    liveTexture = created.texture;
    liveCells = created.cells;
    liveAnisotropy = 1;
    createCount += 1;
  }
  refs += 1;
  return { texture: liveTexture, cells: liveCells };
}

export function applyDecalAnisotropy(renderer: THREE.WebGLRenderer): number {
  if (!liveTexture) throw new Error("Decal atlas is not allocated");
  const anisotropy = Math.min(DECAL_ANISOTROPY_CAP, renderer.capabilities.getMaxAnisotropy());
  liveTexture.anisotropy = anisotropy;
  liveTexture.needsUpdate = true;
  liveAnisotropy = anisotropy;
  return anisotropy;
}

export function releaseDecalAtlas(texture?: THREE.Texture): void {
  if (texture && liveTexture && texture !== liveTexture) return;
  refs = Math.max(0, refs - 1);
  if (refs > 0 || !liveTexture) return;
  liveTexture.dispose();
  liveTexture = null;
  liveCells = null;
  liveAnisotropy = 0;
  disposeCount += 1;
}

export function isDecalAtlasTexture(texture: THREE.Texture | null | undefined): boolean {
  return Boolean(texture && liveTexture && texture === liveTexture);
}

export function applyAtlasUvs(geometry: THREE.BufferGeometry, cell: AtlasCell, flipU = false): void {
  const uv = geometry.getAttribute("uv");
  if (!uv) throw new Error("Decal geometry is missing uvs");
  const left = flipU ? cell.u1 : cell.u0;
  const right = flipU ? cell.u0 : cell.u1;
  uv.setXY(0, left, cell.v1);
  uv.setXY(1, right, cell.v1);
  uv.setXY(2, left, cell.v0);
  uv.setXY(3, right, cell.v0);
  uv.needsUpdate = true;
}

export function getDecalAtlasDebug(): DecalAtlasDebug {
  const cells = liveCells ?? {
    cargo: makeCell("cargo", CARGO_BOX),
    OTTO: makeCell("OTTO", PLATE_BOXES.OTTO, {
      x: PLATE_BOXES.OTTO.x + PLATE_DRAW.x,
      y: PLATE_BOXES.OTTO.y + PLATE_DRAW.y,
      w: PLATE_DRAW.w,
      h: PLATE_DRAW.h,
    }),
    HANS: makeCell("HANS", PLATE_BOXES.HANS, {
      x: PLATE_BOXES.HANS.x + PLATE_DRAW.x,
      y: PLATE_BOXES.HANS.y + PLATE_DRAW.y,
      w: PLATE_DRAW.w,
      h: PLATE_DRAW.h,
    }),
    FRITZ: makeCell("FRITZ", PLATE_BOXES.FRITZ, {
      x: PLATE_BOXES.FRITZ.x + PLATE_DRAW.x,
      y: PLATE_BOXES.FRITZ.y + PLATE_DRAW.y,
      w: PLATE_DRAW.w,
      h: PLATE_DRAW.h,
    }),
  };
  return {
    size: DECAL_ATLAS_SIZE,
    powerOfTwo: DECAL_ATLAS_SIZE > 0 && (DECAL_ATLAS_SIZE & (DECAL_ATLAS_SIZE - 1)) === 0,
    createCount,
    disposeCount,
    live: liveTexture != null,
    refs,
    magFilter: liveTexture ? filterName(liveTexture.magFilter) : "LinearFilter",
    minFilter: liveTexture ? filterName(liveTexture.minFilter) : "LinearMipmapLinearFilter",
    generateMipmaps: liveTexture?.generateMipmaps ?? true,
    anisotropy: liveAnisotropy,
    anisotropyCap: DECAL_ANISOTROPY_CAP,
    colorSpace: liveTexture?.colorSpace === THREE.SRGBColorSpace ? "srgb" : String(liveTexture?.colorSpace ?? "srgb"),
    strings: DECAL_STRINGS,
    cells,
    uvInsideCells: Object.values(cells).every(cellContainsUv),
  };
}

export function getDecalAtlasDataURL(): string | null {
  const image = liveTexture?.image as HTMLCanvasElement | undefined;
  return image?.toDataURL("image/png") ?? null;
}
