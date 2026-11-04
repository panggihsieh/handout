import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../zj454/public/api-settings.js', import.meta.url), 'utf8').replace(/^import .*;\r?$/gm, '');
const elements = new Map(), listeners = new Map(), messages = [], storage = new Map();
const timers = new Map(); let timerId = 0, probeCalls = 0, probeFailure = false, pendingProbe;
function element(id) {
  if (!elements.has(id)) elements.set(id, { value: '', textContent: '', hidden: false, events: {}, details: {}, closest() { return this.details; }, scrollIntoView() {}, focus() { this.focused = true; }, addEventListener(type, fn) { this.events[type] = fn; } });
  return elements.get(id);
}
element('apiProvider').value = 'openai';
let apiCalls = 0, pendingConversion, connectionFailure = false, pendingConnection;
const fakeSettings = { provider: 'openai', apiKey: 'test-only-secret', model: 'fake-model' };
const context = vm.createContext({
  URL, location: { origin: 'https://example.test', href: 'https://example.test/module/' }, navigator: { onLine: true },
  document: { referrer: 'https://example.test/handout/', getElementById: element },
  window: { addEventListener(type, fn) { listeners.set(type, [...(listeners.get(type) || []), fn]); } },
  parent: { postMessage(message, origin) { messages.push({ message, origin }); } },
  localStorage: { getItem: name => storage.get(name), setItem: (name, value) => storage.set(name, value), removeItem: name => storage.delete(name) },
  usesLocalBackend: false,
  setTimeout(fn, delay) { timers.set(++timerId, { fn, delay }); return timerId; }, clearTimeout(id) { timers.delete(id); },
  probeConnection: async () => { probeCalls++; if (pendingProbe) await pendingProbe; if (probeFailure) throw Error('metadata probe failed'); },
  openSettings: async () => fakeSettings,
  verifyAndSeal: async (settings, password, verify) => { await verify(); return { ciphertext: 'encrypted-test' }; },
  testConnection: async () => { apiCalls++; if (connectionFailure) throw Error('simulated offline API'); if (pendingConnection) await pendingConnection; },
  convertQuestion: async () => { apiCalls++; return pendingConversion ? pendingConversion : { blocks: [{ type: 'text', value: 'test' }] }; },
  generateVariant: async () => { apiCalls++; throw Error('simulated request failure'); },
  solveQuestion: async () => { apiCalls++; return { status: 'solved', answer: 'test' }; },
});
vm.runInContext(source, context);
const state = () => messages.filter(item => item.message.type === 'handout-ai-connection').at(-1)?.message.state;
const click = id => element(id).events.click();
assert.equal(state(), 'locked'); assert.equal(apiCalls, 0);
const send = async type => { for (const fn of listeners.get('message')) await fn({ source: context.parent, origin: 'https://example.test', data: { type } }); };
await send('handout-ai-connect');
assert.equal(apiCalls, 0);
assert.equal(messages.at(-1).message.type, 'handout-ai-open-settings');
storage.set('handout-api-vault-v1:openai', '{}');
await send('handout-ai-focus-settings');
assert.equal(element('vaultPassword').focused, true);
await click('unlockApiSettings');
assert.equal(state(), 'connected'); assert.equal(apiCalls, 1);
assert.equal(storage.get('handout-api-last-provider'), 'openai');
await send('handout-ai-connect'); assert.equal(apiCalls, 2);
connectionFailure = true;
await send('handout-ai-connect'); assert.equal(state(), 'error');
assert.equal(context.window.getMathApiSettings().apiKey, fakeSettings.apiKey);
connectionFailure = false;
let finishConnect;
pendingConnection = new Promise(resolve => { finishConnect = resolve; });
const reconnect = send('handout-ai-connect'), beforeDuplicate = apiCalls;
await send('handout-ai-connect'); assert.equal(apiCalls, beforeDuplicate);
finishConnect(); await reconnect; pendingConnection = null;
assert.equal(state(), 'connected');
await context.window.convertMathQuestion();
assert.equal(state(), 'connected');
await assert.rejects(context.window.generateMathVariant(), /simulated/);
assert.equal(state(), 'error');
let resolveOld;
pendingConversion = new Promise(resolve => { resolveOld = resolve; });
const oldRequest = context.window.convertMathQuestion();
assert.equal(state(), 'checking');
click('lockApiSettings'); assert.equal(state(), 'locked');
resolveOld({ blocks: [] }); await oldRequest;
assert.equal(state(), 'locked');
context.navigator.onLine = false;
for (const fn of listeners.get('offline')) fn();
assert.equal(state(), 'offline');
context.navigator.onLine = true;
for (const fn of listeners.get('online')) fn();
assert.equal(state(), 'locked');
element('apiKey').value = fakeSettings.apiKey; element('vaultPassword').value = 'test-password';
await click('testApiSettings'); assert.equal(state(), 'connected');
const beforeQuery = messages.length;
for (const fn of listeners.get('message')) await fn({ source: context.parent, origin: 'https://evil.test', data: { type: 'handout-ai-connection-query' } });
assert.equal(messages.length, beforeQuery);
for (const fn of listeners.get('message')) await fn({ source: context.parent, origin: 'https://example.test', data: { type: 'handout-ai-connection-query' } });
assert.equal(state(), 'connected');
assert.ok(messages.every(item => item.origin === 'https://example.test'));
assert.ok(!JSON.stringify(messages).includes(fakeSettings.apiKey));
assert.ok(!JSON.stringify(messages).includes('test-password'));
const monitorState = () => messages.filter(item => item.message.type === 'handout-ai-monitor').at(-1)?.message;
const nextTick = async () => { const [id, timer] = timers.entries().next().value; timers.delete(id); await timer.fn(); };
const paidCallsBeforeMonitor = apiCalls;
await send('handout-ai-monitor-toggle');
assert.equal(monitorState().enabled, true); assert.equal(probeCalls, 1); assert.equal(state(), 'verified');
assert.equal([...timers.values()][0].delay, 60000);
await nextTick(); assert.equal(probeCalls, 2); assert.equal(apiCalls, paidCallsBeforeMonitor);
await send('handout-ai-connect'); assert.equal(probeCalls, 3); assert.equal(apiCalls, paidCallsBeforeMonitor); assert.equal(timers.size, 1);
probeFailure = true; await nextTick(); assert.equal(state(), 'error');
assert.equal([...timers.values()][0].delay, 120000);
probeFailure = false; await nextTick(); assert.equal(state(), 'verified');
assert.equal([...timers.values()][0].delay, 60000);
context.navigator.onLine = false;
for (const fn of listeners.get('offline')) fn();
const probesBeforeOffline = probeCalls; await nextTick(); assert.equal(probeCalls, probesBeforeOffline);
context.navigator.onLine = true;
for (const fn of listeners.get('online')) fn();
assert.equal([...timers.values()][0].delay, 0);
let finishProbe;
pendingProbe = new Promise(resolve => { finishProbe = resolve; });
const runningProbe = nextTick(); assert.equal(timers.size, 0);
await send('handout-ai-monitor-toggle'); assert.equal(monitorState().enabled, false);
finishProbe(); await runningProbe; pendingProbe = null;
assert.equal(timers.size, 0);
await send('handout-ai-monitor-toggle');
click('lockApiSettings'); assert.equal(monitorState().enabled, false); assert.equal(timers.size, 0);
await send('handout-ai-monitor-toggle'); assert.equal(monitorState().waitingForUnlock, true);
await click('unlockApiSettings'); assert.equal(state(), 'verified');
assert.equal(apiCalls, paidCallsBeforeMonitor);
click('lockApiSettings'); assert.equal(timers.size, 0);
console.log('Continuous metadata monitoring: no paid test calls, serial scheduling, backoff, offline pause, stop and lock cleanup passed.');
console.log('AI connection status: lock/unlock, verification, request results, stale responses, offline and secret-free trusted messages passed (mock only).');
