import * as THREE from "three";

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

function canvasTexture(
  width: number,
  height: number,
  draw: (ctx: CanvasRenderingContext2D) => void,
): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Texture canvas unavailable");
  draw(ctx);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  return texture;
}

function cargoTexture(identity: TruckIdentity): THREE.CanvasTexture {
  return canvasTexture(128, 128, (ctx) => {
    ctx.fillStyle = `#${identity.box.toString(16).padStart(6, "0")}`;
    ctx.fillRect(0, 0, 128, 128);
    ctx.strokeStyle = "#241b16";
    ctx.lineWidth = 5;
    ctx.strokeRect(3, 3, 122, 122);

    ctx.fillStyle = "#2a201b";
    ctx.beginPath();
    ctx.ellipse(64, 60, 28, 13, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(40, 58, 48, 25);
    ctx.fillStyle = "#bb3825";
    ctx.beginPath();
    ctx.ellipse(64, 58, 23, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#f1a13a";
    ctx.fillRect(48, 54, 6, 5);
    ctx.fillRect(67, 58, 7, 5);
    ctx.fillRect(78, 53, 5, 5);

    ctx.strokeStyle = "#f3eee0";
    ctx.lineWidth = 7;
    ctx.lineCap = "round";
    for (const x of [51, 77]) {
      ctx.beginPath();
      ctx.moveTo(x, 47);
      ctx.quadraticCurveTo(x - 9, 34, x + 2, 22);
      ctx.stroke();
    }

    ctx.font = "900 27px Arial Black, sans-serif";
    ctx.textAlign = "center";
    ctx.lineWidth = 7;
    ctx.strokeStyle = "#1c1714";
    ctx.strokeText("GULASCH", 64, 110);
    ctx.fillStyle = "#efb733";
    ctx.fillText("GULASCH", 64, 110);
  });
}

function plateTexture(name: TruckIdentity["name"]): THREE.CanvasTexture {
  return canvasTexture(96, 28, (ctx) => {
    ctx.fillStyle = "#e8e1ca";
    ctx.fillRect(0, 0, 96, 28);
    ctx.strokeStyle = "#171411";
    ctx.lineWidth = 4;
    ctx.strokeRect(2, 2, 92, 24);
    ctx.fillStyle = "#171411";
    ctx.font = "900 21px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(name, 48, 15);
  });
}

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

export function createTruck(identity: TruckIdentity): THREE.Group {
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
  doorLine.position.set(0, 3.3, -2.94);
  truck.add(doorLine);

  const cargoPanel = new THREE.Mesh(
    new THREE.PlaneGeometry(3.45, 3.15),
    new THREE.MeshBasicMaterial({ map: cargoTexture(identity), transparent: false }),
  );
  cargoPanel.position.set(0, 3.7, -2.93);
  cargoPanel.rotation.y = Math.PI;
  truck.add(cargoPanel);

  const namePlate = new THREE.Mesh(
    new THREE.PlaneGeometry(3, 0.82),
    new THREE.MeshBasicMaterial({ map: plateTexture(identity.name), transparent: false }),
  );
  namePlate.position.set(0, 1.62, -3.3);
  namePlate.rotation.y = Math.PI;
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
