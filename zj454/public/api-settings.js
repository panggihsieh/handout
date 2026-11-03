import { verifyAndSeal, openSettings } from './vault.js';
import { convertQuestion, testConnection, usesLocalBackend } from './api-client.js';
const $ = id => document.getElementById(id);
const presets = { openai: 'gpt-4.1', gemini: 'gemini-2.5-flash', deepseek: 'deepseek-flash', qwen: 'qwen3-vl-plus' };
const prefix = 'handout-api-vault-v1:';
let active = null;
let revision = 0;
const report = message => $('apiStatus').textContent = message;
const recordName = () => prefix + $('apiProvider').value;
function settingsFromForm() {
  const provider = $('apiProvider').value;
  const apiKey = $('apiKey').value.trim() || (active?.provider === provider ? active.apiKey : '');
  if (!apiKey) throw Error('請輸入 API Key，或輸入解鎖密碼後解鎖。');
  return { provider, apiKey, model: $('apiModel').value.trim() || presets[provider], baseURL: provider === 'qwen' ? $('apiBaseURL').value.trim() : '' };
}
function clearSecrets() { revision++; active = null; $('apiKey').value = ''; $('vaultPassword').value = ''; }
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
  const button = $('unlockApiSettings'); button.disabled = true;
  try {
    const provider = $('apiProvider').value, current = ++revision;
    const raw = localStorage.getItem(recordName()); if (!raw) throw Error('此供應商沒有已儲存設定。');
    const settings = await openSettings(JSON.parse(raw), $('vaultPassword').value);
    if (current !== revision) return;
    if (settings.provider !== provider || !settings.apiKey || !settings.model) throw Error('儲存內容不正確。');
    active = settings; $('apiModel').value = settings.model;
    if (provider === 'qwen') $('apiBaseURL').value = settings.baseURL;
    $('apiKey').value = ''; $('vaultPassword').value = ''; report('已解鎖，可使用 AI 轉換。');
  } catch (error) { active = null; report(error.message); } finally { $('vaultPassword').value = ''; button.disabled = false; }
});
$('lockApiSettings').addEventListener('click', () => { clearSecrets(); report('已鎖定並清除本分頁中的金鑰。'); });
$('deleteApiSettings').addEventListener('click', () => {
  try { localStorage.removeItem(recordName()); clearSecrets(); report('此供應商的加密設定已刪除。'); } catch (error) { report(error.message); }
});
$('testApiSettings').addEventListener('click', async () => {
  const button = $('testApiSettings'); button.disabled = true;
  try {
    if (!$('apiKey').value.trim()) throw Error('請重新貼上金鑰；已儲存的金鑰不會再次顯示。');
    const settings = settingsFromForm(), password = $('vaultPassword').value, name = recordName(), current = ++revision;
    if (password.length < 8) throw Error('請先輸入至少 8 個字元的解鎖密碼。');
    report('正在測試連線；成功後將加密儲存並清空金鑰欄位…');
    const record = await verifyAndSeal(settings, password, async () => {
      await testConnection(settings);
    });
    if (current !== revision) return;
    localStorage.setItem(name, JSON.stringify(record));
    active = settings; $('apiKey').value = ''; $('vaultPassword').value = '';
    $('apiKey').placeholder = '已加密；如需更換請重新貼上金鑰';
    report('連線測試成功，已加密儲存並啟用。金鑰不再顯示；如需更換請重新貼上並測試。');
  } catch (error) { report(error.message + '（未覆蓋原有加密設定）'); }
  finally { button.disabled = false; }
});
providerChanged();

window.convertMathQuestion = convertQuestion;
$('apiMode').textContent = usesLocalBackend ? '本機模式：由本機服務代送 API 請求。' : '線上模式：瀏覽器直接向供應商送出請求；需供應商允許跨來源連線（CORS）。金鑰僅在解鎖後於記憶體中使用。';

if (usesLocalBackend) $("caseComparisonLink").href = "http://127.0.0.1:5184/tests/four-images.html";
