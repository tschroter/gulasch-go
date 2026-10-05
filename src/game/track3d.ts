import * as THREE from "three";

export const ROAD_WIDTH = 14;
export const SHOULDER_WIDTH = 16;

const CONTROL_POINTS = [
  new THREE.Vector3(0, 0, 0),
  new THREE.Vector3(-3, 1, 55),
  new THREE.Vector3(18, 3, 110),
  new THREE.Vector3(42, 7, 155),
  new THREE.Vector3(29, 10, 205),
  new THREE.Vector3(-8, 12, 250),
  new THREE.Vector3(-34, 16, 300),
  new THREE.Vector3(-17, 19, 350),
  new THREE.Vector3(22, 22, 398),
  new THREE.Vector3(48, 25, 445),
  new THREE.Vector3(34, 29, 500),
  new THREE.Vector3(-4, 31, 548),
  new THREE.Vector3(-28, 34, 600),
  new THREE.Vector3(-8, 36, 650),
];

export const ROUTE = new THREE.CatmullRomCurve3(CONTROL_POINTS, false, "catmullrom", 0.28);
export const ROUTE_LENGTH = ROUTE.getLength();
export const FINISH_DISTANCE = ROUTE_LENGTH - 18;

export type TrackPose = {
  position: THREE.Vector3;
  tangent: THREE.Vector3;
  right: THREE.Vector3;
};

const UP = new THREE.Vector3(0, 1, 0);

export function sampleTrack(distance: number, target?: TrackPose): TrackPose {
  const t = THREE.MathUtils.clamp(distance / ROUTE_LENGTH, 0, 1);
  const position = target?.position ?? new THREE.Vector3();
  const tangent = target?.tangent ?? new THREE.Vector3();
  const right = target?.right ?? new THREE.Vector3();
  ROUTE.getPointAt(t, position);
  ROUTE.getTangentAt(t, tangent).normalize();
  right.crossVectors(UP, tangent).normalize();
  return { position, tangent, right };
}

function ribbonGeometry(width: number, yOffset: number, segments = 220): THREE.BufferGeometry {
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const pose: TrackPose = {
    position: new THREE.Vector3(),
    tangent: new THREE.Vector3(),
    right: new THREE.Vector3(),
  };

  for (let i = 0; i <= segments; i++) {
    sampleTrack((i / segments) * ROUTE_LENGTH, pose);
    for (const side of [-1, 1]) {
      positions.push(
        pose.position.x + pose.right.x * width * 0.5 * side,
        pose.position.y + yOffset,
        pose.position.z + pose.right.z * width * 0.5 * side,
      );
      uvs.push(side < 0 ? 0 : 1, i / 12);
    }
    if (i < segments) {
      const j = i * 2;
      indices.push(j, j + 2, j + 1, j + 1, j + 2, j + 3);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function addLaneMarks(group: THREE.Group): void {
  const material = new THREE.MeshLambertMaterial({ color: 0xe9dfbd });
  const geometry = new THREE.BoxGeometry(0.2, 0.05, 2.6);
  const count = Math.ceil((FINISH_DISTANCE - 14) / 11);
  const marks = new THREE.InstancedMesh(geometry, material, count);
  const dummy = new THREE.Object3D();
  const pose: TrackPose = {
    position: new THREE.Vector3(),
    tangent: new THREE.Vector3(),
    right: new THREE.Vector3(),
  };
  let index = 0;
  for (let distance = 14; distance < FINISH_DISTANCE; distance += 11) {
    sampleTrack(distance, pose);
    dummy.position.copy(pose.position).addScaledVector(UP, 0.08);
    dummy.rotation.set(0, Math.atan2(pose.tangent.x, pose.tangent.z), 0);
    dummy.updateMatrix();
    marks.setMatrixAt(index++, dummy.matrix);
  }
  marks.count = index;
  marks.instanceMatrix.needsUpdate = true;
  group.add(marks);
}

function addGuardRails(group: THREE.Group): void {
  const railMaterial = new THREE.MeshLambertMaterial({ color: 0xa7a39a });
  const postGeometry = new THREE.BoxGeometry(0.16, 0.8, 0.16);
  const railGeometry = new THREE.BoxGeometry(0.18, 0.22, 8.2);
  const count = Math.ceil((FINISH_DISTANCE - 28) / 8) * 2;
  const posts = new THREE.InstancedMesh(postGeometry, railMaterial, count);
  const rails = new THREE.InstancedMesh(railGeometry, railMaterial, count);
  const dummy = new THREE.Object3D();
  const pose: TrackPose = {
    position: new THREE.Vector3(),
    tangent: new THREE.Vector3(),
    right: new THREE.Vector3(),
  };
  let index = 0;
  for (let distance = 18; distance < FINISH_DISTANCE - 10; distance += 8) {
    sampleTrack(distance, pose);
    for (const side of [-1, 1]) {
      dummy.position
        .copy(pose.position)
        .addScaledVector(pose.right, side * (SHOULDER_WIDTH * 0.5 + 0.2))
        .addScaledVector(UP, 0.35);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      posts.setMatrixAt(index, dummy.matrix);

      dummy.position.addScaledVector(UP, 0.35);
      dummy.rotation.set(0, Math.atan2(pose.tangent.x, pose.tangent.z), 0);
      dummy.updateMatrix();
      rails.setMatrixAt(index, dummy.matrix);
      index++;
    }
  }
  posts.count = index;
  rails.count = index;
  posts.instanceMatrix.needsUpdate = true;
  rails.instanceMatrix.needsUpdate = true;
  group.add(posts, rails);
}

function addTrees(group: THREE.Group): void {
  const trunkGeometry = new THREE.CylinderGeometry(0.18, 0.25, 1.6, 5);
  const crownGeometry = new THREE.ConeGeometry(1.25, 4.5, 6);
  const trunkMaterial = new THREE.MeshLambertMaterial({ color: 0x4f3926, flatShading: true });
  const crownMaterial = new THREE.MeshLambertMaterial({ color: 0x1f4a32, flatShading: true });
  const trunks = new THREE.InstancedMesh(trunkGeometry, trunkMaterial, 92);
  const crowns = new THREE.InstancedMesh(crownGeometry, crownMaterial, 92);
  const dummy = new THREE.Object3D();
  const treePosition = new THREE.Vector3();
  const pose: TrackPose = {
    position: new THREE.Vector3(),
    tangent: new THREE.Vector3(),
    right: new THREE.Vector3(),
  };
  for (let i = 0; i < 92; i++) {
    const distance = 10 + ((i * 47) % Math.floor(FINISH_DISTANCE - 24));
    const side = i % 2 === 0 ? -1 : 1;
    const offset = 9 + ((i * 17) % 20);
    sampleTrack(distance, pose);
    const scale = 0.75 + (i % 5) * 0.09;
    treePosition
      .copy(pose.position)
      .addScaledVector(pose.right, side * offset)
      .addScaledVector(UP, -0.25);
    dummy.position.copy(treePosition).addScaledVector(UP, 0.8 * scale);
    dummy.scale.setScalar(scale);
    dummy.rotation.set(0, i * 1.37, 0);
    dummy.updateMatrix();
    trunks.setMatrixAt(i, dummy.matrix);
    dummy.position.copy(treePosition).addScaledVector(UP, 3.5 * scale);
    dummy.updateMatrix();
    crowns.setMatrixAt(i, dummy.matrix);
  }
  trunks.instanceMatrix.needsUpdate = true;
  crowns.instanceMatrix.needsUpdate = true;
  group.add(trunks, crowns);
}

function addMountains(group: THREE.Group): void {
  const colors = [0x4c6258, 0x60746a, 0x354d43];
  for (let i = 0; i < 18; i++) {
    const radius = 15 + (i % 5) * 4;
    const geometry = new THREE.ConeGeometry(radius, 28 + (i % 4) * 7, 5);
    const material = new THREE.MeshLambertMaterial({
      color: colors[i % colors.length],
      flatShading: true,
    });
    const mountain = new THREE.Mesh(geometry, material);
    const distance = (i / 17) * FINISH_DISTANCE;
    const pose = sampleTrack(distance);
    const side = i % 2 === 0 ? -1 : 1;
    mountain.position
      .copy(pose.position)
      .addScaledVector(pose.right, side * (42 + (i % 3) * 18))
      .addScaledVector(UP, 8);
    mountain.rotation.y = i * 0.77;
    group.add(mountain);
  }
}

function addFinishGate(group: THREE.Group): void {
  const pose = sampleTrack(FINISH_DISTANCE);
  const postMaterial = new THREE.MeshLambertMaterial({ color: 0xf0dfb5 });
  const signMaterial = new THREE.MeshLambertMaterial({ color: 0xb13224 });
  const postGeometry = new THREE.BoxGeometry(0.45, 6, 0.45);
  for (const side of [-1, 1]) {
    const post = new THREE.Mesh(postGeometry, postMaterial);
    post.position
      .copy(pose.position)
      .addScaledVector(pose.right, side * 6)
      .addScaledVector(UP, 3);
    post.rotation.y = Math.atan2(pose.tangent.x, pose.tangent.z);
    group.add(post);
  }
  const sign = new THREE.Mesh(new THREE.BoxGeometry(12.4, 1.2, 0.5), signMaterial);
  sign.position.copy(pose.position).addScaledVector(UP, 5.8);
  sign.rotation.y = Math.atan2(pose.tangent.x, pose.tangent.z);
  group.add(sign);
}

export function createTrack(): THREE.Group {
  const group = new THREE.Group();
  group.name = "mountain-delivery-route";

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(1200, 1200, 1, 1),
    new THREE.MeshLambertMaterial({ color: 0x486b35 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, -0.7, 300);
  group.add(ground);

  const shoulder = new THREE.Mesh(
    ribbonGeometry(SHOULDER_WIDTH, -0.04),
    new THREE.MeshLambertMaterial({ color: 0xb6aa75, flatShading: true }),
  );
  const road = new THREE.Mesh(
    ribbonGeometry(ROAD_WIDTH, 0),
    new THREE.MeshLambertMaterial({ color: 0x4c4b4a, flatShading: true }),
  );
  group.add(shoulder, road);
  addLaneMarks(group);
  addGuardRails(group);
  addTrees(group);
  addMountains(group);
  addFinishGate(group);
  return group;
}
