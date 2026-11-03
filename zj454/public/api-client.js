import { solutionInstructions, solutionSchema, validateSolution, parseSolution } from './solution-spec.js?v=20261104-answer-colors';
import { normalizeSettings, callProvider } from './providers.js';
import { instructions, responseSchema } from './question-spec.js';
export const usesLocalBackend = ['127.0.0.1', 'localhost'].includes(location.hostname) && location.port === '5185';
async function backend(path, body) {
  const response = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const data = await response.json(); if (!response.ok) throw Error(data.error || 'API 請求失敗'); return data;
}
async function direct(settings, input) {
  try { return await callProvider(normalizeSettings(settings), input); }
  catch (error) {
    if (error.status === 502) throw Error('無法連接供應商：請檢查網路與 CORS 支援；也可改用本機版後端。');
    throw error;
  }
}
export async function testConnection(settings) {
  if (usesLocalBackend) return backend('/api/test', { settings });
  await direct(settings, { text: '請只回答 OK。', test: true });
  return { message: '連線與模型存取成功；截圖辨識品質請另外測試。' };
}
export async function convertQuestion(settings, { text, image }) {
  if (usesLocalBackend) return backend('/api/convert', { settings, text, image });
  if (!text?.trim() && !image) throw Error('請輸入題目文字或上傳圖片。');
  const output = await direct(settings, { text, image, instructions, schema: responseSchema });
  try { return JSON.parse(output); } catch { throw Error('模型沒有傳回有效 JSON，請重試。'); }
}

export async function solveQuestion(settings,{text,image}) {
  if(usesLocalBackend)return validateSolution(await backend('/api/solve',{settings,text,image}));
  const output=await direct(settings,{text,image,instructions:solutionInstructions,schema:solutionSchema});
  return parseSolution(output);
}
