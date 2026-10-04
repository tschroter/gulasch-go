/** Classic segment-based pseudo-3D road (Pole Position / OutRun lineage). */

export type Segment = {
  index: number;
  p1: ProjectedPoint;
  p2: ProjectedPoint;
  curve: number;
  color: SegmentColors;
  sprites: RoadSprite[];
};

export type ProjectedPoint = {
  world: { x: number; y: number; z: number };
  camera: { x: number; y: number; z: number };
  screen: { x: number; y: number; w: number };
  scale: number;
};

export type SegmentColors = {
  road: string;
  grass: string;
  rumble: string;
  lane: string | null;
};

export type RoadSprite = {
  offset: number;
  kind: "tree" | "barrel" | "finish";
};

export type TrackConfig = {
  segmentLength: number;
  roadWidth: number;
  rumbleWidth: number;
  lanes: number;
  drawDistance: number;
  cameraHeight: number;
  cameraDepth: number;
  fogDensity: number;
  maxSpeed: number;
  accel: number;
  brake: number;
  decel: number;
  offRoadDecel: number;
  offRoadLimit: number;
  /** Lateral units per second at full steer — snappy arcade. */
  steerSpeed: number;
  /** Centripetal pull from curves while moving. */
  centrifugal: number;
};

export const TRACK: TrackConfig = {
  segmentLength: 200,
  roadWidth: 2000,
  rumbleWidth: 1.2,
  lanes: 3,
  drawDistance: 180,
  cameraHeight: 1000,
  cameraDepth: 0.84,
  fogDensity: 5,
  maxSpeed: 220,
  accel: 140,
  brake: 280,
  decel: 60,
  offRoadDecel: 160,
  offRoadLimit: 110,
  steerSpeed: 3.4,
  centrifugal: 0.22,
};

export function buildTrack(): Segment[] {
  const segments: Segment[] = [];
  const add = (n: number, curve = 0): void => {
    for (let i = 0; i < n; i++) {
      const index = segments.length;
      const light = Math.floor(index / 3) % 2 === 0;
      segments.push({
        index,
        p1: emptyPoint(),
        p2: emptyPoint(),
        curve,
        color: {
          road: light ? "#6e6a66" : "#5a5652",
          grass: light ? "#3d8f3a" : "#2f6f2e",
          rumble: light ? "#d4c44a" : "#c45c26",
          lane: light ? "#e8d8a8" : null,
        },
        sprites: [],
      });
    }
  };

  // Longer curved delivery route (~4× prior slice length); one finish stub at end.
  add(90, 0);
  add(70, 3.2);
  add(55, 0);
  add(80, -4.0);
  add(50, 0);
  add(75, 3.6);
  add(60, -2.8);
  add(45, 0);
  add(70, 2.6);
  add(55, 0);
  add(85, -3.4);
  add(50, 3.0);
  add(60, 0);
  add(75, -2.4);
  add(55, 3.8);
  add(100, 0);

  // Roadside props + finish gate near the end.
  for (let i = 10; i < segments.length - 16; i += 8) {
    const side = i % 16 === 0 ? -1.45 : 1.45;
    segments[i].sprites.push({ offset: side, kind: i % 24 === 0 ? "barrel" : "tree" });
  }
  const finishIndex = segments.length - 10;
  segments[finishIndex].sprites.push({ offset: 0, kind: "finish" });
  segments[finishIndex].color = {
    road: "#e8e8e8",
    grass: segments[finishIndex].color.grass,
    rumble: "#c45c26",
    lane: "#c45c26",
  };

  return segments;
}

export function trackLength(segments: Segment[]): number {
  return segments.length * TRACK.segmentLength;
}

export function findSegment(segments: Segment[], z: number): Segment {
  const len = trackLength(segments);
  const zz = ((z % len) + len) % len;
  return segments[Math.floor(zz / TRACK.segmentLength) % segments.length];
}

export function project(
  p: ProjectedPoint,
  cameraX: number,
  cameraY: number,
  cameraZ: number,
  canvasWidth: number,
  canvasHeight: number,
): void {
  p.camera.x = (p.world.x || 0) - cameraX;
  p.camera.y = (p.world.y || 0) - cameraY;
  p.camera.z = (p.world.z || 0) - cameraZ;
  p.scale = TRACK.cameraDepth / Math.max(1, p.camera.z);
  p.screen.x = Math.round(canvasWidth / 2 + (p.scale * p.camera.x * canvasWidth) / 2);
  p.screen.y = Math.round(canvasHeight / 2 - (p.scale * p.camera.y * canvasHeight) / 2);
  p.screen.w = Math.round((p.scale * TRACK.roadWidth * canvasWidth) / 2);
}

function emptyPoint(): ProjectedPoint {
  return {
    world: { x: 0, y: 0, z: 0 },
    camera: { x: 0, y: 0, z: 0 },
    screen: { x: 0, y: 0, w: 0 },
    scale: 0,
  };
}
