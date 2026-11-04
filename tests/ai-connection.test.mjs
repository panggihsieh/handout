import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../zj454/public/api-settings.js', import.meta.url), 'utf8').replace(/^import .*;\r?$/gm, '');
const elements = new Map(), listeners = new Map(), messages = [], storage = new Map();
function element(id) {
  if (!elements.has(id)) elements.set(id, { value: '', textContent: '', hidden: false, events: {}, addEventListener(type, fn) { this.events[type] = fn; } });
  return elements.get(id);
}
element('apiProvider').value = 'openai';
let apiCalls = 0, pendingConversion;
const fakeSettings = { provider: 'openai', apiKey: 'test-only-secret', model: 'fake-model' };
const context = vm.createContext({
  URL, location: { origin: 'https://example.test', href: 'https://example.test/module/' }, navigator: { onLine: true },
  document: { referrer: 'https://example.test/handout/', getElementById: element },
  window: { addEventListener(type, fn) { listeners.set(type, [...(listeners.get(type) || []), fn]); } },
  parent: { postMessage(message, origin) { messages.push({ message, origin }); } },
  localStorage: { getItem: name => storage.get(name), setItem: (name, value) => storage.set(name, value), removeItem: name => storage.delete(name) },
  usesLocalBackend: false,
  openSettings: async () => fakeSettings,
  verifyAndSeal: async (settings, password, verify) => { await verify(); return { ciphertext: 'encrypted-test' }; },
  testConnection: async () => { apiCalls++; },
  convertQuestion: async () => { apiCalls++; return pendingConversion ? pendingConversion : { blocks: [{ type: 'text', value: 'test' }] }; },
  generateVariant: async () => { apiCalls++; throw Error('simulated request failure'); },
  solveQuestion: async () => { apiCalls++; return { status: 'solved', answer: 'test' }; },
});
vm.runInContext(source, context);
const state = () => messages.filter(item => item.message.type === 'handout-ai-connection').at(-1)?.message.state;
const click = id => element(id).events.click();
assert.equal(state(), 'locked'); assert.equal(apiCalls, 0);
storage.set('handout-api-vault-v1:openai', '{}');
await click('unlockApiSettings');
assert.equal(state(), 'ready'); assert.equal(apiCalls, 0);
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
console.log('AI connection status: lock/unlock, verification, request results, stale responses, offline and secret-free trusted messages passed (mock only).');
