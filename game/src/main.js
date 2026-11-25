// Sizzle & Serve — the game loop: screens, input, fixed-step simulation,
// sound triggers, and the ?shot= scenes used for screenshots.
import { FIELD, STATIONS, STEP } from './config.js';
import { createWorld, interact, nearestStation, stepWorld, EVENT_BURN, EVENT_COOK_DONE, EVENT_COOK_START, EVENT_LEVEL, EVENT_MISSED, EVENT_OVER, EVENT_PICKUP, EVENT_SERVED, EVENT_WRONG } from './world.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE, render } from './render.js';
import { consumeAct, consumeRestart, createInput, moveDirection } from './input.js';
import { sfx, unlockAudio } from './sound.js';
import { stageShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
canvas.width = FIELD.width;
canvas.height = FIELD.height;

const params = new URLSearchParams(window.location.search);
const seed = Number(params.get('seed') || '1') || 1;
const shotName = params.get('shot');

const world = createWorld(seed);
const input = createInput(canvas);
let screen = SCREEN_TITLE;
let best = 0;
try { best = Number(window.localStorage.getItem('sizzle-serve-best') || '0') || 0; } catch { best = 0; }

function saveBest() {
  try { window.localStorage.setItem('sizzle-serve-best', String(best)); } catch { /* private mode */ }
}

function playEvents(events) {
  if (events & EVENT_SERVED) sfx.served();
  if (events & EVENT_MISSED) sfx.missed();
  if (events & EVENT_PICKUP) sfx.pickup();
  if (events & EVENT_COOK_START) sfx.cookStart();
  if (events & EVENT_COOK_DONE) sfx.cookDone();
  if (events & EVENT_BURN) sfx.burn();
  if (events & EVENT_WRONG) sfx.wrong();
  if (events & EVENT_LEVEL) sfx.level();
  if (events & EVENT_OVER) {
    if (world.score > best) { best = world.score; saveBest(); }
  }
}

// Deterministic screenshot scene: stage the world once, then draw it.
if (shotName) {
  const staged = stageShot(shotName, world);
  screen = staged.screen;
  if (world.score > best) best = world.score;
}

let last = performance.now();
let acc = 0;
let clickTarget = null; // { x, y, stationId } walk target from a mouse click

function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  const t = now / 1000;

  // --- input ---------------------------------------------------------------
  if (consumeRestart(input) && (screen === SCREEN_OVER || screen === SCREEN_PLAY)) {
    const seedNow = world.seed;
    const fresh = createWorld(seedNow);
    Object.keys(fresh).forEach((k) => { world[k] = fresh[k]; });
    screen = SCREEN_PLAY;
  }
  if (screen === SCREEN_TITLE && (consumeAct(input) || input.click)) {
    unlockAudio();
    screen = SCREEN_PLAY;
    input.click = null;
    clickTarget = null;
  } else if (screen === SCREEN_OVER && input.click) {
    const seedNow = world.seed;
    const fresh = createWorld(seedNow);
    Object.keys(fresh).forEach((k) => { world[k] = fresh[k]; });
    screen = SCREEN_PLAY;
    input.click = null;
    clickTarget = null;
  } else if (screen === SCREEN_PLAY) {
    if (input.click) {
      unlockAudio();
      const c = input.click;
      input.click = null;
      // Clicking a station walks the chef there and interacts on arrival.
      let station = null;
      let bestD = 110;
      for (const s of STATIONS) {
        const d = Math.hypot(c.x - s.x, c.y - s.y);
        if (d < bestD) { bestD = d; station = s; }
      }
      if (station) {
        clickTarget = { x: station.x, y: station.y < 400 ? station.y + 82 : station.y - 82, stationId: station.id };
      } else {
        clickTarget = { x: Math.max(30, Math.min(FIELD.width - 30, c.x)), y: Math.max(200, Math.min(690, c.y)), stationId: null };
      }
    }
    if (consumeAct(input)) {
      const events = interact(world);
      playEvents(events);
      if (world.over) screen = SCREEN_OVER;
    }
  }

  // --- simulation ------------------------------------------------------------
  if (screen === SCREEN_PLAY && !shotName) {
    const dir = moveDirection(input);
    let move = null;
    if (dir) {
      move = { x: world.chef.x + dir.x * 200, y: world.chef.y + dir.y * 200 };
      clickTarget = null;
    } else if (clickTarget) {
      move = { x: clickTarget.x, y: clickTarget.y };
      const arrived = Math.hypot(world.chef.x - clickTarget.x, world.chef.y - clickTarget.y) < 12;
      if (arrived) {
        clickTarget = null;
        const events = interact(world);
        playEvents(events);
        if (world.over) screen = SCREEN_OVER;
      }
    }
    acc += dt;
    while (acc >= STEP) {
      const events = stepWorld(world, move, false);
      playEvents(events);
      acc -= STEP;
      if (world.over) { screen = SCREEN_OVER; break; }
    }
    // keep the chef inside the kitchen floor
    world.chef.x = Math.max(30, Math.min(FIELD.width - 30, world.chef.x));
    world.chef.y = Math.max(200, Math.min(690, world.chef.y));
  }

  render(ctx, world, screen, best, t);
}

requestAnimationFrame(frame);
