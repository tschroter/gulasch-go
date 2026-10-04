import * as THREE from "three";
import { ROAD_HALF_WIDTH, type Track } from "./track";
import type { KeyState } from "./input";

export type TruckPalette = {
  body: number;
  cabin: number;
  accent: number;
  driver: number;
};

export const PLAYER_PALETTE: TruckPalette = {
  body: 0x3a7d5c,
  cabin: 0xd8c8a0,
  accent: 0xc45c26,
  driver: 0xe8b090,
};

export const RIVAL_PALETTE: TruckPalette = {
  body: 0xa83a3a,
  cabin: 0xf0e0b0,
  accent: 0x2a2a2a,
  driver: 0xd4a070,
};

const MAX_SPEED = 30;
const ACCEL = 38;
const BRAKE = 46;
const REVERSE_SPEED = 10;
const STEER_RATE = 2.35;
const DRAG = 0.5;
const LATERAL_SOFT = ROAD_HALF_WIDTH - 0.75;

export class Truck {
  readonly mesh: THREE.Group;
  readonly velocity = new THREE.Vector3();
  heading = 0;
  speed = 0;
  progress = 0;
  finished = false;

  private readonly track: Track;
  private readonly tmp = new THREE.Vector3();

  constructor(track: Track, palette: TruckPalette, name: string) {
    this.track = track;
    this.mesh = buildChubbyTruck(palette);
    this.mesh.name = name;
  }

  reset(t: number, lateral = 0): void {
    const sample = this.track.sample(t);
    this.progress = t;
    this.speed = 0;
    this.velocity.set(0, 0, 0);
    this.finished = false;
    this.heading = Math.atan2(sample.tangent.x, sample.tangent.z);
    this.mesh.position
      .copy(sample.position)
      .addScaledVector(sample.binormal, lateral);
    this.mesh.position.y = 0;
    this.mesh.rotation.set(0, this.heading, 0);
  }

  updatePlayer(dt: number, keys: KeyState): void {
    if (this.finished) return;

    const throttle = (keys.forward ? 1 : 0) - (keys.back ? 1 : 0);
    if (throttle > 0) {
      this.speed += ACCEL * dt;
    } else if (throttle < 0) {
      if (this.speed > 0.4) {
        this.speed -= BRAKE * dt;
      } else {
        this.speed -= ACCEL * 0.55 * dt;
      }
    } else {
      this.speed *= 1 - DRAG * dt;
    }

    this.speed = THREE.MathUtils.clamp(this.speed, -REVERSE_SPEED, MAX_SPEED);

    const steerInput = (keys.left ? 1 : 0) - (keys.right ? 1 : 0);
    const steerScale = THREE.MathUtils.clamp(Math.abs(this.speed) / 8, 0.25, 1);
    this.heading += steerInput * STEER_RATE * steerScale * dt * Math.sign(this.speed || 1);

    const dirX = Math.sin(this.heading);
    const dirZ = Math.cos(this.heading);
    this.mesh.position.x += dirX * this.speed * dt;
    this.mesh.position.z += dirZ * this.speed * dt;

    this.constrainToRoad();
    this.mesh.rotation.y = this.heading;
    // Mild body lean while turning.
    this.mesh.rotation.z = THREE.MathUtils.damp(
      this.mesh.rotation.z,
      -steerInput * 0.12 * steerScale,
      8,
      dt,
    );

    this.progress = this.track.nearestT(this.mesh.position);
    if (this.progress >= this.track.finishT && this.speed >= 0) {
      this.finished = true;
      this.speed *= 0.2;
    }
  }

  /** Rival follows centerline with capped speed; slight lateral wobble. */
  updateRival(dt: number, targetSpeed: number, lateralBias: number): void {
    if (this.finished) return;

    this.speed = THREE.MathUtils.damp(this.speed, targetSpeed, 2.2, dt);
    const distance = this.speed * dt;
    const deltaT = distance / this.track.length;
    this.progress = Math.min(1, this.progress + deltaT);

    const sample = this.track.sample(this.progress);
    const wobble = Math.sin(performance.now() * 0.002 + lateralBias) * 0.35;
    this.mesh.position
      .copy(sample.position)
      .addScaledVector(sample.binormal, lateralBias + wobble);
    this.mesh.position.y = 0;
    this.heading = Math.atan2(sample.tangent.x, sample.tangent.z);
    this.mesh.rotation.y = this.heading;
    this.mesh.rotation.z = -wobble * 0.08;

    if (this.progress >= this.track.finishT) {
      this.finished = true;
      this.speed = 0;
    }
  }

  private constrainToRoad(): void {
    const t = this.track.nearestT(this.mesh.position);
    const sample = this.track.sample(t);
    this.tmp.subVectors(this.mesh.position, sample.position);
    let lateral = this.tmp.dot(sample.binormal);

    if (Math.abs(lateral) > LATERAL_SOFT) {
      const overshoot = Math.abs(lateral) - LATERAL_SOFT;
      lateral = Math.sign(lateral) * LATERAL_SOFT;
      this.speed *= 1 - Math.min(0.55, overshoot * 0.35);
      // Nudge heading back toward road.
      const roadHeading = Math.atan2(sample.tangent.x, sample.tangent.z);
      this.heading = THREE.MathUtils.lerp(this.heading, roadHeading, 0.12);
    }

    this.mesh.position
      .copy(sample.position)
      .addScaledVector(sample.binormal, lateral);
    this.mesh.position.y = 0;
  }
}

function buildChubbyTruck(palette: TruckPalette): THREE.Group {
  const root = new THREE.Group();

  const bodyMat = new THREE.MeshLambertMaterial({
    color: palette.body,
    flatShading: true,
  });
  const cabinMat = new THREE.MeshLambertMaterial({
    color: palette.cabin,
    flatShading: true,
  });
  const accentMat = new THREE.MeshLambertMaterial({
    color: palette.accent,
    flatShading: true,
  });
  const driverMat = new THREE.MeshLambertMaterial({
    color: palette.driver,
    flatShading: true,
  });
  const wheelMat = new THREE.MeshLambertMaterial({
    color: 0x222222,
    flatShading: true,
  });

  // Oversized cargo / belly — chubby silhouette.
  const cargo = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.6, 3.4), bodyMat);
  cargo.position.set(0, 1.05, -0.35);
  root.add(cargo);

  // Rounded-ish cab via chunky boxes.
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(2.1, 1.35, 1.5), cabinMat);
  cabin.position.set(0, 1.35, 1.55);
  root.add(cabin);

  const hood = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.7, 1.1), accentMat);
  hood.position.set(0, 0.75, 2.55);
  root.add(hood);

  // Cute/funny driver stub peeking out.
  const driver = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 0.55), driverMat);
  driver.position.set(0.15, 2.15, 1.55);
  root.add(driver);

  const hat = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.28, 0.7), accentMat);
  hat.position.set(0.15, 2.55, 1.55);
  root.add(hat);

  // Optional tiny cigarette stub — cartoon satirical cue, non-graphic.
  const cig = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 0.08, 0.35),
    new THREE.MeshLambertMaterial({ color: 0xf2e6c8, flatShading: true }),
  );
  cig.position.set(0.45, 2.05, 1.9);
  root.add(cig);

  const bumper = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.35, 0.35), accentMat);
  bumper.position.set(0, 0.4, 3.05);
  root.add(bumper);

  const wheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.35, 8);
  const wheelPositions: Array<[number, number, number]> = [
    [-1.15, 0.42, 1.8],
    [1.15, 0.42, 1.8],
    [-1.15, 0.42, -1.3],
    [1.15, 0.42, -1.3],
  ];
  for (const [x, y, z] of wheelPositions) {
    const wheel = new THREE.Mesh(wheelGeo, wheelMat);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(x, y, z);
    root.add(wheel);
  }

  return root;
}
