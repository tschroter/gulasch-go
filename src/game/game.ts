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
};

const FB_W = 320;
const FB_H = 200;
const FINISH_Z_RATIO = 0.92;

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

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("2D context unavailable");
    this.ctx = ctx;
    this.ctx.imageSmoothingEnabled = false;

    this.fb = document.createElement("canvas");
    this.fb.width = FB_W;
    this.fb.height = FB_H;
    const fbCtx = this.fb.getContext("2d");
    if (!fbCtx) throw new Error("Framebuffer 2D context unavailable");
    this.fbCtx = fbCtx;
    this.fbCtx.imageSmoothingEnabled = false;

    this.segments = buildTrack();
    this.totalLength = trackLength(this.segments);
    this.finishZ = this.totalLength * FINISH_Z_RATIO;
    this.resetRace();
  }

  start(): void {
    this.lastTs = performance.now();
    const loop = (ts: number): void => {
      const dt = Math.min(0.05, (ts - this.lastTs) / 1000);
      this.lastTs = ts;
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
    };
  }

  private resetRace(): void {
    this.playerX = 0;
    this.playerZ = 0;
    this.speed = 0;
    this.rivalZ = TRACK.segmentLength * 2;
    this.rivalX = 0.18;
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

    // Light arcade throttle — snappy, not tanky.
    if (keys.forward) this.speed += TRACK.accel * dt;
    else if (keys.back) this.speed -= TRACK.brake * dt;
    else this.speed -= TRACK.decel * dt;

    this.speed = Math.max(0, Math.min(TRACK.maxSpeed, this.speed));

    const segment = findSegment(this.segments, this.playerZ);
    const speedPct = this.speed / TRACK.maxSpeed;
    const dx = TRACK.steerSpeed * speedPct * dt;

    // Immediate lateral response (minimal inertia).
    if (keys.left) this.playerX -= dx;
    if (keys.right) this.playerX += dx;

    // Curve pull — present but not “sehr schwer”.
    this.playerX -= dx * speedPct * segment.curve * TRACK.centrifugal;

    const offRoad = Math.abs(this.playerX) > 1;
    if (offRoad) {
      if (this.speed > TRACK.offRoadLimit) {
        this.speed -= TRACK.offRoadDecel * dt;
      }
      this.playerX = Math.max(-1.5, Math.min(1.5, this.playerX));
    } else {
      this.playerX = Math.max(-1.2, Math.min(1.2, this.playerX));
    }

    this.playerZ += this.speed * dt * 60;
    this.steerLean += ((keys.left ? -1 : 0) + (keys.right ? 1 : 0) - this.steerLean) * Math.min(1, dt * 12);

    // Rival: steady advance, mild weave; beatable with clean W (~10s solo).
    const rivalSpeed = TRACK.maxSpeed * 0.48;
    this.rivalZ += rivalSpeed * dt * 60;
    this.rivalX = 0.18 + Math.sin(this.rivalZ * 0.0022) * 0.35;

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
    const base = findSegment(this.segments, this.playerZ);
    const cameraZ = this.playerZ;
    let x = 0;
    let dx = 0;
    let maxY = FB_H;

    // Sky bands (flat — no smooth gradient fill).
    const horizon = Math.floor(FB_H * 0.42);
    ctx.fillStyle = PALETTE.skyTop;
    ctx.fillRect(0, 0, FB_W, horizon);
    ctx.fillStyle = PALETTE.skyBot;
    ctx.fillRect(0, Math.floor(horizon * 0.55), FB_W, horizon - Math.floor(horizon * 0.55));
    ctx.fillStyle = PALETTE.hill;
    ctx.fillRect(0, horizon - 8, FB_W, 8);

    // Project + draw road far → near (Jake Gordon–style segment projector).
    for (let n = 0; n < TRACK.drawDistance; n++) {
      const segIndex = (base.index + n) % this.segments.length;
      const segment = this.segments[segIndex];
      const looped = segIndex < base.index;
      const camZ = cameraZ - (looped ? this.totalLength : 0);

      segment.p1.world.z = segIndex * TRACK.segmentLength;
      segment.p2.world.z = segment.p1.world.z + TRACK.segmentLength;
      segment.p1.world.y = 0;
      segment.p2.world.y = 0;
      segment.p1.world.x = 0;
      segment.p2.world.x = 0;

      project(segment.p1, this.playerX * TRACK.roadWidth - x, TRACK.cameraHeight, camZ, FB_W, FB_H);
      project(
        segment.p2,
        this.playerX * TRACK.roadWidth - x - dx,
        TRACK.cameraHeight,
        camZ,
        FB_W,
        FB_H,
      );

      x += dx;
      dx += segment.curve;

      if (
        segment.p1.camera.z <= TRACK.cameraDepth ||
        segment.p2.screen.y >= segment.p1.screen.y ||
        segment.p2.screen.y >= maxY
      ) {
        continue;
      }

      this.drawSegment(ctx, segment);
      maxY = segment.p2.screen.y;
    }

    // Sprites (near → far for painter order on props; draw after road strips).
    this.drawSprites(base);

    // Player truck fixed near bottom-center.
    drawTruck(ctx, FB_W / 2, FB_H - 18, 28, PLAYER_TRUCK, this.steerLean);

    // Nearest-neighbor upscale to display canvas.
    this.ctx.imageSmoothingEnabled = false;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.drawImage(this.fb, 0, 0, this.canvas.width, this.canvas.height);
  }

  private drawSegment(ctx: CanvasRenderingContext2D, segment: Segment): void {
    const p1 = segment.p1.screen;
    const p2 = segment.p2.screen;
    const rumbleW = TRACK.rumbleWidth;

    // Grass
    ctx.fillStyle = segment.color.grass;
    ctx.fillRect(0, p2.y, FB_W, Math.max(1, p1.y - p2.y));

    // Rumble + road polygons
    this.polygon(ctx, segment.color.rumble, p1.x, p1.y, p1.w * rumbleW, p2.x, p2.y, p2.w * rumbleW);
    this.polygon(ctx, segment.color.road, p1.x, p1.y, p1.w, p2.x, p2.y, p2.w);

    if (segment.color.lane) {
      const laneW1 = p1.w * 0.04;
      const laneW2 = p2.w * 0.04;
      this.polygon(ctx, segment.color.lane, p1.x, p1.y, laneW1, p2.x, p2.y, laneW2);
    }
  }

  private drawSprites(base: Segment): void {
    const ctx = this.fbCtx;
    for (let n = TRACK.drawDistance - 1; n > 0; n--) {
      const segment = this.segments[(base.index + n) % this.segments.length];
      const scale = segment.p1.scale;
      if (scale <= 0 || segment.p1.camera.z <= TRACK.cameraDepth) continue;

      for (const sprite of segment.sprites) {
        const spriteScale = (scale * FB_W) / 2;
        const spriteX =
          segment.p1.screen.x +
          scale * sprite.offset * TRACK.roadWidth * (FB_W / 2);
        const spriteY = segment.p1.screen.y;
        if (sprite.kind === "finish") {
          drawProp(ctx, "finish", spriteX, spriteY, spriteScale * 0.9);
        } else {
          drawProp(ctx, sprite.kind, spriteX, spriteY, spriteScale * 0.55);
        }
      }

      // Rival on this segment
      const rivalSeg = findSegment(this.segments, this.rivalZ);
      if (rivalSeg.index === segment.index) {
        const spriteScale = Math.max(4, (scale * FB_W) / 2.4);
        const spriteX =
          segment.p1.screen.x +
          scale * this.rivalX * TRACK.roadWidth * (FB_W / 2);
        drawTruck(ctx, spriteX, segment.p1.screen.y, spriteScale, RIVAL_TRUCK, 0);
      }
    }
  }

  private polygon(
    ctx: CanvasRenderingContext2D,
    color: string,
    x1: number,
    y1: number,
    w1: number,
    x2: number,
    y2: number,
    w2: number,
  ): void {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x1 - w1, y1);
    ctx.lineTo(x2 - w2, y2);
    ctx.lineTo(x2 + w2, y2);
    ctx.lineTo(x1 + w1, y1);
    ctx.closePath();
    ctx.fill();
  }

  private readonly onResize = (): void => {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    this.canvas.width = Math.floor(window.innerWidth * dpr);
    this.canvas.height = Math.floor(window.innerHeight * dpr);
    this.ctx.imageSmoothingEnabled = false;
  };
}
