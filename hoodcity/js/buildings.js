import * as THREE from 'three';

export function createBuilding(type, materials, options = {}) {
  const group = new THREE.Group();
  const { width = 12, depth = 10, height = 8, wallColor } = options;

  const wallMat = wallColor
    ? new THREE.MeshStandardMaterial({ color: wallColor, roughness: 0.85, metalness: 0.05 })
    : materials.stone;

  // Foundation
  const foundation = new THREE.Mesh(
    new THREE.BoxGeometry(width + 1, 0.8, depth + 1),
    materials.stone
  );
  foundation.position.y = 0.4;
  foundation.castShadow = true;
  foundation.receiveShadow = true;
  group.add(foundation);

  // Main walls with timber frame details
  const walls = new THREE.Mesh(
    new THREE.BoxGeometry(width, height, depth),
    wallMat
  );
  walls.position.y = height / 2 + 0.8;
  walls.castShadow = true;
  walls.receiveShadow = true;
  group.add(walls);

  // Timber beams (horizontal)
  for (let y = 2; y < height; y += 2.5) {
    const beamFront = new THREE.Mesh(
      new THREE.BoxGeometry(width + 0.3, 0.25, 0.25),
      materials.woodDark
    );
    beamFront.position.set(0, y + 0.8, depth / 2 + 0.1);
    group.add(beamFront);

    const beamBack = beamFront.clone();
    beamBack.position.z = -depth / 2 - 0.1;
    group.add(beamBack);
  }

  // Vertical timber posts at corners
  const corners = [
    [-width / 2, depth / 2], [width / 2, depth / 2],
    [-width / 2, -depth / 2], [width / 2, -depth / 2],
  ];
  corners.forEach(([cx, cz]) => {
    const post = new THREE.Mesh(
      new THREE.BoxGeometry(0.3, height, 0.3),
      materials.woodDark
    );
    post.position.set(cx, height / 2 + 0.8, cz);
    post.castShadow = true;
    group.add(post);
  });

  // Gabled roof
  const roofHeight = 4;
  const roofGeo = new THREE.ConeGeometry(Math.max(width, depth) * 0.75, roofHeight, 4);
  const roof = new THREE.Mesh(roofGeo, materials.roof);
  roof.position.y = height + 0.8 + roofHeight / 2;
  roof.rotation.y = Math.PI / 4;
  roof.castShadow = true;
  group.add(roof);

  // Chimney
  const chimney = new THREE.Mesh(
    new THREE.BoxGeometry(1.2, 3, 1.2),
    materials.brick
  );
  chimney.position.set(width / 3, height + 2, -depth / 4);
  chimney.castShadow = true;
  group.add(chimney);

  // Door
  const door = new THREE.Mesh(
    new THREE.BoxGeometry(2.2, 3.5, 0.2),
    materials.woodDark
  );
  door.position.set(0, 2.55, depth / 2 + 0.15);
  group.add(door);

  // Door frame
  const doorFrame = new THREE.Mesh(
    new THREE.BoxGeometry(2.6, 3.9, 0.15),
    materials.wood
  );
  doorFrame.position.set(0, 2.75, depth / 2 + 0.05);
  group.add(doorFrame);

  // Door handle
  const handle = new THREE.Mesh(
    new THREE.SphereGeometry(0.12, 8, 8),
    materials.gold
  );
  handle.position.set(0.7, 2.3, depth / 2 + 0.3);
  group.add(handle);

  // Windows
  const windowPositions = [
    { x: -width / 3, y: 5, z: depth / 2 },
    { x: width / 3, y: 5, z: depth / 2 },
    { x: -width / 3, y: 5, z: -depth / 2 },
    { x: width / 3, y: 5, z: -depth / 2 },
    { x: -width / 2, y: 5, z: 0 },
    { x: width / 2, y: 5, z: 0 },
  ];

  windowPositions.forEach((pos) => {
    const winFrame = new THREE.Mesh(
      new THREE.BoxGeometry(1.8, 2, 0.15),
      materials.wood
    );
    const isSide = Math.abs(pos.x) > width / 2 - 1;
    winFrame.position.set(pos.x, pos.y + 0.8, pos.z);
    if (isSide) {
      winFrame.rotation.y = Math.PI / 2;
      winFrame.position.x += pos.x > 0 ? 0.15 : -0.15;
    } else {
      winFrame.position.z += pos.z > 0 ? 0.15 : -0.15;
    }
    group.add(winFrame);

    const winGlass = new THREE.Mesh(
      new THREE.BoxGeometry(1.4, 1.6, 0.1),
      materials.glass
    );
    winGlass.position.copy(winFrame.position);
    if (isSide) winGlass.position.x += pos.x > 0 ? 0.1 : -0.1;
    else winGlass.position.z += pos.z > 0 ? 0.1 : -0.1;
    group.add(winGlass);

    const winLight = new THREE.PointLight(0xffaa66, 0.3, 6);
    winLight.position.copy(winGlass.position);
    group.add(winLight);
  });

  // Shop-specific details
  if (type === 'blacksmith') {
    addForge(group, materials, width, depth);
  } else if (type === 'tavern') {
    addTavernDetails(group, materials, width, depth, height);
  } else if (type === 'archery') {
    addArcheryTarget(group, materials, depth);
  } else if (type === 'market') {
    addMarketStall(group, materials, width);
  } else if (type === 'treasury') {
    addTreasuryDetails(group, materials, width, height);
  }

  return group;
}

function addForge(group, materials, width, depth) {
  const anvil = new THREE.Mesh(
    new THREE.BoxGeometry(1.5, 0.8, 0.8),
    materials.iron
  );
  anvil.position.set(width / 4, 1.2, depth / 2 + 2);
  group.add(anvil);

  const forge = new THREE.Mesh(
    new THREE.BoxGeometry(2, 1.5, 1.5),
    materials.brick
  );
  forge.position.set(-width / 4, 1.5, depth / 2 + 2);
  group.add(forge);

  const fire = new THREE.Mesh(
    new THREE.BoxGeometry(1.2, 0.5, 1),
    materials.torch
  );
  fire.position.set(-width / 4, 2.3, depth / 2 + 2);
  group.add(fire);

  const forgeLight = new THREE.PointLight(0xff6622, 2, 12);
  forgeLight.position.copy(fire.position);
  group.add(forgeLight);
}

function addTavernDetails(group, materials, width, depth, height) {
  const sign = createHangingSign('🍺', materials);
  sign.position.set(0, height + 1, depth / 2 + 1.5);
  group.add(sign);

  for (let i = -1; i <= 1; i++) {
    const barrel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.5, 0.5, 1.2, 12),
      materials.wood
    );
    barrel.position.set(i * 2.5, 1.4, depth / 2 + 1.5);
    group.add(barrel);
  }
}

function addArcheryTarget(group, materials, depth) {
  const target = new THREE.Mesh(
    new THREE.CylinderGeometry(1, 1, 0.15, 16),
    new THREE.MeshStandardMaterial({ color: 0xcc3333 })
  );
  target.rotation.x = Math.PI / 2;
  target.position.set(0, 3, depth / 2 + 3);
  group.add(target);

  const rings = [0.7, 0.4, 0.15];
  const colors = [0xffffff, 0x333333, 0xffcc00];
  rings.forEach((r, i) => {
    const ring = new THREE.Mesh(
      new THREE.CylinderGeometry(r, r, 0.16, 16),
      new THREE.MeshStandardMaterial({ color: colors[i] })
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.set(0, 3, depth / 2 + 3.05 + i * 0.01);
    group.add(ring);
  });
}

function addMarketStall(group, materials, width) {
  const awning = new THREE.Mesh(
    new THREE.BoxGeometry(width + 2, 0.15, 4),
    new THREE.MeshStandardMaterial({ color: 0x8b2020, roughness: 0.9 })
  );
  awning.position.set(0, 5, 6);
  group.add(awning);

  const poleGeo = new THREE.CylinderGeometry(0.08, 0.08, 5, 8);
  [-1, 1].forEach((side) => {
    const pole = new THREE.Mesh(poleGeo, materials.wood);
    pole.position.set(side * (width / 2 + 0.5), 2.5, 8);
    group.add(pole);
  });

  const crate = new THREE.Mesh(
    new THREE.BoxGeometry(1, 0.8, 0.8),
    materials.wood
  );
  crate.position.set(-2, 1.2, 6);
  group.add(crate);
}

function addTreasuryDetails(group, materials, width, height) {
  const columns = [-1, 1];
  columns.forEach((side) => {
    const column = new THREE.Mesh(
      new THREE.CylinderGeometry(0.4, 0.5, height, 8),
      materials.stone
    );
    column.position.set(side * (width / 2 + 1), height / 2 + 0.8, 5);
    group.add(column);
  });

  const banner = new THREE.Mesh(
    new THREE.BoxGeometry(2, 3, 0.1),
    new THREE.MeshStandardMaterial({ color: 0x2d5a3d })
  );
  banner.position.set(0, height + 2, 5.5);
  group.add(banner);
}

function createHangingSign(emoji, materials) {
  const signGroup = new THREE.Group();
  const board = new THREE.Mesh(
    new THREE.BoxGeometry(2.5, 1.2, 0.15),
    materials.wood
  );
  signGroup.add(board);
  return signGroup;
}

export function createShopSign(text, materials) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#3d2818';
  ctx.fillRect(0, 0, 512, 128);
  ctx.strokeStyle = '#d4a843';
  ctx.lineWidth = 4;
  ctx.strokeRect(4, 4, 504, 120);
  ctx.fillStyle = '#f4e8c1';
  ctx.font = 'bold 36px serif';
  ctx.textAlign = 'center';
  ctx.fillText(text, 256, 75);

  const tex = new THREE.CanvasTexture(canvas);
  const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8 });
  const sign = new THREE.Mesh(new THREE.BoxGeometry(4, 1, 0.15), mat);
  return sign;
}

export function createNPC(materials, clothColor = 'green') {
  const npc = new THREE.Group();
  const clothMat = clothColor === 'red' ? materials.npcClothRed
    : clothColor === 'brown' ? materials.npcClothBrown
    : materials.npcCloth;

  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.35, 0.4, 1.2, 8),
    clothMat
  );
  body.position.y = 1.2;
  npc.add(body);

  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.3, 8, 8),
    materials.npcSkin
  );
  head.position.y = 2.1;
  npc.add(head);

  const hood = new THREE.Mesh(
    new THREE.ConeGeometry(0.35, 0.5, 8),
    clothMat
  );
  hood.position.y = 2.35;
  npc.add(hood);

  const legs = new THREE.Mesh(
    new THREE.CylinderGeometry(0.15, 0.18, 0.8, 6),
    materials.woodDark
  );
  legs.position.y = 0.4;
  npc.add(legs);

  return npc;
}

export function createTree(materials) {
  const tree = new THREE.Group();
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.3, 0.5, 3, 8),
    materials.treeTrunk
  );
  trunk.position.y = 1.5;
  trunk.castShadow = true;
  tree.add(trunk);

  const foliage = new THREE.Mesh(
    new THREE.SphereGeometry(2 + Math.random(), 8, 8),
    materials.treeLeaves
  );
  foliage.position.y = 4;
  foliage.castShadow = true;
  tree.add(foliage);

  return tree;
}

export function createTorch(materials) {
  const torch = new THREE.Group();
  const stick = new THREE.Mesh(
    new THREE.CylinderGeometry(0.05, 0.08, 0.8, 6),
    materials.wood
  );
  stick.position.y = 0.4;
  torch.add(stick);

  const flame = new THREE.Mesh(
    new THREE.SphereGeometry(0.15, 6, 6),
    materials.torch
  );
  flame.position.y = 0.9;
  torch.add(flame);

  const light = new THREE.PointLight(0xff8833, 1.5, 10);
  light.position.y = 0.9;
  torch.add(light);

  return torch;
}

export function createWell(materials) {
  const well = new THREE.Group();
  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(1.5, 1.8, 1.2, 12),
    materials.stone
  );
  base.position.y = 0.6;
  well.add(base);

  const roof = new THREE.Mesh(
    new THREE.ConeGeometry(2, 1.5, 4),
    materials.roof
  );
  roof.position.y = 3;
  roof.rotation.y = Math.PI / 4;
  well.add(roof);

  [-1, 1].forEach((side) => {
    const post = new THREE.Mesh(
      new THREE.CylinderGeometry(0.1, 0.1, 2.5, 6),
      materials.wood
    );
    post.position.set(side * 1.2, 2, 0);
    well.add(post);
  });

  return well;
}

export function createFountain(materials) {
  const fountain = new THREE.Group();
  const basin = new THREE.Mesh(
    new THREE.CylinderGeometry(2.5, 2.8, 0.8, 16),
    materials.stone
  );
  basin.position.y = 0.4;
  fountain.add(basin);

  const pillar = new THREE.Mesh(
    new THREE.CylinderGeometry(0.4, 0.5, 2, 8),
    materials.stone
  );
  pillar.position.y = 1.8;
  fountain.add(pillar);

  const top = new THREE.Mesh(
    new THREE.SphereGeometry(0.6, 8, 8),
    materials.stone
  );
  top.position.y = 3;
  fountain.add(top);

  const water = new THREE.Mesh(
    new THREE.CylinderGeometry(2.3, 2.3, 0.3, 16),
    new THREE.MeshStandardMaterial({ color: 0x3366aa, transparent: true, opacity: 0.6, roughness: 0.1 })
  );
  water.position.y = 0.55;
  fountain.add(water);

  return fountain;
}
