import * as THREE from 'three';
import {
  stuccoTexture,
  brickTexture,
  stoneWallTexture,
  thatchTexture,
  roofTileTexture,
  woodPlankTexture,
  bannerTextTexture,
} from './textures.js';

const TIMBER_COLOR = 0x2e1c0f;
const GLASS_COLOR = 0x8fb6c9;

function timberBeam(w, h, d) {
  const geo = new THREE.BoxGeometry(w, h, d);
  const mat = new THREE.MeshStandardMaterial({ color: TIMBER_COLOR, roughness: 0.85 });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function addTudorFrame(group, width, height, depth) {
  const hw = width / 2;
  const hd = depth / 2;
  const beamT = 0.09;
  const faces = [
    { w: width, x: 0, z: hd, rot: 0 },
    { w: width, x: 0, z: -hd, rot: 0 },
    { w: depth, x: hw, z: 0, rot: Math.PI / 2 },
    { w: depth, x: -hw, z: 0, rot: Math.PI / 2 },
  ];
  faces.forEach(({ w, x, z, rot }) => {
    const vCount = Math.max(2, Math.floor(w / 1.1));
    for (let i = 0; i <= vCount; i++) {
      const beam = timberBeam(beamT, height, beamT + 0.02);
      const t = i / vCount - 0.5;
      beam.position.set(x + Math.cos(rot) * t * w, height / 2, z + Math.sin(rot) * t * w);
      beam.rotation.y = rot;
      group.add(beam);
    }
    const hCount = 2;
    for (let i = 1; i <= hCount; i++) {
      const beam = timberBeam(w, beamT, beamT + 0.02);
      beam.position.set(x, (height * i) / (hCount + 1), z);
      beam.rotation.y = rot;
      group.add(beam);
    }
  });
}

function makeWindow(width = 0.7, height = 0.9) {
  const group = new THREE.Group();
  const frameMat = new THREE.MeshStandardMaterial({ color: TIMBER_COLOR, roughness: 0.8 });
  const glassMat = new THREE.MeshStandardMaterial({
    color: GLASS_COLOR,
    roughness: 0.15,
    metalness: 0.1,
    emissive: 0x2a3b42,
    emissiveIntensity: 0.35,
    transparent: true,
    opacity: 0.85,
  });
  const frame = new THREE.Mesh(new THREE.BoxGeometry(width, height, 0.06), frameMat);
  group.add(frame);
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(width * 0.82, height * 0.82), glassMat);
  glass.position.z = 0.035;
  group.add(glass);
  const barV = new THREE.Mesh(new THREE.BoxGeometry(0.035, height * 0.82, 0.07), frameMat);
  barV.position.z = 0.04;
  group.add(barV);
  const barH = new THREE.Mesh(new THREE.BoxGeometry(width * 0.82, 0.035, 0.07), frameMat);
  barH.position.z = 0.04;
  group.add(barH);
  group.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
  return group;
}

function makeDoor(width = 1.1, height = 1.9) {
  const group = new THREE.Group();
  const plankTex = woodPlankTexture('#4a2d16');
  plankTex.repeat.set(2, 3);
  const doorMat = new THREE.MeshStandardMaterial({ map: plankTex, roughness: 0.9 });
  const door = new THREE.Mesh(new THREE.BoxGeometry(width, height, 0.08), doorMat);
  door.position.y = height / 2;
  door.castShadow = true;
  group.add(door);
  const frameMat = new THREE.MeshStandardMaterial({ color: TIMBER_COLOR, roughness: 0.8 });
  const top = new THREE.Mesh(new THREE.BoxGeometry(width + 0.24, 0.14, 0.14), frameMat);
  top.position.y = height + 0.07;
  group.add(top);
  const handle = new THREE.Mesh(
    new THREE.SphereGeometry(0.045, 8, 8),
    new THREE.MeshStandardMaterial({ color: 0x3a3a3a, metalness: 0.7, roughness: 0.4 })
  );
  handle.position.set(width * 0.32, height * 0.5, 0.07);
  group.add(handle);
  return group;
}

function makeHipRoof(width, depth, height, material) {
  const group = new THREE.Group();
  const geo = new THREE.ConeGeometry(Math.max(width, depth) * 0.78, height, 4, 1);
  const roof = new THREE.Mesh(geo, material);
  roof.rotation.y = Math.PI / 4;
  roof.scale.set(width / (Math.max(width, depth) * 1.1), 1, depth / (Math.max(width, depth) * 1.1));
  roof.position.y = height / 2;
  roof.castShadow = true;
  roof.receiveShadow = true;
  group.add(roof);
  return group;
}

function makeGableRoof(width, depth, height, material, overhang = 0.35) {
  const group = new THREE.Group();
  const shape = new THREE.Shape();
  const hw = width / 2 + overhang;
  shape.moveTo(-hw, 0);
  shape.lineTo(0, height);
  shape.lineTo(hw, 0);
  shape.lineTo(-hw, 0);
  const extrudeSettings = { depth: depth + overhang * 2, bevelEnabled: false, steps: 1 };
  const geo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
  geo.translate(0, 0, -(depth + overhang * 2) / 2);
  const roof = new THREE.Mesh(geo, material);
  roof.castShadow = true;
  roof.receiveShadow = true;
  group.add(roof);
  return group;
}

function makeChimney(height) {
  const group = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ map: stoneWallTexture(), roughness: 1 });
  const stack = new THREE.Mesh(new THREE.BoxGeometry(0.4, height, 0.4), mat);
  stack.position.y = height / 2;
  stack.castShadow = true;
  group.add(stack);
  const cap = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.12, 0.55), mat);
  cap.position.y = height + 0.06;
  group.add(cap);
  return group;
}

function makeSign(text, sub, width = 1.6, height = 0.85) {
  const group = new THREE.Group();
  const tex = bannerTextTexture(text, sub);
  const plane = new THREE.Mesh(
    new THREE.PlaneGeometry(width, height),
    new THREE.MeshStandardMaterial({ map: tex, roughness: 0.7, side: THREE.DoubleSide })
  );
  group.add(plane);
  const frameMat = new THREE.MeshStandardMaterial({ color: TIMBER_COLOR });
  const border = new THREE.Mesh(new THREE.BoxGeometry(width + 0.06, height + 0.06, 0.04), frameMat);
  border.position.z = -0.03;
  group.add(border);
  const braceMat = new THREE.MeshStandardMaterial({ color: 0x2b2b2b, metalness: 0.6, roughness: 0.5 });
  const bracket = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.5, 6), braceMat);
  bracket.rotation.z = Math.PI / 2.4;
  bracket.position.set(0, height / 2 + 0.15, 0.15);
  group.add(bracket);
  return group;
}

/**
 * Creates a fully-dressed building mesh group with walls, timber framing,
 * roof, chimney, door, windows and a hanging shop sign.
 */
export function createBuilding({
  width = 6,
  depth = 5,
  height = 3.2,
  roofHeight = 2.2,
  roofType = 'gable',
  wallStyle = 'stucco',
  wallColor = '#e6d8b3',
  roofColor = '#7a2f24',
  doorSide = 'south',
  signText = '',
  signSub = '',
  windows = 3,
  position = new THREE.Vector3(),
  rotationY = 0,
}) {
  const group = new THREE.Group();
  group.position.copy(position);
  group.rotation.y = rotationY;

  let wallTexture;
  if (wallStyle === 'brick') wallTexture = brickTexture(wallColor);
  else if (wallStyle === 'stone') wallTexture = stoneWallTexture();
  else wallTexture = stuccoTexture(wallColor);
  wallTexture.repeat.set(width / 2.2, height / 2.2);

  const wallMat = new THREE.MeshStandardMaterial({ map: wallTexture, roughness: 0.92, metalness: 0.02 });
  const walls = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), wallMat);
  walls.position.y = height / 2;
  walls.castShadow = true;
  walls.receiveShadow = true;
  group.add(walls);

  const floor = new THREE.Mesh(
    new THREE.BoxGeometry(width + 0.3, 0.18, depth + 0.3),
    new THREE.MeshStandardMaterial({ map: stoneWallTexture(), roughness: 1 })
  );
  floor.position.y = 0.09;
  floor.receiveShadow = true;
  group.add(floor);

  if (wallStyle !== 'stone') addTudorFrame(group, width, height, depth);

  const roofMat = new THREE.MeshStandardMaterial({
    map: roofType === 'thatch' ? thatchTexture() : roofTileTexture(roofColor),
    roughness: 1,
    side: THREE.DoubleSide,
  });
  let roof;
  if (roofType === 'hip') {
    roof = makeHipRoof(width + 0.6, depth + 0.6, roofHeight, roofMat);
  } else {
    roof = makeGableRoof(width, depth, roofHeight, roofMat);
    roof.rotation.y = doorSide === 'east' || doorSide === 'west' ? Math.PI / 2 : 0;
  }
  roof.position.y = height;
  group.add(roof);

  const chimney = makeChimney(height * 0.65 + 1.1);
  chimney.position.set(width / 2 - 0.6, height, depth / 2 - 0.6);
  group.add(chimney);

  const sideMap = {
    south: { pos: [0, 0, depth / 2 + 0.03], rot: 0 },
    north: { pos: [0, 0, -depth / 2 - 0.03], rot: Math.PI },
    east: { pos: [width / 2 + 0.03, 0, 0], rot: Math.PI / 2 },
    west: { pos: [-width / 2 - 0.03, 0, 0], rot: -Math.PI / 2 },
  };
  const doorInfo = sideMap[doorSide];
  const door = makeDoor();
  door.position.set(doorInfo.pos[0], 0.09, doorInfo.pos[2]);
  door.rotation.y = doorInfo.rot;
  group.add(door);

  const wallLength = doorSide === 'east' || doorSide === 'west' ? depth : width;
  const step = wallLength / (windows + 1);
  for (let i = 1; i <= windows; i++) {
    const win = makeWindow();
    const t = -wallLength / 2 + step * i;
    if (doorSide === 'south' || doorSide === 'north') {
      if (Math.abs(t) < 1) continue;
      win.position.set(t, height * 0.6, doorInfo.pos[2]);
      win.rotation.y = doorInfo.rot;
    } else {
      if (Math.abs(t) < 1) continue;
      win.position.set(doorInfo.pos[0], height * 0.6, t);
      win.rotation.y = doorInfo.rot;
    }
    group.add(win);
    const win2 = win.clone();
    if (doorSide === 'south' || doorSide === 'north') {
      win2.position.set(t, height * 0.6, -doorInfo.pos[2]);
      win2.rotation.y = doorInfo.rot + Math.PI;
    } else {
      win2.position.set(-doorInfo.pos[0], height * 0.6, t);
      win2.rotation.y = doorInfo.rot + Math.PI;
    }
    group.add(win2);
  }

  if (signText) {
    const sign = makeSign(signText, signSub);
    sign.position.set(doorInfo.pos[0] * 1.02, 2.15, doorInfo.pos[2] * 1.02);
    sign.rotation.y = doorInfo.rot;
    group.add(sign);
  }

  group.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });

  group.userData.footprint = {
    minX: position.x - width / 2 - 0.4,
    maxX: position.x + width / 2 + 0.4,
    minZ: position.z - depth / 2 - 0.4,
    maxZ: position.z + depth / 2 + 0.4,
  };
  group.userData.entrance = new THREE.Vector3(
    position.x + Math.sin(rotationY) * 0 + doorInfo.pos[0] * Math.cos(rotationY) - doorInfo.pos[2] * Math.sin(rotationY),
    0,
    position.z + doorInfo.pos[0] * Math.sin(rotationY) + doorInfo.pos[2] * Math.cos(rotationY)
  );
  // simple approximation for door world position (rotationY mostly 0/PI in this town)
  const doorLocal = new THREE.Vector3(doorInfo.pos[0], 0, doorInfo.pos[2]);
  doorLocal.applyAxisAngle(new THREE.Vector3(0, 1, 0), rotationY);
  group.userData.entrance = position.clone().add(doorLocal).add(
    doorLocal.clone().normalize().multiplyScalar(1.6)
  );

  return group;
}
