// Real-browser screenshot capture for game/, driving the game with keyboard input only.
// Node stdlib + headless Chrome over CDP. Usage: node tools/shots.mjs
import { spawn } from 'node:child_process';
import { createServer as httpServer } from 'node:http';
import { createServer as tcpServer } from 'node:net';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { extname, join, normalize, resolve, sep } from 'node:path';

const gameDir = resolve('game');
const outDir = resolve('screenshots');
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const MIME = { '.html': 'text/html; charset=utf-8', '.mjs': 'text/javascript', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.json': 'application/json' };

const server = httpServer(async (req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p.endsWith('/')) p += 'index.html';
  const file = resolve(join(gameDir, normalize(p)));
  if (!file.startsWith(gameDir + sep)) return res.writeHead(403).end();
  try {
    const body = await readFile(file);
    res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' }).end(body);
  } catch { res.writeHead(404).end('not found'); }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const url = `http://127.0.0.1:${server.address().port}/index.html`;

const probe = tcpServer();
await new Promise((r) => probe.listen(0, '127.0.0.1', r));
const debugPort = probe.address().port;
await new Promise((r) => probe.close(r));

const profile = join(process.env.LOCALAPPDATA ?? process.env.TEMP, `heist-shots-${Date.now()}`);
await mkdir(profile, { recursive: true });
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
  '--no-proxy-server', '--hide-scrollbars', `--remote-debugging-port=${debugPort}`,
  `--user-data-dir=${profile}`, '--window-size=1280,720', 'about:blank'], { stdio: 'ignore' });

let wsUrl;
for (let i = 0; i < 150; i++) {
  try { wsUrl = (await (await fetch(`http://127.0.0.1:${debugPort}/json/version`)).json()).webSocketDebuggerUrl; break; } catch {}
  await new Promise((r) => setTimeout(r, 100));
}
if (!wsUrl) throw new Error('chrome debug port never came up');

const ws = new WebSocket(wsUrl);
await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
let seq = 0;
const waiting = new Map();
ws.onmessage = (e) => {
  const msg = JSON.parse(e.data), slot = msg.id && waiting.get(msg.id);
  if (!slot) return;
  waiting.delete(msg.id);
  msg.error ? slot.rej(new Error(JSON.stringify(msg.error))) : slot.res(msg.result);
};
const send = (method, params = {}, sessionId) => new Promise((res, rej) => {
  const id = ++seq; waiting.set(id, { res, rej });
  ws.send(JSON.stringify({ id, method, params, sessionId }));
});

const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
const S = (m, p) => send(m, p, sessionId);
await S('Page.enable'); await S('Runtime.enable');
await S('Emulation.setDeviceMetricsOverride', { width: 1280, height: 720, deviceScaleFactor: 1, mobile: false });
await S('Page.navigate', { url });
await new Promise((r) => setTimeout(r, 1400));

const js = async (expr) => (await S('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true })).result.value;
const KEYS = { d: ['KeyD', 68], s: ['KeyS', 83], a: ['KeyA', 65], w: ['KeyW', 87], e: ['KeyE', 69], q: ['KeyQ', 81], shift: ['ShiftLeft', 16] };
async function hold(names, ms) {
  for (const n of names) await S('Input.dispatchKeyEvent', { type: 'keyDown', key: n === 'shift' ? 'Shift' : n, code: KEYS[n][0], windowsVirtualKeyCode: KEYS[n][1], nativeVirtualKeyCode: KEYS[n][1] });
  await new Promise((r) => setTimeout(r, ms));
  for (const n of names) await S('Input.dispatchKeyEvent', { type: 'keyUp', key: n === 'shift' ? 'Shift' : n, code: KEYS[n][0], windowsVirtualKeyCode: KEYS[n][1], nativeVirtualKeyCode: KEYS[n][1] });
  await new Promise((r) => setTimeout(r, 60));
}
const pos = () => js('(()=>{const p=window.__heist.game.player;return {x:p.x,y:p.y}})()');
const hud = () => js('JSON.stringify({heat:document.getElementById("heat-value").textContent,bar:document.getElementById("heat-fill").style.width,step:document.getElementById("objective-step").textContent})');
async function walkTo(tx, ty, budget = 40) {
  for (let i = 0; i < budget; i++) {
    const p = await pos();
    const dx = tx - p.x, dy = ty - p.y;
    if (Math.hypot(dx, dy) < 16) return p;
    const keys = [];
    if (Math.abs(dx) > 8) keys.push(dx > 0 ? 'd' : 'a');
    if (Math.abs(dy) > 8) keys.push(dy > 0 ? 's' : 'w');
    await hold(keys, 120);
  }
  return pos();
}
async function shot(name) {
  const { data } = await S('Page.captureScreenshot', { format: 'png' });
  const buf = Buffer.from(data, 'base64');
  await writeFile(join(outDir, name), buf);
  console.log(name, buf.length, 'bytes');
}

await mkdir(outDir, { recursive: true });
console.log('title:', await js('document.title'));

// 1. The gallery as it opens: thief at the entry, patrols, cones, camera, relic, alarm meter.
await shot('1-gallery.png');

// 2. Approach: walk up the west side and step into the open, so a cone catches the thief.
await walkTo(80, 280);
await walkTo(350, 280);
await new Promise((r) => setTimeout(r, 600));
console.log('scene 2', await pos(), await hud());
await shot('2-approach.png');

// 3. Take the moonstone and turn for the exit.
await walkTo(490, 306);
await hold(['e'], 80);
await walkTo(560, 400);
await new Promise((r) => setTimeout(r, 500));
console.log('scene 3', await pos(), await hud(), await js('window.__heist.game.loot'));
await shot('3-getaway.png');

ws.close(); chrome.kill(); server.close();
await new Promise((r) => setTimeout(r, 250));
process.exit(0);

