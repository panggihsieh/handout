# Math's Scrapbook v.4.0 (JSON/SVG/LaTeX rendering test)

## 複製排版至 Anytype 2026/11/04

在 JSON 模組的「③ 渲染預覽」按橘色「複製排版（Anytype）」，再貼到 Anytype 的一般文字區塊。文字與換行保留，公式以 `$...$` 傳遞，由 Anytype 顯示；附圖轉為 PNG 內嵌於 HTML 剪貼簿內容。公式在離開文字編輯後可呈現，請勿貼入程式碼區塊。

此功能只讀取題目預覽，不包含 API 設定或金鑰，不呼叫 AI。需允許瀏覽器寫入剪貼簿；瀏覽器檢查已涵蓋公式、換行、附圖及無效 JSON 禁止複製。Anytype 原生程式的實際貼上效果仍需確認。

## AI 解答修正 2026/11/04

「AI 解答」會自動切到教師版，將成功取得的解答填入對應右側格子；已有答案的格子維持保留。答案依右格寬高自動放大或縮小，列印前後會重新計算字體大小。

解答出現後會隱藏該格上方的輸入及清除按鈕，答案可使用完整右側高度。計算步驟使用黑色，最後以「答案：」「答：」或「答案是」標示的結果使用紅色；AI 會被要求將最終答案獨立放在最後一行。未標明最終答案或待核對的文字維持黑色。

解答模組的本機與直接連線路徑共用 JSON 解析修復，處理模型漏掉 LaTeX 反斜線跳脫造成的 `Bad escaped character`，並保留正常 JSON 換行與公式換行。格式仍不完整或欄位不符時回報錯誤，不填入答案。修改後須重新啟動 `zj454` 本機後端並重新載入前端模組。

This is the standalone v4 browser app. Open `index.html` or serve the repository and visit `/v4/index.html`. The root app remains v3.1 until this branch is reviewed and merged.

## 2026/11/03 版型升級

- 沿用使用者提供的 A4 題目／計算區版型，預設標題為「大南阿嬤國小」。既有自訂設定保留；按「重設預設值」可套用新的學校標題。
- 題目格提供文字、圖片與 JSON 三種貼上方式，保留教師／學生版及左右皆為題目的切換。
- 文字與教師解答支援 Markdown 及 `$...$`、`$$...$$`、`\(...\)`、`\[...\]` 數學外框，也相容被重複跳脫的 `\\(...\\)`、`\\[...\\]`。Markdown 解析前會保護公式，避免分數與下標被改寫。
- JSON 的 `text` 區塊也相容上述重複跳脫外框，`latex`／`katex` 區塊直接提供公式本體，不加外框；SVG 與公式可放在同一道題內。
- HTML 原始碼是網站版型，不是題目 JSON；請開啟本目錄的 `index.html` 操作網站，而非將整份 HTML 貼入 JSON 題目格。

可用「貼上文字」測試：

```text
通分後完成填空：\(\frac{1}{2}+\frac{1}{3}=\underline{\qquad}\)。
```

本機啟動（從專案根目錄執行 PowerShell）：

```powershell
$env:PORT = '5184'
npm start
```

開啟 `http://127.0.0.1:5184/v4/index.html`。頁面以「列印／另存 PDF」輸出；本分支尚未發布至 GitHub Pages 的 `/v4/`。

Each question has a JSON paste button. Copy one of these JSON forms and click JSON, or click it and press Ctrl+V if clipboard access is blocked:

```json
{"latex":"\\frac{a}{b}+\\sqrt{x}"}
```

```json
{
  "blocks": [
    {"type":"text","value":"求圓的面積。"},
    {"type":"latex","value":"A=\\pi r^2"},
    {"type":"svg","value":"<svg viewBox='0 0 160 100'><circle cx='80' cy='50' r='35' fill='none' stroke='black'/></svg>"}
  ]
}
```

Accepted block types are `text`, `latex` (or `katex`), and `svg`. A single `{ "type": "latex", "value": "..." }`, an array of blocks, or an object with `text`, `latex`, and/or `svg` keys also works. LaTeX is rendered with KaTeX; SVG markup is filtered to safe drawing elements and displayed as an image. Raw scripts, external references, and HTML inside SVG are not supported. Invalid JSON leaves the existing question unchanged.

## 四張截圖的 GPT 模擬測試（2026/11/03）

- v4 的「JSON 轉換與預覽」開啟獨立 `zj454` 模組；需同時啟動 5184 與 5185 服務。
- 模組提供四題固定測試資料（原截圖、JSON、SVG、行內／獨立 LaTeX），不需要 API Key。
- 開啟 `http://127.0.0.1:5184/tests/four-images.html` 可執行 v4 真正的解析、安全清理與渲染函式，並並列來源與輸出。
- 測試資料：`zj454/public/test-cases/`；檢查紀錄：`tests/FOUR-IMAGE-REVIEW.md`。
- 這是對話 GPT 產生資料的模擬驗證，不代表外部 AI API 的自動辨識已驗證。

## API 金鑰設定

「JSON 轉換與預覽」彈窗內已加入四家供應商設定與密碼加密儲存，支援測試成功後自動加密、解鎖、鎖定與刪除；儲存後金鑰不再顯示，更換需重新貼上並測試。詳見 `zj454/API-SETTINGS.md`。手動貼上 JSON、渲染與列印仍不需要金鑰。

## GitHub Pages

線上網址：`https://panggihsieh.github.io/handout/v4/`。Pages 從 `main` 根目錄發布。

線上彈窗使用同站的 `zj454/public/index.html`，不連到訪客電腦的 localhost。GitHub Pages 沒有 Node 後端，API 請求由使用者瀏覽器直接送到官方供應商，受各家 CORS 與帳號權限限制；若無法直連，請使用本機 5185 後端版。金鑰加密紀錄僅屬於目前網站／瀏覽器，不會與本機版共用。

## AI 解答（2026/11/04）

- 「AI 解答」依序處理目前可見且尚無解答的題目，使用 JSON 工具內已解鎖的供應商設定，可能計費。
- 支援文字、截圖及 JSON 題目；JSON 的 SVG 配圖會轉成 PNG 提供模型辨識。金鑰留在設定模組內，不傳回練習簿父頁。
- 解答填入右側計算程序區並切換教師版；依右側可用空間自動縮放字體及段距，列數、視窗尺寸改變時重新調整。
- 不覆蓋既有解答。題目在等待期間改變時不套用舊回覆。「左右皆為題目」模式請先關閉。
- 條件不足時標記待核對；AI 解答仍需教師檢查。
- 模擬測試頁：`tests/ai-answers.html`。已驗證訊息往返、對格填入、既有解答保留、KaTeX、長文縮放與過期回覆防護；沒有使用真實金鑰呼叫外部 API。


## 授權與智慧財產權

© 2026 panggihsieh 與本專案貢獻者。專案原創內容採 [創用 CC 姓名標示－非商業性－相同方式分享 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/deed.zh-hant)（CC BY-NC-SA 4.0）。保留作者標示，非商業使用，改作以相同方式分享；著作權仍歸原權利人。

完整條款見 [LICENSE](../LICENSE)，適用範圍與第三方素材例外見 [著作權聲明](../COPYRIGHT.md)。
