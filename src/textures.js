import * as THREE from 'three';

// ---- small helpers ----
function makeCanvas(w = 256, h = 256) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return { c, ctx: c.getContext('2d') };
}
function noise(ctx, w, h, amount, alpha = 0.06) {
  for (let i = 0; i < amount; i++) {
    ctx.fillStyle = `rgba(0,0,0,${Math.random() * alpha})`;
    ctx.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 2, 1 + Math.random() * 2);
  }
}
function toTexture(c, repeatX = 1, repeatY = 1) {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeatX, repeatY);
  t.anisotropy = 4;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// Brick wall (Tudor / medieval red brick)
export function brickTexture() {
  const { c, ctx } = makeCanvas(256, 256);
  ctx.fillStyle = '#d8c9a6'; ctx.fillRect(0, 0, 256, 256); // mortar
  const bw = 64, bh = 26, gap = 4;
  const shades = ['#8a4b3a', '#9c5842', '#7a4030', '#a5624a', '#6f3a2c', '#94513c'];
  let row = 0;
  for (let y = 0; y < 256; y += bh + gap) {
    const offset = (row % 2) * (bw / 2);
    for (let x = -bw; x < 256; x += bw + gap) {
      ctx.fillStyle = shades[Math.floor(Math.random() * shades.length)];
      ctx.fillRect(x + offset, y, bw, bh);
      // subtle brick shading
      ctx.fillStyle = 'rgba(255,255,255,.06)';
      ctx.fillRect(x + offset, y, bw, 3);
      ctx.fillStyle = 'rgba(0,0,0,.12)';
      ctx.fillRect(x + offset, y + bh - 3, bw, 3);
    }
    row++;
  }
  noise(ctx, 256, 256, 1600, 0.08);
  return toTexture(c);
}

// Timber-framed plaster (classic Tudor)
export function plasterTexture(plaster = '#e9e1cf') {
  const { c, ctx } = makeCanvas(256, 256);
  ctx.fillStyle = plaster; ctx.fillRect(0, 0, 256, 256);
  // grime gradient
  const g = ctx.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, 'rgba(120,100,70,0)');
  g.addColorStop(1, 'rgba(90,70,45,0.28)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 256, 256);
  noise(ctx, 256, 256, 2600, 0.05);
  return toTexture(c);
}

// Vertical wood timber beams overlay-ish plank texture
export function woodTexture(base = '#5a3a1e') {
  const { c, ctx } = makeCanvas(128, 256);
  ctx.fillStyle = base; ctx.fillRect(0, 0, 128, 256);
  for (let x = 0; x < 128; x += 4) {
    ctx.strokeStyle = `rgba(0,0,0,${0.04 + Math.random() * 0.08})`;
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + (Math.random() * 4 - 2), 256); ctx.stroke();
  }
  // knots
  for (let i = 0; i < 6; i++) {
    const x = Math.random() * 128, y = Math.random() * 256;
    ctx.strokeStyle = 'rgba(0,0,0,.25)';
    ctx.beginPath(); ctx.ellipse(x, y, 3 + Math.random() * 3, 6 + Math.random() * 4, 0, 0, Math.PI * 2); ctx.stroke();
  }
  return toTexture(c);
}

// Cobblestone street
export function cobbleTexture() {
  const { c, ctx } = makeCanvas(256, 256);
  ctx.fillStyle = '#3b3b3b'; ctx.fillRect(0, 0, 256, 256);
  const shades = ['#6b6b63', '#5c5c54', '#767066', '#514f48', '#807a6c'];
  for (let i = 0; i < 240; i++) {
    const x = Math.random() * 256, y = Math.random() * 256;
    const r = 8 + Math.random() * 12;
    ctx.fillStyle = shades[Math.floor(Math.random() * shades.length)];
    ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.8, Math.random() * Math.PI, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.4)'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.05)';
    ctx.beginPath(); ctx.ellipse(x - r * .2, y - r * .2, r * .5, r * .4, 0, 0, Math.PI * 2); ctx.fill();
  }
  noise(ctx, 256, 256, 2000, 0.12);
  return toTexture(c);
}

// Grass / meadow
export function grassTexture() {
  const { c, ctx } = makeCanvas(256, 256);
  ctx.fillStyle = '#3f6b2c'; ctx.fillRect(0, 0, 256, 256);
  const shades = ['#477a2f', '#386127', '#4f8534', '#2f5220', '#568c39'];
  for (let i = 0; i < 4200; i++) {
    ctx.strokeStyle = shades[Math.floor(Math.random() * shades.length)];
    const x = Math.random() * 256, y = Math.random() * 256;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + (Math.random() * 2 - 1), y - 2 - Math.random() * 3); ctx.stroke();
  }
  return toTexture(c);
}

// Roof tiles (terracotta) / thatch option
export function roofTexture(color = '#8a3323') {
  const { c, ctx } = makeCanvas(256, 256);
  ctx.fillStyle = color; ctx.fillRect(0, 0, 256, 256);
  const tw = 26, th = 16;
  for (let y = 0; y < 256; y += th) {
    const off = ((y / th) % 2) * (tw / 2);
    for (let x = -tw; x < 256; x += tw) {
      ctx.fillStyle = `rgba(0,0,0,${0.05 + Math.random() * 0.12})`;
      ctx.beginPath();
      ctx.arc(x + off + tw / 2, y + th, tw / 2, Math.PI, 0);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.06)';
      ctx.stroke();
    }
  }
  return toTexture(c);
}

export function thatchTexture() {
  const { c, ctx } = makeCanvas(256, 256);
  ctx.fillStyle = '#a8863f'; ctx.fillRect(0, 0, 256, 256);
  const shades = ['#c2a15a', '#9c7d38', '#b8934c', '#8a6c2f'];
  for (let i = 0; i < 3000; i++) {
    ctx.strokeStyle = shades[Math.floor(Math.random() * shades.length)];
    ctx.lineWidth = 1 + Math.random();
    const x = Math.random() * 256, y = Math.random() * 256;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.random() * 3, y + 6 + Math.random() * 8); ctx.stroke();
  }
  return toTexture(c);
}

// Sky gradient as a large sphere texture
export function skyTexture() {
  const { c, ctx } = makeCanvas(64, 512);
  const g = ctx.createLinearGradient(0, 0, 0, 512);
  g.addColorStop(0.0, '#3f6ea5');
  g.addColorStop(0.45, '#7fa8cf');
  g.addColorStop(0.7, '#bcd3e0');
  g.addColorStop(1.0, '#e8e0c8');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 64, 512);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
