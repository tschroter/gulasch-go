import { Input } from "./input";
import { PALETTE } from "./palette";
import {
  TRACK,
  buildTrack,
  findSegment,
  project,
  trackLength,
  type Segment,
} from "./road";
import {
  PLAYER_TRUCK,
  RIVAL_TRUCK,
  drawProp,
  drawTruck,
} from "./sprites";
import { RaceUI, type RaceOutcome } from "./ui";

export type DebugSnapshot = {
  phase: "racing" | "result";
  outcome: RaceOutcome | null;
  elapsed: number;
  playerZ: number;
  rivalZ: number;
  playerX: number;
  speed: number;
  finishZ: number;
  totalLength: number;
  /** Rolling average frame time ms (dev/smoke aid). */
  frameMs: number;
};

const FB_W = 320;
const FB_H = 200;
/** Cap display buffer scale — avoids full-window×DPR blits. */
const MAX_SCALE = 3;

export class Game {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly fb: HTMLCanvasElement;
  private readonly fbCtx: CanvasRenderingContext2D;
  private readonly input = new Input();
  private readonly ui = new RaceUI();
  private readonly segments: Segment[];
  private readonly totalLength: number;
  private readonly finishZ: number;
  private readonly segCount: number;

  private playerX = 0;
  private playerZ = 0;
  private speed = 0;
  private rivalZ = 40;
  private rivalX = 0.15;
  private phase: "racing" | "result" = "racing";
  private outcome: RaceOutcome | null = null;
  private elapsed = 0;
  private raf = 0;
  private lastTs = 0;
  private steerLean = 0;
  private frameMs = 16;
  private displayScale = 1;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext("2d", { alpha: false, desynchronized: true });
    if (!ctx) throw new Error("2D context unavailable");
    this.ctx = ctx;
    this.ctx.imageSmoothingEnabled = false;

    this.fb = document.createElement("canvas");
    this.fb.width = FB_W;
    this.fb.height = FB_H;
    const fbCtx = this.fb.getContext("2d", { alpha: false, desynchronized: true });
    if (!fbCtx) throw new Error("Framebuffer 2D context unavailable");
    this.fbCtx = fbCtx;
    this.fbCtx.imageSmoothingEnabled = false;

    const built = buildTrack();
    this.segments = built.segments;
    this.segCount = this.segments.length;
    this.totalLength = trackLength(this.segments);
    // Win/lose only at the delivery gate sprite — not a mid-course ratio.
    this.finishZ = built.finishZ;
    this.resetRace();
  }

  start(): void {
    this.lastTs = performance.now();
    const loop = (ts: number): void => {
      const dtMs = ts - this.lastTs;
      this.lastTs = ts;
      // EMA of frame time for debug; clamp sim dt.
      this.frameMs = this.frameMs * 0.9 + dtMs * 0.1;
      const dt = dtMs > 50 ? 0.05 : dtMs / 1000;
      this.update(dt);
      this.render();
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
    window.addEventListener("resize", this.onResize);
    this.onResize();
  }

  dispose(): void {
    cancelAnimationFrame(this.raf);
    window.removeEventListener("resize", this.onResize);
    this.input.dispose();
  }

  getDebugSnapshot(): DebugSnapshot {
    return {
      phase: this.phase,
      outcome: this.outcome,
      elapsed: this.elapsed,
      playerZ: this.playerZ,
      rivalZ: this.rivalZ,
      playerX: this.playerX,
      speed: this.speed,
      finishZ: this.finishZ,
      totalLength: this.totalLength,
      frameMs: this.frameMs,
    };
  }

  private resetRace(): void {
    this.playerX = 0;
    this.playerZ = 0;
    this.speed = 0;
    // Start rival ahead on the visible road (not under/behind the camera).
    this.rivalZ = TRACK.segmentLength * 28;
    this.rivalX = 0.22;
    this.phase = "racing";
    this.outcome = null;
    this.elapsed = 0;
    this.steerLean = 0;
    this.ui.hide();
  }

  private update(dt: number): void {
    if (this.input.consumeRestart()) {
      this.resetRace();
      return;
    }

    if (this.phase === "result") return;

    this.elapsed += dt;
    const keys = this.input.state;

    if (keys.forward) this.speed += TRACK.accel * dt;
    else if (keys.back) this.speed -= TRACK.brake * dt;
    else this.speed -= TRACK.decel * dt;

    this.speed = Math.max(0, Math.min(TRACK.maxSpeed, this.speed));

    const segment = findSegment(this.segments, this.playerZ, this.totalLength);
    const speedPct = this.speed / TRACK.maxSpeed;
    const dx = TRACK.steerSpeed * speedPct * dt;

    if (keys.left) this.playerX -= dx;
    if (keys.right) this.playerX += dx;
    this.playerX -= dx * speedPct * segment.curve * TRACK.centrifugal;

    if (Math.abs(this.playerX) > 1) {
      if (this.speed > TRACK.offRoadLimit) this.speed -= TRACK.offRoadDecel * dt;
      this.playerX = Math.max(-1.5, Math.min(1.5, this.playerX));
    } else {
      this.playerX = Math.max(-1.2, Math.min(1.2, this.playerX));
    }

    this.playerZ += this.speed * dt * 60;
    const steerTarget = (keys.left ? -1 : 0) + (keys.right ? 1 : 0);
    this.steerLean += (steerTarget - this.steerLean) * Math.min(1, dt * 12);

    const rivalSpeed = TRACK.maxSpeed * 0.52;
    this.rivalZ += rivalSpeed * dt * 60;
    this.rivalX = 0.22 + Math.sin(this.rivalZ * 0.0016) * 0.28;

    this.checkFinish();
  }

  private checkFinish(): void {
    const playerDone = this.playerZ >= this.finishZ;
    const rivalDone = this.rivalZ >= this.finishZ;
    if (!playerDone && !rivalDone) return;

    this.phase = "result";
    if (playerDone && (!rivalDone || this.playerZ >= this.rivalZ)) {
      this.outcome = "win";
    } else {
      this.outcome = "lose";
    }
    this.ui.showResult(this.outcome);
  }

  private render(): void {
    const ctx = this.fbCtx;
    const base = findSegment(this.segments, this.playerZ, this.totalLength);
    const baseIndex = base.index;
    const cameraZ = this.playerZ;
    const playerCamX = this.playerX * TRACK.roadWidth;
    let x = 0;
    let dx = 0;
    let maxY = FB_H;

    // Sky + solid ground under horizon (covers gaps; avoids black holes).
    const horizon = (FB_H * 0.42) | 0;
    ctx.fillStyle = PALETTE.skyTop;
    ctx.fillRect(0, 0, FB_W, horizon);
    ctx.fillStyle = PALETTE.skyBot;
    ctx.fillRect(0, (horizon * 0.55) | 0, FB_W, horizon - ((horizon * 0.55) | 0));
    ctx.fillStyle = PALETTE.hill;
    ctx.fillRect(0, horizon - 8, FB_W, 8);
    ctx.fillStyle = PALETTE.grassA;
    ctx.fillRect(0, horizon, FB_W, FB_H - horizon);

    // Project + draw near → far with maxY clip (each band painted once).
    for (let n = 0; n < TRACK.drawDistance; n++) {
      const segIndex = baseIndex + n;
      const segment = this.segments[segIndex < this.segCount ? segIndex : segIndex - this.segCount];
      const looped = segIndex >= this.segCount;
      const camZ = looped ? cameraZ - this.totalLength : cameraZ;

      project(segment.p1, segment.z, playerCamX - x, TRACK.cameraHeight, camZ, FB_W, FB_H);
      project(
        segment.p2,
        segment.z + TRACK.segmentLength,
        playerCamX - x - dx,
        TRACK.cameraHeight,
        camZ,
        FB_W,
        FB_H,
      );

      x += dx;
      dx += segment.curve;

      const y1 = segment.p1.screenY;
      const y2 = segment.p2.screenY;
      if (
        segment.p1.cameraZ <= TRACK.cameraDepth ||
        y2 >= y1 ||
        y2 >= maxY ||
        segment.p1.screenW > FB_W * 3
      ) {
        continue;
      }

      this.drawSegment(ctx, segment);
      maxY = y2;
      if (maxY <= horizon) break;
    }

    this.drawSprites(baseIndex);
    this.drawRival(baseIndex);

    drawTruck(ctx, FB_W / 2, FB_H - 18, 28, PLAYER_TRUCK, this.steerLean);

    // Integer-scaled blit (canvas buffer is FB×scale, not window×DPR).
    this.ctx.drawImage(
      this.fb,
      0,
      0,
      FB_W,
      FB_H,
      0,
      0,
      FB_W * this.displayScale,
      FB_H * this.displayScale,
    );
  }

  /**
   * Side grass strips + rumble + road — no full-width fillRect overdraw.
   * Matches Jake Gordon’s segment paint (left/right grass only).
   */
  private drawSegment(ctx: CanvasRenderingContext2D, segment: Segment): void {
    const y1 = segment.p1.screenY;
    const y2 = segment.p2.screenY;
    const h = y1 - y2;
    if (h < 1) return;

    const rumble = TRACK.rumbleWidth;
    // Clamp projected edges so hard curves cannot spray inverted quads across the sky.
    const x1 = segment.p1.screenX;
    const w1 = segment.p1.screenW;
    const x2 = segment.p2.screenX;
    const w2 = segment.p2.screenW;
    const l1 = Math.max(-FB_W, Math.min(FB_W * 2, x1 - w1 * rumble));
    const r1 = Math.max(-FB_W, Math.min(FB_W * 2, x1 + w1 * rumble));
    const l2 = Math.max(-FB_W, Math.min(FB_W * 2, x2 - w2 * rumble));
    const r2 = Math.max(-FB_W, Math.min(FB_W * 2, x2 + w2 * rumble));
    const rl1 = Math.max(-FB_W, Math.min(FB_W * 2, x1 - w1));
    const rr1 = Math.max(-FB_W, Math.min(FB_W * 2, x1 + w1));
    const rl2 = Math.max(-FB_W, Math.min(FB_W * 2, x2 - w2));
    const rr2 = Math.max(-FB_W, Math.min(FB_W * 2, x2 + w2));

    // 1px bands: fillRect is cheaper than path quads.
    if (h <= 1) {
      const y = y2 | 0;
      ctx.fillStyle = segment.color.grass;
      ctx.fillRect(0, y, Math.max(0, l2) | 0, 1);
      ctx.fillRect(Math.min(FB_W, r2) | 0, y, FB_W, 1);
      ctx.fillStyle = segment.color.rumble;
      ctx.fillRect(l2 | 0, y, Math.max(1, (r2 - l2) | 0), 1);
      ctx.fillStyle = segment.color.road;
      ctx.fillRect(rl2 | 0, y, Math.max(1, (rr2 - rl2) | 0), 1);
      return;
    }

    this.quad(ctx, segment.color.grass, 0, y1, l1, y1, l2, y2, 0, y2);
    this.quad(ctx, segment.color.grass, r1, y1, FB_W, y1, FB_W, y2, r2, y2);
    this.quad(ctx, segment.color.rumble, l1, y1, r1, y1, r2, y2, l2, y2);
    this.quad(ctx, segment.color.road, rl1, y1, rr1, y1, rr2, y2, rl2, y2);

    if (segment.color.lane && w1 > 8) {
      const lw1 = w1 * 0.04;
      const lw2 = w2 * 0.04;
      this.quad(ctx, segment.color.lane, x1 - lw1, y1, x1 + lw1, y1, x2 + lw2, y2, x2 - lw2, y2);
    }
  }

  private drawSprites(baseIndex: number): void {
    const ctx = this.fbCtx;
    for (let n = TRACK.drawDistance - 1; n > 0; n--) {
      const segIndex = baseIndex + n;
      const segment = this.segments[segIndex < this.segCount ? segIndex : segIndex - this.segCount];
      const sprites = segment.sprites;
      if (sprites.length === 0) continue;
      if (segment.p1.cameraZ <= TRACK.cameraDepth) continue;

      const roadHalf = segment.p1.screenW;
      const spriteY = segment.p1.screenY;
      if (roadHalf < 4 || spriteY < 0 || spriteY > FB_H) continue;

      for (let i = 0; i < sprites.length; i++) {
        const sprite = sprites[i];
        const spriteScale = roadHalf * (sprite.kind === "finish" ? 0.85 : 0.4);
        // Skip sub-pixel props in the distance.
        if (spriteScale < 3 && sprite.kind !== "finish") continue;
        drawProp(
          ctx,
          sprite.kind,
          segment.p1.screenX + sprite.offset * roadHalf,
          spriteY,
          spriteScale,
        );
      }
    }
  }

  private drawRival(baseIndex: number): void {
    if (this.rivalZ <= this.playerZ) return;

    const rivalSeg = findSegment(this.segments, this.rivalZ, this.totalLength);
    let n = rivalSeg.index - baseIndex;
    if (n < 0) n += this.segCount;
    if (n <= 0 || n >= TRACK.drawDistance) return;

    const segment = this.segments[(baseIndex + n) % this.segCount];
    if (segment.p1.cameraZ <= TRACK.cameraDepth) return;

    const roadHalf = segment.p1.screenW;
    const spriteY = segment.p1.screenY;
    if (roadHalf < 3 || spriteY < 8 || spriteY > FB_H - 4) return;

    const spriteScale = Math.max(10, Math.min(48, roadHalf * 0.55));
    drawTruck(
      this.fbCtx,
      segment.p1.screenX + this.rivalX * roadHalf,
      spriteY,
      spriteScale,
      RIVAL_TRUCK,
      0,
    );
  }

  private quad(
    ctx: CanvasRenderingContext2D,
    color: string,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    x3: number,
    y3: number,
    x4: number,
    y4: number,
  ): void {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.lineTo(x3, y3);
    ctx.lineTo(x4, y4);
    ctx.fill();
  }

  private readonly onResize = (): void => {
    const sw = window.innerWidth || FB_W;
    const sh = window.innerHeight || FB_H;
    this.displayScale = Math.max(1, Math.min(MAX_SCALE, Math.floor(Math.min(sw / FB_W, sh / FB_H))));
    this.canvas.width = FB_W * this.displayScale;
    this.canvas.height = FB_H * this.displayScale;
    this.ctx.imageSmoothingEnabled = false;
  };
}
