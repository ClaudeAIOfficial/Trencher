import * as THREE from 'three';
import { buildCity } from './city.js';
import { Player } from './player.js';
import * as TX from './textures.js';
import * as Trade from './trade.js';

// ---------- Renderer / scene ----------
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xbcd0dd, 60, 200);

const camera = new THREE.PerspectiveCamera(72, window.innerWidth / window.innerHeight, 0.05, 600);

// ---------- Sky ----------
const sky = new THREE.Mesh(
  new THREE.SphereGeometry(300, 32, 16),
  new THREE.MeshBasicMaterial({ map: TX.skyTexture(), side: THREE.BackSide, fog: false })
);
scene.add(sky);

// clouds
const cloudMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85, fog: false });
const clouds = new THREE.Group();
for (let i = 0; i < 14; i++) {
  const c = new THREE.Group();
  const puffs = 3 + Math.floor(Math.random() * 3);
  for (let p = 0; p < puffs; p++) {
    const s = new THREE.Mesh(new THREE.SphereGeometry(6 + Math.random() * 6, 8, 6), cloudMat);
    s.position.set(p * 8 - puffs * 4, Math.random() * 3, Math.random() * 6);
    s.scale.y = 0.6; c.add(s);
  }
  const ang = Math.random() * Math.PI * 2, rad = 120 + Math.random() * 90;
  c.position.set(Math.cos(ang) * rad, 70 + Math.random() * 40, Math.sin(ang) * rad);
  clouds.add(c);
}
scene.add(clouds);

// ---------- Lighting ----------
const hemi = new THREE.HemisphereLight(0xbfd8ff, 0x4a5a3a, 0.75);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff0d0, 2.1);
sun.position.set(60, 90, 40);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.near = 10; sun.shadow.camera.far = 260;
sun.shadow.camera.left = -110; sun.shadow.camera.right = 110;
sun.shadow.camera.top = 110; sun.shadow.camera.bottom = -110;
sun.shadow.bias = -0.0004;
scene.add(sun);
scene.add(new THREE.AmbientLight(0xffffff, 0.25));

// ---------- Build the city ----------
const city = buildCity(scene);
const player = new Player(camera, renderer.domElement, city.colliders);

// ---------- First-person Robin Hood viewmodel (arms + bow) ----------
const viewmodel = new THREE.Group();
camera.add(viewmodel);
scene.add(camera);

const skinMat = new THREE.MeshStandardMaterial({ color: 0xd6a17a, roughness: 0.8 });
const greenMat = new THREE.MeshStandardMaterial({ color: 0x2f6b30, roughness: 0.85 });
const gloveMat = new THREE.MeshStandardMaterial({ color: 0x4a2f18, roughness: 0.9 });
const bowMat = new THREE.MeshStandardMaterial({ color: 0x6b3f1d, roughness: 0.7 });

// left arm holding bow (extended forward-left)
function buildArm(matSleeve) {
  const arm = new THREE.Group();
  const upper = new THREE.Mesh(new THREE.CapsuleGeometry(0.12, 0.5, 4, 8), matSleeve);
  const fore = new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.45, 4, 8), matSleeve);
  const hand = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 8), gloveMat);
  upper.position.set(0, 0, 0.25); upper.rotation.x = Math.PI / 2;
  fore.position.set(0, 0, 0.72); fore.rotation.x = Math.PI / 2;
  hand.position.set(0, 0, 1.0);
  arm.add(upper, fore, hand);
  return arm;
}

const leftArm = buildArm(greenMat);
leftArm.position.set(-0.42, -0.42, -0.2);
leftArm.rotation.set(0.1, 0.25, 0);
viewmodel.add(leftArm);

const rightArm = buildArm(greenMat);
rightArm.position.set(0.42, -0.46, -0.35);
rightArm.rotation.set(0.2, -0.35, 0);
viewmodel.add(rightArm);

// Bow held in the left hand
const bow = new THREE.Group();
const bowCurve = new THREE.CatmullRomCurve3([
  new THREE.Vector3(0, -0.9, 0), new THREE.Vector3(0.28, -0.45, 0),
  new THREE.Vector3(0.34, 0, 0), new THREE.Vector3(0.28, 0.45, 0),
  new THREE.Vector3(0, 0.9, 0),
]);
const bowStave = new THREE.Mesh(new THREE.TubeGeometry(bowCurve, 24, 0.035, 8, false), bowMat);
bow.add(bowStave);
const stringMat = new THREE.MeshStandardMaterial({ color: 0xe8e0c8 });
const string = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 1.8, 4), stringMat);
string.position.set(0.0, 0, 0);
bow.add(string);
// nocked arrow (visible while aiming)
const nock = new THREE.Group();
const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.9, 6), new THREE.MeshStandardMaterial({ color: 0x8a6a3a }));
shaft.rotation.x = Math.PI / 2; shaft.position.z = 0.45;
const tip = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.08, 6), new THREE.MeshStandardMaterial({ color: 0x999999, metalness: 0.6, roughness: 0.4 }));
tip.rotation.x = Math.PI / 2; tip.position.z = 0.92;
nock.add(shaft, tip);
bow.add(nock);
bow.position.set(-0.5, -0.5, -0.85);
bow.rotation.set(0, 0.15, 0.1);
viewmodel.add(bow);

viewmodel.visible = false;

// ---------- Arrow projectiles ----------
const arrows = [];
const arrowGeo = new THREE.CylinderGeometry(0.03, 0.03, 1.0, 6);
const arrowMat = new THREE.MeshStandardMaterial({ color: 0x8a6a3a });
const arrowTipMat = new THREE.MeshStandardMaterial({ color: 0xbbbbbb, metalness: 0.6, roughness: 0.4 });
let drawAnim = 0;

function fireArrow() {
  if (!player.enabled || Trade.isShopOpen()) return;
  if (Trade.state.arrows <= 0) { Trade.showToast('Out of arrows! Buy more at the Fletcher.'); return; }
  Trade.state.arrows--;
  Trade.refreshHUD();
  drawAnim = 1;

  const grp = new THREE.Group();
  const body = new THREE.Mesh(arrowGeo, arrowMat);
  body.rotation.x = Math.PI / 2;
  const t = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.14, 6), arrowTipMat);
  t.rotation.x = Math.PI / 2; t.position.z = 0.57;
  const feather = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.02, 0.14), new THREE.MeshStandardMaterial({ color: 0xdddddd }));
  feather.position.z = -0.45;
  grp.add(body, t, feather);

  const dir = new THREE.Vector3();
  camera.getWorldDirection(dir);
  const start = new THREE.Vector3();
  camera.getWorldPosition(start);
  start.addScaledVector(dir, 0.8).add(new THREE.Vector3(0, -0.1, 0));
  grp.position.copy(start);
  grp.quaternion.copy(camera.quaternion);
  scene.add(grp);
  arrows.push({ mesh: grp, vel: dir.clone().multiplyScalar(60), life: 4, gravity: 9 });
}

function updateArrows(dt) {
  for (let i = arrows.length - 1; i >= 0; i--) {
    const a = arrows[i];
    a.vel.y -= a.gravity * dt;
    a.mesh.position.addScaledVector(a.vel, dt);
    // orient along velocity
    const v = a.vel.clone().normalize();
    a.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), v);
    a.life -= dt;
    if (a.mesh.position.y <= 0.05 || a.life <= 0) {
      if (a.mesh.position.y <= 0.05) { a.mesh.position.y = 0.05; a.stuck = (a.stuck || 0) + dt; }
      if ((a.stuck || 0) > 3 || a.life <= 0) { scene.remove(a.mesh); arrows.splice(i, 1); }
      else { a.vel.set(0, 0, 0); a.gravity = 0; }
    }
  }
}

// ---------- Minimap ----------
const mm = document.getElementById('minimap');
const mmCtx = mm.getContext('2d');
const MM = 180, MM_SCALE = MM / 190; // world ~ +-90
function drawMinimap() {
  mmCtx.clearRect(0, 0, MM, MM);
  mmCtx.fillStyle = 'rgba(20,40,16,0.65)'; mmCtx.fillRect(0, 0, MM, MM);
  const toMap = (x, z) => [MM / 2 + x * MM_SCALE, MM / 2 + z * MM_SCALE];
  // roads
  mmCtx.strokeStyle = '#6b6b5a'; mmCtx.lineWidth = 6;
  mmCtx.beginPath(); mmCtx.moveTo(MM / 2, 6); mmCtx.lineTo(MM / 2, MM - 6);
  mmCtx.moveTo(6, MM / 2); mmCtx.lineTo(MM - 6, MM / 2); mmCtx.stroke();
  // shops
  city.shopZones.forEach(z => {
    const [mx, my] = toMap(z.x, z.z);
    mmCtx.fillStyle = '#ffd76a';
    mmCtx.beginPath(); mmCtx.arc(mx, my, 4, 0, Math.PI * 2); mmCtx.fill();
  });
  // player arrow
  const [px, py] = toMap(player.pos.x, player.pos.z);
  mmCtx.save(); mmCtx.translate(px, py); mmCtx.rotate(-player.yaw + Math.PI);
  mmCtx.fillStyle = '#57e36a';
  mmCtx.beginPath(); mmCtx.moveTo(0, -7); mmCtx.lineTo(5, 6); mmCtx.lineTo(-5, 6); mmCtx.closePath(); mmCtx.fill();
  mmCtx.restore();
  mmCtx.strokeStyle = '#6b4423'; mmCtx.lineWidth = 3; mmCtx.strokeRect(1, 1, MM - 2, MM - 2);
}

// ---------- Interaction (E to open shop) ----------
const promptEl = document.getElementById('interactPrompt');
const promptLabel = document.getElementById('interactLabel');
let nearestZone = null;

function updateInteraction() {
  nearestZone = null;
  let best = Infinity;
  for (const z of city.shopZones) {
    const dx = player.pos.x - z.x, dz = player.pos.z - z.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (dist < z.radius && dist < best) { best = dist; nearestZone = z; }
    // pulse ring
    z.ring.material.opacity = 0.4 + Math.sin(clock.elapsedTime * 3) * 0.25;
    z.ring.scale.setScalar(1 + Math.sin(clock.elapsedTime * 2) * 0.06);
  }
  if (nearestZone && !Trade.isShopOpen()) {
    promptLabel.textContent = 'Enter ' + nearestZone.shop.name;
    promptEl.classList.remove('hidden');
  } else {
    promptEl.classList.add('hidden');
  }
}

// ---------- Pointer lock + game state ----------
const loadingEl = document.getElementById('loading');
const menuEl = document.getElementById('menu');
const hudEl = document.getElementById('hud');
const pauseHint = document.getElementById('pausehint');
let started = false;

function requestLock() { renderer.domElement.requestPointerLock(); }

document.getElementById('playBtn').addEventListener('click', () => {
  menuEl.classList.add('hidden');
  hudEl.classList.remove('hidden');
  mm.classList.remove('hidden');
  viewmodel.visible = true;
  started = true;
  requestLock();
});

document.addEventListener('pointerlockchange', () => {
  const locked = document.pointerLockElement === renderer.domElement;
  player.setEnabled(locked);
  if (locked) {
    pauseHint.classList.add('hidden');
  } else if (started && !Trade.isShopOpen()) {
    pauseHint.classList.remove('hidden');
  }
});

// click to resume when paused (not on menu / shop)
renderer.domElement.addEventListener('click', () => {
  if (started && !Trade.isShopOpen() && document.pointerLockElement !== renderer.domElement) {
    requestLock();
  }
});

// fire arrow on mouse down while locked
renderer.domElement.addEventListener('mousedown', (e) => {
  if (e.button === 0 && document.pointerLockElement === renderer.domElement) fireArrow();
});

// keyboard actions
document.addEventListener('keydown', (e) => {
  if (!started) return;
  if (e.code === 'KeyE') {
    if (Trade.isShopOpen()) { Trade.closeShop(); }
    else if (nearestZone) {
      document.exitPointerLock();
      Trade.openShop(nearestZone.shop, () => { if (started) requestLock(); });
    }
  }
  if (e.code === 'KeyM') {
    mm.classList.toggle('hidden');
  }
  if (e.code === 'Escape') {
    if (Trade.isShopOpen()) Trade.closeShop();
  }
});

Trade.initShopUI();

// ---------- Loading sequence ----------
const tips = ['Stringing the bows…', 'Cobbling the streets…', 'Raising the town walls…',
  'Brewing ale at the Blue Boar…', 'Summoning the Merry Men…', 'Polishing the gold coins…'];
let loadP = 0;
const loadFill = document.getElementById('loadFill');
const loadTip = document.getElementById('loadTip');
const loadInt = setInterval(() => {
  loadP = Math.min(100, loadP + 8 + Math.random() * 14);
  loadFill.style.width = loadP + '%';
  loadTip.textContent = tips[Math.floor((loadP / 100) * (tips.length - 1))];
  if (loadP >= 100) {
    clearInterval(loadInt);
    setTimeout(() => { loadingEl.classList.add('hidden'); menuEl.classList.remove('hidden'); }, 350);
  }
}, 220);

// market simulation tick
setInterval(() => Trade.tickMarket(), 2500);

// ---------- Resize ----------
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ---------- Optional debug hook (only with ?debug) ----------
if (location.search.includes('debug')) {
  window.HOOD = { player, city, Trade, camera, scene, fireArrow,
    goToShop: (i) => { const z = city.shopZones[i]; player.pos.set(z.x, player.height, z.z); } };
}

// ---------- Main loop ----------
const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  const dt = clock.getDelta();

  player.update(dt);
  updateArrows(dt);
  updateInteraction();

  // bow draw recoil animation
  if (drawAnim > 0) {
    drawAnim = Math.max(0, drawAnim - dt * 4);
    bow.position.z = -0.85 + drawAnim * 0.12;
    nock.visible = drawAnim < 0.5;
  } else {
    bow.position.z = -0.85;
    nock.visible = true;
  }
  // subtle viewmodel sway
  viewmodel.rotation.x = Math.sin(player.bobT) * 0.01;
  viewmodel.rotation.z = Math.cos(player.bobT * 0.5) * 0.01;

  // drift clouds
  clouds.rotation.y += dt * 0.005;
  sky.position.copy(player.pos);

  if (!mm.classList.contains('hidden')) drawMinimap();

  renderer.render(scene, camera);
}
animate();
