import * as THREE from 'three';

function createCanvasTexture(drawFn, size = 256) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  drawFn(ctx, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

export function createStoneTexture() {
  return createCanvasTexture((ctx, size) => {
    ctx.fillStyle = '#6b6b6b';
    ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 800; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const w = 8 + Math.random() * 20;
      const h = 6 + Math.random() * 14;
      const gray = 90 + Math.random() * 50;
      ctx.fillStyle = `rgb(${gray},${gray - 5},${gray - 10})`;
      ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = `rgba(40,40,40,0.3)`;
      ctx.strokeRect(x, y, w, h);
    }
  }, 512);
}

export function createWoodTexture() {
  return createCanvasTexture((ctx, size) => {
    const grad = ctx.createLinearGradient(0, 0, size, 0);
    grad.addColorStop(0, '#4a3020');
    grad.addColorStop(0.3, '#6b4a30');
    grad.addColorStop(0.7, '#5c3d28');
    grad.addColorStop(1, '#3d2818');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 30; i++) {
      ctx.strokeStyle = `rgba(30,15,5,${0.1 + Math.random() * 0.2})`;
      ctx.lineWidth = 1 + Math.random() * 2;
      ctx.beginPath();
      ctx.moveTo(0, i * (size / 30));
      ctx.bezierCurveTo(size * 0.3, i * (size / 30) + Math.random() * 10, size * 0.7, i * (size / 30) - Math.random() * 10, size, i * (size / 30));
      ctx.stroke();
    }
  }, 512);
}

export function createRoofTexture() {
  return createCanvasTexture((ctx, size) => {
    ctx.fillStyle = '#3d2818';
    ctx.fillRect(0, 0, size, size);
    const tileW = 16;
    const tileH = 10;
    for (let row = 0; row < size / tileH; row++) {
      for (let col = 0; col < size / tileW; col++) {
        const offset = row % 2 === 0 ? 0 : tileW / 2;
        const x = col * tileW + offset;
        const y = row * tileH;
        const shade = 50 + Math.random() * 30;
        ctx.fillStyle = `rgb(${shade + 20},${shade},${shade - 10})`;
        ctx.beginPath();
        ctx.moveTo(x, y + tileH);
        ctx.lineTo(x + tileW / 2, y);
        ctx.lineTo(x + tileW, y + tileH);
        ctx.closePath();
        ctx.fill();
      }
    }
  }, 256);
}

export function createCobbleTexture() {
  return createCanvasTexture((ctx, size) => {
    ctx.fillStyle = '#4a4a48';
    ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 200; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const r = 6 + Math.random() * 10;
      const gray = 70 + Math.random() * 40;
      ctx.beginPath();
      ctx.ellipse(x, y, r, r * 0.7, Math.random() * Math.PI, 0, Math.PI * 2);
      ctx.fillStyle = `rgb(${gray},${gray - 3},${gray - 6})`;
      ctx.fill();
      ctx.strokeStyle = 'rgba(30,30,30,0.4)';
      ctx.stroke();
    }
  }, 512);
}

export function createGrassTexture() {
  return createCanvasTexture((ctx, size) => {
    ctx.fillStyle = '#2d5a2d';
    ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 3000; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const g = 80 + Math.random() * 60;
      ctx.fillStyle = `rgb(${g * 0.4},${g},${g * 0.3})`;
      ctx.fillRect(x, y, 1 + Math.random() * 2, 2 + Math.random() * 4);
    }
  }, 512);
}

export function createBrickTexture() {
  return createCanvasTexture((ctx, size) => {
    ctx.fillStyle = '#8b4513';
    ctx.fillRect(0, 0, size, size);
    const brickW = 32;
    const brickH = 14;
    for (let row = 0; row < size / brickH; row++) {
      const offset = row % 2 === 0 ? 0 : brickW / 2;
      for (let col = -1; col < size / brickW + 1; col++) {
        const x = col * brickW + offset;
        const y = row * brickH;
        const shade = 120 + Math.random() * 40;
        ctx.fillStyle = `rgb(${shade + 30},${shade * 0.5},${shade * 0.2})`;
        ctx.fillRect(x + 1, y + 1, brickW - 2, brickH - 2);
      }
    }
  }, 256);
}

export function createMaterials() {
  const stoneTex = createStoneTexture();
  stoneTex.repeat.set(4, 4);
  const woodTex = createWoodTexture();
  woodTex.repeat.set(2, 2);
  const roofTex = createRoofTexture();
  roofTex.repeat.set(3, 3);
  const cobbleTex = createCobbleTexture();
  cobbleTex.repeat.set(8, 8);
  const grassTex = createGrassTexture();
  grassTex.repeat.set(16, 16);
  const brickTex = createBrickTexture();
  brickTex.repeat.set(3, 3);

  return {
    stone: new THREE.MeshStandardMaterial({ map: stoneTex, roughness: 0.9, metalness: 0.05 }),
    wood: new THREE.MeshStandardMaterial({ map: woodTex, roughness: 0.85, metalness: 0.02 }),
    woodDark: new THREE.MeshStandardMaterial({ color: 0x3d2818, roughness: 0.9, metalness: 0.02 }),
    roof: new THREE.MeshStandardMaterial({ map: roofTex, roughness: 0.95, metalness: 0 }),
    cobble: new THREE.MeshStandardMaterial({ map: cobbleTex, roughness: 0.95, metalness: 0 }),
    grass: new THREE.MeshStandardMaterial({ map: grassTex, roughness: 1, metalness: 0 }),
    brick: new THREE.MeshStandardMaterial({ map: brickTex, roughness: 0.85, metalness: 0.05 }),
    glass: new THREE.MeshStandardMaterial({ color: 0x88bbdd, transparent: true, opacity: 0.4, roughness: 0.1, metalness: 0.3, emissive: 0x223344, emissiveIntensity: 0.3 }),
    gold: new THREE.MeshStandardMaterial({ color: 0xd4a843, roughness: 0.3, metalness: 0.8 }),
    iron: new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.4, metalness: 0.7 }),
    torch: new THREE.MeshStandardMaterial({ color: 0xff6622, emissive: 0xff4400, emissiveIntensity: 2 }),
    sign: new THREE.MeshStandardMaterial({ color: 0xf4e8c1, roughness: 0.8, metalness: 0 }),
    npcSkin: new THREE.MeshStandardMaterial({ color: 0xd4a574, roughness: 0.8 }),
    npcCloth: new THREE.MeshStandardMaterial({ color: 0x2d5a3d, roughness: 0.9 }),
    npcClothRed: new THREE.MeshStandardMaterial({ color: 0x8b2020, roughness: 0.9 }),
    npcClothBrown: new THREE.MeshStandardMaterial({ color: 0x5c3d2e, roughness: 0.9 }),
    treeTrunk: new THREE.MeshStandardMaterial({ color: 0x4a3020, roughness: 0.95 }),
    treeLeaves: new THREE.MeshStandardMaterial({ color: 0x1a5a2a, roughness: 0.9 }),
  };
}
