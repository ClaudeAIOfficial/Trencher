import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { SHOPS } from './items.js';
import {
  createShopBuilding, createTownHall, createWell, createTree,
  createStreetLamp, createGround, createFence,
} from './buildings.js';
import { spawnNPCs, updateNPCs, createMerchantNPC } from './npcs.js';
import { TradingSystem } from './trading.js';
import { createFirstPersonArms, animateArms } from './player.js';

class HoodcityGame {
  constructor() {
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    this.playerArms = null;
    this.shops = [];
    this.npcs = [];
    this.merchants = [];
    this.interactables = [];
    this.trading = new TradingSystem();
    this.keys = {};
    this.velocity = new THREE.Vector3();
    this.isMoving = false;
    this.isSprinting = false;
    this.nearInteractable = null;
    this.gameTime = 0;
    this.isPlaying = false;
    this.panelOpen = false;
  }

  async init() {
    this.simulateLoading();
    this.setupScene();
    this.setupLights();
    this.buildWorld();
    this.setupControls();
    this.setupUI();
    this.setupMinimap();
    this.trading.onUpdate = () => this.refreshPanels();
    this.animate();
  }

  simulateLoading() {
    const fill = document.querySelector('.loading-fill');
    const text = document.querySelector('.loading-text');
    const messages = [
      'Forging arrows...', 'Building Sherwood...', 'Stocking shops...',
      'Gathering outlaws...', 'Polishing longbows...', 'Ready!',
    ];
    let progress = 0;
    const interval = setInterval(() => {
      progress += 20;
      fill.style.width = `${progress}%`;
      text.textContent = messages[Math.min(Math.floor(progress / 20), messages.length - 1)];
      if (progress >= 100) {
        clearInterval(interval);
        setTimeout(() => {
          document.getElementById('loading-screen').classList.add('fade-out');
          setTimeout(() => {
            document.getElementById('loading-screen').style.display = 'none';
          }, 800);
        }, 300);
      }
    }, 400);
  }

  setupScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87a8c4);
    this.scene.fog = new THREE.Fog(0x87a8c4, 40, 90);

    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 200);
    this.camera.position.set(0, 1.7, 15);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    document.body.appendChild(this.renderer.domElement);

    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  setupLights() {
    const ambient = new THREE.AmbientLight(0x6688aa, 0.5);
    this.scene.add(ambient);

    const sun = new THREE.DirectionalLight(0xffeedd, 1.2);
    sun.position.set(30, 50, 20);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 100;
    sun.shadow.camera.left = -40;
    sun.shadow.camera.right = 40;
    sun.shadow.camera.top = 40;
    sun.shadow.camera.bottom = -40;
    this.scene.add(sun);

    const hemi = new THREE.HemisphereLight(0x87ceeb, 0x2d5a27, 0.4);
    this.scene.add(hemi);
  }

  buildWorld() {
    createGround(this.scene);

    for (const shop of SHOPS) {
      const building = createShopBuilding(shop);
      this.scene.add(building);
      this.shops.push({ building, shop });

      const merchantPos = {
        x: shop.position.x + Math.sin(shop.rotation) * 3,
        z: shop.position.z + Math.cos(shop.rotation) * 3,
      };
      const merchant = createMerchantNPC(shop, merchantPos);
      this.scene.add(merchant);
      this.merchants.push(merchant);
      this.interactables.push({ mesh: building, shop, type: 'shop', radius: 6 });
    }

    this.scene.add(createTownHall());
    this.scene.add(createWell());

    const treePositions = [
      [-25, -20], [-30, -5], [-22, 15], [-28, 25],
      [25, -20], [30, -5], [22, 15], [28, 25],
      [-15, -28], [15, -28], [-35, 0], [35, 0],
      [-10, 22], [10, 22], [-20, 8], [20, 8],
    ];
    for (const [x, z] of treePositions) {
      this.scene.add(createTree(x, z, 0.8 + Math.random() * 0.6));
    }

    const lampPositions = [
      [-8, 0], [8, 0], [0, -8], [0, 8],
      [-12, -12], [12, -12], [-12, 12], [12, 12],
    ];
    for (const [x, z] of lampPositions) {
      this.scene.add(createStreetLamp(x, z));
    }

    this.scene.add(createFence(-15, -18, 8, 0));
    this.scene.add(createFence(15, -18, 8, 0));
    this.scene.add(createFence(-15, 18, 8, 0));
    this.scene.add(createFence(15, 18, 8, 0));

    this.npcs = spawnNPCs(this.scene);
    for (const npc of this.npcs) {
      this.interactables.push({ mesh: npc, npc: npc.userData.npc, type: 'npc', radius: 3 });
    }

    this.buildShopRadar();
    this.buildSkybox();
  }

  buildSkybox() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0, '#1a3a5c');
    grad.addColorStop(0.4, '#4a7ab0');
    grad.addColorStop(0.7, '#87a8c4');
    grad.addColorStop(1, '#a8c8a0');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 256);
    for (let i = 0; i < 30; i++) {
      ctx.fillStyle = `rgba(255,255,255,${0.3 + Math.random() * 0.5})`;
      ctx.beginPath();
      ctx.arc(Math.random() * 512, Math.random() * 100, 1 + Math.random() * 2, 0, Math.PI * 2);
      ctx.fill();
    }
    const tex = new THREE.CanvasTexture(canvas);
    this.scene.background = tex;
  }

  buildShopRadar() {
    const radar = document.getElementById('shop-radar');
    radar.innerHTML = '<div style="color:#c9a227;margin-bottom:0.3rem;font-family:Cinzel,serif">Nearby Shops</div>';
    for (const shop of SHOPS) {
      const entry = document.createElement('div');
      entry.className = 'shop-entry';
      entry.innerHTML = `<span class="dot" style="background:#${shop.color.toString(16).padStart(6, '0')}"></span>${shop.icon} ${shop.name.split(' ')[0]}`;
      radar.appendChild(entry);
    }
  }

  setupControls() {
    this.controls = new PointerLockControls(this.camera, document.body);
    this.playerArms = createFirstPersonArms(this.camera);

    document.getElementById('play-btn').addEventListener('click', () => {
      document.getElementById('start-screen').classList.add('hidden');
      document.getElementById('hud').classList.remove('hidden');
      this.controls.lock();
      this.isPlaying = true;
      this.trading.updateHUD();
    });

    this.controls.addEventListener('lock', () => { this.isPlaying = true; });
    this.controls.addEventListener('unlock', () => {});

    document.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;
      if (e.code === 'KeyE') this.handleInteract();
      if (e.code === 'Tab') {
        e.preventDefault();
        this.togglePanel('inventory-panel');
      }
      if (e.code === 'Escape') this.closeAllPanels();
    });
    document.addEventListener('keyup', (e) => { this.keys[e.code] = false; });

    document.querySelectorAll('.close-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.closeAllPanels();
        if (this.isPlaying) this.controls.lock();
      });
    });

    document.getElementById('confirm-trade-btn').addEventListener('click', () => {
      if (this.trading.confirmPlayerTrade()) {
        this.closeAllPanels();
        if (this.isPlaying) this.controls.lock();
      }
    });
  }

  setupUI() {
    this.trading.updateHUD();
  }

  setupMinimap() {
    this.minimapCanvas = document.getElementById('minimap-canvas');
    this.minimapCtx = this.minimapCanvas.getContext('2d');
  }

  updateMinimap() {
    const ctx = this.minimapCtx;
    const w = 140, h = 140;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(26,47,26,0.8)';
    ctx.fillRect(0, 0, w, h);

    const scale = 2;
    const cx = w / 2, cy = h / 2;
    const px = this.camera.position.x, pz = this.camera.position.z;

    ctx.fillStyle = '#4a4a4a';
    ctx.fillRect(cx - 15, cy - 15, 30, 30);

    for (const { shop } of this.shops) {
      const sx = cx + (shop.position.x - px) * scale;
      const sy = cy + (shop.position.z - pz) * scale;
      if (sx < 0 || sx > w || sy < 0 || sy > h) continue;
      ctx.fillStyle = `#${shop.color.toString(16).padStart(6, '0')}`;
      ctx.fillRect(sx - 3, sy - 3, 6, 6);
    }

    ctx.fillStyle = '#e8c84a';
    ctx.beginPath();
    ctx.arc(cx, cy, 4, 0, Math.PI * 2);
    ctx.fill();

    const angle = this.controls.getObject().rotation.y;
    ctx.strokeStyle = '#e8c84a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.sin(angle) * 8, cy + Math.cos(angle) * 8);
    ctx.stroke();
  }

  handleInteract() {
    if (this.panelOpen) return;
    if (!this.nearInteractable) return;

    if (this.nearInteractable.type === 'shop') {
      this.trading.renderShopTrade(this.nearInteractable.shop);
      this.openPanel('trade-panel');
    } else if (this.nearInteractable.type === 'npc') {
      const npcMesh = this.nearInteractable.mesh;
      this.trading.initPlayerTrade(npcMesh.userData.npc);
      this.trading.currentNPC = npcMesh.userData.npc;
      this.trading.renderPlayerTrade(npcMesh.userData.npc);
      this.openPanel('player-trade-panel');
    }
  }

  openPanel(id) {
    this.panelOpen = true;
    document.getElementById(id).classList.remove('hidden');
    this.controls.unlock();
  }

  togglePanel(id) {
    const panel = document.getElementById(id);
    if (panel.classList.contains('hidden')) {
      if (id === 'inventory-panel') this.trading.renderInventory('inventory-grid');
      this.openPanel(id);
    } else {
      this.closeAllPanels();
      if (this.isPlaying) this.controls.lock();
    }
  }

  closeAllPanels() {
    document.querySelectorAll('.panel').forEach(p => p.classList.add('hidden'));
    this.panelOpen = false;
  }

  refreshPanels() {
    if (!document.getElementById('trade-panel').classList.contains('hidden') && this.trading.currentShop) {
      this.trading.renderShopTrade(this.trading.currentShop);
    }
    if (!document.getElementById('player-trade-panel').classList.contains('hidden') && this.trading.currentNPC) {
      this.trading.renderPlayerTrade(this.trading.currentNPC);
    }
    if (!document.getElementById('inventory-panel').classList.contains('hidden')) {
      this.trading.renderInventory('inventory-grid');
    }
    this.trading.updateHUD();
  }

  checkInteractions() {
    const pos = this.camera.position;
    let closest = null;
    let closestDist = Infinity;

    for (const item of this.interactables) {
      const mesh = item.mesh;
      const dx = pos.x - mesh.position.x;
      const dz = pos.z - mesh.position.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist < item.radius && dist < closestDist) {
        closest = item;
        closestDist = dist;
      }
    }

    this.nearInteractable = closest;
    const prompt = document.getElementById('interaction-prompt');
    const promptText = document.getElementById('prompt-text');

    if (closest && !this.panelOpen) {
      prompt.classList.remove('hidden');
      if (closest.type === 'shop') {
        promptText.textContent = `Press E to trade at ${closest.shop.name}`;
      } else {
        promptText.textContent = `Press E to trade with ${closest.npc.name}`;
      }
    } else {
      prompt.classList.add('hidden');
    }
  }

  updateMovement(delta) {
    if (!this.controls.isLocked || this.panelOpen) return;

    const speed = this.keys['ShiftLeft'] || this.keys['ShiftRight'] ? 8 : 4.5;
    this.isSprinting = speed > 6;
    const direction = new THREE.Vector3();

    if (this.keys['KeyW']) direction.z -= 1;
    if (this.keys['KeyS']) direction.z += 1;
    if (this.keys['KeyA']) direction.x -= 1;
    if (this.keys['KeyD']) direction.x += 1;

    this.isMoving = direction.length() > 0;

    if (this.isMoving) {
      direction.normalize();
      const camDir = new THREE.Vector3();
      this.controls.getDirection(camDir);
      camDir.y = 0;
      camDir.normalize();
      const right = new THREE.Vector3().crossVectors(camDir, new THREE.Vector3(0, 1, 0));

      const moveX = (camDir.x * direction.z + right.x * direction.x) * speed * delta;
      const moveZ = (camDir.z * direction.z + right.z * direction.x) * speed * delta;

      this.controls.getObject().position.x += moveX;
      this.controls.getObject().position.z += moveZ;
    }

    this.controls.getObject().position.y = 1.7;

    const bounds = 28;
    this.controls.getObject().position.x = THREE.MathUtils.clamp(this.controls.getObject().position.x, -bounds, bounds);
    this.controls.getObject().position.z = THREE.MathUtils.clamp(this.controls.getObject().position.z, -bounds, bounds);
  }

  animate() {
    requestAnimationFrame(() => this.animate());
    const delta = Math.min(0.05, this.clock ? this.clock.getDelta() : 0.016);
    if (!this.clock) this.clock = new THREE.Clock();

    this.gameTime += delta;
    this.updateMovement(delta);
    updateNPCs(this.npcs, delta);
    this.checkInteractions();
    animateArms(this.playerArms, this.gameTime, this.isMoving, this.isSprinting);
    this.updateMinimap();

    this.renderer.render(this.scene, this.camera);
  }
}

const game = new HoodcityGame();
game.init();
