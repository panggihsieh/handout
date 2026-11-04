import { verifyAndSeal, openSettings } from './vault.js';
import { convertQuestion, testConnection, probeConnection, usesLocalBackend, solveQuestion, generateVariant } from './api-client.js?v=20261104-geometry';
const $ = id => document.getElementById(id);
const presets = { openai: 'gpt-4.1', gemini: 'gemini-2.5-flash', deepseek: 'deepseek-flash', qwen: 'qwen3-vl-plus' };
const prefix = 'handout-api-vault-v1:';
const lastProviderKey = 'handout-api-last-provider';
function rememberProvider(provider) { try { localStorage.setItem(lastProviderKey, provider); } catch {} }
let active = null;
let revision = 0;
let connectionRequest = 0, connectionState = 'locked';
let reconnecting = null;
const monitorInterval = 60000;
let monitorEnabled = false, monitorTimer = null, monitorEpoch = 0, monitorRunning = false, monitorFailures = 0;
const parentOrigins = new Set([location.origin, 'http://127.0.0.1:5173', 'http://localhost:5173', 'http://127.0.0.1:5184', 'http://localhost:5184']);
let parentOrigin;
try { parentOrigin = new URL(document.referrer || location.href).origin; } catch {}
function connectionChanged(state) {
  connectionState = navigator.onLine === false ? 'offline' : state;
  if (parent !== window && parentOrigins.has(parentOrigin)) parent.postMessage({ type: 'handout-ai-connection', state: connectionState }, parentOrigin);
}
async function withConnectionStatus(action, successState = 'connected') {
  const current = revision, request = ++connectionRequest;
  connectionChanged('checking');
  try {
    const result = await action();
    if (current === revision && request === connectionRequest) connectionChanged(successState);
    return result;
  } catch (error) {
    if (current === revision && request === connectionRequest) connectionChanged('error');
    throw error;
  }
}
function publishMonitor() {
  $('unlockApiSettings').textContent = monitorEnabled ? '解鎖並輕量驗證（省 token）' : '解鎖並連線（少量計費）';
  if (parent !== window && parentOrigins.has(parentOrigin)) parent.postMessage({ type: 'handout-ai-monitor', enabled: monitorEnabled, waitingForUnlock: monitorEnabled && !active }, parentOrigin);
}
function stopMonitor() {
  monitorEnabled = false; monitorEpoch++; clearTimeout(monitorTimer); monitorTimer = null; monitorFailures = 0; publishMonitor();
}
function scheduleMonitor(delay = monitorInterval) {
  clearTimeout(monitorTimer);
  if (monitorEnabled && active) monitorTimer = setTimeout(runMonitor, delay);
}
async function runMonitor() {
  clearTimeout(monitorTimer); monitorTimer = null;
  if (!monitorEnabled || !active) return;
  if (monitorRunning || connectionState === 'checking' || navigator.onLine === false) { scheduleMonitor(); return; }
  const epoch = monitorEpoch;
  monitorRunning = true;
  try {
    await withConnectionStatus(() => probeConnection({ ...active }), 'verified');
    if (epoch === monitorEpoch) { monitorFailures = 0; report('持續輕量檢查成功：僅查詢模型資訊，不產生對話 token。'); }
  } catch (error) {
    if (epoch === monitorEpoch) { monitorFailures++; report(error.message); }
  } finally {
    monitorRunning = false;
    if (epoch === monitorEpoch) scheduleMonitor(Math.min(monitorInterval * 2 ** monitorFailures, 600000));
  }
}
async function toggleMonitor() {
  if (monitorEnabled) { stopMonitor(); return; }
  monitorEnabled = true; monitorEpoch++; monitorFailures = 0; publishMonitor();
  if (!active) { openConnectionSettings(); return; }
  await runMonitor();
}
function openConnectionSettings() {
  if (parent !== window && parentOrigins.has(parentOrigin)) parent.postMessage({ type: 'handout-ai-open-settings' }, parentOrigin);
}
function focusConnectionSettings() {
  let saved = false;
  try { saved = !!localStorage.getItem(recordName()); } catch {}
  const field = $(saved ? 'vaultPassword' : 'apiKey');
  field.closest('details').open = true;
  field.scrollIntoView({ block: 'center' }); field.focus();
}
async function reconnectAi() {
  if (reconnecting === revision) return;
  if (!active) { connectionChanged('locked'); openConnectionSettings(); return; }
  if (navigator.onLine === false) { connectionChanged('offline'); report('目前網路離線，恢復連線後可再按連線按鈕。'); return; }
  const settings = { ...active }, current = revision;
  reconnecting = current; report('正在測試連線（少量計費）…');
  try {
    await withConnectionStatus(() => testConnection(settings));
    if (current === revision) report('連線成功，可使用 AI 轉換與解答。');
  } catch (error) {
    if (current === revision) { report('已解鎖，但連線失敗：' + (error.safeMessage || error.message)); openConnectionSettings(); }
  } finally { if (reconnecting === current) reconnecting = null; }
}
window.addEventListener('message', async event => {
  if (event.source !== parent || parent === window || !parentOrigins.has(event.origin)) return;
  if (!['handout-ai-connection-query', 'handout-ai-connect', 'handout-ai-focus-settings', 'handout-ai-monitor-toggle'].includes(event.data?.type)) return;
  parentOrigin = event.origin;
  if (event.data.type === 'handout-ai-connection-query') { connectionChanged(connectionState); publishMonitor(); }
  else if (event.data.type === 'handout-ai-monitor-toggle') await toggleMonitor();
  else if (event.data.type === 'handout-ai-focus-settings') focusConnectionSettings();
  else if (monitorEnabled) { if (active) await runMonitor(); else openConnectionSettings(); }
  else await reconnectAi();
});
window.addEventListener('offline', () => connectionChanged('offline'));
window.addEventListener('online', () => { connectionChanged(active ? 'ready' : 'locked'); scheduleMonitor(0); });
const report = message => $('apiStatus').textContent = message;
const recordName = () => prefix + $('apiProvider').value;
function settingsFromForm() {
  const provider = $('apiProvider').value;
  const apiKey = $('apiKey').value.trim() || (active?.provider === provider ? active.apiKey : '');
  if (!apiKey) throw Error('請輸入 API Key，或輸入解鎖密碼後解鎖。');
  return { provider, apiKey, model: $('apiModel').value.trim() || presets[provider], baseURL: provider === 'qwen' ? $('apiBaseURL').value.trim() : '' };
}
function clearSecrets() { stopMonitor(); revision++; active = null; $('apiKey').value = ''; $('vaultPassword').value = ''; connectionChanged('locked'); }
window.getMathApiSettings = () => {
  if (!active) throw Error('請先貼上金鑰並測試加密儲存，或解鎖已儲存設定。');
  return { ...active };
};
function providerChanged() {
  clearSecrets(); $('apiKey').placeholder = '貼上新的 API Key（僅供覆蓋設定）'; $('apiModel').value = presets[$('apiProvider').value];
  $('qwenEndpointField').hidden = $('apiProvider').value !== 'qwen';
  try { report(localStorage.getItem(recordName()) ? '已儲存加密設定，請輸入密碼解鎖。' : '尚未設定。請貼上金鑰及解鎖密碼，再測試並加密儲存。'); }
  catch { report('瀏覽器不允許儲存，請先允許此網站的本機儲存。'); }
}
$('apiProvider').addEventListener('change', providerChanged);
$('unlockApiSettings').addEventListener('click', async () => {
  const button = $('unlockApiSettings'); button.disabled = true; const current = ++revision;
  active = null; connectionChanged('locked');
  try {
    const provider = $('apiProvider').value;
    const raw = localStorage.getItem(recordName()); if (!raw) throw Error('此供應商沒有已儲存設定。');
    const settings = await openSettings(JSON.parse(raw), $('vaultPassword').value);
    if (current !== revision) return;
    if (settings.provider !== provider || !settings.apiKey || !settings.model) throw Error('儲存內容不正確。');
    active = settings; $('apiModel').value = settings.model;
    rememberProvider(provider);
    connectionChanged('ready');
    if (provider === 'qwen') $('apiBaseURL').value = settings.baseURL;
    $('apiKey').value = ''; $('vaultPassword').value = '';
    if (monitorEnabled) { publishMonitor(); await runMonitor(); } else await reconnectAi();
  } catch (error) { if(current===revision){active = null; connectionChanged('locked'); report(error.message);} } finally { $('vaultPassword').value = ''; button.disabled = false; }
});
$('lockApiSettings').addEventListener('click', () => { clearSecrets(); report('已鎖定並清除本分頁中的金鑰。'); });
$('deleteApiSettings').addEventListener('click', () => {
  try { localStorage.removeItem(recordName()); clearSecrets(); report('此供應商的加密設定已刪除。'); } catch (error) { report(error.message); }
});
$('testApiSettings').addEventListener('click', async () => {
  const button = $('testApiSettings'); button.disabled = true; let current;
  try {
    if (!$('apiKey').value.trim()) throw Error('請重新貼上金鑰；已儲存的金鑰不會再次顯示。');
    const settings = settingsFromForm(), password = $('vaultPassword').value, name = recordName(); current = ++revision;
    if (password.length < 8) throw Error('請先輸入至少 8 個字元的解鎖密碼。');
    report('正在測試連線；成功後將加密儲存並清空金鑰欄位…');
    connectionChanged('checking');
    const record = await verifyAndSeal(settings, password, async () => {
      await testConnection(settings);
    });
    if (current !== revision) return;
    localStorage.setItem(name, JSON.stringify(record));
    active = settings; $('apiKey').value = ''; $('vaultPassword').value = '';
    rememberProvider(settings.provider);
    connectionChanged('connected');
    $('apiKey').placeholder = '已加密；如需更換請重新貼上金鑰';
    report('連線測試成功，已加密儲存並啟用。金鑰不再顯示；如需更換請重新貼上並測試。');
    if (monitorEnabled) { publishMonitor(); scheduleMonitor(); }
  } catch (error) { if(current===undefined||current===revision){connectionChanged('error'); report(error.message + '（未覆蓋原有加密設定）');} }
  finally { button.disabled = false; }
});
try {
  const previous = localStorage.getItem(lastProviderKey);
  const saved = Object.keys(presets).filter(provider => localStorage.getItem(prefix + provider));
  if (Object.hasOwn(presets, previous) && localStorage.getItem(prefix + previous)) $('apiProvider').value = previous;
  else if (saved.length === 1) $('apiProvider').value = saved[0];
} catch {}
providerChanged();

window.convertMathQuestion = (...args) => withConnectionStatus(() => convertQuestion(...args));
window.generateMathVariant = (...args) => withConnectionStatus(() => generateVariant(...args));
$('apiMode').textContent = usesLocalBackend ? '本機模式：由本機服務代送 API 請求。' : '線上模式：瀏覽器直接向供應商送出請求；需供應商允許跨來源連線（CORS）。金鑰僅在解鎖後於記憶體中使用。';

if (usesLocalBackend) $("caseComparisonLink").href = "http://127.0.0.1:5184/tests/four-images.html";

// 金鑰只留在模組內；父頁僅收到解答。
window.addEventListener('message',async event=>{
  const allowed=parentOrigins;
  if(event.source!==parent||parent===window||!allowed.has(event.origin)||event.data?.type!=='handout-solve')return;
  const {id,question}=event.data;
  if(typeof id!=='string'||id.length>100)return;
  try{
    const settings=window.getMathApiSettings();
    if(!question||(typeof question.text!=='string')||question.text.length>50000||(question.image&&(!/^data:image\/(png|jpeg|webp);base64,/.test(question.image)||question.image.length>10*1024*1024)))throw Error('題目資料不符合限制。');
    const result=await withConnectionStatus(() => solveQuestion(settings,question));
    event.source.postMessage({type:'handout-solved',id,result},event.origin);
  }catch(error){event.source.postMessage({type:'handout-solved',id,error:error.safeMessage||error.message||'AI 解答失敗'},event.origin);}
});
