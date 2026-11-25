// Sizzle & Serve — configuration: field, recipes, stations, timings.
// Everything the world and the renderer share lives here so the two never drift.
export const FIELD = { width: 1280, height: 800 };

// --- Ingredients -------------------------------------------------------------
// kind: 'instant' is grabbed straight from its bin; 'cooked' comes out of a
// cooker after its cook time. emoji is the art: every food item is drawn as
// one big emoji, so the game needs no image files at all.
export const INGREDIENTS = {
  bun:     { name: 'Bun',     emoji: '🍞', kind: 'instant', station: 'bun' },
  lettuce: { name: 'Lettuce', emoji: '🥬', kind: 'instant', station: 'lettuce' },
  tomato:  { name: 'Tomato',  emoji: '🍅', kind: 'instant', station: 'tomato' },
  cheese:  { name: 'Cheese',  emoji: '🧀', kind: 'instant', station: 'cheese' },
  shell:   { name: 'Shell',   emoji: '🌮', kind: 'instant', station: 'shell' },
  dough:   { name: 'Dough',   emoji: '🥖', kind: 'instant', station: 'dough' },
  sauce:   { name: 'Sauce',   emoji: '🥫', kind: 'instant', station: 'sauce' },
  patty:   { name: 'Patty',   emoji: '🍖', kind: 'cooked',  station: 'grill',  cookTime: 4, burnTime: 10, rawEmoji: '🥩' },
  fries:   { name: 'Fries',   emoji: '🍟', kind: 'cooked',  station: 'fryer',  cookTime: 3, burnTime: 8,  rawEmoji: '🥔' },
  soup:    { name: 'Soup',    emoji: '🍲', kind: 'cooked',  station: 'pot',    cookTime: 5, burnTime: 12, rawEmoji: '🍵' },
};

// --- Dishes (orders) ---------------------------------------------------------
export const DISHES = {
  burger: { name: 'Burger', emoji: '🍔', items: ['bun', 'patty', 'lettuce'], base: 120 },
  salad:  { name: 'Salad',  emoji: '🥗', items: ['lettuce', 'tomato', 'cheese'], base: 100 },
  fries:  { name: 'Fries',  emoji: '🍟', items: ['fries', 'sauce'], base: 80 },
  soup:   { name: 'Soup',   emoji: '🍲', items: ['soup', 'bun'], base: 110 },
  taco:   { name: 'Taco',   emoji: '🌮', items: ['shell', 'patty', 'cheese'], base: 130 },
  pizza:  { name: 'Pizza',  emoji: '🍕', items: ['dough', 'cheese', 'tomato'], base: 140 },
};
export const DISH_IDS = Object.keys(DISHES);

// --- Stations ---------------------------------------------------------------
// x/y are the counter centres. The chef interacts with the nearest station
// inside INTERACT_RANGE. cookers hold one item at a time.
export const INTERACT_RANGE = 120;
export const STATIONS = [
  { id: 'bun',     label: 'Buns',    emoji: '🍞', x: 110,  y: 205, kind: 'bin' },
  { id: 'lettuce', label: 'Lettuce', emoji: '🥬', x: 260,  y: 205, kind: 'bin' },
  { id: 'tomato',  label: 'Tomato',  emoji: '🍅', x: 410,  y: 205, kind: 'bin' },
  { id: 'cheese',  label: 'Cheese',  emoji: '🧀', x: 560,  y: 205, kind: 'bin' },
  { id: 'grill',   label: 'Grill',   emoji: '🔥', x: 760,  y: 205, kind: 'cooker', makes: 'patty' },
  { id: 'fryer',   label: 'Fryer',   emoji: '🍳', x: 950,  y: 205, kind: 'cooker', makes: 'fries' },
  { id: 'pot',     label: 'Soup Pot', emoji: '🍲', x: 1130, y: 205, kind: 'cooker', makes: 'soup' },
  { id: 'shell',   label: 'Shells',  emoji: '🌮', x: 110,  y: 560, kind: 'bin' },
  { id: 'dough',   label: 'Dough',   emoji: '🥖', x: 260,  y: 560, kind: 'bin' },
  { id: 'sauce',   label: 'Sauce',   emoji: '🥫', x: 410,  y: 560, kind: 'bin' },
  { id: 'plate',   label: 'Plate',   emoji: '🍽️', x: 700,  y: 560, kind: 'plate' },
  { id: 'bell',    label: 'SERVE',   emoji: '🔔', x: 980,  y: 560, kind: 'bell' },
  { id: 'trash',   label: 'Trash',   emoji: '🗑️', x: 1180, y: 560, kind: 'trash' },
];
export const STATION_BY_ID = Object.fromEntries(STATIONS.map((s) => [s.id, s]));

// --- Flow --------------------------------------------------------------------
export const CHEF_SPEED = 340; // px per second
export const PLATE_MAX = 4;
export const MAX_HEARTS = 3;
export const BASE_PATIENCE = 45; // seconds an order waits at level 1
export const MIN_PATIENCE = 24;
export const PATIENCE_PER_LEVEL = 3;
export const BASE_SPAWN_GAP = 9; // seconds between new orders at level 1
export const MIN_SPAWN_GAP = 4;
export const SPAWN_PER_LEVEL = 0.7;
export const SERVES_PER_LEVEL = 4; // serves needed to level up
export const MAX_ORDERS = 3; // 4 from level 3
export const COMBO_STEP = 0.1; // +10% score per consecutive serve
export const COMBO_MAX = 0.5;
export const STEP = 1 / 60; // fixed simulation step, seconds

export const HELP_LINES = [
  'Move: WASD / Arrows or click  ·  Interact: E / Space / click a station',
  'Grab ingredients, cook on the grill, fryer and pot — don\'t let food burn!',
  'Stack the dish on the Plate, then ring the SERVE bell to send it out.',
];
