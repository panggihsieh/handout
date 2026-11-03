// 固定官方端點，金鑰只在單次請求記憶體中使用。
const defaults = {
  openai: { model: 'gpt-4.1', baseURL: 'https://api.openai.com/v1' },
  gemini: { model: 'gemini-2.5-flash', baseURL: 'https://generativelanguage.googleapis.com/v1beta' },
  deepseek: { model: 'deepseek-flash', baseURL: 'https://api.deepseek.com' },
  qwen: { model: 'qwen3-vl-plus', baseURL: 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1' },
};
function failure(message, status = 400) {
  const error = new Error(message); error.safeMessage = message; error.status = status; return error;
}
export function normalizeSettings(input) {
  const preset = input && Object.hasOwn(defaults, input.provider) ? defaults[input.provider] : null;
  if (!preset) throw failure('請選擇 OpenAI、Gemini、DeepSeek 或 Qwen 視覺模型。');
  if (typeof input.apiKey !== 'string' || !input.apiKey.trim() || input.apiKey.length > 1024 || /[\r\n]/.test(input.apiKey)) throw failure('請輸入或解鎖 API Key。');
  const model = input.model?.trim() || preset.model;
  if (!/^[a-zA-Z0-9._-]{1,120}$/.test(model)) throw failure('模型名稱格式不正確。');
  if (input.provider === 'deepseek' && model !== 'deepseek-flash') throw failure('DeepSeek 截圖模式請使用 deepseek-flash。');
  if (input.provider === 'qwen' && !/^(qwen(?:3(?:\.\d+)?-vl|2\.5-vl|3\.[5678])|qwen-vl)/.test(model)) throw failure('請選用 Qwen 視覺模型，例如 qwen3-vl-plus。');
  let baseURL = preset.baseURL;
  if (input.provider === 'qwen' && input.baseURL?.trim()) {
    baseURL = input.baseURL.trim().replace(/\/$/, '');
    if (!/^https:\/\/(?:dashscope(?:-intl|-us)?\.aliyuncs\.com|[a-zA-Z0-9-]+\.(?:ap-southeast-1|us-east-1|eu-central-1|cn-beijing)\.maas\.aliyuncs\.com)\/compatible-mode\/v1$/.test(baseURL)) throw failure('Qwen 網址必須是阿里雲官方 compatible-mode/v1 端點。');
  }
  return { provider: input.provider, apiKey: input.apiKey.trim(), model, baseURL };
}
export function buildRequest(config, { text, image, instructions, schema, test = false }) {
  const prompt = text?.trim() || '請忠實轉換圖片中的單一道數學題目，僅回傳 JSON。';
  const headers = { 'Content-Type': 'application/json' };
  if (config.provider === 'gemini') {
    headers['x-goog-api-key'] = config.apiKey;
    const parts = [{ text: prompt }];
    if (image) { const [mimeType, data] = image.slice(5).split(';base64,'); parts.push({ inlineData: { mimeType, data } }); }
    return { url: `${config.baseURL}/models/${config.model}:generateContent`, headers, body: {
      ...(instructions ? { systemInstruction: { parts: [{ text: instructions }] } } : {}),
      contents: [{ role: 'user', parts }],
      generationConfig: { maxOutputTokens: 16384, ...(!test ? { responseMimeType: 'application/json' } : {}) },
    } };
  }
  headers.Authorization = `Bearer ${config.apiKey}`;
  const content = [{ type: 'text', text: prompt }];
  if (image) content.push({ type: 'image_url', image_url: { url: image } });
  return { url: `${config.baseURL}/chat/completions`, headers, body: {
    model: config.model,
    messages: [...(instructions ? [{ role: 'system', content: instructions }] : []), { role: 'user', content }],
    max_tokens: test ? 32 : 16384,
    ...(config.provider === 'qwen' ? { enable_thinking: false } : {}),
    ...(!test ? { response_format: config.provider === 'openai' ? { type: 'json_schema', json_schema: { name: 'math_question', strict: true, schema } } : { type: 'json_object' } } : {}),
  } };
}
export async function callProvider(config, input, transport = fetch) {
  const request = buildRequest(config, input);
  let response;
  try {
    response = await transport(request.url, { method: 'POST', headers: request.headers, body: JSON.stringify(request.body), redirect: 'error', signal: AbortSignal.timeout(180000) });
  } catch { throw failure('API 連線逾時或網路失敗，請確認網路後重試。', 502); }
  if (!response.ok) {
    const reasons = { 401: '金鑰無效或已失效。', 403: '金鑰沒有模型權限或區域不符。', 404: '模型或官方端點不存在。', 429: '額度不足或請求過於頻繁。' };
    throw failure(`供應商回覆 HTTP ${response.status}：${reasons[response.status] || '請確認模型與請求參數。'}`, 422);
  }
  let data;
  try { data = await response.json(); } catch { throw failure('供應商回覆不是有效的 JSON。', 502); }
  let output;
  if (config.provider === 'gemini') {
    if (data.candidates?.[0]?.finishReason !== 'STOP') throw failure('模型輸出未完成或被阻擋，請檢查圖片或重試。', 422);
    output = data.candidates[0].content?.parts?.filter(part => !part.thought).map(part => part.text || '').join('');
  } else {
    if (data.choices?.[0]?.finish_reason !== 'stop') throw failure('模型輸出未完成或被阻擋，請重試。', 422);
    output = data.choices[0].message?.content;
  }
  if (typeof output !== 'string' || !output.trim()) throw failure('模型沒有傳回內容。', 422);
  return output;
}
