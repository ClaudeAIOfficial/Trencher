import * as THREE from 'three';
import { createMaterials } from './textures.js';
import {
  createBuilding, createShopSign, createNPC, createTree,
  createTorch, createWell, createFountain,
} from './buildings.js';
import { SHOPS, TRAVELERS } from './items.js';

export class World {
  constructor(scene) {
    this.scene = scene;
    this.materials = createMaterials();
    this.shopZones = [];
    this.npcs = [];
    this.travelers = [];
    this.interactables = [];
  }

  build() {
    this.createGround();
    this.createSky();
    this.createLighting();
    this.createTownSquare();
    this.createShops();
    this.createForest();
    this.createDecorations();
    this.createTravelers();
  }

  createGround() {
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(200, 200),
      this.materials.grass
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);

    const path = new THREE.Mesh(
      new THREE.PlaneGeometry(50, 50),
      this.materials.cobble
    );
    path.rotation.x = -Math.PI / 2;
    path.position.y = 0.02;
    path.receiveShadow = true;
    this.scene.add(path);

    const roads = [
      { w: 6, h: 60, x: 0, z: 0 },
      { w: 60, h: 6, x: 0, z: 0 },
    ];
    roads.forEach((r) => {
      const road = new THREE.Mesh(
        new THREE.PlaneGeometry(r.w, r.h),
        this.materials.cobble
      );
      road.rotation.x = -Math.PI / 2;
      road.position.set(r.x, 0.03, r.z);
      road.receiveShadow = true;
      this.scene.add(road);
    });
  }

  createSky() {
    this.scene.background = new THREE.Color(0x87aade);
    this.scene.fog = new THREE.Fog(0x87aade, 40, 120);

    const hemi = new THREE.HemisphereLight(0x87ceeb, 0x3d5c3d, 0.6);
    this.scene.add(hemi);
  }

  createLighting() {
    const sun = new THREE.DirectionalLight(0xfff4e0, 1.2);
    sun.position.set(30, 50, 20);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.near = 0.5;
    sun.shadow.camera.far = 120;
    sun.shadow.camera.left = -50;
    sun.shadow.camera.right = 50;
    sun.shadow.camera.top = 50;
    sun.shadow.camera.bottom = -50;
    this.scene.add(sun);

    const ambient = new THREE.AmbientLight(0x404060, 0.4);
    this.scene.add(ambient);
  }

  createTownSquare() {
    const fountain = createFountain(this.materials);
    fountain.position.set(0, 0, 0);
    this.scene.add(fountain);

    const well = createWell(this.materials);
    well.position.set(-8, 0, 8);
    this.scene.add(well);

    const benchPositions = [
      { x: 5, z: 5, rot: 0 }, { x: -5, z: -5, rot: Math.PI },
      { x: 5, z: -5, rot: Math.PI / 2 }, { x: -5, z: 5, rot: -Math.PI / 2 },
    ];
    benchPositions.forEach((b) => {
      const bench = this.createBench();
      bench.position.set(b.x, 0, b.z);
      bench.rotation.y = b.rot;
      this.scene.add(bench);
    });

    const cart = this.createCart();
    cart.position.set(6, 0, -6);
    cart.rotation.y = 0.5;
    this.scene.add(cart);
  }

  createBench() {
    const bench = new THREE.Group();
    const seat = new THREE.Mesh(
      new THREE.BoxGeometry(2, 0.15, 0.6),
      this.materials.wood
    );
    seat.position.y = 0.6;
    bench.add(seat);
    [-0.8, 0.8].forEach((x) => {
      const leg = new THREE.Mesh(
        new THREE.BoxGeometry(0.1, 0.6, 0.5),
        this.materials.woodDark
      );
      leg.position.set(x, 0.3, 0);
      bench.add(leg);
    });
    return bench;
  }

  createCart() {
    const cart = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(2, 0.8, 1.5),
      this.materials.wood
    );
    body.position.y = 0.8;
    cart.add(body);
    const wheelGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.15, 12);
    [[-0.8, 0.6], [0.8, 0.6], [-0.8, -0.6], [0.8, -0.6]].forEach(([x, z]) => {
      const wheel = new THREE.Mesh(wheelGeo, this.materials.woodDark);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(x, 0.4, z);
      cart.add(wheel);
    });
    return cart;
  }

  createShops() {
    const clothColors = ['green', 'red', 'brown', 'green', 'red'];

    SHOPS.forEach((shop, i) => {
      const building = createBuilding(shop.id, this.materials, {
        width: shop.id === 'treasury' ? 14 : 12,
        depth: shop.id === 'treasury' ? 12 : 10,
        height: shop.id === 'treasury' ? 10 : 8,
        wallColor: shop.color,
      });
      building.position.set(shop.position.x, 0, shop.position.z);
      building.rotation.y = shop.rotation;
      this.scene.add(building);

      const sign = createShopSign(shop.sign, this.materials);
      sign.position.set(shop.position.x, 10, shop.position.z + 6);
      sign.rotation.y = shop.rotation;
      this.scene.add(sign);

      const npc = createNPC(this.materials, clothColors[i]);
      npc.position.set(shop.npcPosition.x, 0, shop.npcPosition.z);
      npc.rotation.y = Math.atan2(-shop.npcPosition.x, -shop.npcPosition.z);
      this.scene.add(npc);

      const zone = new THREE.Object3D();
      zone.position.set(shop.npcPosition.x, 0, shop.npcPosition.z);
      this.shopZones.push({
        ...shop,
        position: shop.npcPosition,
        object: zone,
        npc,
      });

      const counter = new THREE.Mesh(
        new THREE.BoxGeometry(3, 1, 1.5),
        this.materials.wood
      );
      counter.position.set(shop.npcPosition.x, 0.5, shop.npcPosition.z + 1.5);
      this.scene.add(counter);
    });
  }

  createForest() {
    const treePositions = [];
    for (let i = 0; i < 80; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 35 + Math.random() * 40;
      const x = Math.cos(angle) * dist;
      const z = Math.sin(angle) * dist;
      if (Math.abs(x) < 28 && Math.abs(z) < 28) continue;
      treePositions.push({ x, z, scale: 0.8 + Math.random() * 0.6 });
    }

    treePositions.forEach((t) => {
      const tree = createTree(this.materials);
      tree.position.set(t.x, 0, t.z);
      tree.scale.setScalar(t.scale);
      this.scene.add(tree);
    });
  }

  createDecorations() {
    const torchPositions = [
      { x: -12, z: 0 }, { x: 12, z: 0 }, { x: 0, z: -12 }, { x: 0, z: 12 },
      { x: -18, z: -18 }, { x: 18, z: -18 }, { x: -18, z: 18 }, { x: 18, z: 18 },
      { x: -10, z: -10 }, { x: 10, z: 10 },
    ];

    torchPositions.forEach((t) => {
      const torch = createTorch(this.materials);
      torch.position.set(t.x, 0, t.z);
      this.scene.add(torch);

      const post = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.1, 3, 6),
        this.materials.woodDark
      );
      post.position.set(t.x, 1.5, t.z);
      this.scene.add(post);
    });

    const fencePositions = [];
    for (let x = -25; x <= 25; x += 3) {
      fencePositions.push({ x, z: 25 }, { x, z: -25 });
    }
    for (let z = -25; z <= 25; z += 3) {
      fencePositions.push({ x: 25, z }, { x: -25, z });
    }
    fencePositions.forEach((f) => {
      if (Math.abs(f.x) < 20 && Math.abs(f.z) < 20) return;
      const post = new THREE.Mesh(
        new THREE.BoxGeometry(0.15, 1.2, 0.15),
        this.materials.woodDark
      );
      post.position.set(f.x, 0.6, f.z);
      this.scene.add(post);
    });
  }

  createTravelers() {
    const clothColors = ['brown', 'green', 'red'];

    TRAVELERS.forEach((traveler, i) => {
      const npc = createNPC(this.materials, clothColors[i]);
      const start = traveler.path[0];
      npc.position.set(start.x, 0, start.z);
      this.scene.add(npc);

      this.travelers.push({
        ...traveler,
        npc,
        pathIndex: 0,
        t: 0,
        speed: 0.3 + Math.random() * 0.2,
      });

      this.interactables.push({
        type: 'traveler',
        data: traveler,
        npc,
        position: start,
      });
    });
  }

  updateTravelers(delta) {
    this.travelers.forEach((t) => {
      const current = t.path[t.pathIndex];
      const next = t.path[(t.pathIndex + 1) % t.path.length];
      t.t += delta * t.speed * 0.5;

      if (t.t >= 1) {
        t.t = 0;
        t.pathIndex = (t.pathIndex + 1) % t.path.length;
      }

      const x = current.x + (next.x - current.x) * t.t;
      const z = current.z + (next.z - current.z) * t.t;
      t.npc.position.set(x, 0, z);
      t.npc.rotation.y = Math.atan2(next.x - current.x, next.z - current.z);
      t.position = { x, z };
    });
  }

  getNearestInteractable(playerPos, maxDist = 4) {
    let nearest = null;
    let minDist = maxDist;

    this.shopZones.forEach((shop) => {
      const dx = playerPos.x - shop.position.x;
      const dz = playerPos.z - shop.position.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist < minDist) {
        minDist = dist;
        nearest = { type: 'shop', data: shop, dist };
      }
    });

    this.travelers.forEach((t) => {
      const dx = playerPos.x - t.npc.position.x;
      const dz = playerPos.z - t.npc.position.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist < minDist) {
        minDist = dist;
        nearest = { type: 'traveler', data: t, dist };
      }
    });

    return nearest;
  }
}
