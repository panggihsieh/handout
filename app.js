const STORAGE_KEY = "rowcolpage.v3.settings";

const DEFAULT_SETTINGS = {
  title: "大南六甲",
  className: "",
  studentName: "",
  date: new Date().toISOString().slice(0, 10),
  startNumber: 1,
  pageCount: 1,
  columnCount: 2,
  rowCount: 4,
  fontScale: 110,
  guideMode: "none",
  showSignature: true,
};

const cellItems = new Map();
const cellBindings = new Map();
let activeCellIndex = null;

const titleInput = document.querySelector("#titleInput");
const classInput = document.querySelector("#classInput");
const nameInput = document.querySelector("#nameInput");
const dateInput = document.querySelector("#dateInput");
const startNumberInput = document.querySelector("#startNumberInput");
const pageCountInput = document.querySelector("#pageCountInput");
const rowCountInput = document.querySelector("#rowCountInput");
const fontScaleInput = document.querySelector("#fontScaleInput");
const guideSelect = document.querySelector("#guideSelect");
const signatureToggle = document.querySelector("#signatureToggle");
const resetButton = document.querySelector("#resetButton");
const printButton = document.querySelector("#printButton");
const pagesRoot = document.querySelector("#pages");
const pageTemplate = document.querySelector("#pageTemplate");
const cellTemplate = document.querySelector("#cellTemplate");

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

function getSignatureVisible() {
  return signatureToggle.getAttribute("aria-pressed") === "true";
}

function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return { ...DEFAULT_SETTINGS };
    }

    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

function saveSettings(settings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

function applySettings(settings) {
  titleInput.value = settings.title;
  if (classInput) {
    classInput.value = settings.className ?? "";
  }
  nameInput.value = settings.studentName;
  dateInput.value = settings.date;
  startNumberInput.value = settings.startNumber;
  pageCountInput.value = settings.pageCount;
  rowCountInput.value = settings.rowCount;
  fontScaleInput.value = settings.fontScale ?? DEFAULT_SETTINGS.fontScale;
  guideSelect.value = settings.guideMode;
  updateSignatureVisibility(settings.showSignature);
}

function collectSettings() {
  return {
    title: titleInput.value.trim() || DEFAULT_SETTINGS.title,
    className: classInput ? classInput.value.trim() : "",
    studentName: nameInput.value.trim(),
    date: dateInput.value,
    startNumber: clampNumber(startNumberInput.value, 1, 1000000, DEFAULT_SETTINGS.startNumber),
    pageCount: clampNumber(pageCountInput.value, 1, 50, DEFAULT_SETTINGS.pageCount),
    columnCount: 2,
    rowCount: clampNumber(rowCountInput.value, 1, 12, DEFAULT_SETTINGS.rowCount),
    fontScale: clampNumber(fontScaleInput.value, 70, 180, DEFAULT_SETTINGS.fontScale),
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
  signatureToggle.textContent = showSignature ? "顯示" : "隱藏";
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

async function readClipboardText() {
  if (!navigator.clipboard?.readText) {
    return "";
  }

  return (await navigator.clipboard.readText()).trim();
}

async function readClipboardImage() {
  if (!navigator.clipboard?.read) {
    return null;
  }

  const clipboardItems = await navigator.clipboard.read();

  for (const clipboardItem of clipboardItems) {
    const imageType = clipboardItem.types.find((type) => type.startsWith("image/"));

    if (imageType) {
      return clipboardItem.getType(imageType);
    }
  }

  return null;
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
  return 0.92 * (fontScale / 100);
}

function fitQuestionText(container, textBlock, fontScale = DEFAULT_SETTINGS.fontScale) {
  if (!container.clientWidth || !container.clientHeight) {
    return;
  }

  const shrinkStep = 0.08;
  const minSize = 0.62;
  let best = getQuestionBaseSize(fontScale);

  textBlock.style.fontSize = `${best}rem`;
  textBlock.style.lineHeight = best > 1 ? "1.4" : "1.32";

  while (!doesTextFit(container, textBlock) && best > minSize) {
    best = Math.max(minSize, best - shrinkStep);
    textBlock.style.fontSize = `${best}rem`;
    textBlock.style.lineHeight = best > 0.92 ? "1.38" : "1.28";
  }

  textBlock.classList.toggle("is-compact", best <= 0.84);
}

function renderCellContent(container, pane, item) {
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
  const currentSettings = collectSettings();
  requestAnimationFrame(() => fitQuestionText(container, textBlock, currentSettings.fontScale));
}

function refreshQuestionTextSizing() {
  const { fontScale } = collectSettings();

  cellBindings.forEach(({ content, pane }, cellIndex) => {
    const item = cellItems.get(cellIndex);

    if (!item || item.type !== "text") {
      return;
    }

    const textBlock = content.querySelector(".problem-text");

    if (!textBlock || !pane.classList.contains("has-question")) {
      return;
    }

    fitQuestionText(content, textBlock, fontScale);
  });
}

function updateActiveState() {
  cellBindings.forEach(({ pane, imagePasteButton, textPasteButton }, cellIndex) => {
    const isActive = cellIndex === activeCellIndex;
    pane.classList.toggle("is-paste-target", isActive);
    imagePasteButton.classList.toggle("is-active", isActive);
    textPasteButton.classList.toggle("is-active", isActive);
  });
}

function setActiveCell(cellIndex) {
  activeCellIndex = cellIndex;
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
  };

  cellItems.set(cellIndex, normalizedItem);

  const binding = cellBindings.get(cellIndex);
  if (binding) {
    renderCellContent(binding.content, binding.pane, normalizedItem);
    binding.clearButton.hidden = false;
  }

  return true;
}

async function applyImageToCell(cellIndex, fileOrBlob) {
  const imageUrl = await readBlobAsDataUrl(fileOrBlob);
  return setCellItem(cellIndex, { type: "image", value: imageUrl });
}

function applyTextToCell(cellIndex, text) {
  return setCellItem(cellIndex, { type: "text", value: text });
}

function bindCell(cell, cellIndex) {
  const pane = cell.querySelector(".question-pane");
  const content = cell.querySelector(".cell-content");
  const imagePasteButton = cell.querySelector(".cell-image-paste-button");
  const textPasteButton = cell.querySelector(".cell-text-paste-button");
  const clearButton = cell.querySelector(".cell-clear-button");

  pane.tabIndex = 0;
  pane.setAttribute("title", "點選這一格後可按 Ctrl+V 貼上題圖或題目");

  cellBindings.set(cellIndex, {
    pane,
    content,
    imagePasteButton,
    textPasteButton,
    clearButton,
  });

  renderCellContent(content, pane, cellItems.get(cellIndex));
  clearButton.hidden = !cellItems.has(cellIndex);
  updateActiveState();

  const activate = () => {
    setActiveCell(cellIndex);
  };

  cell.addEventListener("click", activate);
  pane.addEventListener("focus", activate);

  pane.addEventListener("paste", async (event) => {
    const imageFile = getImageFileFromClipboardData(event.clipboardData);
    const text = getPlainTextFromClipboardData(event.clipboardData);

    if (!imageFile && !text) {
      return;
    }

    event.preventDefault();
    setActiveCell(cellIndex);

    if (imageFile) {
      await applyImageToCell(cellIndex, imageFile);
      return;
    }

    if (text) {
      applyTextToCell(cellIndex, text);
    }
  });

  imagePasteButton.addEventListener("click", async () => {
    setActiveCell(cellIndex);

    try {
      const imageBlob = await readClipboardImage();

      if (!imageBlob) {
        window.alert("剪貼簿目前沒有圖片，請先複製題圖後再貼上。");
        return;
      }

      await applyImageToCell(cellIndex, imageBlob);
    } catch (error) {
      console.error(error);
      window.alert("目前無法直接讀取剪貼簿圖片，請改用 Ctrl+V 貼上題圖。");
    }
  });

  textPasteButton.addEventListener("click", async () => {
    setActiveCell(cellIndex);

    try {
      const text = await readClipboardText();

      if (!text) {
        window.alert("剪貼簿目前沒有文字題目，請先複製題目文字後再貼上。");
        return;
      }

      applyTextToCell(cellIndex, text);
    } catch (error) {
      console.error(error);
      window.alert("目前無法直接讀取剪貼簿文字，請改用 Ctrl+V 貼上題目。");
    }
  });

  clearButton.addEventListener("click", () => {
    cellItems.delete(cellIndex);
    renderCellContent(content, pane, null);
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
  updateGuideMode(settings.guideMode);
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

      cellNumber.textContent = settings.startNumber + itemIndex;
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

fontScaleInput.addEventListener("input", () => {
  saveSettings(collectSettings());
  renderPages();
  requestAnimationFrame(refreshQuestionTextSizing);
});

fontScaleInput.addEventListener("change", () => {
  saveSettings(collectSettings());
  renderPages();
  requestAnimationFrame(refreshQuestionTextSizing);
});

signatureToggle.addEventListener("click", () => {
  updateSignatureVisibility(!getSignatureVisible());
  renderPages();
});

resetButton.addEventListener("click", () => {
  localStorage.removeItem(STORAGE_KEY);
  cellItems.clear();
  activeCellIndex = null;
  applySettings({ ...DEFAULT_SETTINGS });
  renderPages();
});

printButton.addEventListener("click", () => {
  window.print();
});

document.addEventListener("paste", async (event) => {
  if (activeCellIndex === null) {
    return;
  }

  const imageFile = getImageFileFromClipboardData(event.clipboardData);
  const text = getPlainTextFromClipboardData(event.clipboardData);

  if (!imageFile && !text) {
    return;
  }

  event.preventDefault();

  if (imageFile) {
    await applyImageToCell(activeCellIndex, imageFile);
    return;
  }

  if (text) {
    applyTextToCell(activeCellIndex, text);
  }
});

applySettings(loadSettings());
renderPages();
