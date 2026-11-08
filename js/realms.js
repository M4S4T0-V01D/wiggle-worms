// World hazards and set dressing: rolling rocks, lava pit, swirly sinkhole, crystal cave boss.
const Realm = (() => {
  const TAU = 6.2832;
  let R = REALMS[0], rocks = [], flares = [], nextFlare = 0, gates = [], bossDue = 0;

  function setup(realm) {
    R = realm; rocks = []; flares = []; gates = []; bossDue = performance.now() + 4000;
    if (R.id === 'asteroids') {
      for (let i = 0; i < 55; i++) {
        const p = randInArena(400), rad = rand(40, 150), verts = [];
        for (let k = 0; k < 11; k++) verts.push(rad * rand(0.75, 1.1));
        rocks.push({ x: p.x, y: p.y, r: rad, vx: rand(-0.2, 0.2), vy: rand(-0.2, 0.2), rot: rand(0, TAU), vr: rand(-0.003, 0.003), verts,
          craters: [0, 1, 2].map(() => ({ a: rand(0, TAU), d: rand(0, rad * 0.5), r: rand(rad * 0.1, rad * 0.22) })) });
      }
    }
    if (R.id === 'palace') {
      for (let i = 0; i < 16; i++) { const p = randInArena(600); gates.push({ x: p.x, y: p.y, s: rand(0.8, 1.6), rot: rand(0, TAU), hue: rand(180, 320) }); }
    }
  }

  const SUN_R = 420, HOLE_R = 260;

  // distance from point to the nearest lethal hazard surface (for bot avoidance)
  function clear(x, y) {
    let best = Infinity;
    if (R.id === 'sun') best = Math.hypot(x, y) - SUN_R - 40;
    if (R.id === 'blackhole') best = Math.hypot(x, y) - HOLE_R - 120;
    for (const r of rocks) { const d = Math.hypot(r.x - x, r.y - y) - r.r; if (d < best) best = d; }
    return best;
  }

  function update(f, now) {
    for (const d of world.dragons) { d.pullX = 0; d.pullY = 0; d.slow = 1; }
    if (R.id === 'asteroids') {
      for (const r of rocks) {
        r.x += r.vx * f; r.y += r.vy * f; r.rot += r.vr * f;
        const dist = Math.hypot(r.x, r.y);
        if (dist > W_R - r.r) { const nx = r.x / dist, ny = r.y / dist, dot = r.vx * nx + r.vy * ny; r.vx -= 2 * dot * nx; r.vy -= 2 * dot * ny; }
      }
      for (const d of world.dragons) {
        if (!d.alive || !d.draw[0] || d.has('spirit', now)) continue;
        const h = d.draw[0];
        for (const r of rocks) if (Math.hypot(r.x - h.x, r.y - h.y) < r.r * 0.9 + d.width * 0.35) { kill(d, null, 'bonked into a rock'); break; }
      }
    }
    if (R.id === 'sun' || R.id === 'blackhole') {
      const sun = R.id === 'sun', core = sun ? SUN_R : HOLE_R, reach = sun ? 3000 : 3800, str = sun ? 0.7 : 1.3;
      for (const d of world.dragons) {
        if (!d.alive || !d.draw[0]) continue;
        const h = d.draw[0], dist = Math.hypot(h.x, h.y) || 1;
        if (dist < reach) { const k = str * Math.pow(1 - dist / reach, 2); d.pullX = -h.x / dist * k; d.pullY = -h.y / dist * k; }
        if (dist < core + d.width * 0.3 && !(d.has('spirit', now) && sun)) kill(d, null, sun ? 'got toasted in the lava' : 'got sucked down the sinkhole');
      }
      // snacks swirl and sink
      for (let i = world.food.length - 1; i >= 0; i--) {
        const fo = world.food[i], dist = Math.hypot(fo.x, fo.y);
        if (dist > reach) continue;
        const k = (1 - dist / reach), sw = (sun ? 0.4 : 1.2) * k * f / dist * 3;
        const tx = -fo.y * sw, ty = fo.x * sw;
        fo.x += tx - fo.x / dist * k * (sun ? 0.05 : 0.35) * f; fo.y += ty - fo.y / dist * k * (sun ? 0.05 : 0.35) * f;
        if (dist < core) { world.food[i] = world.food[world.food.length - 1]; world.food.pop(); }
      }
      // fresh big snacks near the danger
      if (Math.random() < 0.5 * f) {
        const a = rand(0, TAU), r = rand(core + 200, core + 1400);
        addFood(Math.cos(a) * r, Math.sin(a) * r, Math.random() < 0.5 ? 2.5 : 4, sun ? rand(10, 50) : rand(180, 220));
      }
    }
    if (R.id === 'sun') {
      if (now > nextFlare) { flares.push({ r: SUN_R, born: now }); nextFlare = now + rand(10000, 16000); }
      for (let i = flares.length - 1; i >= 0; i--) {
        const fl = flares[i]; fl.r += 9 * f;
        if (fl.r > 2400) { flares.splice(i, 1); continue; }
        for (const d of world.dragons) {
          if (!d.alive || !d.draw[0] || d.has('spirit', now) || d.flareHit === fl) continue;
          const h = d.draw[0], dist = Math.hypot(h.x, h.y);
          if (Math.abs(dist - fl.r) < 30) { // heat wave: drop a fifth of your length
            d.flareHit = fl;
            const lost = d.mass * 0.1; d.mass -= lost;
            for (let k = 0; k < 8; k++) addFood(h.x + rand(-60, 60), h.y + rand(-60, 60), lost / 8, rand(10, 50));
            burst(h.x, h.y, '#ff9a3c', 25, 5);
            if (d === player) feedMsg('<b style="color:#ff9a3c">Heat wave!</b> Ouch, hot hot hot!');
          }
        }
      }
    }
    if (R.id === 'palace' && now > bossDue && !world.dragons.some(d => d.boss && d.alive)) {
      world.dragons.push(makeBoss());
      bossDue = Infinity;
      feedMsg('<b style="color:#ffd84a">👑 WORMZILLA has woken up!</b>');
    }
  }
  function bossDied(now) { bossDue = now + 45000; }

  function makeBoss() {
    const p = randInArena(1500);
    const look = { body: '#6a3ab0', accent: '#2a0a5a', belly: '#ffd84a', mane: '#ff3b6e', eye: '#c00010', glow: '#c08aff',
      pattern: 'tiger', horns: 'crown', spines: 'spikes', whiskers: 'angry', tail: 'rattle', trail: 'sparks', title: 'King of the Dirt' };
    const d = new Dragon(p.x, p.y, look, 'WORMZILLA', false);
    d.boss = true; d.mass = 5000;
    d.mind = { t: 0, wander: d.angle, aggro: 0.5 };
    for (let i = 0; i < 900; i++) { d.target = d.angle + 0.02; d.update(1, 0); }
    return d;
  }

  function renderBack(g, now, view) {
    if (R.id === 'sun') {
      const pulse = 1 + 0.02 * Math.sin(now * 0.002);
      g.save(); g.globalCompositeOperation = 'lighter';
      let gr = g.createRadialGradient(0, 0, SUN_R * 0.6, 0, 0, SUN_R * 3.2);
      gr.addColorStop(0, 'rgba(255,110,20,.5)'); gr.addColorStop(0.4, 'rgba(255,40,0,.1)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr; g.beginPath(); g.arc(0, 0, SUN_R * 3.2, 0, TAU); g.fill();
      g.restore();
      // rocky rim, then the lava pool
      g.fillStyle = '#2a1a12'; g.beginPath(); g.arc(0, 0, SUN_R * pulse + 26, 0, TAU); g.fill();
      gr = g.createRadialGradient(-SUN_R * 0.2, -SUN_R * 0.2, 0, 0, 0, SUN_R * pulse);
      gr.addColorStop(0, '#fff2a0'); gr.addColorStop(0.35, '#ffb020'); gr.addColorStop(0.8, '#ff4a0a'); gr.addColorStop(1, '#a01000');
      g.fillStyle = gr; g.beginPath(); g.arc(0, 0, SUN_R * pulse, 0, TAU); g.fill();
      // cooling crust and bubbles
      g.fillStyle = 'rgba(80,20,0,.45)';
      for (let k = 0; k < 9; k++) {
        const a = k * 0.7 + now * 0.00015, d = SUN_R * (0.3 + (k % 3) * 0.2);
        g.beginPath(); g.ellipse(Math.cos(a) * d, Math.sin(a) * d, 46, 24, a, 0, TAU); g.fill();
      }
      for (let k = 0; k < 7; k++) {
        const ph = (now * 0.0006 + k * 0.37) % 1, a = k * 2.4, d = SUN_R * 0.25 + k * 40;
        g.strokeStyle = `rgba(255,240,170,${0.8 * (1 - ph)})`; g.lineWidth = 4;
        g.beginPath(); g.arc(Math.cos(a) * d, Math.sin(a) * d, 8 + ph * 30, 0, TAU); g.stroke();
      }
      for (const fl of flares) {
        g.strokeStyle = `rgba(255,140,40,${0.6 * (1 - fl.r / 2400)})`; g.lineWidth = 50;
        g.setLineDash([60, 40]);
        g.beginPath(); g.arc(0, 0, fl.r, 0, TAU); g.stroke();
        g.setLineDash([]);
      }
    }
    if (R.id === 'blackhole') {
      // muddy water swirling down the drain
      const gr = g.createRadialGradient(0, 0, HOLE_R * 0.5, 0, 0, HOLE_R * 3.4);
      gr.addColorStop(0, 'rgba(30,90,140,.75)'); gr.addColorStop(0.45, 'rgba(40,110,150,.3)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr; g.beginPath(); g.arc(0, 0, HOLE_R * 3.4, 0, TAU); g.fill();
      g.save(); g.rotate(now * 0.0008);
      g.lineCap = 'round';
      for (let arm = 0; arm < 5; arm++) {
        g.strokeStyle = arm % 2 ? 'rgba(170,230,255,.35)' : 'rgba(255,255,255,.2)'; g.lineWidth = 14 - arm;
        g.beginPath();
        for (let t = 0; t <= 1; t += 0.02) {
          const a = arm * 1.2566 + t * 7, d = HOLE_R * (3.2 - t * 2.3);
          t ? g.lineTo(Math.cos(a) * d, Math.sin(a) * d) : g.moveTo(Math.cos(a) * d, Math.sin(a) * d);
        }
        g.stroke();
      }
      g.restore();
      g.fillStyle = '#05080c'; g.beginPath(); g.arc(0, 0, HOLE_R, 0, TAU); g.fill();
      g.strokeStyle = 'rgba(170,230,255,.8)'; g.lineWidth = 6;
      g.beginPath(); g.arc(0, 0, HOLE_R + 3, 0, TAU); g.stroke();
    }
    if (R.id === 'palace') for (const t of gates) {
      if (t.x < view[0] - 400 || t.x > view[1] + 400 || t.y < view[2] - 400 || t.y > view[3] + 400) continue;
      drawGate(g, t, now);
    }
    for (const r of rocks) {
      if (r.x < view[0] - r.r || r.x > view[1] + r.r || r.y < view[2] - r.r || r.y > view[3] + r.r) continue;
      g.save(); g.translate(r.x + 10, r.y + 14);
      g.fillStyle = 'rgba(15,6,0,.35)'; g.beginPath(); g.arc(0, 0, r.r, 0, TAU); g.fill();
      g.translate(-10, -14); g.rotate(r.rot);
      const gr = g.createRadialGradient(-r.r * 0.4, -r.r * 0.4, r.r * 0.1, 0, 0, r.r * 1.1);
      gr.addColorStop(0, '#b4aca4'); gr.addColorStop(1, '#4a4440');
      g.fillStyle = gr; g.beginPath();
      r.verts.forEach((v, k) => { const a = k / r.verts.length * TAU; k ? g.lineTo(Math.cos(a) * v, Math.sin(a) * v) : g.moveTo(Math.cos(a) * v, Math.sin(a) * v); });
      g.closePath(); g.fill();
      g.strokeStyle = '#2e2a28'; g.lineWidth = 4; g.stroke();
      g.fillStyle = 'rgba(0,0,0,.18)';
      for (const c of r.craters) { g.beginPath(); g.arc(Math.cos(c.a) * c.d, Math.sin(c.a) * c.d, c.r, 0, TAU); g.fill(); }
      g.restore();
    }
  }

  // crystal cluster (keeps the old gate list so the engine is shared)
  function drawGate(g, t, now) {
    g.save(); g.translate(t.x, t.y); g.rotate(t.rot); g.scale(t.s, t.s);
    g.save(); g.globalCompositeOperation = 'lighter';
    const gr = g.createRadialGradient(0, 0, 0, 0, 0, 220);
    gr.addColorStop(0, `hsla(${t.hue},100%,70%,${0.22 + 0.08 * Math.sin(now * 0.002 + t.hue)})`); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(0, 0, 220, 0, TAU); g.fill();
    g.restore();
    for (let k = 0; k < 7; k++) {
      const a = -1.4 + k * 0.47, len = 90 + ((k * 37) % 5) * 22, wd = 22 + (k % 3) * 6;
      g.save(); g.rotate(a);
      g.fillStyle = `hsl(${t.hue + k * 8},80%,${55 + (k % 2) * 12}%)`;
      g.beginPath(); g.moveTo(-wd / 2, 0); g.lineTo(-wd / 2, -len * 0.8); g.lineTo(0, -len); g.lineTo(wd / 2, -len * 0.8); g.lineTo(wd / 2, 0); g.closePath(); g.fill();
      g.fillStyle = 'rgba(255,255,255,.35)';
      g.beginPath(); g.moveTo(-wd / 2, 0); g.lineTo(-wd / 2, -len * 0.8); g.lineTo(0, -len); g.lineTo(0, 0); g.closePath(); g.fill();
      g.restore();
    }
    g.fillStyle = '#3a2a3a'; g.beginPath(); g.ellipse(0, 6, 70, 22, 0, 0, TAU); g.fill();
    g.restore();
  }

  function minimap(mg, S, k) {
    mg.fillStyle = 'rgba(180,172,164,.8)';
    for (const r of rocks) { mg.beginPath(); mg.arc(S / 2 + r.x * k, S / 2 + r.y * k, Math.max(1.2, r.r * k), 0, TAU); mg.fill(); }
  }

  return { setup, update, clear, renderBack, bossDied, minimap, get cur() { return R; } };
})();
