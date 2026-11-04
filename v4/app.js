const STORAGE_KEY = "rowcolpage.v4.settings";

function getTodayLocalDateValue() {
  const now = new Date();
  const localNow = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return localNow.toISOString().slice(0, 10);
}

const DEFAULT_SETTINGS = {
  title: "大南阿嬤國小",
  className: "",
  studentName: "",
  date: getTodayLocalDateValue(),
  startNumber: 1,
  pageCount: 1,
  columnCount: 2,
  rowCount: 4,
  fontScale: 120,
  showSignature: true,
  showAnswers: false,
  twoQuestions: false,
};



const cellItems = new Map();
const cellAnswers = new Map();
const cellFontScales = new Map();
const cellBindings = new Map();
let activeCellIndex = null;
let activePasteMode = null;
const pageCountsByMode = new Map();

const titleInput = document.querySelector("#titleInput");
const classInput = document.querySelector("#classInput");
const nameInput = document.querySelector("#nameInput");
const dateInput = document.querySelector("#dateInput");
const startNumberInput = document.querySelector("#startNumberInput");
const pageCountInput = document.querySelector("#pageCountInput");
const rowCountInput = document.querySelector("#rowCountInput");
const signatureToggle = document.querySelector("#signatureToggle");
const answerToggle = document.querySelector("#answerToggle");
const twoQuestionToggle = document.querySelector("#twoQuestionToggle");
const resetButton = document.querySelector("#resetButton");
const printButton = document.querySelector("#printButton");
const fontScaleDownButton = document.querySelector("#fontScaleDownButton");
const fontScaleUpButton = document.querySelector("#fontScaleUpButton");
const pagesRoot = document.querySelector("#pages");
const pageTemplate = document.querySelector("#pageTemplate");
const cellTemplate = document.querySelector("#cellTemplate");
let currentFontScale = DEFAULT_SETTINGS.fontScale;

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

function getAnswersVisible() {
  return answerToggle.getAttribute("aria-pressed") === "true";
}

function getTwoQuestionsEnabled() {
  return twoQuestionToggle.getAttribute("aria-pressed") === "true";
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
  currentFontScale = clampNumber(settings.fontScale, 70, 180, DEFAULT_SETTINGS.fontScale);
  updateSignatureVisibility(settings.showSignature);
  updateAnswerVisibility(settings.showAnswers);
  updateTwoQuestionMode(settings.twoQuestions);
}

function collectSettings() {
  return {
    title: normalizeTitle(titleInput.value),
    className: classInput ? classInput.value.trim() : "",
    studentName: nameInput.value.trim(),
    date: dateInput.value || getTodayLocalDateValue(),
    startNumber: clampNumber(startNumberInput.value, 1, 1000000, DEFAULT_SETTINGS.startNumber),
    pageCount: clampNumber(pageCountInput.value, 1, getTwoQuestionsEnabled() ? 50 : 100, DEFAULT_SETTINGS.pageCount),
    columnCount: 2,
    rowCount: clampNumber(rowCountInput.value, 1, 12, DEFAULT_SETTINGS.rowCount),
    fontScale: currentFontScale,
    showSignature: getSignatureVisible(),
    showAnswers: getAnswersVisible(),
    twoQuestions: getTwoQuestionsEnabled(),
  };
}

function updateSignatureVisibility(showSignature) {
  pagesRoot.classList.toggle("show-signature", showSignature);
  pagesRoot.classList.toggle("hide-signature", !showSignature);
  signatureToggle.textContent = showSignature ? "on" : "off";
  signatureToggle.setAttribute("aria-pressed", String(showSignature));
}

function updateAnswerVisibility(showAnswers) {
  if (!showAnswers && document.activeElement?.closest(".work-pane-body")) {
    document.activeElement.blur();
  }
  pagesRoot.classList.toggle("show-answers", showAnswers);
  pagesRoot.classList.toggle("hide-answers", !showAnswers);
  answerToggle.textContent = showAnswers ? "教師版：顯示" : "學生版：隱藏";
  answerToggle.setAttribute(
    "aria-label",
    showAnswers ? "計算程序區解答目前顯示，按下切換為學生版" : "計算程序區解答目前隱藏，按下切換為教師版",
  );
  answerToggle.setAttribute("aria-pressed", String(showAnswers));
}

function updateTwoQuestionMode(enabled) {
  pagesRoot.classList.toggle("two-questions", enabled);
  pageCountInput.max = enabled ? "50" : "100";
  twoQuestionToggle.textContent = enabled ? "on" : "off";
  twoQuestionToggle.setAttribute("aria-pressed", String(enabled));
  twoQuestionToggle.setAttribute("aria-label", `左右皆為題目：${enabled ? "開啟" : "關閉"}`);
  answerToggle.closest(".answer-mode-field").hidden = enabled;
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

function normalizeMathDelimiters(sourceText) {
  // Normalize escaped outer pairs, preserving TeX line breaks inside them.
  return sourceText.trim().replace(
    /\\\\\(([\s\S]*?)\\\\\)|\\\\\[([\s\S]*?)\\\\\]/g,
    (_, inlineMath, displayMath) => inlineMath !== undefined
      ? `\\(${inlineMath}\\)`
      : `\\[${displayMath}\\]`,
  );
}

function renderMathMarkdown(container, sourceText) {
  const markdownSource = normalizeMathDelimiters(sourceText);

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

  // Protect TeX delimiters and contents from Markdown's escape/format rules.
  const mathSpans = [];
  let mathTokenPrefix = "HANDOUTMATH";
  while (markdownSource.includes(mathTokenPrefix)) {
    mathTokenPrefix += "X";
  }
  const protectedSource = markdownSource.replace(
    /\$\$[\s\S]+?\$\$|\\\[[\s\S]+?\\\]|\\\([\s\S]+?\\\)|(?<!\\)\$(?!\$)(?:\\[\s\S]|[^$\\])+?\$/g,
    (math) => `${mathTokenPrefix}${mathSpans.push(math) - 1}END`,
  );
  const html = window.marked?.parse
    ? window.marked.parse(protectedSource)
    : `<p>${escapeHtml(protectedSource)}</p>`;

  container.innerHTML = html.replace(
    new RegExp(`${mathTokenPrefix}(\\d+)END`, "g"),
    (_, index) => escapeHtml(mathSpans[Number(index)]),
  );

  renderInlineMath(container);
}

function renderInlineMath(container) {
  if (!window.renderMathInElement) return;

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

const SVG_NAMESPACE = "http://www.w3.org/2000/svg";
const SVG_ELEMENTS = new Set([
  "svg", "g", "path", "circle", "ellipse", "rect", "line", "polyline", "polygon",
  "text", "tspan", "title", "desc", "defs", "marker", "use", "symbol",
  "lineargradient", "radialgradient", "stop", "clippath",
]);
const SVG_ATTRIBUTES = new Set([
  "viewbox", "preserveaspectratio", "width", "height", "x", "y", "x1", "y1", "x2", "y2",
  "cx", "cy", "r", "rx", "ry", "d", "points", "fill", "fill-opacity", "stroke",
  "stroke-width", "stroke-linecap", "stroke-linejoin", "stroke-dasharray", "stroke-dashoffset",
  "stroke-opacity", "opacity", "transform", "font-size", "font-family", "font-weight",
  "font-style", "text-anchor", "dominant-baseline", "id", "href", "offset", "stop-color", "stop-opacity",
  "clip-path", "marker-start", "marker-end",
]);

function sanitizeSvg(source) {
  const parsed = new DOMParser().parseFromString(source, "image/svg+xml");
  const root = parsed.documentElement;
  if (root.localName !== "svg" || parsed.querySelector("parsererror")) {
    throw new Error("SVG 必須是有效的 <svg> 元素");
  }

  const safeDocument = document.implementation.createDocument(SVG_NAMESPACE, "svg");
  const copySafe = (from, to) => {
    for (const attribute of from.attributes) {
      const name = attribute.localName.toLowerCase();
      const value = attribute.value.trim();
      if (attribute.prefix) continue;
      if (!SVG_ATTRIBUTES.has(name)) continue;
      if (name === "href" && !/^#[\w:.-]+$/.test(value)) continue;
      if (/url\s*\(/i.test(value) && !/^url\(\s*#[\w:.-]+\s*\)$/i.test(value)) continue;
      if (/javascript:|data:|https?:/i.test(value)) continue;
      to.setAttribute(attribute.name, value);
    }

    for (const child of from.childNodes) {
      if (child.nodeType === Node.TEXT_NODE || child.nodeType === Node.CDATA_SECTION_NODE) {
        to.appendChild(safeDocument.createTextNode(child.textContent));
      } else if (child.nodeType === Node.ELEMENT_NODE && SVG_ELEMENTS.has(child.localName.toLowerCase())) {
        const safeChild = safeDocument.createElementNS(SVG_NAMESPACE, child.localName);
        copySafe(child, safeChild);
        to.appendChild(safeChild);
      }
    }
  };

  copySafe(root, safeDocument.documentElement);
  return new XMLSerializer().serializeToString(safeDocument.documentElement);
}

// 僅在原始 JSON 解析失敗時，修復複製自聊天介面的常見格式污染。
function parseJsonWithRepair(source) {
  try {
    return JSON.parse(source);
  } catch {
    const cleaned = source.trim()
      .replace(/^```(?:json)?\s*\r?\n([\s\S]*?)\r?\n```$/i, "$1")
      .replace(/\\[ \t]*\r?\n/g, "\n")
      .replace(/&#(?:x0*20|0*32);/gi, " ");
    try {
      return JSON.parse(cleaned);
    } catch {
      const repaired = cleaned
        // Markdown 將 JSON 的跳脫引號再加了一層反斜線。
        .replace(/\\{2}"/g, '\\"')
        // LaTeX 命令前的三個反斜線應為 JSON 中的兩個。
        .replace(/\\{3}(?=[A-Za-z])/g, '\\\\')
        // 移除 Markdown 對 SVG、網址等標點添加的無效跳脫。
        .replace(/\\([<>:./])/g, "$1");
      try {
        return JSON.parse(repaired);
      } catch {
        throw new Error("不是有效的 JSON，自動修復後仍無法解析，請檢查引號、括號與跳脫符號");
      }
    }
  }
}

function parseQuestionJson(source) {
  const data = parseJsonWithRepair(source);

  let entries;
  if (Array.isArray(data)) {
    entries = data;
  } else if (data && typeof data === "object" && Array.isArray(data.blocks)) {
    entries = data.blocks;
  } else if (data && typeof data === "object" && typeof data.type === "string") {
    entries = [data];
  } else if (data && typeof data === "object") {
    entries = ["text", "latex", "katex", "svg"]
      .filter((type) => data[type] !== undefined)
      .map((type) => ({ type, value: data[type] }));
  }

  if (!entries?.length) throw new Error("請提供 text、latex、svg 或 blocks");

  return entries.map((entry) => {
    const type = entry?.type === "katex" ? "latex" : entry?.type;
    if (!["text", "latex", "svg"].includes(type) || typeof entry?.value !== "string" || !entry.value.trim()) {
      throw new Error("每個區塊須有 text、latex 或 svg 類型及非空文字 value");
    }
    return { type, value: type === "svg" ? sanitizeSvg(entry.value) : entry.value };
  });
}

function renderQuestionJson(container, source, fontScale) {
  const wrapper = document.createElement("div");
  wrapper.className = "problem-json";
  wrapper.style.fontSize = `${getQuestionBaseSize(fontScale).toFixed(3)}rem`;

  for (const block of parseQuestionJson(source)) {
    if (block.type === "svg") {
      const image = document.createElement("img");
      image.className = "problem-json-svg";
      image.alt = "JSON SVG 圖形";
      image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(block.value)}`;
      image.style.transform = `scale(${(fontScale / 120).toFixed(3)})`;
      wrapper.appendChild(image);
    } else if (block.type === "latex") {
      const latex = document.createElement("span");
      latex.className = "problem-json-latex";
      if (window.katex?.render) {
        window.katex.render(block.value, latex, { displayMode: false, throwOnError: false, trust: false });
      } else {
        latex.textContent = block.value;
      }
      wrapper.appendChild(latex);
    } else {
      const textBlock = document.createElement("span");
      textBlock.className = "problem-json-text";
      textBlock.textContent = normalizeMathDelimiters(block.value);
      renderInlineMath(textBlock);
      wrapper.appendChild(textBlock);
    }
  }

  container.appendChild(wrapper);
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
  return cellFontScales.get(cellIndex) ?? currentFontScale;
}

function updateCellFontScale(cellIndex, delta) {
  const nextScale = clampNumber(getCellFontScale(cellIndex) + delta, 70, 180, DEFAULT_SETTINGS.fontScale);
  cellFontScales.set(cellIndex, nextScale);

  const binding = cellBindings.get(cellIndex);
  const item = cellItems.get(cellIndex);

  if (item) {
    item.fontScale = nextScale;
  }

  if (!binding || !item) {
    return;
  }

  if (item.type === "image") {
    const image = binding.content.querySelector(".problem-image");
    if (image) {
      image.style.transform = `scale(${(nextScale / 120).toFixed(3)})`;
    }
    return;
  }

  if (item.type === "json") {
    renderCellContent(binding.content, binding.pane, item, cellIndex);
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
  pane.classList.toggle("has-json", Boolean(item && item.type === "json"));

  if (!item?.value) {
    return;
  }

  if (item.type === "image") {
    const image = document.createElement("img");
    image.className = "problem-image";
    image.alt = "題目圖片";
    image.src = item.value;
    image.style.transform = `scale(${(getCellFontScale(cellIndex) / 120).toFixed(3)})`;
    container.appendChild(image);
    return;
  }

  if (item.type === "json") {
    renderQuestionJson(container, item.value, getCellFontScale(cellIndex));
    return;
  }

  const textBlock = document.createElement("div");
  textBlock.className = "problem-text";
  renderMathMarkdown(textBlock, item.value);
  container.appendChild(textBlock);
  const textScale = cellIndex === null ? (item.fontScale ?? DEFAULT_SETTINGS.fontScale) : getCellFontScale(cellIndex);
  requestAnimationFrame(() => fitQuestionText(container, textBlock, textScale));
}

function renderAnswerContent(container, item) {
  container.closest(".work-pane-body").classList.toggle("has-answer", Boolean(item?.value));
  container.replaceChildren();

  if (!item?.value) {
    return;
  }

  if (item.type === "image") {
    const image = document.createElement("img");
    image.className = "work-answer-image";
    image.alt = "解答圖片";
    image.src = item.value;
    container.appendChild(image);
    return;
  }

  const textBlock = document.createElement("div");
  textBlock.className = "problem-text work-answer-text";
  // Use an explicit final-answer label rather than guessing from numbers.
  const finalLabels = [...item.value.matchAll(/(^|\n|[。！？])\s*(?:(?:所以|因此)[，,]?)?(?:\*\*)?(?:最後答案|答案|答)(?:\*\*)?\s*(?:[:：]|是|為)/g)];
  const finalLabel = finalLabels.at(-1);
  if (finalLabel) {
    const splitAt = finalLabel.index + finalLabel[1].length;
    renderMathMarkdown(textBlock, item.value.slice(0, splitAt));
    const finalAnswer = document.createElement("div");
    finalAnswer.className = "answer-final";
    renderMathMarkdown(finalAnswer, item.value.slice(splitAt));
    textBlock.appendChild(finalAnswer);
  } else {
    renderMathMarkdown(textBlock, item.value);
  }
  container.appendChild(textBlock);
  requestAnimationFrame(() => fitAnswerText(container, textBlock));
}

function refreshQuestionTextSizing() {
  cellBindings.forEach(({ content, pane, answerContent }, cellIndex) => {
    const item = cellItems.get(cellIndex);
    const textBlock = content.querySelector(".problem-text");

    if (item?.type === "text" && textBlock && pane.classList.contains("has-question")) {
      fitQuestionText(content, textBlock, item.fontScale ?? getCellFontScale(cellIndex));
    }

    const answerText = answerContent.querySelector(".work-answer-text");
    if (answerText) {
      fitAnswerText(answerContent, answerText);
    }
  });
}

function updateActiveState() {
  cellBindings.forEach(({ pane, imagePasteButton, textPasteButton, jsonPasteButton }, cellIndex) => {
    const isActive = cellIndex === activeCellIndex;
    pane.classList.toggle("is-paste-target", isActive);
    imagePasteButton.classList.toggle("is-active", isActive && activePasteMode === "image");
    textPasteButton.classList.toggle("is-active", isActive && activePasteMode === "text");
    jsonPasteButton.classList.toggle("is-active", isActive && activePasteMode === "json");
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
      item.type === "text" || item.type === "json"
        ? clampNumber(item.fontScale ?? getCellFontScale(cellIndex), 70, 180, DEFAULT_SETTINGS.fontScale)
        : getCellFontScale(cellIndex),
  };

  if (item.fontScale !== undefined) {
    cellFontScales.set(cellIndex, normalizedItem.fontScale);
  }

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

function applyJsonToCell(cellIndex, source) {
  try {
    const blocks = parseQuestionJson(source);
    return setCellItem(cellIndex, {
      type: "json",
      value: JSON.stringify({ blocks }),
      fontScale: getCellFontScale(cellIndex),
    });
  } catch (error) {
    alert(`JSON 題目格式錯誤：${error.message}`);
    return false;
  }
}

function setCellAnswer(cellIndex, item) {
  const value = item?.value?.trim() ?? "";
  if (!value) {
    return false;
  }

  const answer = { type: item.type, value };
  cellAnswers.set(cellIndex, answer);
  const binding = cellBindings.get(cellIndex);
  if (binding) {
    renderAnswerContent(binding.answerContent, answer);
    binding.answerClearButton.hidden = false;
  }
  if (!getAnswersVisible()) {
    updateAnswerVisibility(true);
    saveSettings(collectSettings());
  }
  return true;
}

async function applyImageToAnswer(cellIndex, imageBlob) {
  const imageUrl = await readBlobAsDataUrl(imageBlob);
  return setCellAnswer(cellIndex, { type: "image", value: imageUrl });
}

function applyTextToAnswer(cellIndex, text) {
  return setCellAnswer(cellIndex, { type: "text", value: text });
}

async function handlePasteForCell(cellIndex, event) {
  const imageFile = getImageFileFromClipboardData(event.clipboardData);
  const text = getPlainTextFromClipboardData(event.clipboardData);

  if (!imageFile && !text) {
    return false;
  }

  event.preventDefault();
  event.stopPropagation();

  if (activePasteMode === "json") {
    if (text && applyJsonToCell(cellIndex, text)) setActiveCell(cellIndex, null);
    return true;
  }

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

async function handlePasteForAnswer(cellIndex, event, pasteMode) {
  event.stopPropagation();
  const imageFile = getImageFileFromClipboardData(event.clipboardData);
  const text = getPlainTextFromClipboardData(event.clipboardData);

  if (!imageFile && !text) {
    return false;
  }

  event.preventDefault();
  if (imageFile && pasteMode !== "text") {
    await applyImageToAnswer(cellIndex, imageFile);
  } else if (text) {
    applyTextToAnswer(cellIndex, text);
  } else if (imageFile) {
    await applyImageToAnswer(cellIndex, imageFile);
  }
  return true;
}

function bindCell(cell, cellIndex) {
  const pane = cell.querySelector(".question-pane");
  const content = cell.querySelector(".cell-content");
  const answerPane = cell.querySelector(".work-pane-body");
  const answerContent = cell.querySelector(".work-answer-content");
  const answerImagePasteButton = cell.querySelector(".answer-image-paste-button");
  const answerTextPasteButton = cell.querySelector(".answer-text-paste-button");
  const answerClearButton = cell.querySelector(".answer-clear-button");
  const imagePasteButton = cell.querySelector(".cell-image-paste-button");
  const textPasteButton = cell.querySelector(".cell-text-paste-button");
  const jsonPasteButton = cell.querySelector(".cell-json-paste-button");
  const fontDecreaseButton = cell.querySelector(".cell-font-decrease-button");
  const fontIncreaseButton = cell.querySelector(".cell-font-increase-button");
  const clearButton = cell.querySelector(".cell-clear-button");
  const pasteInput = document.createElement("textarea");
  const answerPasteInput = document.createElement("textarea");
  let answerPasteMode = null;
  const answerNumber = cell.querySelector(".work-pane-number").textContent;

  pane.tabIndex = 0;
  pane.setAttribute("title", "先點按鈕，再按 Ctrl+V 貼上圖片或文字");
  pasteInput.className = "cell-paste-input";
  pasteInput.setAttribute("aria-label", "貼上輸入框");
  pasteInput.setAttribute("autocomplete", "off");
  pasteInput.setAttribute("spellcheck", "false");
  pane.appendChild(pasteInput);
  answerPane.tabIndex = 0;
  answerPane.setAttribute("title", "先點按鈕，再按 Ctrl+V 貼上解答");
  answerImagePasteButton.setAttribute("aria-label", `第 ${answerNumber} 題解答插入截圖`);
  answerTextPasteButton.setAttribute("aria-label", `第 ${answerNumber} 題解答貼上文字`);
  answerClearButton.setAttribute("aria-label", `清除第 ${answerNumber} 題解答`);
  answerPasteInput.className = "cell-paste-input";
  answerPasteInput.setAttribute("aria-label", "解答貼上輸入框");
  answerPane.appendChild(answerPasteInput);

  cellBindings.set(cellIndex, {
    pane,
    content,
    answerContent,
    answerClearButton,
    imagePasteButton,
    textPasteButton,
    jsonPasteButton,
    fontDecreaseButton,
    fontIncreaseButton,
    clearButton,
    pasteInput,
  });

  renderCellContent(content, pane, cellItems.get(cellIndex), cellIndex);
  renderAnswerContent(answerContent, cellAnswers.get(cellIndex));
  clearButton.hidden = !cellItems.has(cellIndex);
  answerClearButton.hidden = !cellAnswers.has(cellIndex);
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

  answerPane.addEventListener("click", (event) => {
    event.stopPropagation();
    setActiveCell(null, null);
  });
  answerPane.addEventListener("paste", async (event) => {
    await handlePasteForAnswer(cellIndex, event, answerPasteMode);
    answerPasteMode = null;
    answerPasteInput.value = "";
  });

  answerImagePasteButton.addEventListener("click", async () => {
    answerPasteMode = "image";
    try {
      const items = await navigator.clipboard.read();
      for (const item of items) {
        for (const type of item.types) {
          if (type.startsWith("image/")) {
            await applyImageToAnswer(cellIndex, await item.getType(type));
            answerPasteMode = null;
            return;
          }
        }
      }
      alert("剪貼簿中沒有圖片！");
    } catch (error) {
      console.error("Failed to read answer image:", error);
      answerPasteInput.focus();
      alert("無法直接讀取剪貼簿。請按 Ctrl+V 貼上解答圖片。");
    }
  });

  answerTextPasteButton.addEventListener("click", async () => {
    answerPasteMode = "text";
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        applyTextToAnswer(cellIndex, text);
        answerPasteMode = null;
      } else {
        alert("剪貼簿中沒有文字！");
      }
    } catch (error) {
      console.error("Failed to read answer text:", error);
      answerPasteInput.focus();
      alert("無法直接讀取剪貼簿。請按 Ctrl+V 貼上解答文字。");
    }
  });

  answerClearButton.addEventListener("click", () => {
    cellAnswers.delete(cellIndex);
    renderAnswerContent(answerContent, null);
    answerClearButton.hidden = true;
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

  jsonPasteButton.addEventListener("click", async () => {
    setActiveCell(cellIndex, "json");
    try {
      const source = await navigator.clipboard.readText();
      if (!source) {
        alert("剪貼簿中沒有 JSON 文字！");
      } else if (applyJsonToCell(cellIndex, source)) {
        setActiveCell(cellIndex, null);
      }
    } catch (error) {
      console.error("Failed to read JSON clipboard:", error);
      pasteInput.focus();
      alert("無法直接讀取剪貼簿。請按 Ctrl+V 貼上 JSON。");
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

function renderPages() {
  const settings = collectSettings();
  const title = settings.title;
  const studentName = withFallback(settings.studentName, "________________");
  const displayDate = formatDisplayDate(settings.date);
  const cellsPerPage = settings.rowCount;
  const columns = settings.twoQuestions ? 2 : 1;
  const questionsPerPage = cellsPerPage * columns;
  const totalCells = settings.pageCount * questionsPerPage;
  const layoutLabel = `${settings.twoQuestions ? "雙欄" : "單欄"} / 每頁 ${questionsPerPage} 題`;

  if (activeCellIndex !== null && activeCellIndex >= totalCells) {
    activeCellIndex = null;
  }

  pagesRoot.replaceChildren();
  cellBindings.clear();
  pagesRoot.className = "pages";
  updateSignatureVisibility(settings.showSignature);
  updateAnswerVisibility(settings.showAnswers);
  updateTwoQuestionMode(settings.twoQuestions);
  saveSettings(settings);

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
    grid.style.gridTemplateColumns = `repeat(${columns}, minmax(0, 1fr))`;
    grid.style.gridTemplateRows = `repeat(${settings.rowCount}, minmax(0, 1fr))`;

    if (pageIndex > 0) {
      page.classList.add("page-following");
      pageHeader.remove();
    }

    for (let cellIndex = 0; cellIndex < cellsPerPage; cellIndex += 1) {
      for (let side = 0; side < columns; side += 1) {
        const cellFragment = cellTemplate.content.cloneNode(true);
        const cellElement = cellFragment.querySelector(".cell");
        const itemIndex = pageIndex * questionsPerPage + cellIndex * columns + side;
        const number = settings.startNumber + itemIndex;

        cellFragment.querySelector(".cell-number").textContent = number;
        cellFragment.querySelector(".work-pane-number").textContent = number;
        bindCell(cellElement, itemIndex);
        grid.appendChild(cellFragment);
      }
    }

    pagesRoot.appendChild(page);
  }
}

[titleInput, classInput, nameInput, dateInput, startNumberInput, pageCountInput, rowCountInput]
  .filter(Boolean)
  .forEach((element) => {
    element.addEventListener("input", renderPages);
    element.addEventListener("change", renderPages);
  });

signatureToggle.addEventListener("click", () => {
  updateSignatureVisibility(!getSignatureVisible());
  renderPages();
});

answerToggle.addEventListener("click", () => {
  updateAnswerVisibility(!getAnswersVisible());
  saveSettings(collectSettings());
});

twoQuestionToggle.addEventListener("click", () => {
  const wasDual = getTwoQuestionsEnabled();
  const currentPages = collectSettings().pageCount;
  const nextDual = !wasDual;
  pageCountsByMode.set(wasDual, currentPages);
  const preferredPages = pageCountsByMode.get(nextDual) ?? (nextDual ? Math.ceil(currentPages / 2) : currentPages);
  const lastOccupied = Math.max(-1, ...cellItems.keys(), ...cellAnswers.keys());
  const rowsPerPage = clampNumber(rowCountInput.value, 1, 12, DEFAULT_SETTINGS.rowCount);
  const requiredPages = Math.ceil((lastOccupied + 1) / (rowsPerPage * (nextDual ? 2 : 1)));
  pageCountInput.value = Math.max(1, preferredPages, requiredPages);
  updateTwoQuestionMode(nextDual);
  activeCellIndex = null;
  activePasteMode = null;
  renderPages();
});

resetButton.addEventListener("click", () => {
  localStorage.removeItem(STORAGE_KEY);
  cellItems.clear();
  cellAnswers.clear();
  cellFontScales.clear();
  pageCountsByMode.clear();
  activeCellIndex = null;
  applySettings({ ...DEFAULT_SETTINGS });
  renderPages();
});

printButton.addEventListener("click", () => {
  window.print();
});

if (fontScaleDownButton && fontScaleUpButton) {
  fontScaleDownButton.addEventListener("click", () => {
    currentFontScale = clampNumber(currentFontScale - 5, 70, 180, DEFAULT_SETTINGS.fontScale);
    saveSettings(collectSettings());
    refreshQuestionTextSizing();
  });
  fontScaleUpButton.addEventListener("click", () => {
    currentFontScale = clampNumber(currentFontScale + 5, 70, 180, DEFAULT_SETTINGS.fontScale);
    saveSettings(collectSettings());
    refreshQuestionTextSizing();
  });
}

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

  if (activePasteMode === "json") {
    if (text && applyJsonToCell(activeCellIndex, text)) setActiveCell(activeCellIndex, null);
    return;
  }

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

applySettings(loadSettings());
renderPages();

const copyJsonPromptButton = document.querySelector("#copyJsonPromptButton");
const mathJsonDialog = document.querySelector("#mathJsonDialog");
copyJsonPromptButton.addEventListener("click", () => {
  const frame = document.querySelector("#mathJsonFrame");
  if (!frame.getAttribute("src")) {
    const local = ["127.0.0.1", "localhost"].includes(location.hostname);
    frame.src = local ? "http://127.0.0.1:5185/?v=20261104-ai-monitor" : "../zj454/public/index.html?v=20261104-ai-monitor";
  }
  mathJsonDialog.showModal();
});
document.querySelector("#closeMathJsonDialog").addEventListener("click", () => mathJsonDialog.close());
const aiConnectionLabels = { locked: 'AI：未設定或未解鎖', ready: 'AI：已解鎖，待驗證', checking: 'AI：連線中…', connected: 'AI：最近連線成功', verified: 'AI：輕量驗證成功', error: 'AI：請求失敗', offline: 'AI：網路離線' };
function updateAiConnection(state) {
  if (!Object.hasOwn(aiConnectionLabels, state)) return;
  const effective = navigator.onLine === false ? 'offline' : state;
  document.querySelector('#aiConnectionButton').dataset.state = effective;
  document.querySelector('#aiConnectionText').textContent = aiConnectionLabels[effective];
  document.querySelector('#aiConnectionIcon').src = ['connected', 'verified'].includes(effective) ? 'assets/connection.gif' : 'assets/no-connection.png';
}
window.addEventListener('message', event => {
  const frame = document.querySelector('#mathJsonFrame');
  if (!frame.getAttribute('src') || event.source !== frame.contentWindow || event.origin !== new URL(frame.src).origin) return;
  if (event.data?.type === 'handout-ai-connection') updateAiConnection(event.data.state);
  else if (event.data?.type === 'handout-ai-monitor' && typeof event.data.enabled === 'boolean') {
    const button = document.querySelector('#aiMonitorButton');
    button.setAttribute('aria-pressed', String(event.data.enabled));
    button.textContent = !event.data.enabled ? '連續檢查：關（省 token）' : event.data.waitingForUnlock ? '停止連續檢查（待解鎖）' : '停止連續檢查（省 token）';
  }
  else if (event.data?.type === 'handout-ai-open-settings') {
    if (!mathJsonDialog.open) mathJsonDialog.showModal();
    frame.contentWindow.postMessage({ type: 'handout-ai-focus-settings' }, event.origin);
  }
});
document.querySelector('#aiConnectionButton').addEventListener('click', async () => {
  const button = document.querySelector('#aiConnectionButton');
  button.disabled = true;
  try {
    const frame = await ensureAnswerModule();
    frame.contentWindow.postMessage({ type: 'handout-ai-connect' }, new URL(frame.src).origin);
  } catch {
    updateAiConnection('error'); copyJsonPromptButton.click();
  } finally { button.disabled = false; }
});
document.querySelector('#aiMonitorButton').addEventListener('click', async () => {
  try {
    const frame = await ensureAnswerModule();
    frame.contentWindow.postMessage({ type: 'handout-ai-monitor-toggle' }, new URL(frame.src).origin);
  } catch { updateAiConnection('error'); }
});
window.addEventListener('offline', () => updateAiConnection('offline'));
window.addEventListener('online', () => {
  updateAiConnection('locked');
  const frame = document.querySelector('#mathJsonFrame');
  if (frame.getAttribute('src')) frame.contentWindow.postMessage({ type: 'handout-ai-connection-query' }, new URL(frame.src).origin);
});
document.querySelector("#clearMathJsonDialog").addEventListener("click", () => {
  const frame = document.querySelector("#mathJsonFrame");
  if (frame.getAttribute("src")) frame.contentWindow.postMessage({ type: "handout-clear-question" }, new URL(frame.src).origin);
});

function fitAnswerText(container,textBlock) {
  if(!container.clientWidth||!container.clientHeight)return;
  textBlock.style.lineHeight='1.28';
  const max=2*(currentFontScale/120)*parseFloat(getComputedStyle(document.documentElement).fontSize);
  let low=.5,high=max;
  for(let i=0;i<14;i++){
    const size=(low+high)/2;textBlock.style.fontSize=size+'px';
    if(textBlock.scrollHeight<=container.clientHeight&&textBlock.scrollWidth<=container.clientWidth&&!Array.from(textBlock.querySelectorAll('.katex-display')).some(node=>node.scrollWidth>node.clientWidth))low=size;else high=size;
  }
  textBlock.style.fontSize=low+'px';
}
const answerResizeObserver=new ResizeObserver(entries=>entries.forEach(({target})=>{
  const text=target.querySelector('.work-answer-text');if(text)fitAnswerText(target,text);
}));
function observeAnswers(){answerResizeObserver.disconnect();document.querySelectorAll('.work-answer-content').forEach(node=>answerResizeObserver.observe(node));}
observeAnswers();new MutationObserver(observeAnswers).observe(pagesRoot,{childList:true,subtree:true});
document.fonts.ready.then(refreshQuestionTextSizing);
window.addEventListener('beforeprint',refreshQuestionTextSizing);
window.addEventListener('afterprint',()=>requestAnimationFrame(refreshQuestionTextSizing));

async function ensureAnswerModule(){
  const frame=document.querySelector('#mathJsonFrame');
  if(frame.dataset.ready==='true')return frame;
  await new Promise((resolve,reject)=>{
    const timeout=setTimeout(()=>reject(Error('模組載入逾時，請先開啟 JSON 轉換與預覽。')),20000);
    frame.addEventListener('load',()=>{clearTimeout(timeout);frame.dataset.ready='true';resolve();},{once:true});
    if(!frame.getAttribute('src')){
      const local=['127.0.0.1','localhost'].includes(location.hostname);
      frame.src=local?'http://127.0.0.1:5185/?v=20261104-ai-monitor':'../zj454/public/index.html?v=20261104-ai-monitor';
    }
  });return frame;
}
document.querySelector('#mathJsonFrame').addEventListener('load',event=>event.target.dataset.ready='true');
ensureAnswerModule().then(frame => frame.contentWindow.postMessage({ type: 'handout-ai-connection-query' }, new URL(frame.src).origin)).catch(() => updateAiConnection('error'));
async function questionForAnswer(item){
  if(item.type==='image')return {text:'請解答這張圖片中的題目。',image:item.value};
  if(item.type!=='json')return {text:item.value,image:null};
  const blocks=parseQuestionJson(item.value),figures=blocks.filter(b=>b.type==='svg');
  if(!figures.length)return {text:JSON.stringify({blocks}),image:null};
  const pictures=await Promise.all(figures.map(async block=>{
    const image=new Image();image.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(block.value);await image.decode();return image;
  }));
  const canvas=document.createElement('canvas');canvas.width=900;canvas.height=pictures.length*500;
  const ctx=canvas.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,canvas.width,canvas.height);
  pictures.forEach((image,i)=>{const scale=Math.min(860/image.naturalWidth,460/image.naturalHeight);const w=image.naturalWidth*scale,h=image.naturalHeight*scale;ctx.drawImage(image,(900-w)/2,i*500+(500-h)/2,w,h);});
  return {text:JSON.stringify({blocks}),image:canvas.toDataURL('image/png')};
}
function requestAiAnswer(frame,question){
  return new Promise((resolve,reject)=>{
    const id=crypto.randomUUID(),origin=new URL(frame.src,location.href).origin;
    const timeout=setTimeout(()=>{window.removeEventListener('message',receive);reject(Error('解答逾時，請稍後重試。'));},200000);
    function receive(event){
      if(event.source!==frame.contentWindow||event.origin!==origin||event.data?.type!=='handout-solved'||event.data.id!==id)return;
      clearTimeout(timeout);window.removeEventListener('message',receive);
      if(event.data.error)reject(Error(event.data.error));else resolve(event.data.result);
    }
    window.addEventListener('message',receive);frame.contentWindow.postMessage({type:'handout-solve',id,question},origin);
  });
}
document.querySelector('#aiAnswerButton').addEventListener('click',async()=>{
  const button=document.querySelector('#aiAnswerButton'),status=document.querySelector('#aiAnswerStatus');
  if(getTwoQuestionsEnabled()){status.textContent='請先關閉「左右皆為題目」，右側才能放解答。';return;}
  const jobs=[...cellItems].filter(([index,item])=>item?.value&&cellBindings.has(index)&&!cellAnswers.has(index));
  if(!jobs.length){status.textContent='沒有待解答的題目（已有解答的格子會保留）。';return;}
  button.disabled=true;let completed=0;
  try{
    updateAnswerVisibility(true);saveSettings(collectSettings());
    const frame=await ensureAnswerModule();
    for(const [index,item] of jobs){
      status.textContent=`AI 解答中 ${completed+1}/${jobs.length}（可能計費）…`;
      const snapshot=JSON.stringify(item),question=await questionForAnswer(item),result=await requestAiAnswer(frame,question);
      if(!result||!['solved','needs_review'].includes(result.status)||typeof result.answer!=='string'||!result.answer.trim())throw Error('解答格式錯誤。');
      if(JSON.stringify(cellItems.get(index))!==snapshot||cellAnswers.has(index)||getTwoQuestionsEnabled())continue;
      setCellAnswer(index,{type:'text',value:(result.status==='needs_review'?'待核對：':'')+result.answer});completed++;
    }
    status.textContent=`已填入 ${completed} 題解答，請核對內容。`;
  }catch(error){status.textContent=`已填入 ${completed} 題；${error.message}`;if(/解鎖|金鑰|API 設定/.test(error.message))mathJsonDialog.showModal();}
  finally{button.disabled=false;}
});
