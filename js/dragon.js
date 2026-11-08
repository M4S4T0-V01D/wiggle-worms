// Worm: movement, body follow, and rendering (cosmetic parts live in parts.js).
// The class keeps the Dragon name so the engine is shared with the dragon game.
const POWERS = {
  thunder: { kanji: '⚡', name: 'Zoom',   color: '#ffe14a', dur: 8000 },  // free zoom
  gravity: { kanji: '🧲', name: 'Magnet', color: '#ff7a7a', dur: 10000 }, // snack magnet
  spirit:  { kanji: '👻', name: 'Ghost',  color: '#d8f4ff', dur: 6000 },  // pass through worms
  giant:   { kanji: '🍄', name: 'Mega',   color: '#ff9a3c', dur: 8000 },  // swell up, win head-ons
};

function hexToHsl(hex) {
  const n = parseInt(hex.slice(1), 16), r = (n >> 16) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
  if (mx === mn) return [0, 0, l * 100];
  const d = mx - mn, s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
  let h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s * 100, l * 100];
}
function shade(hex, dl) {
  const [h, s, l] = hexToHsl(hex);
  return `hsl(${h | 0},${s | 0}%,${Math.max(3, Math.min(95, l + dl)) | 0}%)`;
}

class Dragon {
  constructor(x, y, look, name, isPlayer) {
    this.look = look;
    this.name = name;
    this.isPlayer = isPlayer;
    this.mass = 40;
    this.angle = Math.random() * Math.PI * 2;
    this.target = this.angle;
    this.boost = false;
    this.alive = true;
    this.kills = 0; this.pearls = 0; this.coins = 0; this.dust = 0; this.surge = 0;
    this.power = null; this.powerEnd = 0;
    this.sizeMul = 1;
    this.phase = Math.random() * 100;
    this.pts = [];
    for (let i = 0; i < 20; i++) this.pts.push({ x: x - Math.cos(this.angle) * i * 4, y: y - Math.sin(this.angle) * i * 4 });
    this.draw = []; // wavy render/collision points {x,y,r,dx,dy}
    this.setLook(look);
    this.buildDraw(); // valid right away, even before its first update
  }
  setLook(look) {
    this.look = look;
    this.hue = hexToHsl(look.body)[0];
    this.cDark = shade(look.body, -22);
    this.cMid = look.body;
    this.cLight = shade(look.body, 22);
  }

  get width() { return Math.min(this.boss ? 120 : 54, 12 + Math.sqrt(this.mass) * 1.05) * this.sizeMul; }
  get length() { return 140 + this.mass * 2.6; }
  get spacing() { return this.width * 0.34; }
  get speed() { return (this.boost ? 9 : 4.3) * (this.slow || 1); }
  has(p, now) { return this.power === p && now < this.powerEnd; }

  update(f, now) {
    let d = this.target - this.angle;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    const turn = 0.11 / (1 + this.width / 45) * f * (this.isPlayer ? 1.5 : 1); // the player turns quicker
    this.angle += Math.max(-turn, Math.min(turn, d));

    if (this.boost && this.mass < 30 && !this.has('thunder', now)) this.boost = false;
    const sp = this.speed * f;
    const h = this.pts[0];
    h.x += Math.cos(this.angle) * sp + (this.pullX || 0) * f;
    h.y += Math.sin(this.angle) * sp + (this.pullY || 0) * f;

    const s = this.spacing, P = this.pts;
    for (let i = 1; i < P.length; i++) {
      const a = P[i - 1], b = P[i];
      const dx = b.x - a.x, dy = b.y - a.y, dd = Math.hypot(dx, dy);
      if (dd > s) { b.x = a.x + dx / dd * s; b.y = a.y + dy / dd * s; }
    }
    const want = Math.max(12, Math.round(this.length / s));
    while (P.length < want) { const l = P[P.length - 1]; P.push({ x: l.x, y: l.y }); }
    if (P.length > want) P.length = want;

    if (this.power && now >= this.powerEnd) this.power = null;
    const tm = this.has('giant', now) ? 1.5 : 1;
    this.sizeMul += (tm - this.sizeMul) * 0.05 * f;
    this.phase += f * (this.boost ? 0.22 : 0.12);
    this.buildDraw();
  }

  // Serpentine undulation layered on the logical path; also used for collisions.
  buildDraw() {
    const P = this.pts, n = P.length, w = this.width, D = this.draw;
    D.length = n;
    for (let i = 0; i < n; i++) {
      const p = P[i], q = P[Math.min(n - 1, i + 1)], o = P[Math.max(0, i - 1)];
      let ax = o.x - q.x, ay = o.y - q.y;
      const al = Math.hypot(ax, ay) || 1; ax /= al; ay /= al;
      const t = i / (n - 1);
      const ramp = Math.min(1, i / 8);
      const wave = Math.sin(i * 0.2 - this.phase) * w * 0.32 * ramp;
      let r;
      if (t < 0.03) r = 1.08;
      else if (t > 0.6) r = 1 - (t - 0.6) / 0.4 * 0.7;
      else r = 1;
      r *= w * 0.5;
      const e = D[i] || (D[i] = {});
      e.x = p.x - ay * wave; e.y = p.y + ax * wave; e.r = r; e.dx = ax; e.dy = ay;
    }
  }

  render(g, now, cam) {
    const D = this.draw, n = D.length, w = this.width, L = this.look;
    if (n < 2) return;
    const ghost = this.has('spirit', now);
    if (ghost) g.globalAlpha = 0.45 + 0.15 * Math.sin(now * 0.01);

    // soft shadow in the dirt, plus a glow while powered or zooming
    g.save();
    g.lineCap = 'round'; g.lineJoin = 'round';
    g.strokeStyle = 'rgba(20,8,0,.35)'; g.lineWidth = w * 1.15;
    g.beginPath(); g.moveTo(D[0].x + w * 0.12, D[0].y + w * 0.18);
    for (let i = 2; i < n; i += 2) g.lineTo(D[i].x + w * 0.12, D[i].y + w * 0.18);
    g.stroke();
    if (this.boost || this.power) {
      g.globalCompositeOperation = 'lighter';
      g.strokeStyle = this.power ? POWERS[this.power].color : L.glow;
      g.globalAlpha *= 0.25; g.lineWidth = w * 1.8;
      g.beginPath(); g.moveTo(D[0].x, D[0].y);
      for (let i = 2; i < n; i += 2) g.lineTo(D[i].x, D[i].y);
      g.stroke();
    }
    g.restore();

    Parts.tail(g, this, now);
    for (let i = n - 1; i >= 1; i--) Parts.segment(g, this, D[i], i, n, now);
    for (let i = n - 1; i >= 1; i--) if (i % 4 === 0 && i > 5) Parts.spine(g, this, D[i], i, now);
    if (L.trail === 'lightning') Parts.lightning(g, this, now);

    this.renderHead(g, now);
    g.globalAlpha = 1;

    if (!this.isPlayer || cam.showOwnName) {
      g.textAlign = 'center';
      const fs = Math.max(12, Math.min(28, w * 0.45));
      if (L.title) {
        g.fillStyle = 'rgba(255,236,150,.9)';
        g.font = `bold ${fs * 0.7}px "Comic Sans MS", "Comic Neue", "Chalkboard SE", sans-serif`;
        g.fillText(L.title, D[0].x, D[0].y - w * 1.4 - fs);
      }
      g.fillStyle = this.boss ? '#ffd84a' : 'rgba(255,250,235,.9)';
      g.font = `bold ${fs}px "Comic Sans MS", "Comic Neue", "Chalkboard SE", sans-serif`;
      g.lineWidth = 3; g.strokeStyle = 'rgba(40,20,5,.6)';
      g.strokeText(this.name, D[0].x, D[0].y - w * 1.4);
      g.fillText(this.name, D[0].x, D[0].y - w * 1.4);
    }
  }

  renderHead(g, now) {
    const e = this.draw[0], w = this.width, L = this.look;
    g.save();
    g.translate(e.x, e.y);
    g.rotate(this.angle);
    const s = w / 20; // head drawn in a 20-unit-wide frame, facing +x
    g.scale(s, s);

    // round head
    g.fillStyle = this.cDark;
    g.beginPath(); g.ellipse(1, 0, 12.5, 11.5, 0, 0, 6.2832); g.fill();
    g.fillStyle = this.cMid;
    g.beginPath(); g.ellipse(1.5, 0, 11.3, 10.3, 0, 0, 6.2832); g.fill();
    g.fillStyle = this.cLight;
    g.beginPath(); g.ellipse(4, -3, 5, 3.2, -0.3, 0, 6.2832); g.fill();
    // rosy cheeks
    g.fillStyle = 'rgba(255,90,120,.35)';
    for (const side of [1, -1]) { g.beginPath(); g.arc(7, side * 7.5, 2.2, 0, 6.2832); g.fill(); }

    Parts.whiskers(g, this, now); // the face
    Parts.horns(g, this, now);    // the hat

    if (this.power) {
      const c = POWERS[this.power].color;
      g.globalCompositeOperation = 'lighter';
      g.fillStyle = c; g.shadowColor = c; g.shadowBlur = 20;
      g.beginPath(); g.arc(20, 0, 3 + Math.sin(now * 0.02), 0, 6.2832); g.fill();
      g.shadowBlur = 0;
    }
    g.restore();
  }
}
