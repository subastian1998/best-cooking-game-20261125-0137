// The screenshot scenes behind ?shot=start|play|end. Each one plays the real
// rules forward from a fresh world, so the frame is what a short game really
// looks like and the same seed always gives the same frame.
import { INGREDIENTS, STATION_BY_ID, STEP } from './config.js';
import { createWorld, interact, nearestStation, plateMatchesOrder, resetWorld, spawnOrder, stepWorld } from './world.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

const START_SECONDS = 5;
const PLAY_MIN_SECONDS = 15;
const PLAY_MAX_SECONDS = 40;
const END_PLAY_SECONDS = 60;
const END_LIMIT_SECONDS = 600;

/** Where the chef stands to work a station: just in front of its counter. */
function standPoint(station) {
  return { x: station.x, y: station.y < 400 ? station.y + 82 : station.y - 82 };
}

function missingItems(world, order) {
  const plate = [...world.plate];
  const missing = [];
  for (const item of order.items) {
    const i = plate.indexOf(item);
    if (i === -1) missing.push(item);
    else plate.splice(i, 1);
  }
  return missing;
}

/** One step of the cooking autopilot: what a decent player would do next. */
function autopilot(world) {
  if (world.over || world.orders.length === 0) return { move: null, act: false };
  const order = world.orders[0]; // oldest order first
  const chef = world.chef;

  // 1. Plate complete? Ring the bell.
  if (plateMatchesOrder(world)) {
    const bell = STATION_BY_ID.bell;
    const d = Math.hypot(chef.x - bell.x, chef.y - bell.y);
    if (d < 120) return { move: null, act: true };
    return { move: standPoint(bell), act: false };
  }

  const missing = missingItems(world, order);

  // 2. Carrying something the order needs? Put it on the plate.
  if (chef.carrying && missing.includes(chef.carrying)) {
    const plate = STATION_BY_ID.plate;
    const d = Math.hypot(chef.x - plate.x, chef.y - plate.y);
    if (d < 120) return { move: null, act: true };
    return { move: standPoint(plate), act: false };
  }

  // 3. Carrying something useless? Bin it.
  if (chef.carrying) {
    const trash = STATION_BY_ID.trash;
    const d = Math.hypot(chef.x - trash.x, chef.y - trash.y);
    if (d < 120) return { move: null, act: true };
    return { move: standPoint(trash), act: false };
  }

  // 4. A cooker holds a finished item we need? Go and take it.
  for (const id of ['grill', 'fryer', 'pot']) {
    const cooker = world.cookers[id];
    if (!cooker.cooking || cooker.burnt) continue;
    const ing = INGREDIENTS[cooker.cooking];
    if (cooker.progress >= ing.cookTime && missing.includes(cooker.cooking)) {
      const st = STATION_BY_ID[id];
      const d = Math.hypot(chef.x - st.x, chef.y - st.y);
      if (d < 120) return { move: null, act: true };
      return { move: standPoint(st), act: false };
    }
  }

  // 5. A burnt cooker blocks an item we need? Clear it.
  for (const id of ['grill', 'fryer', 'pot']) {
    const cooker = world.cookers[id];
    if (cooker.burnt && missing.includes(STATION_BY_ID[id].makes)) {
      const st = STATION_BY_ID[id];
      const d = Math.hypot(chef.x - st.x, chef.y - st.y);
      if (d < 120) return { move: null, act: true };
      return { move: standPoint(st), act: false };
    }
  }

  // 6. A needed item is already cooking? Wait beside its cooker.
  for (const id of ['grill', 'fryer', 'pot']) {
    const cooker = world.cookers[id];
    if (cooker.cooking && !cooker.burnt && missing.includes(cooker.cooking)) {
      return { move: standPoint(STATION_BY_ID[id]), act: false };
    }
  }

  // 7. Otherwise fetch the first missing ingredient.
  const next = missing[0];
  if (!next) return { move: null, act: false };
  const ing = INGREDIENTS[next];
  const station = STATION_BY_ID[ing.station];
  const d = Math.hypot(chef.x - station.x, chef.y - station.y);
  if (d < 120) return { move: null, act: true };
  return { move: standPoint(station), act: false };
}

/**
 * Set `world` to the named scene (start, play or end; any other name is start)
 * and return the screen to draw over it.
 */
export function stageShot(name, world) {
  resetWorld(world);
  if (name !== 'play' && name !== 'end') {
    // Title over a lively kitchen: orders on the board, a dish half built.
    for (let i = 0; i < 5 / STEP; i += 1) stepWorld(world, null, false);
    spawnOrder(world);
    spawnOrder(world);
    world.plate = ['bun', 'patty'];
    world.chef.carrying = 'lettuce';
    world.chef.x = 640;
    world.chef.y = 400;
    return { screen: SCREEN_TITLE };
  }
  if (name === 'play') {
    // Play until the frame shows a dish mid-assembly: a plate with food on
    // it, orders on the board, and at least one dish already served.
    for (let i = 0; i < PLAY_MAX_SECONDS / STEP; i += 1) {
      const { move, act } = autopilot(world);
      stepWorld(world, move, act);
      if (world.over) break;
      if (world.time >= PLAY_MIN_SECONDS && world.plate.length >= 2 && world.served > 0 && world.orders.length > 0) break;
    }
    return { screen: world.over ? SCREEN_OVER : SCREEN_PLAY };
  }
  // end: cook well for a minute, then walk away — orders walk out until the
  // shift ends, so the game-over screen shows a real score.
  for (let i = 0; i < END_PLAY_SECONDS / STEP; i += 1) {
    const { move, act } = autopilot(world);
    stepWorld(world, move, act);
    if (world.over) break;
  }
  for (let i = 0; i < END_LIMIT_SECONDS / STEP; i += 1) {
    stepWorld(world, null, false);
    if (world.over) break;
  }
  return { screen: SCREEN_OVER };
}

export { nearestStation };
