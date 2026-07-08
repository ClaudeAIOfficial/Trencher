const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const startButton = document.getElementById("startButton");
const promptBox = document.getElementById("prompt");
const tradePanel = document.getElementById("tradePanel");
const closeTrade = document.getElementById("closeTrade");
const tradeTitle = document.getElementById("tradeTitle");
const tradeDescription = document.getElementById("tradeDescription");
const tradeOptions = document.getElementById("tradeOptions");
const inventoryList = document.getElementById("inventoryList");
const coinCount = document.getElementById("coinCount");

const world = {
  width: 80,
  depth: 80,
  fov: Math.PI / 2.6,
  focalLength: 760,
};

const player = {
  x: 40,
  z: 62,
  angle: -Math.PI / 2,
  speed: 0.12,
};

const keys = new Set();
const inventory = {
  "Sherwood Apples": 4,
  "Practice Arrows": 8,
  "Green Cloth": 2,
};
let coins = 35;
let activeTrader = null;

const traders = [
  {
    type: "shop",
    name: "Merry Market",
    description: "A timber-and-stone food hall with crates, lanterns, and a tiled roof.",
    x: 20,
    z: 27,
    w: 13,
    d: 12,
    h: 12,
    color: "#9b5f32",
    roof: "#6e251f",
    sign: "MARKET",
    offers: [
      { label: "Buy 3 Sherwood Apples - 5 coins", cost: 5, item: "Sherwood Apples", amount: 3 },
      { label: "Trade 2 Apples for 1 Green Cloth", give: "Sherwood Apples", giveAmount: 2, item: "Green Cloth", amount: 1 },
    ],
  },
  {
    type: "shop",
    name: "Bowyer Workshop",
    description: "A realistic archer shop with plank siding, bow racks, and a smoky forge chimney.",
    x: 51,
    z: 22,
    w: 14,
    d: 11,
    h: 13,
    color: "#7b4d2e",
    roof: "#2f4f2f",
    sign: "BOWS",
    offers: [
      { label: "Buy 6 Practice Arrows - 8 coins", cost: 8, item: "Practice Arrows", amount: 6 },
      { label: "Sell 4 Practice Arrows - earn 5 coins", sell: "Practice Arrows", sellAmount: 4, reward: 5 },
    ],
  },
  {
    type: "shop",
    name: "Stone Bank Trading Hall",
    description: "A tall stone building where players meet to swap rare goods safely.",
    x: 39,
    z: 13,
    w: 16,
    d: 12,
    h: 18,
    color: "#77756e",
    roof: "#4b4037",
    sign: "TRADE",
    offers: [
      { label: "Buy a Trade Permit - 12 coins", cost: 12, item: "Trade Permit", amount: 1 },
      { label: "Trade 1 Green Cloth for 10 coins", sell: "Green Cloth", sellAmount: 1, reward: 10 },
    ],
  },
  {
    type: "shop",
    name: "Potion Cottage",
    description: "A cozy cottage with glass bottles, flower boxes, and a mossy green roof.",
    x: 65,
    z: 39,
    w: 12,
    d: 11,
    h: 11,
    color: "#8b6f47",
    roof: "#496b35",
    sign: "POTION",
    offers: [
      { label: "Buy 1 Forest Potion - 9 coins", cost: 9, item: "Forest Potion", amount: 1 },
      { label: "Trade 1 Trade Permit for 2 Forest Potions", give: "Trade Permit", giveAmount: 1, item: "Forest Potion", amount: 2 },
    ],
  },
  {
    type: "player",
    name: "Village Trader Rowan",
    description: "Another player-looking villager ready to swap goods in the town square.",
    x: 34,
    z: 42,
    w: 3,
    d: 3,
    h: 8,
    color: "#245c3a",
    roof: "#245c3a",
    sign: "ROWAN",
    offers: [
      { label: "Trade 1 Forest Potion for 7 coins", sell: "Forest Potion", sellAmount: 1, reward: 7 },
      { label: "Trade 3 Apples for 2 Practice Arrows", give: "Sherwood Apples", giveAmount: 3, item: "Practice Arrows", amount: 2 },
    ],
  },
];

const scenery = [
  { type: "tree", x: 12, z: 15 },
  { type: "tree", x: 70, z: 18 },
  { type: "tree", x: 11, z: 51 },
  { type: "tree", x: 72, z: 58 },
  { type: "well", x: 42, z: 39 },
  { type: "cart", x: 27, z: 35 },
  { type: "cart", x: 57, z: 49 },
];

function normalizeAngle(angle) {
  while (angle > Math.PI) angle -= Math.PI * 2;
  while (angle < -Math.PI) angle += Math.PI * 2;
  return angle;
}

function project(x, z, height = 0) {
  const dx = x - player.x;
  const dz = z - player.z;
  const distance = Math.hypot(dx, dz);
  const angleToPoint = Math.atan2(dz, dx);
  const relative = normalizeAngle(angleToPoint - player.angle);

  if (Math.abs(relative) > world.fov || distance < 0.2) {
    return null;
  }

  const scale = world.focalLength / distance;
  const screenX = canvas.width / 2 + Math.tan(relative) * world.focalLength;
  const horizon = canvas.height * 0.47;
  const groundY = horizon + scale * 18;

  return {
    x: screenX,
    y: groundY - height * scale,
    groundY,
    scale,
    distance,
    relative,
  };
}

function drawSkyAndGround() {
  const sky = ctx.createLinearGradient(0, 0, 0, canvas.height * 0.5);
  sky.addColorStop(0, "#79b8e8");
  sky.addColorStop(1, "#d9ecff");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, canvas.width, canvas.height * 0.5);

  ctx.fillStyle = "#355c2a";
  ctx.fillRect(0, canvas.height * 0.5, canvas.width, canvas.height * 0.5);

  ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
  ctx.lineWidth = 1;
  for (let i = 0; i < 26; i++) {
    const y = canvas.height * 0.52 + i * i * 1.1;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }

  ctx.fillStyle = "#8b6f47";
  ctx.beginPath();
  ctx.moveTo(canvas.width * 0.38, canvas.height);
  ctx.lineTo(canvas.width * 0.47, canvas.height * 0.5);
  ctx.lineTo(canvas.width * 0.53, canvas.height * 0.5);
  ctx.lineTo(canvas.width * 0.64, canvas.height);
  ctx.closePath();
  ctx.fill();
}

function drawBuilding(item) {
  const center = project(item.x, item.z, item.h);
  if (!center) return;

  const width = Math.max(38, item.w * center.scale);
  const height = Math.max(65, item.h * center.scale);
  const x = center.x - width / 2;
  const y = center.groundY - height;

  ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
  ctx.fillRect(x + width * 0.08, center.groundY - 8, width * 0.84, 14);

  ctx.fillStyle = item.color;
  ctx.fillRect(x, y, width, height);

  ctx.fillStyle = "rgba(255,255,255,0.12)";
  ctx.fillRect(x + width * 0.08, y + height * 0.12, width * 0.84, 4);
  ctx.fillRect(x + width * 0.08, y + height * 0.42, width * 0.84, 4);

  ctx.fillStyle = item.roof;
  ctx.beginPath();
  ctx.moveTo(x - width * 0.08, y + height * 0.08);
  ctx.lineTo(x + width * 0.5, y - height * 0.25);
  ctx.lineTo(x + width * 1.08, y + height * 0.08);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#3a2413";
  ctx.fillRect(x + width * 0.43, center.groundY - height * 0.34, width * 0.15, height * 0.34);

  ctx.fillStyle = "#f6d36c";
  for (let i = 0; i < 3; i++) {
    const windowX = x + width * (0.16 + i * 0.28);
    ctx.fillRect(windowX, y + height * 0.26, width * 0.12, height * 0.13);
  }

  ctx.fillStyle = "#1b140c";
  ctx.fillRect(x + width * 0.28, y + height * 0.53, width * 0.44, height * 0.14);
  ctx.fillStyle = "#fff4c5";
  ctx.font = `${Math.max(11, width * 0.075)}px Arial`;
  ctx.textAlign = "center";
  ctx.fillText(item.sign, x + width / 2, y + height * 0.63);
}

function drawPlayerTrader(item) {
  const center = project(item.x, item.z, item.h);
  if (!center) return;

  const bodyWidth = Math.max(28, center.scale * 2.8);
  const bodyHeight = Math.max(76, center.scale * item.h);
  const x = center.x;
  const y = center.groundY - bodyHeight;

  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.beginPath();
  ctx.ellipse(x, center.groundY, bodyWidth, bodyWidth * 0.35, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#f1c27d";
  ctx.beginPath();
  ctx.arc(x, y + bodyHeight * 0.18, bodyWidth * 0.35, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#245c3a";
  ctx.beginPath();
  ctx.moveTo(x - bodyWidth * 0.45, y + bodyHeight * 0.22);
  ctx.lineTo(x, y + bodyHeight * 0.02);
  ctx.lineTo(x + bodyWidth * 0.45, y + bodyHeight * 0.22);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = item.color;
  ctx.fillRect(x - bodyWidth * 0.45, y + bodyHeight * 0.32, bodyWidth * 0.9, bodyHeight * 0.5);

  ctx.strokeStyle = "#3d2410";
  ctx.lineWidth = Math.max(3, center.scale * 0.2);
  ctx.beginPath();
  ctx.arc(x + bodyWidth * 0.62, y + bodyHeight * 0.52, bodyWidth * 0.55, -1.2, 1.2);
  ctx.stroke();

  ctx.fillStyle = "#fff4c5";
  ctx.font = "15px Arial";
  ctx.textAlign = "center";
  ctx.fillText(item.name, x, y - 12);
}

function drawTree(item) {
  const base = project(item.x, item.z, 9);
  if (!base) return;
  const trunkW = Math.max(10, base.scale * 0.9);
  const treeH = Math.max(70, base.scale * 9);

  ctx.fillStyle = "#5f351b";
  ctx.fillRect(base.x - trunkW / 2, base.groundY - treeH * 0.42, trunkW, treeH * 0.42);
  ctx.fillStyle = "#1f6b35";
  ctx.beginPath();
  ctx.arc(base.x, base.groundY - treeH * 0.68, treeH * 0.25, 0, Math.PI * 2);
  ctx.arc(base.x - treeH * 0.18, base.groundY - treeH * 0.55, treeH * 0.2, 0, Math.PI * 2);
  ctx.arc(base.x + treeH * 0.18, base.groundY - treeH * 0.55, treeH * 0.2, 0, Math.PI * 2);
  ctx.fill();
}

function drawSmallProp(item) {
  const base = project(item.x, item.z, 5);
  if (!base) return;
  const size = Math.max(32, base.scale * 4);
  ctx.fillStyle = item.type === "well" ? "#767a75" : "#8a4f2b";
  ctx.fillRect(base.x - size / 2, base.groundY - size * 0.65, size, size * 0.65);
  ctx.fillStyle = item.type === "well" ? "#39413d" : "#3b2413";
  ctx.fillRect(base.x - size * 0.38, base.groundY - size * 0.9, size * 0.76, size * 0.2);
}

function drawRobinHands() {
  ctx.fillStyle = "#244f2c";
  ctx.beginPath();
  ctx.ellipse(canvas.width * 0.26, canvas.height * 0.92, 130, 75, -0.35, 0, Math.PI * 2);
  ctx.ellipse(canvas.width * 0.74, canvas.height * 0.92, 130, 75, 0.35, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#6b3d18";
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.moveTo(canvas.width * 0.77, canvas.height * 0.88);
  ctx.quadraticCurveTo(canvas.width * 0.84, canvas.height * 0.67, canvas.width * 0.7, canvas.height * 0.58);
  ctx.stroke();
}

function render() {
  drawSkyAndGround();

  const drawables = [...traders, ...scenery].sort((a, b) => {
    const da = Math.hypot(a.x - player.x, a.z - player.z);
    const db = Math.hypot(b.x - player.x, b.z - player.z);
    return db - da;
  });

  for (const item of drawables) {
    if (item.type === "shop") drawBuilding(item);
    if (item.type === "player") drawPlayerTrader(item);
    if (item.type === "tree") drawTree(item);
    if (item.type === "well" || item.type === "cart") drawSmallProp(item);
  }

  drawRobinHands();
}

function movePlayer() {
  let forward = 0;
  let strafe = 0;
  if (keys.has("w") || keys.has("arrowup")) forward += 1;
  if (keys.has("s") || keys.has("arrowdown")) forward -= 1;
  if (keys.has("a") || keys.has("arrowleft")) strafe -= 1;
  if (keys.has("d") || keys.has("arrowright")) strafe += 1;
  if (keys.has("q")) player.angle -= 0.035;
  if (keys.has("e")) player.angle += 0.035;

  const nextX = player.x + Math.cos(player.angle) * forward * player.speed + Math.cos(player.angle + Math.PI / 2) * strafe * player.speed;
  const nextZ = player.z + Math.sin(player.angle) * forward * player.speed + Math.sin(player.angle + Math.PI / 2) * strafe * player.speed;

  player.x = Math.min(world.width - 3, Math.max(3, nextX));
  player.z = Math.min(world.depth - 3, Math.max(3, nextZ));
}

function getNearbyTrader() {
  return traders.find((trader) => Math.hypot(trader.x - player.x, trader.z - player.z) < 7) || null;
}

function updatePrompt() {
  activeTrader = getNearbyTrader();
  if (activeTrader) {
    promptBox.textContent = `Press F to trade with ${activeTrader.name}`;
  } else {
    promptBox.textContent = "Walk up to a shop or villager to trade.";
  }
}

function updateInventory() {
  inventoryList.innerHTML = "";
  Object.entries(inventory)
    .filter(([, amount]) => amount > 0)
    .forEach(([item, amount]) => {
      const li = document.createElement("li");
      li.textContent = `${item}: ${amount}`;
      inventoryList.appendChild(li);
    });
  coinCount.textContent = coins;
}

function canTrade(offer) {
  if (offer.cost && coins < offer.cost) return false;
  if (offer.give && (inventory[offer.give] || 0) < offer.giveAmount) return false;
  if (offer.sell && (inventory[offer.sell] || 0) < offer.sellAmount) return false;
  return true;
}

function makeTrade(offer) {
  if (!canTrade(offer)) {
    promptBox.textContent = "You need more items or coins for that trade.";
    return;
  }

  if (offer.cost) coins -= offer.cost;
  if (offer.reward) coins += offer.reward;
  if (offer.give) inventory[offer.give] -= offer.giveAmount;
  if (offer.sell) inventory[offer.sell] -= offer.sellAmount;
  if (offer.item) inventory[offer.item] = (inventory[offer.item] || 0) + offer.amount;

  updateInventory();
  openTrade(activeTrader);
  promptBox.textContent = "Trade complete. Fair deals keep HOODCITY strong.";
}

function openTrade(trader) {
  if (!trader) return;
  tradePanel.classList.add("open");
  tradeTitle.textContent = trader.name;
  tradeDescription.textContent = trader.description;
  tradeOptions.innerHTML = "";

  trader.offers.forEach((offer) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = offer.label;
    button.disabled = !canTrade(offer);
    button.addEventListener("click", () => makeTrade(offer));
    tradeOptions.appendChild(button);
  });
}

function loop() {
  movePlayer();
  updatePrompt();
  render();
  requestAnimationFrame(loop);
}

startButton.addEventListener("click", () => {
  canvas.scrollIntoView({ behavior: "smooth", block: "center" });
  canvas.requestPointerLock?.();
});

closeTrade.addEventListener("click", () => tradePanel.classList.remove("open"));

document.addEventListener("keydown", (event) => {
  keys.add(event.key.toLowerCase());
  if (event.key.toLowerCase() === "f") {
    openTrade(activeTrader);
  }
});

document.addEventListener("keyup", (event) => {
  keys.delete(event.key.toLowerCase());
});

document.addEventListener("mousemove", (event) => {
  if (document.pointerLockElement === canvas) {
    player.angle += event.movementX * 0.0024;
  }
});

updateInventory();
loop();
