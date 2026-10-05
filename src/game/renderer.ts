import * as THREE from "three";
import {
  acquireDecalAtlas,
  applyDecalAnisotropy,
  getDecalAtlasDataURL,
  getDecalAtlasDebug,
  isDecalAtlasTexture,
  releaseDecalAtlas,
  type DecalAtlasDebug,
} from "./decalAtlas";
import { createTrack, sampleTrack, type TrackPose } from "./track3d";
import { createTruck, TRUCKS } from "./truck";

export type RacerRenderState = {
  distance: number;
  lateral: number;
};

export type DecalFixtureKind =
  | "otto-chase"
  | "hans-near"
  | "hans-oblique"
  | "fritz-near"
  | "fritz-oblique"
  | "three-rear";

export type ProjectedDecalSize = {
  widthPx: number;
  heightPx: number;
};

export type DecalMetrics = {
  fixture: DecalFixtureKind;
  internalWidth: number;
  internalHeight: number;
  trucks: Array<{
    name: "OTTO" | "HANS" | "FRITZ";
    cargo: ProjectedDecalSize;
    plate: ProjectedDecalSize;
    cellId: string;
    plateString: string;
  }>;
};

const INTERNAL_WIDTH = 320;
const INTERNAL_HEIGHT = 180;

export class RaceRenderer {
  readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(60, 16 / 9, 0.1, 190);
  private readonly atlas = acquireDecalAtlas();
  private readonly trucks = TRUCKS.map((identity) => createTruck(identity, this.atlas));
  private readonly pose: TrackPose = {
    position: new THREE.Vector3(),
    tangent: new THREE.Vector3(),
    right: new THREE.Vector3(),
  };
  private readonly desiredCamera = new THREE.Vector3();
  private readonly desiredTarget = new THREE.Vector3();
  private readonly cameraTarget = new THREE.Vector3();
  private readonly projectedPlayer = new THREE.Vector3();
  private readonly corner = new THREE.Vector3();
  private cameraReady = false;
  private fixtureMode = false;
  private activeFixture: DecalFixtureKind = "otto-chase";
  readonly anisotropy: number;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      alpha: false,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(1);
    this.renderer.setSize(INTERNAL_WIDTH, INTERNAL_HEIGHT, false);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled = false;
    this.anisotropy = applyDecalAnisotropy(this.renderer);

    const fogColor = new THREE.Color(0x9aafa8);
    this.scene.background = fogColor;
    this.scene.fog = new THREE.Fog(fogColor, 58, 152);
    this.scene.add(createTrack());

    const hemisphere = new THREE.HemisphereLight(0xdce7df, 0x4a3d2b, 2.2);
    const sun = new THREE.DirectionalLight(0xffe1b5, 2.4);
    sun.position.set(-35, 60, -25);
    this.scene.add(hemisphere, sun);
    this.scene.add(...this.trucks);
  }

  render(racers: readonly RacerRenderState[], steerLean: number, dt: number): void {
    if (!this.fixtureMode) {
      this.placeRacers(racers, steerLean);
      this.updateChaseCamera(racers[0], steerLean, dt);
    }
    this.renderer.render(this.scene, this.camera);
  }

  applyDecalFixture(kind: DecalFixtureKind, racers: RacerRenderState[]): DecalMetrics {
    this.activeFixture = kind;
    this.fixtureMode = kind !== "otto-chase";
    if (kind === "otto-chase") {
      this.assignRacers(racers, [
        { distance: 0, lateral: 0 },
        { distance: 10, lateral: -5.5 },
        { distance: 26, lateral: 5.5 },
      ]);
      this.cameraReady = false;
      this.placeRacers(racers, 0);
      this.updateChaseCamera(racers[0], 0, 1);
    } else if (kind === "three-rear") {
      this.layoutThreeRear();
    } else {
      const subject = kind.startsWith("hans") ? 1 : 2;
      const side = kind.endsWith("oblique") ? 3.6 : 0;
      const distance = kind.endsWith("oblique") ? 11.2 : 11.6;
      this.assignRacers(racers, [
        { distance: 108, lateral: subject === 1 ? 5.4 : -5.4 },
        { distance: subject === 1 ? 128 : 150, lateral: subject === 1 ? 0 : 5.2 },
        { distance: subject === 2 ? 128 : 150, lateral: subject === 2 ? 0 : -5.2 },
      ]);
      this.placeRacers(racers, 0);
      this.aimAtTruck(this.trucks[subject], distance, 6.5, side, 2.3);
    }
    this.renderer.render(this.scene, this.camera);
    return this.measureDecals();
  }

  measureDecals(): DecalMetrics {
    return {
      fixture: this.activeFixture,
      internalWidth: INTERNAL_WIDTH,
      internalHeight: INTERNAL_HEIGHT,
      trucks: this.trucks.map((truck) => {
        const cargo = truck.getObjectByName("cargoPanel");
        const plate = truck.getObjectByName("namePlate");
        if (!(cargo instanceof THREE.Mesh) || !(plate instanceof THREE.Mesh)) {
          throw new Error(`Missing decals on ${truck.name}`);
        }
        return {
          name: truck.name as "OTTO" | "HANS" | "FRITZ",
          cargo: this.projectedSize(cargo),
          plate: this.projectedSize(plate),
          cellId: String(plate.userData.cellId),
          plateString: String(plate.userData.decalString),
        };
      }),
    };
  }

  getDecalDebug(): DecalAtlasDebug {
    return getDecalAtlasDebug();
  }

  getDecalAtlasDataURL(): string | null {
    return getDecalAtlasDataURL();
  }

  resetCamera(): void {
    this.fixtureMode = false;
    this.activeFixture = "otto-chase";
    this.cameraReady = false;
  }

  get drawCalls(): number {
    return this.renderer.info.render.calls;
  }

  get triangles(): number {
    return this.renderer.info.render.triangles;
  }

  get playerScreenX(): number {
    this.projectedPlayer.copy(this.trucks[0].position).project(this.camera);
    return (this.projectedPlayer.x + 1) * 0.5;
  }

  dispose(): void {
    this.scene.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      object.geometry.dispose();
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      for (const material of materials) {
        if ("map" in material && material.map instanceof THREE.Texture && !isDecalAtlasTexture(material.map)) {
          material.map.dispose();
        }
        material.dispose();
      }
    });
    releaseDecalAtlas(this.atlas.texture);
    this.renderer.dispose();
  }

  private assignRacers(
    racers: RacerRenderState[],
    poses: ReadonlyArray<{ distance: number; lateral: number }>,
  ): void {
    for (let i = 0; i < racers.length; i++) {
      const pose = poses[i];
      const racer = racers[i];
      if (!pose || !racer) continue;
      racer.distance = pose.distance;
      racer.lateral = pose.lateral;
    }
  }

  private placeRacers(racers: readonly RacerRenderState[], steerLean: number): void {
    for (let i = 0; i < this.trucks.length; i++) {
      const racer = racers[i];
      if (!racer) continue;
      sampleTrack(racer.distance, this.pose);
      const truck = this.trucks[i];
      truck.position.copy(this.pose.position).addScaledVector(this.pose.right, racer.lateral);
      truck.rotation.set(
        0,
        Math.atan2(this.pose.tangent.x, this.pose.tangent.z),
        i === 0 ? -steerLean * 0.055 : 0,
      );
    }
  }

  private updateChaseCamera(player: RacerRenderState | undefined, steerLean: number, dt: number): void {
    if (!player) return;
    sampleTrack(player.distance, this.pose);
    this.desiredCamera
      .copy(this.pose.position)
      .addScaledVector(this.pose.tangent, -9.7)
      .addScaledVector(this.pose.right, player.lateral * 0.72 + steerLean * 0.35);
    this.desiredCamera.y += 8.6;
    this.desiredTarget
      .copy(this.pose.position)
      .addScaledVector(this.pose.tangent, 9)
      .addScaledVector(this.pose.right, player.lateral * 0.25);
    this.desiredTarget.y += 2.7;

    if (!this.cameraReady) {
      this.camera.position.copy(this.desiredCamera);
      this.cameraTarget.copy(this.desiredTarget);
      this.cameraReady = true;
    } else {
      const damping = 1 - Math.exp(-dt * 7);
      this.camera.position.lerp(this.desiredCamera, damping);
      this.cameraTarget.lerp(this.desiredTarget, damping);
    }
    this.camera.lookAt(this.cameraTarget);
  }

  private aimAtTruck(
    truck: THREE.Object3D,
    back: number,
    height: number,
    side: number,
    lookY: number,
  ): void {
    sampleTrack(0, this.pose);
    truck.getWorldDirection(this.pose.tangent);
    this.pose.right.set(1, 0, 0).applyQuaternion(truck.quaternion);
    this.camera.position
      .copy(truck.position)
      .addScaledVector(this.pose.tangent, -back)
      .addScaledVector(this.pose.right, side);
    this.camera.position.y = truck.position.y + height;
    this.cameraTarget.copy(truck.position);
    this.cameraTarget.y += lookY;
    this.camera.lookAt(this.cameraTarget);
    this.cameraReady = true;
  }

  private layoutThreeRear(): void {
    sampleTrack(6, this.pose);
    const laterals = [-6.4, 0, 6.4];
    for (let i = 0; i < this.trucks.length; i++) {
      const truck = this.trucks[i];
      truck.position.copy(this.pose.position).addScaledVector(this.pose.right, laterals[i] ?? 0);
      truck.position.y = this.pose.position.y;
      truck.rotation.set(0, Math.atan2(this.pose.tangent.x, this.pose.tangent.z), 0);
    }
    this.camera.position
      .copy(this.pose.position)
      .addScaledVector(this.pose.tangent, -11.2)
      .addScaledVector(this.pose.right, 0);
    this.camera.position.y = this.pose.position.y + 4.5;
    this.cameraTarget.copy(this.pose.position);
    this.cameraTarget.y = this.pose.position.y + 2.15;
    this.camera.lookAt(this.cameraTarget);
    this.cameraReady = true;
  }

  private projectedSize(mesh: THREE.Mesh): ProjectedDecalSize {
    mesh.updateWorldMatrix(true, false);
    const geometry = mesh.geometry;
    if (!geometry.boundingBox) geometry.computeBoundingBox();
    const box = geometry.boundingBox;
    if (!box) return { widthPx: 0, heightPx: 0 };
    let minX = 1;
    let maxX = -1;
    let minY = 1;
    let maxY = -1;
    const xs = [box.min.x, box.max.x];
    const ys = [box.min.y, box.max.y];
    const zs = [box.min.z, box.max.z];
    for (const x of xs) {
      for (const y of ys) {
        for (const z of zs) {
          this.corner.set(x, y, z).applyMatrix4(mesh.matrixWorld).project(this.camera);
          minX = Math.min(minX, this.corner.x);
          maxX = Math.max(maxX, this.corner.x);
          minY = Math.min(minY, this.corner.y);
          maxY = Math.max(maxY, this.corner.y);
        }
      }
    }
    return {
      widthPx: ((maxX - minX) * 0.5) * INTERNAL_WIDTH,
      heightPx: ((maxY - minY) * 0.5) * INTERNAL_HEIGHT,
    };
  }
}
