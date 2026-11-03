// 密碼不落地；只有 salt、IV 與 AES-GCM 密文可寫入瀏覽器儲存空間。
const iterations = 310000;
const encoder = new TextEncoder();
const encode = bytes => btoa(String.fromCharCode(...bytes));
const decode = text => Uint8Array.from(atob(text), c => c.charCodeAt(0));
async function derive(password, salt, usage) {
  const material = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations, hash: 'SHA-256' }, material, { name: 'AES-GCM', length: 256 }, false, [usage]);
}
export async function sealSettings(settings, password) {
  if (password.length < 8) throw Error('解鎖密碼至少需要 8 個字元。');
  const salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await derive(password, salt, 'encrypt');
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: encoder.encode('handout-api-v1') }, key, encoder.encode(JSON.stringify(settings)));
  return { version: 1, salt: encode(salt), iv: encode(iv), ciphertext: encode(new Uint8Array(ciphertext)) };
}
export async function openSettings(record, password) {
  if (record?.version !== 1) throw Error('儲存格式不支援。');
  try {
    const salt = decode(record.salt), iv = decode(record.iv);
    if (salt.length !== 16 || iv.length !== 12) throw Error();
    const key = await derive(password, salt, 'decrypt');
    const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv, additionalData: encoder.encode('handout-api-v1') }, key, decode(record.ciphertext));
    return JSON.parse(new TextDecoder().decode(plaintext));
  } catch { throw Error('解鎖失敗：密碼錯誤或儲存資料已損壞。'); }
}

// 測試失敗絕不產生可供覆蓋的加密紀錄；密碼條件先檢查，避免無效的付費測試。
export async function verifyAndSeal(settings, password, verify) {
  if (password.length < 8) throw Error('解鎖密碼至少需要 8 個字元。');
  await verify();
  return sealSettings(settings, password);
}
