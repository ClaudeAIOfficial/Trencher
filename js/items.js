export const ITEMS = {
  gold_coin: { id: 'gold_coin', name: 'Gold Coins', icon: '🪙', basePrice: 1, type: 'currency' },
  longbow: { id: 'longbow', name: 'Longbow', icon: '🏹', basePrice: 45, type: 'weapon' },
  arrows: { id: 'arrows', name: 'Arrows (x10)', icon: '➹', basePrice: 12, type: 'ammo' },
  leather_armor: { id: 'leather_armor', name: 'Leather Armor', icon: '🦺', basePrice: 60, type: 'armor' },
  hood_cloak: { id: 'hood_cloak', name: 'Forest Hood', icon: '🧥', basePrice: 35, type: 'armor' },
  healing_herb: { id: 'healing_herb', name: 'Healing Herb', icon: '🌿', basePrice: 8, type: 'consumable' },
  iron_sword: { id: 'iron_sword', name: 'Iron Sword', icon: '⚔️', basePrice: 55, type: 'weapon' },
  bread_loaf: { id: 'bread_loaf', name: 'Bread Loaf', icon: '🍞', basePrice: 3, type: 'food' },
  ale_mug: { id: 'ale_mug', name: 'Mead Mug', icon: '🍺', basePrice: 5, type: 'food' },
  gem_ruby: { id: 'gem_ruby', name: 'Ruby Gem', icon: '💎', basePrice: 120, type: 'treasure' },
  silver_ring: { id: 'silver_ring', name: 'Silver Ring', icon: '💍', basePrice: 40, type: 'treasure' },
  rope_coil: { id: 'rope_coil', name: 'Rope Coil', icon: '🪢', basePrice: 6, type: 'tool' },
  lockpick: { id: 'lockpick', name: 'Lockpick Set', icon: '🔧', basePrice: 15, type: 'tool' },
  feather_cap: { id: 'feather_cap', name: 'Feather Cap', icon: '🎩', basePrice: 20, type: 'armor' },
  venison: { id: 'venison', name: 'Roast Venison', icon: '🥩', basePrice: 10, type: 'food' },
};

export const SHOPS = [
  {
    id: 'archer_supply',
    name: "Will Scarlet's Archer Supply",
    icon: '🏹',
    color: 0x4a6741,
    position: { x: -18, z: -12 },
    rotation: Math.PI / 4,
    merchant: 'Will Scarlet',
    stock: [
      { item: 'longbow', qty: 5, priceMod: 1.0 },
      { item: 'arrows', qty: 20, priceMod: 0.9 },
      { item: 'hood_cloak', qty: 3, priceMod: 1.1 },
      { item: 'feather_cap', qty: 4, priceMod: 1.0 },
      { item: 'rope_coil', qty: 8, priceMod: 0.95 },
    ],
    buys: ['arrows', 'feather_cap', 'rope_coil'],
  },
  {
    id: 'blacksmith',
    name: "Little John's Forge",
    icon: '⚒️',
    color: 0x5c3d2e,
    position: { x: 18, z: -12 },
    rotation: -Math.PI / 4,
    merchant: 'Little John',
    stock: [
      { item: 'iron_sword', qty: 4, priceMod: 1.0 },
      { item: 'leather_armor', qty: 3, priceMod: 1.15 },
      { item: 'lockpick', qty: 6, priceMod: 1.0 },
      { item: 'rope_coil', qty: 5, priceMod: 1.0 },
    ],
    buys: ['iron_sword', 'leather_armor', 'lockpick', 'gem_ruby'],
  },
  {
    id: 'tavern',
    name: "The Merry Outlaw Tavern",
    icon: '🍺',
    color: 0x6b4423,
    position: { x: -18, z: 12 },
    rotation: -Math.PI / 4,
    merchant: 'Friar Tuck',
    stock: [
      { item: 'ale_mug', qty: 30, priceMod: 0.8 },
      { item: 'bread_loaf', qty: 15, priceMod: 0.85 },
      { item: 'venison', qty: 8, priceMod: 1.0 },
      { item: 'healing_herb', qty: 10, priceMod: 1.0 },
    ],
    buys: ['venison', 'healing_herb', 'bread_loaf'],
  },
  {
    id: 'jeweler',
    name: "Maid Marian's Jewels",
    icon: '💎',
    color: 0x4a3060,
    position: { x: 18, z: 12 },
    rotation: Math.PI / 4,
    merchant: 'Maid Marian',
    stock: [
      { item: 'gem_ruby', qty: 2, priceMod: 1.2 },
      { item: 'silver_ring', qty: 5, priceMod: 1.0 },
      { item: 'feather_cap', qty: 2, priceMod: 1.1 },
    ],
    buys: ['gem_ruby', 'silver_ring', 'gold_coin'],
  },
  {
    id: 'market',
    name: 'Sherwood Central Market',
    icon: '🏪',
    color: 0x8b7355,
    position: { x: 0, z: -22 },
    rotation: 0,
    merchant: 'Robin Hood',
    stock: [
      { item: 'healing_herb', qty: 15, priceMod: 0.9 },
      { item: 'arrows', qty: 25, priceMod: 0.85 },
      { item: 'bread_loaf', qty: 20, priceMod: 0.8 },
      { item: 'rope_coil', qty: 10, priceMod: 0.9 },
      { item: 'lockpick', qty: 4, priceMod: 1.0 },
      { item: 'hood_cloak', qty: 2, priceMod: 1.0 },
    ],
    buys: ['longbow', 'arrows', 'healing_herb', 'venison', 'ale_mug', 'iron_sword'],
  },
];

export const NPC_TRADERS = [
  { name: 'Traveling Merchant', icon: '🧳', color: 0x8b6914 },
  { name: 'Forest Ranger', icon: '🌲', color: 0x2d5a27 },
  { name: 'Noble\'s Servant', icon: '👤', color: 0x4a4a6a },
  { name: 'Wandering Bard', icon: '🎵', color: 0x6a4a8a },
  { name: 'Poacher', icon: '🦌', color: 0x5a4a3a },
];

export function getPrice(itemId, priceMod = 1) {
  const item = ITEMS[itemId];
  return item ? Math.round(item.basePrice * priceMod) : 0;
}
