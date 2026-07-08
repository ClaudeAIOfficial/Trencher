import * as THREE from 'three';
import * as TX from './textures.js';
import { SHOPS } from './data.js';

export function buildCity(scene) {
  const world = new THREE.Group();
  scene.add(world);

  const colliders = [];      // AABBs on XZ plane {minX,maxX,minZ,maxZ}
  const shopZones = [];      // {x,z,radius,shop}

  function addCollider(cx, cz, sx, sz) {
    colliders.push({ minX: cx - sx / 2, maxX: cx + sx / 2, minZ: cz - sz / 2, maxZ: cz + sz / 2 });
  }

  // ---------- Textures / materials ----------
  const brick = TX.brickTexture();
  const plaster = TX.plasterTexture();
  const wood = TX.woodTexture();
  const cobble = TX.cobbleTexture(); cobble.repeat.set(24, 24);
  const grass = TX.grassTexture(); grass.repeat.set(40, 40);
  const roofTile = TX.roofTexture('#8a3323');

  const matGrass = new THREE.MeshStandardMaterial({ map: grass, roughness: 1 });
  const matCobble = new THREE.MeshStandardMaterial({ map: cobble, roughness: 1 });
  const matWood = new THREE.MeshStandardMaterial({ map: wood, roughness: 0.9 });
  const matDarkWood = new THREE.MeshStandardMaterial({ color: 0x3d2712, roughness: 0.9 });

  // ---------- Ground + roads ----------
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), matGrass);
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true;
  world.add(ground);

  function road(x, z, w, h) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), matCobble);
    m.rotation.x = -Math.PI / 2; m.position.set(x, 0.02, z); m.receiveShadow = true;
    world.add(m);
  }
  road(0, 0, 14, 200);   // main north-south
  road(0, 0, 200, 14);   // main east-west
  // central plaza
  const plaza = new THREE.Mesh(new THREE.CircleGeometry(20, 40), matCobble);
  plaza.rotation.x = -Math.PI / 2; plaza.position.y = 0.03; plaza.receiveShadow = true;
  world.add(plaza);

  // ---------- Reusable window mesh ----------
  const glassMat = new THREE.MeshStandardMaterial({ color: 0x9fc7d6, roughness: 0.2, metalness: 0.1, emissive: 0x27363c, emissiveIntensity: 0.4 });
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x2a1a0e, roughness: 0.8 });
  function windowPane(w, h) {
    const g = new THREE.Group();
    const frame = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.12), frameMat);
    const glass = new THREE.Mesh(new THREE.BoxGeometry(w * 0.8, h * 0.8, 0.06), glassMat);
    glass.position.z = 0.05;
    // muntins (cross bars)
    const barV = new THREE.Mesh(new THREE.BoxGeometry(0.05, h * 0.8, 0.08), frameMat); barV.position.z = 0.08;
    const barH = new THREE.Mesh(new THREE.BoxGeometry(w * 0.8, 0.05, 0.08), frameMat); barH.position.z = 0.08;
    g.add(frame, glass, barV, barH);
    return g;
  }

  // ---------- Tudor / medieval building ----------
  // opts: {x,z,w,d, floors, rot, wallStyle:'brick'|'plaster', roofColor, thatch}
  function building(opts) {
    const { x, z, w, d, floors = 2, rot = 0, wallStyle = 'plaster', roofColor = '#8a3323', thatch = false } = opts;
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.rotation.y = rot;
    const floorH = 3.2;
    const totalH = floors * floorH;

    const wallTex = wallStyle === 'brick' ? brick.clone() : plaster.clone();
    wallTex.wrapS = wallTex.wrapT = THREE.RepeatWrapping;
    wallTex.repeat.set(w / 3, totalH / 3);
    const wallMat = new THREE.MeshStandardMaterial({ map: wallTex, roughness: 0.95 });

    // main block
    const body = new THREE.Mesh(new THREE.BoxGeometry(w, totalH, d), wallMat);
    body.position.y = totalH / 2; body.castShadow = true; body.receiveShadow = true;
    g.add(body);

    // upper floor jetty (overhang) - classic Tudor
    if (floors >= 2) {
      const jetty = new THREE.Mesh(new THREE.BoxGeometry(w + 0.8, floorH * (floors - 1), d + 0.8), wallMat);
      jetty.position.y = floorH + (floorH * (floors - 1)) / 2;
      jetty.castShadow = true;
      g.add(jetty);
    }

    // timber frame beams on front & sides
    function beams(width, depthOffset, axis) {
      const grp = new THREE.Group();
      const beamMat = matDarkWood;
      // horizontal beams between floors
      for (let f = 0; f <= floors; f++) {
        const b = new THREE.Mesh(new THREE.BoxGeometry(width + 0.2, 0.28, 0.28), beamMat);
        b.position.set(0, f * floorH, 0);
        grp.add(b);
      }
      // vertical studs
      const studs = Math.max(2, Math.round(width / 2));
      for (let s = 0; s <= studs; s++) {
        const b = new THREE.Mesh(new THREE.BoxGeometry(0.24, totalH, 0.24), beamMat);
        b.position.set(-width / 2 + (width / studs) * s, totalH / 2, 0);
        grp.add(b);
      }
      // decorative diagonal on top floor
      const diag = new THREE.Mesh(new THREE.BoxGeometry(0.22, floorH * 1.1, 0.22), beamMat);
      diag.position.set(0, totalH - floorH / 2, 0); diag.rotation.z = 0.5;
      grp.add(diag);
      grp.position.z = depthOffset;
      if (axis === 'x') grp.rotation.y = Math.PI / 2;
      return grp;
    }
    if (wallStyle === 'plaster') {
      g.add(beams(w, d / 2 + 0.42, 'z'));
      g.add(beams(w, -(d / 2 + 0.42), 'z'));
      g.add(beams(d, w / 2 + 0.42, 'x'));
      g.add(beams(d, -(w / 2 + 0.42), 'x'));
    }

    // windows on front face
    const winW = 1.1, winH = 1.4;
    const cols = Math.max(1, Math.floor(w / 2.6));
    for (let f = 0; f < floors; f++) {
      for (let c = 0; c < cols; c++) {
        const wx = -w / 2 + (w / cols) * (c + 0.5);
        const wp = windowPane(winW, winH);
        wp.position.set(wx, f * floorH + floorH * 0.55, d / 2 + 0.5);
        g.add(wp);
        const wp2 = windowPane(winW, winH);
        wp2.position.set(wx, f * floorH + floorH * 0.55, -(d / 2 + 0.5));
        wp2.rotation.y = Math.PI;
        g.add(wp2);
      }
    }

    // door on front
    const door = new THREE.Mesh(new THREE.BoxGeometry(1.4, 2.4, 0.16), matDarkWood);
    door.position.set(0, 1.2, d / 2 + 0.45); g.add(door);
    g.add(makeGable(w, d, totalH, roofColor, thatch));

    world.add(g);
    // collider approx (account for rotation by swapping dims)
    if (Math.abs(Math.sin(rot)) > 0.5) addCollider(x, z, d + 1, w + 1);
    else addCollider(x, z, w + 1, d + 1);
    return g;
  }

  // gable roof group
  function makeGable(w, d, baseY, color, thatch) {
    const grp = new THREE.Group();
    const roofH = 2.6;
    const tex = thatch ? TX.thatchTexture() : TX.roofTexture(color);
    tex.repeat.set(Math.max(1, w / 3), 1);
    const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 1, side: THREE.DoubleSide });
    const hw = (w + 1) / 2, hd = (d + 1) / 2;
    const y0 = baseY, y1 = baseY + roofH;
    // Build two slope quads + two gable triangles manually
    const geo = new THREE.BufferGeometry();
    const positions = [];
    const uvs = [];
    // left slope (from ridge to left eave)
    // ridge line: (-hw..hw? ) Actually ridge runs along X.
    // eaves along X at z=+hd and z=-hd, ridge at z=0,y=y1
    // slope A (z>0)
    quad(positions, uvs, [-hw, y0, hd], [hw, y0, hd], [hw, y1, 0], [-hw, y1, 0], w);
    // slope B (z<0)
    quad(positions, uvs, [hw, y0, -hd], [-hw, y0, -hd], [-hw, y1, 0], [hw, y1, 0], w);
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.computeVertexNormals();
    const roof = new THREE.Mesh(geo, mat);
    roof.castShadow = true;
    grp.add(roof);
    // gable end triangles (plaster)
    const gmat = new THREE.MeshStandardMaterial({ color: 0xe9e1cf, roughness: 1, side: THREE.DoubleSide });
    const tri1 = triangle([-hw, y0, hd], [-hw, y0, -hd], [-hw, y1, 0], gmat);
    const tri2 = triangle([hw, y0, -hd], [hw, y0, hd], [hw, y1, 0], gmat);
    grp.add(tri1, tri2);
    // chimney
    const chim = new THREE.Mesh(new THREE.BoxGeometry(0.8, 2.2, 0.8),
      new THREE.MeshStandardMaterial({ map: brick.clone(), roughness: 1 }));
    chim.position.set(hw * 0.5, y1 + 0.6, 0); chim.castShadow = true;
    grp.add(chim);
    return grp;
  }
  function quad(pos, uvs, a, b, c, d, wRepeat) {
    pos.push(...a, ...b, ...c, ...a, ...c, ...d);
    uvs.push(0, 0, wRepeat / 3, 0, wRepeat / 3, 1, 0, 0, wRepeat / 3, 1, 0, 1);
  }
  function triangle(a, b, c, mat) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute([...a, ...b, ...c], 3));
    g.computeVertexNormals();
    return new THREE.Mesh(g, mat);
  }

  // ---------- Trees ----------
  function tree(x, z, scale = 1) {
    const g = new THREE.Group(); g.position.set(x, 0, z);
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.25 * scale, 0.35 * scale, 2.4 * scale, 8), matWood);
    trunk.position.y = 1.2 * scale; trunk.castShadow = true; g.add(trunk);
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x2f5d24, roughness: 1 });
    for (let i = 0; i < 3; i++) {
      const b = new THREE.Mesh(new THREE.IcosahedronGeometry((1.4 - i * 0.25) * scale, 0), leafMat);
      b.position.y = (2.6 + i * 0.9) * scale; b.position.x = (Math.random() - 0.5) * scale;
      b.castShadow = true; g.add(b);
    }
    world.add(g);
    addCollider(x, z, 0.8, 0.8);
  }

  // ---------- Lamp post ----------
  function lamp(x, z) {
    const g = new THREE.Group(); g.position.set(x, 0, z);
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 3.4, 8), matDarkWood);
    post.position.y = 1.7; post.castShadow = true; g.add(post);
    const glow = new THREE.Mesh(new THREE.SphereGeometry(0.24, 12, 12),
      new THREE.MeshStandardMaterial({ color: 0xffd76a, emissive: 0xffb733, emissiveIntensity: 1.4 }));
    glow.position.y = 3.4; g.add(glow);
    const light = new THREE.PointLight(0xffb84d, 8, 14, 2); light.position.y = 3.4; g.add(light);
    world.add(g);
  }

  // ---------- Central fountain ----------
  function fountain() {
    const g = new THREE.Group();
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x8f887a, roughness: 1 });
    const base = new THREE.Mesh(new THREE.CylinderGeometry(4, 4.4, 0.8, 24), stoneMat);
    base.position.y = 0.4; base.castShadow = true; base.receiveShadow = true; g.add(base);
    const water = new THREE.Mesh(new THREE.CylinderGeometry(3.5, 3.5, 0.4, 24),
      new THREE.MeshStandardMaterial({ color: 0x3a7ca5, roughness: 0.15, metalness: 0.2, transparent: true, opacity: 0.85 }));
    water.position.y = 0.75; g.add(water);
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.7, 2.4, 12), stoneMat);
    col.position.y = 1.8; g.add(col);
    const top = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 0.4, 0.5, 12), stoneMat);
    top.position.y = 3.1; g.add(top);
    const statue = new THREE.Mesh(new THREE.ConeGeometry(0.4, 1.2, 8),
      new THREE.MeshStandardMaterial({ color: 0x6b7a3a, roughness: 0.8, metalness: 0.3 }));
    statue.position.y = 3.9; g.add(statue);
    world.add(g);
    addCollider(0, 0, 8.5, 8.5);
  }

  // ---------- Market stalls (decor) ----------
  function stall(x, z, rot, color) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rot;
    const counter = new THREE.Mesh(new THREE.BoxGeometry(3, 1, 1.4), matWood);
    counter.position.y = 0.5; counter.castShadow = true; g.add(counter);
    for (const px of [-1.3, 1.3]) for (const pz of [-0.6, 0.6]) {
      const p = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.6, 6), matWood);
      p.position.set(px, 1.3, pz); g.add(p);
    }
    const canopy = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.2, 1.8),
      new THREE.MeshStandardMaterial({ color, roughness: 1 }));
    canopy.position.y = 2.6; canopy.castShadow = true; g.add(canopy);
    // striped look via second box
    world.add(g);
    addCollider(x, z, 3.4, 1.8);
  }

  // ---------- Town wall + gate (realistic perimeter) ----------
  function townWall() {
    const wallMat = new THREE.MeshStandardMaterial({ map: brick.clone(), roughness: 1 });
    wallMat.map.repeat.set(20, 3);
    const R = 90, seg = 4, height = 8;
    const sides = [
      { x: 0, z: -R, w: R * 2, rotY: 0 },
      { x: 0, z: R, w: R * 2, rotY: 0 },
      { x: -R, z: 0, w: R * 2, rotY: Math.PI / 2 },
      { x: R, z: 0, w: R * 2, rotY: Math.PI / 2 },
    ];
    sides.forEach(s => {
      // leave a gate gap in the middle of each side
      const half = (s.w - 16) / 2;
      [-1, 1].forEach(dir => {
        const seg = new THREE.Mesh(new THREE.BoxGeometry(half, height, 2.2), wallMat);
        seg.castShadow = true; seg.receiveShadow = true;
        if (s.rotY === 0) { seg.position.set(s.x + dir * (8 + half / 2), height / 2, s.z); }
        else { seg.position.set(s.x, height / 2, s.z + dir * (8 + half / 2)); seg.rotation.y = Math.PI / 2; }
        world.add(seg);
        // battlements
        for (let i = 0; i < half; i += 3) {
          const m = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.2, 2.6), wallMat);
          if (s.rotY === 0) m.position.set(s.x + dir * (8 + half / 2) - half / 2 + i + 0.6, height + 0.6, s.z);
          else m.position.set(s.x, height + 0.6, s.z + dir * (8 + half / 2) - half / 2 + i + 0.6);
          world.add(m);
        }
      });
      // collider for wall as a long thin box
      if (s.rotY === 0) addCollider(s.x, s.z, s.w, 2.4);
      else addCollider(s.x, s.z, 2.4, s.w);
    });
    // corner towers
    [[-R, -R], [R, -R], [-R, R], [R, R]].forEach(([tx, tz]) => {
      const tower = new THREE.Mesh(new THREE.CylinderGeometry(4, 4.4, 12, 16), wallMat);
      tower.position.set(tx, 6, tz); tower.castShadow = true; world.add(tower);
      const cone = new THREE.Mesh(new THREE.ConeGeometry(4.6, 4, 16),
        new THREE.MeshStandardMaterial({ map: TX.roofTexture('#5a3d6b'), roughness: 1 }));
      cone.position.set(tx, 14, tz); cone.castShadow = true; world.add(cone);
      addCollider(tx, tz, 8, 8);
    });
  }

  // ---------- Castle (Nottingham) in the distance ----------
  function castle() {
    const g = new THREE.Group(); g.position.set(0, 0, -70);
    const stoneMat = new THREE.MeshStandardMaterial({ map: brick.clone(), roughness: 1 });
    stoneMat.map.repeat.set(6, 4);
    const keep = new THREE.Mesh(new THREE.BoxGeometry(16, 22, 16), stoneMat);
    keep.position.y = 11; keep.castShadow = true; g.add(keep);
    [[-8, -8], [8, -8], [-8, 8], [8, 8]].forEach(([tx, tz]) => {
      const t = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 3, 28, 12), stoneMat);
      t.position.set(tx, 14, tz); t.castShadow = true; g.add(t);
      const c = new THREE.Mesh(new THREE.ConeGeometry(3.2, 5, 12),
        new THREE.MeshStandardMaterial({ map: TX.roofTexture('#5a3d6b'), roughness: 1 }));
      c.position.set(tx, 30.5, tz); g.add(c);
    });
    // flag
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 6, 6), matDarkWood);
    pole.position.set(0, 25, 0); g.add(pole);
    const flag = new THREE.Mesh(new THREE.PlaneGeometry(3, 1.6),
      new THREE.MeshStandardMaterial({ color: 0x7a1f1f, side: THREE.DoubleSide }));
    flag.position.set(1.6, 27, 0); g.add(flag);
    world.add(g);
    addCollider(0, -70, 34, 34);
  }

  // ---------- Build the four SHOPS ----------
  function makeSign(text, emoji) {
    const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#2a1a0e'; ctx.fillRect(0, 0, 512, 128);
    ctx.strokeStyle = '#e8b743'; ctx.lineWidth = 6; ctx.strokeRect(6, 6, 500, 116);
    ctx.fillStyle = '#ffd76a'; ctx.font = 'bold 44px Georgia'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(emoji + '  ' + text, 256, 66);
    const tex = new THREE.CanvasTexture(canvas); tex.colorSpace = THREE.SRGBColorSpace;
    return new THREE.MeshStandardMaterial({ map: tex, roughness: 0.7 });
  }

  SHOPS.forEach((shop, i) => {
    const [sx, sz] = shop.pos;
    const [w, h, d] = shop.size;
    const floors = Math.max(2, Math.round(h / 3.2));
    const isBrick = i % 2 === 0;
    building({ x: sx, z: sz, w, d, floors, rot: shop.rot,
      wallStyle: isBrick ? 'brick' : 'plaster',
      roofColor: '#' + shop.roof.toString(16).padStart(6, '0') });

    // hanging shop sign facing the plaza (door faces -rot direction toward center)
    const sign = new THREE.Mesh(new THREE.BoxGeometry(4, 1, 0.2), makeSign(shop.name.replace(/^The /, ''), shop.icon));
    const facing = new THREE.Vector3(Math.sin(shop.rot + Math.PI), 0, Math.cos(shop.rot + Math.PI));
    sign.position.set(sx + facing.x * (Math.abs(facing.x) > 0.5 ? w / 2 + 0.6 : 0),
      4.2, sz + facing.z * (Math.abs(facing.z) > 0.5 ? d / 2 + 0.6 : 0));
    sign.rotation.y = shop.rot;
    world.add(sign);

    // glowing marker / interaction zone at the door (toward center)
    const dir = new THREE.Vector3(-sx, 0, -sz).normalize();
    const zx = sx + dir.x * (Math.max(w, d) / 2 + 2.5);
    const zz = sz + dir.z * (Math.max(w, d) / 2 + 2.5);
    const ring = new THREE.Mesh(new THREE.RingGeometry(1.2, 1.7, 32),
      new THREE.MeshBasicMaterial({ color: 0xffd76a, side: THREE.DoubleSide, transparent: true, opacity: 0.7 }));
    ring.rotation.x = -Math.PI / 2; ring.position.set(zx, 0.06, zz);
    world.add(ring);
    shopZones.push({ x: zx, z: zz, radius: 4, shop, ring });

    // a couple of barrels/crates outside
    for (let b = 0; b < 3; b++) {
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 1.1, 12), matWood);
      barrel.position.set(zx + (Math.random() - 0.5) * 4, 0.55, zz + (Math.random() - 0.5) * 4);
      barrel.castShadow = true; world.add(barrel);
    }
  });

  // ---------- Populate the town ----------
  townWall();
  castle();
  fountain();

  // decorative filler houses around the blocks
  const fillerSpots = [
    [-55, -50], [-40, -55], [-58, -35], [-52, -18], [-58, 40], [-42, 55], [-56, 50],
    [55, -50], [40, -55], [58, -35], [52, -18], [58, 40], [42, 55], [56, 50],
    [-14, -55], [14, -55], [-14, 55], [14, 55], [-55, 12], [55, 12], [-55, -8], [55, -8],
  ];
  fillerSpots.forEach(([fx, fz], i) => {
    const rot = Math.abs(fx) > Math.abs(fz) ? (fx > 0 ? -Math.PI / 2 : Math.PI / 2) : (fz > 0 ? Math.PI : 0);
    building({ x: fx, z: fz, w: 7 + Math.random() * 3, d: 7 + Math.random() * 2,
      floors: 2 + (Math.random() < 0.4 ? 1 : 0), rot,
      wallStyle: Math.random() < 0.5 ? 'brick' : 'plaster',
      roofColor: ['#8a3323', '#7a4030', '#5a3d6b', '#6b5320'][i % 4],
      thatch: Math.random() < 0.25 });
  });

  // trees, lamps, stalls around plaza
  const treeRing = [[-16, -16], [16, -16], [-16, 16], [16, 16], [-40, 0], [40, 0], [0, -40], [0, 40],
    [-70, -20], [70, 20], [-20, 70], [20, -70], [45, 45], [-45, -45], [45, -45], [-45, 45]];
  treeRing.forEach(([tx, tz]) => tree(tx, tz, 0.9 + Math.random() * 0.6));

  [[-8, -8], [8, -8], [-8, 8], [8, 8], [0, -30], [0, 30], [-30, 0], [30, 0]].forEach(([lx, lz]) => lamp(lx, lz));

  stall(-10, 5, 0.3, 0x8a3323);
  stall(10, -5, -0.4, 0x2f5d84);
  stall(6, 11, Math.PI, 0x6b8a2f);
  stall(-6, -11, 0.1, 0x8a6b2f);

  return { world, colliders, shopZones };
}
