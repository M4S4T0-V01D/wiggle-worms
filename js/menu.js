// Menu: profile header, world select, Worm Shop, quests, stats and the results screen.
const Menu = (() => {
  const $ = id => document.getElementById(id);
  const P = () => Save.p;
  let tab = 'play', forgeSlot = 'pattern';

  // --- header
  function header() {
    const p = P(), need = xpFor(p.lvl);
    $('lvl').textContent = p.lvl;
    $('rank').textContent = rankName(p.lvl);
    $('xpfill').style.width = (100 * p.xp / need) + '%';
    $('xptext').textContent = `${p.xp | 0} / ${need} XP`;
    $('jade').textContent = p.jade.toLocaleString();
    const ready = p.quests.filter(q => Save.questInfo(q).done).length;
    $('qbadge').textContent = ready || '';
  }

  function show(t) {
    tab = t;
    document.querySelectorAll('#tabs button').forEach(b => b.classList.toggle('on', b.dataset.t === t));
    document.querySelectorAll('.tab').forEach(s => s.classList.toggle('hidden', s.id !== 'tab-' + t));
    ({ play: realms, forge, quests, stats })[t]();
    if (t === 'forge') preview.start();
  }

  // --- play: realm select
  function realms() {
    const p = P();
    $('realms').innerHTML = REALMS.map(r => {
      const locked = p.lvl < r.lvl, on = p.realm === r.id;
      return `<div class="realm ${on ? 'on' : ''} ${locked ? 'locked' : ''}" data-id="${r.id}">
        <div class="rk">${r.kanji}</div><div class="rn">${r.name}</div>
        <div class="rm">${locked ? `🔒 Level ${r.lvl}` : `💎 ×${r.mult}`}</div></div>`;
    }).join('');
    const R = REALMS.find(r => r.id === p.realm);
    $('rdesc').innerHTML = `<b>${R.kanji} ${R.name}</b> · ${R.desc}` +
      (p.stats.best[R.id] ? ` <span class="dim">Best here: ${p.stats.best[R.id]}</span>` : '');
    $('realms').querySelectorAll('.realm').forEach(el => el.onclick = () => {
      const r = REALMS.find(r => r.id === el.dataset.id);
      if (p.lvl < r.lvl || p.realm === r.id) return;
      p.realm = r.id; Save.save();
      initWorld(r); // the backdrop becomes the chosen realm
      realms();
    });
  }

  // --- forge
  function forge() {
    const p = P(), L = p.look;
    $('presets').innerHTML = PRESETS.map((pr, i) =>
      `<button class="preset" data-i="${i}" style="--a:${pr.body};--b:${pr.glow}"><i></i>${pr.name}</button>`).join('');
    $('presets').querySelectorAll('.preset').forEach(b => b.onclick = () => {
      const pr = PRESETS[b.dataset.i];
      for (const [k] of COLOR_SLOTS) L[k] = pr[k];
      changed(); forge();
    });
    $('colors').innerHTML = COLOR_SLOTS.map(([k, label]) =>
      `<label>${label}<input type="color" data-k="${k}" value="${L[k]}"></label>`).join('');
    $('colors').querySelectorAll('input').forEach(inp => inp.oninput = () => { L[inp.dataset.k] = inp.value; changed(); });
    $('slots').innerHTML = SLOTS.map(([s, label]) =>
      `<button data-s="${s}" class="${s === forgeSlot ? 'on' : ''}">${label}</button>`).join('');
    $('slots').querySelectorAll('button').forEach(b => b.onclick = () => { forgeSlot = b.dataset.s; forge(); });
    $('items').innerHTML = CATALOG[forgeSlot].map(it => {
      const own = Save.owns(forgeSlot, it.id), eq = L[forgeSlot] === it.id;
      const locked = p.lvl < it.lvl, poor = p.jade < it.price;
      const tag = eq ? 'Equipped' : own ? 'Equip' : locked ? `🔒 Lv ${it.lvl}` : `💎 ${it.price}`;
      return `<div class="item ${eq ? 'eq' : ''} ${!own && (locked || poor) ? 'no' : ''}" data-id="${it.id}">
        <div class="in">${it.name}</div><div class="it">${tag}</div></div>`;
    }).join('');
    $('items').querySelectorAll('.item').forEach(el => el.onclick = () => {
      const it = CATALOG[forgeSlot].find(i => i.id === el.dataset.id);
      if (!Save.owns(forgeSlot, it.id)) {
        if (!Save.buy(forgeSlot, it)) { el.classList.add('shake'); setTimeout(() => el.classList.remove('shake'), 400); return; }
        toast(`Unlocked <b>${it.name}</b>`);
      }
      L[forgeSlot] = it.id; changed(); forge(); header();
    });
  }
  function changed() { Save.save(); preview.dragon.setLook(P().look); preview.dragon.name = P().name || 'Wormy'; }

  // a worm that wiggles in a figure-eight inside the shop
  const preview = (() => {
    const cv = $('preview'), pg = cv.getContext('2d'), parts = [];
    const stars = Array.from({ length: 70 }, () => [Math.random(), Math.random(), Math.random() * 5 + 2]);
    let dragon = null, running = false, last = 0, clock = 0;
    function make() {
      dragon = new Dragon(0, 0, P().look, P().name || 'Wormy', false);
      dragon.mass = 420;
      for (let i = 1; i <= 700; i++) tick(1, i * 16.7);
      clock = 700 * 16.7;
    }
    function tick(f, now) {
      const t = now * 0.0006, h = dragon.pts[0];
      const tx = Math.sin(t) * 300, ty = Math.sin(t * 2) * 80;
      dragon.target = Math.atan2(ty - h.y, tx - h.x);
      dragon.update(f, now);
    }
    function loop(now) {
      if (tab !== 'forge' || $('menu').classList.contains('hidden')) { running = false; return; }
      const f = Math.min(3, (now - last) / 16.667 || 1); last = now;
      clock += f * 16.7; tick(f, clock);
      const saved = world.parts; world.parts = parts; Parts.emitTrail(dragon, f); world.parts = saved;
      const w = cv.width, h = cv.height, s = Math.min(w / 900, h / 420);
      pg.setTransform(1, 0, 0, 1, 0, 0);
      const gr = pg.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w * 0.6);
      gr.addColorStop(0, '#6a4426'); gr.addColorStop(1, '#2a160a');
      pg.fillStyle = gr; pg.fillRect(0, 0, w, h);
      for (const [x, y, r] of stars) { pg.fillStyle = 'rgba(150,120,95,.45)'; pg.beginPath(); pg.arc(x * w, y * h, r, 0, 6.2832); pg.fill(); }
      pg.setTransform(s, 0, 0, s, w / 2, h / 2);
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i];
        p.x += p.vx * f; p.y += p.vy * f; p.life -= 0.02 * f; if (p.rot !== undefined) p.rot += 0.05 * f;
        if (p.life <= 0) { parts.splice(i, 1); continue; }
        pg.globalAlpha = p.life * (p.t === 'ink' ? 0.5 : 1); pg.fillStyle = p.c;
        pg.beginPath();
        if (p.t === 'bubble') pg.arc(p.x, p.y, p.sz, 0, 6.2832); else if (p.t === 'petal') pg.ellipse(p.x, p.y, p.sz, p.sz * 0.5, p.rot, 0, 6.2832); else pg.arc(p.x, p.y, p.sz * (p.t === 'ink' ? 1.3 : 0.6), 0, 6.2832);
        pg.fill();
      }
      pg.globalAlpha = 1;
      dragon.render(pg, now, { z: s, showOwnName: true });
      requestAnimationFrame(loop);
    }
    function start() {
      const r = cv.getBoundingClientRect(), dpr = Math.min(2, devicePixelRatio || 1);
      cv.width = r.width * dpr; cv.height = r.height * dpr;
      if (!dragon) make();
      if (!running) { running = true; last = performance.now(); requestAnimationFrame(loop); }
    }
    return { start, get dragon() { if (!dragon) make(); return dragon; } };
  })();

  // --- quests
  function quests() {
    const p = P();
    $('qlist').innerHTML = p.quests.map((q, i) => {
      const info = Save.questInfo(q);
      return `<div class="quest ${info.done ? 'done' : ''}">
        <div class="qt">${info.text}</div>
        <div class="bar"><i style="width:${100 * info.cur / q.n}%"></i></div>
        <div class="qr">${info.cur} / ${q.n}</div>
        <button data-i="${i}" ${info.done ? '' : 'disabled'}>💎 ${q.reward}</button></div>`;
    }).join('');
    $('qlist').querySelectorAll('button').forEach(b => b.onclick = () => {
      const got = Save.claim(+b.dataset.i);
      if (got) { toast(`Quest complete · <b>💎 ${got}</b>`); quests(); header(); }
    });
  }

  // --- stats
  function stats() {
    const s = P().stats, mins = Math.round(s.time / 60);
    const rows = [['Games played', s.games], ['Worms bonked', s.kills], ['Power-ups grabbed', s.pearls],
      ['Gems found', s.coins], ['Snacks gobbled', s.dust.toLocaleString()], ['Seconds zooming', s.surge],
      ['Time wiggling', mins + ' min'], ['Longest worm', s.bestLife], ['Gems earned', s.jadeEarned.toLocaleString()],
      ['WORMZILLAs beaten', s.emperors]];
    $('slist').innerHTML = rows.map(([k, v]) => `<div><span>${k}</span><b>${v}</b></div>`).join('') +
      REALMS.map(r => `<div><span>${r.kanji} Best in ${r.name}</span><b>${s.best[r.id] || '—'}</b></div>`).join('');
  }

  // --- results
  function results(r) {
    const p = P(), el = $('results');
    const rows = [
      [`Length ${r.mass} · Bonks ${r.kills} · Power-ups ${r.pearls}`, ''],
      [`Score × ${r.realm.name} ${r.realm.mult}`, r.base],
      [`Jade coins × ${r.coins}`, r.coinJade],
    ];
    if (r.bossJade) rows.push(['👑 WORMZILLA treasure', r.bossJade]);
    $('rcause').textContent = `Your worm ${r.cause || 'wiggled away'} after ${r.secs}s`;
    $('rrows').innerHTML = rows.map(([k, v]) => `<div><span>${k}</span><b>${v === '' ? '' : '💎 ' + v}</b></div>`).join('') +
      `<div class="tot"><span>Total</span><b>💎 ${r.jade}</b></div>` +
      `<div><span>Experience</span><b>+${r.xp} XP</b></div>` +
      (r.mass >= r.best ? '<div class="nb">New best in this world!</div>' : '');
    $('rlvl').innerHTML = r.levels.length
      ? r.levels.map(l => `<div class="up">Level ${l}! <small>${rankName(l)} · +💎 ${50 * l}${REALMS.some(x => x.lvl === l) ? ' · new world unlocked!' : ''}</small></div>`).join('')
      : '';
    const fill = $('rxpfill');
    fill.style.transition = 'none';
    fill.style.width = (r.levels.length ? 0 : 100 * r.before.xp / xpFor(r.before.lvl)) + '%';
    requestAnimationFrame(() => requestAnimationFrame(() => {
      fill.style.transition = 'width 1.2s ease-out'; fill.style.width = (100 * p.xp / xpFor(p.lvl)) + '%';
    }));
    $('rxptext').textContent = `Level ${p.lvl} · ${p.xp | 0} / ${xpFor(p.lvl)} XP`;
    el.classList.remove('hidden');
    header();
  }

  function toast(html) {
    const t = document.createElement('div'); t.className = 'toast'; t.innerHTML = html;
    document.body.appendChild(t); setTimeout(() => t.remove(), 2200);
  }

  // --- wiring
  const nameEl = $('name');
  nameEl.value = P().name;
  nameEl.oninput = () => { P().name = nameEl.value.trim(); Save.save(); };
  nameEl.addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
  function go() { $('results').classList.add('hidden'); startGame(); }
  $('play').onclick = go;
  $('again').onclick = go;
  $('tomenu').onclick = () => { $('results').classList.add('hidden'); $('menu').classList.remove('hidden'); show(tab); };
  document.querySelectorAll('#tabs button').forEach(b => b.onclick = () => show(b.dataset.t));
  addEventListener('keydown', e => {
    if (e.key === 'Enter' && !$('results').classList.contains('hidden')) go();
  });

  header(); show('play');
  if (location.hash === '#play') go(); // quick-start link
  return { results, header };
})();
