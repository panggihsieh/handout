const STORAGE_KEY = "rowcolpage.v3.settings";

function getTodayLocalDateValue() {
  const now = new Date();
  const localNow = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return localNow.toISOString().slice(0, 10);
}

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
const signatureToggle = document.querySelector("#signatureToggle");
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
    fontScale: currentFontScale,
    showSignature: getSignatureVisible(),
  };
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

function renderPages() {
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
  pagesRoot.className = "pages";
  updateSignatureVisibility(settings.showSignature);
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
