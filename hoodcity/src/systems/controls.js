import * as THREE from 'three';

const EYE_HEIGHT = 1.7;
const WALK_SPEED = 4.6;
const SPRINT_SPEED = 7.6;
const JUMP_SPEED = 5.4;
const GRAVITY = 15.5;
const PLAYER_RADIUS = 0.4;
const WORLD_LIMIT = 44;

export class FirstPersonController {
  constructor(camera, domElement, collidables) {
    this.camera = camera;
    this.domElement = domElement;
    this.collidables = collidables;

    this.yawObject = new THREE.Object3D();
    this.pitchObject = new THREE.Object3D();
    this.pitchObject.add(camera);
    this.yawObject.add(this.pitchObject);
    this.yawObject.position.set(0, EYE_HEIGHT, 10);

    this.velocity = new THREE.Vector3();
    this.onGround = true;
    this.isLocked = false;
    this.enabled = false;

    this.stamina = 100;
    this.sprinting = false;

    this.keys = {};

    this._onMouseMove = this._onMouseMove.bind(this);
    this._onKeyDown = this._onKeyDown.bind(this);
    this._onKeyUp = this._onKeyUp.bind(this);
    this._onLockChange = this._onLockChange.bind(this);

    document.addEventListener('keydown', this._onKeyDown);
    document.addEventListener('keyup', this._onKeyUp);
    document.addEventListener('pointerlockchange', this._onLockChange);
  }

  get object() {
    return this.yawObject;
  }

  lock() {
    this.domElement.requestPointerLock();
  }

  unlock() {
    document.exitPointerLock();
  }

  _onLockChange() {
    this.isLocked = document.pointerLockElement === this.domElement;
    if (this.isLocked) {
      document.addEventListener('mousemove', this._onMouseMove);
    } else {
      document.removeEventListener('mousemove', this._onMouseMove);
    }
    if (this.onLockChange) this.onLockChange(this.isLocked);
  }

  _onMouseMove(e) {
    if (!this.enabled) return;
    const sensitivity = 0.0022;
    this.yawObject.rotation.y -= e.movementX * sensitivity;
    this.pitchObject.rotation.x -= e.movementY * sensitivity;
    this.pitchObject.rotation.x = Math.max(-Math.PI / 2.15, Math.min(Math.PI / 2.15, this.pitchObject.rotation.x));
  }

  _onKeyDown(e) {
    this.keys[e.code] = true;
  }

  _onKeyUp(e) {
    this.keys[e.code] = false;
  }

  _collideAt(x, z) {
    for (const box of this.collidables) {
      if (x > box.minX - PLAYER_RADIUS && x < box.maxX + PLAYER_RADIUS && z > box.minZ - PLAYER_RADIUS && z < box.maxZ + PLAYER_RADIUS) {
        return box;
      }
    }
    return null;
  }

  update(dt) {
    if (!this.enabled) return;

    const forward = (this.keys['KeyW'] || this.keys['ArrowUp'] ? 1 : 0) - (this.keys['KeyS'] || this.keys['ArrowDown'] ? 1 : 0);
    const strafe = (this.keys['KeyD'] || this.keys['ArrowRight'] ? 1 : 0) - (this.keys['KeyA'] || this.keys['ArrowLeft'] ? 1 : 0);

    const wantsSprint = !!this.keys['ShiftLeft'] || !!this.keys['ShiftRight'];
    this.sprinting = wantsSprint && this.stamina > 1 && forward > 0;
    if (this.sprinting) {
      this.stamina = Math.max(0, this.stamina - dt * 22);
    } else {
      this.stamina = Math.min(100, this.stamina + dt * 12);
    }

    const speed = this.sprinting ? SPRINT_SPEED : WALK_SPEED;

    const moveDir = new THREE.Vector3(strafe, 0, -forward);
    if (moveDir.lengthSq() > 0) {
      moveDir.normalize();
      moveDir.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.yawObject.rotation.y);
    }

    const dx = moveDir.x * speed * dt;
    const dz = moveDir.z * speed * dt;

    const pos = this.yawObject.position;
    const nextX = pos.x + dx;
    const nextZ = pos.z + dz;

    if (!this._collideAt(nextX, pos.z) && Math.abs(nextX) < WORLD_LIMIT) pos.x = nextX;
    if (!this._collideAt(pos.x, nextZ) && Math.abs(nextZ) < WORLD_LIMIT) pos.z = nextZ;

    if ((this.keys['Space']) && this.onGround) {
      this.velocity.y = JUMP_SPEED;
      this.onGround = false;
    }

    this.velocity.y -= GRAVITY * dt;
    pos.y += this.velocity.y * dt;

    if (pos.y <= EYE_HEIGHT) {
      pos.y = EYE_HEIGHT;
      this.velocity.y = 0;
      this.onGround = true;
    }

    this._bobPhase = (this._bobPhase || 0) + (moveDir.lengthSq() > 0 && this.onGround ? dt * (this.sprinting ? 14 : 9) : 0);
  }

  getBobOffset() {
    if (!this._bobPhase) return { x: 0, y: 0 };
    return {
      x: Math.sin(this._bobPhase) * 0.02,
      y: Math.abs(Math.sin(this._bobPhase * 2)) * 0.025,
    };
  }
}
