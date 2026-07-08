import * as THREE from 'three';
import { economy } from './economy.js';

const ARROW_GRAVITY = 9;
const MAX_DRAW_TIME = 0.85;
const MIN_ARROW_SPEED = 14;
const MAX_ARROW_SPEED = 34;
const TARGET_COOLDOWN = 1.2;

function closestDistanceToSegment(segStart, segEnd, point) {
  const seg = new THREE.Vector3().subVectors(segEnd, segStart);
  const lenSq = seg.lengthSq();
  if (lenSq < 1e-8) return segStart.distanceTo(point);
  const t = Math.max(0, Math.min(1, new THREE.Vector3().subVectors(point, segStart).dot(seg) / lenSq));
  const closest = segStart.clone().addScaledVector(seg, t);
  return closest.distanceTo(point);
}

function buildBow() {
  const group = new THREE.Group();
  const limbMat = new THREE.MeshStandardMaterial({ color: 0x4a2f18, roughness: 0.7 });
  const gripMat = new THREE.MeshStandardMaterial({ color: 0x2e1c0f, roughness: 0.8 });

  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0.42, -0.05),
    new THREE.Vector3(0.06, 0.22, 0.02),
    new THREE.Vector3(0.02, 0, 0),
    new THREE.Vector3(0.06, -0.22, 0.02),
    new THREE.Vector3(0, -0.42, -0.05),
  ]);
  const bowGeo = new THREE.TubeGeometry(curve, 24, 0.018, 6, false);
  const bow = new THREE.Mesh(bowGeo, limbMat);
  bow.castShadow = false;
  group.add(bow);

  const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.16, 8), gripMat);
  group.add(grip);

  const stringMat = new THREE.LineBasicMaterial({ color: 0xe8e0c8 });
  const stringGeo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0.42, -0.05),
    new THREE.Vector3(0, 0, 0.16),
    new THREE.Vector3(0, -0.42, -0.05),
  ]);
  const string = new THREE.Line(stringGeo, stringMat);
  group.add(string);

  return { group, string, curve };
}

function buildArrow() {
  const group = new THREE.Group();
  const shaftMat = new THREE.MeshStandardMaterial({ color: 0xc9a86a, roughness: 0.7 });
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.6, 6), shaftMat);
  shaft.rotation.x = Math.PI / 2;
  group.add(shaft);

  const tipMat = new THREE.MeshStandardMaterial({ color: 0x9a9a9a, metalness: 0.6, roughness: 0.35 });
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.09, 6), tipMat);
  tip.rotation.x = -Math.PI / 2;
  tip.position.z = -0.34;
  group.add(tip);

  const featherMat = new THREE.MeshStandardMaterial({ color: 0x7a1f1f, side: THREE.DoubleSide });
  for (let i = 0; i < 3; i++) {
    const feather = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 0.14), featherMat);
    feather.position.z = 0.26;
    feather.rotation.z = (i * Math.PI * 2) / 3;
    feather.rotation.y = Math.PI / 2;
    group.add(feather);
  }
  group.castShadow = true;
  return group;
}

export class CombatSystem {
  constructor(scene, camera, controller, { onHitTarget, onNoArrows } = {}) {
    this.scene = scene;
    this.camera = camera;
    this.controller = controller;
    this.onHitTarget = onHitTarget;
    this.onNoArrows = onNoArrows;

    this.viewmodel = new THREE.Group();
    this.viewmodel.position.set(0.33, -0.32, -0.62);
    this.viewmodel.scale.setScalar(0.62);
    this.camera.add(this.viewmodel);

    const { group: bowGroup, string } = buildBow();
    this.bowGroup = bowGroup;
    this.string = string;
    this.viewmodel.add(bowGroup);

    this.drawing = false;
    this.drawT = 0;
    this.equipped = true;

    this.activeArrows = [];
    this.targets = [];
    this._t = 0;
  }

  setTargets(targets) {
    this.targets = targets;
  }

  startDraw() {
    if (!this.equipped) return;
    if (economy.ownedCount('arrows') <= 0) {
      if (this.onNoArrows) this.onNoArrows();
      return;
    }
    this.drawing = true;
    this.drawT = 0;
  }

  releaseDraw() {
    if (!this.drawing) return;
    this.drawing = false;
    const power = Math.min(1, this.drawT / MAX_DRAW_TIME);
    this.drawT = 0;
    if (power < 0.08) return;
    this._shoot(power);
  }

  _shoot(power) {
    if (!economy.removeItem('arrows', 1)) {
      if (this.onNoArrows) this.onNoArrows();
      return;
    }
    const arrow = buildArrow();
    const dir = new THREE.Vector3();
    this.camera.getWorldDirection(dir);
    const spawnPos = new THREE.Vector3();
    this.viewmodel.getWorldPosition(spawnPos);
    spawnPos.addScaledVector(dir, 0.5);
    arrow.position.copy(spawnPos);
    arrow.quaternion.copy(this.camera.getWorldQuaternion(new THREE.Quaternion()));
    this.scene.add(arrow);

    const speed = MIN_ARROW_SPEED + (MAX_ARROW_SPEED - MIN_ARROW_SPEED) * power;
    this.activeArrows.push({
      mesh: arrow,
      velocity: dir.clone().multiplyScalar(speed),
      life: 0,
      stuck: false,
    });
  }

  update(dt) {
    this._t += dt;

    if (this.drawing) {
      this.drawT = Math.min(MAX_DRAW_TIME, this.drawT + dt);
    }
    const power = this.drawing ? this.drawT / MAX_DRAW_TIME : 0;
    const pull = -0.16 * power;
    this.string.geometry.setFromPoints([
      new THREE.Vector3(0, 0.42, -0.05),
      new THREE.Vector3(0, 0, 0.16 + pull),
      new THREE.Vector3(0, -0.42, -0.05),
    ]);

    const sway = Math.sin(this._t * 1.4) * 0.004;
    this.viewmodel.position.x = 0.33 + sway;
    this.viewmodel.position.y = -0.32 + Math.cos(this._t * 1.7) * 0.004 - power * 0.05;
    this.viewmodel.rotation.x = power * 0.12;
    this.viewmodel.rotation.z = -power * 0.05;

    for (let i = this.activeArrows.length - 1; i >= 0; i--) {
      const a = this.activeArrows[i];
      a.life += dt;
      if (!a.stuck) {
        a.velocity.y -= ARROW_GRAVITY * dt;
        const prevPos = a.mesh.position.clone();
        a.mesh.position.addScaledVector(a.velocity, dt);
        const dir = a.velocity.clone().normalize();
        const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir.clone().negate());
        a.mesh.quaternion.copy(quat);

        let hit = false;
        for (const target of this.targets) {
          const worldCenter = target.mesh.position.clone().add(target.mesh.userData.hitCenter || new THREE.Vector3(0, 1.6, 0));
          const radius = target.mesh.userData.hitRadius || 0.6;
          const dist = closestDistanceToSegment(prevPos, a.mesh.position, worldCenter);
          if (dist < radius) {
            const now = performance.now() / 1000;
            if (now - target.lastHit > TARGET_COOLDOWN) {
              target.lastHit = now;
              if (this.onHitTarget) this.onHitTarget(target);
            }
            hit = true;
            break;
          }
        }

        if (a.mesh.position.y <= 0.02) {
          a.mesh.position.y = 0.02;
          a.stuck = true;
        }
        if (hit) a.stuck = true;
        if (prevPos.distanceTo(a.mesh.position) < 0.0001) a.stuck = true;
      }

      if (a.life > 8) {
        this.scene.remove(a.mesh);
        this.activeArrows.splice(i, 1);
      }
    }
  }
}
