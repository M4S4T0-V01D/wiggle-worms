// Cosmetic part renderers: body patterns, back bits, hats, faces, tails, trails.
// Slot keys match the dragon game: horns = hats, whiskers = face, spines = back.
const Parts = (() => {
  const TAU = 6.2832;
  const hh = i => { const x = Math.sin(i * 12.9898) * 43758.5453; return x - Math.floor(x); };

  function disc(g, x, y, r, c) { g.fillStyle = c; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); }

  function segment(g, d, e, i, n, now) {
    const L = d.look, r = e.r, ang = Math.atan2(e.dy, e.dx);
    let mid = d.cMid;
    switch (L.pattern) {
      case 'stripes': if (i % 6 < 2) mid = L.accent; break;
      case 'tiger': if (i % 5 === 0) mid = L.accent; break;
      case 'rainbow': mid = `hsl(${(i * 9 - now * 0.1) % 360},85%,60%)`; break;
      case 'gold': mid = shade(L.body, 18 * Math.sin(i * 0.35 - now * 0.008)); break;
      case 'galaxy': mid = shade(L.body, -10 + 8 * Math.sin(i * 0.5)); break;
    }
    // saddle band a little way behind the head
    const band = i >= 8 && i <= 12;
    if (band) mid = L.belly;
    disc(g, e.x, e.y, r * (band ? 1.06 : 1), d.cDark);
    disc(g, e.x, e.y, r * (band ? 0.96 : 0.88), mid);

    // ring crease between segments
    if (i % 2 === 0) {
      g.strokeStyle = 'rgba(60,20,20,.22)'; g.lineWidth = Math.max(1, r * 0.1);
      g.beginPath(); g.arc(e.x + e.dx * r * 0.4, e.y + e.dy * r * 0.4, r * 0.8, ang + 1.0 + Math.PI, ang - 1.0 + Math.PI, true); g.stroke();
    }
    if (L.pattern === 'spots' && hh(i) < 0.4) disc(g, e.x + e.dy * r * 0.35 * (hh(i + 9) - 0.5) * 2, e.y - e.dx * r * 0.35 * (hh(i + 9) - 0.5) * 2, r * 0.3, L.accent);
    if (L.pattern === 'tiger' && i % 5 === 2) {
      g.strokeStyle = L.accent; g.lineWidth = Math.max(1, r * 0.22);
      g.beginPath(); g.moveTo(e.x + e.dy * r * 0.8, e.y - e.dx * r * 0.8); g.lineTo(e.x + e.dy * r * 0.2 + e.dx * r * 0.3, e.y - e.dx * r * 0.2 + e.dy * r * 0.3); g.stroke();
    }
    if (L.pattern === 'galaxy' && hh(i) < 0.5) {
      const tw = 0.5 + 0.5 * Math.sin(now * 0.005 + i), s = Math.max(1, r * 0.14);
      g.fillStyle = `rgba(255,255,255,${0.4 + tw * 0.6})`;
      g.fillRect(e.x + (hh(i + 3) - 0.5) * r - s / 2, e.y + (hh(i + 5) - 0.5) * r - s / 2, s, s);
    }
    // shiny highlight on top
    g.fillStyle = L.pattern === 'gold' ? 'rgba(255,250,200,.55)' : 'rgba(255,255,255,.22)';
    g.beginPath(); g.ellipse(e.x + e.dy * r * 0.4, e.y - e.dx * r * 0.4, r * 0.4, r * 0.16, ang, 0, TAU); g.fill();
  }

  function spine(g, d, e, i, now) {
    const L = d.look, r = e.r;
    const nx = e.dy, ny = -e.dx; // "up" side of the worm
    switch (L.spines) {
      case 'none': return;
      case 'spikes':
        g.fillStyle = L.mane;
        g.beginPath();
        g.moveTo(e.x + nx * r * 0.6 + e.dx * r * 0.4, e.y + ny * r * 0.6 + e.dy * r * 0.4);
        g.lineTo(e.x + nx * r * 1.5, e.y + ny * r * 1.5);
        g.lineTo(e.x + nx * r * 0.6 - e.dx * r * 0.4, e.y + ny * r * 0.6 - e.dy * r * 0.4);
        g.closePath(); g.fill();
        return;
      case 'wings': {
        if (i % 8 !== 0) return;
        const flap = 0.6 + 0.4 * Math.sin(now * 0.03 + i);
        g.fillStyle = 'rgba(220,240,255,.55)'; g.strokeStyle = 'rgba(120,160,200,.7)'; g.lineWidth = Math.max(1, r * 0.06);
        for (const side of [1, -1]) {
          g.beginPath();
          g.ellipse(e.x + nx * side * r * 1.1 * flap - e.dx * r * 0.3, e.y + ny * side * r * 1.1 * flap - e.dy * r * 0.3,
            r * 0.95 * flap, r * 0.45, Math.atan2(e.dy, e.dx) - side * 0.5, 0, TAU);
          g.fill(); g.stroke();
        }
        return;
      }
      case 'lights': {
        const cols = ['#ff4a4a', '#ffe14a', '#4aff7a', '#4ac8ff', '#c84aff'];
        const on = (Math.floor(now / 300) + i / 4) % 2 < 1;
        g.save(); g.globalCompositeOperation = 'lighter';
        const c = cols[(i / 4) % cols.length | 0];
        g.fillStyle = c; g.shadowColor = c; g.shadowBlur = on ? 14 : 4; g.globalAlpha *= on ? 1 : 0.4;
        g.beginPath(); g.arc(e.x + nx * r * 0.5, e.y + ny * r * 0.5, r * 0.22, 0, TAU); g.fill();
        g.restore();
      }
    }
  }

  // --- head-frame parts (20-unit frame, facing +x)
  function eye(g, x, y, R, col, lookX, lookY) {
    disc(g, x, y, R, '#fff');
    g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 0.6; g.beginPath(); g.arc(x, y, R, 0, TAU); g.stroke();
    disc(g, x + lookX, y + lookY, R * 0.55, col);
    disc(g, x + lookX + R * 0.2, y + lookY - R * 0.25, R * 0.2, '#fff');
  }

  function whiskers(g, d, now) {
    const L = d.look, kind = L.whiskers;
    const blink = (now + d.phase * 997) % 3800 < 120;
    if (kind === 'googly') {
      const jx = Math.sin(now * 0.013 + d.phase) * 1.3, jy = Math.cos(now * 0.017 + d.phase) * 1.3;
      eye(g, 5, -4.6, 4.6, '#111', 1.2 + jx, jy);
      eye(g, 6, 4.8, 3.8, '#111', 1 - jy, jx);
    } else if (blink) {
      g.strokeStyle = L.eye; g.lineWidth = 1.2; g.lineCap = 'round';
      for (const s of [1, -1]) { g.beginPath(); g.moveTo(3.5, s * 4.5); g.lineTo(8.5, s * 4.5); g.stroke(); }
    } else if (kind !== 'shades') {
      for (const s of [1, -1]) eye(g, 6, s * 4.5, 3.6, L.eye, 1.2, 0);
    }
    if (kind === 'shades') {
      g.fillStyle = '#111';
      for (const s of [1, -1]) { g.beginPath(); g.ellipse(6.5, s * 4.6, 3.4, 4, 0, 0, TAU); g.fill(); }
      g.fillRect(5.6, -1.2, 1.8, 2.4);
      g.fillStyle = 'rgba(255,255,255,.5)';
      for (const s of [1, -1]) { g.beginPath(); g.ellipse(7.8, s * 4.6 - 1.5, 0.9, 1.3, 0, 0, TAU); g.fill(); }
    }
    if (kind === 'angry') {
      g.strokeStyle = '#2a1408'; g.lineWidth = 1.5; g.lineCap = 'round';
      for (const s of [1, -1]) { g.beginPath(); g.moveTo(4, s * 8.8); g.lineTo(8.6, s * 2.6); g.stroke(); }
    }
    // mouth
    g.strokeStyle = '#4a1420'; g.lineWidth = 1.1; g.lineCap = 'round';
    g.beginPath();
    if (kind === 'angry') g.arc(14.5, 0, 3, Math.PI * 0.65, Math.PI * 1.35);
    else g.arc(9.5, 0, 3.6, -0.9, 0.9);
    g.stroke();
    if (kind === 'mustache') {
      g.fillStyle = '#3a2210';
      for (const s of [1, -1]) {
        g.beginPath(); g.moveTo(11.5, 0);
        g.quadraticCurveTo(13, s * 4, 10, s * 6.5); g.quadraticCurveTo(12, s * 3, 10, 0); g.fill();
      }
    }
  }

  function horns(g, d, now) {
    const L = d.look;
    // hats sit on the back of the head (-x is behind, the "top" in screen terms is the whole head)
    switch (L.horns) {
      case 'none': return;
      case 'cap':
        g.fillStyle = L.mane;
        g.beginPath(); g.arc(-1, 0, 8.5, Math.PI * 0.5, Math.PI * 1.5); g.closePath(); g.fill();
        g.fillRect(-1, -8.5, 4, 17);
        g.fillStyle = shade(L.mane, -18);
        g.beginPath(); g.ellipse(4, 0, 3, 9, 0, -Math.PI / 2, Math.PI / 2); g.fill();
        disc(g, -4, 0, 1.4, '#fff');
        return;
      case 'party': {
        g.fillStyle = '#ff5ab4';
        g.beginPath(); g.moveTo(-2, -6.5); g.lineTo(-15, 0); g.lineTo(-2, 6.5); g.closePath(); g.fill();
        g.fillStyle = '#ffe14a';
        for (let k = 0; k < 3; k++) disc(g, -4 - k * 3.5, (k % 2 ? 1 : -1) * (3.5 - k), 1, '#ffe14a');
        disc(g, -15.5, 0, 2.2, '#4ac8ff');
        return;
      }
      case 'propeller': {
        g.fillStyle = '#ffd83a';
        g.beginPath(); g.arc(-1, 0, 7.5, Math.PI * 0.5, Math.PI * 1.5); g.closePath(); g.fill();
        g.fillStyle = '#ff4a4a'; g.beginPath(); g.arc(-1, 0, 7.5, Math.PI * 0.83, Math.PI * 1.17); g.lineTo(-1, 0); g.fill();
        g.fillStyle = '#4ab4ff'; g.beginPath(); g.arc(-1, 0, 7.5, Math.PI * 0.5, Math.PI * 0.83); g.lineTo(-1, 0); g.fill();
        const a = now * (d.boost ? 0.06 : 0.025);
        g.fillStyle = '#e04aa0';
        g.save(); g.translate(-9, 0); g.rotate(a);
        g.beginPath(); g.ellipse(0, 0, 1.6, 9, 0, 0, TAU); g.fill();
        g.restore();
        disc(g, -9, 0, 1.4, '#333');
        return;
      }
      case 'viking':
        g.fillStyle = '#9aa4ae';
        g.beginPath(); g.arc(-1, 0, 8.5, Math.PI * 0.5, Math.PI * 1.5); g.closePath(); g.fill();
        g.fillStyle = '#6a737c'; g.fillRect(-1.5, -8.5, 2.5, 17);
        g.fillStyle = '#f4ead0';
        for (const s of [1, -1]) {
          g.beginPath(); g.moveTo(-3, s * 6.5); g.quadraticCurveTo(-8, s * 15, -2, s * 17); g.quadraticCurveTo(-5, s * 12, 0, s * 7.5); g.fill();
        }
        return;
      case 'tophat':
        g.fillStyle = '#1a1a22';
        g.fillRect(-4, -10, 3, 20);
        g.fillRect(-16, -6.5, 12.5, 13);
        g.fillStyle = '#c02a3a'; g.fillRect(-7, -6.5, 3, 13);
        return;
      default: // crown
        g.fillStyle = '#ffd34d'; g.strokeStyle = '#a86b00'; g.lineWidth = 0.6;
        g.beginPath();
        g.moveTo(-2, -7.5); g.lineTo(-13, -7.5); g.lineTo(-9, -3.7); g.lineTo(-14, 0); g.lineTo(-9, 3.7); g.lineTo(-13, 7.5); g.lineTo(-2, 7.5);
        g.closePath(); g.fill(); g.stroke();
        disc(g, -5, 0, 1.6, '#ff3b4e'); disc(g, -5, -4.5, 1.1, '#4ac8ff'); disc(g, -5, 4.5, 1.1, '#4aff7a');
    }
  }

  function tail(g, d, now) {
    const D = d.draw, n = D.length, e = D[n - 1], p = D[n - 4] || e, L = d.look;
    const ang = Math.atan2(e.y - p.y, e.x - p.x), w = d.width;
    g.save(); g.translate(e.x, e.y); g.rotate(ang);
    const a0 = g.globalAlpha;
    switch (L.tail) {
      case 'rattle': {
        const sh = Math.sin(now * 0.05) * w * 0.05;
        for (let j = 0; j < 3; j++) {
          g.fillStyle = j % 2 ? '#e0c890' : '#c0a060';
          g.beginPath(); g.ellipse(w * (0.15 + j * 0.25), sh, w * 0.18, w * 0.24 - j * w * 0.03, 0, 0, TAU); g.fill();
        }
        break;
      }
      case 'fish': {
        const wag = Math.sin(now * 0.012) * 0.3;
        g.rotate(wag);
        g.fillStyle = L.mane;
        g.beginPath(); g.moveTo(0, 0); g.lineTo(w * 0.9, -w * 0.55); g.quadraticCurveTo(w * 0.6, 0, w * 0.9, w * 0.55); g.closePath(); g.fill();
        break;
      }
      case 'rocket': {
        g.fillStyle = '#c8ccd4'; g.fillRect(0, -w * 0.22, w * 0.35, w * 0.44);
        g.fillStyle = '#e04a4a';
        g.beginPath(); g.moveTo(w * 0.1, -w * 0.22); g.lineTo(w * 0.35, -w * 0.4); g.lineTo(w * 0.35, -w * 0.22); g.fill();
        g.beginPath(); g.moveTo(w * 0.1, w * 0.22); g.lineTo(w * 0.35, w * 0.4); g.lineTo(w * 0.35, w * 0.22); g.fill();
        g.globalCompositeOperation = 'lighter';
        const fl = w * (d.boost ? 1.4 : 0.6) * (0.8 + 0.2 * Math.sin(now * 0.05));
        g.fillStyle = '#ff9a3c'; g.globalAlpha = a0 * 0.85;
        g.beginPath(); g.moveTo(w * 0.35, -w * 0.15); g.lineTo(w * 0.35 + fl, 0); g.lineTo(w * 0.35, w * 0.15); g.fill();
        g.fillStyle = '#ffe680';
        g.beginPath(); g.moveTo(w * 0.35, -w * 0.08); g.lineTo(w * 0.35 + fl * 0.5, 0); g.lineTo(w * 0.35, w * 0.08); g.fill();
        break;
      }
      case 'flag': {
        g.strokeStyle = '#6a4a2a'; g.lineWidth = w * 0.06;
        g.beginPath(); g.moveTo(0, 0); g.lineTo(w * 0.3, -w * 1.2); g.stroke();
        g.fillStyle = L.mane;
        g.beginPath(); g.moveTo(w * 0.27, -w * 1.2);
        for (let k = 0; k <= 6; k++) g.lineTo(w * 0.27 + k * w * 0.13, -w * 1.2 + Math.sin(now * 0.01 + k) * w * 0.06);
        for (let k = 6; k >= 0; k--) g.lineTo(w * 0.22 + k * w * 0.13, -w * 0.8 + Math.sin(now * 0.01 + k) * w * 0.06);
        g.fill();
        break;
      }
      default: // plain rounded tip
        g.fillStyle = d.cDark;
        g.beginPath(); g.arc(0, 0, Math.max(2, e.r * 0.9), 0, TAU); g.fill();
    }
    g.restore();
  }

  function lightning(g, d, now) {
    if (Math.random() < 0.5) return;
    const D = d.draw, n = D.length;
    g.save(); g.globalCompositeOperation = 'lighter';
    g.strokeStyle = '#fff6a0'; g.shadowColor = d.look.glow; g.shadowBlur = 10; g.lineWidth = Math.max(1, d.width * 0.06);
    for (let k = 0; k < 2; k++) {
      const i = 3 + ((Math.random() * (n - 6)) | 0), e = D[i], side = Math.random() < 0.5 ? 1 : -1;
      let x = e.x, y = e.y;
      g.beginPath(); g.moveTo(x, y);
      for (let s = 0; s < 5; s++) {
        x += e.dy * side * d.width * 0.35 + (Math.random() - 0.5) * d.width * 0.6;
        y += -e.dx * side * d.width * 0.35 + (Math.random() - 0.5) * d.width * 0.6;
        g.lineTo(x, y);
      }
      g.stroke();
    }
    g.restore();
  }

  // particles that stream off the worm (called from the game loop)
  function emitTrail(d, f) {
    const L = d.look, D = d.draw, n = D.length;
    if (L.trail === 'none' || L.trail === 'lightning' || n < 6) return;
    const rate = (d.boost ? 1.6 : 0.6) * f;
    let k = rate + Math.random() > 1 ? Math.ceil(rate) : 0;
    while (k-- > 0) {
      const e = D[(n * (0.3 + Math.random() * 0.7)) | 0];
      const p = { x: e.x + (Math.random() - 0.5) * e.r, y: e.y + (Math.random() - 0.5) * e.r, vx: (Math.random() - 0.5) * 0.8, vy: (Math.random() - 0.5) * 0.8, life: 1, sz: 2 + Math.random() * 2, c: L.glow };
      switch (L.trail) {
        case 'sparks': p.c = Math.random() < 0.5 ? '#fff6a0' : L.glow; break;
        case 'petals': p.t = 'petal'; p.c = ['#ffc2e0', '#fff0f6', '#ffe14a', '#c8a8ff'][(Math.random() * 4) | 0]; p.sz = 4 + Math.random() * 3; p.rot = Math.random() * TAU; break;
        case 'bubbles': p.t = 'bubble'; p.c = '#bff0ff'; p.sz = 3 + Math.random() * 5; p.vy -= 0.5; break;
        case 'ink': p.t = 'ink'; p.c = 'rgba(40,22,8,.55)'; p.sz = e.r * (0.6 + Math.random() * 0.6); p.vx *= 0.2; p.vy *= 0.2; break;
        case 'rainbow': p.c = `hsl(${(performance.now() * 0.2 + Math.random() * 40) % 360},90%,65%)`; p.sz = 3 + Math.random() * 2; break;
      }
      world.parts.push(p);
    }
  }

  return { segment, spine, whiskers, horns, tail, lightning, emitTrail };
})();
