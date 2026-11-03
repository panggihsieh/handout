# v4 API 設定與加密儲存（2026/11/03）

## 供應商確認結果

此處「文件確認」僅表示官方文件具備對應介面，不表示本專案已以真實金鑰、實際帳號額度或所有區域測試成功。

| 供應商 | 本版處理 | 預設模型 | 官方依據 |
| --- | --- | --- | --- |
| OpenAI | Chat Completions 圖片輸入、JSON Schema；可設定 | gpt-4.1 | https://developers.openai.com/api/docs/guides/structured-outputs |
| Gemini | 原生 generateContent、inlineData 圖片、JSON MIME；可設定 | gemini-2.5-flash | https://ai.google.dev/gemini-api/docs/image-understanding |
| DeepSeek | Chat Completions 圖片輸入、JSON Output；可設定 | deepseek-flash | https://api-docs.deepseek.com/guides/vision/ 、 https://api-docs.deepseek.com/guides/json_mode/ |
| Qwen | OpenAI 相容圖片輸入、JSON Object；可設定 | qwen3-vl-plus | https://www.alibabacloud.com/help/en/model-studio/vision |
| MiniMax | 尚未接入；選項停用，避免誤認可直接使用 | — | https://platform.minimax.io/docs/guides/token-plan-mcp-guide |

MiniMax 官方提供 understand_image MCP 工具，但需要獨立流程；本版未實作該 MCP。Qwen 預設使用既有新加坡端點；新帳號如要求 Workspace 端點，可輸入官方 `https://{WorkspaceId}.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1`，也允許官方其他已列區域。金鑰須符合帳號的模型權限與區域。沒有實際金鑰，無法承諾上述預設模型在使用者帳號皆可呼叫。

## 使用方式

1. 啟動 v4 的 5184 與 zj454 的 5185 本機服務。
2. 在 v4 按「JSON 轉換與預覽」，展開「API 設定與加密儲存」。
3. 選供應商，確認模型，輸入自己的金鑰。
4. 輸入至少八個字元的解鎖密碼，按「測試成功後加密儲存」。僅在連線測試成功後加密保存、啟用並清空金鑰欄位；失敗不覆蓋舊設定。
5. 「測試成功後加密儲存」會向供應商發出少量文字請求，可能計費，只證明連線及模型存取，不證明圖片辨識品質。
6. 貼入截圖後按「AI 轉換 JSON」，會把題文與截圖傳給選定供應商並可能計費；產生結果仍需人工核對。
7. 已儲存的金鑰沒有顯示或複製功能；解鎖僅供程式使用，不填回金鑰欄位。更換金鑰必須重新貼上並重新測試。可隨時鎖定，或刪除目前供應商的設定。重新整理後需重新解鎖，忘記密碼須刪除後重建。

## 儲存設計

- 使用 Web Crypto：PBKDF2-SHA256（310,000 次）、隨機 16-byte salt、AES-256-GCM、每次隨機 12-byte IV。
- 每家供應商各自保存加密紀錄；localStorage 僅含版本、salt、IV、密文，不保存明文金鑰或解鎖密碼。
- 解鎖後設定只放在分頁記憶體；鎖定、切換供應商或重新整理會清除使用中的金鑰。
- 所有設定屬於模組的來源網址，例如 `http://127.0.0.1:5185`；換瀏覽器、連接埠或改用 localhost 不會自動共用。
- 不使用 .env 儲存使用者從介面輸入的金鑰，也不寫入伺服器檔案、不加入 GitHub。
- 本機後端接收單次請求中的明文金鑰，僅代送至固定官方端點；Qwen 可調端點限定官方主機，拒絕重新導向。
- 後端檢查 Host、Origin、JSON Content-Type，不回傳或記錄供應商原始錯誤中的金鑰或圖片。
- 此設計用於本機單人版。加密只保護儲存資料，不能阻止解鎖時的惡意網頁腳本或遭入侵的瀏覽器；不是公開多使用者服務的金鑰管理方案。

## 驗證

- `node tests/api-settings.test.mjs`：四家請求格式與模擬回覆、HTTP 錯誤遮罩、截斷拒絕、端點限制、密文不含金鑰、加解密、錯誤密碼與竄改偵測通過。
- API 防護實測：惡意 Origin 回傳 403；不支援供應商或非官方 Qwen 端點回傳 400，未對外發出請求。
- 早期介面以假金鑰實測加密儲存、鎖定、重新載入、錯誤密碼拒絕、正確密碼解鎖與刪除：通過；假金鑰已刪除。最終版改為成功連線才加密；透過模擬 verify callback 驗證成功才加密、失敗不回傳覆蓋紀錄、密碼過短不發出連線。未使用假金鑰對外發出測試請求。
- v4 彈窗顯示設定介面：已確認。
- 真實供應商連線與圖片轉換：尚未實測，需使用者自行輸入有效金鑰後驗證。

## GitHub Pages 靜態模式

線上 v4 彈窗使用同站靜態模組；API adapter 與 schema 和本機後端共用。線上模式沒有本機代理，使用瀏覽器 fetch 直接呼叫官方供應商；是否成功取決於供應商 CORS、金鑰權限與區域，尚未以真實金鑰測試。錯誤時會說明可改用本機後端。密文儲存在 GitHub Pages 網站來源的 localStorage，與 localhost 的紀錄分開；不會提交或上傳到 GitHub。加密成功後不再顯示金鑰的規則保持不變。
