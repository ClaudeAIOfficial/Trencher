// Item catalog for HOODCITY. Each item: id, name, emoji, desc, base price.
export const ITEMS = {
  // Fletcher / weapons
  longbow:    { name: 'Yew Longbow',       emoji: '🏹', desc: 'A finely carved longbow of Sherwood yew.', price: 120 },
  arrows:     { name: 'Bundle of Arrows',  emoji: '🎯', desc: 'A quiver bundle of 20 goose-fletched arrows.', price: 25 },
  dagger:     { name: 'Outlaw Dagger',     emoji: '🗡️', desc: 'A quick blade for close quarters.', price: 60 },
  sword:      { name: 'Knight\'s Sword',   emoji: '⚔️', desc: 'Confiscated from a careless guard.', price: 180 },
  // Armory
  hood:       { name: 'Lincoln Green Hood', emoji: '🧢', desc: 'The classic hood of the merry men.', price: 45 },
  boots:      { name: 'Leather Boots',     emoji: '🥾', desc: 'Soft-soled boots for silent rooftops.', price: 55 },
  shield:     { name: 'Round Shield',      emoji: '🛡️', desc: 'Oak shield banded with iron.', price: 90 },
  cloak:      { name: 'Ranger Cloak',      emoji: '🧥', desc: 'Blend into the forest shadows.', price: 70 },
  // Tavern / consumables
  ale:        { name: 'Tankard of Ale',    emoji: '🍺', desc: 'Restores spirit and a little health.', price: 8, heal: 15 },
  bread:      { name: 'Loaf of Bread',     emoji: '🍞', desc: 'A hearty loaf for the road.', price: 5, heal: 8 },
  stew:       { name: 'Venison Stew',      emoji: '🍲', desc: 'Poached from the royal forest, naturally.', price: 14, heal: 30 },
  // Market / trade goods
  pelt:       { name: 'Deer Pelt',         emoji: '🦌', desc: 'Prized by tanners across the shire.', price: 35 },
  herbs:      { name: 'Wild Herbs',        emoji: '🌿', desc: 'Gathered at the forest edge.', price: 12 },
  goldring:   { name: 'Gold Ring',         emoji: '💍', desc: 'Lifted from a passing noble.', price: 220 },
  gem:        { name: 'Ruby Gem',          emoji: '💎', desc: 'Deep red and worth a small fortune.', price: 400 },
  scroll:     { name: 'Ancient Scroll',    emoji: '📜', desc: 'Maps to hidden Sherwood caches.', price: 150 },
  lute:       { name: 'Minstrel\'s Lute',  emoji: '🪕', desc: 'For singing tales of the hood.', price: 80 },
};

// Shops placed around the city. `pos` = [x,z]; `rot` faces the door.
// `stock` = items sold; `buys` = items the keeper will purchase from you.
export const SHOPS = [
  {
    id: 'fletcher', name: 'The Fletcher\'s Bowyer', keeper: 'Little John', icon: '🏹',
    color: 0x6b4423, roof: 0x5a3d1f, sign: '🏹',
    pos: [-26, -22], rot: Math.PI / 2, size: [9, 8, 9],
    stock: ['longbow', 'arrows', 'dagger', 'sword'],
    buys:  ['pelt', 'arrows'],
  },
  {
    id: 'armory', name: 'Sherwood Armory', keeper: 'Will Scarlet', icon: '🛡️',
    color: 0x7a7a82, roof: 0x4a4a52, sign: '🛡️',
    pos: [26, -22], rot: -Math.PI / 2, size: [9, 9, 9],
    stock: ['hood', 'boots', 'shield', 'cloak'],
    buys:  ['pelt', 'gem'],
  },
  {
    id: 'tavern', name: 'The Blue Boar Inn', keeper: 'Friar Tuck', icon: '🍺',
    color: 0x8a5a2b, roof: 0x8a3323, sign: '🍺',
    pos: [-26, 22], rot: Math.PI / 2, size: [11, 9, 10],
    stock: ['ale', 'bread', 'stew', 'lute'],
    buys:  ['herbs', 'stew'],
  },
  {
    id: 'market', name: 'Nottingham Market', keeper: 'Maid Marian', icon: '🪙',
    color: 0xa8863f, roof: 0x8a6c2f, sign: '⚖️',
    pos: [26, 22], rot: -Math.PI / 2, size: [11, 8, 10],
    stock: ['pelt', 'herbs', 'goldring', 'gem', 'scroll'],
    buys:  ['goldring', 'gem', 'scroll', 'pelt', 'herbs', 'lute'],
  },
];

// Fake online players who post trade offers in the "Player Market".
export const PLAYER_NAMES = [
  'RobinHood_77', 'SherwoodSam', 'xX_Archer_Xx', 'GreenArrowGuy', 'MerryMax',
  'NottingHam', 'LadyMarian', 'FriarF', 'ScarletKnight', 'OutlawOllie',
  'GoldGoblin', 'ArrowAce', 'TudorTom', 'CobbleKate', 'SilentStan',
  'HoodedHera', 'ByTheBow', 'ForestFox', 'CoinCarver', 'BlueBoarBen',
];

export const marketableItems = ['pelt', 'herbs', 'goldring', 'gem', 'scroll', 'lute', 'hood', 'longbow', 'dagger', 'shield'];
