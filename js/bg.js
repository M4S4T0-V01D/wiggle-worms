// Underground backdrop: tiled dirt texture, parallax pebbles, roots and buried treasures.
const BG = (() => {
  const TILE = 2048;
  let dirt = null;

  function rng(seed) {
    return () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  }
  function hash(x, y, s) {
    let h = (x * 374761393 + y * 668265263 + s * 2147483647) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }

  // Dirt: soft light/dark patches, old tunnels and grit, drawn wrapped so the tile repeats.
  function buildDirt() {
    const c = document.createElement('canvas');
    c.width = c.height = TILE;
    const g = c.getContext('2d');
    g.fillStyle = '#3b2414';
    g.fillRect(0, 0, TILE, TILE);
    const r = rng(7);
    const wrap = (x, y, rad, fn) => {
      for (let ox = -1; ox <= 1; ox++) for (let oy = -1; oy <= 1; oy++) {
        const cx = x + ox * TILE, cy = y + oy * TILE;
        if (cx + rad < 0 || cy + rad < 0 || cx - rad > TILE || cy - rad > TILE) continue;
        fn(cx, cy);
      }
    };
    for (let i = 0; i < 160; i++) {
      const x = r() * TILE, y = r() * TILE, rad = 100 + r() * 420;
      const light = r() < 0.5, a = 0.05 + r() * 0.08;
      wrap(x, y, rad, (cx, cy) => {
        const gr = g.createRadialGradient(cx, cy, 0, cx, cy, rad);
        gr.addColorStop(0, light ? `rgba(120,78,44,${a})` : `rgba(20,10,4,${a * 1.4})`);
        gr.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = gr;
        g.fillRect(cx - rad, cy - rad, rad * 2, rad * 2);
      });
    }
    // old worm tunnels
    g.lineCap = 'round';
    for (let i = 0; i < 26; i++) {
      let x = r() * TILE, y = r() * TILE, a = r() * 6.28;
      const wdt = 14 + r() * 20, steps = 20 + (r() * 30 | 0);
      const path = [[x, y]];
      for (let k = 0; k < steps; k++) { a += (r() - 0.5) * 0.7; x += Math.cos(a) * 18; y += Math.sin(a) * 18; path.push([x, y]); }
      for (const [col, lw] of [['rgba(15,7,2,.35)', wdt], ['rgba(70,42,22,.25)', wdt * 0.55]]) {
        g.strokeStyle = col; g.lineWidth = lw;
        for (let ox = -1; ox <= 1; ox++) for (let oy = -1; oy <= 1; oy++) {
          g.beginPath();
          path.forEach(([px, py], k) => k ? g.lineTo(px + ox * TILE, py + oy * TILE) : g.moveTo(px + ox * TILE, py + oy * TILE));
          g.stroke();
        }
      }
    }
    // grit
    for (let i = 0; i < 9000; i++) {
      const v = r();
      g.fillStyle = v < 0.5 ? `rgba(0,0,0,${r() * 0.35})` : `rgba(200,150,100,${r() * 0.25})`;
      const s = 1 + (r() * 2 | 0);
      g.fillRect(r() * TILE, r() * TILE, s, s);
    }
    dirt = c;
  }

  // Parallax pebble layers (replaces the dragon game's stars).
  const layers = [
    { par: 0.15, cell: 110, size: 2.5, a: 0.35 },
    { par: 0.35, cell: 170, size: 4, a: 0.55 },
    { par: 0.6, cell: 280, size: 7, a: 0.8 },
  ];
  const pebbleCols = ['#8a7560', '#6e5a48', '#a08a70', '#5a4a3c', '#b09878'];

  // Buried things far off: bones, roots, fossils, a few treasures.
  const bodies = (() => {
    const r = rng(99), out = [], kinds = ['bone', 'root', 'fossil', 'root', 'chest', 'bone', 'fossil', 'root', 'can'];
    for (let i = 0; i < kinds.length; i++) {
      out.push({ x: (r() - 0.5) * 5000, y: (r() - 0.5) * 5000, rad: 50 + r() * 110, kind: kinds[i], rot: r() * 6.28, seed: (r() * 1e6) | 0 });
    }
    return out;
  })();

  function drawBody(g, b, sx, sy) {
    g.save(); g.translate(sx, sy); g.rotate(b.rot);
    g.globalAlpha = 0.55;
    const R = b.rad;
    if (b.kind === 'bone') {
      g.fillStyle = '#d8cbb0';
      g.fillRect(-R, -R * 0.12, R * 2, R * 0.24);
      for (const sx2 of [-R, R]) for (const sy2 of [-1, 1]) { g.beginPath(); g.arc(sx2, sy2 * R * 0.14, R * 0.18, 0, 7); g.fill(); }
    } else if (b.kind === 'root') {
      const r = rng(b.seed);
      g.strokeStyle = '#5c3a1c'; g.lineCap = 'round';
      const branch = (x, y, a, len, w, d) => {
        if (d > 4 || w < 1) return;
        const x2 = x + Math.cos(a) * len, y2 = y + Math.sin(a) * len;
        g.lineWidth = w; g.beginPath(); g.moveTo(x, y);
        g.quadraticCurveTo(x + Math.cos(a + 0.4) * len * 0.5, y + Math.sin(a + 0.4) * len * 0.5, x2, y2); g.stroke();
        branch(x2, y2, a + (r() - 0.5) * 1.2, len * 0.75, w * 0.65, d + 1);
        if (r() < 0.7) branch(x2, y2, a + (r() - 0.5) * 2, len * 0.6, w * 0.5, d + 1);
      };
      branch(0, -R * 1.5, Math.PI / 2, R * 0.8, R * 0.16, 0);
    } else if (b.kind === 'fossil') {
      g.strokeStyle = '#c8b898'; g.lineWidth = R * 0.08;
      g.beginPath();
      for (let k = 0; k < 60; k++) { const a = k * 0.25, d = R * 0.06 * Math.exp(a * 0.18); k ? g.lineTo(Math.cos(a) * d, Math.sin(a) * d) : g.moveTo(0, 0); }
      g.stroke();
    } else if (b.kind === 'chest') {
      g.fillStyle = '#7a4a1e'; g.fillRect(-R * 0.6, -R * 0.35, R * 1.2, R * 0.7);
      g.fillStyle = '#e0b040'; g.fillRect(-R * 0.6, -R * 0.08, R * 1.2, R * 0.1); g.fillRect(-R * 0.08, -R * 0.15, R * 0.16, R * 0.25);
    } else {
      g.fillStyle = '#7a8a90'; g.fillRect(-R * 0.3, -R * 0.5, R * 0.6, R);
      g.fillStyle = '#c04a3a'; g.fillRect(-R * 0.3, -R * 0.25, R * 0.6, R * 0.5);
    }
    g.restore();
  }

  function draw(g, cam, W, H, t) {
    if (!dirt) buildDirt();
    const np = 0.08, nx = -((cam.x * np) % TILE + TILE) % TILE, ny = -((cam.y * np) % TILE + TILE) % TILE;
    for (let x = nx; x < W; x += TILE) for (let y = ny; y < H; y += TILE) g.drawImage(dirt, x, y);

    const bp = 0.1;
    for (const b of bodies) {
      const sx = W / 2 + (b.x - cam.x * bp) * cam.z * 0.6, sy = H / 2 + (b.y - cam.y * bp) * cam.z * 0.6;
      if (sx < -b.rad * 3 || sy < -b.rad * 3 || sx > W + b.rad * 3 || sy > H + b.rad * 3) continue;
      drawBody(g, b, sx, sy);
    }

    for (let li = 0; li < layers.length; li++) {
      const L = layers[li], z = 0.6 + cam.z * 0.4;
      const ox = cam.x * L.par, oy = cam.y * L.par;
      const x0 = Math.floor((ox - W / 2 / z) / L.cell), x1 = Math.ceil((ox + W / 2 / z) / L.cell);
      const y0 = Math.floor((oy - H / 2 / z) / L.cell), y1 = Math.ceil((oy + H / 2 / z) / L.cell);
      for (let cx = x0; cx <= x1; cx++) for (let cy = y0; cy <= y1; cy++) {
        const h = hash(cx, cy, li + 1);
        if (h > 0.55) continue;
        const px = W / 2 + ((cx + hash(cx, cy, 11)) * L.cell - ox) * z;
        const py = H / 2 + ((cy + hash(cx, cy, 13)) * L.cell - oy) * z;
        const s = L.size * (0.5 + hash(cx, cy, 17)) * z;
        g.globalAlpha = L.a;
        g.fillStyle = pebbleCols[(h * 50 | 0) % pebbleCols.length];
        g.beginPath(); g.ellipse(px, py, s, s * 0.75, h * 6, 0, 6.2832); g.fill();
        g.fillStyle = 'rgba(255,240,220,.25)';
        g.beginPath(); g.arc(px - s * 0.3, py - s * 0.25, s * 0.3, 0, 6.2832); g.fill();
      }
    }
    g.globalAlpha = 1;
  }

  return { draw };
})();
