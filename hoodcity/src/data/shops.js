import * as THREE from 'three';

export const SHOPS = [
  {
    id: 'armory',
    name: "Sherwood Armory",
    keeper: 'Little John, the Blacksmith',
    flavor: '"Steel enough to fell a sheriff\'s guard, if the coin is right."',
    position: new THREE.Vector3(-16, 0, -12),
    building: { wallStyle: 'stone', roofType: 'hip', roofColor: '#5a5049', width: 6.5, depth: 5.5, height: 3.4, roofHeight: 2.4, windows: 2 },
    merchantColor: 0x54494a,
    items: [
      { id: 'sword', icon: '🗡️', name: 'Short Sword', desc: 'A trusty outlaw blade.', buy: 45, sell: 18 },
      { id: 'shield', icon: '🛡️', name: 'Oak Buckler', desc: 'Turns aside a guard\'s blow.', buy: 60, sell: 24 },
      { id: 'arrows', icon: '🏹', name: 'Iron-tipped Arrows (x10)', desc: 'Sharp bodkin points.', buy: 20, sell: 8 },
      { id: 'helmet', icon: '⛑️', name: 'Leather Cap', desc: 'Better than a bare head.', buy: 30, sell: 12 },
    ],
  },
  {
    id: 'fletcher',
    name: "Fletcher & Sons Bowyer",
    keeper: 'Will Scarlet, the Fletcher',
    flavor: '"A good longbow feeds a family. A great one feeds the whole shire."',
    position: new THREE.Vector3(16, 0, -12),
    building: { wallStyle: 'stucco', wallColor: '#e3d3a6', roofType: 'thatch', width: 6, depth: 5, height: 3.1, roofHeight: 2.1, windows: 2 },
    merchantColor: 0x2f4d2a,
    items: [
      { id: 'longbow', icon: '🏹', name: 'Yew Longbow', desc: 'Upgrade your draw strength.', buy: 80, sell: 30 },
      { id: 'arrows', icon: '➶', name: 'Fletched Arrows (x10)', desc: 'Straight-flying shafts.', buy: 15, sell: 6 },
      { id: 'quiver', icon: '🎯', name: 'Wide Quiver', desc: 'Carry more arrows at once.', buy: 35, sell: 14 },
    ],
  },
  {
    id: 'bakery',
    name: "Marian's Bread House",
    keeper: 'Maid Marian, the Baker',
    flavor: '"Bread for the poor, coin for Sherwood\'s outlaws."',
    position: new THREE.Vector3(-16, 0, 12),
    building: { wallStyle: 'stucco', wallColor: '#efdcb8', roofType: 'thatch', width: 5.5, depth: 5, height: 3, roofHeight: 2, windows: 2 },
    merchantColor: 0x9c5b8a,
    items: [
      { id: 'bread', icon: '🍞', name: 'Fresh Loaf', desc: 'Restores health over time.', buy: 6, sell: 2 },
      { id: 'cheese', icon: '🧀', name: 'Nottingham Cheese', desc: 'A hearty snack.', buy: 8, sell: 3 },
      { id: 'apple', icon: '🍎', name: 'Sherwood Apple', desc: 'Crisp and sweet.', buy: 4, sell: 1 },
      { id: 'pie', icon: '🥧', name: 'Venison Pie', desc: 'Poached from the King\'s deer.', buy: 18, sell: 7 },
    ],
  },
  {
    id: 'tailor',
    name: "Green Cloth Tailor",
    keeper: 'Friar Tuck, the Tailor',
    flavor: '"Lincoln green, cut to hide you in the leaves."',
    position: new THREE.Vector3(16, 0, 12),
    building: { wallStyle: 'stucco', wallColor: '#d8c9a3', roofType: 'hip', roofColor: '#6b7a4a', width: 6, depth: 5, height: 3.1, roofHeight: 2.1, windows: 2 },
    merchantColor: 0x7a5a3a,
    items: [
      { id: 'hood', icon: '🧥', name: "Outlaw's Hood", desc: 'Blend into Sherwood Forest.', buy: 40, sell: 16 },
      { id: 'cloak', icon: '🥋', name: 'Traveler\'s Cloak', desc: 'Keeps off the rain.', buy: 32, sell: 12 },
      { id: 'boots', icon: '👢', name: 'Soft Leather Boots', desc: 'Move silently as a fox.', buy: 28, sell: 10 },
    ],
  },
  {
    id: 'tavern',
    name: "The Boar's Head Inn",
    keeper: 'Alan-a-Dale, the Innkeeper',
    flavor: '"Ale, song, and safe beds for weary outlaws."',
    position: new THREE.Vector3(0, 0, -24),
    building: { wallStyle: 'brick', wallColor: '#8f4a34', roofType: 'gable', roofColor: '#4a3323', width: 8, depth: 6, height: 3.6, roofHeight: 2.6, windows: 3 },
    merchantColor: 0x3a2a1a,
    items: [
      { id: 'ale', icon: '🍺', name: 'Tankard of Ale', desc: 'Restores stamina.', buy: 5, sell: 2 },
      { id: 'potion', icon: '🧪', name: 'Healing Draught', desc: 'Mends wounds fast.', buy: 25, sell: 10 },
      { id: 'room', icon: '🛏️', name: 'A Night\'s Rest', desc: 'Fully restores health & stamina.', buy: 12, sell: 0 },
    ],
  },
  {
    id: 'trading_post',
    name: "Nottingham Trading Post",
    keeper: 'A Hooded Fence',
    flavor: '"No questions asked. The Sheriff\'s loss is your gain."',
    position: new THREE.Vector3(0, 0, 24),
    building: { wallStyle: 'stone', roofType: 'hip', roofColor: '#3f3f45', width: 7, depth: 5.5, height: 3.3, roofHeight: 2.2, windows: 3 },
    merchantColor: 0x1f1f1f,
    items: [
      { id: 'goldbar', icon: '💰', name: 'Stolen Gold Bar', desc: 'Fenced Sheriff loot.', buy: 0, sell: 55 },
      { id: 'jewels', icon: '💎', name: 'Noble\'s Jewels', desc: 'Taken from a tax wagon.', buy: 0, sell: 40 },
      { id: 'chalice', icon: '🏆', name: 'Silver Chalice', desc: 'Church silverware, best not ask.', buy: 0, sell: 30 },
    ],
  },
];

export const POOR_VILLAGERS = [
  { id: 'villager1', name: 'Old Tom', position: new THREE.Vector3(-9, 0, -2), line: 'Spare a coin for an old man, good outlaw?' },
  { id: 'villager2', name: 'Widow Alice', position: new THREE.Vector3(9, 0, -3), line: 'My children have not eaten since Tuesday...' },
  { id: 'villager3', name: 'Young Ned', position: new THREE.Vector3(-6, 0, 6), line: 'The Sheriff took everything we had.' },
];

export const TAX_WAGON_POSITION = new THREE.Vector3(0, 0, 2.5);
