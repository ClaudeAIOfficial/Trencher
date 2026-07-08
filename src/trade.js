import { ITEMS, SHOPS, PLAYER_NAMES, marketableItems } from './data.js';

// ---------- Player economy state ----------
export const state = {
  gold: 150,
  arrows: 30,
  hp: 100,
  inventory: {},          // id -> count
  onlinePlayers: 0,
  marketOffers: [],       // {id,item,price,seller,mine}
  quest: { step: 0, done: false },
};

// ---------- HUD refs ----------
const goldVal = document.getElementById('goldVal');
const arrowVal = document.getElementById('arrowVal');
const hpFill = document.getElementById('hpFill');
const onlineVal = document.getElementById('onlineVal');
const questText = document.getElementById('questText');
const toast = document.getElementById('toast');

// ---------- Shop panel refs ----------
const shopEl = document.getElementById('shop');
const shopName = document.getElementById('shopName');
const shopKeeper = document.getElementById('shopKeeper');
const shopIcon = document.getElementById('shopIcon');
const shopGold = document.getElementById('shopGold');
const paneBuy = document.getElementById('pane-buy');
const paneSell = document.getElementById('pane-sell');
const paneMarket = document.getElementById('pane-market');

let activeShop = null;
let onCloseCb = null;

// ---------- HUD updates ----------
export function refreshHUD() {
  goldVal.textContent = state.gold;
  arrowVal.textContent = state.arrows;
  hpFill.style.width = Math.max(0, state.hp) + '%';
  onlineVal.textContent = state.onlinePlayers;
}

export function showToast(msg) {
  const el = document.createElement('div');
  el.className = 'toast-item';
  el.textContent = msg;
  toast.appendChild(el);
  setTimeout(() => el.remove(), 2600);
}

export function setQuest(text) { questText.textContent = text; }

export function heal(amount) {
  state.hp = Math.min(100, state.hp + amount);
  refreshHUD();
}
export function damage(amount) {
  state.hp = Math.max(0, state.hp - amount);
  refreshHUD();
}

// ---------- Inventory ----------
function owned(id) { return state.inventory[id] || 0; }
function addItem(id, n = 1) { state.inventory[id] = owned(id) + n; }
function removeItem(id, n = 1) {
  state.inventory[id] = Math.max(0, owned(id) - n);
  if (state.inventory[id] === 0) delete state.inventory[id];
}

// ---------- Buying / selling ----------
function buy(id) {
  const item = ITEMS[id];
  const price = item.price;
  if (state.gold < price) { showToast('Not enough gold!'); return; }
  state.gold -= price;
  if (id === 'arrows') state.arrows += 20;
  else if (item.heal) { heal(item.heal); }
  else addItem(id);
  showToast(`Bought ${item.name} for 🪙${price}`);
  advanceQuest('buy');
  refreshHUD(); renderShop();
}

function sell(id) {
  if (owned(id) < 1) return;
  const price = Math.round(ITEMS[id].price * 0.6);
  removeItem(id);
  state.gold += price;
  showToast(`Sold ${ITEMS[id].name} for 🪙${price}`);
  refreshHUD(); renderShop();
}

// ---------- Player market (simulated multiplayer trading) ----------
function randomOffer() {
  const id = marketableItems[Math.floor(Math.random() * marketableItems.length)];
  const base = ITEMS[id].price;
  const price = Math.round(base * (0.55 + Math.random() * 0.8));
  const seller = PLAYER_NAMES[Math.floor(Math.random() * PLAYER_NAMES.length)];
  return { oid: Math.random().toString(36).slice(2), item: id, price, seller, mine: false };
}

export function seedMarket() {
  state.marketOffers = [];
  for (let i = 0; i < 6; i++) state.marketOffers.push(randomOffer());
}

// Simulate players coming online + market activity.
export function tickMarket() {
  // fluctuate online count
  const target = 18 + Math.floor(Math.random() * 40);
  state.onlinePlayers += Math.sign(target - state.onlinePlayers) * Math.min(3, Math.abs(target - state.onlinePlayers));

  // occasionally a new offer appears or an old one "sells"
  if (Math.random() < 0.5 && state.marketOffers.length < 10) {
    const o = randomOffer();
    state.marketOffers.unshift(o);
    if (activeShop && currentTab === 'market') renderMarket();
  }
  if (Math.random() < 0.35 && state.marketOffers.length > 4) {
    const idx = state.marketOffers.findIndex(o => !o.mine);
    if (idx >= 0) {
      state.marketOffers.splice(idx, 1);
      if (activeShop && currentTab === 'market') renderMarket();
    }
  }
  refreshHUD();
}

function buyOffer(oid) {
  const idx = state.marketOffers.findIndex(o => o.oid === oid);
  if (idx < 0) return;
  const o = state.marketOffers[idx];
  if (o.mine) { // cancel own listing
    addItem(o.item);
    state.marketOffers.splice(idx, 1);
    showToast(`Listing withdrawn`);
    refreshHUD(); renderMarket(); return;
  }
  if (state.gold < o.price) { showToast('Not enough gold!'); return; }
  state.gold -= o.price;
  addItem(o.item);
  state.marketOffers.splice(idx, 1);
  showToast(`Traded with ${o.seller}: got ${ITEMS[o.item].name}`);
  advanceQuest('trade');
  refreshHUD(); renderMarket();
}

function listItem(id) {
  if (owned(id) < 1) return;
  const price = Math.round(ITEMS[id].price * 0.9);
  removeItem(id);
  state.marketOffers.unshift({ oid: Math.random().toString(36).slice(2), item: id, price, seller: 'You', mine: true });
  showToast(`Listed ${ITEMS[id].name} on the market for 🪙${price}`);
  refreshHUD(); renderMarket();
}

// ---------- Rendering the shop UI ----------
let currentTab = 'buy';

function itemCard(id, mode) {
  const it = ITEMS[id];
  const div = document.createElement('div');
  div.className = 'item';
  const price = mode === 'sell' ? Math.round(it.price * 0.6) : it.price;
  const canBuy = state.gold >= it.price;
  const have = owned(id);
  div.innerHTML = `
    <div class="item-top"><span class="item-emoji">${it.emoji}</span>
      <span class="item-name">${it.name}</span></div>
    <div class="item-desc">${it.desc}</div>
    <div class="item-foot">
      <span class="item-price">🪙 ${price}</span>
      ${mode === 'sell' ? `<span class="item-owned">x${have}</span>` : ''}
      <button class="item-btn ${mode === 'sell' ? 'sell' : ''}"
        ${mode === 'buy' && !canBuy ? 'disabled' : ''}
        ${mode === 'sell' && have < 1 ? 'disabled' : ''}>
        ${mode === 'sell' ? 'Sell' : (id === 'arrows' ? 'Buy x20' : 'Buy')}
      </button>
    </div>`;
  div.querySelector('button').addEventListener('click', () => mode === 'sell' ? sell(id) : buy(id));
  return div;
}

function renderBuy() {
  paneBuy.innerHTML = '';
  activeShop.stock.forEach(id => paneBuy.appendChild(itemCard(id, 'buy')));
}

function renderSell() {
  paneSell.innerHTML = '';
  const sellable = Object.keys(state.inventory).filter(id => owned(id) > 0);
  if (sellable.length === 0) {
    paneSell.innerHTML = `<div class="empty-note">Your satchel is empty. Buy or trade for goods first.</div>`;
    return;
  }
  sellable.forEach(id => paneSell.appendChild(itemCard(id, 'sell')));
}

function renderMarket() {
  paneMarket.innerHTML = '';
  const head = document.createElement('div');
  head.className = 'market-head';
  head.innerHTML = `<h3>🌍 Live Player Market</h3>
    <span class="offer-seller"><span class="dot-live"></span>${state.onlinePlayers} traders online</span>`;
  paneMarket.appendChild(head);

  if (state.marketOffers.length === 0) {
    const n = document.createElement('div');
    n.className = 'empty-note'; n.textContent = 'No offers right now — check back soon!';
    paneMarket.appendChild(n);
  } else {
    state.marketOffers.forEach(o => {
      const it = ITEMS[o.item];
      const row = document.createElement('div');
      row.className = 'offer';
      row.innerHTML = `
        <span class="offer-emoji">${it.emoji}</span>
        <div class="offer-info">
          <div class="offer-title">${it.name}</div>
          <div class="offer-seller"><span class="dot-live"></span>${o.mine ? 'Your listing' : 'from ' + o.seller}</div>
        </div>
        <span class="offer-price">🪙 ${o.price}</span>
        <button class="item-btn ${o.mine ? 'sell' : ''}">${o.mine ? 'Withdraw' : 'Trade'}</button>`;
      row.querySelector('button').addEventListener('click', () => buyOffer(o.oid));
      paneMarket.appendChild(row);
    });
  }

  // Section to list your own items for other players
  const mine = Object.keys(state.inventory).filter(id => owned(id) > 0);
  const sub = document.createElement('div');
  sub.className = 'sell-mine';
  sub.textContent = mine.length ? 'Sell your goods to other players:' : 'Acquire goods to list them for other players.';
  paneMarket.appendChild(sub);
  mine.forEach(id => {
    const it = ITEMS[id];
    const row = document.createElement('div');
    row.className = 'offer';
    row.innerHTML = `
      <span class="offer-emoji">${it.emoji}</span>
      <div class="offer-info"><div class="offer-title">${it.name} <span class="item-owned">x${owned(id)}</span></div>
      <div class="offer-seller">List for 🪙${Math.round(it.price * 0.9)}</div></div>
      <button class="item-btn">List</button>`;
    row.querySelector('button').addEventListener('click', () => listItem(id));
    paneMarket.appendChild(row);
  });
}

function renderShop() {
  shopGold.textContent = state.gold;
  if (currentTab === 'buy') renderBuy();
  else if (currentTab === 'sell') renderSell();
  else renderMarket();
}

// ---------- Open / close ----------
export function openShop(shop, closeCb) {
  activeShop = shop;
  onCloseCb = closeCb;
  shopName.textContent = shop.name;
  shopKeeper.textContent = 'Keeper: ' + shop.keeper;
  shopIcon.textContent = shop.icon;
  currentTab = 'buy';
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === 'buy'));
  document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
  paneBuy.classList.add('active');
  renderShop();
  shopEl.classList.remove('hidden');
  advanceQuest('open');
}

export function closeShop() {
  shopEl.classList.add('hidden');
  activeShop = null;
  if (onCloseCb) onCloseCb();
}

export function isShopOpen() { return !shopEl.classList.contains('hidden'); }

// ---------- Quest flow ----------
const QUESTS = [
  'Explore HOODCITY and press E at a shop to start trading.',
  'Buy any item from a keeper to stock your satchel.',
  'Open the Player Market tab and trade with another player.',
  'You are a true merchant of Sherwood! Keep trading and exploring.',
];
function advanceQuest(kind) {
  const s = state.quest;
  if (s.step === 0 && kind === 'open') { s.step = 1; setQuest(QUESTS[1]); showToast('Quest updated!'); }
  else if (s.step === 1 && kind === 'buy') { s.step = 2; setQuest(QUESTS[2]); showToast('Quest updated!'); }
  else if (s.step === 2 && kind === 'trade') { s.step = 3; setQuest(QUESTS[3]); showToast('Quest complete! 🎉'); }
}

// ---------- Wire tab + close buttons ----------
export function initShopUI() {
  document.getElementById('shopClose').addEventListener('click', closeShop);
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      currentTab = tab.dataset.tab;
      document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t === tab));
      document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
      document.getElementById('pane-' + currentTab).classList.add('active');
      renderShop();
    });
  });
  setQuest(QUESTS[0]);
  seedMarket();
  state.onlinePlayers = 24;
  refreshHUD();
}
