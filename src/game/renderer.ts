import * as THREE from "three";
import { createTrack, sampleTrack, type TrackPose } from "./track3d";
import { createTruck, TRUCKS } from "./truck";

export type RacerRenderState = {
  distance: number;
  lateral: number;
};

const INTERNAL_WIDTH = 320;
const INTERNAL_HEIGHT = 180;

export class RaceRenderer {
  readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(60, 16 / 9, 0.1, 190);
  private readonly trucks = TRUCKS.map((identity) => createTruck(identity));
  private readonly pose: TrackPose = {
    position: new THREE.Vector3(),
    tangent: new THREE.Vector3(),
    right: new THREE.Vector3(),
  };
  private readonly desiredCamera = new THREE.Vector3();
  private readonly desiredTarget = new THREE.Vector3();
  private readonly cameraTarget = new THREE.Vector3();
  private readonly projectedPlayer = new THREE.Vector3();
  private cameraReady = false;

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

    const player = racers[0];
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
    this.renderer.render(this.scene, this.camera);
  }

  resetCamera(): void {
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
        if ("map" in material && material.map instanceof THREE.Texture) {
          material.map.dispose();
        }
        material.dispose();
      }
    });
    this.renderer.dispose();
  }
}
