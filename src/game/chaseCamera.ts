import * as THREE from "three";
import type { Truck } from "./truck";

/**
 * Classic Road-Rash-style rear chase cam:
 * sits behind/above the vehicle, looks ahead along heading, light lag + speed shake.
 */
export class ChaseCamera {
  readonly camera: THREE.PerspectiveCamera;

  private readonly desired = new THREE.Vector3();
  private readonly lookAt = new THREE.Vector3();
  private readonly currentPos = new THREE.Vector3();
  private readonly currentLook = new THREE.Vector3();
  private shakeTime = 0;

  constructor(aspect: number) {
    this.camera = new THREE.PerspectiveCamera(55, aspect, 0.1, 220);
  }

  reset(truck: Truck): void {
    this.snap(truck);
  }

  snap(truck: Truck): void {
    this.computeTargets(truck, 0);
    this.currentPos.copy(this.desired);
    this.currentLook.copy(this.lookAt);
    this.camera.position.copy(this.currentPos);
    this.camera.lookAt(this.currentLook);
  }

  update(dt: number, truck: Truck): void {
    this.shakeTime += dt;
    this.computeTargets(truck, this.shakeTime);

    // Lag follows turn/motion without free-fly float.
    const posLag = 6.5;
    const lookLag = 9;
    this.currentPos.lerp(this.desired, 1 - Math.exp(-posLag * dt));
    this.currentLook.lerp(this.lookAt, 1 - Math.exp(-lookLag * dt));

    this.camera.position.copy(this.currentPos);
    this.camera.lookAt(this.currentLook);
  }

  setAspect(aspect: number): void {
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }

  private computeTargets(truck: Truck, time: number): void {
    const heading = truck.heading;
    const back = new THREE.Vector3(-Math.sin(heading), 0, -Math.cos(heading));
    const forward = new THREE.Vector3(Math.sin(heading), 0, Math.cos(heading));

    const speedFactor = THREE.MathUtils.clamp(Math.abs(truck.speed) / 28, 0, 1);
    const distance = 8.2 + speedFactor * 1.6;
    const height = 3.4 + speedFactor * 0.35;

    this.desired
      .copy(truck.mesh.position)
      .addScaledVector(back, distance)
      .add(new THREE.Vector3(0, height, 0));

    // Subtle shake at speed — readable Road Rash energy, not nausea.
    if (speedFactor > 0.2) {
      const amp = 0.04 + speedFactor * 0.08;
      this.desired.x += Math.sin(time * 27) * amp;
      this.desired.y += Math.cos(time * 31) * amp * 0.6;
    }

    this.lookAt
      .copy(truck.mesh.position)
      .addScaledVector(forward, 10)
      .add(new THREE.Vector3(0, 1.2, 0));
  }
}
