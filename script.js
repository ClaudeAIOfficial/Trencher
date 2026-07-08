import * as THREE from "https://unpkg.com/three@0.166.1/build/three.module.js";

const root = document.getElementById("game-root");
const startButton = document.getElementById("start-button");
const shopPanel = document.getElementById("shop-panel");
const closePanelButton = document.getElementById("close-panel");
const shopTitle = document.getElementById("shop-title");
const shopDesc = document.getElementById("shop-desc");
const vendorTitle = document.getElementById("vendor-title");
const playerItemsList = document.getElementById("player-items");
const vendorItemsList = document.getElementById("vendor-items");
const tradeLog = document.getElementById("trade-log");
const nearbyShopLabel = document.getElementById("nearby-shop");
const coinCount = document.getElementById("coin-count");

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x9fb9d8);
scene.fog = new THREE.Fog(0x92a8c2, 45, 190);

const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  500
);
camera.position.set(0, 1.7, 25);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
root.appendChild(renderer.domElement);

const ambient = new THREE.AmbientLight(0xd5e0ff, 0.5);
scene.add(ambient);

const sun = new THREE.DirectionalLight(0xfff2df, 1.2);
sun.position.set(35, 45, 18);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.near = 1;
sun.shadow.camera.far = 150;
sun.shadow.camera.left = -65;
sun.shadow.camera.right = 65;
sun.shadow.camera.top = 65;
sun.shadow.camera.bottom = -65;
scene.add(sun);

const hemi = new THREE.HemisphereLight(0xbad8ff, 0x32485b, 0.38);
scene.add(hemi);

const clock = new THREE.Clock();
const keys = {};
let pointerLocked = false;
let yaw = 0;
let pitch = 0;
let activeShop = null;

const player = {
  coins: 120,
  inventory: {
    Arrows: 10,
    Apples: 3,
    Timber: 2,
    Cloth: 2
  }
};

const shops = [
  {
    id: "fletcher",
    name: "Sherwood Fletcher",
    type: "Shop stock",
    desc: "Stock up on archery gear and crafted arrows.",
    position: new THREE.Vector3(-14, 0, -12),
    inventory: {
      Arrows: { quantity: 40, price: 3 },
      Longbow: { quantity: 4, price: 45 },
      Leather: { quantity: 12, price: 8 }
    }
  },
  {
    id: "market",
    name: "Old Market Hall",
    type: "Shop stock",
    desc: "Fresh produce and supplies from town farmers.",
    position: new THREE.Vector3(16, 0, -10),
    inventory: {
      Apples: { quantity: 28, price: 2 },
      Bread: { quantity: 18, price: 4 },
      Cloth: { quantity: 10, price: 7 }
    }
  },
  {
    id: "tradepost",
    name: "Player Trading Post",
    type: "Community offers",
    desc: "Trade with others through the city exchange board.",
    position: new THREE.Vector3(2, 0, 20),
    inventory: {
      Iron: { quantity: 8, price: 14 },
      Timber: { quantity: 14, price: 6 },
      Gem: { quantity: 2, price: 55 }
    }
  }
];

const colliders = [];
const robinHoodGroup = new THREE.Group();

function makeCanvasTexture(drawFn) {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  drawFn(ctx, canvas.width, canvas.height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

const cobbleTexture = makeCanvasTexture((ctx, w, h) => {
  ctx.fillStyle = "#6f7f90";
  ctx.fillRect(0, 0, w, h);
  for (let y = 0; y < h; y += 24) {
    for (let x = 0; x < w; x += 30) {
      const jitterX = x + Math.random() * 4;
      const jitterY = y + Math.random() * 4;
      ctx.fillStyle = `rgba(${90 + Math.floor(Math.random() * 30)}, ${103 + Math.floor(
        Math.random() * 25
      )}, ${117 + Math.floor(Math.random() * 35)}, 0.8)`;
      ctx.fillRect(jitterX, jitterY, 24, 17);
      ctx.strokeStyle = "rgba(42, 51, 58, 0.55)";
      ctx.strokeRect(jitterX, jitterY, 24, 17);
    }
  }
});
cobbleTexture.repeat.set(16, 16);

const stoneTexture = makeCanvasTexture((ctx, w, h) => {
  ctx.fillStyle = "#b7b0a7";
  ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 120; i++) {
    const x = Math.random() * w;
    const y = Math.random() * h;
    const rw = 24 + Math.random() * 16;
    const rh = 12 + Math.random() * 8;
    ctx.fillStyle = `rgba(${150 + Math.floor(Math.random() * 40)}, ${145 + Math.floor(
      Math.random() * 35
    )}, ${132 + Math.floor(Math.random() * 25)}, 0.95)`;
    ctx.fillRect(x, y, rw, rh);
    ctx.strokeStyle = "rgba(80, 72, 61, 0.35)";
    ctx.strokeRect(x, y, rw, rh);
  }
});
stoneTexture.repeat.set(1.2, 1.2);

const brickTexture = makeCanvasTexture((ctx, w, h) => {
  ctx.fillStyle = "#8b5d4d";
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = "rgba(42, 32, 28, 0.65)";
  for (let y = 0; y < h; y += 24) {
    const offset = (y / 24) % 2 ? 10 : 0;
    for (let x = -offset; x < w; x += 42) {
      ctx.fillStyle = `rgba(${130 + Math.floor(Math.random() * 50)}, ${84 + Math.floor(
        Math.random() * 20
      )}, ${66 + Math.floor(Math.random() * 25)}, 1)`;
      ctx.fillRect(x, y, 39, 20);
      ctx.strokeRect(x, y, 39, 20);
    }
  }
});
brickTexture.repeat.set(1.5, 1.5);

function createGround() {
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(220, 220),
    new THREE.MeshStandardMaterial({
      map: cobbleTexture,
      roughness: 0.95,
      metalness: 0.02
    })
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.receiveShadow = true;
  scene.add(mesh);
}

function addCollider(x, z, width, depth) {
  colliders.push({
    minX: x - width / 2 - 0.9,
    maxX: x + width / 2 + 0.9,
    minZ: z - depth / 2 - 0.9,
    maxZ: z + depth / 2 + 0.9
  });
}

function createBuilding({
  x,
  z,
  width,
  depth,
  height,
  color = 0xc9b79f,
  roofColor = 0x5e4035,
  texture = stoneTexture
}) {
  const bodyMaterial = new THREE.MeshStandardMaterial({
    map: texture,
    color,
    roughness: 0.88,
    metalness: 0.05
  });
  const body = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), bodyMaterial);
  body.position.set(x, height / 2, z);
  body.castShadow = true;
  body.receiveShadow = true;
  scene.add(body);

  const roof = new THREE.Mesh(
    new THREE.ConeGeometry(Math.max(width, depth) * 0.75, height * 0.35, 4),
    new THREE.MeshStandardMaterial({
      color: roofColor,
      roughness: 0.92,
      metalness: 0.04
    })
  );
  roof.rotation.y = Math.PI * 0.25;
  roof.position.set(x, height + roof.geometry.parameters.height / 2 - 0.05, z);
  roof.castShadow = true;
  scene.add(roof);

  const windowGeometry = new THREE.PlaneGeometry(0.8, 1.25);
  const windowMaterial = new THREE.MeshStandardMaterial({
    color: 0xc9def7,
    emissive: 0x4f7695,
    emissiveIntensity: 0.33
  });
  const rows = Math.max(2, Math.floor(height / 3));
  const cols = Math.max(2, Math.floor(width / 2.5));

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const windowPanel = new THREE.Mesh(windowGeometry, windowMaterial);
      const wx = x - width / 2 + 1.2 + col * ((width - 2.4) / Math.max(cols - 1, 1));
      const wy = 2.1 + row * 2.2;
      windowPanel.position.set(wx, wy, z + depth / 2 + 0.03);
      scene.add(windowPanel);
    }
  }

  addCollider(x, z, width, depth);
}

function createStreetLamp(x, z) {
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.16, 3.4, 8),
    new THREE.MeshStandardMaterial({ color: 0x2f353b, roughness: 0.6 })
  );
  pole.position.set(x, 1.7, z);
  pole.castShadow = true;
  scene.add(pole);

  const lamp = new THREE.Mesh(
    new THREE.SphereGeometry(0.26, 16, 16),
    new THREE.MeshStandardMaterial({
      color: 0xf5db9f,
      emissive: 0xf5bf52,
      emissiveIntensity: 0.6
    })
  );
  lamp.position.set(x, 3.45, z);
  scene.add(lamp);

  const point = new THREE.PointLight(0xf2c66f, 0.9, 16);
  point.position.set(x, 3.35, z);
  scene.add(point);
}

function createTree(x, z) {
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.25, 0.35, 2.2, 8),
    new THREE.MeshStandardMaterial({ color: 0x6f4a2f, roughness: 0.9 })
  );
  trunk.position.set(x, 1.1, z);
  trunk.castShadow = true;
  scene.add(trunk);

  const leaves = new THREE.Mesh(
    new THREE.SphereGeometry(1.5, 14, 14),
    new THREE.MeshStandardMaterial({ color: 0x2f7f3b, roughness: 0.86 })
  );
  leaves.position.set(x, 3.1, z);
  leaves.castShadow = true;
  scene.add(leaves);
}

function createSign(text, x, y, z) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 160;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#2a1f16";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = "#d7b678";
  ctx.lineWidth = 8;
  ctx.strokeRect(8, 8, canvas.width - 16, canvas.height - 16);
  ctx.fillStyle = "#f0e2be";
  ctx.font = "bold 56px serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, canvas.width / 2, canvas.height / 2 + 2);

  const texture = new THREE.CanvasTexture(canvas);
  const sign = new THREE.Mesh(
    new THREE.PlaneGeometry(4.6, 1.45),
    new THREE.MeshStandardMaterial({ map: texture, roughness: 0.75 })
  );
  sign.position.set(x, y, z);
  scene.add(sign);
}

function createRobinHoodCharacter() {
  robinHoodGroup.position.set(0, 0, 0);

  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.62, 0.75, 2.2, 16),
    new THREE.MeshStandardMaterial({ color: 0x2f8b4a, roughness: 0.75 })
  );
  body.position.y = 3.2;
  body.castShadow = true;
  robinHoodGroup.add(body);

  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.47, 20, 20),
    new THREE.MeshStandardMaterial({ color: 0xf4c9a5, roughness: 0.6 })
  );
  head.position.y = 4.65;
  head.castShadow = true;
  robinHoodGroup.add(head);

  const hat = new THREE.Mesh(
    new THREE.ConeGeometry(0.56, 0.95, 16),
    new THREE.MeshStandardMaterial({ color: 0x1d5f31, roughness: 0.86 })
  );
  hat.position.y = 5.12;
  hat.rotation.z = -0.2;
  hat.castShadow = true;
  robinHoodGroup.add(hat);

  const feather = new THREE.Mesh(
    new THREE.BoxGeometry(0.1, 0.55, 0.05),
    new THREE.MeshStandardMaterial({ color: 0xdfe35d, roughness: 0.35 })
  );
  feather.position.set(0.35, 5.25, 0.02);
  feather.rotation.z = -0.35;
  robinHoodGroup.add(feather);

  const leftArm = new THREE.Mesh(
    new THREE.CylinderGeometry(0.13, 0.14, 1.2, 12),
    new THREE.MeshStandardMaterial({ color: 0x2d7840 })
  );
  leftArm.position.set(-0.75, 3.45, 0);
  leftArm.rotation.z = 0.46;
  robinHoodGroup.add(leftArm);

  const rightArm = leftArm.clone();
  rightArm.position.set(0.75, 3.45, 0);
  rightArm.rotation.z = -0.46;
  robinHoodGroup.add(rightArm);

  const bow = new THREE.Mesh(
    new THREE.TorusGeometry(0.9, 0.05, 12, 44, Math.PI),
    new THREE.MeshStandardMaterial({ color: 0x74472f, roughness: 0.8 })
  );
  bow.position.set(0.95, 3.5, 0.25);
  bow.rotation.z = Math.PI * 0.5;
  robinHoodGroup.add(bow);

  const quiver = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.23, 1.05, 12),
    new THREE.MeshStandardMaterial({ color: 0x5f3c2a, roughness: 0.9 })
  );
  quiver.position.set(-0.45, 3.6, -0.55);
  quiver.rotation.x = 0.3;
  robinHoodGroup.add(quiver);

  const pedestal = new THREE.Mesh(
    new THREE.CylinderGeometry(2.8, 3.2, 1.3, 18),
    new THREE.MeshStandardMaterial({
      map: stoneTexture,
      color: 0xa9a39a,
      roughness: 0.93
    })
  );
  pedestal.position.y = 0.65;
  pedestal.receiveShadow = true;
  pedestal.castShadow = true;
  scene.add(pedestal);
  addCollider(0, 0, 5.8, 5.8);

  const spot = new THREE.SpotLight(0xffefcc, 1.3, 34, Math.PI / 5, 0.4, 1.2);
  spot.position.set(0, 13, 0);
  spot.target = robinHoodGroup;
  scene.add(spot);
  scene.add(spot.target);

  scene.add(robinHoodGroup);
}

function createCityLayout() {
  createGround();
  createRobinHoodCharacter();

  const buildingRows = [
    [-28, -22],
    [-28, 22],
    [28, -22],
    [28, 22],
    [-18, 30],
    [18, 30],
    [-18, -30],
    [18, -30]
  ];

  for (const [x, z] of buildingRows) {
    createBuilding({
      x,
      z,
      width: 8 + Math.random() * 4,
      depth: 9 + Math.random() * 3,
      height: 9 + Math.random() * 8,
      color: 0xe0d4c5,
      roofColor: 0x6a4a40,
      texture: Math.random() > 0.5 ? stoneTexture : brickTexture
    });
  }

  createBuilding({
    x: -13,
    z: -12,
    width: 9,
    depth: 7,
    height: 6,
    color: 0xd7c6af,
    roofColor: 0x4f352e,
    texture: brickTexture
  });

  createBuilding({
    x: 16,
    z: -10,
    width: 9,
    depth: 7,
    height: 6.5,
    color: 0xd8cab6,
    roofColor: 0x5f433a,
    texture: stoneTexture
  });

  createBuilding({
    x: 2,
    z: 20,
    width: 10,
    depth: 8,
    height: 6,
    color: 0xd4c4aa,
    roofColor: 0x61392f,
    texture: brickTexture
  });

  createSign("Fletcher", -13, 4, -8.35);
  createSign("Market Hall", 16, 4.1, -6.35);
  createSign("Trading Post", 2, 4, 24.2);

  for (let i = -2; i <= 2; i++) {
    createStreetLamp(i * 9, -4);
    createStreetLamp(i * 9, 14);
  }

  const treeSpots = [
    [-23, 6],
    [23, 4],
    [-21, -8],
    [21, -6],
    [-7, 30],
    [7, 30],
    [-7, -30],
    [7, -30]
  ];
  treeSpots.forEach(([x, z]) => createTree(x, z));
}

function collidesAt(position) {
  return colliders.some(
    (box) =>
      position.x > box.minX &&
      position.x < box.maxX &&
      position.z > box.minZ &&
      position.z < box.maxZ
  );
}

function updateNearbyShop() {
  const playerPos = camera.position;
  let closest = null;
  let minDist = Infinity;
  for (const shop of shops) {
    const distance = playerPos.distanceTo(shop.position);
    if (distance < minDist) {
      closest = shop;
      minDist = distance;
    }
  }

  if (closest && minDist <= 6.8) {
    nearbyShopLabel.textContent = `${closest.name} - Press E to trade`;
    activeShop = closest;
  } else {
    nearbyShopLabel.textContent = "Explore the city";
    activeShop = null;
  }
}

function getSellPrice(itemName) {
  const defaultBase = Math.max(1, Math.ceil((activeShop?.inventory[itemName]?.price || 6) * 0.55));
  return defaultBase;
}

function adjustInventory(bag, item, amount) {
  bag[item] = (bag[item] || 0) + amount;
  if (bag[item] <= 0) {
    delete bag[item];
  }
}

function renderTradeLists() {
  if (!activeShop) return;

  shopTitle.textContent = activeShop.name;
  shopDesc.textContent = activeShop.desc;
  vendorTitle.textContent = activeShop.type;
  coinCount.textContent = String(player.coins);

  playerItemsList.innerHTML = "";
  const playerEntries = Object.entries(player.inventory);
  if (playerEntries.length === 0) {
    const li = document.createElement("li");
    li.textContent = "No items available.";
    playerItemsList.appendChild(li);
  } else {
    for (const [itemName, quantity] of playerEntries) {
      const price = getSellPrice(itemName);
      const button = document.createElement("button");
      button.textContent = `Sell ${itemName} x${quantity} (+${price} coins)`;
      button.addEventListener("click", () => {
        adjustInventory(player.inventory, itemName, -1);
        player.coins += price;
        if (!activeShop.inventory[itemName]) {
          activeShop.inventory[itemName] = { quantity: 0, price: Math.max(2, price + 2) };
        }
        activeShop.inventory[itemName].quantity += 1;
        tradeLog.textContent = `You sold 1 ${itemName} to ${activeShop.name}.`;
        renderTradeLists();
      });
      const li = document.createElement("li");
      li.appendChild(button);
      playerItemsList.appendChild(li);
    }
  }

  vendorItemsList.innerHTML = "";
  for (const [itemName, info] of Object.entries(activeShop.inventory)) {
    const button = document.createElement("button");
    button.textContent = `Buy ${itemName} x${info.quantity} (-${info.price} coins)`;
    button.disabled = info.quantity <= 0;
    button.addEventListener("click", () => {
      if (info.quantity <= 0) {
        tradeLog.textContent = `${itemName} is out of stock.`;
        return;
      }
      if (player.coins < info.price) {
        tradeLog.textContent = "Not enough coins for that trade.";
        return;
      }
      player.coins -= info.price;
      adjustInventory(player.inventory, itemName, 1);
      info.quantity -= 1;
      tradeLog.textContent = `You bought 1 ${itemName} from ${activeShop.name}.`;
      renderTradeLists();
    });
    const li = document.createElement("li");
    li.appendChild(button);
    vendorItemsList.appendChild(li);
  }
}

function openShopPanel() {
  if (!activeShop) return;
  shopPanel.classList.remove("hidden");
  pointerLocked = false;
  document.exitPointerLock();
  renderTradeLists();
}

function closeShopPanel() {
  shopPanel.classList.add("hidden");
  tradeLog.textContent = "";
}

function updateCameraRotation() {
  camera.rotation.order = "YXZ";
  camera.rotation.y = yaw;
  camera.rotation.x = pitch;
}

function updateMovement(delta) {
  const speed = (keys.ShiftLeft ? 9 : 5.4) * delta;
  const direction = new THREE.Vector3();

  const forward = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw) * -1);
  const right = new THREE.Vector3(forward.z, 0, -forward.x);

  if (keys.KeyW) direction.add(forward);
  if (keys.KeyS) direction.sub(forward);
  if (keys.KeyD) direction.add(right);
  if (keys.KeyA) direction.sub(right);

  if (direction.lengthSq() > 0) {
    direction.normalize();
    const current = camera.position.clone();
    const next = current.addScaledVector(direction, speed);
    next.y = 1.7;
    if (!collidesAt(next)) {
      camera.position.copy(next);
    }
  }
}

createCityLayout();

document.addEventListener("keydown", (event) => {
  keys[event.code] = true;
  if (event.code === "KeyE" && !shopPanel.classList.contains("hidden")) return;
  if (event.code === "KeyE" && activeShop) {
    openShopPanel();
  }
});

document.addEventListener("keyup", (event) => {
  keys[event.code] = false;
});

document.addEventListener("mousemove", (event) => {
  if (!pointerLocked || !shopPanel.classList.contains("hidden")) return;
  yaw -= event.movementX * 0.0025;
  pitch -= event.movementY * 0.0018;
  pitch = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, pitch));
  updateCameraRotation();
});

document.addEventListener("pointerlockchange", () => {
  pointerLocked = document.pointerLockElement === renderer.domElement;
});

startButton.addEventListener("click", () => {
  startButton.classList.add("hidden");
  renderer.domElement.requestPointerLock();
});

closePanelButton.addEventListener("click", closeShopPanel);

window.addEventListener("keydown", (event) => {
  if (event.code === "Escape") {
    closeShopPanel();
  }
});

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

function animate() {
  const delta = Math.min(0.045, clock.getDelta());
  updateMovement(delta);
  updateNearbyShop();
  robinHoodGroup.position.y = Math.sin(clock.elapsedTime * 1.2) * 0.08;
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

animate();
