// Everything unlockable: cosmetics, worlds, levels, quests.
// Slot keys are shared with the renderer: horns = hats, spines = back, whiskers = face.
const CATALOG = {
  pattern: [
    { id: 'rings', name: 'Wiggly Rings', price: 0, lvl: 1 },
    { id: 'stripes', name: 'Stripes', price: 150, lvl: 1 },
    { id: 'spots', name: 'Polka Dots', price: 300, lvl: 2 },
    { id: 'tiger', name: 'Tiger', price: 600, lvl: 4 },
    { id: 'gold', name: 'Shiny Gold', price: 1600, lvl: 8 },
    { id: 'rainbow', name: 'Rainbow', price: 2200, lvl: 10 },
    { id: 'galaxy', name: 'Galaxy', price: 3500, lvl: 13 },
  ],
  horns: [
    { id: 'none', name: 'No Hat', price: 0, lvl: 1 },
    { id: 'cap', name: 'Baseball Cap', price: 0, lvl: 1 },
    { id: 'party', name: 'Party Hat', price: 200, lvl: 2 },
    { id: 'propeller', name: 'Propeller Hat', price: 450, lvl: 3 },
    { id: 'viking', name: 'Viking Helmet', price: 800, lvl: 5 },
    { id: 'tophat', name: 'Top Hat', price: 1200, lvl: 7 },
    { id: 'crown', name: 'Royal Crown', price: 2600, lvl: 11 },
  ],
  spines: [
    { id: 'none', name: 'Smooth Back', price: 0, lvl: 1 },
    { id: 'spikes', name: 'Dino Spikes', price: 180, lvl: 2 },
    { id: 'wings', name: 'Bug Wings', price: 700, lvl: 5 },
    { id: 'lights', name: 'Party Lights', price: 1100, lvl: 7 },
  ],
  whiskers: [
    { id: 'happy', name: 'Happy', price: 0, lvl: 1 },
    { id: 'googly', name: 'Googly Eyes', price: 0, lvl: 1 },
    { id: 'shades', name: 'Cool Shades', price: 300, lvl: 3 },
    { id: 'mustache', name: 'Mustache', price: 500, lvl: 4 },
    { id: 'angry', name: 'Grumpy', price: 700, lvl: 6 },
  ],
  tail: [
    { id: 'plain', name: 'Plain Tip', price: 0, lvl: 1 },
    { id: 'rattle', name: 'Rattle', price: 250, lvl: 2 },
    { id: 'fish', name: 'Fish Tail', price: 600, lvl: 4 },
    { id: 'rocket', name: 'Rocket', price: 1000, lvl: 6 },
    { id: 'flag', name: 'Flag', price: 1800, lvl: 9 },
  ],
  trail: [
    { id: 'none', name: 'None', price: 0, lvl: 1 },
    { id: 'sparks', name: 'Sparkles', price: 200, lvl: 1 },
    { id: 'petals', name: 'Flowers', price: 500, lvl: 3 },
    { id: 'bubbles', name: 'Bubbles', price: 700, lvl: 5 },
    { id: 'ink', name: 'Mud Splats', price: 900, lvl: 6 },
    { id: 'lightning', name: 'Zappy Lightning', price: 1400, lvl: 8 },
    { id: 'rainbow', name: 'Rainbow Ribbon', price: 2800, lvl: 12 },
  ],
  title: [
    { id: '', name: '(none)', price: 0, lvl: 1 },
    { id: 'Silly', name: 'Silly', price: 100, lvl: 1 },
    { id: 'Super', name: 'Super', price: 300, lvl: 2 },
    { id: 'Turbo', name: 'Turbo', price: 600, lvl: 4 },
    { id: 'Mighty', name: 'Mighty', price: 900, lvl: 6 },
    { id: 'Captain', name: 'Captain', price: 2000, lvl: 10 },
    { id: 'The Legendary', name: 'The Legendary', price: 4000, lvl: 15 },
  ],
};
const SLOTS = [
  ['pattern', 'Pattern'], ['horns', 'Hats'], ['whiskers', 'Face'], ['spines', 'Back'],
  ['tail', 'Tail'], ['trail', 'Trail'], ['title', 'Title'],
];
const COLOR_SLOTS = [['body', 'Body'], ['accent', 'Spots'], ['belly', 'Band'], ['mane', 'Extra'], ['eye', 'Eyes'], ['glow', 'Glow']];

// Free colour presets
const PRESETS = [
  { name: 'Pinky', body: '#f08aa0', accent: '#b8506a', belly: '#ffc2cf', mane: '#ffe36b', eye: '#3a2a1a', glow: '#ff9ab8' },
  { name: 'Glowy', body: '#7be04a', accent: '#2f8a1e', belly: '#e4ff8a', mane: '#ffffff', eye: '#103a10', glow: '#b6ff5a' },
  { name: 'Lava', body: '#ff5a2a', accent: '#a01a00', belly: '#ffd36b', mane: '#ffe36b', eye: '#2a0800', glow: '#ff9a3c' },
  { name: 'Bubble', body: '#4ab4ff', accent: '#1a5ac4', belly: '#bff0ff', mane: '#ff6ad5', eye: '#08203a', glow: '#7ad8ff' },
  { name: 'Grape', body: '#9a5aff', accent: '#4a1aa0', belly: '#e0c8ff', mane: '#7affd8', eye: '#1a083a', glow: '#c08aff' },
  { name: 'Banana', body: '#ffd83a', accent: '#a07a00', belly: '#fff6c0', mane: '#ff5a5a', eye: '#3a2a00', glow: '#fff07a' },
];

const DEFAULT_LOOK = Object.assign({}, PRESETS[0], {
  pattern: 'rings', horns: 'cap', spines: 'none', whiskers: 'happy', tail: 'plain', trail: 'none', title: '',
});

// Worlds (kept as REALMS so the engine code is shared with the dragon game)
const REALMS = [
  { id: 'nebula', name: 'Backyard Garden', kanji: '🌱', lvl: 1, mult: 1.0, bots: 22, tint: null,
    desc: 'Soft, squishy dirt full of yummy snacks. Every worm starts here!' },
  { id: 'asteroids', name: 'Rocky Ground', kanji: '🪨', lvl: 2, mult: 1.4, bots: 22, tint: 'rgba(60,60,70,.10)',
    desc: 'Big rolling rocks! Bonk one with your head and you\'re out. Lots of gems though.' },
  { id: 'sun', name: 'Lava Pit', kanji: '🌋', lvl: 3, mult: 1.8, bots: 24, tint: 'rgba(255,60,0,.10)',
    desc: 'A bubbling lava pool in the middle pulls you in. Watch out for hot heat waves!' },
  { id: 'blackhole', name: 'Swirly Sinkhole', kanji: '🌀', lvl: 5, mult: 2.3, bots: 24, tint: 'rgba(0,30,60,.12)',
    desc: 'Everything swirls toward the drain in the middle. Snack fast, don\'t fall in!' },
  { id: 'palace', name: 'Crystal Cave', kanji: '💎', lvl: 7, mult: 3.0, bots: 20, tint: 'rgba(120,80,255,.08)',
    desc: 'WORMZILLA lives here. Make it bonk into you for a giant pile of gems!' },
];

const RANKS = ['Tiny Wiggler', 'Noodle', 'Squirmer', 'Garden Worm', 'Night Crawler', 'Mud Master', 'Tunnel King',
  'Earth Shaker', 'Mega Worm', 'Legend Worm', 'Worm Emperor'];
function rankName(lvl) { return RANKS[Math.min(RANKS.length - 1, Math.floor((lvl - 1) / 2))]; }
function xpFor(lvl) { return Math.round(90 * Math.pow(lvl, 1.45)); } // xp needed to go from lvl to lvl+1

const QUEST_TEMPLATES = [
  { id: 'mass', text: n => `Grow to ${n} long in one game`, stat: 'bestLife', amounts: [300, 600, 1000, 1800, 3000], reward: n => Math.round(n / 4) },
  { id: 'kills', text: n => `Make ${n} worms bonk into you`, stat: 'kills', amounts: [2, 5, 10, 20], reward: n => n * 30 },
  { id: 'pearls', text: n => `Grab ${n} power-ups`, stat: 'pearls', amounts: [2, 4, 8], reward: n => n * 35 },
  { id: 'coins', text: n => `Collect ${n} gems`, stat: 'coins', amounts: [5, 12, 25], reward: n => n * 12 },
  { id: 'dust', text: n => `Gobble ${n} snacks`, stat: 'dust', amounts: [500, 1500, 4000], reward: n => Math.round(n / 8) },
  { id: 'surge', text: n => `Zoom for ${n} seconds`, stat: 'surge', amounts: [30, 90, 200], reward: n => n * 2 },
  { id: 'games', text: n => `Play ${n} games`, stat: 'games', amounts: [3, 8], reward: n => n * 25 },
];
