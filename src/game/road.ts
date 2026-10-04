/** Classic segment-based pseudo-3D road (Pole Position / OutRun lineage). */

export type Segment = {
  index: number;
  /** Precomputed world Z of p1 (index * segmentLength). */
  z: number;
  p1: ProjectedPoint;
  p2: ProjectedPoint;
  curve: number;
  color: SegmentColors;
  sprites: RoadSprite[];
};

export type ProjectedPoint = {
  worldZ: number;
  cameraZ: number;
  screenX: number;
  screenY: number;
  screenW: number;
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
  drawDistance: number;
  cameraHeight: number;
  cameraDepth: number;
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
  // Enough depth for curves; lower than before to cut projector work.
  drawDistance: 90,
  cameraHeight: 1000,
  cameraDepth: 0.84,
  maxSpeed: 220,
  accel: 140,
  brake: 280,
  decel: 60,
  offRoadDecel: 160,
  offRoadLimit: 110,
  steerSpeed: 3.4,
  centrifugal: 0.22,
};

export type BuiltTrack = {
  segments: Segment[];
  /** World Z of the delivery finish gate (win/lose line). */
  finishZ: number;
  finishIndex: number;
};

export function buildTrack(): BuiltTrack {
  const segments: Segment[] = [];
  const add = (n: number, curve = 0): void => {
    for (let i = 0; i < n; i++) {
      const index = segments.length;
      const light = Math.floor(index / 3) % 2 === 0;
      segments.push({
        index,
        z: index * TRACK.segmentLength,
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

  // ~5.5× post–PR #3 segment budget (~1075 → ~5911); curves kept; one finish stub at end.
  // Curves moderated so projector offsets stay sane over drawDistance.
  add(495, 0);
  add(385, 2.4);
  add(302, 0);
  add(440, -2.8);
  add(275, 0);
  add(412, 2.6);
  add(330, -2.2);
  add(248, 0);
  add(385, 2.0);
  add(302, 0);
  add(468, -2.6);
  add(275, 2.2);
  add(330, 0);
  add(412, -1.8);
  add(302, 2.8);
  add(550, 0);

  // Roadside props + finish gate near the end (slightly sparser for draw cost).
  for (let i = 12; i < segments.length - 16; i += 10) {
    const side = i % 20 === 0 ? -1.45 : 1.45;
    segments[i].sprites.push({ offset: side, kind: i % 30 === 0 ? "barrel" : "tree" });
  }
  const finishIndex = segments.length - 10;
  segments[finishIndex].sprites.push({ offset: 0, kind: "finish" });
  segments[finishIndex].color = {
    road: "#e8e8e8",
    grass: segments[finishIndex].color.grass,
    rumble: "#c45c26",
    lane: "#c45c26",
  };

  return {
    segments,
    finishIndex,
    finishZ: segments[finishIndex].z,
  };
}

export function trackLength(segments: Segment[]): number {
  return segments.length * TRACK.segmentLength;
}

export function findSegment(segments: Segment[], z: number, totalLength: number): Segment {
  const zz = ((z % totalLength) + totalLength) % totalLength;
  return segments[(zz / TRACK.segmentLength) | 0];
}

/** In-place project a world-Z point into screen space (no allocations). */
export function project(
  p: ProjectedPoint,
  worldZ: number,
  cameraX: number,
  cameraY: number,
  cameraZ: number,
  canvasWidth: number,
  canvasHeight: number,
): void {
  p.worldZ = worldZ;
  p.cameraZ = worldZ - cameraZ;
  const cz = p.cameraZ > 1 ? p.cameraZ : 1;
  p.scale = TRACK.cameraDepth / cz;
  // cameraX is world-space camera X (player lateral + curve offset); negate into view space.
  p.screenX = ((canvasWidth / 2 - (p.scale * cameraX * canvasWidth) / 2) + 0.5) | 0;
  // cameraY is camera height; ground at 0 → negative camera-space Y flips to +screenY.
  p.screenY = ((canvasHeight / 2 + (p.scale * cameraY * canvasHeight) / 2) + 0.5) | 0;
  p.screenW = ((p.scale * TRACK.roadWidth * canvasWidth) / 2 + 0.5) | 0;
}

function emptyPoint(): ProjectedPoint {
  return {
    worldZ: 0,
    cameraZ: 0,
    screenX: 0,
    screenY: 0,
    screenW: 0,
    scale: 0,
  };
}
