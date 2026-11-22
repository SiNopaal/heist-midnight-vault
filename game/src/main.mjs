import { createWorld, interact, MAP, movePlayer, updateWorld, useCoin, useSmoke } from './world.mjs';
import { draw } from './render.mjs';

const canvas = document.querySelector('#scene'), ctx = canvas.getContext('2d', { alpha: false });
const el = (id) => document.getElementById(id);
const game = createWorld(), keys = new Set();
let layout = { x: 0, y: 0, s: 1 }, last = performance.now(), sound = true, audio, toastTimer;
function resize() {
  const d = Math.min(devicePixelRatio || 1, 2), w = innerWidth, h = innerHeight;
  canvas.width = Math.round(w * d); canvas.height = Math.round(h * d); canvas.style.width = `${w}px`; canvas.style.height = `${h}px`;
  const s = Math.min((w - 40) / MAP.w, (h - 145) / MAP.h);
  layout = { x: (w - MAP.w * s) / 2, y: (h - MAP.h * s) / 2 + 12, s };
}
function announce(message) { el('announcer').textContent = message; }
function notify(message) {
  const box = el('toast'); box.textContent = message; box.classList.add('show'); clearTimeout(toastTimer);
  toastTimer = setTimeout(() => box.classList.remove('show'), 1900);
}
function tone(frequency = 520, duration = .08, wave = 'sine') {
  if (!sound) return;
  try {
    audio ??= new AudioContext(); const osc = audio.createOscillator(), gain = audio.createGain();
    osc.type = wave; osc.frequency.value = frequency; gain.gain.setValueAtTime(.026, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(.001, audio.currentTime + duration); osc.connect(gain).connect(audio.destination);
    osc.start(); osc.stop(audio.currentTime + duration);
  } catch { /* Audio is optional; keyboard gameplay remains available. */ }
}
function finish(kind) {
  const won = kind === 'escaped';
  el('result').hidden = false;
  el('result-stamp').textContent = won ? (game.exposure < 30 ? 'A CLEAN GETAWAY' : 'THAT WAS TOO CLOSE') : 'THE MUSEUM LOCKS DOWN';
  el('result-title').textContent = won ? 'Gone before dawn.' : 'Not this time.';
  el('result-copy').textContent = won ? 'The moonstone is yours. The city keeps its secrets.' : 'The night watch found you. Study the rhythm and try another route.';
  el('objective-step').textContent = won ? '03 — VANISHED' : 'OPERATION ENDED';
  el('objective-text').textContent = won ? 'Nothing left but moonlight' : 'The doors are sealed';
  el('objective-hint').textContent = won ? 'Some things belong in the dark.' : 'A quiet approach gives you room to recover.';
  announce(el('result-copy').textContent);
}
function updateHud() {
  const heat = Math.round(game.exposure), fill = el('heat-fill'), value = el('heat-value');
  fill.style.width = `${heat}%`; value.textContent = heat > 68 ? 'COMPROMISED' : heat > 30 ? 'SUSPICIOUS' : 'UNSEEN';
  value.style.color = heat > 68 ? 'var(--red)' : heat > 30 ? 'var(--amber)' : 'var(--teal)';
  el('alarm-note').textContent = heat > 68 ? 'LOCKDOWN APPROACHING' : heat > 30 ? 'BREAK THEIR SIGHTLINE' : 'NIGHT IS ON YOUR SIDE';
  el('coins').textContent = game.coins; el('smoke').textContent = game.smoke;
  if (game.loot) {
    el('objective-step').textContent = '02 — THE DISAPPEARANCE'; el('objective-text').textContent = 'Reach the east exit';
    el('objective-hint').textContent = 'The moonstone is yours. Slip out before they notice.'; el('objective-icon').textContent = '↗';
  } else if (heat > 40) el('objective-hint').textContent = 'You have been noticed. Break line of sight.';
}
function frame(now) {
  const dt = Math.min((now - last) / 1000, .05); last = now;
  const crouch = keys.has('shift');
  const dx = Number(keys.has('d') || keys.has('arrowright')) - Number(keys.has('a') || keys.has('arrowleft'));
  const dy = Number(keys.has('s') || keys.has('arrowdown')) - Number(keys.has('w') || keys.has('arrowup'));
  game.crouch = crouch; game.running = Boolean(dx || dy) && !crouch;
  if (dx || dy) {
    const norm = dx && dy ? Math.SQRT1_2 : 1; movePlayer(game, dx * norm, dy * norm, dt, crouch); game.facing = Math.atan2(dy, dx);
  }
  updateWorld(game, dt); updateHud(); draw(ctx, game, layout, now);
  if (game.ended && el('result').hidden) finish(game.ended);
  requestAnimationFrame(frame);
}
function canvasPoint(event) {
  const r = canvas.getBoundingClientRect(); return { x: (event.clientX - r.left - layout.x) / layout.s, y: (event.clientY - r.top - layout.y) / layout.s };
}
canvas.addEventListener('pointerdown', (event) => {
  const point = canvasPoint(event);
  if (point.x < 0 || point.x > MAP.w || point.y < 0 || point.y > MAP.h) return;
  if (useCoin(game, point.x, point.y)) { tone(690, .06); notify('Decoy tossed. Someone will go looking.'); }
});
window.addEventListener('keydown', (event) => {
  const key = event.key.toLowerCase();
  if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(key)) event.preventDefault();
  keys.add(key); if (event.repeat) return;
  if (key === 'q' && useSmoke(game)) { tone(180, .2, 'triangle'); notify('Smoke veil deployed. Move while they cannot see.'); }
  if (key === 'e') {
    const result = interact(game);
    if (result === 'loot') { tone(470, .12); setTimeout(() => tone(710, .15), 120); announce('Moonstone taken. Reach the east exit.'); }
    if (result === 'escape') { tone(820, .26); finish('escaped'); }
  }
  if (key === 'r' && game.ended) location.reload();
});
window.addEventListener('keyup', (event) => keys.delete(event.key.toLowerCase()));
window.addEventListener('blur', () => keys.clear());
el('restart').addEventListener('click', () => location.reload());
el('sound').addEventListener('click', () => {
  sound = !sound; el('sound').setAttribute('aria-label', sound ? 'Mute sound' : 'Enable sound'); el('sound').textContent = sound ? '♫' : '×';
  if (sound) tone();
});
window.addEventListener('resize', resize); resize(); canvas.focus(); requestAnimationFrame(frame);
window.__heist = { game, layout: () => layout, reset: () => location.reload() };
