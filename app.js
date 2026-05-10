const STORAGE_KEY = "rowcolpage.v3.settings";

function getTodayLocalDateValue() {
  const now = new Date();
  const localNow = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return localNow.toISOString().slice(0, 10);
}

const DEFAULT_SETTINGS = {
  title: "梅山鄉大南國小",
  className: "",
  studentName: "",
  date: getTodayLocalDateValue(),
  startNumber: 1,
  pageCount: 1,
  columnCount: 2,
  rowCount: 4,
  fontScale: 120,
  guideMode: "none",
  showSignature: true,
};



const cellItems = new Map();
const cellFontScales = new Map();
const cellBindings = new Map();
let activeCellIndex = null;
let activePasteMode = null;

const titleInput = document.querySelector("#titleInput");
const classInput = document.querySelector("#classInput");
const nameInput = document.querySelector("#nameInput");
const dateInput = document.querySelector("#dateInput");
const startNumberInput = document.querySelector("#startNumberInput");
const pageCountInput = document.querySelector("#pageCountInput");
const rowCountInput = document.querySelector("#rowCountInput");
const guideSelect = document.querySelector("#guideSelect");
const signatureToggle = document.querySelector("#signatureToggle");
const resetButton = document.querySelector("#resetButton");
const printButton = document.querySelector("#printButton");
const apiNotice = document.querySelector("#apiNotice");
const pagesRoot = document.querySelector("#pages");
const pageTemplate = document.querySelector("#pageTemplate");
const cellTemplate = document.querySelector("#cellTemplate");

const API_PARAM_KEYS = new Set(["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"]);
const SUSPICIOUS_PATTERNS = [
  /<\s*script/i,
  /<\/\s*script/i,
  /javascript:/i,
  /vbscript:/i,
  /data:text\/html/i,
  /onerror\s*=/i,
  /onload\s*=/i,
  /<\s*iframe/i,
  /<\s*object/i,
  /<\s*embed/i,
  /srcdoc\s*=/i,
  /document\.cookie/i,
  /localStorage/i,
  /sessionStorage/i,
  /%3c\s*script/i,
];

function clampNumber(value, min, max, fallback) {
  const parsed = Number.parseInt(value, 10);

  if (Number.isNaN(parsed)) {
    return fallback;
  }

  return Math.min(Math.max(parsed, min), max);
}

function formatDisplayDate(dateValue) {
  if (!dateValue) {
    return "____ / ____ / ____";
  }

  const [year, month, day] = dateValue.split("-");

  if (!year || !month || !day) {
    return "____ / ____ / ____";
  }

  return `${year} / ${month} / ${day}`;
}

function withFallback(value, fallback) {
  return value.trim() || fallback;
}

function hasApiParams(searchParams = new URLSearchParams(window.location.search)) {
  for (const key of searchParams.keys()) {
    if (API_PARAM_KEYS.has(key)) {
      return true;
    }
  }

  return false;
}

function setApiNotice(result) {
  if (!apiNotice) {
    return;
  }

  const appliedCount = result.applied.length;
  const blockedCount = result.blocked.length;

  if (!appliedCount && !blockedCount) {
    apiNotice.hidden = true;
    apiNotice.classList.remove("is-danger");
    apiNotice.replaceChildren();
    return;
  }

  const title = document.createElement("strong");
  title.textContent = blockedCount
    ? `API 已套用，並攔截 ${blockedCount} 筆可疑輸入`
    : `API 已套用 ${appliedCount} 筆輸入`;

  const list = document.createElement("ul");

  result.applied.forEach((message) => {
    const item = document.createElement("li");
    item.textContent = message;
    list.appendChild(item);
  });

  result.blocked.forEach((message) => {
    const item = document.createElement("li");
    item.textContent = `已封鎖：${message}`;
    list.appendChild(item);
  });

  apiNotice.hidden = false;
  apiNotice.classList.toggle("is-danger", blockedCount > 0);
  apiNotice.replaceChildren(title, list);
}

function containsSuspiciousPayload(value) {
  const text = String(value ?? "");
  return SUSPICIOUS_PATTERNS.some((pattern) => pattern.test(text));
}

function normalizeGuideModeInput(value) {
  const normalized = String(value ?? "").trim().toLowerCase();

  if (["none", "無"].includes(normalized)) {
    return "none";
  }

  if (["horizontal", "橫線", "line"].includes(normalized)) {
    return "horizontal";
  }

  if (["dot", "點", "dots"].includes(normalized)) {
    return "dot";
  }

  return null;
}

function normalizeSignatureInput(value) {
  const normalized = String(value ?? "").trim().toLowerCase();

  if (["on", "true", "1", "yes"].includes(normalized)) {
    return true;
  }

  if (["off", "false", "0", "no"].includes(normalized)) {
    return false;
  }

  return null;
}

function getIntegerInRange(value, min, max) {
  const parsed = Number.parseInt(String(value ?? "").trim(), 10);

  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    return null;
  }

  return parsed;
}

function validatePlainApiValue(paramKey, value, maxLength) {
  const normalized = String(value ?? "").trim();

  if (!normalized) {
    return { ok: false, reason: `參數 ${paramKey} 不可為空白` };
  }

  if (normalized.length > maxLength) {
    return { ok: false, reason: `參數 ${paramKey} 長度超過限制` };
  }

  if (containsSuspiciousPayload(normalized)) {
    return { ok: false, reason: `參數 ${paramKey} 含可疑腳本內容` };
  }

  return { ok: true, value: normalized };
}

function validateImageSource(value) {
  const normalized = String(value ?? "").trim();

  if (!normalized) {
    return { ok: false, reason: "參數 9 缺少圖片來源" };
  }

  if (normalized.length > 1500000) {
    return { ok: false, reason: "參數 9 圖片資料過大" };
  }

  if (containsSuspiciousPayload(normalized)) {
    return { ok: false, reason: "參數 9 含可疑腳本內容" };
  }

  const safeImagePrefixes = [
    "https://",
    "http://",
    "data:image/png;base64,",
    "data:image/jpeg;base64,",
    "data:image/jpg;base64,",
    "data:image/gif;base64,",
    "data:image/webp;base64,",
    "/",
    "./",
  ];

  if (!safeImagePrefixes.some((prefix) => normalized.startsWith(prefix))) {
    return { ok: false, reason: "參數 9 圖片來源格式不被允許" };
  }

  return { ok: true, value: normalized };
}

function parseCellOperation(rawValue, paramKey) {
  const normalized = String(rawValue ?? "").trim();

  if (!normalized) {
    return { ok: false, reason: `參數 ${paramKey} 不可為空白` };
  }

  const separatorIndex = normalized.indexOf("|");

  if (separatorIndex === -1) {
    return { ok: false, reason: `參數 ${paramKey} 格式應為 格號|內容` };
  }

  const slotText = normalized.slice(0, separatorIndex).trim();
  const payload = normalized.slice(separatorIndex + 1).trim();
  const slot = getIntegerInRange(slotText, 1, 999);

  if (!slot) {
    return { ok: false, reason: `參數 ${paramKey} 的格號不合法` };
  }

  if (!payload) {
    return { ok: false, reason: `參數 ${paramKey} 缺少內容` };
  }

  return { ok: true, slot, payload };
}

function applyApiParams(searchParams) {
  const result = { applied: [], blocked: [] };

  const field1 = searchParams.get("1");
  if (field1 !== null) {
    const checked = validatePlainApiValue("1", field1, 80);
    if (checked.ok) {
      titleInput.value = checked.value;
      result.applied.push("1 標題已更新");
    } else {
      result.blocked.push(checked.reason);
    }
  }

  const field2 = searchParams.get("2");
  if (field2 !== null) {
    const checked = validatePlainApiValue("2", field2, 40);
    if (checked.ok) {
      nameInput.value = checked.value;
      result.applied.push("2 姓名已更新");
    } else {
      result.blocked.push(checked.reason);
    }
  }

  const field3 = searchParams.get("3");
  if (field3 !== null) {
    const normalized = String(field3 ?? "").trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
      dateInput.value = normalized;
      result.applied.push("3 日期已更新");
    } else {
      result.blocked.push("參數 3 日期格式需為 YYYY-MM-DD");
    }
  }

  const field4 = searchParams.get("4");
  if (field4 !== null) {
    const value = getIntegerInRange(field4, 1, 1000000);
    if (value !== null) {
      startNumberInput.value = String(value);
      result.applied.push("4 起始編號已更新");
    } else {
      result.blocked.push("參數 4 起始編號超出範圍");
    }
  }

  const field5 = searchParams.get("5");
  if (field5 !== null) {
    const value = getIntegerInRange(field5, 1, 50);
    if (value !== null) {
      pageCountInput.value = String(value);
      result.applied.push("5 頁數已更新");
    } else {
      result.blocked.push("參數 5 頁數超出範圍");
    }
  }

  const field6 = searchParams.get("6");
  if (field6 !== null) {
    const value = getIntegerInRange(field6, 1, 12);
    if (value !== null) {
      rowCountInput.value = String(value);
      result.applied.push("6 列數已更新");
    } else {
      result.blocked.push("參數 6 列數超出範圍");
    }
  }

  const field7 = searchParams.get("7");
  if (field7 !== null) {
    const value = normalizeGuideModeInput(field7);
    if (value) {
      guideSelect.value = value;
      result.applied.push("7 每格輔助線已更新");
    } else {
      result.blocked.push("參數 7 每格輔助線格式不合法");
    }
  }

  const field8 = searchParams.get("8");
  if (field8 !== null) {
    const value = normalizeSignatureInput(field8);
    if (value !== null) {
      updateSignatureVisibility(value);
      result.applied.push("8 家長簽名已更新");
    } else {
      result.blocked.push("參數 8 家長簽名格式不合法");
    }
  }

  const totalSlots =
    clampNumber(pageCountInput.value, 1, 50, DEFAULT_SETTINGS.pageCount) *
    clampNumber(rowCountInput.value, 1, 12, DEFAULT_SETTINGS.rowCount);

  searchParams.getAll("9").forEach((entry) => {
    const operation = parseCellOperation(entry, "9");
    if (!operation.ok) {
      result.blocked.push(operation.reason);
      return;
    }

    if (operation.slot > totalSlots) {
      result.blocked.push(`參數 9 指定的格號 ${operation.slot} 超出目前頁面範圍`);
      return;
    }

    const checked = validateImageSource(operation.payload);
    if (!checked.ok) {
      result.blocked.push(checked.reason);
      return;
    }

    const cellIndex = operation.slot - 1;
    cellItems.delete(cellIndex);
    setCellItem(cellIndex, { type: "image", value: checked.value, fontScale: getCellFontScale(cellIndex) });
    result.applied.push(`9 已設定第 ${operation.slot} 格圖片`);
  });

  searchParams.getAll("10").forEach((entry) => {
    const operation = parseCellOperation(entry, "10");
    if (!operation.ok) {
      result.blocked.push(operation.reason);
      return;
    }

    if (operation.slot > totalSlots) {
      result.blocked.push(`參數 10 指定的格號 ${operation.slot} 超出目前頁面範圍`);
      return;
    }

    const checked = validatePlainApiValue("10", operation.payload, 5000);
    if (!checked.ok) {
      result.blocked.push(checked.reason);
      return;
    }

    const cellIndex = operation.slot - 1;
    cellItems.delete(cellIndex);
    setCellItem(cellIndex, { type: "text", value: checked.value, fontScale: getCellFontScale(cellIndex) });
    result.applied.push(`10 已設定第 ${operation.slot} 格文字`);
  });

  searchParams.getAll("11").forEach((entry) => {
    const operation = parseCellOperation(entry, "11");
    if (!operation.ok) {
      result.blocked.push(operation.reason);
      return;
    }

    if (operation.slot > totalSlots) {
      result.blocked.push(`參數 11 指定的格號 ${operation.slot} 超出目前頁面範圍`);
      return;
    }

    const steps = getIntegerInRange(operation.payload, 1, 20);
    if (steps === null) {
      result.blocked.push("參數 11 次數需為 1 到 20");
      return;
    }

    updateCellFontScale(operation.slot - 1, steps * -5);
    result.applied.push(`11 已縮小第 ${operation.slot} 格字體 ${steps} 次`);
  });

  searchParams.getAll("12").forEach((entry) => {
    const operation = parseCellOperation(entry, "12");
    if (!operation.ok) {
      result.blocked.push(operation.reason);
      return;
    }

    if (operation.slot > totalSlots) {
      result.blocked.push(`參數 12 指定的格號 ${operation.slot} 超出目前頁面範圍`);
      return;
    }

    const steps = getIntegerInRange(operation.payload, 1, 20);
    if (steps === null) {
      result.blocked.push("參數 12 次數需為 1 到 20");
      return;
    }

    updateCellFontScale(operation.slot - 1, steps * 5);
    result.applied.push(`12 已放大第 ${operation.slot} 格字體 ${steps} 次`);
  });

  return result;
}

function normalizeTitle(title) {
  const normalizedTitle = String(title ?? "").trim();

  if (!normalizedTitle) {
    return DEFAULT_SETTINGS.title;
  }

  return normalizedTitle;
}

function getSignatureVisible() {
  return signatureToggle.getAttribute("aria-pressed") === "true";
}

function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return { ...DEFAULT_SETTINGS };
    }

    const parsed = { ...DEFAULT_SETTINGS, ...JSON.parse(raw), date: getTodayLocalDateValue() };
    parsed.title = normalizeTitle(parsed.title);
    return parsed;
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

function saveSettings(settings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

function applySettings(settings) {
  titleInput.value = normalizeTitle(settings.title);
  if (classInput) {
    classInput.value = settings.className ?? "";
  }
  nameInput.value = settings.studentName;
  dateInput.value = settings.date || getTodayLocalDateValue();
  startNumberInput.value = settings.startNumber;
  pageCountInput.value = settings.pageCount;
  rowCountInput.value = settings.rowCount;
  guideSelect.value = settings.guideMode;
  updateSignatureVisibility(settings.showSignature);
}

function collectSettings() {
  return {
    title: normalizeTitle(titleInput.value),
    className: classInput ? classInput.value.trim() : "",
    studentName: nameInput.value.trim(),
    date: dateInput.value || getTodayLocalDateValue(),
    startNumber: clampNumber(startNumberInput.value, 1, 1000000, DEFAULT_SETTINGS.startNumber),
    pageCount: clampNumber(pageCountInput.value, 1, 50, DEFAULT_SETTINGS.pageCount),
    columnCount: 2,
    rowCount: clampNumber(rowCountInput.value, 1, 12, DEFAULT_SETTINGS.rowCount),
    fontScale: DEFAULT_SETTINGS.fontScale,
    guideMode: guideSelect.value,
    showSignature: getSignatureVisible(),
  };
}

function updateGuideMode(guideMode) {
  pagesRoot.className = "pages";

  if (guideMode === "none") {
    pagesRoot.classList.add("no-guides");
    return;
  }

  pagesRoot.classList.add(`guide-${guideMode}`);
}

function updateSignatureVisibility(showSignature) {
  pagesRoot.classList.toggle("show-signature", showSignature);
  pagesRoot.classList.toggle("hide-signature", !showSignature);
  signatureToggle.textContent = showSignature ? "on" : "off";
  signatureToggle.setAttribute("aria-pressed", String(showSignature));
}

function getPlainTextFromClipboardData(clipboardData) {
  return (clipboardData?.getData("text/plain") ?? "").trim();
}

function getImageFileFromClipboardData(clipboardData) {
  const items = Array.from(clipboardData?.items ?? []);

  for (const item of items) {
    if (item.kind === "file" && item.type.startsWith("image/")) {
      return item.getAsFile();
    }
  }

  return null;
}

function readBlobAsDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderMathMarkdown(container, sourceText) {
  const markdownSource = sourceText.trim();

  if (!markdownSource) {
    container.innerHTML = "";
    return;
  }

  if (window.marked?.setOptions) {
    window.marked.setOptions({
      breaks: true,
      gfm: true,
    });
  }

  const html = window.marked?.parse
    ? window.marked.parse(markdownSource)
    : `<p>${escapeHtml(markdownSource)}</p>`;

  container.innerHTML = html;

  if (window.renderMathInElement) {
    window.renderMathInElement(container, {
      delimiters: [
        { left: "$$", right: "$$", display: true },
        { left: "$", right: "$", display: false },
        { left: "\\(", right: "\\)", display: false },
        { left: "\\[", right: "\\]", display: true },
      ],
      throwOnError: false,
      strict: "ignore",
    });
  }
}

function doesTextFit(container, textBlock) {
  const heightSlack = 2;
  const widthSlack = 2;

  return (
    textBlock.scrollHeight <= container.clientHeight - heightSlack &&
    textBlock.scrollWidth <= container.clientWidth - widthSlack
  );
}

function getQuestionBaseSize(fontScale = DEFAULT_SETTINGS.fontScale) {
  return 0.92 * (fontScale / 120);
}

function applyQuestionTextSize(textBlock, size) {
  textBlock.style.fontSize = `${size.toFixed(3)}rem`;
  textBlock.style.lineHeight = "1.28";
}

function fitQuestionText(container, textBlock, fontScale = DEFAULT_SETTINGS.fontScale) {
  const size = getQuestionBaseSize(fontScale);
  applyQuestionTextSize(textBlock, size);
  textBlock.classList.remove("is-compact");
}

function getCellFontScale(cellIndex) {
  return cellFontScales.get(cellIndex) ?? DEFAULT_SETTINGS.fontScale;
}

function updateCellFontScale(cellIndex, delta) {
  const nextScale = clampNumber(getCellFontScale(cellIndex) + delta, 70, 180, DEFAULT_SETTINGS.fontScale);
  cellFontScales.set(cellIndex, nextScale);

  const binding = cellBindings.get(cellIndex);
  const item = cellItems.get(cellIndex);

  if (item) {
    item.fontScale = nextScale;
  }

  if (!binding || item?.type !== "text") {
    return;
  }

  const textBlock = binding.content.querySelector(".problem-text");
  if (textBlock) {
    fitQuestionText(binding.content, textBlock, nextScale);
  }
}

function renderCellContent(container, pane, item, cellIndex = null) {
  container.replaceChildren();

  const hasContent = Boolean(item?.value);
  container.classList.toggle("is-empty", !hasContent);
  pane.classList.toggle("has-question", Boolean(item && item.type === "text"));
  pane.classList.toggle("has-image", Boolean(item && item.type === "image"));

  if (!item?.value) {
    return;
  }

  if (item.type === "image") {
    const image = document.createElement("img");
    image.className = "problem-image";
    image.alt = "題目圖片";
    image.src = item.value;
    container.appendChild(image);
    return;
  }

  const textBlock = document.createElement("div");
  textBlock.className = "problem-text";
  renderMathMarkdown(textBlock, item.value);
  container.appendChild(textBlock);
  const textScale = cellIndex === null ? (item.fontScale ?? DEFAULT_SETTINGS.fontScale) : getCellFontScale(cellIndex);
  requestAnimationFrame(() => fitQuestionText(container, textBlock, textScale));
}

function refreshQuestionTextSizing() {
  cellBindings.forEach(({ content, pane }, cellIndex) => {
    const item = cellItems.get(cellIndex);

    if (!item || item.type !== "text") {
      return;
    }

    const textBlock = content.querySelector(".problem-text");

    if (!textBlock || !pane.classList.contains("has-question")) {
      return;
    }

    fitQuestionText(content, textBlock, item.fontScale ?? getCellFontScale(cellIndex));
  });
}

function updateActiveState() {
  cellBindings.forEach(({ pane, imagePasteButton, textPasteButton }, cellIndex) => {
    const isActive = cellIndex === activeCellIndex;
    pane.classList.toggle("is-paste-target", isActive);
    imagePasteButton.classList.toggle("is-active", isActive && activePasteMode === "image");
    textPasteButton.classList.toggle("is-active", isActive && activePasteMode === "text");
  });
}

function setActiveCell(cellIndex, pasteMode = activePasteMode) {
  activeCellIndex = cellIndex;
  activePasteMode = pasteMode;
  updateActiveState();
}

function setCellItem(cellIndex, item) {
  const normalizedValue = item?.value?.trim() ?? "";

  if (!normalizedValue) {
    return false;
  }

  const normalizedItem = {
    type: item.type,
    value: normalizedValue,
    fontScale:
      item.type === "text"
        ? clampNumber(item.fontScale ?? getCellFontScale(cellIndex), 70, 180, DEFAULT_SETTINGS.fontScale)
        : getCellFontScale(cellIndex),
  };

  cellFontScales.set(cellIndex, normalizedItem.fontScale);

  cellItems.set(cellIndex, normalizedItem);

  const binding = cellBindings.get(cellIndex);
  if (binding) {
    renderCellContent(binding.content, binding.pane, normalizedItem, cellIndex);
    binding.clearButton.hidden = false;
  }

  return true;
}

async function applyImageToCell(cellIndex, fileOrBlob) {
  const imageUrl = await readBlobAsDataUrl(fileOrBlob);
  return setCellItem(cellIndex, { type: "image", value: imageUrl, fontScale: getCellFontScale(cellIndex) });
}

function applyTextToCell(cellIndex, text) {
  return setCellItem(cellIndex, { type: "text", value: text, fontScale: getCellFontScale(cellIndex) });
}

async function handlePasteForCell(cellIndex, event) {
  const imageFile = getImageFileFromClipboardData(event.clipboardData);
  const text = getPlainTextFromClipboardData(event.clipboardData);

  if (!imageFile && !text) {
    return false;
  }

  event.preventDefault();
  event.stopPropagation();

  if (imageFile && activePasteMode !== "text") {
    setActiveCell(cellIndex, null);
    await applyImageToCell(cellIndex, imageFile);
    return true;
  }

  if (text) {
    setActiveCell(cellIndex, null);
    applyTextToCell(cellIndex, text);
    return true;
  }

  if (imageFile) {
    setActiveCell(cellIndex, null);
    await applyImageToCell(cellIndex, imageFile);
    return true;
  }

  return false;
}

function bindCell(cell, cellIndex) {
  const pane = cell.querySelector(".question-pane");
  const content = cell.querySelector(".cell-content");
  const imagePasteButton = cell.querySelector(".cell-image-paste-button");
  const textPasteButton = cell.querySelector(".cell-text-paste-button");
  const fontDecreaseButton = cell.querySelector(".cell-font-decrease-button");
  const fontIncreaseButton = cell.querySelector(".cell-font-increase-button");
  const clearButton = cell.querySelector(".cell-clear-button");
  const pasteInput = document.createElement("textarea");

  pane.tabIndex = 0;
  pane.setAttribute("title", "先點按鈕，再按 Ctrl+V 貼上圖片或文字");
  pasteInput.className = "cell-paste-input";
  pasteInput.setAttribute("aria-label", "貼上輸入框");
  pasteInput.setAttribute("autocomplete", "off");
  pasteInput.setAttribute("spellcheck", "false");
  pane.appendChild(pasteInput);

  cellBindings.set(cellIndex, {
    pane,
    content,
    imagePasteButton,
    textPasteButton,
    fontDecreaseButton,
    fontIncreaseButton,
    clearButton,
    pasteInput,
  });

  renderCellContent(content, pane, cellItems.get(cellIndex), cellIndex);
  clearButton.hidden = !cellItems.has(cellIndex);
  updateActiveState();

  const activate = () => {
    setActiveCell(cellIndex, activePasteMode);
  };

  cell.addEventListener("click", activate);
  pane.addEventListener("focus", activate);

  pane.addEventListener("paste", async (event) => {
    await handlePasteForCell(cellIndex, event);
  });

  pasteInput.addEventListener("focus", activate);
  pasteInput.addEventListener("paste", async (event) => {
    pasteInput.value = "";
    await handlePasteForCell(cellIndex, event);
    pasteInput.value = "";
  });

  imagePasteButton.addEventListener("click", async () => {
    setActiveCell(cellIndex, "image");
    try {
      const items = await navigator.clipboard.read();
      for (const item of items) {
        for (const type of item.types) {
          if (type.startsWith("image/")) {
            const blob = await item.getType(type);
            await applyImageToCell(cellIndex, blob);
            setActiveCell(cellIndex, null);
            return;
          }
        }
      }
      alert("剪貼簿中沒有圖片！");
    } catch (err) {
      console.error("Failed to read clipboard:", err);
      pasteInput.focus();
      alert("無法直接讀取剪貼簿（可能未授權）。請點選後，直接按 Ctrl+V 貼上。");
    }
  });

  textPasteButton.addEventListener("click", async () => {
    setActiveCell(cellIndex, "text");
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        applyTextToCell(cellIndex, text);
        setActiveCell(cellIndex, null);
      } else {
        alert("剪貼簿中沒有文字！");
      }
    } catch (err) {
      console.error("Failed to read clipboard:", err);
      pasteInput.focus();
      alert("無法直接讀取剪貼簿（可能未授權）。請點選後，直接按 Ctrl+V 貼上。");
    }
  });

  fontDecreaseButton?.addEventListener("click", () => {
    setActiveCell(cellIndex, activePasteMode);
    updateCellFontScale(cellIndex, -5);
  });

  fontIncreaseButton?.addEventListener("click", () => {
    setActiveCell(cellIndex, activePasteMode);
    updateCellFontScale(cellIndex, 5);
  });

  clearButton.addEventListener("click", () => {
    cellItems.delete(cellIndex);
    cellFontScales.delete(cellIndex);
    renderCellContent(content, pane, null, cellIndex);
    clearButton.hidden = true;
  });
}

function renderPages(options = {}) {
  const { persist = true } = options;
  const settings = collectSettings();
  const title = settings.title;
  const studentName = withFallback(settings.studentName, "________________");
  const displayDate = formatDisplayDate(settings.date);
  const cellsPerPage = settings.rowCount;
  const totalCells = settings.pageCount * cellsPerPage;
  const layoutLabel = `單欄 / 每頁 ${cellsPerPage} 題`;

  if (activeCellIndex !== null && activeCellIndex >= totalCells) {
    activeCellIndex = null;
  }

  pagesRoot.replaceChildren();
  cellBindings.clear();
  updateGuideMode(settings.guideMode);
  updateSignatureVisibility(settings.showSignature);
  if (persist) {
    saveSettings(settings);
  }

  for (let pageIndex = 0; pageIndex < settings.pageCount; pageIndex += 1) {
    const pageFragment = pageTemplate.content.cloneNode(true);
    const pageTitle = pageFragment.querySelector(".page-title");
    const pageLayout = pageFragment.querySelector(".page-layout");
    const pageName = pageFragment.querySelector(".page-name");
    const pageDate = pageFragment.querySelector(".page-date");
    const pageMeta = pageFragment.querySelector(".page-meta");
    const pageHeader = pageFragment.querySelector(".page-header");
    const grid = pageFragment.querySelector(".grid");
    const page = pageFragment.querySelector(".page");

    pageTitle.textContent = title;
    pageLayout.textContent = layoutLabel;
    pageName.textContent = studentName;
    pageDate.textContent = displayDate;
    pageMeta.textContent = `第 ${pageIndex + 1} / ${settings.pageCount} 頁`;
    grid.style.gridTemplateColumns = "repeat(1, minmax(0, 1fr))";
    grid.style.gridTemplateRows = `repeat(${settings.rowCount}, minmax(0, 1fr))`;

    if (pageIndex > 0) {
      page.classList.add("page-following");
      pageHeader.remove();
    }

    for (let cellIndex = 0; cellIndex < cellsPerPage; cellIndex += 1) {
      const itemIndex = pageIndex * cellsPerPage + cellIndex;
      const cellFragment = cellTemplate.content.cloneNode(true);
      const cellElement = cellFragment.querySelector(".cell");
      const cellNumber = cellFragment.querySelector(".cell-number");
      const workPaneNumber = cellFragment.querySelector(".work-pane-number");

      cellNumber.textContent = settings.startNumber + itemIndex;
      if (workPaneNumber) {
        workPaneNumber.textContent = settings.startNumber + itemIndex;
      }
      bindCell(cellElement, itemIndex);
      grid.appendChild(cellFragment);
    }

    pagesRoot.appendChild(page);
  }
}

[titleInput, classInput, nameInput, dateInput, startNumberInput, pageCountInput, rowCountInput, guideSelect]
  .filter(Boolean)
  .forEach((element) => {
    element.addEventListener("input", renderPages);
    element.addEventListener("change", renderPages);
  });

signatureToggle.addEventListener("click", () => {
  updateSignatureVisibility(!getSignatureVisible());
  renderPages();
});

resetButton.addEventListener("click", () => {
  localStorage.removeItem(STORAGE_KEY);
  cellItems.clear();
  cellFontScales.clear();
  activeCellIndex = null;
  applySettings({ ...DEFAULT_SETTINGS });
  renderPages();
});

printButton.addEventListener("click", () => {
  window.print();
});

document.addEventListener("paste", async (event) => {
  if (event.defaultPrevented) {
    return;
  }

  if (activeCellIndex === null) {
    return;
  }

  const imageFile = getImageFileFromClipboardData(event.clipboardData);
  const text = getPlainTextFromClipboardData(event.clipboardData);

  if (!imageFile && !text) {
    return;
  }

  event.preventDefault();

  if (imageFile && activePasteMode !== "text") {
    setActiveCell(activeCellIndex, null);
    await applyImageToCell(activeCellIndex, imageFile);
    return;
  }

  if (text) {
    setActiveCell(activeCellIndex, null);
    applyTextToCell(activeCellIndex, text);
    return;
  }

  if (imageFile) {
    setActiveCell(activeCellIndex, null);
    await applyImageToCell(activeCellIndex, imageFile);
  }
});

function bootstrap() {
  const searchParams = new URLSearchParams(window.location.search);

  if (!hasApiParams(searchParams)) {
    applySettings(loadSettings());
    setApiNotice({ applied: [], blocked: [] });
    renderPages();
    return;
  }

  cellItems.clear();
  cellFontScales.clear();
  activeCellIndex = null;
  activePasteMode = null;
  applySettings({ ...DEFAULT_SETTINGS });

  const result = applyApiParams(searchParams);
  setApiNotice(result);
  renderPages({ persist: false });
}

bootstrap();
