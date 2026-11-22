import { COVER, MAP } from './world.mjs';

const C = { ivory: '#e9e2cf', muted: '#858e84', teal: '#9bd3c2', amber: '#e8bd78', red: '#e98475' };
function label(ctx, text, x, y, size = 9, color = C.muted, spacing = 1) {
  ctx.fillStyle = color; ctx.font = `600 ${size}px ui-monospace,monospace`; ctx.letterSpacing = `${spacing}px`; ctx.fillText(text, x, y); ctx.letterSpacing = '0px';
}
function cone(ctx, x, y, angle, range, spread, color) {
  ctx.beginPath(); ctx.moveTo(x, y); ctx.arc(x, y, range, angle - spread, angle + spread); ctx.closePath(); ctx.fillStyle = color; ctx.fill();
}
function roundRect(ctx, x, y, w, h, r, fill, stroke) {
  ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.fillStyle = fill; ctx.fill();
  if (stroke) { ctx.strokeStyle = stroke; ctx.stroke(); }
}

export function draw(ctx, g, layout, now) {
  const { x: ox, y: oy, s } = layout, dpr = Math.min(devicePixelRatio || 1, 2);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, innerWidth, innerHeight);
  const wash = ctx.createLinearGradient(0, 0, innerWidth, innerHeight);
  wash.addColorStop(0, '#101716'); wash.addColorStop(1, '#1b1b17'); ctx.fillStyle = wash; ctx.fillRect(0, 0, innerWidth, innerHeight);
  ctx.save(); ctx.translate(ox, oy); ctx.scale(s, s);
  ctx.fillStyle = '#242723'; ctx.fillRect(0, 0, MAP.w, MAP.h);
  ctx.fillStyle = '#bca87508';
  for (let y = 0; y < MAP.h; y += 48) for (let x = (y / 48 % 2) * 24; x < MAP.w; x += 48) ctx.fillRect(x, y, 46, 46);
  ctx.strokeStyle = '#e5ddc20c'; ctx.lineWidth = 1;
  for (let x = 0; x <= MAP.w; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, MAP.h); ctx.stroke(); }
  for (let y = 0; y <= MAP.h; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(MAP.w, y); ctx.stroke(); }
  ctx.fillStyle = '#30332d'; ctx.fillRect(28, 34, 904, 532); ctx.strokeStyle = '#d4c6a24d'; ctx.lineWidth = 2; ctx.strokeRect(28, 34, 904, 532);
  ctx.strokeStyle = '#ffffff12'; ctx.strokeRect(38, 44, 884, 512);

  // Stained glass is a readable hazard: light reveals the open, coverless floor.
  ctx.fillStyle = '#9bd3c20d'; ctx.fillRect(430, 190, 150, 205); ctx.strokeStyle = '#9bd3c24a'; ctx.lineWidth = 2; ctx.strokeRect(430, 190, 150, 205);
  ctx.beginPath(); ctx.moveTo(430, 190); ctx.lineTo(580, 395); ctx.moveTo(580, 190); ctx.lineTo(430, 395); ctx.moveTo(505, 190); ctx.lineTo(505, 395); ctx.stroke();
  label(ctx, 'GLASS FLOOR / EXPOSED', 431, 180, 8, '#a9c9b8', .6);
  for (const [x, y, title] of [[91, 232, 'THE ORRERY'], [850, 338, 'BLUE HOUR'], [288, 488, 'TIDELINE']]) {
    roundRect(ctx, x - 37, y - 27, 74, 54, 2, '#1d211e', '#ffffff20');
    ctx.fillStyle = '#4b5146'; ctx.fillRect(x - 23, y - 16, 46, 32); ctx.fillStyle = '#bca87520'; ctx.fillRect(x - 17, y - 11, 34, 22);
    label(ctx, title, x - 33, y + 41, 7, '#929487', .4);
  }
  ctx.fillStyle = g.loot ? '#9bd3c22d' : '#ffffff09'; ctx.fillRect(860, 484, 70, 64);
  ctx.strokeStyle = g.loot ? C.teal : '#ffffff38'; ctx.strokeRect(860, 484, 70, 64); label(ctx, 'EXIT', 882, 520, 10, g.loot ? C.teal : '#9b9b89', 1.4);
  ctx.fillStyle = '#e8bd7812'; ctx.fillRect(28, 486, 83, 63); ctx.strokeStyle = '#e8bd7866'; ctx.strokeRect(28, 486, 83, 63); label(ctx, 'ENTRY', 45, 478, 8, C.amber, 1);

  const smoke = g.smokeCloud;
  for (const guard of g.guards) if (!(smoke && Math.hypot(guard.x - smoke.x, guard.y - smoke.y) < 135)) cone(ctx, guard.x, guard.y, guard.angle, 220, .48, '#e8bd7810');
  let light = '#e9847513';
  if (!smoke) cone(ctx, g.camera.x, g.camera.y, g.camera.angle, 246, .42, light);
  // Solid display plinths occlude the beams and sight lines beneath them.
  for (const b of COVER) {
    roundRect(ctx, b.x, b.y, b.w, b.h, 4, '#343830', '#71776c68');
    ctx.fillStyle = '#50564a'; ctx.fillRect(b.x + 5, b.y + 5, b.w - 10, 5); ctx.fillStyle = '#20231f'; ctx.fillRect(b.x + 8, b.y + 16, b.w - 16, b.h - 24);
    ctx.fillStyle = '#d9c79720'; ctx.fillRect(b.x + 12, b.y + 19, b.w - 24, 2);
  }

  // Relic and its circular interaction zone.
  ctx.beginPath(); ctx.ellipse(490, 306, 59, 51, 0, 0, Math.PI * 2); ctx.fillStyle = g.loot ? '#9bd3c209' : '#e8bd7814'; ctx.fill();
  ctx.strokeStyle = g.loot ? '#9bd3c258' : '#e8bd7866'; ctx.setLineDash([3, 6]); ctx.stroke(); ctx.setLineDash([]);
  roundRect(ctx, 466, 282, 48, 48, 2, '#3b3c34', '#89847265');
  if (!g.loot) {
    ctx.save(); ctx.shadowColor = C.teal; ctx.shadowBlur = 17; ctx.fillStyle = C.teal;
    ctx.beginPath(); ctx.moveTo(490, 285); ctx.lineTo(504, 305); ctx.lineTo(490, 326); ctx.lineTo(476, 305); ctx.closePath(); ctx.fill(); ctx.restore();
    ctx.fillStyle = '#f6edd5'; ctx.fillRect(488, 291, 4, 4);
  }
  label(ctx, g.loot ? 'EMPTY CASE / NO TRACE' : 'THE MOONSTONE', 445, 355, 8, g.loot ? C.teal : C.amber, .7);

  // Camera and patrols.
  roundRect(ctx, g.camera.x - 10, g.camera.y - 9, 20, 18, 3, '#77796b', '#c5bea378');
  ctx.fillStyle = C.red; ctx.beginPath(); ctx.arc(g.camera.x, g.camera.y, 2.7, 0, Math.PI * 2); ctx.fill(); label(ctx, 'CAM 01', g.camera.x + 14, g.camera.y + 4, 7, '#c1b7a4', .4);
  for (let i = 0; i < g.guards.length; i++) {
    const a = g.guards[i]; if (smoke && Math.hypot(a.x - smoke.x, a.y - smoke.y) < 135) continue;
    ctx.fillStyle = '#080a08a0'; ctx.beginPath(); ctx.ellipse(a.x, a.y + 8, 12, 6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = i === 1 ? '#a36c58' : '#927c5d'; ctx.beginPath(); ctx.arc(a.x, a.y, 8, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#292a25'; ctx.beginPath(); ctx.arc(a.x, a.y - 3, 7, Math.PI, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#e8d7b3'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(a.x + Math.cos(a.angle) * 5, a.y + Math.sin(a.angle) * 5); ctx.lineTo(a.x + Math.cos(a.angle) * 13, a.y + Math.sin(a.angle) * 13); ctx.stroke();
    if (a.target) { ctx.strokeStyle = '#e8bd7860'; ctx.setLineDash([2, 4]); ctx.beginPath(); ctx.arc(a.x, a.y, 16, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]); }
  }
  ctx.save(); ctx.translate(g.camera.x, g.camera.y); ctx.rotate(g.camera.angle); ctx.fillStyle = '#e9847528'; ctx.fillRect(9, -1, 42, 2); ctx.restore();
  if (g.decoy) {
    const pulse = 1 + Math.sin(now / 125) * .12; ctx.strokeStyle = C.amber; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(g.decoy.x, g.decoy.y, 9 * pulse, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = '#e8bd7840'; ctx.beginPath(); ctx.arc(g.decoy.x, g.decoy.y, 21 * pulse, 0, Math.PI * 2); ctx.stroke();
  }
  if (smoke) for (let i = 0; i < 7; i++) {
    const alpha = Math.min(1, smoke.life / 2); ctx.fillStyle = `rgba(164,179,162,${.14 * alpha})`;
    ctx.beginPath(); ctx.arc(smoke.x + Math.sin(now / 600 + i * 2.4) * (22 + i * 6), smoke.y + Math.cos(now / 710 + i * 2.1) * (19 + i * 6), 18 + i * 2, 0, Math.PI * 2); ctx.fill();
  }

  // Player silhouette, with a clear directional highlight and crouch ring.
  const p = g.player; ctx.fillStyle = '#0008'; ctx.beginPath(); ctx.ellipse(p.x, p.y + 8, 14, 6, 0, 0, Math.PI * 2); ctx.fill();
  ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(g.facing || 0);
  ctx.fillStyle = '#172329'; ctx.beginPath(); ctx.moveTo(-4, -5); ctx.lineTo(-14, 2); ctx.lineTo(-9, 12); ctx.lineTo(6, 9); ctx.lineTo(6, -5); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#262720'; ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#ded0b5'; ctx.beginPath(); ctx.arc(1, -2, 4.5, Math.PI, Math.PI * 2); ctx.fill(); ctx.fillStyle = C.teal; ctx.fillRect(4, -2, 5, 2); ctx.restore();
  if (g.crouch) { ctx.strokeStyle = '#9bd3c25f'; ctx.beginPath(); ctx.arc(p.x, p.y, 16, 0, Math.PI * 2); ctx.stroke(); }
  const near = !g.loot ? Math.hypot(p.x - 490, p.y - 306) < 72 : Math.hypot(p.x - 898, p.y - 516) < 76;
  if (near && !g.ended) {
    roundRect(ctx, 404, 66, 172, 22, 3, '#101716ed', '#9bd3c263');
    ctx.fillStyle = C.teal; ctx.font = '9px ui-monospace,monospace'; ctx.textAlign = 'center'; ctx.fillText(g.loot ? 'E  /  SLIP OUT' : 'E  /  TAKE THE MOONSTONE', 490, 81); ctx.textAlign = 'left';
  }
  ctx.restore();
}
