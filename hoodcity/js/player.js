import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';

export class Player {
  constructor(camera, domElement) {
    this.camera = camera;
    this.velocity = new THREE.Vector3();
    this.direction = new THREE.Vector3();
    this.moveForward = false;
    this.moveBackward = false;
    this.moveLeft = false;
    this.moveRight = false;
    this.canJump = true;
    this.isSprinting = false;
    this.speed = 8;
    this.sprintMultiplier = 1.8;
    this.jumpForce = 8;
    this.gravity = 20;
    this.height = 1.7;
    this.health = 100;
    this.gold = 100;
    this.inventory = ['dagger', 'arrows'];
    this.isLocked = false;
    this.bobTime = 0;

    this.controls = new PointerLockControls(camera, domElement);
    this.setupHands();
    this.setupInput(domElement);
  }

  setupHands() {
    this.handsGroup = new THREE.Group();
    this.camera.add(this.handsGroup);

    const gloveMat = new THREE.MeshStandardMaterial({ color: 0x3d2818, roughness: 0.9 });
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xd4a574, roughness: 0.8 });
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x5c3d28, roughness: 0.85 });
    const leatherMat = new THREE.MeshStandardMaterial({ color: 0x2d4a2d, roughness: 0.9 });
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xd4a843, metalness: 0.6, roughness: 0.3 });

    // Left hand (gloved)
    const leftHand = new THREE.Group();
    const leftPalm = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.15, 0.08), gloveMat);
    leftPalm.position.set(-0.25, -0.2, -0.4);
    leftHand.add(leftPalm);
    const leftFingers = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.08, 0.06), gloveMat);
    leftFingers.position.set(-0.25, -0.12, -0.38);
    leftHand.add(leftFingers);
    this.handsGroup.add(leftHand);

    // Bow
    const bow = new THREE.Group();
    const bowCurve = new THREE.Mesh(
      new THREE.TorusGeometry(0.25, 0.02, 8, 16, Math.PI * 1.2),
      woodMat
    );
    bowCurve.rotation.z = Math.PI / 2;
    bowCurve.rotation.y = Math.PI * 0.1;
    bow.add(bowCurve);

    const bowString = new THREE.Mesh(
      new THREE.BoxGeometry(0.01, 0.48, 0.01),
      new THREE.MeshStandardMaterial({ color: 0xeeeecc })
    );
    bowString.position.x = 0.02;
    bow.add(bowString);

    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.1, 0.04), leatherMat);
    bow.add(grip);

    bow.position.set(0.15, -0.15, -0.5);
    bow.rotation.z = -0.1;
    this.handsGroup.add(bow);

    // Right hand drawing bow
    const rightHand = new THREE.Group();
    const rightPalm = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.12, 0.08), gloveMat);
    rightPalm.position.set(0.2, -0.18, -0.42);
    rightHand.add(rightPalm);
    this.handsGroup.add(rightHand);

    // Hood cowl visible at top of view
    const hood = new THREE.Mesh(
      new THREE.SphereGeometry(0.6, 8, 8, 0, Math.PI * 2, 0, Math.PI / 2),
      leatherMat
    );
    hood.position.set(0, 0.3, 0.2);
    hood.scale.set(1.2, 0.5, 1);
    this.handsGroup.add(hood);

    // Quiver hint on right shoulder
    const quiver = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.3, 6), leatherMat);
    quiver.position.set(0.35, 0.1, 0.1);
    quiver.rotation.z = 0.3;
    this.handsGroup.add(quiver);

    const arrow = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.25, 4), woodMat);
    arrow.position.set(0.35, 0.15, 0.1);
    arrow.rotation.z = 0.3;
    this.handsGroup.add(arrow);
  }

  setupInput(domElement) {
    const onKeyDown = (e) => {
      switch (e.code) {
        case 'KeyW': case 'ArrowUp': this.moveForward = true; break;
        case 'KeyS': case 'ArrowDown': this.moveBackward = true; break;
        case 'KeyA': case 'ArrowLeft': this.moveLeft = true; break;
        case 'KeyD': case 'ArrowRight': this.moveRight = true; break;
        case 'ShiftLeft': case 'ShiftRight': this.isSprinting = true; break;
        case 'Space':
          if (this.canJump) {
            this.velocity.y = this.jumpForce;
            this.canJump = false;
          }
          break;
      }
    };

    const onKeyUp = (e) => {
      switch (e.code) {
        case 'KeyW': case 'ArrowUp': this.moveForward = false; break;
        case 'KeyS': case 'ArrowDown': this.moveBackward = false; break;
        case 'KeyA': case 'ArrowLeft': this.moveLeft = false; break;
        case 'KeyD': case 'ArrowRight': this.moveRight = false; break;
        case 'ShiftLeft': case 'ShiftRight': this.isSprinting = false; break;
      }
    };

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);

    this.controls.addEventListener('lock', () => { this.isLocked = true; });
    this.controls.addEventListener('unlock', () => { this.isLocked = false; });
  }

  lock() {
    this.controls.lock();
  }

  unlock() {
    this.controls.unlock();
  }

  getPosition() {
    return this.controls.getObject().position;
  }

  update(delta) {
    if (!this.isLocked) return;

    const speed = this.isSprinting ? this.speed * this.sprintMultiplier : this.speed;

    this.velocity.x -= this.velocity.x * 10.0 * delta;
    this.velocity.z -= this.velocity.z * 10.0 * delta;
    this.velocity.y -= this.gravity * delta;

    this.direction.z = Number(this.moveForward) - Number(this.moveBackward);
    this.direction.x = Number(this.moveRight) - Number(this.moveLeft);
    this.direction.normalize();

    if (this.moveForward || this.moveBackward) {
      this.velocity.z -= this.direction.z * speed * delta * 10;
    }
    if (this.moveLeft || this.moveRight) {
      this.velocity.x -= this.direction.x * speed * delta * 10;
    }

    this.controls.moveRight(-this.velocity.x * delta);
    this.controls.moveForward(-this.velocity.z * delta);

    const pos = this.getPosition();
    pos.y += this.velocity.y * delta;

    if (pos.y < this.height) {
      this.velocity.y = 0;
      pos.y = this.height;
      this.canJump = true;
    }

    const boundary = 45;
    pos.x = Math.max(-boundary, Math.min(boundary, pos.x));
    pos.z = Math.max(-boundary, Math.min(boundary, pos.z));

    const isMoving = this.moveForward || this.moveBackward || this.moveLeft || this.moveRight;
    if (isMoving) {
      this.bobTime += delta * (this.isSprinting ? 12 : 8);
      this.handsGroup.position.y = Math.sin(this.bobTime) * 0.02;
      this.handsGroup.position.x = Math.cos(this.bobTime * 0.5) * 0.01;
    } else {
      this.bobTime = 0;
      this.handsGroup.position.y *= 0.9;
      this.handsGroup.position.x *= 0.9;
    }

    this.handsGroup.rotation.x = Math.sin(this.bobTime * 0.5) * 0.02;
  }

  addItem(itemId) {
    this.inventory.push(itemId);
  }

  removeItem(itemId) {
    const idx = this.inventory.indexOf(itemId);
    if (idx !== -1) {
      this.inventory.splice(idx, 1);
      return true;
    }
    return false;
  }

  hasItem(itemId) {
    return this.inventory.includes(itemId);
  }
}
