import * as THREE from 'three';
import './style.css';
import { buildWorld } from './scene/world.js';
import { FirstPersonController } from './systems/controls.js';
import { CombatSystem } from './systems/combat.js';
import { economy } from './systems/economy.js';
import { updateHUD, showPrompt, hidePrompt, showToast, showQuestToast } from './ui/hud.js';
import { openShop, closeShop, isShopOpen } from './ui/shopUI.js';
import { initHeroPreview } from './ui/startScreen.js';
import { SHOPS } from './data/shops.js';
import { skyGradientTexture } from './scene/textures.js';

const canvas = document.getElementById('scene-canvas');
const startScreen = document.getElementById('start-screen');
const pauseScreen = document.getElementById('pause-screen');
const hud = document.getElementById('hud');
const playBtn = document.getElementById('play-btn');

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();

const skyDome = new THREE.Mesh(
  new THREE.SphereGeometry(180, 24, 16),
  new THREE.MeshBasicMaterial({ side: THREE.BackSide, map: skyGradientTexture(), fog: false, depthWrite: false })
);
skyDome.renderOrder = -1;
scene.add(skyDome);

const camera = new THREE.PerspectiveCamera(72, window.innerWidth / window.innerHeight, 0.05, 250);

const hemi = new THREE.HemisphereLight(0xbfd7ea, 0x33301f, 0.85);
scene.add(hemi);

const sun = new THREE.DirectionalLight(0xfff0d2, 1.55);
sun.position.set(30, 42, 18);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -55;
sun.shadow.camera.right = 55;
sun.shadow.camera.top = 55;
sun.shadow.camera.bottom = -55;
sun.shadow.camera.near = 1;
sun.shadow.camera.far = 140;
sun.shadow.bias = -0.0015;
scene.add(sun);
scene.add(sun.target);

const ambient = new THREE.AmbientLight(0xffffff, 0.22);
scene.add(ambient);

const { collidables, interactables, targets } = buildWorld(scene);

for (const shop of SHOPS) {
  collidables.push({
    minX: shop.position.x - 0.6,
    maxX: shop.position.x + 0.6,
    minZ: shop.position.z - 0.6,
    maxZ: shop.position.z + 0.6,
  });
}

const controller = new FirstPersonController(camera, renderer.domElement, collidables);
scene.add(controller.object);

let health = 100;
let currentShopOpen = null;

const combat = new CombatSystem(scene, camera, controller, {
  onHitTarget: () => {
    economy.addGold(4);
    economy.addReputation(1);
    showToast('Bullseye! +4 gold');
  },
  onNoArrows: () => {
    showToast("You're out of arrows! Visit the Fletcher.");
  },
});
combat.setTargets(targets);

function nearestInteractable() {
  const p = controller.object.position;
  let best = null;
  let bestDist = Infinity;
  for (const it of interactables) {
    const dx = p.x - it.position.x;
    const dz = p.z - it.position.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (dist < it.radius && dist < bestDist) {
      bestDist = dist;
      best = it;
    }
  }
  return best;
}

const wagonState = { lastRobbed: -9999 };
const villagerCooldowns = {};
const LOOT_TABLE = ['goldbar', 'jewels', 'chalice'];

function handleInteract(target) {
  if (!target) return;
  if (target.type === 'shop') {
    const shop = SHOPS.find((s) => s.id === target.shopId);
    if (!shop) return;
    currentShopOpen = shop;
    controller.unlock();
    openShop(shop, () => {
      currentShopOpen = null;
      controller.lock();
    });
  } else if (target.type === 'villager') {
    const now = performance.now() / 1000;
    if (villagerCooldowns[target.id] && now - villagerCooldowns[target.id] < 2) return;
    villagerCooldowns[target.id] = now;
    if (economy.spendGold(10)) {
      economy.addReputation(6);
      showQuestToast(`${target.name}: "${target.line}" (+6 reputation)`);
    } else {
      showToast('You need at least 10 gold to give charity.');
    }
  } else if (target.type === 'wagon') {
    const now = performance.now() / 1000;
    if (now - wagonState.lastRobbed < 60) {
      const remaining = Math.ceil(60 - (now - wagonState.lastRobbed));
      showToast(`The chest is empty. Guards refill it in ${remaining}s.`);
      return;
    }
    wagonState.lastRobbed = now;
    const loot = LOOT_TABLE[Math.floor(Math.random() * LOOT_TABLE.length)];
    economy.addItem(loot, 1);
    economy.addReputation(4);
    showQuestToast("You rob the Sheriff's tax chest! Sell the loot at the Trading Post.");
  }
}

document.addEventListener('keydown', (e) => {
  if (e.code === 'KeyE' && controller.enabled) {
    handleInteract(nearestInteractable());
  }
  if (e.code === 'Escape' && controller.isLocked) {
    controller.unlock();
  }
});

renderer.domElement.addEventListener('mousedown', (e) => {
  if (e.button === 0 && controller.enabled && controller.isLocked && !isShopOpen()) {
    combat.startDraw();
  }
});
window.addEventListener('mouseup', (e) => {
  if (e.button === 0) combat.releaseDraw();
});

controller.onLockChange = (locked) => {
  if (!controller.enabled) return;
  if (!locked && !isShopOpen()) {
    pauseScreen.classList.remove('hidden');
  } else {
    pauseScreen.classList.add('hidden');
  }
};

pauseScreen.addEventListener('click', () => {
  controller.lock();
});

window.addEventListener('hoodcity:rest', () => {
  health = 100;
  controller.stamina = 100;
});

let heroPreview = null;
playBtn.addEventListener('click', () => {
  startScreen.classList.add('hidden');
  hud.classList.remove('hidden');
  controller.enabled = true;
  if (heroPreview) {
    heroPreview.dispose();
    heroPreview = null;
  }
  controller.lock();
});

heroPreview = initHeroPreview();

function resize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

const clock = new THREE.Clock();

if (import.meta.env.DEV) {
  window.__hoodcity = { controller, economy, camera, scene, combat, targets };
}

function animateInteractables(t) {
  for (const it of interactables) {
    if (!it.root) continue;
    const phase = t * 1.6 + it.idleT;
    it.root.position.y = Math.sin(phase) * 0.02;
    it.root.rotation.y += Math.sin(phase * 0.3) * 0.0002;
  }
}

function tick() {
  requestAnimationFrame(tick);
  const dt = Math.min(0.05, clock.getDelta());
  const t = clock.elapsedTime;

  skyDome.position.copy(controller.object.position);

  if (controller.enabled) {
    controller.update(dt);
    combat.update(dt);
    animateInteractables(t);

    const bob = controller.getBobOffset();
    camera.position.x = bob.x;
    camera.position.y = bob.y;

    sun.target.position.copy(controller.object.position);
    sun.position.set(controller.object.position.x + 30, 42, controller.object.position.z + 18);

    if (!isShopOpen()) {
      const nearest = nearestInteractable();
      if (nearest) showPrompt(nearest.prompt);
      else hidePrompt();
    } else {
      hidePrompt();
    }

    updateHUD({ health, stamina: controller.stamina, yaw: controller.object.rotation.y });
  }

  renderer.render(scene, camera);
}

tick();
