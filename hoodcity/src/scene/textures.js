import * as THREE from 'three';

function makeCanvas(size = 256) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  return { canvas, ctx: canvas.getContext('2d') };
}

function noise(ctx, size, amount, baseAlpha = 0.08) {
  for (let i = 0; i < amount; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = Math.random() * 1.6 + 0.3;
    ctx.fillStyle = `rgba(0,0,0,${(Math.random() * baseAlpha).toFixed(3)})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

function finish(canvas, repeat = [4, 4]) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeat[0], repeat[1]);
  tex.anisotropy = 4;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function grassTexture() {
  const { canvas, ctx } = makeCanvas(256);
  ctx.fillStyle = '#3f6b2c';
  ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 3000; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    const g = 90 + Math.random() * 70;
    ctx.strokeStyle = `rgba(${40 + Math.random() * 30},${g},${30 + Math.random() * 20},0.5)`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + (Math.random() - 0.5) * 4, y - 3 - Math.random() * 4);
    ctx.stroke();
  }
  noise(ctx, 256, 800, 0.06);
  return finish(canvas, [60, 60]);
}

export function dirtPathTexture() {
  const { canvas, ctx } = makeCanvas(256);
  ctx.fillStyle = '#8a6b45';
  ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 900; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    const r = Math.random() * 3 + 0.5;
    ctx.fillStyle = `rgba(${60 + Math.random() * 40},${45 + Math.random() * 30},${25 + Math.random() * 20},0.35)`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  return finish(canvas, [10, 40]);
}

export function cobblestoneTexture() {
  const { canvas, ctx } = makeCanvas(256);
  ctx.fillStyle = '#8a8378';
  ctx.fillRect(0, 0, 256, 256);
  const cell = 32;
  for (let y = 0; y < 256; y += cell) {
    for (let x = 0; x < 256; x += cell) {
      const offset = (y / cell) % 2 === 0 ? 0 : cell / 2;
      const px = x + offset + (Math.random() - 0.5) * 4;
      const py = y + (Math.random() - 0.5) * 4;
      const shade = 120 + Math.random() * 70;
      ctx.fillStyle = `rgb(${shade},${shade - 6},${shade - 14})`;
      ctx.strokeStyle = 'rgba(30,26,20,0.6)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(px - cell / 2 + 2, py - cell / 2 + 2, cell - 4, cell - 4, 4);
      ctx.fill();
      ctx.stroke();
    }
  }
  return finish(canvas, [14, 14]);
}

export function stuccoTexture(base = '#e6d8b3') {
  const { canvas, ctx } = makeCanvas(256);
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, 256, 256);
  noise(ctx, 256, 2200, 0.05);
  for (let i = 0; i < 40; i++) {
    ctx.strokeStyle = 'rgba(0,0,0,0.04)';
    ctx.beginPath();
    ctx.moveTo(Math.random() * 256, Math.random() * 256);
    ctx.lineTo(Math.random() * 256, Math.random() * 256);
    ctx.stroke();
  }
  return finish(canvas, [1.5, 1.5]);
}

export function brickTexture(base = '#8f4a34') {
  const { canvas, ctx } = makeCanvas(256);
  ctx.fillStyle = '#5c463a';
  ctx.fillRect(0, 0, 256, 256);
  const bw = 42;
  const bh = 20;
  let row = 0;
  for (let y = 0; y < 256; y += bh) {
    const offset = row % 2 === 0 ? 0 : bw / 2;
    for (let x = -bw; x < 256 + bw; x += bw) {
      const shadeVar = Math.random() * 26 - 13;
      const r = Math.min(255, Math.max(0, parseInt(base.slice(1, 3), 16) + shadeVar));
      const g = Math.min(255, Math.max(0, parseInt(base.slice(3, 5), 16) + shadeVar));
      const b = Math.min(255, Math.max(0, parseInt(base.slice(5, 7), 16) + shadeVar));
      ctx.fillStyle = `rgb(${r | 0},${g | 0},${b | 0})`;
      ctx.fillRect(x + offset + 2, y + 2, bw - 4, bh - 4);
    }
    row++;
  }
  return finish(canvas, [1.2, 2]);
}

export function stoneWallTexture() {
  const { canvas, ctx } = makeCanvas(256);
  ctx.fillStyle = '#8b877e';
  ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 90; i++) {
    const w = 26 + Math.random() * 30;
    const h = 14 + Math.random() * 16;
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    const shade = 120 + Math.random() * 70;
    ctx.fillStyle = `rgb(${shade},${shade - 4},${shade - 8})`;
    ctx.strokeStyle = 'rgba(40,36,30,0.7)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 3);
    ctx.fill();
    ctx.stroke();
  }
  return finish(canvas, [1.4, 1.4]);
}

export function thatchTexture() {
  const { canvas, ctx } = makeCanvas(256);
  ctx.fillStyle = '#b8975a';
  ctx.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y += 5) {
    ctx.strokeStyle = `rgba(${90 + Math.random() * 40},${65 + Math.random() * 30},${25},0.5)`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, y + (Math.random() - 0.5) * 4);
    for (let x = 0; x <= 256; x += 16) {
      ctx.lineTo(x, y + (Math.random() - 0.5) * 6);
    }
    ctx.stroke();
  }
  return finish(canvas, [2, 1]);
}

export function roofTileTexture(base = '#7a2f24') {
  const { canvas, ctx } = makeCanvas(256);
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, 256, 256);
  const tw = 22;
  const th = 16;
  let row = 0;
  for (let y = 0; y < 256; y += th) {
    const offset = row % 2 === 0 ? 0 : tw / 2;
    for (let x = -tw; x < 256 + tw; x += tw) {
      const shadeVar = Math.random() * 20 - 10;
      ctx.fillStyle = `rgb(${122 + shadeVar},${47 + shadeVar * 0.5},${36 + shadeVar * 0.3})`;
      ctx.beginPath();
      ctx.arc(x + offset + tw / 2, y + th, tw / 2 - 1, Math.PI, 0);
      ctx.fill();
    }
    row++;
  }
  return finish(canvas, [1.6, 2.2]);
}

export function woodPlankTexture(base = '#6b4423') {
  const { canvas, ctx } = makeCanvas(256);
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, 256, 256);
  for (let x = 0; x < 256; x += 32) {
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 256);
    ctx.stroke();
  }
  noise(ctx, 256, 1400, 0.08);
  return finish(canvas, [1, 1]);
}

export function bannerTextTexture(text, sub = '') {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#efe0ba';
  ctx.fillRect(0, 0, 512, 256);
  ctx.strokeStyle = '#3b2412';
  ctx.lineWidth = 14;
  ctx.strokeRect(7, 7, 498, 242);
  ctx.fillStyle = '#241a10';
  ctx.textAlign = 'center';
  ctx.font = 'bold 58px Georgia, serif';
  ctx.fillText(text, 256, sub ? 118 : 148);
  if (sub) {
    ctx.font = 'italic 30px Georgia, serif';
    ctx.fillStyle = '#5c4526';
    ctx.fillText(sub, 256, 172);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function skyGradientTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 32;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, '#4f86c6');
  grad.addColorStop(0.45, '#a9cbe8');
  grad.addColorStop(0.75, '#e9d9ae');
  grad.addColorStop(1, '#d9c48d');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 32, 256);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
