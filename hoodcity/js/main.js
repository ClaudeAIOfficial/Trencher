import * as THREE from 'three';
import { World } from './world.js';
import { Player } from './player.js';
import { TradingSystem } from './trading.js';
import { ITEMS } from './items.js';

class GameUI {
  constructor() {
    this.loadingScreen = document.getElementById('loading-screen');
    this.startScreen = document.getElementById('start-screen');
    this.hud = document.getElementById('hud');
    this.loadingFill = document.getElementById('loading-fill');
    this.loadingText = document.getElementById('loading-text');
    this.interactionPrompt = document.getElementById('interaction-prompt');
    this.interactionText = document.getElementById('interaction-text');
    this.tradePanel = document.getElementById('trade-panel');
    this.inventoryPanel = document.getElementById('inventory-panel');
    this.notificationArea = document.getElementById('notification-area');
    this.locationName = document.getElementById('location-name');
  }

  setLoadingProgress(percent, text) {
    this.loadingFill.style.width = `${percent}%`;
    if (text) this.loadingText.textContent = text;
  }

  hideLoading() {
    this.loadingScreen.classList.add('hidden');
    this.startScreen.classList.remove('hidden');
  }

  startGame() {
    this.startScreen.classList.add('hidden');
    this.hud.classList.remove('hidden');
  }

  showInteraction(text) {
    this.interactionText.textContent = text;
    this.interactionPrompt.classList.remove('hidden');
  }

  hideInteraction() {
    this.interactionPrompt.classList.add('hidden');
  }

  showTradePanel(merchantName, title) {
    document.getElementById('merchant-name').textContent = merchantName;
    document.getElementById('trade-title').textContent = title;
    this.tradePanel.classList.remove('hidden');
  }

  hideTradePanel() {
    this.tradePanel.classList.add('hidden');
  }

  showInventoryPanel() {
    this.inventoryPanel.classList.remove('hidden');
  }

  hideInventoryPanel() {
    this.inventoryPanel.classList.add('hidden');
  }

  updateGold(amount) {
    document.getElementById('gold-amount').textContent = amount;
    const tradeGold = document.getElementById('trade-gold');
    if (tradeGold) tradeGold.textContent = amount;
  }

  updateHealth(amount) {
    document.getElementById('health-amount').textContent = amount;
  }

  updateQuickInventory(inventory) {
    const container = document.getElementById('quick-inventory');
    container.innerHTML = '';
    const slots = inventory.slice(0, 6);
    while (slots.length < 6) slots.push(null);

    slots.forEach((itemId) => {
      const slot = document.createElement('div');
      slot.className = 'quick-slot';
      if (itemId && ITEMS[itemId]) {
        slot.textContent = ITEMS[itemId].icon;
        slot.title = ITEMS[itemId].name;
      }
      container.appendChild(slot);
    });
  }

  setLocation(name) {
    this.locationName.textContent = name;
  }

  notify(message) {
    const el = document.createElement('div');
    el.className = 'notification';
    el.textContent = message;
    this.notificationArea.appendChild(el);
    setTimeout(() => el.remove(), 3000);
  }
}

class HoodCityGame {
  constructor() {
    this.ui = new GameUI();
    this.clock = new THREE.Clock();
    this.nearestInteractable = null;
    this.init();
  }

  async init() {
    this.ui.setLoadingProgress(10, 'Building Sherwood Forest...');

    this.renderer = new THREE.WebGLRenderer({
      canvas: document.getElementById('game-canvas'),
      antialias: true,
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;

    this.ui.setLoadingProgress(30, 'Raising medieval buildings...');

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 200);
    this.camera.position.set(0, 1.7, 15);

    this.world = new World(this.scene);
    this.world.build();

    this.ui.setLoadingProgress(60, 'Equipping your bow...');

    this.player = new Player(this.camera, document.body);
    this.scene.add(this.player.controls.getObject());

    this.trading = new TradingSystem(this.player, this.ui);

    this.ui.setLoadingProgress(90, 'Opening the gates...');
    await new Promise((r) => setTimeout(r, 500));
    this.ui.setLoadingProgress(100, 'Welcome to HOODCITY!');
    await new Promise((r) => setTimeout(r, 400));

    this.ui.hideLoading();
    this.setupEvents();
    this.trading.refreshUI();
    this.animate();
  }

  setupEvents() {
    document.getElementById('play-btn').addEventListener('click', () => {
      this.ui.startGame();
      this.player.lock();
      this.ui.notify('Welcome to HOODCITY! Visit shops to trade.');
    });

    document.getElementById('trade-close').addEventListener('click', () => {
      this.trading.close();
      this.player.lock();
    });

    document.getElementById('inventory-close').addEventListener('click', () => {
      this.ui.hideInventoryPanel();
      if (!this.trading.isOpen()) this.player.lock();
    });

    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });

    document.addEventListener('keydown', (e) => {
      if (e.code === 'KeyE' && this.nearestInteractable && !this.trading.isOpen()) {
        this.player.unlock();
        if (this.nearestInteractable.type === 'shop') {
          this.trading.openShop(this.nearestInteractable.data);
        } else if (this.nearestInteractable.type === 'traveler') {
          this.trading.openTravelerTrade(this.nearestInteractable.data);
        }
      }

      if (e.code === 'Tab') {
        e.preventDefault();
        if (this.ui.inventoryPanel.classList.contains('hidden')) {
          this.player.unlock();
          this.trading.openInventory();
        } else {
          this.ui.hideInventoryPanel();
          if (!this.trading.isOpen()) this.player.lock();
        }
      }

      if (e.code === 'Escape') {
        if (this.trading.isOpen()) {
          this.trading.close();
        }
        if (!this.ui.inventoryPanel.classList.contains('hidden')) {
          this.ui.hideInventoryPanel();
        }
      }
    });
  }

  updateLocation() {
    const pos = this.player.getPosition();
    const locations = [
      { name: 'Sherwood Market Square', x: 0, z: 0, r: 10 },
      { name: "Will Scarlet's Archery", x: -22, z: -18, r: 8 },
      { name: "Little John's Forge", x: 22, z: -18, r: 8 },
      { name: 'The Merry Outlaw Tavern', x: -22, z: 18, r: 8 },
      { name: 'Sherwood Market Stall', x: 22, z: 18, r: 8 },
      { name: "Robin's Treasury", x: 0, z: -30, r: 8 },
    ];

    let closest = locations[0];
    let minDist = Infinity;
    locations.forEach((loc) => {
      const dx = pos.x - loc.x;
      const dz = pos.z - loc.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist < minDist) {
        minDist = dist;
        closest = loc;
      }
    });

    if (minDist < closest.r) {
      this.ui.setLocation(closest.name);
    } else {
      this.ui.setLocation('Sherwood Outskirts');
    }
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    const delta = Math.min(this.clock.getDelta(), 0.05);

    this.player.update(delta);
    this.world.updateTravelers(delta);
    this.updateLocation();

    if (this.player.isLocked && !this.trading.isOpen()) {
      this.nearestInteractable = this.world.getNearestInteractable(this.player.getPosition());
      if (this.nearestInteractable) {
        const label = this.nearestInteractable.type === 'shop'
          ? `Trade with ${this.nearestInteractable.data.merchant.name}`
          : `Trade with ${this.nearestInteractable.data.name}`;
        this.ui.showInteraction(label);
      } else {
        this.ui.hideInteraction();
      }
    } else if (!this.nearestInteractable) {
      this.ui.hideInteraction();
    }

    this.renderer.render(this.scene, this.camera);
  }
}

new HoodCityGame();
