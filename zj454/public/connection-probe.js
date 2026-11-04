import { normalizeSettings } from './providers.js';

// Metadata requests only: never fall back to a generation endpoint.
export async function probeProviderConnection(settings, transport = fetch) {
  const config = normalizeSettings(settings);
  const headers = {};
  let url = config.baseURL + '/models';
  if (config.provider === 'gemini') {
    headers['x-goog-api-key'] = config.apiKey;
    url += '/' + encodeURIComponent(config.model);
  } else {
    headers.Authorization = 'Bearer ' + config.apiKey;
    if (config.provider === 'qwen') url = new URL('/api/v1/models?model=' + encodeURIComponent(config.model) + '&page_size=1', config.baseURL).href;
  }
  let response;
  try {
    response = await transport(url, { method: 'GET', headers, redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(15000) });
  } catch {
    throw Error('輕量檢查無法連線或逾時；可能是網路或供應商 CORS 限制，不會改用付費對話測試。');
  }
  if (!response.ok) {
    const reason = { 401: '金鑰無效或已失效', 403: '金鑰沒有模型查詢權限', 404: '模型或查詢端點不存在', 429: '請求過於頻繁，將稍後重試' }[response.status] || '供應商暫時無法完成查詢';
    throw Error('輕量檢查 HTTP ' + response.status + '：' + reason + '。');
  }
  let data;
  try { data = await response.json(); } catch { throw Error('供應商未傳回有效的模型資訊。'); }
  const found = config.provider === 'gemini'
    ? data.name === 'models/' + config.model
    : config.provider === 'qwen'
      ? data.success !== false && Array.isArray(data.output?.models) && data.output.models.some(item => item.model === config.model)
      : Array.isArray(data.data) && data.data.some(item => item.id === config.model);
  if (!found) throw Error('模型查詢未列出所選模型，請確認模型名稱或查詢權限；不會改用付費測試。');
  return { message: '輕量驗證成功：已取得模型資訊，未呼叫模型生成；不代表圖片辨識或額度一定可用。' };
}
