import * as THREE from "three";

/** Road half-width in world units. */
export const ROAD_HALF_WIDTH = 4.2;

export type TrackSample = {
  position: THREE.Vector3;
  tangent: THREE.Vector3;
  normal: THREE.Vector3;
  binormal: THREE.Vector3;
};

/**
 * Short delivery run with visible S-curves — not a straight corridor.
 * Progress `t` is 0..1 along the centerline.
 */
export class Track {
  readonly curve: THREE.CatmullRomCurve3;
  readonly length: number;
  readonly finishT = 0.96;
  readonly mesh: THREE.Group;

  private readonly up = new THREE.Vector3(0, 1, 0);

  constructor() {
    const points = [
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(2, 0, -18),
      new THREE.Vector3(14, 0, -36),
      new THREE.Vector3(8, 0, -56),
      new THREE.Vector3(-10, 0, -74),
      new THREE.Vector3(-4, 0, -96),
      new THREE.Vector3(12, 0, -118),
      new THREE.Vector3(6, 0, -140),
    ];

    this.curve = new THREE.CatmullRomCurve3(points, false, "catmullrom", 0.35);
    this.length = this.curve.getLength();
    this.mesh = this.buildMesh();
  }

  sample(t: number): TrackSample {
    const clamped = THREE.MathUtils.clamp(t, 0, 1);
    const position = this.curve.getPointAt(clamped);
    const tangent = this.curve.getTangentAt(clamped).normalize();
    const binormal = new THREE.Vector3()
      .crossVectors(this.up, tangent)
      .normalize();
    // Fallback if tangent is nearly vertical (shouldn't happen on this track).
    if (binormal.lengthSq() < 1e-6) {
      binormal.set(1, 0, 0);
    }
    const normal = new THREE.Vector3()
      .crossVectors(tangent, binormal)
      .normalize();
    return { position, tangent, normal, binormal };
  }

  /** Closest centerline progress for a world position (coarse scan + refine). */
  nearestT(world: THREE.Vector3): number {
    const samples = 80;
    let bestT = 0;
    let bestDist = Infinity;
    const tmp = new THREE.Vector3();

    for (let i = 0; i <= samples; i++) {
      const t = i / samples;
      this.curve.getPointAt(t, tmp);
      const d = tmp.distanceToSquared(world);
      if (d < bestDist) {
        bestDist = d;
        bestT = t;
      }
    }

    const window = 1 / samples;
    const steps = 12;
    for (let i = 0; i <= steps; i++) {
      const t = THREE.MathUtils.clamp(
        bestT - window + (i / steps) * window * 2,
        0,
        1,
      );
      this.curve.getPointAt(t, tmp);
      const d = tmp.distanceToSquared(world);
      if (d < bestDist) {
        bestDist = d;
        bestT = t;
      }
    }

    return bestT;
  }

  lateralOffset(world: THREE.Vector3, t: number): number {
    const sample = this.sample(t);
    const toPoint = new THREE.Vector3().subVectors(world, sample.position);
    return toPoint.dot(sample.binormal);
  }

  private buildMesh(): THREE.Group {
    const group = new THREE.Group();
    group.name = "track";

    const segments = 64;
    const half = ROAD_HALF_WIDTH;
    const positions: number[] = [];
    const colors: number[] = [];
    const indices: number[] = [];

    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const { position, binormal } = this.sample(t);
      const left = position.clone().addScaledVector(binormal, half);
      const right = position.clone().addScaledVector(binormal, -half);
      // Slight road crown so it reads as a strip.
      left.y = 0.02;
      right.y = 0.02;
      positions.push(left.x, left.y, left.z, right.x, right.y, right.z);

      const stripe = i % 4 < 2;
      // Warm asphalt that still reads under the low-res PS1 pass.
      const r = stripe ? 0.62 : 0.5;
      const g = stripe ? 0.52 : 0.42;
      const b = stripe ? 0.36 : 0.3;
      colors.push(r, g, b, r, g, b);

      if (i < segments) {
        const a = i * 2;
        const b = a + 1;
        const c = a + 2;
        const d = a + 3;
        indices.push(a, c, b, b, c, d);
      }
    }

    const roadGeo = new THREE.BufferGeometry();
    roadGeo.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(positions, 3),
    );
    roadGeo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    roadGeo.setIndex(indices);
    roadGeo.computeVertexNormals();

    const roadMat = new THREE.MeshLambertMaterial({
      vertexColors: true,
      flatShading: true,
    });
    const road = new THREE.Mesh(roadGeo, roadMat);
    group.add(road);

    // Soft walls / curbs along the edges.
    this.addCurb(group, half + 0.35, 0x8a5a2b);
    this.addCurb(group, -(half + 0.35), 0x8a5a2b);

    // Ground plane with dusty tone.
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(220, 280),
      new THREE.MeshLambertMaterial({ color: 0x6e8a3a, flatShading: true }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(4, -0.05, -70);
    group.add(ground);

    // Roadside props (chunky PS1 stubs).
    this.scatterProps(group);

    // Finish / delivery zone marker.
    const finish = this.sample(this.finishT);
    const gate = new THREE.Group();
    const postMat = new THREE.MeshLambertMaterial({
      color: 0xe8d080,
      flatShading: true,
    });
    const bannerMat = new THREE.MeshLambertMaterial({
      color: 0xc45c26,
      flatShading: true,
    });
    for (const side of [-1, 1]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.5, 4.2, 0.5), postMat);
      post.position
        .copy(finish.position)
        .addScaledVector(finish.binormal, side * (half + 0.2));
      post.position.y = 2.1;
      gate.add(post);
    }
    const banner = new THREE.Mesh(
      new THREE.BoxGeometry(half * 2.2, 0.7, 0.25),
      bannerMat,
    );
    banner.position.copy(finish.position).addScaledVector(finish.normal, 0);
    banner.position.y = 3.7;
    banner.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 0, 1),
      finish.tangent.clone().setY(0).normalize(),
    );
    gate.add(banner);

    const pad = new THREE.Mesh(
      new THREE.BoxGeometry(half * 2.1, 0.12, 3.2),
      new THREE.MeshLambertMaterial({ color: 0xd4a24c, flatShading: true }),
    );
    pad.position.copy(finish.position);
    pad.position.y = 0.06;
    pad.quaternion.copy(banner.quaternion);
    gate.add(pad);
    group.add(gate);

    return group;
  }

  private addCurb(group: THREE.Group, offset: number, color: number): void {
    const segments = 48;
    const points: THREE.Vector3[] = [];
    for (let i = 0; i <= segments; i++) {
      const sample = this.sample(i / segments);
      points.push(
        sample.position.clone().addScaledVector(sample.binormal, offset),
      );
    }
    const curve = new THREE.CatmullRomCurve3(points);
    const geo = new THREE.TubeGeometry(curve, segments, 0.28, 4, false);
    const mat = new THREE.MeshLambertMaterial({ color, flatShading: true });
    group.add(new THREE.Mesh(geo, mat));
  }

  private scatterProps(group: THREE.Group): void {
    const treeMat = new THREE.MeshLambertMaterial({
      color: 0x3f6b2a,
      flatShading: true,
    });
    const trunkMat = new THREE.MeshLambertMaterial({
      color: 0x5a3a1c,
      flatShading: true,
    });
    const crateMat = new THREE.MeshLambertMaterial({
      color: 0xa86b2d,
      flatShading: true,
    });
    const barrelMat = new THREE.MeshLambertMaterial({
      color: 0x6b4a28,
      flatShading: true,
    });

    const props: Array<{ t: number; side: number; kind: "tree" | "crate" | "barrel" }> =
      [
        { t: 0.08, side: 1, kind: "tree" },
        { t: 0.12, side: -1, kind: "crate" },
        { t: 0.22, side: 1, kind: "barrel" },
        { t: 0.28, side: -1, kind: "tree" },
        { t: 0.38, side: 1, kind: "tree" },
        { t: 0.45, side: -1, kind: "crate" },
        { t: 0.55, side: 1, kind: "barrel" },
        { t: 0.62, side: -1, kind: "tree" },
        { t: 0.72, side: 1, kind: "crate" },
        { t: 0.8, side: -1, kind: "tree" },
        { t: 0.88, side: 1, kind: "barrel" },
      ];

    for (const prop of props) {
      const sample = this.sample(prop.t);
      const root = new THREE.Group();
      root.position
        .copy(sample.position)
        .addScaledVector(
          sample.binormal,
          prop.side * (ROAD_HALF_WIDTH + 2.4),
        );

      if (prop.kind === "tree") {
        const trunk = new THREE.Mesh(
          new THREE.BoxGeometry(0.45, 1.4, 0.45),
          trunkMat,
        );
        trunk.position.y = 0.7;
        const crown = new THREE.Mesh(
          new THREE.BoxGeometry(1.8, 1.8, 1.8),
          treeMat,
        );
        crown.position.y = 2.1;
        root.add(trunk, crown);
      } else if (prop.kind === "crate") {
        const crate = new THREE.Mesh(
          new THREE.BoxGeometry(1.1, 1.1, 1.1),
          crateMat,
        );
        crate.position.y = 0.55;
        root.add(crate);
      } else {
        // Cartoon barrel stub (satirical roadside cue, non-graphic).
        const barrel = new THREE.Mesh(
          new THREE.CylinderGeometry(0.45, 0.45, 1.1, 6),
          barrelMat,
        );
        barrel.position.y = 0.55;
        root.add(barrel);
      }

      group.add(root);
    }
  }
}
