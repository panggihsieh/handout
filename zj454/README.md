# 數學題目 JSON 自動轉換與渲染模組

這是獨立原型，尚未整合到原本的 `v4/index.html`。AI 產生之題目必須人工核對。需要 Node.js 20+ 和網路連線（瀏覽器會載入 KaTeX、DOMPurify 的 CDN 資源）。

## Windows 11 解壓縮

1. 下載 `zj454.zip` 到「下載」資料夾。
2. 在檔案總管對 ZIP 按右鍵 → **全部解壓縮**。
3. 先選擇暫存目的地，例如 `K:\CODEX\handout`，並留意是否出現雙層 `zj454\zj454`。
4. 正確放置後應有 `K:\CODEX\handout\zj454\package.json`、`server.mjs` 與 `public\index.html`。
5. 解壓縮路徑只是示例；若實際 Codex 專案在別處，請換成實際資料夾。

## 執行

1. 開啟 PowerShell，輸入 `cd K:\CODEX\handout\zj454`（需自行替換路徑）。
2. 執行 `npm install`。
3. 複製 `.env.example` 成 `.env`，填寫有效的 `OPENAI_API_KEY`。
4. 執行 `npm run dev`。
5. 在瀏覽器開啟 `http://127.0.0.1:5185`。

未設定 API Key 時，「AI 轉換」不能使用，但直接貼入 JSON 再按「渲染 JSON」仍可測試（需網路載入前端套件）。API 呼叫另計費。

## 安全注意

- `.env` 已列入 `.gitignore`，絕不要提交私密 API Key。
- 此範例只監聽本機 127.0.0.1；部署到公開網站時，需要額外做認證、速率限制和安全驗證。
- JSON 合法不代表數學內容一定正確。請教師人工檢查題文與圖形。
- 本示範為完整原型，但不保證已與既有練習簿程式相容；整合任務請見 `CODEX-INTEGRATION.md`。

## 本專案新增功能

- 在頁面按 Ctrl+V 可貼上 PNG、JPEG 或 WebP 截圖（上限 7 MB）。
- 「載入測試題」可在未設定 API Key 時驗證文字、LaTeX、SVG 渲染。
- 「彈跳預覽」開啟題目對話框，可用關閉按鈕或 Esc 返回。
- 這是獨立模組，執行目錄為 `K:\CODEX\handout\zj454`，不修改 v4 練習簿。
- 不會自動讀取其他專案的 API Key；請自行設定此目錄內的 `.env`。
