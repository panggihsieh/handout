import assert from 'node:assert/strict';
import { probeProviderConnection } from '../zj454/public/connection-probe.js';
import { normalizeSettings } from '../zj454/public/providers.js';

for (const provider of ['openai', 'gemini', 'deepseek', 'qwen']) {
  const settings = normalizeSettings({ provider, apiKey: 'test-secret' });
  const data = provider === 'gemini' ? { name: 'models/' + settings.model }
    : provider === 'qwen' ? { success: true, output: { models: [{ model: settings.model }] } }
      : { data: [{ id: settings.model }] };
  let requests = 0;
  await probeProviderConnection(settings, async (url, options) => {
    requests++;
    assert.equal(options.method, 'GET'); assert.equal(options.body, undefined);
    assert.equal(options.redirect, 'error'); assert.equal(options.cache, 'no-store');
    assert.ok(!url.includes('test-secret'));
    assert.ok(!/generateContent|completions|responses/.test(url));
    if (provider === 'qwen') assert.match(url, /\/api\/v1\/models\?model=/);
    if (provider === 'gemini') assert.equal(options.headers['x-goog-api-key'], 'test-secret');
    else assert.equal(options.headers.Authorization, 'Bearer test-secret');
    return { ok: true, json: async () => data };
  });
  assert.equal(requests, 1);
  await assert.rejects(probeProviderConnection(settings, async () => ({ ok: false, status: 403 })), /查詢權限/);
  await assert.rejects(probeProviderConnection(settings, async () => ({ ok: true, json: async () => ({ data: [] }) })), /未列出/);
  await assert.rejects(probeProviderConnection(settings, async () => { throw Error('secret: test-secret'); }), error => !error.message.includes('test-secret'));
}
let called = false;
await assert.rejects(probeProviderConnection({ provider: 'qwen', apiKey: 'x', baseURL: 'https://evil.test' }, async () => { called = true; }));
assert.equal(called, false);
console.log('Metadata-only connection probes for four providers: GET only, no generation fallback, trusted endpoints and redacted errors passed (mock only).');
