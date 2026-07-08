import * as THREE from 'three';

export function createFirstPersonArms(camera) {
  const group = new THREE.Group();
  group.name = 'playerArms';

  const skinMat = new THREE.MeshStandardMaterial({ color: 0xc49a6c, roughness: 0.7 });
  const gloveMat = new THREE.MeshStandardMaterial({ color: 0x2d4a2d, roughness: 0.85 });
  const leatherMat = new THREE.MeshStandardMaterial({ color: 0x5c3d2e, roughness: 0.8 });
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x4a3020, roughness: 0.9 });
  const metalMat = new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.5, roughness: 0.4 });

  const leftArm = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.35, 0.12), gloveMat);
  leftArm.position.set(-0.25, -0.2, -0.4);
  leftArm.rotation.x = -0.3;
  group.add(leftArm);

  const leftForearm = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.3, 0.1), skinMat);
  leftForearm.position.set(-0.25, -0.45, -0.35);
  leftForearm.rotation.x = -0.5;
  group.add(leftForearm);

  const bowGroup = new THREE.Group();
  const bowCurve = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.025, 8, 16, Math.PI), woodMat);
  bowCurve.rotation.y = Math.PI / 2;
  bowCurve.rotation.z = Math.PI / 2;
  bowGroup.add(bowCurve);

  const bowString = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.65, 0.01), new THREE.MeshStandardMaterial({ color: 0xdddddd }));
  bowString.position.x = 0.35;
  bowGroup.add(bowString);

  const arrow = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.5), woodMat);
  arrow.rotation.z = Math.PI / 2;
  arrow.position.set(0.1, 0, 0);
  bowGroup.add(arrow);
  const arrowHead = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.06, 4), metalMat);
  arrowHead.rotation.z = -Math.PI / 2;
  arrowHead.position.set(0.35, 0, 0);
  bowGroup.add(arrowHead);

  bowGroup.position.set(0.15, -0.15, -0.5);
  bowGroup.rotation.y = -0.2;
  group.add(bowGroup);

  const rightArm = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.35, 0.12), gloveMat);
  rightArm.position.set(0.3, -0.25, -0.35);
  rightArm.rotation.x = -0.8;
  rightArm.rotation.z = -0.2;
  group.add(rightArm);

  const rightForearm = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.3, 0.1), skinMat);
  rightForearm.position.set(0.35, -0.5, -0.2);
  rightForearm.rotation.x = -1.2;
  group.add(rightForearm);

  const quiver = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.06, 0.5, 6), leatherMat);
  quiver.position.set(-0.35, 0.1, 0.1);
  quiver.rotation.z = 0.3;
  group.add(quiver);

  for (let i = 0; i < 3; i++) {
    const qArrow = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.35), woodMat);
    qArrow.position.set(-0.35 + i * 0.03, 0.1 + i * 0.05, 0.15);
    qArrow.rotation.x = 0.2;
    group.add(qArrow);
  }

  const hoodRim = new THREE.Mesh(
    new THREE.TorusGeometry(0.5, 0.04, 8, 16, Math.PI),
    new THREE.MeshStandardMaterial({ color: 0x1a2f1a, roughness: 0.9, transparent: true, opacity: 0.4 })
  );
  hoodRim.position.set(0, 0.15, -0.1);
  hoodRim.rotation.x = -0.3;
  group.add(hoodRim);

  camera.add(group);
  return group;
}

export function animateArms(arms, time, isMoving, isSprinting) {
  if (!arms) return;
  const bob = isMoving ? Math.sin(time * (isSprinting ? 12 : 8)) * 0.02 : 0;
  arms.position.y = bob;
  arms.rotation.x = isMoving ? Math.sin(time * (isSprinting ? 12 : 8)) * 0.03 : 0;

  const bow = arms.children.find(c => c.type === 'Group');
  if (bow) {
    bow.rotation.z = Math.sin(time * 2) * 0.02;
  }
}
