// Keyboard + mouse input. The game loop polls `keys` each frame; clicks set a
// walk target on the canvas and interact when they land on a station.
export function createInput(canvas) {
  const input = {
    keys: new Set(),
    click: null, // { x, y } canvas coords, consumed by the loop
    clickStation: null,
  };

  const KEYMAP = {
    ArrowLeft: 'left', KeyA: 'left',
    ArrowRight: 'right', KeyD: 'right',
    ArrowUp: 'up', KeyW: 'up',
    ArrowDown: 'down', KeyS: 'down',
    KeyE: 'act', Space: 'act', Enter: 'act',
    KeyR: 'restart',
  };

  window.addEventListener('keydown', (e) => {
    const action = KEYMAP[e.code];
    if (!action) return;
    e.preventDefault();
    if (action === 'act' && !e.repeat) input.keys.add('actPressed');
    if (action === 'restart' && !e.repeat) input.keys.add('restartPressed');
    input.keys.add(action);
  });
  window.addEventListener('keyup', (e) => {
    const action = KEYMAP[e.code];
    if (action) input.keys.delete(action);
  });
  window.addEventListener('blur', () => input.keys.clear());

  canvas.addEventListener('pointerdown', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);
    input.click = { x, y };
  });

  return input;
}

/** Read the held movement keys as a unit direction, or null. */
export function moveDirection(input) {
  let dx = 0;
  let dy = 0;
  if (input.keys.has('left')) dx -= 1;
  if (input.keys.has('right')) dx += 1;
  if (input.keys.has('up')) dy -= 1;
  if (input.keys.has('down')) dy += 1;
  if (dx === 0 && dy === 0) return null;
  const len = Math.hypot(dx, dy);
  return { x: dx / len, y: dy / len };
}

export function consumeAct(input) {
  if (input.keys.has('actPressed')) { input.keys.delete('actPressed'); return true; }
  return false;
}

export function consumeRestart(input) {
  if (input.keys.has('restartPressed')) { input.keys.delete('restartPressed'); return true; }
  return false;
}
