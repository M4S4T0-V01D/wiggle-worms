// Persistent profile in localStorage: jade, xp, owned items, look, quests, stats.
const Save = (() => {
  const KEY = 'wiggleworms.profile.v1';
  let P;

  function fresh() {
    const owned = {};
    for (const slot in CATALOG) owned[slot] = CATALOG[slot].filter(i => i.price === 0).map(i => i.id);
    return {
      name: '', jade: 150, xp: 0, lvl: 1, owned,
      look: Object.assign({}, DEFAULT_LOOK), realm: 'nebula', quests: [],
      stats: { games: 0, kills: 0, pearls: 0, coins: 0, dust: 0, surge: 0, time: 0, bestLife: 0, jadeEarned: 0, emperors: 0, best: {} },
      questBase: {},
    };
  }

  function load() {
    try { P = JSON.parse(localStorage[KEY]); } catch (e) { P = null; }
    const f = fresh();
    if (!P) P = f;
    // merge new fields from later versions
    for (const k in f) if (P[k] === undefined) P[k] = f[k];
    for (const k in f.stats) if (P.stats[k] === undefined) P.stats[k] = f.stats[k];
    for (const k in f.owned) if (!P.owned[k]) P.owned[k] = f.owned[k];
    for (const k in DEFAULT_LOOK) if (P.look[k] === undefined) P.look[k] = DEFAULT_LOOK[k];
    fillQuests();
    return P;
  }
  function save() { localStorage[KEY] = JSON.stringify(P); }

  function owns(slot, id) { return P.owned[slot].includes(id); }
  function buy(slot, item) {
    if (owns(slot, item.id) || P.jade < item.price || P.lvl < item.lvl) return false;
    P.jade -= item.price; P.owned[slot].push(item.id); save(); return true;
  }

  // XP -> levels; returns list of levels gained
  function addXp(x) {
    const gained = [];
    P.xp += x;
    while (P.xp >= xpFor(P.lvl)) { P.xp -= xpFor(P.lvl); P.lvl++; gained.push(P.lvl); P.jade += 50 * P.lvl; }
    return gained;
  }

  // Quests track a stat delta from the moment they were issued (bestLife is absolute).
  function fillQuests() {
    while (P.quests.length < 3) {
      const used = new Set(P.quests.map(q => q.id));
      const pool = QUEST_TEMPLATES.filter(t => !used.has(t.id));
      const t = pool[(Math.random() * pool.length) | 0];
      const tier = Math.min(t.amounts.length - 1, Math.floor(Math.random() * (1 + P.lvl / 4)));
      const n = t.amounts[tier];
      P.quests.push({ id: t.id, n, base: t.stat === 'bestLife' ? 0 : P.stats[t.stat], reward: t.reward(n) });
    }
  }
  function questInfo(q) {
    const t = QUEST_TEMPLATES.find(t => t.id === q.id);
    const cur = t.stat === 'bestLife' ? (q.peak || 0) : P.stats[t.stat] - q.base;
    return { text: t.text(q.n), cur: Math.min(q.n, Math.floor(cur)), done: cur >= q.n };
  }
  function claim(i) {
    const q = P.quests[i];
    if (!questInfo(q).done) return 0;
    P.jade += q.reward; P.quests.splice(i, 1); fillQuests(); save();
    return q.reward;
  }

  return { load, save, owns, buy, addXp, questInfo, claim, get p() { return P; } };
})();
