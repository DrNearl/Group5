const { spawn } = require("node:child_process");
const { mkdirSync, writeFileSync } = require("node:fs");
mkdirSync(".artifacts", { recursive: true });
const edge = spawn("C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", ["--headless=new", "--disable-gpu", "--no-first-run", "--no-default-browser-check", "--remote-debugging-port=9224", "--remote-allow-origins=*", `--user-data-dir=${process.cwd()}/.artifacts/edge-profile`, "about:blank"], { windowsHide: true, stdio: "ignore" });
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
(async () => {
  let target;
  for (let i = 0; i < 30; i++) {
    try { await fetch("http://127.0.0.1:9224/json/version"); target = await (await fetch("http://127.0.0.1:9224/json/new?about:blank", { method: "PUT" })).json(); break; }
    catch { await wait(300); }
  }
  if (!target) throw new Error("Không kết nối được Edge DevTools.");
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
  let seq = 0; const calls = new Map(); const events = new Map();
  ws.onmessage = ({ data }) => { const m = JSON.parse(data); if (calls.has(m.id)) { calls.get(m.id)(m); calls.delete(m.id); } if (m.method) for (const r of events.get(m.method) || []) r(m); };
  const send = (method, params = {}) => new Promise((resolve) => { const id = ++seq; calls.set(id, resolve); ws.send(JSON.stringify({ id, method, params })); });
  const once = (method) => new Promise((resolve) => { if (!events.has(method)) events.set(method, []); events.get(method).push(resolve); });
  const navigate = async () => { const loaded = once("Page.loadEventFired"); await send("Page.navigate", { url: "http://localhost:3001/absproxy/3000/students" }); await loaded; await wait(4000); };
  await send("Page.enable"); await send("Runtime.enable"); await navigate();
  const user = JSON.stringify({ id: "qa-admin", username: "admin", fullName: "Quản trị viên kiểm tra", email: "admin@vlu.edu.vn", role: "ADMIN" });
  await send("Runtime.evaluate", { expression: `localStorage.setItem('vlu_auth_user', ${JSON.stringify(user)})` }); await navigate();
  await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false }); await wait(800);
  const laptop = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true, fromSurface: true });
  writeFileSync(".artifacts/students-laptop.png", Buffer.from(laptop.result.data, "base64"));
  await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true }); await wait(800);
  const narrow = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true, fromSurface: true });
  writeFileSync(".artifacts/students-narrow.png", Buffer.from(narrow.result.data, "base64"));
  const pageText = await send("Runtime.evaluate", { expression: "document.body.innerText", returnByValue: true });
  console.log(pageText.result.result.value.slice(0, 1100)); ws.close();
})().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => edge.kill());
