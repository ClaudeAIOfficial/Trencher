import { ITEMS } from './items.js';

export class TradingSystem {
  constructor(player, ui) {
    this.player = player;
    this.ui = ui;
    this.currentMerchant = null;
    this.currentType = null;
    this.merchantStock = [];
  }

  openShop(shop) {
    this.currentType = 'shop';
    this.currentMerchant = shop;
    this.merchantStock = [...shop.stock];
    this.ui.showTradePanel(shop.merchant.name, shop.name);
    this.refreshUI();
  }

  openTravelerTrade(traveler) {
    this.currentType = 'traveler';
    this.currentMerchant = traveler;
    this.merchantStock = [...traveler.offers];
    this.ui.showTradePanel(traveler.name, 'Wandering Trader');
    this.refreshUI();
  }

  close() {
    this.currentMerchant = null;
    this.currentType = null;
    this.merchantStock = [];
    this.ui.hideTradePanel();
  }

  isOpen() {
    return this.currentMerchant !== null;
  }

  buyItem(itemId) {
    const item = ITEMS[itemId];
    if (!item) return false;

    if (this.currentType === 'shop') {
      if (!this.merchantStock.includes(itemId)) return false;
      if (this.player.gold < item.price) {
        this.ui.notify('Not enough gold!', 'error');
        return false;
      }
      this.player.gold -= item.price;
      this.player.addItem(itemId);
      this.ui.notify(`Bought ${item.name} for ${item.price} gold`);
      this.refreshUI();
      return true;
    }

    if (this.currentType === 'traveler') {
      const offerIdx = this.merchantStock.indexOf(itemId);
      if (offerIdx === -1) return false;

      const wants = this.currentMerchant.wants[offerIdx] || this.currentMerchant.wants[0];
      if (!this.player.hasItem(wants)) {
        this.ui.notify(`They want a ${ITEMS[wants]?.name || wants} in exchange!`, 'error');
        return false;
      }
      this.player.removeItem(wants);
      this.player.addItem(itemId);
      this.merchantStock.splice(offerIdx, 1);
      this.ui.notify(`Traded ${ITEMS[wants].name} for ${item.name}`);
      this.refreshUI();
      return true;
    }

    return false;
  }

  sellItem(itemId) {
    const item = ITEMS[itemId];
    if (!item) return false;
    if (!this.player.hasItem(itemId)) return false;

    const sellPrice = Math.floor(item.price * 0.6);
    this.player.removeItem(itemId);
    this.player.gold += sellPrice;

    if (this.currentType === 'shop' && !this.merchantStock.includes(itemId)) {
      this.merchantStock.push(itemId);
    }

    this.ui.notify(`Sold ${item.name} for ${sellPrice} gold`);
    this.refreshUI();
    return true;
  }

  refreshUI() {
    this.ui.updateGold(this.player.gold);
    this.ui.updateHealth(this.player.health);
    this.ui.updateQuickInventory(this.player.inventory);

    if (!this.isOpen()) return;

    const merchantItems = document.getElementById('merchant-items');
    const playerItems = document.getElementById('player-items');
    merchantItems.innerHTML = '';
    playerItems.innerHTML = '';

    if (this.currentType === 'shop') {
      this.merchantStock.forEach((itemId) => {
        const item = ITEMS[itemId];
        if (!item) return;
        const el = this.createItemElement(item, 'buy', item.price);
        el.addEventListener('click', () => this.buyItem(itemId));
        merchantItems.appendChild(el);
      });
    } else if (this.currentType === 'traveler') {
      this.merchantStock.forEach((itemId, i) => {
        const item = ITEMS[itemId];
        if (!item) return;
        const wants = this.currentMerchant.wants[i] || this.currentMerchant.wants[0];
        const wantsItem = ITEMS[wants];
        const el = this.createItemElement(item, 'trade', `↔ ${wantsItem?.icon || '?'}`);
        el.addEventListener('click', () => this.buyItem(itemId));
        merchantItems.appendChild(el);
      });
    }

    const uniquePlayerItems = [...new Set(this.player.inventory)];
    uniquePlayerItems.forEach((itemId) => {
      const item = ITEMS[itemId];
      if (!item) return;
      const count = this.player.inventory.filter((i) => i === itemId).length;
      const sellPrice = Math.floor(item.price * 0.6);
      const el = this.createItemElement(item, 'sell', sellPrice, count);
      el.addEventListener('click', () => this.sellItem(itemId));
      playerItems.appendChild(el);
    });

    document.getElementById('trade-gold').textContent = this.player.gold;
  }

  createItemElement(item, type, price, count = 1) {
    const el = document.createElement('div');
    el.className = type === 'buy' ? 'trade-item' : 'inv-item';
    el.innerHTML = `
      <span class="item-icon">${item.icon}</span>
      <span class="item-name">${item.name}${count > 1 ? ` x${count}` : ''}</span>
      <span class="item-price">${type === 'trade' ? price : `${price} 🪙`}</span>
    `;
    return el;
  }

  openInventory() {
    const grid = document.getElementById('full-inventory');
    grid.innerHTML = '';

    if (this.player.inventory.length === 0) {
      grid.innerHTML = '<p style="grid-column: 1/-1; text-align:center; color:#999;">Your satchel is empty</p>';
    } else {
      const uniqueItems = [...new Set(this.player.inventory)];
      uniqueItems.forEach((itemId) => {
        const item = ITEMS[itemId];
        if (!item) return;
        const count = this.player.inventory.filter((i) => i === itemId).length;
        const el = document.createElement('div');
        el.className = 'inv-item';
        el.innerHTML = `
          <span class="item-icon">${item.icon}</span>
          <span class="item-name">${item.name}${count > 1 ? ` x${count}` : ''}</span>
          <span class="item-price">${item.price} 🪙</span>
        `;
        grid.appendChild(el);
      });
    }

    document.getElementById('inv-gold').textContent = this.player.gold;
    this.ui.showInventoryPanel();
  }
}
