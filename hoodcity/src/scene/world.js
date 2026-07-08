import * as THREE from 'three';
import { createBuilding } from './buildings.js';
import { grassTexture, dirtPathTexture, cobblestoneTexture, stoneWallTexture, woodPlankTexture } from './textures.js';
import { createMerchantCharacter, createVillagerCharacter } from './character.js';
import { SHOPS, POOR_VILLAGERS, TAX_WAGON_POSITION } from '../data/shops.js';

const WORLD_RADIUS = 46;

function facingRotation(position) {
  return Math.atan2(-position.x, -position.z);
}

function makeTree(scale = 1) {
  const group = new THREE.Group();
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x4a331d, roughness: 0.95 });
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.18 * scale, 0.26 * scale, 2.2 * scale, 7), trunkMat);
  trunk.position.y = 1.1 * scale;
  trunk.castShadow = true;
  trunk.receiveShadow = true;
  group.add(trunk);

  const leafMat = new THREE.MeshStandardMaterial({ color: 0x3d5c2a, roughness: 0.9 });
  const leafMat2 = new THREE.MeshStandardMaterial({ color: 0x4a7038, roughness: 0.9 });
  const layers = [
    { y: 2.4, r: 1.3, mat: leafMat },
    { y: 3.1, r: 1.05, mat: leafMat2 },
    { y: 3.75, r: 0.75, mat: leafMat },
  ];
  layers.forEach(({ y, r, mat }) => {
    const cone = new THREE.Mesh(new THREE.ConeGeometry(r * scale, 1.5 * scale, 8), mat);
    cone.position.y = y * scale;
    cone.castShadow = true;
    cone.receiveShadow = true;
    group.add(cone);
  });
  return group;
}

function makeFountain() {
  const group = new THREE.Group();
  const stoneMat = new THREE.MeshStandardMaterial({ map: stoneWallTexture(), roughness: 0.95 });
  const base = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.6, 0.6, 16), stoneMat);
  base.position.y = 0.3;
  base.castShadow = true;
  base.receiveShadow = true;
  group.add(base);

  const waterMat = new THREE.MeshStandardMaterial({ color: 0x3f7ea6, roughness: 0.15, metalness: 0.2, transparent: true, opacity: 0.85 });
  const water = new THREE.Mesh(new THREE.CylinderGeometry(2.15, 2.15, 0.15, 16), waterMat);
  water.position.y = 0.63;
  group.add(water);

  const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.3, 1.3, 10), stoneMat);
  pillar.position.y = 1.2;
  pillar.castShadow = true;
  group.add(pillar);

  const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.6, 0.35, 14), stoneMat);
  bowl.position.y = 1.85;
  bowl.castShadow = true;
  group.add(bowl);

  const top = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 10), stoneMat);
  top.position.y = 2.15;
  group.add(top);

  return group;
}

function makeTaxWagon() {
  const group = new THREE.Group();
  const woodMat = new THREE.MeshStandardMaterial({ map: woodPlankTexture('#6b4423'), roughness: 0.9 });
  const bed = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.9, 1.3), woodMat);
  bed.position.y = 0.75;
  bed.castShadow = true;
  bed.receiveShadow = true;
  group.add(bed);

  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x2b1c0f, roughness: 0.9 });
  [[-0.9, 0.7], [0.9, 0.7], [-0.9, -0.7], [0.9, -0.7]].forEach(([x, z]) => {
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.14, 12), wheelMat);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(x, 0.4, z);
    wheel.castShadow = true;
    group.add(wheel);
  });

  const chestMat = new THREE.MeshStandardMaterial({ color: 0x8a6a2a, roughness: 0.7, metalness: 0.3 });
  const chest = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.5, 0.7), chestMat);
  chest.position.y = 1.45;
  chest.castShadow = true;
  group.add(chest);
  const chestLid = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.12, 0.75), chestMat);
  chestLid.position.y = 1.72;
  group.add(chestLid);

  const flagMat = new THREE.MeshStandardMaterial({ color: 0x7a1f1f, side: THREE.DoubleSide });
  const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.35), flagMat);
  flag.position.set(0, 2.4, 0);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1, 6), new THREE.MeshStandardMaterial({ color: 0x2b2b2b }));
  pole.position.set(-0.2, 2.1, 0);
  group.add(pole, flag);
  flag.position.set(0.05, 2.4, 0);

  return group;
}

function makeArcheryTarget() {
  const group = new THREE.Group();
  const postMat = new THREE.MeshStandardMaterial({ color: 0x5c4423, roughness: 0.9 });
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 1.5, 8), postMat);
  post.position.y = 0.75;
  post.castShadow = true;
  group.add(post);

  const strawMat = new THREE.MeshStandardMaterial({ color: 0xd9b463, roughness: 1 });
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.18, 20), strawMat);
  disc.rotation.x = Math.PI / 2;
  disc.position.y = 1.55;
  disc.castShadow = true;
  disc.receiveShadow = true;
  group.add(disc);

  const rings = [
    { r: 0.48, color: 0xffffff },
    { r: 0.36, color: 0x1f3a1c },
    { r: 0.24, color: 0x2c4f8f },
    { r: 0.1, color: 0x7a1f1f },
  ];
  rings.forEach(({ r, color }, i) => {
    const ring = new THREE.Mesh(
      new THREE.CylinderGeometry(r, r, 0.015, 20),
      new THREE.MeshStandardMaterial({ color })
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.set(0, 1.55, 0.092 + i * 0.003);
    group.add(ring);
  });

  group.userData.isTarget = true;
  group.userData.hitRadius = 0.6;
  group.userData.hitCenter = new THREE.Vector3(0, 1.65, 0);
  return group;
}

export function buildWorld(scene) {
  const collidables = [];
  const interactables = [];
  const targets = [];

  scene.fog = new THREE.FogExp2(0xd9c48d, 0.0105);

  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(WORLD_RADIUS + 20, 48),
    new THREE.MeshStandardMaterial({ map: grassTexture(), roughness: 1 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const squareTex = cobblestoneTexture();
  squareTex.repeat.set(9, 9);
  const square = new THREE.Mesh(
    new THREE.CircleGeometry(9, 32),
    new THREE.MeshStandardMaterial({ map: squareTex, roughness: 0.95 })
  );
  square.rotation.x = -Math.PI / 2;
  square.position.y = 0.01;
  square.receiveShadow = true;
  scene.add(square);

  SHOPS.forEach((shop) => {
    const angle = Math.atan2(shop.position.x, shop.position.z);
    const pathLength = shop.position.length() - 8;
    const pathTex = dirtPathTexture();
    pathTex.repeat.set(2.4, pathLength / 2.2);
    const dir = shop.position.clone().normalize();
    const midpoint = dir.clone().multiplyScalar(8 + pathLength / 2);
    const path = new THREE.Mesh(new THREE.PlaneGeometry(3.2, pathLength), new THREE.MeshStandardMaterial({ map: pathTex, roughness: 1 }));
    path.rotation.x = -Math.PI / 2;
    path.rotation.z = -angle;
    path.position.set(midpoint.x, 0.008, midpoint.z);
    path.receiveShadow = true;
    scene.add(path);
  });

  scene.add(makeFountain());

  const squareLight = new THREE.PointLight(0xffcf9e, 0.6, 14, 2);
  squareLight.position.set(0, 4, 0);
  scene.add(squareLight);

  SHOPS.forEach((shop) => {
    const rotationY = facingRotation(shop.position);
    const building = createBuilding({
      ...shop.building,
      doorSide: 'south',
      signText: shop.name.split(' ').slice(0, 2).join(' '),
      signSub: shop.name.split(' ').slice(2).join(' '),
      position: shop.position,
      rotationY,
    });
    building.userData.shopId = shop.id;
    scene.add(building);
    collidables.push(building.userData.footprint);

    const merchant = createMerchantCharacter(shop.merchantColor);
    const dirToCenter = shop.position.clone().negate().normalize();
    const merchantPos = shop.position.clone().add(dirToCenter.multiplyScalar(shop.building.depth / 2 + 1.4));
    merchant.root.position.copy(merchantPos);
    merchant.root.position.y = 0;
    merchant.root.rotation.y = rotationY;
    scene.add(merchant.root);

    interactables.push({
      type: 'shop',
      shopId: shop.id,
      position: merchantPos,
      radius: 3.2,
      prompt: `Press E to trade with ${shop.keeper}`,
      root: merchant.root,
      idleT: Math.random() * 10,
    });
  });

  POOR_VILLAGERS.forEach((v) => {
    const villager = createVillagerCharacter({});
    villager.root.position.copy(v.position);
    villager.root.rotation.y = Math.random() * Math.PI * 2;
    scene.add(villager.root);
    interactables.push({
      type: 'villager',
      id: v.id,
      name: v.name,
      line: v.line,
      position: v.position,
      radius: 2.6,
      prompt: `Press E to give gold to ${v.name}`,
      root: villager.root,
      idleT: Math.random() * 10,
    });
  });

  const wagon = makeTaxWagon();
  wagon.position.copy(TAX_WAGON_POSITION);
  wagon.rotation.y = 0.3;
  scene.add(wagon);
  interactables.push({
    type: 'wagon',
    position: TAX_WAGON_POSITION,
    radius: 2.6,
    prompt: "Press E to rob the Sheriff's tax chest",
    lastRobbed: -9999,
  });

  const archeryCenter = new THREE.Vector3(16, 0, -12).add(new THREE.Vector3(-5, 0, 4));
  const targetPositions = [
    archeryCenter.clone().add(new THREE.Vector3(0, 0, 0)),
    archeryCenter.clone().add(new THREE.Vector3(2.2, 0, -1)),
    archeryCenter.clone().add(new THREE.Vector3(-2.2, 0, -1)),
  ];
  targetPositions.forEach((pos, i) => {
    const t = makeArcheryTarget();
    t.position.copy(pos);
    t.rotation.y = Math.PI / 5;
    scene.add(t);
    targets.push({ mesh: t, lastHit: -9999, id: `target${i}` });
  });

  const treeCount = 140;
  for (let i = 0; i < treeCount; i++) {
    const angle = Math.random() * Math.PI * 2;
    const radius = 30 + Math.random() * (WORLD_RADIUS - 14);
    const x = Math.sin(angle) * radius;
    const z = Math.cos(angle) * radius;
    const scale = 0.8 + Math.random() * 0.7;
    const tree = makeTree(scale);
    tree.position.set(x, 0, z);
    tree.rotation.y = Math.random() * Math.PI * 2;
    scene.add(tree);
    collidables.push({
      minX: x - 0.35 * scale,
      maxX: x + 0.35 * scale,
      minZ: z - 0.35 * scale,
      maxZ: z + 0.35 * scale,
    });
  }

  const scatterTrees = 26;
  for (let i = 0; i < scatterTrees; i++) {
    const angle = Math.random() * Math.PI * 2;
    const radius = 20 + Math.random() * 8;
    const x = Math.sin(angle) * radius;
    const z = Math.cos(angle) * radius;
    let tooClose = false;
    SHOPS.forEach((s) => {
      if (s.position.distanceTo(new THREE.Vector3(x, 0, z)) < 8) tooClose = true;
    });
    if (tooClose) continue;
    const scale = 0.6 + Math.random() * 0.5;
    const tree = makeTree(scale);
    tree.position.set(x, 0, z);
    tree.rotation.y = Math.random() * Math.PI * 2;
    scene.add(tree);
    collidables.push({
      minX: x - 0.3 * scale,
      maxX: x + 0.3 * scale,
      minZ: z - 0.3 * scale,
      maxZ: z + 0.3 * scale,
    });
  }

  const wallMat = new THREE.MeshStandardMaterial({ map: stoneWallTexture(), roughness: 1 });
  const wallSegs = 40;
  for (let i = 0; i < wallSegs; i++) {
    const angle = (i / wallSegs) * Math.PI * 2;
    const x = Math.sin(angle) * WORLD_RADIUS;
    const z = Math.cos(angle) * WORLD_RADIUS;
    const seg = new THREE.Mesh(new THREE.BoxGeometry(4.2, 2.4, 1), wallMat);
    seg.position.set(x, 1.2, z);
    seg.rotation.y = angle;
    seg.castShadow = true;
    seg.receiveShadow = true;
    scene.add(seg);
  }

  return { collidables, interactables, targets };
}
