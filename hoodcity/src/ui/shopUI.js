import { economy } from '../systems/economy.js';
import { showToast } from './hud.js';

const modal = document.getElementById('shop-modal');
const nameEl = document.getElementById('shop-name');
const keeperEl = document.getElementById('shop-keeper');
const flavorEl = document.getElementById('shop-flavor');
const itemsEl = document.getElementById('shop-items');
const goldEl = document.getElementById('shop-gold-amount');
const closeBtn = document.getElementById('shop-close');

let currentShop = null;
let onCloseCallback = null;

function render() {
  goldEl.textContent = economy.gold;
  itemsEl.innerHTML = '';
  if (!currentShop) return;

  currentShop.items.forEach((item) => {
    const owned = economy.ownedCount(item.id);
    const row = document.createElement('div');
    row.className = 'shop-item-row';

    const canBuy = item.buy > 0;
    const canSell = item.sell > 0 && owned > 0;

    row.innerHTML = `
      <div class="shop-item-icon">${item.icon}</div>
      <div class="shop-item-info">
        <div class="shop-item-name">${item.name}</div>
        <div class="shop-item-desc">${item.desc}</div>
        <div class="shop-item-owned">Owned: ${owned}${item.buy > 0 ? ` &middot; Buy: ${item.buy}g` : ''}${item.sell > 0 ? ` &middot; Sell: ${item.sell}g` : ''}</div>
      </div>
      <div class="shop-item-actions">
        ${item.buy > 0 ? `<button class="shop-btn buy" data-action="buy" data-id="${item.id}" ${economy.gold < item.buy ? 'disabled' : ''}>Buy</button>` : ''}
        ${item.sell > 0 ? `<button class="shop-btn sell" data-action="sell" data-id="${item.id}" ${!canSell ? 'disabled' : ''}>Sell</button>` : ''}
      </div>
    `;
    itemsEl.appendChild(row);
  });
}

itemsEl.addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-action]');
  if (!btn || !currentShop) return;
  const { action, id } = btn.dataset;
  const item = currentShop.items.find((it) => it.id === id);
  if (!item) return;

  if (action === 'buy') {
    if (item.id === 'room') {
      if (economy.spendGold(item.buy)) {
        showToast('You rest through the night. Fully restored!');
        window.dispatchEvent(new CustomEvent('hoodcity:rest'));
      } else {
        showToast('Not enough gold.');
      }
    } else if (economy.spendGold(item.buy)) {
      const qty = item.id === 'arrows' ? 10 : 1;
      economy.addItem(item.id, qty);
      showToast(`Bought ${item.name}${qty > 1 ? ` x${qty}` : ''} for ${item.buy}g.`);
    } else {
      showToast('Not enough gold, outlaw.');
    }
  } else if (action === 'sell') {
    if (economy.removeItem(item.id, 1)) {
      economy.addGold(item.sell);
      showToast(`Sold ${item.name} for ${item.sell}g.`);
    }
  }
  render();
});

closeBtn.addEventListener('click', () => closeShop());
modal.addEventListener('click', (e) => {
  if (e.target === modal) closeShop();
});
document.addEventListener('keydown', (e) => {
  if (e.code === 'Escape' && !modal.classList.contains('hidden')) closeShop();
});

export function openShop(shop, onClose) {
  currentShop = shop;
  onCloseCallback = onClose;
  nameEl.textContent = shop.name;
  keeperEl.textContent = shop.keeper;
  flavorEl.textContent = shop.flavor;
  modal.classList.remove('hidden');
  render();
}

export function closeShop() {
  if (modal.classList.contains('hidden')) return;
  modal.classList.add('hidden');
  currentShop = null;
  if (onCloseCallback) onCloseCallback();
}

export function isShopOpen() {
  return !modal.classList.contains('hidden');
}

economy.addEventListener('change', () => {
  if (currentShop) render();
});
