import * as THREE from "three";
import {
  applyAtlasUvs,
  CARGO_PANEL_SIZE,
  NAME_PLATE_SIZE,
  type AtlasCell,
  type AtlasCellId,
} from "./decalAtlas";

export type TruckIdentity = {
  name: "OTTO" | "HANS" | "FRITZ";
  box: number;
  lower: number;
  accent: number;
};

export const TRUCKS: readonly TruckIdentity[] = [
  { name: "OTTO", box: 0xe3d4ad, lower: 0xa72f22, accent: 0xf1c84a },
  { name: "HANS", box: 0x3f7440, lower: 0x23452c, accent: 0xf0c948 },
  { name: "FRITZ", box: 0x365c86, lower: 0x24364f, accent: 0xf0b848 },
];

export type TruckDecalMaps = {
  texture: THREE.Texture;
  cells: Record<AtlasCellId, AtlasCell>;
};

function box(
  width: number,
  height: number,
  depth: number,
  color: number,
): THREE.Mesh<THREE.BoxGeometry, THREE.MeshLambertMaterial> {
  return new THREE.Mesh(
    new THREE.BoxGeometry(width, height, depth),
    new THREE.MeshLambertMaterial({ color, flatShading: true }),
  );
}

function decalMaterial(map: THREE.Texture, transparent: boolean): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({
    map,
    transparent,
    depthWrite: true,
    side: THREE.BackSide,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });
}

function decalPlane(
  width: number,
  height: number,
  map: THREE.Texture,
  cell: AtlasCell,
  name: string,
  transparent: boolean,
): THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial> {
  const geometry = new THREE.PlaneGeometry(width, height);
  applyAtlasUvs(geometry, cell, true);
  const mesh = new THREE.Mesh(geometry, decalMaterial(map, transparent));
  mesh.name = name;
  mesh.userData.cellId = cell.id;
  mesh.userData.decalString = cell.id === "cargo" ? "GULASCH" : cell.id;
  return mesh;
}

export function createTruck(identity: TruckIdentity, atlas: TruckDecalMaps): THREE.Group {
  const truck = new THREE.Group();
  truck.name = identity.name;

  const cargo = box(3.9, 4.9, 5.3, identity.box);
  cargo.position.set(0, 3.25, -0.25);
  truck.add(cargo);

  const chassis = box(3.75, 0.55, 7.4, identity.lower);
  chassis.position.set(0, 0.8, 0.65);
  truck.add(chassis);

  const cab = box(3.65, 3.35, 2.3, identity.lower);
  cab.position.set(0, 2.25, 3.45);
  truck.add(cab);

  const windshield = box(3.1, 1.05, 0.08, 0x23343a);
  windshield.position.set(0, 2.95, 4.62);
  truck.add(windshield);

  const bumper = box(4.05, 0.45, 0.42, 0x282624);
  bumper.position.set(0, 0.68, -3.05);
  truck.add(bumper);

  const doorLine = box(0.07, 4.2, 0.08, 0x766f60);
  doorLine.position.set(0, 3.3, -2.905);
  truck.add(doorLine);

  const cargoPanel = decalPlane(
    CARGO_PANEL_SIZE.width,
    CARGO_PANEL_SIZE.height,
    atlas.texture,
    atlas.cells.cargo,
    "cargoPanel",
    true,
  );
  cargoPanel.position.set(0, 4.02, -2.94);
  truck.add(cargoPanel);

  const namePlate = decalPlane(
    NAME_PLATE_SIZE.width,
    NAME_PLATE_SIZE.height,
    atlas.texture,
    atlas.cells[identity.name],
    "namePlate",
    false,
  );
  namePlate.position.set(0, 2.9, -2.99);
  truck.add(namePlate);

  const wheelGeometry = new THREE.CylinderGeometry(0.72, 0.72, 0.52, 8);
  const wheelMaterial = new THREE.MeshLambertMaterial({ color: 0x171717, flatShading: true });
  for (const z of [-1.85, 2.75]) {
    for (const x of [-1.92, 1.92]) {
      const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(x, 0.72, z);
      truck.add(wheel);
    }
  }

  const lampMaterial = new THREE.MeshBasicMaterial({ color: identity.accent });
  for (const x of [-1.45, 1.45]) {
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.35, 0.12), lampMaterial);
    lamp.position.set(x, 1.2, -3.29);
    truck.add(lamp);
  }

  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(2.65, 12),
    new THREE.MeshBasicMaterial({
      color: 0x14120f,
      transparent: true,
      opacity: 0.45,
      depthWrite: false,
    }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.scale.set(1, 1.5, 1);
  shadow.position.y = 0.03;
  truck.add(shadow);
  return truck;
}
