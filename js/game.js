// Main loop: simulation, collisions, camera, rendering, HUD, menu.
const cv = document.getElementById('c'), g = cv.getContext('2d');
const mini = document.getElementById('mini'), mg = mini.getContext('2d');
let W = 0, H = 0, DPR = 1;
const cam = { x: 0, y: 0, z: 1, showOwnName: false };
const input = { mx: 0, my: 0, down: false, key: false };
let player = null, playing = false, lastT = performance.now(), deadAt = 0;

function resize() {
  DPR = Math.min(2, window.devicePixelRatio || 1);
  W = innerWidth; H = innerHeight;
  cv.width = W * DPR; cv.height = H * DPR;
}
addEventListener('resize', resize); resize();

// --- input
addEventListener('mousemove', e => { input.mx = e.clientX; input.my = e.clientY; });
cv.addEventListener('mousedown', () => input.down = true);
addEventListener('mouseup', () => input.down = false);
addEventListener('keydown', e => { if (e.code === 'Space') { input.key = true; e.preventDefault(); } });
addEventListener('keyup', e => { if (e.code === 'Space') input.key = false; });
cv.addEventListener('touchstart', e => { const t = e.touches[0]; input.mx = t.clientX; input.my = t.clientY; input.down = e.touches.length > 1; }, { passive: true });
cv.addEventListener('touchmove', e => { const t = e.touches[0]; input.mx = t.clientX; input.my = t.clientY; }, { passive: true });
cv.addEventListener('touchend', e => { input.down = e.touches.length > 1; });

// --- world setup
let pearlTarget = PEARL_TARGET;
function initWorld(realm) {
  world.dragons.length = 0; world.food.length = 0; world.pearls.length = 0; world.parts.length = 0; world.coins.length = 0;
  player = null;
  Realm.setup(realm);
  BOT_COUNT = realm.bots;
  pearlTarget = realm.id === 'palace' ? 12 : PEARL_TARGET;
  spawnFood(); spawnPearls(); spawnCoins();
  for (let i = 0; i < BOT_COUNT; i++) world.dragons.push(makeBot());
}

function kill(d, by, why) {
  if (!d.alive) return;
  d.alive = false;
  const D = d.draw, share = (d.mass * 0.75) / Math.max(1, D.length / 2);
  for (let i = 0; i < D.length; i += 2) {
    const e = D[i];
    addFood(e.x + rand(-e.r, e.r), e.y + rand(-e.r, e.r), Math.min(d.boss ? 12 : 6, share), d.hue + rand(-20, 20));
  }
  burst(D[0].x, D[0].y, d.look.glow, d.boss ? 160 : 40, d.boss ? 14 : 7);
  if (d.boss) {
    Realm.bossDied(performance.now());
    for (let i = 0; i < 30; i++) { const e = D[(Math.random() * D.length) | 0]; world.coins.push({ x: e.x + rand(-40, 40), y: e.y + rand(-40, 40), ph: rand(0, 6) }); }
    if (by === player) player.emperor = true;
  }
  if (by) {
    by.kills++;
    const me = d === player || by === player;
    feedMsg(`<span style="color:${me ? '#ffe36b' : '#ffc2cf'}">${d.name}</span> bonked into <b>${by.name}</b>`);
  } else if (d === player) feedMsg(why ? `You ${why}` : 'You dug into the bedrock');
  if (d === player) { deadAt = performance.now(); player.cause = by ? `bonked into ${by.name}` : (why || 'dug into the bedrock'); }
}

// --- simulation step
function step(f, now) {
  if (player && player.alive) {
    const h = player.draw[0] || player.pts[0];
    const sx = (h.x - cam.x) * cam.z + W / 2, sy = (h.y - cam.y) * cam.z + H / 2;
    player.target = Math.atan2(input.my - sy, input.mx - sx);
    player.boost = (input.down || input.key) && (player.mass > 30 || player.has('thunder', now));
  }
  Realm.update(f, now);

  for (const d of world.dragons) {
    if (!d.alive) continue;
    if (d !== player) thinkBot(d, now);
    d.update(f, now);
    if (d.boost) d.surge += f / 60;
    // zooming burns length and drops snacks behind
    if (d.boost && !d.has('thunder', now)) {
      const cost = 0.11 * f * (1 + d.mass / 2000);
      d.mass -= cost;
      d.shed = (d.shed || 0) + cost;
      if (d.shed > 1.5) {
        const t = d.draw[d.draw.length - 1];
        addFood(t.x, t.y, d.shed * 0.8, d.hue);
        d.shed = 0;
      }
    }
    if (d.boost && Math.random() < 0.5) {
      const t = d.draw[d.draw.length - 1];
      world.parts.push({ x: t.x, y: t.y, vx: rand(-1, 1), vy: rand(-1, 1), life: 1, c: d.has('thunder', now) ? '#ffe14a' : d.look.glow, sz: rand(1, 3) });
    }
    if (d.look.trail !== 'none' && (d === player || Math.random() < 0.4)) Parts.emitTrail(d, f);
    // bounding box for culling + broad-phase
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const e of d.draw) { if (e.x < x0) x0 = e.x; if (e.x > x1) x1 = e.x; if (e.y < y0) y0 = e.y; if (e.y > y1) y1 = e.y; }
    d.bx = (x0 + x1) / 2; d.by = (y0 + y1) / 2; d.bw = (x1 - x0) / 2 + d.width; d.bh = (y1 - y0) / 2 + d.width;
  }

  // eating
  for (const d of world.dragons) {
    if (!d.alive) continue;
    const h = d.draw[0], reach = d.width * 0.7, pull = d.has('gravity', now) ? 380 : d.width * 2.2 + 20;
    const F = world.food;
    for (let i = F.length - 1; i >= 0; i--) {
      const fo = F[i], dx = h.x - fo.x, dy = h.y - fo.y;
      if (dx > pull || dx < -pull || dy > pull || dy < -pull) continue;
      const dd = Math.hypot(dx, dy);
      if (dd < reach + fo.r) { d.mass += fo.v; d.dust += fo.v; F[i] = F[F.length - 1]; F.pop(); continue; }
      if (dd < pull) { const k = Math.min(1, (6 + d.speed) * f / dd); fo.x += dx * k * 0.5; fo.y += dy * k * 0.5; }
    }
    for (let i = world.pearls.length - 1; i >= 0; i--) {
      const p = world.pearls[i];
      if (Math.hypot(h.x - p.x, h.y - p.y) < d.width + 18) {
        d.power = p.type; d.powerEnd = now + POWERS[p.type].dur; d.mass += 15; d.pearls++;
        burst(p.x, p.y, POWERS[p.type].color, 50, 6);
        if (d === player) feedMsg(`<b style="color:${POWERS[p.type].color}">${POWERS[p.type].kanji} ${POWERS[p.type].name}</b> power-up!`);
        world.pearls.splice(i, 1);
      }
    }
  }
  // gems: only the player can collect gems
  if (player && player.alive) {
    const h = player.draw[0], pull = player.has('gravity', now) ? 380 : player.width * 2.2 + 40;
    for (let i = world.coins.length - 1; i >= 0; i--) {
      const c = world.coins[i], dx = h.x - c.x, dy = h.y - c.y, dd = Math.hypot(dx, dy);
      if (dd < player.width * 0.8 + 14) {
        player.coins++; burst(c.x, c.y, '#7ad8ff', 18, 4);
        world.coins.splice(i, 1);
      } else if (dd < pull) { const k = Math.min(1, 10 * f / dd); c.x += dx * k * 0.5; c.y += dy * k * 0.5; }
    }
    for (const q of Save.p.quests) if (q.id === 'mass') q.peak = Math.max(q.peak || 0, player.mass | 0);
  }

  // collisions: a head bonking into another worm's body knocks the bonker out
  for (const a of world.dragons) {
    if (!a.alive) continue;
    const h = a.draw[0];
    if (Math.hypot(h.x, h.y) > W_R) { kill(a, null); continue; }
    if (a.has('spirit', now)) continue;
    const hr = a.width * 0.4, ag = a.has('giant', now);
    for (const b of world.dragons) {
      if (b === a || !b.alive || b.has('spirit', now)) continue;
      if (Math.abs(b.bx - h.x) > b.bw || Math.abs(b.by - h.y) > b.bh) continue;
      const D = b.draw;
      let hit = false;
      for (let i = 0; i < D.length; i++) {
        const e = D[i], rr = hr + e.r * 0.85;
        const dx = e.x - h.x, dy = e.y - h.y;
        if (dx * dx + dy * dy < rr * rr) {
          // head-on: a Mega worm wins, otherwise the smaller worm is out
          const bg = b.has('giant', now);
          if (i < 3 && (ag && !bg || ag === bg && a.mass > b.mass)) { kill(b, a); } else { kill(a, b); hit = true; }
          break;
        }
      }
      if (hit || !a.alive) break;
    }
  }

  // housekeeping
  for (let i = world.dragons.length - 1; i >= 0; i--) {
    const d = world.dragons[i];
    if (!d.alive && d !== player) world.dragons.splice(i, 1);
  }
  while (world.dragons.filter(d => d !== player && !d.boss).length < BOT_COUNT) world.dragons.push(makeBot());
  if (world.food.length < FOOD_TARGET && Math.random() < 0.6) {
    for (let i = 0; i < 6; i++) { const p = randInArena(40); addFood(p.x, p.y, Math.random() < 0.85 ? 1 : 2.5); }
  }
  if (world.pearls.length < pearlTarget && Math.random() < 0.004) spawnPearls();
  if (world.coins.length < COIN_TARGET && Math.random() < 0.01) spawnCoins();
  for (let i = world.parts.length - 1; i >= 0; i--) {
    const p = world.parts[i];
    p.x += p.vx * f; p.y += p.vy * f; p.vx *= 0.96; p.vy *= 0.96; p.life -= (p.t === 'ink' ? 0.012 : 0.02) * f;
    if (p.rot !== undefined) p.rot += 0.05 * f;
    if (p.life <= 0) { world.parts[i] = world.parts[world.parts.length - 1]; world.parts.pop(); }
  }
}

// --- rendering
function render(now) {
  g.setTransform(DPR, 0, 0, DPR, 0, 0);
  BG.draw(g, cam, W, H, now);

  g.setTransform(DPR * cam.z, 0, 0, DPR * cam.z, DPR * (W / 2 - cam.x * cam.z), DPR * (H / 2 - cam.y * cam.z));
  const vx0 = cam.x - W / 2 / cam.z, vx1 = cam.x + W / 2 / cam.z, vy0 = cam.y - H / 2 / cam.z, vy1 = cam.y + H / 2 / cam.z;

  // the bedrock wall around the yard
  g.save();
  g.beginPath(); g.rect(vx0 - 10, vy0 - 10, vx1 - vx0 + 20, vy1 - vy0 + 20); g.moveTo(W_R, 0); g.arc(0, 0, W_R, 0, 6.2832, true);
  g.fillStyle = 'rgba(30,26,24,.85)'; g.fill();
  g.lineWidth = 40; g.strokeStyle = '#4a4440';
  g.beginPath(); g.arc(0, 0, W_R + 20, 0, 6.2832); g.stroke();
  g.lineWidth = 6; g.strokeStyle = `rgba(255,210,80,${0.5 + 0.2 * Math.sin(now * 0.003)})`;
  g.setLineDash([40, 30]); g.lineDashOffset = -now * 0.02;
  g.beginPath(); g.arc(0, 0, W_R, 0, 6.2832); g.stroke();
  g.setLineDash([]);
  g.restore();
  Realm.renderBack(g, now, [vx0, vx1, vy0, vy1]);
  g.globalCompositeOperation = 'source-over';

  // mud splats sit under everything
  for (const p of world.parts) {
    if (p.t !== 'ink') continue;
    g.globalAlpha = p.life * 0.6; g.fillStyle = p.c;
    g.beginPath(); g.arc(p.x, p.y, p.sz * (1.6 - p.life * 0.6), 0, 6.2832); g.fill();
  }
  g.globalAlpha = 1;

  // snacks
  for (const fo of world.food) {
    if (fo.x < vx0 - 30 || fo.x > vx1 + 30 || fo.y < vy0 - 30 || fo.y > vy1 + 30) continue;
    const s = fo.r * (3.2 + 0.25 * Math.sin(now * 0.004 + fo.ph));
    g.drawImage(dustSprite(fo.hue), fo.x - s, fo.y - s, s * 2, s * 2);
  }
  // power-ups
  for (const p of world.pearls) {
    if (p.x < vx0 - 80 || p.x > vx1 + 80 || p.y < vy0 - 80 || p.y > vy1 + 80) continue;
    drawPearl(p, now);
  }
  // gems
  for (const c of world.coins) {
    if (c.x < vx0 - 40 || c.x > vx1 + 40 || c.y < vy0 - 40 || c.y > vy1 + 40) continue;
    drawCoin(c, now);
  }
  // particles
  g.globalCompositeOperation = 'lighter';
  for (const p of world.parts) {
    if (p.t === 'ink') continue;
    g.globalAlpha = p.life; g.fillStyle = p.c;
    if (p.t === 'bubble') {
      g.strokeStyle = p.c; g.lineWidth = 1.2;
      g.beginPath(); g.arc(p.x, p.y, p.sz * (1.4 - p.life * 0.4), 0, 6.2832); g.stroke();
    } else if (p.t === 'petal') {
      g.save(); g.translate(p.x, p.y); g.rotate(p.rot);
      g.beginPath(); g.ellipse(0, 0, p.sz, p.sz * 0.5, 0, 0, 6.2832); g.fill(); g.restore();
    } else g.fillRect(p.x - p.sz / 2, p.y - p.sz / 2, p.sz, p.sz);
  }
  g.globalAlpha = 1;
  g.globalCompositeOperation = 'source-over';

  // worms, smaller first, player on top
  const vis = world.dragons.filter(d => d.alive && d.draw.length &&
    d.bx + d.bw > vx0 && d.bx - d.bw < vx1 && d.by + d.bh > vy0 && d.by - d.bh < vy1);
  vis.sort((a, b) => (a === player) - (b === player) || a.mass - b.mass);
  for (const d of vis) d.render(g, now, cam);

  const tint = Realm.cur.tint;
  if (tint) { g.setTransform(DPR, 0, 0, DPR, 0, 0); g.fillStyle = tint; g.fillRect(0, 0, W, H); }
}

function drawCoin(c, now) {
  const bob = Math.sin(now * 0.004 + c.ph) * 4, x = c.x, y = c.y + bob, sp = Math.cos(now * 0.003 + c.ph);
  g.save(); g.translate(x, y);
  g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.35;
  g.drawImage(glowSprite(195), -26, -26, 52, 52);
  g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
  g.scale(0.35 + 0.65 * Math.abs(sp), 1);
  // cut gem
  g.fillStyle = '#4ab4ff';
  g.beginPath(); g.moveTo(-11, -4); g.lineTo(-6, -10); g.lineTo(6, -10); g.lineTo(11, -4); g.lineTo(0, 12); g.closePath(); g.fill();
  g.fillStyle = '#bff0ff';
  g.beginPath(); g.moveTo(-11, -4); g.lineTo(-6, -10); g.lineTo(6, -10); g.lineTo(11, -4); g.closePath(); g.fill();
  g.fillStyle = '#1a6ac4';
  g.beginPath(); g.moveTo(0, -4); g.lineTo(11, -4); g.lineTo(0, 12); g.closePath(); g.fill();
  g.strokeStyle = '#eafaff'; g.lineWidth = 1.2;
  g.beginPath(); g.moveTo(-11, -4); g.lineTo(-6, -10); g.lineTo(6, -10); g.lineTo(11, -4); g.lineTo(0, 12); g.closePath(); g.stroke();
  g.fillStyle = 'rgba(255,255,255,.9)'; g.fillRect(-4, -8, 3, 2);
  g.restore();
}

function drawPearl(p, now) {
  const c = POWERS[p.type].color, bob = Math.sin(now * 0.003 + p.ph) * 6, x = p.x, y = p.y + bob;
  const pulse = 1 + 0.08 * Math.sin(now * 0.006 + p.ph);
  g.save();
  g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.5;
  g.drawImage(glowSprite(hexToHsl(c)[0]), x - 40, y - 40, 80, 80);
  g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
  // spinning sparkle ring
  for (let j = 0; j < 6; j++) {
    const a = now * 0.002 + j * 1.047;
    g.fillStyle = j % 2 ? c : '#fff';
    g.beginPath(); g.arc(x + Math.cos(a) * 24, y + Math.sin(a) * 24, 2.2, 0, 6.2832); g.fill();
  }
  // bubble with the power-up inside
  g.fillStyle = 'rgba(255,255,255,.85)'; g.strokeStyle = c; g.lineWidth = 3;
  g.beginPath(); g.arc(x, y, 17 * pulse, 0, 6.2832); g.fill(); g.stroke();
  g.font = '20px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(POWERS[p.type].kanji, x, y + 1);
  g.textBaseline = 'alphabetic';
  g.restore();
}

// --- HUD
let hudTick = 0;
function hud(now) {
  if (++hudTick % 10) return;
  const ranked = world.dragons.filter(d => d.alive).sort((a, b) => b.mass - a.mass);
  const lb = document.getElementById('lb');
  lb.innerHTML = ranked.slice(0, 10).map(d =>
    `<li class="${d === player ? 'me' : ''}">${d.name}<span>${d.mass | 0}</span></li>`).join('');
  if (player && player.alive) {
    const rank = ranked.indexOf(player) + 1;
    document.getElementById('score').innerHTML =
      `Length <b>${player.mass | 0}</b><br>Rank ${rank} of ${ranked.length} · Bonks ${player.kills}<br><span class="jade">💎 ${player.coins * 5}</span> · ${Realm.cur.kanji} ${Realm.cur.name}`;
    const pe = document.getElementById('pearl');
    if (player.power) {
      const P = POWERS[player.power];
      pe.style.color = P.color;
      pe.textContent = `${P.kanji} ${P.name.toUpperCase()} · ${Math.ceil((player.powerEnd - now) / 1000)}s`;
    } else pe.textContent = '';
  }
  // minimap
  const S = mini.width, k = S / 2 / W_R;
  mg.clearRect(0, 0, S, S);
  mg.strokeStyle = 'rgba(255,210,80,.5)'; mg.beginPath(); mg.arc(S / 2, S / 2, S / 2 - 1, 0, 6.2832); mg.stroke();
  const rid = Realm.cur.id;
  if (rid === 'sun' || rid === 'blackhole') { mg.fillStyle = rid === 'sun' ? '#ff6a2a' : '#4ab4ff'; mg.beginPath(); mg.arc(S / 2, S / 2, rid === 'sun' ? 7 : 5, 0, 6.2832); mg.fill(); }
  Realm.minimap(mg, S, k);
  mg.fillStyle = 'rgba(122,216,255,.6)';
  for (const c of world.coins) mg.fillRect(S / 2 + c.x * k - 0.5, S / 2 + c.y * k - 0.5, 1.5, 1.5);
  for (const p of world.pearls) { mg.fillStyle = POWERS[p.type].color; mg.fillRect(S / 2 + p.x * k - 1, S / 2 + p.y * k - 1, 2, 2); }
  for (const d of world.dragons) {
    if (!d.alive) continue;
    const s = d === player ? 5 : d.boss ? 9 : 2 + d.width / 20;
    mg.fillStyle = d === player ? '#fff' : d.boss ? '#ffd84a' : d.look.glow;
    mg.beginPath(); mg.arc(S / 2 + d.draw[0].x * k, S / 2 + d.draw[0].y * k, s / 2 + 0.5, 0, 6.2832); mg.fill();
  }
}

// --- loop
function frame(now) {
  const dt = Math.min(50, now - lastT); lastT = now;
  const f = dt / 16.667;
  step(f, now);

  // camera follows the player (or drifts after death)
  const focus = player && player.draw[0] ? player.draw[0] : { x: 0, y: 0 };
  cam.x += (focus.x - cam.x) * 0.12; cam.y += (focus.y - cam.y) * 0.12;
  const pw = player ? player.width : 12;
  const zt = (Math.min(W, H) / 900) * 1.15 / (1 + (pw - 12) / 38) * (playing ? 1 : 0.7);
  cam.z += (zt - cam.z) * 0.04;

  render(now);
  if (playing) hud(now);

  if (playing && player && !player.alive && now - deadAt > 1800) endGame();
  requestAnimationFrame(frame);
}

// --- start / end of a life
function startGame() {
  const P = Save.p, realm = REALMS.find(r => r.id === P.realm) || REALMS[0];
  if (Realm.cur !== realm) initWorld(realm);
  if (player) { const i = world.dragons.indexOf(player); if (i >= 0) world.dragons.splice(i, 1); }
  const p = randInArena(1500);
  player = new Dragon(p.x, p.y, Object.assign({}, P.look), P.name || 'Wormy', true);
  player.power = 'spirit'; player.powerEnd = performance.now() + 3000; // brief spawn grace
  player.born = performance.now();
  world.dragons.push(player);
  cam.x = p.x; cam.y = p.y;
  playing = true;
  document.getElementById('feed').innerHTML = '';
  document.getElementById('menu').classList.add('hidden');
  document.getElementById('hud').classList.remove('hidden');
}

function endGame() {
  playing = false;
  const P = Save.p, S = P.stats, d = player, R = Realm.cur;
  const secs = Math.round((deadAt - d.born) / 1000), mass = d.mass | 0;
  const base = Math.floor((mass / 20 + d.kills * 15 + d.pearls * 5) * R.mult);
  const coinJade = d.coins * 5, bossJade = d.emperor ? 1000 : 0;
  const jade = base + coinJade + bossJade;
  const xp = Math.round(mass / 5 + d.kills * 25 + secs);
  const before = { lvl: P.lvl, xp: P.xp };
  P.jade += jade;
  const levels = Save.addXp(xp);
  S.games++; S.kills += d.kills; S.pearls += d.pearls; S.coins += d.coins; S.dust += Math.round(d.dust);
  S.surge += Math.round(d.surge); S.time += secs; S.jadeEarned += jade;
  S.bestLife = Math.max(S.bestLife, mass); S.best[R.id] = Math.max(S.best[R.id] || 0, mass);
  if (d.emperor) S.emperors++;
  Save.save();
  document.getElementById('hud').classList.add('hidden');
  Menu.results({ mass, kills: d.kills, pearls: d.pearls, coins: d.coins, secs, cause: d.cause, realm: R,
    base, coinJade, bossJade, jade, xp, before, levels, best: S.best[R.id] });
}

initWorld(REALMS.find(r => r.id === Save.load().realm) || REALMS[0]);
requestAnimationFrame(frame);
