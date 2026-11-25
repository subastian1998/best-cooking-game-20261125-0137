// Sizzle & Serve — all canvas drawing. Everything is drawn with shapes and
// emoji, so the game needs no image files: the kitchen, the chef, the food
// and the order board are all code.
import { DISHES, FIELD, INGREDIENTS, STATIONS } from './config.js';
import { nearestStation, plateMatchesOrder } from './world.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_OVER = 'over';

const EMOJI_FONT = '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';
const UI_FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function emoji(ctx, text, x, y, size) {
  ctx.font = `${size}px ${EMOJI_FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y);
}

function text(ctx, str, x, y, size, color, weight = 'bold', align = 'left') {
  ctx.font = `${weight} ${size}px ${UI_FONT}`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(str, x, y);
}

function patienceColor(p, max) {
  const r = p / max;
  if (r > 0.5) return '#2fae4e';
  if (r > 0.25) return '#e8a100';
  return '#d93a2b';
}

/** The order board + score strip across the top of the screen. */
function drawTopBar(ctx, world) {
  ctx.fillStyle = '#5b3a29';
  ctx.fillRect(0, 0, FIELD.width, 118);
  ctx.fillStyle = '#6e4632';
  ctx.fillRect(0, 112, FIELD.width, 6);

  world.orders.forEach((order, i) => {
    const dish = DISHES[order.dish];
    const x = 16 + i * 252;
    const y = 10;
    ctx.fillStyle = '#fff8e7';
    rr(ctx, x, y, 240, 96, 10);
    ctx.fill();
    ctx.strokeStyle = '#d9b380';
    ctx.lineWidth = 2;
    ctx.stroke();
    emoji(ctx, dish.emoji, x + 34, y + 34, 44);
    text(ctx, dish.name, x + 66, y + 22, 19, '#3a2415');
    text(ctx, `#${order.id}`, x + 66, y + 44, 13, '#8a6a4a');
    order.items.forEach((item, j) => {
      emoji(ctx, INGREDIENTS[item].emoji, x + 78 + j * 34, y + 70, 26);
    });
    // patience bar
    ctx.fillStyle = '#e5d5bd';
    rr(ctx, x + 66, y + 88, 160, 8, 4);
    ctx.fill();
    ctx.fillStyle = patienceColor(order.patience, order.maxPatience);
    const w = Math.max(0, (order.patience / order.maxPatience) * 160);
    if (w > 0) { rr(ctx, x + 66, y + 88, w, 8, 4); ctx.fill(); }
  });

  // HUD: score, coins, level, hearts, time
  const hx = FIELD.width - 16;
  text(ctx, `⭐ ${world.score}`, hx, 24, 24, '#ffd94a', 'bold', 'right');
  text(ctx, `🪙 ${world.coins}   Lv ${world.level}`, hx, 52, 17, '#fff3d6', 'bold', 'right');
  const hearts = '❤️'.repeat(world.hearts) + '🖤'.repeat(Math.max(0, 3 - world.hearts));
  text(ctx, hearts, hx, 82, 19, '#fff', 'bold', 'right');
  const mins = Math.floor(world.time / 60);
  const secs = Math.floor(world.time % 60);
  text(ctx, `⏱ ${mins}:${String(secs).padStart(2, '0')}   🍽 ${world.served} served`, hx - 330, 24, 16, '#e8d3ae', 'bold', 'right');
  if (world.combo >= 2) text(ctx, `🔥 COMBO x${world.combo}`, hx - 330, 52, 16, '#ff9d45', 'bold', 'right');
}

function drawStation(ctx, world, station, t) {
  const near = nearestStation(world) === station;
  const w = 150;
  const h = 92;
  const x = station.x - w / 2;
  const y = station.y - h / 2;

  if (near) {
    ctx.save();
    ctx.shadowColor = '#ffd94a';
    ctx.shadowBlur = 22;
    ctx.fillStyle = '#fff2c0';
    rr(ctx, x - 4, y - 4, w + 8, h + 8, 14);
    ctx.fill();
    ctx.restore();
  }

  // counter body
  const body = station.kind === 'cooker' ? '#4a4a55' : station.kind === 'bell' ? '#c9a227' : station.kind === 'trash' ? '#6b6f76' : '#8a5a33';
  ctx.fillStyle = body;
  rr(ctx, x, y, w, h, 12);
  ctx.fill();
  ctx.fillStyle = station.kind === 'cooker' ? '#5d5d6b' : station.kind === 'plate' ? '#f2ede2' : '#a9743f';
  rr(ctx, x, y, w, 26, 12);
  ctx.fill();
  ctx.fillRect(x, y + 14, w, 12);

  if (station.kind === 'bin') {
    emoji(ctx, station.emoji, station.x, station.y - 6, 46);
    text(ctx, station.label, station.x, station.y + 34, 14, '#fff', 'bold', 'center');
  } else if (station.kind === 'cooker') {
    const cooker = world.cookers[station.id];
    const ing = cooker.cooking ? INGREDIENTS[cooker.cooking] : null;
    if (cooker.burnt) {
      emoji(ctx, '🔥', station.x, station.y - 8, 46);
      text(ctx, 'BURNT!', station.x, station.y + 32, 14, '#ff6b4a', 'bold', 'center');
    } else if (ing) {
      const done = cooker.progress >= ing.cookTime;
      emoji(ctx, done ? ing.emoji : ing.rawEmoji, station.x, station.y - 10, 44);
      const frac = Math.min(1, cooker.progress / ing.cookTime);
      ctx.fillStyle = '#2b2b33';
      rr(ctx, station.x - 55, station.y + 26, 110, 10, 5);
      ctx.fill();
      ctx.fillStyle = done ? '#37c978' : '#ffb02e';
      rr(ctx, station.x - 55, station.y + 26, 110 * frac, 10, 5);
      ctx.fill();
      if (done) {
        const pulse = 0.6 + 0.4 * Math.sin(t * 6);
        ctx.save();
        ctx.globalAlpha = pulse;
        text(ctx, 'READY!', station.x, station.y - 42, 13, '#7dffab', 'bold', 'center');
        ctx.restore();
      } else {
        text(ctx, station.label, station.x, station.y + 40, 12, '#cfcfe0', 'bold', 'center');
      }
    } else {
      emoji(ctx, station.emoji, station.x, station.y - 8, 40);
      text(ctx, station.label, station.x, station.y + 32, 14, '#e8e8f2', 'bold', 'center');
    }
  } else if (station.kind === 'plate') {
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(station.x, station.y + 2, 62, 26, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#c9c2b2';
    ctx.lineWidth = 2;
    ctx.stroke();
    world.plate.forEach((item, i) => {
      emoji(ctx, INGREDIENTS[item].emoji, station.x - 44 + i * 30 + 15, station.y - 2, 30);
    });
    text(ctx, `Plate (${world.plate.length}/4)`, station.x, station.y + 34, 13, '#fff', 'bold', 'center');
  } else if (station.kind === 'bell') {
    const match = plateMatchesOrder(world);
    if (match) {
      ctx.save();
      ctx.shadowColor = '#ffd94a';
      ctx.shadowBlur = 26;
      ctx.fillStyle = '#ffd94a';
      ctx.beginPath();
      ctx.arc(station.x, station.y - 6, 34, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    emoji(ctx, '🔔', station.x, station.y - 8, 48);
    text(ctx, match ? 'SERVE IT!' : 'SERVE', station.x, station.y + 34, 14, match ? '#ffd94a' : '#fff', 'bold', 'center');
  } else if (station.kind === 'trash') {
    emoji(ctx, '🗑️', station.x, station.y - 6, 44);
    text(ctx, 'Trash', station.x, station.y + 34, 14, '#fff', 'bold', 'center');
  }
}

function drawChef(ctx, world, t) {
  const chef = world.chef;
  const x = chef.x;
  const y = chef.y;
  const bob = chef.moving ? Math.sin(t * 14) * 3 : Math.sin(t * 3) * 1.5;

  // shadow
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.beginPath();
  ctx.ellipse(x, y + 34, 30, 9, 0, 0, Math.PI * 2);
  ctx.fill();

  // body / apron
  ctx.fillStyle = '#f5f0e6';
  rr(ctx, x - 24, y - 8 + bob, 48, 40, 12);
  ctx.fill();
  ctx.fillStyle = '#e2574c';
  ctx.fillRect(x - 24, y + 12 + bob, 48, 8);
  // head
  ctx.fillStyle = '#ffcf9e';
  ctx.beginPath();
  ctx.arc(x, y - 22 + bob, 17, 0, Math.PI * 2);
  ctx.fill();
  // chef hat
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(x - 10, y - 36 + bob, 10, 0, Math.PI * 2);
  ctx.arc(x, y - 40 + bob, 12, 0, Math.PI * 2);
  ctx.arc(x + 10, y - 36 + bob, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(x - 16, y - 38 + bob, 32, 8);
  // eyes
  ctx.fillStyle = '#222';
  ctx.beginPath();
  ctx.arc(x - 6, y - 22 + bob, 2.2, 0, Math.PI * 2);
  ctx.arc(x + 6, y - 22 + bob, 2.2, 0, Math.PI * 2);
  ctx.fill();
  // carried item
  if (chef.carrying) {
    const lift = Math.sin(t * 5) * 3;
    emoji(ctx, INGREDIENTS[chef.carrying].emoji, x, y - 62 + bob + lift, 40);
  }
  // interact hint
  const near = nearestStation(world);
  if (near && !world.over) {
    ctx.save();
    ctx.globalAlpha = 0.85 + 0.15 * Math.sin(t * 5);
    text(ctx, 'E', x, y - 84 + bob, 15, '#3a2415', 'bold', 'center');
    ctx.restore();
  }
}

function drawKitchen(ctx, world, t) {
  // wall
  ctx.fillStyle = '#f3e2c2';
  ctx.fillRect(0, 118, FIELD.width, 62);
  ctx.fillStyle = '#e8d3ae';
  for (let x = 0; x < FIELD.width; x += 64) ctx.fillRect(x, 118, 2, 62);
  ctx.fillRect(0, 178, FIELD.width, 2);
  // floor tiles
  for (let ty = 0; ty < 9; ty += 1) {
    for (let tx = 0; tx < 20; tx += 1) {
      ctx.fillStyle = (tx + ty) % 2 === 0 ? '#f7ead0' : '#eeddc0';
      ctx.fillRect(tx * 64, 180 + ty * 60, 64, 60);
    }
  }
  // rug in the middle: a bordered mat with a stitched diamond pattern
  ctx.fillStyle = '#d96a5f';
  rr(ctx, 470, 320, 340, 150, 14);
  ctx.fill();
  ctx.strokeStyle = '#f2c14e';
  ctx.lineWidth = 4;
  rr(ctx, 482, 332, 316, 126, 10);
  ctx.stroke();
  ctx.fillStyle = '#e88a7d';
  for (let i = 0; i < 4; i += 1) {
    const cx = 530 + i * 80;
    ctx.save();
    ctx.translate(cx, 395);
    ctx.rotate(Math.PI / 4);
    ctx.fillRect(-16, -16, 32, 32);
    ctx.restore();
  }

  for (const station of STATIONS) drawStation(ctx, world, station, t);
  drawChef(ctx, world, t);

  // flash message
  if (world.flash) {
    ctx.save();
    ctx.globalAlpha = 0.95;
    text(ctx, world.flash.text, FIELD.width / 2, 690, 22, '#fff', 'bold', 'center');
    ctx.restore();
  }
}

function drawHelpBar(ctx) {
  ctx.fillStyle = '#5b3a29';
  ctx.fillRect(0, FIELD.height - 58, FIELD.width, 58);
  text(ctx, 'Move: WASD / Arrows or click  ·  Interact: E / Space / click a station', 16, FIELD.height - 42, 14, '#f3e2c2', 'bold', 'left');
  text(ctx, 'Grab ingredients, cook on the grill, fryer and pot — don\'t let food burn! Stack the dish on the Plate, then ring SERVE.', 16, FIELD.height - 18, 14, '#f3e2c2', 'bold', 'left');
}

function panel(ctx, x, y, w, h) {
  ctx.fillStyle = 'rgba(20,12,6,0.55)';
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  ctx.fillStyle = '#fff8e7';
  rr(ctx, x, y, w, h, 18);
  ctx.fill();
  ctx.strokeStyle = '#c9a227';
  ctx.lineWidth = 3;
  ctx.stroke();
}

export function render(ctx, world, screen, best, t) {
  ctx.clearRect(0, 0, FIELD.width, FIELD.height);
  drawTopBar(ctx, world);
  drawKitchen(ctx, world, t);
  drawHelpBar(ctx);

  if (screen === SCREEN_TITLE) {
    panel(ctx, 290, 170, 700, 440);
    emoji(ctx, '🍳', 640, 235, 64);
    text(ctx, 'SIZZLE & SERVE', 640, 300, 52, '#c0392b', 'bold', 'center');
    text(ctx, 'The lunch rush is on. Cook fast, serve faster!', 640, 348, 20, '#5b3a29', 'bold', 'center');
    text(ctx, 'HOW TO PLAY', 640, 398, 17, '#8a6a4a', 'bold', 'center');
    text(ctx, '• Walk to a station and press E to grab or cook', 640, 428, 17, '#3a2415', 'bold', 'center');
    text(ctx, '• Stack the dish on the Plate, ring SERVE to send it out', 640, 454, 17, '#3a2415', 'bold', 'center');
    text(ctx, '• Burned food must be cleared — watch the timers!', 640, 480, 17, '#3a2415', 'bold', 'center');
    text(ctx, '• 3 missed orders and the shift is over', 640, 506, 17, '#3a2415', 'bold', 'center');
    if (best > 0) text(ctx, `Best score: ${best}`, 640, 540, 18, '#c0392b', 'bold', 'center');
    ctx.save();
    ctx.globalAlpha = 0.7 + 0.3 * Math.sin(t * 4);
    text(ctx, '▶  Press ENTER or click to start', 640, 578, 20, '#2fae4e', 'bold', 'center');
    ctx.restore();
  } else if (screen === SCREEN_OVER) {
    panel(ctx, 340, 190, 600, 400);
    emoji(ctx, '🌙', 640, 250, 56);
    text(ctx, 'SHIFT OVER!', 640, 312, 48, '#c0392b', 'bold', 'center');
    text(ctx, `Score: ${world.score}`, 640, 372, 26, '#3a2415', 'bold', 'center');
    text(ctx, `Dishes served: ${world.served}   •   Missed: ${world.missed}`, 640, 410, 19, '#5b3a29', 'bold', 'center');
    text(ctx, `Level reached: ${world.level}   •   Coins earned: ${world.coins}`, 640, 440, 19, '#5b3a29', 'bold', 'center');
    if (world.score >= best && world.score > 0) text(ctx, '🏆 NEW BEST SCORE!', 640, 474, 20, '#c9a227', 'bold', 'center');
    else text(ctx, `Best score: ${best}`, 640, 474, 18, '#8a6a4a', 'bold', 'center');
    ctx.save();
    ctx.globalAlpha = 0.7 + 0.3 * Math.sin(t * 4);
    text(ctx, 'Press R or click to cook again', 640, 540, 20, '#2fae4e', 'bold', 'center');
    ctx.restore();
  }
}
