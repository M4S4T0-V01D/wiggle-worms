// World state: snacks, power-ups, gems, particles, bot minds.
const W_R = 5200;          // arena radius
const FOOD_TARGET = 2400;
const PEARL_TARGET = 7;
const COIN_TARGET = 25;
let BOT_COUNT = 24;

const world = { dragons: [], food: [], pearls: [], coins: [], parts: [], feed: [] };

const BOT_NAMES = ['Squiggles', 'Noodle', 'Wiggles', 'Slinky', 'Squirmy', 'Dirt Dan', 'Mud Pie', 'Gummy',
  'Spaghetti', 'Jellybean', 'Mr. Wriggle', 'Sir Slimes', 'Bubbles', 'Pickle', 'Taco', 'Zoomer', 'Sprinkles', 'Biscuit',
  'Captain Crawl', 'Doodle', 'Muddy Buddy', 'Twisty', 'Ziggy', 'Slurp', 'Nugget', 'Peanut', 'Rocket Worm', 'Sludge',
  'Gloop', 'Waffles', 'Banana Bob', 'Lil Dig', 'Turbo Tom'];

function rand(a, b) { return a + Math.random() * (b - a); }
function randInArena(margin) {
  const a = Math.random() * 6.2832, r = Math.sqrt(Math.random()) * (W_R - margin);
  return { x: Math.cos(a) * r, y: Math.sin(a) * r };
}

// --- snack sprites (round candy blobs), cached per hue bucket
const dustSprites = {};
function dustSprite(hue) {
  const key = (hue / 15 | 0) * 15;
  if (dustSprites[key]) return dustSprites[key];
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = 'rgba(20,8,0,.3)';
  g.beginPath(); g.ellipse(34, 36, 13, 11, 0, 0, 6.2832); g.fill();
  const gr = g.createRadialGradient(28, 27, 2, 32, 32, 13);
  gr.addColorStop(0, `hsl(${key},100%,85%)`);
  gr.addColorStop(0.5, `hsl(${key},90%,60%)`);
  gr.addColorStop(1, `hsl(${key},80%,38%)`);
  g.fillStyle = gr; g.beginPath(); g.arc(32, 32, 12, 0, 6.2832); g.fill();
  g.fillStyle = 'rgba(255,255,255,.75)';
  g.beginPath(); g.ellipse(28, 27, 4, 2.5, -0.6, 0, 6.2832); g.fill();
  return (dustSprites[key] = c);
}
// soft glow used behind gems and power-ups
const glowSprites = {};
function glowSprite(hue) {
  const key = (hue / 15 | 0) * 15;
  if (glowSprites[key]) return glowSprites[key];
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, `hsla(${key},100%,80%,1)`);
  gr.addColorStop(0.45, `hsla(${key},100%,60%,.35)`);
  gr.addColorStop(1, 'hsla(0,0%,0%,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  return (glowSprites[key] = c);
}

function addFood(x, y, v, hue) {
  world.food.push({ x, y, v, r: 3 + v * 1.6, hue: hue ?? rand(0, 360), ph: Math.random() * 6.28 });
}
function spawnFood() {
  while (world.food.length < FOOD_TARGET) {
    const p = randInArena(40);
    addFood(p.x, p.y, Math.random() < 0.85 ? 1 : 2.5);
  }
}
function spawnPearls() {
  const keys = Object.keys(POWERS);
  while (world.pearls.length < PEARL_TARGET) {
    const p = randInArena(300);
    world.pearls.push({ x: p.x, y: p.y, type: keys[(Math.random() * keys.length) | 0], ph: Math.random() * 6.28 });
  }
}

function spawnCoins() {
  while (world.coins.length < COIN_TARGET) {
    const p = randInArena(200);
    world.coins.push({ x: p.x, y: p.y, ph: Math.random() * 6.28 });
  }
}

function burst(x, y, color, n, speed) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * 6.2832, s = Math.random() * speed;
    world.parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 1, c: color, sz: rand(1.5, 4) });
  }
}

function feedMsg(html) {
  const el = document.getElementById('feed');
  const d = document.createElement('div'); d.innerHTML = html; el.prepend(d);
  while (el.children.length > 5) el.lastChild.remove();
}

function hslHex(h, s, l) {
  const f = n => { const k = (n + h / 30) % 12, c = l - s * Math.min(l, 1 - l) * Math.max(-1, Math.min(k - 3, 9 - k, 1)); return Math.round(c * 255).toString(16).padStart(2, '0'); };
  return '#' + f(0) + f(8) + f(4);
}
// bots wear random colours and cosmetics, rarer ones in harder worlds
function randomLook(tier) {
  const pick = a => a[(Math.random() * a.length) | 0];
  const look = Object.assign({}, pick(PRESETS));
  if (Math.random() < 0.35) { const h = Math.random() * 360; look.body = hslHex(h, 0.65, 0.48); look.glow = hslHex(h + 20, 1, 0.65); }
  for (const [slot] of SLOTS) {
    const pool = CATALOG[slot].filter(i => i.lvl <= tier && slot !== 'title');
    look[slot] = pool.length ? pick(pool).id : CATALOG[slot][0].id;
  }
  look.title = '';
  return look;
}

function makeBot() {
  const p = randInArena(800);
  const kind = randomLook(3 + Realm.cur.lvl);
  const used = new Set(world.dragons.map(d => d.name));
  const free = BOT_NAMES.filter(n => !used.has(n));
  const d = new Dragon(p.x, p.y, kind, free.length ? free[(Math.random() * free.length) | 0] : 'Worm', false);
  d.mass = Math.random() < 0.25 ? rand(300, 1200) : rand(40, 250);
  d.mind = { t: 0, wander: d.angle, aggro: rand(0.2, 0.9) };
  // unfurl the body in a lazy curve before it appears
  const frames = Math.min(900, d.length / 4.3);
  for (let i = 0; i < frames; i++) { d.target = d.angle + 0.02; d.update(1, 0); }
  return d;
}

// --- bot AI
function clearance(bot, ang, dist) {
  // smallest gap between a probe point ahead and any other dragon's body / the border
  const h = bot.draw[0];
  let best = Infinity;
  for (const step of [0.35, 0.7, 1]) {
    const px = h.x + Math.cos(ang) * dist * step, py = h.y + Math.sin(ang) * dist * step;
    const edge = Math.min(W_R - Math.hypot(px, py), Realm.clear(px, py));
    if (edge < best) best = edge;
    for (const o of world.dragons) {
      if (o === bot || !o.alive) continue;
      if (Math.abs(o.bx - px) > o.bw + 200 || Math.abs(o.by - py) > o.bh + 200) continue;
      const D = o.draw;
      for (let i = 0; i < D.length; i += 2) {
        const e = D[i], g = Math.hypot(e.x - px, e.y - py) - e.r;
        if (g < best) best = g;
      }
    }
  }
  return best;
}

function thinkBot(b, now) {
  const m = b.mind;
  if (--m.t > 0) return;
  m.t = 4 + (Math.random() * 4 | 0);
  const h = b.draw[0], look = 120 + b.width * 4;
  const spirit = b.has('spirit', now);

  // 1) avoid danger
  if (!spirit) {
    const fwd = clearance(b, b.angle, look);
    if (fwd < b.width * 1.6) {
      const l = clearance(b, b.angle - 0.9, look), r = clearance(b, b.angle + 0.9, look);
      b.target = b.angle + (l > r ? -1.3 : 1.3);
      b.boost = fwd < b.width * 0.6 && b.mass > 80 && Math.random() < 0.5;
      return;
    }
  }
  b.boost = b.has('thunder', now);

  // 2) hunt: cut in front of a nearby rival's head
  if (b.mass > 120 && Math.random() < m.aggro) {
    let prey = null, pd = 520;
    for (const o of world.dragons) {
      if (o === b || !o.alive || o.has('spirit', now)) continue;
      const d = Math.hypot(o.draw[0].x - h.x, o.draw[0].y - h.y);
      if (d < pd && o.mass < b.mass * 1.4) { pd = d; prey = o; }
    }
    if (prey) {
      const lead = 140 + prey.width * 3, ph = prey.draw[0];
      const tx = ph.x + Math.cos(prey.angle) * lead, ty = ph.y + Math.sin(prey.angle) * lead;
      b.target = Math.atan2(ty - h.y, tx - h.x);
      b.boost = b.boost || (pd < 320 && b.mass > 150 && Math.random() < 0.6);
      return;
    }
  }

  // 3) pearls, then the richest nearby stardust
  let best = null, bs = 0;
  for (const p of world.pearls) {
    const d = Math.hypot(p.x - h.x, p.y - h.y);
    if (d < 900 && 50 / d > bs) { bs = 50 / d; best = p; }
  }
  if (!best) for (const f of world.food) {
    const dx = f.x - h.x, dy = f.y - h.y;
    if (dx > 500 || dx < -500 || dy > 500 || dy < -500) continue;
    const d = Math.hypot(dx, dy) + 30;
    // prefer what's ahead: turning around is slow
    const ahead = 1 + 0.6 * Math.cos(Math.atan2(dy, dx) - b.angle);
    const sc = f.v * ahead / d;
    if (sc > bs) { bs = sc; best = f; }
  }
  if (best) b.target = Math.atan2(best.y - h.y, best.x - h.x);
  else {
    m.wander += rand(-0.5, 0.5);
    b.target = m.wander;
  }
  // drift home if near the rim
  if (Math.hypot(h.x, h.y) > W_R - 600) b.target = Math.atan2(-h.y, -h.x);
}
