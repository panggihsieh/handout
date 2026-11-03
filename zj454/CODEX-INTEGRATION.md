# 交給 Codex 的整合指令

請先閱讀 `math-json-module/README.md`，檢查本模組的 `server.mjs`、`public/index.html`、`package.json`。
然後分析現有練習簿 `v4/index.html` 的 JSON 匯入、KaTeX、SVG 和題目格子結構。

目標：讓每個題目格子支援「貼題目文字或截圖 → AI 產生 JSON → 人工核對 → 匯入」，同時保留既有純 JSON 貼上與即時預覽。

嚴格使用 `{ "blocks": [...] }`，block 只能有 `type`、`value`，其中 type 僅能為 `text`、`latex`、`svg`。不要加入答案、解法或未給定幾何關係。請確認每個 SVG 的 viewBox、座標和標示正確，並進行安全清理。API 金鑰只允許出現在後端環境變數。保留所有現有功能及 PDF 匯出。

請先檢查現有專案依賴和資料流，避免重複引入套件。完成整合後測試文字題、分數題及含 SVG 的配圖題。若圖片辨識模糊，應提示人工確認而非猜測。
