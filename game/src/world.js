// Sizzle & Serve — the world: orders, stations, cooking, serving, scoring.
// Pure logic, no drawing and no DOM: the renderer reads this state, the
// autopilot drives it, and the main loop steps it at a fixed STEP.
import {
  BASE_PATIENCE, BASE_SPAWN_GAP, CHEF_SPEED, COMBO_MAX, COMBO_STEP, DISHES,
  DISH_IDS, FIELD, INGREDIENTS, INTERACT_RANGE, MAX_HEARTS, MAX_ORDERS,
  MIN_PATIENCE, MIN_SPAWN_GAP, PATIENCE_PER_LEVEL, PLATE_MAX, SERVES_PER_LEVEL,
  SPAWN_PER_LEVEL, STATIONS, STEP,
} from './config.js';
import { makeRng, pick } from './random.js';

export const EVENT_SERVED = 1;
export const EVENT_MISSED = 2;
export const EVENT_PICKUP = 4;
export const EVENT_COOK_START = 8;
export const EVENT_COOK_DONE = 16;
export const EVENT_BURN = 32;
export const EVENT_WRONG = 64;
export const EVENT_LEVEL = 128;
export const EVENT_OVER = 256;

export function createWorld(seed) {
  const rng = makeRng(seed);
  return {
    seed,
    rng,
    time: 0,
    level: 1,
    score: 0,
    coins: 0,
    combo: 0,
    served: 0,
    missed: 0,
    hearts: MAX_HEARTS,
    over: false,
    chef: { x: FIELD.width / 2, y: 400, targetX: null, targetY: null, carrying: null, moving: false },
    // cooker state: { cooking: null | ingredientId, progress, burnt }
    cookers: { grill: { cooking: null, progress: 0, burnt: false }, fryer: { cooking: null, progress: 0, burnt: false }, pot: { cooking: null, progress: 0, burnt: false } },
    plate: [],
    orders: [],
    nextOrderId: 1,
    spawnIn: 1.5,
    flash: null, // { text, until } transient message
    lastServeAt: -999,
  };
}

export function resetWorld(world) {
  const fresh = createWorld(world.seed);
  Object.keys(fresh).forEach((k) => { world[k] = fresh[k]; });
}

function patienceFor(level) {
  return Math.max(MIN_PATIENCE, BASE_PATIENCE - PATIENCE_PER_LEVEL * (level - 1));
}

function spawnGapFor(level) {
  return Math.max(MIN_SPAWN_GAP, BASE_SPAWN_GAP - SPAWN_PER_LEVEL * (level - 1));
}

function maxOrdersFor(level) {
  return level >= 3 ? MAX_ORDERS + 1 : MAX_ORDERS;
}

export function spawnOrder(world) {
  const dish = pick(world.rng, DISH_IDS);
  const patience = patienceFor(world.level);
  world.orders.push({
    id: world.nextOrderId++,
    dish,
    items: [...DISHES[dish].items],
    patience,
    maxPatience: patience,
    bornAt: world.time,
  });
}

function orderMatches(plate, items) {
  if (plate.length !== items.length) return false;
  const a = [...plate].sort();
  const b = [...items].sort();
  return a.every((v, i) => v === b[i]);
}

/** The nearest station to the chef, or null when nothing is in reach. */
export function nearestStation(world) {
  let best = null;
  let bestD = INTERACT_RANGE;
  for (const s of STATIONS) {
    const dx = world.chef.x - s.x;
    const dy = world.chef.y - s.y;
    const d = Math.hypot(dx, dy);
    if (d < bestD) { bestD = d; best = s; }
  }
  return best;
}

/** Does the plate currently match any open order? Used to light up the bell. */
export function plateMatchesOrder(world) {
  if (world.plate.length === 0) return null;
  return world.orders.find((o) => orderMatches(world.plate, o.items)) ?? null;
}

/** Interact with the nearest station. Returns an event mask. */
export function interact(world) {
  if (world.over) return 0;
  const station = nearestStation(world);
  if (!station) return 0;
  const chef = world.chef;

  if (station.kind === 'bin') {
    if (chef.carrying) return 0; // hands full
    chef.carrying = station.id; // bin id doubles as the ingredient id
    return EVENT_PICKUP;
  }

  if (station.kind === 'cooker') {
    const cooker = world.cookers[station.id];
    if (cooker.burnt) { // clear the burnt mess
      cooker.burnt = false;
      cooker.cooking = null;
      cooker.progress = 0;
      return EVENT_PICKUP;
    }
    if (cooker.cooking) {
      const ing = INGREDIENTS[cooker.cooking];
      if (cooker.progress >= ing.cookTime && !chef.carrying) {
        chef.carrying = cooker.cooking; // take the finished dish off the heat
        cooker.cooking = null;
        cooker.progress = 0;
        return EVENT_PICKUP;
      }
      return 0; // still cooking, or hands full
    }
    if (!chef.carrying) { // start cooking this station's item
      cooker.cooking = station.makes;
      cooker.progress = 0;
      return EVENT_COOK_START;
    }
    return 0;
  }

  if (station.kind === 'plate') {
    if (chef.carrying && world.plate.length < PLATE_MAX) {
      world.plate.push(chef.carrying);
      chef.carrying = null;
      return EVENT_PICKUP;
    }
    return 0;
  }

  if (station.kind === 'bell') {
    const match = plateMatchesOrder(world);
    if (!match) {
      world.flash = { text: world.plate.length === 0 ? 'Plate is empty!' : 'No order matches this plate!', until: world.time + 1.2 };
      return EVENT_WRONG;
    }
    const dish = DISHES[match.dish];
    const patienceBonus = Math.round(match.patience * 2);
    const comboMul = 1 + Math.min(COMBO_MAX, world.combo * COMBO_STEP);
    const gained = Math.round((dish.base + patienceBonus) * comboMul);
    world.score += gained;
    world.coins += Math.round(gained / 10);
    world.served += 1;
    world.combo += 1;
    world.lastServeAt = world.time;
    world.orders = world.orders.filter((o) => o.id !== match.id);
    world.plate = [];
    world.flash = { text: `+${gained}  ${dish.name} served!`, until: world.time + 1.4 };
    let events = EVENT_SERVED;
    if (world.served % SERVES_PER_LEVEL === 0) {
      world.level += 1;
      events |= EVENT_LEVEL;
      world.flash = { text: `Level ${world.level}! Orders come faster!`, until: world.time + 2 };
    }
    return events;
  }

  if (station.kind === 'trash') {
    if (chef.carrying) { chef.carrying = null; return EVENT_PICKUP; }
    if (world.plate.length > 0) { world.plate = []; return EVENT_PICKUP; }
    return 0;
  }
  return 0;
}

/** Move the chef toward (x, y) for one step. */
function moveChef(world, tx, ty, dt) {
  const chef = world.chef;
  const dx = tx - chef.x;
  const dy = ty - chef.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 4) { chef.moving = false; return; }
  const step = Math.min(dist, CHEF_SPEED * dt);
  chef.x += (dx / dist) * step;
  chef.y += (dy / dist) * step;
  chef.moving = true;
}

/**
 * Step the world forward by dt seconds.
 * move: { x, y } target the chef walks toward, or null to stand still.
 * act: true to interact this step.
 * Returns an event mask.
 */
export function stepWorld(world, move, act, dt = STEP) {
  if (world.over) return 0;
  let events = 0;
  world.time += dt;

  if (move) moveChef(world, move.x, move.y, dt);
  if (act) events |= interact(world);

  // Cooking progress; food left too long burns.
  for (const id of Object.keys(world.cookers)) {
    const cooker = world.cookers[id];
    if (!cooker.cooking || cooker.burnt) continue;
    const ing = INGREDIENTS[cooker.cooking];
    cooker.progress += dt;
    if (cooker.progress >= ing.cookTime && cooker.progress - dt < ing.cookTime) events |= EVENT_COOK_DONE;
    if (cooker.progress >= ing.burnTime) {
      cooker.burnt = true;
      events |= EVENT_BURN;
      world.flash = { text: 'Something burned! Clear the cooker!', until: world.time + 1.5 };
    }
  }

  // Orders lose patience; an expired order costs a heart.
  for (const order of [...world.orders]) {
    order.patience -= dt;
    if (order.patience <= 0) {
      world.orders = world.orders.filter((o) => o.id !== order.id);
      world.missed += 1;
      world.hearts -= 1;
      world.combo = 0;
      events |= EVENT_MISSED;
      world.flash = { text: `${DISHES[order.dish].name} walked out! -1 ❤`, until: world.time + 1.6 };
      if (world.hearts <= 0) {
        world.hearts = 0;
        world.over = true;
        events |= EVENT_OVER;
      }
    }
  }

  // Spawn fresh orders while there is room on the board.
  world.spawnIn -= dt;
  if (world.spawnIn <= 0 && world.orders.length < maxOrdersFor(world.level)) {
    spawnOrder(world);
    world.spawnIn = spawnGapFor(world.level);
  }

  if (world.flash && world.time > world.flash.until) world.flash = null;
  return events;
}
