import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = __dirname;
const port = Number.parseInt(process.env.PORT ?? "5173", 10);
const host = process.env.HOST ?? "127.0.0.1";

const DEFAULT_SETTINGS = {
  title: "數學素養練習單",
  className: "",
  studentName: "",
  date: getTodayLocalDateValue(),
  startNumber: 1,
  pageCount: 1,
  columnCount: 2,
  rowCount: 4,
  fontScale: 120,
  showSignature: true,
};

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
};

function getTodayLocalDateValue() {
  const now = new Date();
  const localNow = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return localNow.toISOString().slice(0, 10);
}

function clampNumber(value, min, max, fallback) {
  const parsed = Number.parseInt(value, 10);

  if (Number.isNaN(parsed)) {
    return fallback;
  }

  return Math.min(Math.max(parsed, min), max);
}

function normalizeText(value, fallback = "") {
  const normalized = String(value ?? "").trim();
  return normalized || fallback;
}

function normalizeSettings(settings = {}) {
  return {
    ...DEFAULT_SETTINGS,
    title: normalizeText(settings.title, DEFAULT_SETTINGS.title),
    className: normalizeText(settings.className),
    studentName: normalizeText(settings.studentName),
    date: normalizeText(settings.date, getTodayLocalDateValue()),
    startNumber: clampNumber(settings.startNumber, 1, 1000000, DEFAULT_SETTINGS.startNumber),
    pageCount: clampNumber(settings.pageCount, 1, 50, DEFAULT_SETTINGS.pageCount),
    columnCount: 2,
    rowCount: clampNumber(settings.rowCount, 1, 12, DEFAULT_SETTINGS.rowCount),
    fontScale: clampNumber(settings.fontScale, 70, 180, DEFAULT_SETTINGS.fontScale),
    showSignature: settings.showSignature !== false,
  };
}

function normalizeItems(items = []) {
  if (!Array.isArray(items)) {
    return [];
  }

  return items
    .map((item, fallbackIndex) => {
      const type = item?.type === "image" ? "image" : "text";
      const value = normalizeText(item?.value);

      if (!value) {
        return null;
      }

      return {
        index: clampNumber(item?.index, 0, 1000000, fallbackIndex),
        type,
        value,
        fontScale: clampNumber(item?.fontScale, 70, 180, DEFAULT_SETTINGS.fontScale),
      };
    })
    .filter(Boolean);
}

function buildHandout(payload = {}) {
  const settings = normalizeSettings(payload.settings);
  const items = normalizeItems(payload.items);
  const itemsByIndex = new Map(items.map((item) => [item.index, item]));
  const cellsPerPage = settings.rowCount;
  const totalCells = settings.pageCount * cellsPerPage;
  const pages = [];

  for (let pageIndex = 0; pageIndex < settings.pageCount; pageIndex += 1) {
    const cells = [];

    for (let cellIndex = 0; cellIndex < cellsPerPage; cellIndex += 1) {
      const itemIndex = pageIndex * cellsPerPage + cellIndex;
      const item = itemsByIndex.get(itemIndex) ?? null;

      cells.push({
        index: itemIndex,
        number: settings.startNumber + itemIndex,
        question: item,
        workPane: {
          number: settings.startNumber + itemIndex,
          title: "計算過程",
        },
      });
    }

    pages.push({
      index: pageIndex,
      title: settings.title,
      layout: `單欄 / 每頁 ${cellsPerPage} 題`,
      studentName: settings.studentName || "________________",
      date: settings.date,
      signature: settings.showSignature,
      meta: `頁 ${pageIndex + 1} / ${settings.pageCount}`,
      cells,
    });
  }

  return {
    version: "2.0",
    settings,
    summary: {
      pageCount: settings.pageCount,
      rowCount: settings.rowCount,
      totalCells,
      itemCount: items.length,
    },
    pages,
  };
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderQuestion(question) {
  if (!question) {
    return "";
  }

  if (question.type === "image") {
    return `<img class="problem-image" alt="題目圖片" src="${escapeHtml(question.value)}">`;
  }

  const size = (0.92 * (question.fontScale / 120)).toFixed(3);
  return `<div class="problem-text" style="font-size:${size}rem;line-height:1.28">${escapeHtml(question.value)}</div>`;
}

function renderHandoutHtml(payload = {}) {
  const handout = buildHandout(payload);
  const pages = handout.pages
    .map((page, pageIndex) => {
      const header =
        pageIndex === 0
          ? `<div class="page-header">
              <div class="page-heading">
                <h2 class="page-title">${escapeHtml(page.title)}</h2>
                <div class="page-info">
                  <div class="page-info-item">版面：<span>${escapeHtml(page.layout)}</span></div>
                  <div class="page-info-item">姓名：<span>${escapeHtml(page.studentName)}</span></div>
                  <div class="page-info-item">日期：<span>${escapeHtml(page.date)}</span></div>
                </div>
              </div>
              <div class="page-signature">
                <span class="signature-label"><span>家長</span><span>簽名</span></span>
                <span class="signature-box" aria-hidden="true"></span>
              </div>
            </div>`
          : "";

      const cells = page.cells
        .map(
          (cell) => `<article class="cell">
              <div class="cell-layout">
                <section class="question-pane ${cell.question ? `has-${cell.question.type}` : ""}">
                  <div class="cell-number">${cell.number}</div>
                  <div class="cell-content ${cell.question ? "" : "is-empty"}">${renderQuestion(cell.question)}</div>
                </section>
                <section class="work-pane">
                  <div class="work-pane-number">${cell.number}</div>
                  <div class="work-pane-title">${escapeHtml(cell.workPane.title)}</div>
                  <div class="work-pane-body"></div>
                </section>
              </div>
            </article>`,
        )
        .join("");

      return `<section class="page ${pageIndex > 0 ? "page-following" : ""}">
          ${header}
          <div class="grid" style="grid-template-rows:repeat(${handout.settings.rowCount}, minmax(0, 1fr))">${cells}</div>
          <div class="page-meta">${escapeHtml(page.meta)}</div>
        </section>`;
    })
    .join("");

  return `<!doctype html>
<html lang="zh-Hant">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(handout.settings.title)}</title>
  <link rel="stylesheet" href="/styles.css">
</head>
<body>
  <main class="pages ${handout.settings.showSignature ? "show-signature" : "hide-signature"}">${pages}</main>
</body>
</html>`;
}

async function readRequestJson(request) {
  const chunks = [];

  for await (const chunk of request) {
    chunks.push(chunk);
  }

  const raw = Buffer.concat(chunks).toString("utf8").trim();
  return raw ? JSON.parse(raw) : {};
}

function sendJson(response, statusCode, body) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });
  response.end(JSON.stringify(body, null, 2));
}

function sendHtml(response, statusCode, html) {
  response.writeHead(statusCode, {
    "Content-Type": "text/html; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
  });
  response.end(html);
}

async function sendStatic(response, pathname) {
  const requestedPath = pathname === "/" ? "/index.html" : pathname;
  const filePath = path.normalize(path.join(root, decodeURIComponent(requestedPath)));

  if (!filePath.startsWith(root)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  try {
    const data = await readFile(filePath);
    const contentType = contentTypes[path.extname(filePath).toLowerCase()] ?? "application/octet-stream";
    response.writeHead(200, { "Content-Type": contentType });
    response.end(data);
  } catch {
    response.writeHead(404);
    response.end("Not found");
  }
}

async function handleApi(request, response, url) {
  if (request.method === "OPTIONS") {
    sendJson(response, 204, {});
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/health") {
    sendJson(response, 200, { ok: true, name: "handout-api", version: "2.0" });
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/default-settings") {
    sendJson(response, 200, DEFAULT_SETTINGS);
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/handouts") {
    const payload = await readRequestJson(request);
    sendJson(response, 200, buildHandout(payload));
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/handouts/html") {
    const payload = await readRequestJson(request);
    sendHtml(response, 200, renderHandoutHtml(payload));
    return;
  }

  sendJson(response, 404, { error: "API route not found" });
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url ?? "/", `http://${request.headers.host ?? `${host}:${port}`}`);

  try {
    if (url.pathname.startsWith("/api/")) {
      await handleApi(request, response, url);
      return;
    }

    await sendStatic(response, url.pathname);
  } catch (error) {
    sendJson(response, 400, { error: error instanceof Error ? error.message : "Bad request" });
  }
});

server.listen(port, host, () => {
  console.log(`Handout app and API running at http://${host}:${port}/`);
  console.log(`API health check: http://${host}:${port}/api/health`);
});
