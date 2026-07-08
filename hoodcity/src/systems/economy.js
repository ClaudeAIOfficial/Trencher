const STORAGE_KEY = 'hoodcity-save-v1';

const DEFAULT_STATE = {
  gold: 65,
  reputation: 0,
  inventory: { arrows: 12 },
};

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_STATE, inventory: { ...DEFAULT_STATE.inventory } };
    const parsed = JSON.parse(raw);
    return {
      gold: typeof parsed.gold === 'number' ? parsed.gold : DEFAULT_STATE.gold,
      reputation: typeof parsed.reputation === 'number' ? parsed.reputation : 0,
      inventory: parsed.inventory && typeof parsed.inventory === 'object' ? parsed.inventory : { ...DEFAULT_STATE.inventory },
    };
  } catch {
    return { ...DEFAULT_STATE, inventory: { ...DEFAULT_STATE.inventory } };
  }
}

class Economy extends EventTarget {
  constructor() {
    super();
    this.state = load();
  }

  save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch {
      /* ignore quota errors */
    }
    this.dispatchEvent(new CustomEvent('change'));
  }

  get gold() {
    return this.state.gold;
  }

  addGold(amount) {
    this.state.gold = Math.max(0, this.state.gold + amount);
    this.save();
  }

  spendGold(amount) {
    if (this.state.gold < amount) return false;
    this.state.gold -= amount;
    this.save();
    return true;
  }

  addReputation(amount) {
    this.state.reputation = Math.max(0, this.state.reputation + amount);
    this.save();
  }

  get reputation() {
    return this.state.reputation;
  }

  reputationTitle() {
    const r = this.state.reputation;
    if (r >= 200) return 'Legend of Sherwood';
    if (r >= 120) return "The People's Hood";
    if (r >= 60) return 'Known Outlaw';
    if (r >= 20) return 'Petty Thief';
    return 'Newcomer';
  }

  ownedCount(itemId) {
    return this.state.inventory[itemId] || 0;
  }

  addItem(itemId, count = 1) {
    this.state.inventory[itemId] = (this.state.inventory[itemId] || 0) + count;
    this.save();
  }

  removeItem(itemId, count = 1) {
    const current = this.state.inventory[itemId] || 0;
    if (current < count) return false;
    this.state.inventory[itemId] = current - count;
    if (this.state.inventory[itemId] <= 0) delete this.state.inventory[itemId];
    this.save();
    return true;
  }

  get inventory() {
    return this.state.inventory;
  }
}

export const economy = new Economy();
