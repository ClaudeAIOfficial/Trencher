import { ITEMS, getPrice } from './items.js';

export class TradingSystem {
  constructor() {
    this.gold = 100;
    this.reputation = 0;
    this.inventory = {
      hood_cloak: 1,
      arrows: 2,
      healing_herb: 3,
      bread_loaf: 2,
    };
    this.currentShop = null;
    this.currentNPC = null;
    this.playerOffer = {};
    this.onUpdate = null;
  }

  getItemCount(itemId) {
    return this.inventory[itemId] || 0;
  }

  addItem(itemId, qty = 1) {
    this.inventory[itemId] = (this.inventory[itemId] || 0) + qty;
    this.notify();
  }

  removeItem(itemId, qty = 1) {
    if ((this.inventory[itemId] || 0) < qty) return false;
    this.inventory[itemId] -= qty;
    if (this.inventory[itemId] <= 0) delete this.inventory[itemId];
    this.notify();
    return true;
  }

  buyFromShop(shop, itemId, stockEntry) {
    const price = getPrice(itemId, stockEntry.priceMod);
    if (this.gold < price) {
      this.log('Not enough gold!');
      return false;
    }
    if (stockEntry.qty <= 0) {
      this.log('Out of stock!');
      return false;
    }
    this.gold -= price;
    this.addItem(itemId);
    stockEntry.qty--;
    this.reputation += 1;
    this.log(`Bought ${ITEMS[itemId].name} for ${price} gold`);
    this.notify();
    return true;
  }

  sellToShop(shop, itemId) {
    if (!shop.buys.includes(itemId)) {
      this.log("They don't buy that item.");
      return false;
    }
    if (!this.removeItem(itemId)) {
      this.log("You don't have that item.");
      return false;
    }
    const sellPrice = Math.round(getPrice(itemId) * 0.7);
    this.gold += sellPrice;
    this.reputation += 2;
    this.log(`Sold ${ITEMS[itemId].name} for ${sellPrice} gold`);
    this.notify();
    return true;
  }

  initPlayerTrade(npc) {
    this.currentNPC = npc;
    this.playerOffer = {};
    const offerItems = Object.keys(ITEMS).filter(id => id !== 'gold_coin');
    const shuffled = offerItems.sort(() => Math.random() - 0.5);
    npc.wants = shuffled.slice(0, 2 + Math.floor(Math.random() * 2));
    npc.offers = shuffled.slice(2, 4 + Math.floor(Math.random() * 2)).map(id => ({
      item: id,
      qty: 1,
    }));
    npc.satisfied = false;
  }

  addToOffer(itemId) {
    if (!this.getItemCount(itemId)) return;
    this.playerOffer[itemId] = (this.playerOffer[itemId] || 0) + 1;
    this.removeItem(itemId);
    this.checkNPCSatisfaction();
    this.notify();
  }

  removeFromOffer(itemId) {
    if (!this.playerOffer[itemId]) return;
    this.playerOffer[itemId]--;
    this.addItem(itemId);
    if (this.playerOffer[itemId] <= 0) delete this.playerOffer[itemId];
    this.checkNPCSatisfaction();
    this.notify();
  }

  checkNPCSatisfaction() {
    if (!this.currentNPC) return;
    const npc = this.currentNPC;
    npc.satisfied = npc.wants.every(w => (this.playerOffer[w] || 0) >= 1);
  }

  confirmPlayerTrade() {
    if (!this.currentNPC || !this.currentNPC.satisfied) return false;
    for (const offer of this.currentNPC.offers) {
      this.addItem(offer.item, offer.qty);
    }
    this.reputation += 5;
    this.log(`Trade with ${this.currentNPC.name} complete!`);
    this.currentNPC = null;
    this.playerOffer = {};
    this.notify();
    return true;
  }

  log(msg) {
    const el = document.getElementById('trade-log');
    if (el) {
      const p = document.createElement('p');
      p.textContent = msg;
      el.appendChild(p);
      el.scrollTop = el.scrollHeight;
    }
  }

  notify() {
    if (this.onUpdate) this.onUpdate();
  }

  updateHUD() {
    document.getElementById('gold-amount').textContent = this.gold;
    document.getElementById('rep-amount').textContent = this.reputation;
  }

  renderInventory(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';
    for (const [itemId, qty] of Object.entries(this.inventory)) {
      const item = ITEMS[itemId];
      if (!item) continue;
      container.appendChild(this.createItemCard(item, qty));
    }
    if (Object.keys(this.inventory).length === 0) {
      container.innerHTML = '<p style="color:#aaa;grid-column:1/-1">Your satchel is empty.</p>';
    }
  }

  renderShopTrade(shop) {
    this.currentShop = shop;
    document.getElementById('trade-title').textContent = `${shop.icon} ${shop.name}`;
    document.getElementById('trader-name').textContent = shop.merchant;
    document.getElementById('trade-log').innerHTML = '';

    const traderContainer = document.getElementById('trader-items');
    traderContainer.innerHTML = '';
    for (const entry of shop.stock) {
      if (entry.qty <= 0) continue;
      const item = ITEMS[entry.item];
      const card = this.createItemCard(item, entry.qty, getPrice(entry.item, entry.priceMod));
      card.addEventListener('click', () => this.buyFromShop(shop, entry.item, entry));
      traderContainer.appendChild(card);
    }

    const playerContainer = document.getElementById('player-trade-items');
    playerContainer.innerHTML = '';
    for (const [itemId, qty] of Object.entries(this.inventory)) {
      if (!shop.buys.includes(itemId)) continue;
      const item = ITEMS[itemId];
      const sellPrice = Math.round(getPrice(itemId) * 0.7);
      const card = this.createItemCard(item, qty, sellPrice);
      card.addEventListener('click', () => this.sellToShop(shop, itemId));
      playerContainer.appendChild(card);
    }
    this.updateHUD();
  }

  renderPlayerTrade(npc) {
    document.getElementById('player-trade-title').textContent = `🤝 Trade with ${npc.name}`;
    document.getElementById('npc-name').textContent = `${npc.name} wants:`;

    const npcContainer = document.getElementById('npc-offer');
    npcContainer.innerHTML = '';
    for (const want of npc.wants) {
      const item = ITEMS[want];
      const has = (this.playerOffer[want] || 0) >= 1;
      const card = this.createItemCard(item, 1);
      card.style.borderColor = has ? '#4a4' : '#a44';
      npcContainer.appendChild(card);
    }
    const offersLabel = document.createElement('p');
    offersLabel.textContent = 'They offer:';
    offersLabel.style.cssText = 'color:#e8c84a;margin:0.5rem 0;grid-column:1/-1';
    npcContainer.appendChild(offersLabel);
    for (const offer of npc.offers) {
      const item = ITEMS[offer.item];
      npcContainer.appendChild(this.createItemCard(item, offer.qty));
    }

    const offerContainer = document.getElementById('your-offer');
    offerContainer.innerHTML = '';
    for (const [itemId, qty] of Object.entries(this.inventory)) {
      const item = ITEMS[itemId];
      const card = this.createItemCard(item, qty);
      card.addEventListener('click', () => this.addToOffer(itemId));
      offerContainer.appendChild(card);
    }
    for (const [itemId, qty] of Object.entries(this.playerOffer)) {
      const item = ITEMS[itemId];
      const card = this.createItemCard(item, qty);
      card.style.borderColor = '#4a4';
      card.addEventListener('click', () => this.removeFromOffer(itemId));
      offerContainer.appendChild(card);
    }

    const btn = document.getElementById('confirm-trade-btn');
    btn.disabled = !npc.satisfied;
    this.updateHUD();
  }

  createItemCard(item, qty, price) {
    const card = document.createElement('div');
    card.className = 'item-card';
    card.innerHTML = `
      <div class="icon">${item.icon}</div>
      <div class="name">${item.name}</div>
      ${price !== undefined ? `<div class="price">🪙 ${price}</div>` : ''}
      <div class="qty">x${qty}</div>
    `;
    return card;
  }
}
