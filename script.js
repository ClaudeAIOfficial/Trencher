import * as THREE from "https://unpkg.com/three@0.166.1/build/three.module.js";

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xa7c5de);
scene.fog = new THREE.Fog(0xa7c5de, 50, 220);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 400);
camera.position.set(0, 2.1, 16);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);

const hemi = new THREE.HemisphereLight(0xe7f1ff, 0x4f6742, 0.7);
scene.add(hemi);

const sunlight = new THREE.DirectionalLight(0xfff2d6, 1.15);
sunlight.position.set(40, 55, 10);
sunlight.castShadow = true;
sunlight.shadow.mapSize.set(2048, 2048);
sunlight.shadow.camera.left = -120;
sunlight.shadow.camera.right = 120;
sunlight.shadow.camera.top = 120;
sunlight.shadow.camera.bottom = -120;
scene.add(sunlight);

const cobbleTexture = new THREE.TextureLoader().load("https://images.unsplash.com/photo-1519750157634-b6d493a0f77f?auto=format&fit=crop&w=1200&q=60");
cobbleTexture.wrapS = THREE.RepeatWrapping;
cobbleTexture.wrapT = THREE.RepeatWrapping;
cobbleTexture.repeat.set(28, 28);

const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(260, 260),
  new THREE.MeshStandardMaterial({ map: cobbleTexture, roughness: 0.95, metalness: 0.03 })
);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

const border = new THREE.Mesh(
  new THREE.RingGeometry(115, 130, 64),
  new THREE.MeshStandardMaterial({ color: 0x264a2f, roughness: 1, metalness: 0 })
);
border.rotation.x = -Math.PI / 2;
border.position.y = 0.01;
scene.add(border);

const buildingBoxes = [];
const zones = [
  { name: "City Gate", position: new THREE.Vector3(0, 0, 18) },
  { name: "Archer's Quarter", position: new THREE.Vector3(-26, 0, -2) },
  { name: "Market Square", position: new THREE.Vector3(0, 0, 0) },
  { name: "Craftsman Lane", position: new THREE.Vector3(25, 0, -4) },
  { name: "Riverside Docks", position: new THREE.Vector3(-12, 0, -30) }
];

const shops = [
  {
    name: "Sherwood Bowyer",
    description: "Master of longbows and hunting tools.",
    position: new THREE.Vector3(-20, 0, -6),
    items: [
      { name: "Oak Longbow", price: 28, detail: "Reliable bow for contests and skirmishes." },
      { name: "Quiver Refill", price: 12, detail: "Trade in old arrows for a fresh bundle." }
    ]
  },
  {
    name: "Merry Men Outfitters",
    description: "Cloaks and leather gear for stealthy movement.",
    position: new THREE.Vector3(18, 0, -12),
    items: [
      { name: "Forest Cloak", price: 22, detail: "A Robin Hood inspired cloak for blending in." },
      { name: "Traveler Boots", price: 18, detail: "Durable footwear for city and woodland routes." }
    ]
  },
  {
    name: "Guild Exchange",
    description: "A social trading point where players barter goods.",
    position: new THREE.Vector3(2, 0, -28),
    items: [
      { name: "Trade Permit", price: 16, detail: "Unlocks player-to-player market trades." },
      { name: "Coin Pouch", price: 9, detail: "Keeps your coin safe in crowded stalls." }
    ]
  }
];

function createBuilding(x, z, width, depth, floors, wallColor, roofColor) {
  const building = new THREE.Group();
  const storyHeight = 4.2;
  const height = floors * storyHeight;

  const base = new THREE.Mesh(
    new THREE.BoxGeometry(width, height, depth),
    new THREE.MeshStandardMaterial({ color: wallColor, roughness: 0.8, metalness: 0.02 })
  );
  base.position.y = height / 2;
  base.castShadow = true;
  base.receiveShadow = true;
  building.add(base);

  const roof = new THREE.Mesh(
    new THREE.ConeGeometry(Math.max(width, depth) * 0.72, 3.5, 4),
    new THREE.MeshStandardMaterial({ color: roofColor, roughness: 0.9 })
  );
  roof.position.y = height + 2;
  roof.rotation.y = Math.PI / 4;
  roof.castShadow = true;
  building.add(roof);

  const windowMaterial = new THREE.MeshStandardMaterial({
    color: 0xb9d7ff,
    emissive: 0x274272,
    emissiveIntensity: 0.32,
    metalness: 0.7,
    roughness: 0.2
  });
  for (let floor = 0; floor < floors; floor += 1) {
    const y = 1.7 + floor * storyHeight;
    for (let side = -1; side <= 1; side += 2) {
      const win = new THREE.Mesh(new THREE.BoxGeometry(width * 0.18, 1.2, 0.15), windowMaterial);
      win.position.set(side * (width / 2 + 0.06), y, 0);
      win.castShadow = true;
      building.add(win);
    }
  }

  const door = new THREE.Mesh(
    new THREE.BoxGeometry(width * 0.24, 2.5, 0.25),
    new THREE.MeshStandardMaterial({ color: 0x49352a, roughness: 0.95 })
  );
  door.position.set(0, 1.25, depth / 2 + 0.12);
  door.castShadow = true;
  building.add(door);

  const chimney = new THREE.Mesh(
    new THREE.BoxGeometry(0.8, 3.2, 0.8),
    new THREE.MeshStandardMaterial({ color: 0x7b7c80, roughness: 0.85 })
  );
  chimney.position.set(width * 0.2, height + 2.1, -depth * 0.2);
  chimney.castShadow = true;
  building.add(chimney);

  building.position.set(x, 0, z);
  scene.add(building);

  buildingBoxes.push({
    minX: x - width / 2 - 1.2,
    maxX: x + width / 2 + 1.2,
    minZ: z - depth / 2 - 1.2,
    maxZ: z + depth / 2 + 1.2
  });
}

function createCityBlock() {
  const rows = [
    [-42, -22, -2, 22, 42],
    [-38, -18, 2, 22, 38]
  ];
  const depthMap = [9, 11, 10, 12];
  const wallPalette = [0xad9884, 0x9f8b75, 0xc5b096, 0xbaa58f];
  const roofPalette = [0x5d2d20, 0x6f3725, 0x4f2a1f];

  rows.forEach((line, i) => {
    line.forEach((x, idx) => {
      const z1 = -18 + i * 36;
      createBuilding(
        x,
        z1,
        8 + (idx % 2) * 1.5,
        depthMap[(idx + i) % depthMap.length],
        2 + ((idx + i) % 3),
        wallPalette[(idx + i * 2) % wallPalette.length],
        roofPalette[(idx + i) % roofPalette.length]
      );
    });
  });
}

function createMainCharacter() {
  const robin = new THREE.Group();

  const body = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.7, 1.6, 8, 12),
    new THREE.MeshStandardMaterial({ color: 0x2f6644, roughness: 0.75 })
  );
  body.position.y = 2.2;
  body.castShadow = true;
  robin.add(body);

  const chestBelt = new THREE.Mesh(
    new THREE.TorusGeometry(0.6, 0.08, 8, 26),
    new THREE.MeshStandardMaterial({ color: 0x4f321f, roughness: 0.85 })
  );
  chestBelt.rotation.x = Math.PI / 2.2;
  chestBelt.position.set(0, 2.5, 0);
  robin.add(chestBelt);

  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.48, 20, 20),
    new THREE.MeshStandardMaterial({ color: 0xf0c29a, roughness: 0.6 })
  );
  head.position.y = 3.35;
  head.castShadow = true;
  robin.add(head);

  const hat = new THREE.Mesh(
    new THREE.ConeGeometry(0.55, 0.8, 22),
    new THREE.MeshStandardMaterial({ color: 0x214f30, roughness: 0.82 })
  );
  hat.position.y = 3.92;
  hat.rotation.z = -0.25;
  hat.castShadow = true;
  robin.add(hat);

  const feather = new THREE.Mesh(
    new THREE.ConeGeometry(0.08, 0.72, 10),
    new THREE.MeshStandardMaterial({ color: 0xc9d17a, roughness: 0.55 })
  );
  feather.position.set(0.38, 4.15, 0.05);
  feather.rotation.z = 0.82;
  robin.add(feather);

  const bow = new THREE.Mesh(
    new THREE.TorusGeometry(0.82, 0.04, 8, 28, Math.PI),
    new THREE.MeshStandardMaterial({ color: 0x8b5a35, roughness: 0.7 })
  );
  bow.rotation.z = Math.PI / 2;
  bow.position.set(-0.83, 2.45, 0.08);
  robin.add(bow);

  robin.position.set(0, 0, 0);
  scene.add(robin);
  return robin;
}

function createShopStall(shop) {
  const stall = new THREE.Group();
  stall.position.copy(shop.position);

  const platform = new THREE.Mesh(
    new THREE.BoxGeometry(7.2, 0.6, 5.3),
    new THREE.MeshStandardMaterial({ color: 0x5c4637, roughness: 0.86 })
  );
  platform.position.y = 0.3;
  platform.receiveShadow = true;
  stall.add(platform);

  const roof = new THREE.Mesh(
    new THREE.BoxGeometry(7.8, 0.5, 5.9),
    new THREE.MeshStandardMaterial({ color: 0x7d2f22, roughness: 0.9 })
  );
  roof.position.y = 4;
  roof.castShadow = true;
  stall.add(roof);

  const postMat = new THREE.MeshStandardMaterial({ color: 0x5a3d2d, roughness: 0.9 });
  const postPositions = [
    [-3.2, 1.9, -2.2],
    [3.2, 1.9, -2.2],
    [-3.2, 1.9, 2.2],
    [3.2, 1.9, 2.2]
  ];
  postPositions.forEach((position) => {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.18, 3.8, 8), postMat);
    post.position.set(...position);
    post.castShadow = true;
    stall.add(post);
  });

  const sign = new THREE.Mesh(
    new THREE.BoxGeometry(3.6, 0.8, 0.22),
    new THREE.MeshStandardMaterial({ color: 0x9c7f54, roughness: 0.75 })
  );
  sign.position.set(0, 2.8, 2.83);
  sign.castShadow = true;
  stall.add(sign);

  const lantern = new THREE.Mesh(
    new THREE.SphereGeometry(0.25, 12, 12),
    new THREE.MeshStandardMaterial({ color: 0xffdca5, emissive: 0xffaf40, emissiveIntensity: 0.6 })
  );
  lantern.position.set(-2.7, 2.7, 2.6);
  stall.add(lantern);

  stall.userData.tradeRadius = 7;
  scene.add(stall);
}

function createTrees() {
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5b3f2f, roughness: 0.95 });
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x2f6d3a, roughness: 1 });
  for (let i = 0; i < 26; i += 1) {
    const angle = (i / 26) * Math.PI * 2;
    const radius = 78 + (i % 5) * 7;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.6, 4.5, 8), trunkMat);
    trunk.position.set(x, 2.2, z);
    trunk.castShadow = true;
    scene.add(trunk);

    const crown = new THREE.Mesh(new THREE.SphereGeometry(2.5 + (i % 3) * 0.3, 14, 14), leafMat);
    crown.position.set(x, 6.2, z);
    crown.castShadow = true;
    scene.add(crown);
  }
}

createCityBlock();
const robinCharacter = createMainCharacter();
shops.forEach((shop) => createShopStall(shop));
createTrees();

const hudElements = {
  startButton: document.getElementById("startButton"),
  locationText: document.getElementById("locationText"),
  coinsText: document.getElementById("coinsText"),
  tradeHint: document.getElementById("tradeHint"),
  tradePanel: document.getElementById("tradePanel"),
  closeTrade: document.getElementById("closeTrade"),
  shopName: document.getElementById("shopName"),
  shopDescription: document.getElementById("shopDescription"),
  tradeGrid: document.getElementById("tradeGrid")
};

const keys = new Set();
const clock = new THREE.Clock();
const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();
const cameraHolder = new THREE.Object3D();
cameraHolder.position.copy(camera.position);
scene.add(cameraHolder);
cameraHolder.add(camera);

const upDownLimit = Math.PI / 2 - 0.12;
let yaw = 0;
let pitch = 0;
let pointerLocked = false;
let coins = 120;
let activeShop = null;

function updateCoinsText() {
  hudElements.coinsText.textContent = `Coins: ${coins}`;
}

function openTradePanel(shop) {
  activeShop = shop;
  hudElements.tradePanel.classList.remove("hidden");
  hudElements.shopName.textContent = shop.name;
  hudElements.shopDescription.textContent = shop.description;
  hudElements.tradeGrid.innerHTML = "";
  shop.items.forEach((item) => {
    const card = document.createElement("div");
    card.className = "trade-card";
    card.innerHTML = `
      <h3>${item.name} - ${item.price} coins</h3>
      <p>${item.detail}</p>
    `;
    const tradeButton = document.createElement("button");
    tradeButton.type = "button";
    tradeButton.textContent = "Trade item";
    tradeButton.addEventListener("click", () => {
      if (coins >= item.price) {
        coins -= item.price;
        updateCoinsText();
        hudElements.tradeHint.textContent = `Traded for ${item.name}. Town players can now barter with you.`;
      } else {
        hudElements.tradeHint.textContent = "Not enough coins. Explore HOODCITY to earn more.";
      }
    });
    card.appendChild(tradeButton);
    hudElements.tradeGrid.appendChild(card);
  });
}

function closeTradePanel() {
  activeShop = null;
  hudElements.tradePanel.classList.add("hidden");
}

hudElements.closeTrade.addEventListener("click", closeTradePanel);

document.addEventListener("keydown", (event) => {
  keys.add(event.code);
  if (event.code === "KeyE" && !activeShop) {
    const nearby = getNearbyShop();
    if (nearby) {
      openTradePanel(nearby);
    }
  } else if (event.code === "Escape") {
    closeTradePanel();
  }
});

document.addEventListener("keyup", (event) => {
  keys.delete(event.code);
});

hudElements.startButton.addEventListener("click", () => {
  renderer.domElement.requestPointerLock();
});

document.addEventListener("pointerlockchange", () => {
  pointerLocked = document.pointerLockElement === renderer.domElement;
  hudElements.tradeHint.textContent = pointerLocked
    ? "Pointer locked. Walk to a shop and press E to trade."
    : "Pointer unlocked. Click Enter City to continue.";
});

document.addEventListener("mousemove", (event) => {
  if (!pointerLocked || activeShop) {
    return;
  }
  yaw -= event.movementX * 0.0023;
  pitch -= event.movementY * 0.0023;
  pitch = Math.max(-upDownLimit, Math.min(upDownLimit, pitch));
});

function getNearbyShop() {
  const currentPosition = cameraHolder.position;
  let closestShop = null;
  let closestDistance = Infinity;
  shops.forEach((shop) => {
    const distance = currentPosition.distanceTo(shop.position);
    if (distance < 8 && distance < closestDistance) {
      closestDistance = distance;
      closestShop = shop;
    }
  });
  return closestShop;
}

function detectZone() {
  let zoneName = "Outer Streets";
  let minDistance = Infinity;
  zones.forEach((zone) => {
    const distance = cameraHolder.position.distanceTo(zone.position);
    if (distance < minDistance) {
      minDistance = distance;
      zoneName = zone.name;
    }
  });
  hudElements.locationText.textContent = `Location: ${zoneName}`;
}

function canMove(nextX, nextZ) {
  if (Math.abs(nextX) > 95 || Math.abs(nextZ) > 95) {
    return false;
  }
  for (const box of buildingBoxes) {
    if (nextX > box.minX && nextX < box.maxX && nextZ > box.minZ && nextZ < box.maxZ) {
      return false;
    }
  }
  return true;
}

function updateMovement(deltaTime) {
  if (!pointerLocked || activeShop) {
    velocity.set(0, 0, 0);
    return;
  }

  direction.set(0, 0, 0);
  if (keys.has("KeyW")) direction.z -= 1;
  if (keys.has("KeyS")) direction.z += 1;
  if (keys.has("KeyA")) direction.x -= 1;
  if (keys.has("KeyD")) direction.x += 1;

  if (direction.lengthSq() > 0) {
    direction.normalize();
    const forward = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
    const right = new THREE.Vector3(forward.z, 0, -forward.x);
    velocity.copy(forward.multiplyScalar(-direction.z).add(right.multiplyScalar(direction.x)));
    velocity.normalize().multiplyScalar(12 * deltaTime);

    const nextX = cameraHolder.position.x + velocity.x;
    const nextZ = cameraHolder.position.z + velocity.z;
    if (canMove(nextX, cameraHolder.position.z)) {
      cameraHolder.position.x = nextX;
    }
    if (canMove(cameraHolder.position.x, nextZ)) {
      cameraHolder.position.z = nextZ;
    }
  }
}

function animateRobin(time) {
  robinCharacter.position.y = Math.sin(time * 0.0018) * 0.15;
  robinCharacter.rotation.y += 0.002;
}

function animate() {
  const deltaTime = clock.getDelta();
  updateMovement(deltaTime);
  detectZone();

  const nearShop = getNearbyShop();
  if (!activeShop) {
    hudElements.tradeHint.textContent = nearShop
      ? `Near ${nearShop.name}. Press E to trade with players and vendors.`
      : pointerLocked
        ? "Explore the city and look for marked shops."
        : "Click Enter City to start first-person mode.";
  }

  cameraHolder.rotation.y = yaw;
  camera.rotation.x = pitch;
  animateRobin(performance.now());
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

updateCoinsText();
animate();

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
