import * as THREE from 'three';

// First-person controller with AABB collision, gravity, jump, sprint, head-bob.
export class Player {
  constructor(camera, domElement, colliders) {
    this.camera = camera;
    this.dom = domElement;
    this.colliders = colliders;
    this.radius = 0.9;
    this.height = 1.7;
    this.eyeBase = this.height;
    this.pos = new THREE.Vector3(0, this.height, 24);
    this.vel = new THREE.Vector3();
    this.yaw = Math.PI;   // face toward -z (city center)
    this.pitch = 0;
    this.onGround = true;
    this.speed = 7;
    this.sprintMul = 1.7;
    this.keys = {};
    this.enabled = false;
    this.bobT = 0;
    this._euler = new THREE.Euler(0, 0, 0, 'YXZ');

    this._onKeyDown = (e) => {
      this.keys[e.code] = true;
      if (e.code === 'Space' && this.onGround && this.enabled) {
        this.vel.y = 7.2; this.onGround = false;
      }
    };
    this._onKeyUp = (e) => { this.keys[e.code] = false; };
    this._onMouseMove = (e) => {
      if (!this.enabled) return;
      const s = 0.0022;
      this.yaw -= e.movementX * s;
      this.pitch -= e.movementY * s;
      this.pitch = Math.max(-Math.PI / 2 + 0.05, Math.min(Math.PI / 2 - 0.05, this.pitch));
    };
    document.addEventListener('keydown', this._onKeyDown);
    document.addEventListener('keyup', this._onKeyUp);
    document.addEventListener('mousemove', this._onMouseMove);
  }

  setEnabled(v) { this.enabled = v; }

  collide(nx, nz) {
    // resolve against each AABB with player radius, axis separated by caller
    const r = this.radius;
    for (const c of this.colliders) {
      if (nx + r > c.minX && nx - r < c.maxX && nz + r > c.minZ && nz - r < c.maxZ) {
        return true;
      }
    }
    return false;
  }

  update(dt) {
    if (!this.enabled) { this.applyCamera(); return; }
    dt = Math.min(dt, 0.05);

    const forward = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    const right = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
    const move = new THREE.Vector3();
    if (this.keys['KeyW']) move.add(forward);
    if (this.keys['KeyS']) move.sub(forward);
    if (this.keys['KeyD']) move.add(right);
    if (this.keys['KeyA']) move.sub(right);

    const moving = move.lengthSq() > 0;
    if (moving) move.normalize();
    const sprint = this.keys['ShiftLeft'] || this.keys['ShiftRight'];
    const spd = this.speed * (sprint ? this.sprintMul : 1);

    // horizontal move with per-axis collision
    let nx = this.pos.x + move.x * spd * dt;
    if (!this.collide(nx, this.pos.z)) this.pos.x = nx;
    let nz = this.pos.z + move.z * spd * dt;
    if (!this.collide(this.pos.x, nz)) this.pos.z = nz;

    // gravity + jump
    this.vel.y -= 22 * dt;
    this.pos.y += this.vel.y * dt;
    if (this.pos.y <= this.height) { this.pos.y = this.height; this.vel.y = 0; this.onGround = true; }

    // keep inside outer wall bounds
    const B = 86;
    this.pos.x = Math.max(-B, Math.min(B, this.pos.x));
    this.pos.z = Math.max(-B, Math.min(B, this.pos.z));

    // head-bob
    if (moving && this.onGround) {
      this.bobT += dt * spd * 1.1;
    }
    this.applyCamera();
  }

  applyCamera() {
    const bob = Math.sin(this.bobT * 2) * 0.06;
    const bobX = Math.cos(this.bobT) * 0.04;
    this.camera.position.set(this.pos.x + bobX, this.pos.y + bob, this.pos.z);
    this._euler.set(this.pitch, this.yaw, 0);
    this.camera.quaternion.setFromEuler(this._euler);
  }
}
