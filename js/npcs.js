import * as THREE from 'three';
import { NPC_TRADERS } from './items.js';

export function createNPC(npcData, position) {
  const group = new THREE.Group();
  group.userData.npc = { ...npcData, position };

  const bodyMat = new THREE.MeshStandardMaterial({ color: npcData.color, roughness: 0.8 });
  const skinMat = new THREE.MeshStandardMaterial({ color: 0xd4a574, roughness: 0.7 });
  const hoodMat = new THREE.MeshStandardMaterial({ color: 0x2d4a2d, roughness: 0.9 });

  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.4, 1.2, 8), bodyMat);
  torso.position.y = 1.2;
  torso.castShadow = true;
  group.add(torso);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 6), skinMat);
  head.position.y = 2.1;
  head.castShadow = true;
  group.add(head);

  const hood = new THREE.Mesh(new THREE.ConeGeometry(0.35, 0.5, 8), hoodMat);
  hood.position.y = 2.45;
  hood.rotation.x = 0.2;
  group.add(hood);

  const legL = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.1, 0.8, 6), bodyMat);
  legL.position.set(-0.15, 0.4, 0);
  group.add(legL);
  const legR = legL.clone();
  legR.position.x = 0.15;
  group.add(legR);

  const armL = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.07, 0.7, 6), bodyMat);
  armL.position.set(-0.45, 1.3, 0);
  armL.rotation.z = 0.3;
  group.add(armL);
  const armR = armL.clone();
  armR.position.x = 0.45;
  armR.rotation.z = -0.3;
  group.add(armR);

  const nameCanvas = document.createElement('canvas');
  nameCanvas.width = 256;
  nameCanvas.height = 48;
  const ctx = nameCanvas.getContext('2d');
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(0, 0, 256, 48);
  ctx.fillStyle = '#e8c84a';
  ctx.font = 'bold 20px serif';
  ctx.textAlign = 'center';
  ctx.fillText(npcData.name, 128, 32);
  const nameTex = new THREE.CanvasTexture(nameCanvas);
  const nameSprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: nameTex, transparent: true })
  );
  nameSprite.position.y = 3;
  nameSprite.scale.set(3, 0.6, 1);
  group.add(nameSprite);

  group.position.set(position.x, 0, position.z);
  group.userData.wanderTarget = { x: position.x, z: position.z };
  group.userData.wanderTimer = 0;
  group.userData.basePosition = { ...position };

  return group;
}

export function spawnNPCs(scene) {
  const npcs = [];
  const spawnPoints = [
    { x: -5, z: 5 }, { x: 5, z: -5 }, { x: -8, z: -3 },
    { x: 8, z: 3 }, { x: 0, z: -8 }, { x: 3, z: 8 },
    { x: -12, z: 0 }, { x: 12, z: 0 },
  ];

  spawnPoints.forEach((pos, i) => {
    const data = NPC_TRADERS[i % NPC_TRADERS.length];
    const npc = createNPC(data, pos);
    scene.add(npc);
    npcs.push(npc);
  });

  return npcs;
}

export function updateNPCs(npcs, delta) {
  for (const npc of npcs) {
    npc.userData.wanderTimer -= delta;
    if (npc.userData.wanderTimer <= 0) {
      const base = npc.userData.basePosition;
      npc.userData.wanderTarget = {
        x: base.x + (Math.random() - 0.5) * 8,
        z: base.z + (Math.random() - 0.5) * 8,
      };
      npc.userData.wanderTimer = 3 + Math.random() * 5;
    }

    const target = npc.userData.wanderTarget;
    const dx = target.x - npc.position.x;
    const dz = target.z - npc.position.z;
    const dist = Math.sqrt(dx * dx + dz * dz);

    if (dist > 0.3) {
      const speed = 1.5 * delta;
      npc.position.x += (dx / dist) * speed;
      npc.position.z += (dz / dist) * speed;
      npc.rotation.y = Math.atan2(dx, dz);
    }

    npc.position.y = Math.sin(Date.now() * 0.003 + npc.id) * 0.02;
  }
}

export function createMerchantNPC(shop, position) {
  const npc = createNPC(
    { name: shop.merchant, icon: shop.icon, color: shop.color },
    position
  );
  npc.userData.isMerchant = true;
  npc.userData.shop = shop;
  return npc;
}
