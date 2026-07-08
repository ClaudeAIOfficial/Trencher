import * as THREE from 'three';

function createStoneTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#6b6b6b';
  ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 800; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    const shade = 80 + Math.random() * 60;
    ctx.fillStyle = `rgb(${shade},${shade - 5},${shade - 10})`;
    ctx.fillRect(x, y, 2 + Math.random() * 4, 2 + Math.random() * 4);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  return tex;
}

function createWoodTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#5c3d2e';
  ctx.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y += 3) {
    const shade = 70 + Math.sin(y * 0.1) * 15 + Math.random() * 10;
    ctx.fillStyle = `rgb(${shade + 20},${shade},${shade - 20})`;
    ctx.fillRect(0, y, 256, 2);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, 2);
  return tex;
}

function createRoofTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#3d2817';
  ctx.fillRect(0, 0, 128, 128);
  for (let row = 0; row < 16; row++) {
    for (let col = 0; col < 8; col++) {
      const x = col * 16 + (row % 2) * 8;
      const y = row * 8;
      const shade = 40 + Math.random() * 20;
      ctx.fillStyle = `rgb(${shade + 15},${shade},${shade - 10})`;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + 16, y);
      ctx.lineTo(x + 8, y + 8);
      ctx.fill();
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 2);
  return tex;
}

function createCobbleTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#4a4a4a';
  ctx.fillRect(0, 0, 256, 256);
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const x = col * 32 + (row % 2) * 16;
      const y = row * 32;
      const shade = 60 + Math.random() * 40;
      ctx.fillStyle = `rgb(${shade},${shade - 5},${shade - 10})`;
      ctx.beginPath();
      ctx.ellipse(x + 16, y + 16, 14, 12, Math.random(), 0, Math.PI * 2);
      ctx.fill();
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(8, 8);
  return tex;
}

const stoneTex = createStoneTexture();
const woodTex = createWoodTexture();
const roofTex = createRoofTexture();
const cobbleTex = createCobbleTexture();

const materials = {
  stone: new THREE.MeshStandardMaterial({ map: stoneTex, roughness: 0.9, metalness: 0.05 }),
  wood: new THREE.MeshStandardMaterial({ map: woodTex, roughness: 0.85, metalness: 0.02 }),
  roof: new THREE.MeshStandardMaterial({ map: roofTex, roughness: 0.8, metalness: 0.05 }),
  darkWood: new THREE.MeshStandardMaterial({ color: 0x3d2817, roughness: 0.9 }),
  window: new THREE.MeshStandardMaterial({ color: 0x87ceeb, emissive: 0x334455, emissiveIntensity: 0.3, transparent: true, opacity: 0.7 }),
  door: new THREE.MeshStandardMaterial({ color: 0x4a3020, roughness: 0.85 }),
  gold: new THREE.MeshStandardMaterial({ color: 0xc9a227, metalness: 0.6, roughness: 0.3 }),
  grass: new THREE.MeshStandardMaterial({ color: 0x2d5a27, roughness: 1 }),
  cobble: new THREE.MeshStandardMaterial({ map: cobbleTex, roughness: 0.95 }),
  sign: new THREE.MeshStandardMaterial({ color: 0xf4e8c1, roughness: 0.7 }),
};

function addWindow(group, x, y, z, w, h, rotY = 0) {
  const frame = new THREE.Mesh(new THREE.BoxGeometry(w + 0.15, h + 0.15, 0.1), materials.darkWood);
  frame.position.set(x, y, z);
  frame.rotation.y = rotY;
  group.add(frame);
  const glass = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.05), materials.window);
  glass.position.set(x, y, z + (rotY ? 0 : 0.03));
  glass.rotation.y = rotY;
  group.add(glass);
}

function addDoor(group, x, y, z, w, h, rotY = 0) {
  const frame = new THREE.Mesh(new THREE.BoxGeometry(w + 0.3, h + 0.2, 0.2), materials.darkWood);
  frame.position.set(x, y + h / 2, z);
  frame.rotation.y = rotY;
  group.add(frame);
  const door = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.12), materials.door);
  door.position.set(x, y + h / 2, z + 0.05);
  door.rotation.y = rotY;
  group.add(door);
  const handle = new THREE.Mesh(new THREE.SphereGeometry(0.06), materials.gold);
  handle.position.set(x + w * 0.35, y + h * 0.45, z + 0.12);
  handle.rotation.y = rotY;
  group.add(handle);
}

function addChimney(group, x, y, z) {
  const chimney = new THREE.Mesh(new THREE.BoxGeometry(0.8, 2.5, 0.8), materials.stone);
  chimney.position.set(x, y, z);
  chimney.castShadow = true;
  group.add(chimney);
}

function addSign(group, text, x, y, z, color) {
  const board = new THREE.Mesh(new THREE.BoxGeometry(3, 0.8, 0.1), materials.sign);
  board.position.set(x, y, z);
  group.add(board);
  const post1 = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.5), materials.darkWood);
  post1.position.set(x - 1.2, y - 0.75, z);
  group.add(post1);
  const post2 = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.5), materials.darkWood);
  post2.position.set(x + 1.2, y - 0.75, z);
  group.add(post2);
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#f4e8c1';
  ctx.fillRect(0, 0, 256, 64);
  ctx.fillStyle = color || '#3d2817';
  ctx.font = 'bold 18px serif';
  ctx.textAlign = 'center';
  ctx.fillText(text, 128, 40);
  const signTex = new THREE.CanvasTexture(canvas);
  const signMat = new THREE.MeshStandardMaterial({ map: signTex });
  const signFace = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 0.7), signMat);
  signFace.position.set(x, y, z + 0.06);
  group.add(signFace);
}

export function createShopBuilding(shop) {
  const group = new THREE.Group();
  group.userData.shop = shop;

  const w = 10, d = 8, h = 5;
  const wallColor = new THREE.MeshStandardMaterial({
    color: shop.color,
    roughness: 0.85,
    metalness: 0.05,
  });

  const base = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallColor);
  base.position.y = h / 2;
  base.castShadow = true;
  base.receiveShadow = true;
  group.add(base);

  const foundation = new THREE.Mesh(new THREE.BoxGeometry(w + 0.4, 0.5, d + 0.4), materials.stone);
  foundation.position.y = 0.25;
  group.add(foundation);

  const roofShape = new THREE.ConeGeometry(Math.max(w, d) * 0.75, 3, 4);
  const roof = new THREE.Mesh(roofShape, materials.roof);
  roof.position.y = h + 1.5;
  roof.rotation.y = Math.PI / 4;
  roof.castShadow = true;
  group.add(roof);

  const timber1 = new THREE.Mesh(new THREE.BoxGeometry(0.2, h, 0.2), materials.darkWood);
  timber1.position.set(-w / 2 + 0.5, h / 2, d / 2 + 0.05);
  group.add(timber1);
  const timber2 = timber1.clone();
  timber2.position.set(w / 2 - 0.5, h / 2, d / 2 + 0.05);
  group.add(timber2);

  addDoor(group, 0, 0, d / 2 + 0.05, 1.8, 3.2);
  addWindow(group, -2.5, 2.5, d / 2 + 0.05, 1.2, 1.2);
  addWindow(group, 2.5, 2.5, d / 2 + 0.05, 1.2, 1.2);
  addWindow(group, -w / 2 - 0.05, 2.5, 0, 1.0, 1.0, Math.PI / 2);
  addWindow(group, w / 2 + 0.05, 2.5, 0, 1.0, 1.0, -Math.PI / 2);

  addChimney(group, w / 2 - 1, h + 2, -d / 4);
  addSign(group, shop.name.split(' ').slice(0, 3).join(' '), 0, h + 0.5, d / 2 + 0.5, '#3d2817');

  const counter = new THREE.Mesh(new THREE.BoxGeometry(3, 1, 1.2), materials.wood);
  counter.position.set(0, 1.2, d / 2 - 1.5);
  group.add(counter);

  const awning = new THREE.Mesh(
    new THREE.BoxGeometry(w - 1, 0.1, 2),
    new THREE.MeshStandardMaterial({ color: 0x8b1a1a, roughness: 0.9 })
  );
  awning.position.set(0, h - 0.5, d / 2 + 0.8);
  group.add(awning);

  const awningPole1 = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2), materials.darkWood);
  awningPole1.position.set(-w / 2 + 1, h - 1.5, d / 2 + 1.5);
  group.add(awningPole1);
  const awningPole2 = awningPole1.clone();
  awningPole2.position.x = w / 2 - 1;
  group.add(awningPole2);

  group.position.set(shop.position.x, 0, shop.position.z);
  group.rotation.y = shop.rotation;

  return group;
}

export function createTownHall() {
  const group = new THREE.Group();
  const w = 14, d = 10, h = 7;

  const walls = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), materials.stone);
  walls.position.y = h / 2;
  walls.castShadow = true;
  group.add(walls);

  const roof = new THREE.Mesh(new THREE.ConeGeometry(10, 4, 4), materials.roof);
  roof.position.y = h + 2;
  roof.rotation.y = Math.PI / 4;
  group.add(roof);

  const tower = new THREE.Mesh(new THREE.CylinderGeometry(2, 2.2, 10, 8), materials.stone);
  tower.position.set(0, 5, 0);
  group.add(tower);
  const towerRoof = new THREE.Mesh(new THREE.ConeGeometry(2.5, 3, 8), materials.roof);
  towerRoof.position.set(0, 11.5, 0);
  group.add(towerRoof);

  const bell = new THREE.Mesh(new THREE.SphereGeometry(0.5), materials.gold);
  bell.position.set(0, 10, 0);
  group.add(bell);

  addDoor(group, 0, 0, d / 2 + 0.05, 2.5, 4);
  addWindow(group, -4, 3.5, d / 2 + 0.05, 1.5, 1.8);
  addWindow(group, 4, 3.5, d / 2 + 0.05, 1.5, 1.8);
  addSign(group, 'HOODCITY HALL', 0, h + 1, d / 2 + 0.5, '#8b1a1a');

  group.position.set(0, 0, 8);
  return group;
}

export function createWell() {
  const group = new THREE.Group();
  const base = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.8, 1.2, 12), materials.stone);
  base.position.y = 0.6;
  group.add(base);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(2, 1.5, 4), materials.roof);
  roof.position.y = 3;
  roof.rotation.y = Math.PI / 4;
  group.add(roof);
  const post1 = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 2.5), materials.darkWood);
  post1.position.set(-1, 1.8, 0);
  group.add(post1);
  const post2 = post1.clone();
  post2.position.x = 1;
  group.add(post2);
  group.position.set(0, 0, 0);
  return group;
}

export function createTree(x, z, scale = 1) {
  const group = new THREE.Group();
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.3 * scale, 0.5 * scale, 3 * scale, 8),
    materials.darkWood
  );
  trunk.position.y = 1.5 * scale;
  trunk.castShadow = true;
  group.add(trunk);
  const foliage = new THREE.Mesh(
    new THREE.SphereGeometry(2 * scale, 8, 6),
    new THREE.MeshStandardMaterial({ color: 0x1a4a1a, roughness: 1 })
  );
  foliage.position.y = 4 * scale;
  foliage.castShadow = true;
  group.add(foliage);
  group.position.set(x, 0, z);
  return group;
}

export function createStreetLamp(x, z) {
  const group = new THREE.Group();
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 4), materials.darkWood);
  pole.position.y = 2;
  group.add(pole);
  const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.5, 0.4), materials.gold);
  lamp.position.y = 4.2;
  group.add(lamp);
  const light = new THREE.PointLight(0xffaa44, 0.8, 12);
  light.position.y = 4;
  group.add(light);
  group.position.set(x, 0, z);
  return group;
}

export function createGround(scene) {
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(120, 120), materials.grass);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const plaza = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), materials.cobble);
  plaza.rotation.x = -Math.PI / 2;
  plaza.position.y = 0.02;
  plaza.receiveShadow = true;
  scene.add(plaza);

  const pathMat = materials.cobble;
  const pathNS = new THREE.Mesh(new THREE.PlaneGeometry(6, 50), pathMat);
  pathNS.rotation.x = -Math.PI / 2;
  pathNS.position.y = 0.03;
  scene.add(pathNS);
  const pathEW = new THREE.Mesh(new THREE.PlaneGeometry(50, 6), pathMat);
  pathEW.rotation.x = -Math.PI / 2;
  pathEW.position.y = 0.03;
  scene.add(pathEW);
}

export function createFence(x, z, length, rotY = 0) {
  const group = new THREE.Group();
  for (let i = 0; i < length; i++) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.15, 1.2, 0.15), materials.darkWood);
    post.position.set(i * 1.5, 0.6, 0);
    group.add(post);
    if (i < length - 1) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.1, 0.08), materials.wood);
      rail.position.set(i * 1.5 + 0.75, 0.9, 0);
      group.add(rail);
      const rail2 = rail.clone();
      rail2.position.y = 0.5;
      group.add(rail2);
    }
  }
  group.position.set(x, 0, z);
  group.rotation.y = rotY;
  return group;
}

export { materials };
