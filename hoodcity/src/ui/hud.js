import { economy } from '../systems/economy.js';

const ITEM_ICONS = {
  sword: '🗡️', shield: '🛡️', arrows: '🏹', helmet: '⛑️', longbow: '🏹',
  quiver: '🎯', bread: '🍞', cheese: '🧀', apple: '🍎', pie: '🥧',
  hood: '🧥', cloak: '🥋', boots: '👢', ale: '🍺', potion: '🧪',
  room: '🛏️', goldbar: '💰', jewels: '💎', chalice: '🏆',
};

const goldAmountEl = document.getElementById('gold-amount');
const shopGoldAmountEl = document.getElementById('shop-gold-amount');
const repBarEl = document.getElementById('rep-bar');
const repLabelEl = document.getElementById('rep-label');
const healthBarEl = document.getElementById('health-bar');
const staminaBarEl = document.getElementById('stamina-bar');
const interactPromptEl = document.getElementById('interact-prompt');
const inventoryBarEl = document.getElementById('inventory-bar');
const arrowCountEl = document.getElementById('arrow-count');
const toastContainer = document.getElementById('toast-container');
const questToastEl = document.getElementById('quest-toast');
const compassStripEl = document.getElementById('compass-strip');

const COMPASS_DIRS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
const LABEL_WIDTH = 160;
const PX_PER_DEG = LABEL_WIDTH / 45;
const REPEATS = 5;
const MIDDLE_REPEAT = Math.floor(REPEATS / 2);

let compassBuilt = false;
function buildCompass() {
  if (compassBuilt) return;
  const labels = [];
  for (let r = 0; r < REPEATS; r++) labels.push(...COMPASS_DIRS);
  compassStripEl.innerHTML = labels.map((d) => `<span>${d}</span>`).join('');
  compassBuilt = true;
}

export function updateHUD({ health = 100, stamina = 100, yaw = 0 } = {}) {
  goldAmountEl.textContent = economy.gold;
  shopGoldAmountEl.textContent = economy.gold;
  const repPct = Math.min(100, (economy.reputation / 200) * 100);
  repBarEl.style.width = `${repPct}%`;
  repLabelEl.textContent = economy.reputationTitle();
  healthBarEl.style.width = `${Math.max(0, health)}%`;
  staminaBarEl.style.width = `${Math.max(0, stamina)}%`;
  arrowCountEl.textContent = economy.ownedCount('arrows');

  const inv = economy.inventory;
  const entries = Object.entries(inv).filter(([, count]) => count > 0);
  inventoryBarEl.innerHTML = entries
    .slice(0, 8)
    .map(([id, count]) => `<div class="inv-slot">${ITEM_ICONS[id] || '❔'}<span class="inv-count">${count}</span></div>`)
    .join('');

  buildCompass();
  const deg = ((-yaw * 180) / Math.PI + 360) % 360;
  const headingPx = MIDDLE_REPEAT * COMPASS_DIRS.length * LABEL_WIDTH + deg * PX_PER_DEG;
  const containerCenter = 130;
  compassStripEl.style.transform = `translateX(${containerCenter - headingPx}px)`;
}

export function showPrompt(text) {
  interactPromptEl.textContent = text;
  interactPromptEl.classList.remove('hidden');
}

export function hidePrompt() {
  interactPromptEl.classList.add('hidden');
}

export function showToast(message) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = message;
  toastContainer.appendChild(el);
  setTimeout(() => el.remove(), 3200);
}

let questTimeout = null;
export function showQuestToast(message) {
  questToastEl.textContent = message;
  questToastEl.classList.remove('hidden');
  clearTimeout(questTimeout);
  questTimeout = setTimeout(() => questToastEl.classList.add('hidden'), 3800);
}
