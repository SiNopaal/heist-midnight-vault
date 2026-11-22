export const MAP = { w: 960, h: 600 };
export const COVER = [
  { x: 142, y: 132, w: 96, h: 70 }, { x: 318, y: 112, w: 106, h: 44 },
  { x: 646, y: 128, w: 110, h: 72 }, { x: 224, y: 302, w: 54, h: 108 },
  { x: 330, y: 430, w: 122, h: 48 }, { x: 638, y: 408, w: 110, h: 52 },
  { x: 780, y: 284, w: 48, h: 92 }, { x: 472, y: 500, w: 96, h: 30 },
];
const patrols = [
  [[270, 234], [354, 234], [354, 352], [266, 352]],
  [[714, 214], [836, 214], [836, 256], [714, 256]],
  [[748, 474], [866, 474], [866, 382], [748, 382]],
];
const RELIC = { x: 490, y: 306 };
const EXIT = { x: 898, y: 516 };

export function createWorld() {
  return {
    player: { x: 78, y: 516 },
    guards: patrols.map((path, i) => ({ x: path[0][0], y: path[0][1], path, index: 0, speed: 38 + i * 4, angle: 0, target: null, alert: 0 })),
    camera: { x: 490, y: 94, angle: 1.2 },
    time: 0, exposure: 0, loot: false, ended: '', crouch: false, running: false, facing: 0,
    coins: 2, smoke: 1, decoy: null, smokeCloud: null, hint: 'Keep to the shadows. The glass remembers every footstep.',
  };
}

function clearLine(x1, y1, x2, y2) {
  for (const b of COVER) {
    const dx = x2 - x1, dy = y2 - y1;
    let lo = 0, hi = 1;
    for (const [p, q] of [[-dx, x1 - b.x], [dx, b.x + b.w - x1], [-dy, y1 - b.y], [dy, b.y + b.h - y1]]) {
      if (!p) { if (q < 0) { lo = 2; break; } }
      else { const t = q / p; if (p < 0) lo = Math.max(lo, t); else hi = Math.min(hi, t); }
    }
    if (lo <= hi && lo < .98 && hi > .02) return false;
  }
  return true;
}

function canSee(observer, target, range, spread) {
  const dx = target.x - observer.x, dy = target.y - observer.y, distance = Math.hypot(dx, dy);
  if (distance > range || distance < 1 || !clearLine(observer.x, observer.y, target.x, target.y)) return false;
  const angle = Math.atan2(dy, dx);
  return Math.abs(Math.atan2(Math.sin(angle - observer.angle), Math.cos(angle - observer.angle))) < spread;
}

function blocked(x, y) {
  return x < 48 || y < 48 || x > MAP.w - 48 || y > MAP.h - 48 || COVER.some((b) => x > b.x - 12 && x < b.x + b.w + 12 && y > b.y - 12 && y < b.y + b.h + 12);
}

export function movePlayer(g, dx, dy, dt, crouch) {
  const speed = crouch ? 76 : 144;
  for (const [ax, ay] of [[dx, 0], [0, dy]]) {
    const x = g.player.x + ax * speed * dt, y = g.player.y + ay * speed * dt;
    if (!blocked(x, y)) { g.player.x = x; g.player.y = y; }
  }
}

function moveGuard(guard, dt) {
  if (guard.target) {
    const dx = guard.target.x - guard.x, dy = guard.target.y - guard.y, d = Math.hypot(dx, dy);
    if (d < 10) guard.target = null;
    else { guard.angle = Math.atan2(dy, dx); guard.x += dx / d * guard.speed * 1.25 * dt; guard.y += dy / d * guard.speed * 1.25 * dt; }
    return;
  }
  const [x, y] = guard.path[guard.index], dx = x - guard.x, dy = y - guard.y, d = Math.hypot(dx, dy);
  if (d < 4) guard.index = (guard.index + 1) % guard.path.length;
  else { guard.angle = Math.atan2(dy, dx); guard.x += dx / d * guard.speed * dt; guard.y += dy / d * guard.speed * dt; }
}

export function updateWorld(g, dt) {
  if (g.ended) return;
  dt = Math.min(dt, .05);
  g.time += dt;
  for (const guard of g.guards) moveGuard(guard, dt);
  if (g.decoy && (g.decoy.life -= dt) <= 0) g.decoy = null;
  if (g.smokeCloud && (g.smokeCloud.life -= dt) <= 0) g.smokeCloud = null;

  const p = g.player, smoke = g.smokeCloud;
  const visible = (!smoke && canSee(g.camera, p, 246, .42))
    || g.guards.some((a) => !(smoke && Math.hypot(a.x - smoke.x, a.y - smoke.y) < 135) && canSee(a, p, 204, .58));
  const sprintSeen = g.running && !g.crouch && g.guards.some((a) => Math.hypot(a.x - p.x, a.y - p.y) < 108 && clearLine(a.x, a.y, p.x, p.y));
  if (g.decoy) for (const a of g.guards) if (!a.target && Math.hypot(a.x - g.decoy.x, a.y - g.decoy.y) < 250) a.target = { x: g.decoy.x, y: g.decoy.y };
  if (visible || sprintSeen) g.exposure = Math.min(100, g.exposure + (g.crouch ? 20 : 34) * dt);
  else g.exposure = Math.max(0, g.exposure - 11 * dt);
  if (g.exposure >= 100) { g.ended = 'caught'; g.hint = 'The gallery locks down. One more clean run?'; }
  else g.camera.angle = .5 + Math.sin(g.time * .56) * .78;
}

export function useCoin(g, x, y) {
  if (!g.coins || g.ended || !Number.isFinite(x) || !Number.isFinite(y)) return false;
  g.coins--;
  g.decoy = { x: Math.max(48, Math.min(MAP.w - 48, x)), y: Math.max(48, Math.min(MAP.h - 48, y)), life: 7 };
  return true;
}

export function useSmoke(g) {
  if (!g.smoke || g.ended) return false;
  g.smoke--;
  g.smokeCloud = { x: g.player.x, y: g.player.y, life: 5.5 };
  g.exposure = Math.max(0, g.exposure - 24);
  return true;
}

export function interact(g) {
  if (g.ended) return 'none';
  if (!g.loot && Math.hypot(g.player.x - RELIC.x, g.player.y - RELIC.y) < 56) {
    g.loot = true;
    g.exposure = Math.max(0, g.exposure - 10);
    g.hint = 'Relic secured. The east service door is your way out.';
    return 'loot';
  }
  if (g.loot && Math.hypot(g.player.x - EXIT.x, g.player.y - EXIT.y) < 62) {
    g.ended = 'escaped';
    g.hint = 'Clean work. The city will never know.';
    return 'escape';
  }
  return 'none';
}

export function selfCheck() {
  const g = createWorld();
  movePlayer(g, 1, 0, 1, false);
  if (g.player.x <= 78 || g.player.x > MAP.w) throw new Error('movement check failed');
  if (!useCoin(g, 400, 300) || g.coins !== 1 || useCoin(g, 400, 300) !== true) throw new Error('decoy check failed');
  if (!useSmoke(g) || g.smoke !== 0 || useSmoke(g)) throw new Error('smoke check failed');
  g.player = { ...RELIC };
  if (interact(g) !== 'loot' || !g.loot) throw new Error('relic interaction check failed');
  g.player = { ...EXIT };
  if (interact(g) !== 'escape' || g.ended !== 'escaped') throw new Error('escape check failed');
  const caught = createWorld();
  caught.player = { x: caught.camera.x, y: caught.camera.y + 96 };
  caught.exposure = 99.9;
  caught.camera.angle = Math.atan2(caught.player.y - caught.camera.y, caught.player.x - caught.camera.x);
  updateWorld(caught, .05);
  if (caught.ended !== 'caught') throw new Error('detection check failed');
  return 'heist logic checks passed';
}
