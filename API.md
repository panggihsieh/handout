# Handout API

Run the project as a static web app plus a small JSON API:

```bash
npm start
```

Default local endpoints:

- Web app: `http://127.0.0.1:5173/`
- Health check: `GET http://127.0.0.1:5173/api/health`
- Default settings: `GET http://127.0.0.1:5173/api/default-settings`
- Build handout JSON: `POST http://127.0.0.1:5173/api/handouts`
- Build printable HTML: `POST http://127.0.0.1:5173/api/handouts/html`

Example request:

```bash
curl -X POST http://127.0.0.1:5173/api/handouts ^
  -H "Content-Type: application/json" ^
  -d "{\"settings\":{\"title\":\"Math Practice\",\"studentName\":\"Alex\",\"pageCount\":1,\"rowCount\":2},\"items\":[{\"index\":0,\"type\":\"text\",\"value\":\"1 + 1 = ?\"}]}"
```

Example JSON body:

```json
{
  "settings": {
    "title": "Math Practice",
    "studentName": "Alex",
    "date": "2026-05-20",
    "startNumber": 1,
    "pageCount": 1,
    "rowCount": 2,
    "showSignature": true
  },
  "items": [
    {
      "index": 0,
      "type": "text",
      "value": "1 + 1 = ?",
      "fontScale": 120
    }
  ]
}
```
