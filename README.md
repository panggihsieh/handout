# Math's Scrapbook v2.0

Latex數學-圖文練習簿是一個可列印的 A4 數學練習單工具。第二版加入本機 API server，讓其他程式可以用 HTTP API 傳入題目文字或圖片，並取得講義 JSON 或可列印 HTML。

## 版本

目前版本：第二版 `Math's Scrapbook v.2.0`

## 功能

- 在瀏覽器中建立 A4 數學練習單
- 支援題目文字貼上
- 支援題目圖片貼上
- 支援每題題目字體大小調整
- 每題提供右側計算過程區
- 可切換家長簽名欄顯示
- 可列印或另存 PDF
- 提供本機 JSON API
- 提供可列印 HTML API

## 檔案

- `index.html`：前端頁面
- `styles.css`：畫面與列印樣式
- `app.js`：前端互動、貼上、排版與列印邏輯
- `server.js`：本機靜態網站與 API server
- `package.json`：Node 啟動設定
- `API.md`：API 範例文件

## 本機啟動

需要 Node.js 18 或以上版本。

```bash
npm start
```

啟動後開啟：

```text
http://127.0.0.1:5173/
```

## API 端點

API 預設也跑在同一個本機服務：

```text
http://127.0.0.1:5173
```

可用端點：

- `GET /api/health`
- `GET /api/default-settings`
- `POST /api/handouts`
- `POST /api/handouts/html`

## API 輸入格式

`POST /api/handouts` 和 `POST /api/handouts/html` 使用相同輸入格式。

```json
{
  "settings": {
    "title": "數學練習",
    "className": "",
    "studentName": "小明",
    "date": "2026-05-20",
    "startNumber": 1,
    "pageCount": 1,
    "rowCount": 4,
    "fontScale": 120,
    "showSignature": true
  },
  "items": [
    {
      "index": 0,
      "type": "text",
      "value": "計算：1 + 1 = ?",
      "fontScale": 120
    }
  ]
}
```

圖片題目可以使用圖片 URL 或 base64 data URL：

```json
{
  "index": 1,
  "type": "image",
  "value": "data:image/png;base64,iVBORw0KGgo..."
}
```

## 欄位限制

- `pageCount`：1 到 50
- `rowCount`：1 到 12
- `startNumber`：1 到 1000000
- `fontScale`：70 到 180
- `items[].index`：題目位置，從 0 開始
- `items[].type`：`text` 或 `image`
- `items[].value`：題目文字、圖片 URL，或 base64 data URL

## API 輸出

`POST /api/handouts` 回傳 JSON：

```json
{
  "version": "2.0",
  "settings": {},
  "summary": {
    "pageCount": 1,
    "rowCount": 4,
    "totalCells": 4,
    "itemCount": 1
  },
  "pages": []
}
```

`POST /api/handouts/html` 回傳 `text/html`，可直接顯示、列印，或交給其他工具轉成 PDF。

## 呼叫範例

PowerShell：

```powershell
$body = @{
  settings = @{
    title = "數學練習"
    studentName = "小明"
    pageCount = 1
    rowCount = 4
  }
  items = @(
    @{
      index = 0
      type = "text"
      value = "計算：1 + 1 = ?"
      fontScale = 120
    }
  )
} | ConvertTo-Json -Depth 5

Invoke-RestMethod `
  -Uri "http://127.0.0.1:5173/api/handouts" `
  -Method Post `
  -ContentType "application/json" `
  -Body $body
```

JavaScript：

```js
const response = await fetch("http://127.0.0.1:5173/api/handouts", {
  method: "POST",
  headers: {
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    settings: {
      title: "數學練習",
      studentName: "小明",
      pageCount: 1,
      rowCount: 4
    },
    items: [
      {
        index: 0,
        type: "text",
        value: "計算：1 + 1 = ?",
        fontScale: 120
      }
    ]
  })
});

const data = await response.json();
console.log(data);
```

## 區網呼叫

預設只允許同一台電腦使用 `127.0.0.1` 呼叫。如果要讓同一個區網的其他電腦呼叫，可以用：

```powershell
$env:HOST="0.0.0.0"
npm start
```

然後用這台電腦的區網 IP 連線，例如：

```text
http://192.168.1.10:5173/
```

## 線上版本

GitHub Pages：

```text
https://panggihsieh.github.io/handout/
```

注意：GitHub Pages 只能提供靜態前端頁面；API server 需要在本機或其他 Node.js 主機上執行。
