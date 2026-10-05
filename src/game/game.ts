import type { DecalAtlasDebug } from "./decalAtlas";
import { Input } from "./input";
import { RaceRenderer, type DecalFixtureKind, type DecalMetrics } from "./renderer";
import { FINISH_DISTANCE, ROAD_WIDTH, ROUTE_LENGTH, SHOULDER_WIDTH } from "./track3d";
import { RaceUI, type RaceOutcome } from "./ui";

type RacerName = "OTTO" | "HANS" | "FRITZ";

type RacerState = {
  name: RacerName;
  distance: number;
  lateral: number;
  speed: number;
  finished: boolean;
};

export type DebugSnapshot = {
  phase: "racing" | "result";
  outcome: RaceOutcome | null;
  elapsed: number;
  playerZ: number;
  rivalZ: number;
  playerX: number;
  playerScreenX: number;
  speed: number;
  finishZ: number;
  totalLength: number;
  frameMs: number;
  frameP95Ms: number;
  cargo: number;
  rank: number;
  drawCalls: number;
  triangles: number;
  racers: Array<{
    name: RacerName;
    distance: number;
    rank: number;
    finished: boolean;
  }>;
};

const MAX_SPEED = 42;
const ACCEL = 18;
const BRAKE = 28;
const COAST = 8;
const STEER_SPEED = 5.4;

export class Game {
  private readonly input = new Input();
  private readonly ui = new RaceUI();
  private readonly view: RaceRenderer;
  private readonly racers: RacerState[] = [
    { name: "OTTO", distance: 0, lateral: 0, speed: 0, finished: false },
    { name: "HANS", distance: 10, lateral: -5.5, speed: 23.4, finished: false },
    { name: "FRITZ", distance: 26, lateral: 5.5, speed: 22.2, finished: false },
  ];
  private phase: "racing" | "result" = "racing";
  private outcome: RaceOutcome | null = null;
  private elapsed = 0;
  private cargo = 100;
  private raf = 0;
  private lastTs = 0;
  private steerLean = 0;
  private frameMs = 16;
  private readonly frameSamples: number[] = [];
  private fixtureHold = false;

  constructor(canvas: HTMLCanvasElement) {
    this.view = new RaceRenderer(canvas);
    this.resetRace();
  }

  start(): void {
    this.lastTs = performance.now();
    const loop = (ts: number): void => {
      const dtMs = Math.max(0, ts - this.lastTs);
      this.lastTs = ts;
      this.frameMs = this.frameMs * 0.9 + dtMs * 0.1;
      this.frameSamples.push(dtMs);
      if (this.frameSamples.length > 600) this.frameSamples.shift();
      const dt = dtMs > 50 ? 0.05 : dtMs / 1000;
      this.update(dt);
      this.view.render(this.racers, this.steerLean, dt);
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  dispose(): void {
    cancelAnimationFrame(this.raf);
    this.input.dispose();
    this.view.dispose();
  }

  applyDecalFixture(kind: DecalFixtureKind): DecalMetrics {
    this.fixtureHold = true;
    this.phase = "racing";
    this.outcome = null;
    this.ui.hide();
    const metrics = this.view.applyDecalFixture(kind, this.racers);
    this.updateHud();
    return metrics;
  }

  getDecalDebug(): DecalAtlasDebug {
    return this.view.getDecalDebug();
  }

  getDecalAtlasDataURL(): string | null {
    return this.view.getDecalAtlasDataURL();
  }

  getDecalMetrics(): DecalMetrics {
    return this.view.measureDecals();
  }

  getDebugSnapshot(): DebugSnapshot {
    const sorted = [...this.racers].sort((a, b) => b.distance - a.distance);
    const ranking = new Map(sorted.map((racer, index) => [racer.name, index + 1]));
    const frames = [...this.frameSamples].sort((a, b) => a - b);
    const p95Index = Math.min(frames.length - 1, Math.floor(frames.length * 0.95));
    const player = this.racers[0];
    const hans = this.racers[1];
    return {
      phase: this.phase,
      outcome: this.outcome,
      elapsed: this.elapsed,
      playerZ: player.distance,
      rivalZ: hans.distance,
      playerX: player.lateral,
      playerScreenX: this.view.playerScreenX,
      speed: player.speed,
      finishZ: FINISH_DISTANCE,
      totalLength: ROUTE_LENGTH,
      frameMs: this.frameMs,
      frameP95Ms: frames.length ? frames[p95Index] : 0,
      cargo: this.cargo,
      rank: ranking.get("OTTO") ?? 3,
      drawCalls: this.view.drawCalls,
      triangles: this.view.triangles,
      racers: this.racers.map((racer) => ({
        name: racer.name,
        distance: racer.distance,
        rank: ranking.get(racer.name) ?? 3,
        finished: racer.finished,
      })),
    };
  }

  private resetRace(): void {
    Object.assign(this.racers[0], {
      distance: 0,
      lateral: 0,
      speed: 0,
      finished: false,
    });
    Object.assign(this.racers[1], {
      distance: 10,
      lateral: -5.5,
      speed: 23.4,
      finished: false,
    });
    Object.assign(this.racers[2], {
      distance: 26,
      lateral: 5.5,
      speed: 22.2,
      finished: false,
    });
    this.phase = "racing";
    this.outcome = null;
    this.elapsed = 0;
    this.cargo = 100;
    this.steerLean = 0;
    this.fixtureHold = false;
    this.view.resetCamera();
    this.ui.hide();
    this.updateHud();
  }

  private update(dt: number): void {
    if (this.input.consumeRestart()) {
      this.resetRace();
      return;
    }
    if (this.fixtureHold) {
      this.view.render(this.racers, 0, dt);
      return;
    }
    if (this.phase === "result") return;

    this.elapsed += dt;
    const keys = this.input.state;
    const player = this.racers[0];

    if (keys.forward) player.speed += ACCEL * dt;
    else if (keys.back) player.speed -= BRAKE * dt;
    else player.speed -= COAST * dt;
    player.speed = Math.max(0, Math.min(MAX_SPEED, player.speed));

    const speedPct = player.speed / MAX_SPEED;
    const dx = STEER_SPEED * (0.25 + speedPct * 0.75) * dt;
    if (keys.left) player.lateral -= dx;
    if (keys.right) player.lateral += dx;
    player.lateral = Math.max(-8.5, Math.min(8.5, player.lateral));
    if (Math.abs(player.lateral) > ROAD_WIDTH * 0.5 - 1.1) {
      player.speed = Math.max(0, player.speed - 12 * dt);
    }
    if (Math.abs(player.lateral) > SHOULDER_WIDTH * 0.5) {
      this.cargo = Math.max(0, this.cargo - 2.6 * dt);
    }

    player.distance += player.speed * dt;
    const steerTarget = (keys.left ? -1 : 0) + (keys.right ? 1 : 0);
    this.steerLean += (steerTarget - this.steerLean) * Math.min(1, dt * 12);

    const hans = this.racers[1];
    const fritz = this.racers[2];
    hans.distance += hans.speed * dt;
    fritz.distance += fritz.speed * dt;
    hans.lateral = -5.5 + Math.sin(hans.distance * 0.025) * 0.28;
    fritz.lateral = 5.5 + Math.sin(fritz.distance * 0.021 + 1.7) * 0.28;

    this.checkFinish();
    this.updateHud();
  }

  private checkFinish(): void {
    const winner = this.racers.find((racer) => racer.distance >= FINISH_DISTANCE);
    if (!winner) return;
    for (const racer of this.racers) {
      racer.finished = racer.distance >= FINISH_DISTANCE;
    }
    this.phase = "result";
    this.outcome = winner.name === "OTTO" ? "win" : "lose";
    this.ui.showResult(this.outcome);
  }

  private updateHud(): void {
    const player = this.racers[0];
    const rank = 1 + this.racers.filter((racer) => racer.distance > player.distance).length;
    this.ui.update(this.elapsed, rank, player.speed, this.cargo);
  }
}
