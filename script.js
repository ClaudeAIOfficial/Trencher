const gameFrame = document.querySelector("#gameFrame");
const camera = document.querySelector("#camera");
const enterButton = document.querySelector("#enterGame");
const coords = document.querySelector("#coords");
const zoneName = document.querySelector("#zoneName");
const tradeModal = document.querySelector("#tradeModal");
const closeTrade = document.querySelector("#closeTrade");
const shopTitle = document.querySelector("#shopTitle");
const shopDescription = document.querySelector("#shopDescription");
const tradeItems = document.querySelector("#tradeItems");
const makeTrade = document.querySelector("#makeTrade");
const tradeResponse = document.querySelector("#tradeResponse");

const shops = {
  archery: {
    title: "Oak Bow Shop",
    description: "A timber archery store for trading bows, arrows, and rare forest gear.",
    items: [
      ["Longbow", "Trade value: 120 coins"],
      ["Golden Arrow Pack", "Trade value: 80 coins"],
      ["Target Badge", "Trade value: player offer"],
      ["Forest Quiver", "Trade value: 65 coins"]
    ]
  },
  market: {
    title: "Sherwood Market",
    description: "A busy market building where players swap food boosts and useful city supplies.",
    items: [
      ["Apple Crate", "Trade value: 25 coins"],
      ["Lantern", "Trade value: 40 coins"],
      ["Coin Pouch", "Trade value: player offer"],
      ["Map Fragment", "Trade value: 90 coins"]
    ]
  },
  blacksmith: {
    title: "Iron Forge",
    description: "A stone forge with smoke, tools, and armor upgrades for serious traders.",
    items: [
      ["Iron Grapple", "Trade value: 140 coins"],
      ["Knight Plate", "Trade value: 160 coins"],
      ["Forge Hammer", "Trade value: player offer"],
      ["Steel Boots", "Trade value: 100 coins"]
    ]
  },
  tailor: {
    title: "Cloak Tailor",
    description: "A realistic clothing shop for capes, hoods, boots, and Robin Hood cosmetics.",
    items: [
      ["Emerald Hood", "Trade value: 75 coins"],
      ["Royal Cape", "Trade value: 130 coins"],
      ["Leather Boots", "Trade value: 55 coins"],
      ["Outlaw Gloves", "Trade value: player offer"]
    ]
  },
  bank: {
    title: "Trade Hall",
    description: "The central safe-trade building where players review and confirm offers.",
    items: [
      ["Trade Permit", "Trade value: 20 coins"],
      ["VIP Stall", "Trade value: 220 coins"],
      ["Guild Token", "Trade value: player offer"],
      ["City Deed", "Trade value: 300 coins"]
    ]
  }
};

const player = {
  x: 0,
  z: 0,
  yaw: 0,
  pitch: 0
};

const pressedKeys = new Set();
let looking = false;
let lastTradeShop = "market";

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function updateCamera() {
  const sway = Math.sin(Date.now() / 200) * (pressedKeys.size ? 2 : 0);
  camera.style.transform = `
    rotateX(${player.pitch}deg)
    rotateY(${player.yaw}deg)
    translate3d(${-player.x}px, ${sway}px, ${player.z * 12}px)
  `;

  coords.textContent = `X ${Math.round(player.x)} | Z ${Math.round(player.z)}`;

  if (player.z > 74) {
    zoneName.textContent = "Trade Hall";
  } else if (player.z > 52) {
    zoneName.textContent = "Tailor District";
  } else if (player.z > 36) {
    zoneName.textContent = "Forge Row";
  } else if (Math.abs(player.x) > 26) {
    zoneName.textContent = player.x < 0 ? "Archer's Walk" : "Market Lane";
  } else {
    zoneName.textContent = "Town Gate";
  }
}

function movementLoop() {
  let speed = pressedKeys.has("shift") ? 1.15 : 0.68;
  let dx = 0;
  let dz = 0;

  if (pressedKeys.has("w") || pressedKeys.has("arrowup")) dz += speed;
  if (pressedKeys.has("s") || pressedKeys.has("arrowdown")) dz -= speed;
  if (pressedKeys.has("a") || pressedKeys.has("arrowleft")) dx -= speed;
  if (pressedKeys.has("d") || pressedKeys.has("arrowright")) dx += speed;

  if (dx || dz) {
    const radians = (player.yaw * Math.PI) / 180;
    const forwardX = Math.sin(radians);
    const forwardZ = Math.cos(radians);
    const rightX = Math.cos(radians);
    const rightZ = -Math.sin(radians);

    player.x = clamp(player.x + forwardX * dz + rightX * dx, -62, 62);
    player.z = clamp(player.z + forwardZ * dz + rightZ * dx, -7, 92);
    updateCamera();
  }

  requestAnimationFrame(movementLoop);
}

function openShop(shopKey) {
  const shop = shops[shopKey];
  lastTradeShop = shopKey;
  shopTitle.textContent = shop.title;
  shopDescription.textContent = shop.description;
  tradeResponse.textContent = "";
  tradeItems.innerHTML = shop.items
    .map(([name, value]) => `<div class="trade-item"><strong>${name}</strong><span>${value}</span></div>`)
    .join("");
  tradeModal.showModal();
}

enterButton.addEventListener("click", () => {
  gameFrame.focus();
  gameFrame.classList.add("is-looking");
  if (gameFrame.requestPointerLock) {
    gameFrame.requestPointerLock();
  }
});

document.addEventListener("pointerlockchange", () => {
  looking = document.pointerLockElement === gameFrame;
  gameFrame.classList.toggle("is-looking", looking);
});

gameFrame.addEventListener("mousemove", (event) => {
  if (!looking && event.buttons !== 1) return;
  player.yaw = (player.yaw + event.movementX * 0.08) % 360;
  player.pitch = clamp(player.pitch - event.movementY * 0.05, -14, 12);
  updateCamera();
});

gameFrame.addEventListener("click", (event) => {
  const building = event.target.closest(".building");
  if (!building) {
    gameFrame.focus();
    return;
  }
  openShop(building.dataset.shop);
});

window.addEventListener("keydown", (event) => {
  pressedKeys.add(event.key.toLowerCase());
});

window.addEventListener("keyup", (event) => {
  pressedKeys.delete(event.key.toLowerCase());
});

closeTrade.addEventListener("click", () => {
  tradeModal.close();
  gameFrame.focus();
});

makeTrade.addEventListener("click", () => {
  const shop = shops[lastTradeShop];
  const item = shop.items[Math.floor(Math.random() * shop.items.length)][0];
  tradeResponse.textContent = `Trade offer posted for ${item}. Nearby players can now counter-offer in ${shop.title}.`;
});

updateCamera();
movementLoop();
