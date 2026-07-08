import * as THREE from 'three';

const SKIN = 0xd8a878;
const HOOD_GREEN = 0x2f4d2a;
const HOOD_GREEN_DARK = 0x1f3a1c;
const BELT = 0x4a2f18;
const BOOT = 0x3b2412;

function limb(radiusTop, radiusBottom, length, color, segments = 6) {
  const geo = new THREE.CylinderGeometry(radiusTop, radiusBottom, length, segments);
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.85 });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

/**
 * Builds a stylised low-poly Robin-Hood-style humanoid (Roblox-esque
 * proportions) used for the start-screen hero preview and town NPCs.
 * Returns { root, parts } where parts exposes bones for simple animation.
 */
export function createRobinHoodCharacter({ tunicColor = HOOD_GREEN, capeColor = HOOD_GREEN_DARK, hooded = true, accent = 0x7a1f1f } = {}) {
  const root = new THREE.Group();
  const parts = {};

  const tunicMat = new THREE.MeshStandardMaterial({ color: tunicColor, roughness: 0.75 });
  const skinMat = new THREE.MeshStandardMaterial({ color: SKIN, roughness: 0.7 });
  const beltMat = new THREE.MeshStandardMaterial({ color: BELT, roughness: 0.8 });
  const bootMat = new THREE.MeshStandardMaterial({ color: BOOT, roughness: 0.9 });
  const capeMat = new THREE.MeshStandardMaterial({ color: capeColor, roughness: 0.8, side: THREE.DoubleSide });
  const accentMat = new THREE.MeshStandardMaterial({ color: accent, roughness: 0.7 });

  const hips = new THREE.Group();
  hips.position.y = 0.95;
  root.add(hips);
  parts.hips = hips;

  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.26, 0.5, 4, 8), tunicMat);
  torso.position.y = 0.42;
  torso.castShadow = true;
  hips.add(torso);

  const belt = new THREE.Mesh(new THREE.TorusGeometry(0.27, 0.045, 6, 12), beltMat);
  belt.rotation.x = Math.PI / 2;
  belt.position.y = 0.16;
  hips.add(belt);

  const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.08, 0.04), accentMat);
  buckle.position.set(0, 0.16, 0.28);
  hips.add(buckle);

  const head = new THREE.Group();
  head.position.y = 0.86;
  torso.add(head);
  parts.head = head;

  const face = new THREE.Mesh(new THREE.SphereGeometry(0.19, 12, 10), skinMat);
  head.add(face);

  const hood = new THREE.Mesh(
    new THREE.SphereGeometry(0.205, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.62),
    tunicMat
  );
  hood.position.y = 0.02;
  head.add(hood);

  const hoodPoint = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.22, 8), tunicMat);
  hoodPoint.position.set(0, 0.12, -0.16);
  hoodPoint.rotation.x = -0.6;
  head.add(hoodPoint);

  if (hooded) {
    const brim = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.03, 6, 16, Math.PI * 1.5), tunicMat);
    brim.rotation.x = Math.PI / 2;
    brim.rotation.z = Math.PI * 0.15;
    brim.position.y = 0.03;
    head.add(brim);
  }

  const feather = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.24, 6), accentMat);
  feather.position.set(0.12, 0.18, -0.02);
  feather.rotation.z = 0.5;
  head.add(feather);

  const cape = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.7, 1, 4), capeMat);
  cape.position.set(0, 0.32, -0.24);
  cape.rotation.x = 0.18;
  torso.add(cape);
  parts.cape = cape;

  function makeArm(side) {
    const shoulder = new THREE.Group();
    shoulder.position.set(side * 0.32, 0.62, 0);
    torso.add(shoulder);
    const upperArm = limb(0.075, 0.065, 0.34, tunicColor);
    upperArm.position.y = -0.17;
    shoulder.add(upperArm);
    const elbow = new THREE.Group();
    elbow.position.y = -0.34;
    shoulder.add(elbow);
    const forearm = limb(0.06, 0.05, 0.32, SKIN);
    forearm.position.y = -0.16;
    elbow.add(forearm);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), skinMat);
    hand.position.y = -0.32;
    elbow.add(hand);
    return { shoulder, elbow, hand };
  }

  parts.leftArm = makeArm(1);
  parts.rightArm = makeArm(-1);

  function makeLeg(side) {
    const hip = new THREE.Group();
    hip.position.set(side * 0.13, -0.28, 0);
    hips.add(hip);
    const thigh = limb(0.09, 0.08, 0.36, 0x3d2a1a);
    thigh.position.y = -0.18;
    hip.add(thigh);
    const knee = new THREE.Group();
    knee.position.y = -0.36;
    hip.add(knee);
    const shin = limb(0.075, 0.06, 0.34, 0x3d2a1a);
    shin.position.y = -0.17;
    knee.add(shin);
    const boot = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.1, 0.22), bootMat);
    boot.position.set(0, -0.36, 0.04);
    knee.add(boot);
    return { hip, knee };
  }

  parts.leftLeg = makeLeg(1);
  parts.rightLeg = makeLeg(-1);

  const quiver = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.09, 0.42, 8), beltMat);
  quiver.position.set(-0.16, 0.55, -0.2);
  quiver.rotation.set(0.3, 0, -0.25);
  torso.add(quiver);
  for (let i = 0; i < 3; i++) {
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.3, 4), new THREE.MeshStandardMaterial({ color: 0xc9a86a }));
    shaft.position.set(-0.16 + (i - 1) * 0.03, 0.78, -0.2);
    shaft.rotation.set(0.3, 0, -0.25);
    torso.add(shaft);
  }

  root.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });

  return { root, parts };
}

export function createVillagerCharacter({ tunicColor = 0x8a7355, capeColor = 0x5c4c38 } = {}) {
  return createRobinHoodCharacter({ tunicColor, capeColor, hooded: false, accent: 0x6b5a3a });
}

export function createMerchantCharacter(color) {
  return createRobinHoodCharacter({ tunicColor: color, capeColor: 0x2b2b2b, hooded: false, accent: 0xb08a2a });
}
