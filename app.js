const canvas = document.querySelector("#editor-canvas");
const ctx = canvas.getContext("2d", { willReadFrequently: true });

const STORAGE_KEY = "blackbelt-editor-session-v1";
const DB_NAME = "blackbelt-editor";
const DB_STORE = "session-assets";
const DB_IMAGE_KEY = "current-image";
const DB_ORIGINAL_KEY = "original-image";
const DB_WATERMARK_PREFIX = "watermark:";
const FONT_STACKS = {
  system: 'ui-sans-serif, -apple-system, BlinkMacSystemFont, "SF Pro Display", "Helvetica Neue", Arial, sans-serif',
  display: '"Avenir Next", "Futura", "Trebuchet MS", ui-sans-serif, sans-serif',
  serif: 'Georgia, "Times New Roman", Times, serif',
  mono: '"SFMono-Regular", "SF Mono", Consolas, "Liberation Mono", monospace',
  condensed: '"Arial Narrow", "Helvetica Neue Condensed", "Roboto Condensed", ui-sans-serif, sans-serif',
};

const appShell = document.querySelector(".app-shell");
const fileInput = document.querySelector("#file-input");
const dropZone = document.querySelector("#drop-zone");
const emptyState = document.querySelector("#empty-state");
const imageReadout = document.querySelector("#image-readout");
const cropSelectionEl = document.querySelector("#crop-selection");
const cropInlineEl = document.querySelector("#crop-inline");
const paddingInlineEl = document.querySelector("#padding-inline");
const resizeInlineEl = document.querySelector("#resize-inline");
const textInlineEl = document.querySelector("#text-inline");
const watermarkInlineEl = document.querySelector("#watermark-inline");
const overlayLayer = document.querySelector("#overlay-layer");
const compareDivider = document.querySelector("#compare-divider");
const downloadModal = document.querySelector("#download-modal");
const summaryEls = {
  fileName: document.querySelector("#summary-file-name"),
  original: document.querySelector("#summary-original"),
  output: document.querySelector("#summary-output"),
  estimated: document.querySelector("#summary-estimated"),
  delta: document.querySelector("#summary-delta"),
  background: document.querySelector("#summary-background"),
};

const controls = {
  brightness: document.querySelector("#brightness"),
  contrast: document.querySelector("#contrast"),
  saturation: document.querySelector("#saturation"),
  temperature: document.querySelector("#temperature"),
  vignette: document.querySelector("#vignette"),
  cropWidth: document.querySelector("#crop-width"),
  cropHeight: document.querySelector("#crop-height"),
  canvasPaddingTop: document.querySelector("#canvas-padding-top"),
  canvasPaddingRight: document.querySelector("#canvas-padding-right"),
  canvasPaddingBottom: document.querySelector("#canvas-padding-bottom"),
  canvasPaddingLeft: document.querySelector("#canvas-padding-left"),
  canvasBackground: document.querySelector("#canvas-background"),
  canvasTransparent: document.querySelector("#canvas-transparent"),
  resizeWidth: document.querySelector("#resize-width"),
  resizeHeight: document.querySelector("#resize-height"),
  resizePreset: document.querySelector("#resize-preset"),
  overlayText: document.querySelector("#overlay-text"),
  overlaySize: document.querySelector("#overlay-size"),
  overlayFont: document.querySelector("#overlay-font"),
  overlayColor: document.querySelector("#overlay-color"),
  overlayOpacity: document.querySelector("#overlay-opacity"),
  watermarkOpacity: document.querySelector("#watermark-opacity"),
  watermarkInput: document.querySelector("#watermark-input"),
  quality: document.querySelector("#quality"),
  format: document.querySelector("#format-select"),
};

const outputs = {
  brightness: document.querySelector("#brightness-value"),
  contrast: document.querySelector("#contrast-value"),
  saturation: document.querySelector("#saturation-value"),
  temperature: document.querySelector("#temperature-value"),
  vignette: document.querySelector("#vignette-value"),
  quality: document.querySelector("#quality-value"),
};

const buttons = {
  reset: document.querySelector("#reset-button"),
  download: document.querySelector("#download-button"),
  undo: document.querySelector("#undo-button"),
  rotateLeft: document.querySelector("#rotate-left"),
  rotateRight: document.querySelector("#rotate-right"),
  flipX: document.querySelector("#flip-x"),
  flipY: document.querySelector("#flip-y"),
  cropToggle: document.querySelector("#crop-toggle"),
  cropApply: document.querySelector("#crop-apply"),
  cropCancel: document.querySelector("#crop-cancel"),
  cropCenter: document.querySelector("#crop-center"),
  paddingToggle: document.querySelector("#padding-toggle"),
  resizeToggle: document.querySelector("#resize-toggle"),
  resizeLock: document.querySelector("#resize-lock"),
  resizeApply: document.querySelector("#resize-apply"),
  textToggle: document.querySelector("#text-toggle"),
  watermarkToggle: document.querySelector("#watermark-toggle"),
  overlayAddText: document.querySelector("#overlay-add-text"),
  compareToggle: document.querySelector("#compare-toggle"),
  inspectorToggle: document.querySelector("#inspector-toggle"),
  downloadConfirm: document.querySelector("#download-confirm"),
  downloadModalClose: document.querySelector("#download-modal-close"),
  downloadModalCancel: document.querySelector("#download-modal-cancel"),
};

const defaults = {
  brightness: 100,
  contrast: 100,
  saturation: 100,
  temperature: 0,
  vignette: 0,
  rotation: 0,
  flipX: 1,
  flipY: 1,
  canvasPaddingTop: 0,
  canvasPaddingRight: 0,
  canvasPaddingBottom: 0,
  canvasPaddingLeft: 0,
  canvasBackground: "#000000",
  canvasTransparent: true,
  resizeWidth: 0,
  resizeHeight: 0,
  resizeLockAspect: true,
  overlaySize: 64,
  overlayFont: "system",
  overlayColor: "#ffffff",
  overlayOpacity: 100,
  watermarkOpacity: 100,
  compareMode: false,
  compareSplit: 0.5,
  quality: 92,
};

const state = {
  image: null,
  originalImage: null,
  sourceBlob: null,
  originalBlob: null,
  fileName: "blackbelt-edit",
  fileDisplayName: "",
  fileSize: 0,
  fileType: "",
  originalWidth: 0,
  originalHeight: 0,
  estimateToken: 0,
  history: [],
  cropMode: false,
  cropStart: null,
  cropDrag: null,
  cropSelection: null,
  activeTool: null,
  canvasPaddingMode: false,
  overlays: [],
  overlayDrag: null,
  compareDrag: false,
  ...defaults,
};

let persistenceTimer = null;
let isRestoringSession = false;

const editableInputs = [
  controls.brightness,
  controls.contrast,
  controls.saturation,
  controls.temperature,
  controls.vignette,
  controls.canvasPaddingTop,
  controls.canvasPaddingRight,
  controls.canvasPaddingBottom,
  controls.canvasPaddingLeft,
  controls.canvasBackground,
  controls.canvasTransparent,
  controls.resizeWidth,
  controls.resizeHeight,
  controls.resizePreset,
  controls.overlayText,
  controls.overlaySize,
  controls.overlayFont,
  controls.overlayColor,
  controls.overlayOpacity,
  controls.watermarkOpacity,
  controls.watermarkInput,
  controls.quality,
  controls.format,
  buttons.reset,
  buttons.download,
  buttons.downloadConfirm,
  buttons.rotateLeft,
  buttons.rotateRight,
  buttons.flipX,
  buttons.flipY,
  buttons.cropToggle,
  buttons.cropCenter,
  buttons.paddingToggle,
  buttons.resizeToggle,
  buttons.resizeLock,
  buttons.resizeApply,
  buttons.textToggle,
  buttons.watermarkToggle,
  buttons.overlayAddText,
  buttons.compareToggle,
  controls.cropWidth,
  controls.cropHeight,
];

function setEnabled(enabled) {
  editableInputs.forEach((input) => {
    input.disabled = !enabled;
  });
  if (!enabled) {
    state.activeTool = null;
    state.cropMode = false;
    state.canvasPaddingMode = false;
    state.compareMode = false;
    syncCropInline();
    syncPaddingInline();
    resizeInlineEl.classList.remove("is-visible");
    textInlineEl.classList.remove("is-visible");
    watermarkInlineEl.classList.remove("is-visible");
    compareDivider.classList.remove("is-visible");
  }
  buttons.undo.disabled = state.history.length === 0;
  syncCropButtons();
}

function snapshot() {
  return {
    image: state.image,
    originalImage: state.originalImage,
    sourceBlob: state.sourceBlob,
    originalBlob: state.originalBlob,
    fileName: state.fileName,
    fileDisplayName: state.fileDisplayName,
    fileSize: state.fileSize,
    fileType: state.fileType,
    originalWidth: state.originalWidth,
    originalHeight: state.originalHeight,
    brightness: state.brightness,
    contrast: state.contrast,
    saturation: state.saturation,
    temperature: state.temperature,
    vignette: state.vignette,
    rotation: state.rotation,
    flipX: state.flipX,
    flipY: state.flipY,
    canvasPaddingTop: state.canvasPaddingTop,
    canvasPaddingRight: state.canvasPaddingRight,
    canvasPaddingBottom: state.canvasPaddingBottom,
    canvasPaddingLeft: state.canvasPaddingLeft,
    canvasBackground: state.canvasBackground,
    canvasTransparent: state.canvasTransparent,
    resizeWidth: state.resizeWidth,
    resizeHeight: state.resizeHeight,
    resizeLockAspect: state.resizeLockAspect,
    overlays: state.overlays,
    overlaySize: state.overlaySize,
    overlayFont: state.overlayFont,
    overlayColor: state.overlayColor,
    overlayOpacity: state.overlayOpacity,
    watermarkOpacity: state.watermarkOpacity,
    compareMode: state.compareMode,
    compareSplit: state.compareSplit,
  };
}

function getPersistableState() {
  const inspectorCollapsed = appShell.classList.contains("inspector-collapsed");

  return {
    fileName: state.fileName,
    fileDisplayName: state.fileDisplayName,
    fileSize: state.fileSize,
    fileType: state.fileType,
    originalWidth: state.originalWidth,
    originalHeight: state.originalHeight,
    brightness: state.brightness,
    contrast: state.contrast,
    saturation: state.saturation,
    temperature: state.temperature,
    vignette: state.vignette,
    rotation: state.rotation,
    flipX: state.flipX,
    flipY: state.flipY,
    canvasPaddingTop: state.canvasPaddingTop,
    canvasPaddingRight: state.canvasPaddingRight,
    canvasPaddingBottom: state.canvasPaddingBottom,
    canvasPaddingLeft: state.canvasPaddingLeft,
    canvasBackground: state.canvasBackground,
    canvasTransparent: state.canvasTransparent,
    resizeWidth: state.resizeWidth,
    resizeHeight: state.resizeHeight,
    resizeLockAspect: state.resizeLockAspect,
    overlaySize: state.overlaySize,
    overlayFont: state.overlayFont,
    overlayColor: state.overlayColor,
    overlayOpacity: state.overlayOpacity,
    watermarkOpacity: state.watermarkOpacity,
    overlays: serializeOverlays(),
    activeTool: state.activeTool,
    compareMode: state.compareMode,
    compareSplit: state.compareSplit,
    quality: state.quality,
    format: controls.format.value,
    cropMode: state.cropMode,
    cropSelection: state.cropSelection,
    canvasPaddingMode: state.canvasPaddingMode,
    inspectorCollapsed,
  };
}

function schedulePersist() {
  if (isRestoringSession) return;

  window.clearTimeout(persistenceTimer);
  persistenceTimer = window.setTimeout(persistState, 120);
}

function persistState() {
  if (!state.image) return;

  localStorage.setItem(STORAGE_KEY, JSON.stringify(getPersistableState()));
}

function openAssetDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);

    request.onupgradeneeded = () => {
      request.result.createObjectStore(DB_STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function withAssetStore(mode, callback) {
  const db = await openAssetDb();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(DB_STORE, mode);
    const store = transaction.objectStore(DB_STORE);
    const result = callback(store);

    transaction.oncomplete = () => {
      db.close();
      resolve(result);
    };
    transaction.onerror = () => {
      db.close();
      reject(transaction.error);
    };
  });
}

async function saveSourceBlob(blob) {
  state.sourceBlob = blob;
  await withAssetStore("readwrite", (store) => store.put(blob, DB_IMAGE_KEY));
}

async function saveOriginalBlob(blob) {
  state.originalBlob = blob;
  await withAssetStore("readwrite", (store) => store.put(blob, DB_ORIGINAL_KEY));
}

async function getSavedSourceBlob() {
  return withAssetStore(
    "readonly",
    (store) =>
      new Promise((resolve, reject) => {
        const request = store.get(DB_IMAGE_KEY);
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error);
      }),
  );
}

async function getSavedOriginalBlob() {
  return getSavedBlob(DB_ORIGINAL_KEY);
}

async function saveWatermarkBlob(id, blob) {
  await withAssetStore("readwrite", (store) => store.put(blob, `${DB_WATERMARK_PREFIX}${id}`));
}

async function getSavedWatermarkBlob(id) {
  return getSavedBlob(`${DB_WATERMARK_PREFIX}${id}`);
}

async function getSavedBlob(key) {
  return withAssetStore(
    "readonly",
    (store) =>
      new Promise((resolve, reject) => {
        const request = store.get(key);
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error);
      }),
  );
}

function canvasToBlob(sourceCanvas, type = "image/png", quality = 0.92) {
  return new Promise((resolve) => {
    sourceCanvas.toBlob((blob) => resolve(blob), type, quality);
  });
}

function pushHistory() {
  if (!state.image) return;
  state.history.push(snapshot());
  if (state.history.length > 30) state.history.shift();
  buttons.undo.disabled = false;
}

function restore(values) {
  Object.assign(state, values);
  closeCropToolbox({ clearSelection: true });
  syncControls();
  updateReadout();
  draw();
}

function syncControls() {
  controls.brightness.value = state.brightness;
  controls.contrast.value = state.contrast;
  controls.saturation.value = state.saturation;
  controls.temperature.value = state.temperature;
  controls.vignette.value = state.vignette;
  controls.canvasPaddingTop.value = formatPx(state.canvasPaddingTop);
  controls.canvasPaddingRight.value = formatPx(state.canvasPaddingRight);
  controls.canvasPaddingBottom.value = formatPx(state.canvasPaddingBottom);
  controls.canvasPaddingLeft.value = formatPx(state.canvasPaddingLeft);
  controls.canvasBackground.value = state.canvasBackground;
  controls.canvasTransparent.checked = state.canvasTransparent;
  controls.resizeWidth.value = state.resizeWidth ? formatPx(state.resizeWidth) : "";
  controls.resizeHeight.value = state.resizeHeight ? formatPx(state.resizeHeight) : "";
  controls.overlaySize.value = formatPx(state.overlaySize);
  controls.overlayFont.value = FONT_STACKS[state.overlayFont] ? state.overlayFont : defaults.overlayFont;
  controls.overlayColor.value = state.overlayColor;
  controls.overlayOpacity.value = `${state.overlayOpacity}%`;
  controls.watermarkOpacity.value = `${state.watermarkOpacity}%`;
  controls.quality.value = state.quality;
  buttons.resizeLock.classList.toggle("is-active", state.resizeLockAspect);
  buttons.resizeLock.querySelector("i").className = state.resizeLockAspect ? "fa-solid fa-lock" : "fa-solid fa-lock-open";

  outputs.brightness.value = `${state.brightness}%`;
  outputs.contrast.value = `${state.contrast}%`;
  outputs.saturation.value = `${state.saturation}%`;
  outputs.temperature.value = state.temperature;
  outputs.vignette.value = `${state.vignette}%`;
  outputs.quality.value = `${state.quality}%`;
  syncCropInputs();
}

function getRotatedSize() {
  const turns = Math.abs(state.rotation / 90) % 2;
  return turns
    ? { width: state.originalHeight, height: state.originalWidth }
    : { width: state.originalWidth, height: state.originalHeight };
}

function updateReadout() {
  if (!state.image) {
    imageReadout.textContent = "Sin archivo";
    return;
  }

  imageReadout.textContent = `${state.fileName} · ${state.originalWidth} x ${state.originalHeight}px`;
}

function draw() {
  if (!state.image) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    renderOverlayLayer();
    return;
  }

  renderEditedCanvas(canvas, { includeOverlays: false });
  if (state.compareMode) renderCompareCanvas();
  renderOverlayLayer();
  renderCompareDivider();
  schedulePersist();
}

function renderEditedCanvas(targetCanvas, { includeOverlays = true } = {}) {
  const { width: imageWidth, height: imageHeight } = getRotatedSize();
  const padding = getCanvasPadding();
  const width = imageWidth + padding.left + padding.right;
  const height = imageHeight + padding.top + padding.bottom;
  targetCanvas.width = width;
  targetCanvas.height = height;

  const targetCtx = targetCanvas.getContext("2d", { willReadFrequently: true });
  targetCtx.save();
  targetCtx.clearRect(0, 0, width, height);
  if (!state.canvasTransparent) {
    targetCtx.fillStyle = state.canvasBackground;
    targetCtx.fillRect(0, 0, width, height);
  }
  targetCtx.filter = `brightness(${state.brightness}%) contrast(${state.contrast}%) saturate(${state.saturation}%)`;
  targetCtx.translate(padding.left + imageWidth / 2, padding.top + imageHeight / 2);
  targetCtx.rotate((state.rotation * Math.PI) / 180);
  targetCtx.scale(state.flipX, state.flipY);
  targetCtx.drawImage(state.image, -state.originalWidth / 2, -state.originalHeight / 2);
  targetCtx.restore();

  applyTemperature(targetCanvas, targetCtx);
  applyVignette(targetCanvas, targetCtx);
  if (includeOverlays) drawOverlays(targetCtx);
  return targetCanvas;
}

function renderCompareCanvas() {
  if (!state.originalImage) return;

  const editedCanvas = document.createElement("canvas");
  renderEditedCanvas(editedCanvas, { includeOverlays: true });
  const beforeCanvas = document.createElement("canvas");
  renderBeforeCanvas(beforeCanvas);

  canvas.width = editedCanvas.width;
  canvas.height = editedCanvas.height;
  ctx.save();
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(editedCanvas, 0, 0);
  ctx.beginPath();
  ctx.rect(0, 0, canvas.width * state.compareSplit, canvas.height);
  ctx.clip();
  ctx.drawImage(beforeCanvas, 0, 0);
  ctx.restore();
}

function renderBeforeCanvas(targetCanvas) {
  const { width: imageWidth, height: imageHeight } = getRotatedSize();
  const padding = getCanvasPadding();
  const width = imageWidth + padding.left + padding.right;
  const height = imageHeight + padding.top + padding.bottom;
  targetCanvas.width = width;
  targetCanvas.height = height;

  const targetCtx = targetCanvas.getContext("2d");
  targetCtx.clearRect(0, 0, width, height);
  targetCtx.fillStyle = "#ffffff";
  if (!state.canvasTransparent) targetCtx.fillStyle = state.canvasBackground;
  if (!state.canvasTransparent) targetCtx.fillRect(0, 0, width, height);
  targetCtx.drawImage(state.originalImage, padding.left, padding.top, imageWidth, imageHeight);
}

function applyTemperature(targetCanvas = canvas, targetCtx = ctx) {
  if (state.temperature === 0) return;

  const imageData = targetCtx.getImageData(0, 0, targetCanvas.width, targetCanvas.height);
  const data = imageData.data;
  const warm = state.temperature;

  for (let i = 0; i < data.length; i += 4) {
    data[i] = clamp(data[i] + warm * 0.45);
    data[i + 2] = clamp(data[i + 2] - warm * 0.42);
  }

  targetCtx.putImageData(imageData, 0, 0);
}

function applyVignette(targetCanvas = canvas, targetCtx = ctx) {
  if (state.vignette === 0) return;

  const gradient = targetCtx.createRadialGradient(
    targetCanvas.width / 2,
    targetCanvas.height / 2,
    Math.min(targetCanvas.width, targetCanvas.height) * 0.2,
    targetCanvas.width / 2,
    targetCanvas.height / 2,
    Math.max(targetCanvas.width, targetCanvas.height) * 0.62,
  );
  gradient.addColorStop(0, "rgba(0, 0, 0, 0)");
  gradient.addColorStop(1, `rgba(0, 0, 0, ${state.vignette / 100})`);

  targetCtx.save();
  targetCtx.fillStyle = gradient;
  targetCtx.fillRect(0, 0, targetCanvas.width, targetCanvas.height);
  targetCtx.restore();
}

function clamp(value) {
  return Math.max(0, Math.min(255, value));
}

function parsePx(value, fallback = 0) {
  const parsed = Number.parseFloat(String(value).replace(",", "."));
  return Number.isFinite(parsed) ? Math.round(parsed) : fallback;
}

function formatPx(value) {
  return `${Math.max(0, Math.round(value))}px`;
}

function getCanvasPadding() {
  return {
    top: state.canvasPaddingTop,
    right: state.canvasPaddingRight,
    bottom: state.canvasPaddingBottom,
    left: state.canvasPaddingLeft,
  };
}

function serializeOverlays() {
  return state.overlays.map(({ image, ...overlay }) => overlay);
}

function getOverlayFontStack(fontKey = defaults.overlayFont) {
  return FONT_STACKS[fontKey] || FONT_STACKS[defaults.overlayFont];
}

function drawOverlays(targetCtx) {
  state.overlays.forEach((overlay) => {
    targetCtx.save();
    targetCtx.globalAlpha = overlay.opacity / 100;

    if (overlay.type === "text") {
      targetCtx.fillStyle = overlay.color;
      targetCtx.font = `700 ${overlay.size}px ${getOverlayFontStack(overlay.font)}`;
      targetCtx.textAlign = "center";
      targetCtx.textBaseline = "middle";
      targetCtx.fillText(overlay.text, overlay.x + overlay.width / 2, overlay.y + overlay.height / 2);
    }

    if (overlay.type === "image" && overlay.image) {
      targetCtx.drawImage(overlay.image, overlay.x, overlay.y, overlay.width, overlay.height);
    }

    targetCtx.restore();
  });
}

function renderOverlayLayer() {
  overlayLayer.innerHTML = "";
  if (!state.image || state.compareMode) return;

  const metrics = getCanvasDisplayMetrics();
  if (!metrics) return;

  state.overlays.forEach((overlay) => {
    const item = document.createElement("div");
    item.className = "overlay-item";
    item.dataset.overlayId = overlay.id;
    positionOverlayElement(item, overlay, metrics);

    if (overlay.type === "text") {
      item.textContent = overlay.text;
      item.style.color = overlay.color;
      item.style.fontSize = `${Math.max(10, overlay.size * metrics.scaleY)}px`;
      item.style.fontFamily = getOverlayFontStack(overlay.font);
      item.style.fontWeight = "700";
    }

    if (overlay.type === "image" && overlay.previewUrl) {
      const img = document.createElement("img");
      img.src = overlay.previewUrl;
      img.alt = "";
      item.append(img);
      ["nw", "n", "ne", "e", "se", "s", "sw", "w"].forEach((handle) => {
        const resizeHandle = document.createElement("span");
        resizeHandle.className = `overlay-handle overlay-handle-${handle}`;
        resizeHandle.dataset.overlayHandle = handle;
        item.append(resizeHandle);
      });
    }

    overlayLayer.append(item);
  });
}

function positionOverlayElement(item, overlay, metrics = getCanvasDisplayMetrics()) {
  if (!metrics) return;

  item.style.left = `${metrics.left + overlay.x * metrics.scaleX}px`;
  item.style.top = `${metrics.top + overlay.y * metrics.scaleY}px`;
  item.style.width = `${overlay.width * metrics.scaleX}px`;
  item.style.height = `${overlay.height * metrics.scaleY}px`;
  item.style.opacity = String(overlay.opacity / 100);
}

function renderCompareDivider() {
  if (!state.image || !state.compareMode) {
    compareDivider.classList.remove("is-visible");
    return;
  }

  const metrics = getCanvasDisplayMetrics();
  if (!metrics) return;

  compareDivider.style.left = `${metrics.left + canvas.width * state.compareSplit * metrics.scaleX}px`;
  compareDivider.style.top = `${metrics.top}px`;
  compareDivider.style.height = `${canvas.height * metrics.scaleY}px`;
  compareDivider.classList.add("is-visible");
}

function startCompareDrag(event) {
  if (!state.compareMode) return;

  event.preventDefault();
  state.compareDrag = true;
  compareDivider.setPointerCapture(event.pointerId);
}

function updateCompareDrag(event) {
  if (!state.compareDrag) return;

  const point = getCanvasPoint(event);
  state.compareSplit = clampNumber(point.x / canvas.width, 0.05, 0.95);
  draw();
}

function stopCompareDrag(event) {
  if (!state.compareDrag) return;

  updateCompareDrag(event);
  state.compareDrag = false;
  compareDivider.releasePointerCapture(event.pointerId);
  schedulePersist();
}

function showBeforeWhilePressed(isPressed) {
  if (!state.image) return;

  if (isPressed) {
    state.compareMode = true;
    state.compareSplit = 1;
  } else {
    state.compareMode = state.activeTool === "compare";
    state.compareSplit = 0.5;
  }

  draw();
}

function getCanvasDisplayMetrics() {
  if (!canvas.width || !canvas.height) return null;

  const canvasRect = canvas.getBoundingClientRect();
  const zoneRect = dropZone.getBoundingClientRect();

  return {
    left: canvasRect.left - zoneRect.left,
    top: canvasRect.top - zoneRect.top,
    scaleX: canvasRect.width / canvas.width,
    scaleY: canvasRect.height / canvas.height,
  };
}

function makeOverlayId() {
  return crypto.randomUUID ? crypto.randomUUID() : `overlay-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getOverlayPosition(width, height, position = "center") {
  const margin = Math.max(24, Math.round(Math.min(canvas.width, canvas.height) * 0.05));
  const positions = {
    center: {
      x: (canvas.width - width) / 2,
      y: (canvas.height - height) / 2,
    },
    top: {
      x: (canvas.width - width) / 2,
      y: margin,
    },
    bottom: {
      x: (canvas.width - width) / 2,
      y: canvas.height - height - margin,
    },
    "bottom-right": {
      x: canvas.width - width - margin,
      y: canvas.height - height - margin,
    },
  };
  const selected = positions[position] || positions.center;

  return {
    x: Math.round(clampNumber(selected.x, 0, canvas.width - width)),
    y: Math.round(clampNumber(selected.y, 0, canvas.height - height)),
  };
}

async function loadFile(file) {
  if (!file || !file.type.startsWith("image/")) return;

  const bitmap = await createImageBitmap(file);
  try {
    await saveSourceBlob(file);
    await saveOriginalBlob(file);
  } catch (error) {
    console.warn("No se pudo guardar la imagen localmente.", error);
  }
  state.image = bitmap;
  state.originalImage = await createImageBitmap(file);
  state.fileName = file.name.replace(/\.[^.]+$/, "") || "blackbelt-edit";
  state.fileDisplayName = file.name;
  state.fileSize = file.size;
  state.fileType = file.type || "image";
  state.originalWidth = bitmap.width;
  state.originalHeight = bitmap.height;
  state.history = [];

  Object.assign(state, defaults, {
    resizeWidth: bitmap.width,
    resizeHeight: bitmap.height,
    overlays: [],
    activeTool: null,
  });
  cancelCrop();
  syncControls();
  setEnabled(true);
  emptyState.classList.add("is-hidden");
  updateReadout();
  draw();
  syncCropInputs();
  persistState();
}

function updateControl(name, parser = Number) {
  pushHistory();
  state[name] = parser(controls[name].value);
  syncControls();
  draw();
  renderCropSelection();
}

function updateCanvasBackground() {
  pushHistory();
  state.canvasBackground = controls.canvasBackground.value;
  syncControls();
  draw();
  renderCropSelection();
}

function updateCanvasTransparency() {
  pushHistory();
  state.canvasTransparent = controls.canvasTransparent.checked;
  syncControls();
  draw();
  renderCropSelection();
}

function updateCanvasPadding(name) {
  pushHistory();
  state[name] = Math.max(0, parsePx(controls[name].value, 0));
  syncControls();
  draw();
  renderCropSelection();
}

function syncResizeInputs() {
  if (!state.image) return;

  if (!state.resizeWidth) state.resizeWidth = state.originalWidth;
  if (!state.resizeHeight) state.resizeHeight = state.originalHeight;
  controls.resizeWidth.value = formatPx(state.resizeWidth);
  controls.resizeHeight.value = formatPx(state.resizeHeight);
}

function updateResizeDimension(axis) {
  if (!state.image) return;

  const nextValue = Math.max(1, parsePx(axis === "width" ? controls.resizeWidth.value : controls.resizeHeight.value, axis === "width" ? state.resizeWidth : state.resizeHeight));
  const ratio = state.originalWidth / state.originalHeight;

  if (axis === "width") {
    state.resizeWidth = nextValue;
    if (state.resizeLockAspect) state.resizeHeight = Math.max(1, Math.round(nextValue / ratio));
  } else {
    state.resizeHeight = nextValue;
    if (state.resizeLockAspect) state.resizeWidth = Math.max(1, Math.round(nextValue * ratio));
  }

  syncResizeInputs();
  schedulePersist();
}

function applyResizePreset() {
  const value = controls.resizePreset.value;
  if (!value || !state.image) return;

  if (value === "original") {
    state.resizeWidth = state.originalWidth;
    state.resizeHeight = state.originalHeight;
  } else {
    const [width, height] = value.split("x").map(Number);
    state.resizeWidth = width;
    state.resizeHeight = height;
  }

  controls.resizePreset.value = "";
  syncResizeInputs();
  schedulePersist();
}

async function applyResize() {
  if (!state.image || !state.resizeWidth || !state.resizeHeight) return;

  pushHistory();
  closeCropToolbox({ clearSelection: true });
  const resizedCanvas = document.createElement("canvas");
  const resizedCtx = resizedCanvas.getContext("2d");
  resizedCanvas.width = state.resizeWidth;
  resizedCanvas.height = state.resizeHeight;
  resizedCtx.drawImage(canvas, 0, 0, canvas.width, canvas.height, 0, 0, state.resizeWidth, state.resizeHeight);

  const resizedBlob = await canvasToBlob(resizedCanvas);
  if (resizedBlob) {
    try {
      await saveSourceBlob(resizedBlob);
    } catch (error) {
      console.warn("No se pudo guardar el resize localmente.", error);
    }
    state.fileSize = resizedBlob.size;
    state.fileType = resizedBlob.type || "image/png";
  }

  state.image = await createImageBitmap(resizedCanvas);
  state.originalWidth = state.resizeWidth;
  state.originalHeight = state.resizeHeight;
  state.fileName = `${state.fileName}-resize`;
  const preservedQuality = state.quality;
  const preservedFormat = controls.format.value;
  const preservedOriginal = state.originalImage;
  Object.assign(state, defaults, {
    quality: preservedQuality,
    resizeWidth: state.originalWidth,
    resizeHeight: state.originalHeight,
    originalImage: preservedOriginal,
    overlays: [],
  });
  controls.format.value = preservedFormat;
  setActiveTool(null);
  syncControls();
  updateReadout();
  draw();
}

function updateOverlayDefaults() {
  state.overlaySize = Math.max(8, parsePx(controls.overlaySize.value, state.overlaySize));
  state.overlayFont = FONT_STACKS[controls.overlayFont.value] ? controls.overlayFont.value : defaults.overlayFont;
  state.overlayColor = controls.overlayColor.value;
  state.overlayOpacity = clampNumber(parsePx(controls.overlayOpacity.value, state.overlayOpacity), 1, 100);
  syncControls();
  schedulePersist();
}

function updateWatermarkDefaults() {
  state.watermarkOpacity = clampNumber(parsePx(controls.watermarkOpacity.value, state.watermarkOpacity), 1, 100);
  syncControls();
  schedulePersist();
}

function addTextOverlay() {
  if (!state.image) return;

  updateOverlayDefaults();
  const text = controls.overlayText.value.trim();
  if (!text) return;

  pushHistory();
  const measureCanvas = document.createElement("canvas");
  const measureCtx = measureCanvas.getContext("2d");
  measureCtx.font = `700 ${state.overlaySize}px ${getOverlayFontStack(state.overlayFont)}`;
  const width = Math.max(80, Math.ceil(measureCtx.measureText(text).width + state.overlaySize));
  const height = Math.max(40, Math.ceil(state.overlaySize * 1.45));
  const position = getOverlayPosition(width, height, "center");

  state.overlays.push({
    id: makeOverlayId(),
    type: "text",
    text,
    x: position.x,
    y: position.y,
    width,
    height,
    size: state.overlaySize,
    font: state.overlayFont,
    color: state.overlayColor,
    opacity: state.overlayOpacity,
  });

  draw();
}

async function addWatermark(file) {
  if (!state.image || !file || !file.type.startsWith("image/")) return;

  updateWatermarkDefaults();
  pushHistory();
  const bitmap = await createImageBitmap(file);
  const id = makeOverlayId();
  const maxWidth = Math.min(canvas.width * 0.28, bitmap.width);
  const scale = maxWidth / bitmap.width;
  const width = Math.max(80, Math.round(bitmap.width * scale));
  const height = Math.max(40, Math.round(bitmap.height * scale));
  const position = getOverlayPosition(width, height, "center");
  const previewUrl = URL.createObjectURL(file);

  try {
    await saveWatermarkBlob(id, file);
  } catch (error) {
    console.warn("No se pudo guardar la marca de agua localmente.", error);
  }

  state.overlays.push({
    id,
    type: "image",
    x: position.x,
    y: position.y,
    width,
    height,
    opacity: state.watermarkOpacity,
    previewUrl,
    image: bitmap,
  });

  controls.watermarkInput.value = "";
  draw();
}

function rotate(amount) {
  pushHistory();
  closeCropToolbox({ clearSelection: true });
  closePaddingToolbox();
  state.rotation = (state.rotation + amount + 360) % 360;
  draw();
  syncCropInputs();
}

function flip(axis) {
  pushHistory();
  closeCropToolbox({ clearSelection: true });
  closePaddingToolbox();
  state[axis] *= -1;
  draw();
}

async function reset() {
  if (!state.image) return;

  pushHistory();

  const originalBlob = state.originalBlob || state.sourceBlob;
  const originalImage = originalBlob ? await createImageBitmap(originalBlob) : state.originalImage;
  if (!originalImage) return;

  state.image = originalImage;
  state.originalImage = originalImage;
  state.originalWidth = originalImage.width;
  state.originalHeight = originalImage.height;
  state.fileName = (state.fileDisplayName || state.fileName).replace(/\.[^.]+$/, "") || "blackbelt-edit";
  state.fileSize = originalBlob?.size || state.fileSize;
  state.fileType = originalBlob?.type || state.fileType;
  state.overlays = [];
  state.cropSelection = null;
  state.cropStart = null;
  state.cropDrag = null;
  state.overlayDrag = null;
  state.compareDrag = false;

  Object.assign(state, defaults, {
    image: originalImage,
    originalImage,
    sourceBlob: originalBlob || state.sourceBlob,
    originalBlob: originalBlob || state.originalBlob,
    fileName: state.fileName,
    fileDisplayName: state.fileDisplayName,
    fileSize: state.fileSize,
    fileType: state.fileType,
    originalWidth: state.originalWidth,
    originalHeight: state.originalHeight,
    resizeWidth: state.originalWidth,
    resizeHeight: state.originalHeight,
    overlays: [],
    activeTool: null,
  });

  if (originalBlob) {
    try {
      await saveSourceBlob(originalBlob);
    } catch (error) {
      console.warn("No se pudo restaurar la imagen original localmente.", error);
    }
  }

  setActiveTool(null);
  syncControls();
  updateReadout();
  draw();
  syncCropInputs();
  persistState();
}

function undo() {
  const previous = state.history.pop();
  if (!previous) return;
  restore(previous);
  buttons.undo.disabled = state.history.length === 0;
}

function openDownloadModal() {
  if (!state.image) return;

  closeCropToolbox();
  closePaddingToolbox();
  downloadModal.classList.add("is-visible");
  downloadModal.setAttribute("aria-hidden", "false");
  updateDownloadSummary();
  controls.format.focus();
}

function closeDownloadModal() {
  downloadModal.classList.remove("is-visible");
  downloadModal.setAttribute("aria-hidden", "true");
}

function toggleInspector() {
  const collapsed = appShell.classList.toggle("inspector-collapsed");
  buttons.inspectorToggle.classList.toggle("is-active", collapsed);
  buttons.inspectorToggle.setAttribute("aria-expanded", String(!collapsed));
  requestAnimationFrame(renderCropSelection);
  schedulePersist();
}

function download() {
  const type = controls.format.value;
  const extension = type.split("/")[1].replace("jpeg", "jpg");
  const quality = state.quality / 100;
  const outputCanvas = getExportCanvas(type);
  const link = document.createElement("a");
  link.download = `${state.fileName}-edited.${extension}`;
  link.href = outputCanvas.toDataURL(type, quality);
  link.click();
  closeDownloadModal();
}

function updateDownloadSummary() {
  if (!state.image) return;

  const type = controls.format.value;
  const extension = type.split("/")[1].replace("jpeg", "jpg").toUpperCase();
  const quality = state.quality / 100;
  const originalSize = state.fileSize || 0;
  const outputCanvas = getExportCanvas(type);
  const hasTransparency = state.canvasTransparent && (type === "image/png" || type === "image/webp");

  summaryEls.fileName.textContent = `${state.fileName}-edited.${extension.toLowerCase()}`;
  summaryEls.original.textContent = `${state.fileDisplayName || state.fileName} · ${formatBytes(originalSize)} · ${formatMimeType(state.fileType)} · ${state.originalWidth} x ${state.originalHeight}px`;
  summaryEls.output.textContent = `${extension} · ${outputCanvas.width} x ${outputCanvas.height}px · calidad ${state.quality}%`;
  summaryEls.estimated.textContent = "Calculando...";
  summaryEls.delta.textContent = "-";
  summaryEls.background.textContent = hasTransparency
    ? "Transparente"
    : state.canvasTransparent
      ? "JPEG usara fondo blanco"
      : state.canvasBackground.toUpperCase();

  const token = ++state.estimateToken;
  outputCanvas.toBlob(
    (blob) => {
      if (!blob || token !== state.estimateToken) return;

      const delta = originalSize ? ((blob.size - originalSize) / originalSize) * 100 : 0;
      summaryEls.estimated.textContent = formatBytes(blob.size);
      summaryEls.delta.textContent = originalSize ? `${delta >= 0 ? "+" : ""}${delta.toFixed(1)}% vs original` : "Sin peso original";
    },
    type,
    quality,
  );
}

function getExportCanvas(type) {
  const baseCanvas = document.createElement("canvas");
  renderEditedCanvas(baseCanvas, { includeOverlays: true });
  if (type !== "image/jpeg" || !state.canvasTransparent) return baseCanvas;

  const exportCanvas = document.createElement("canvas");
  const exportCtx = exportCanvas.getContext("2d");
  exportCanvas.width = baseCanvas.width;
  exportCanvas.height = baseCanvas.height;
  exportCtx.fillStyle = "#ffffff";
  exportCtx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
  exportCtx.drawImage(baseCanvas, 0, 0);
  return exportCanvas;
}

function formatBytes(bytes) {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** index;
  return `${value >= 10 || index === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[index]}`;
}

function formatMimeType(type) {
  if (!type) return "tipo desconocido";
  return type.replace("image/", "").toUpperCase();
}

async function restoreSession() {
  const savedRaw = localStorage.getItem(STORAGE_KEY);
  if (!savedRaw) {
    syncControls();
    setEnabled(false);
    return;
  }

  try {
    isRestoringSession = true;
    const saved = JSON.parse(savedRaw);
    const blob = await getSavedSourceBlob();
    const originalBlob = await getSavedOriginalBlob();

    if (!blob) {
      localStorage.removeItem(STORAGE_KEY);
      syncControls();
      setEnabled(false);
      return;
    }

    state.image = await createImageBitmap(blob);
    state.originalImage = originalBlob ? await createImageBitmap(originalBlob) : await createImageBitmap(blob);
    state.sourceBlob = blob;
    state.originalBlob = originalBlob || blob;
    const restoredOverlays = await restoreOverlayAssets(saved.overlays || []);
    Object.assign(state, defaults, saved, {
      image: state.image,
      originalImage: state.originalImage,
      sourceBlob: blob,
      originalBlob: state.originalBlob,
      overlays: restoredOverlays,
      history: [],
      cropStart: null,
      cropDrag: null,
      overlayDrag: null,
      compareDrag: false,
      estimateToken: 0,
    });

    controls.format.value = saved.format || controls.format.value;
    appShell.classList.toggle("inspector-collapsed", Boolean(saved.inspectorCollapsed));
    buttons.inspectorToggle.classList.toggle("is-active", Boolean(saved.inspectorCollapsed));
    buttons.inspectorToggle.setAttribute("aria-expanded", String(!saved.inspectorCollapsed));

    syncControls();
    setEnabled(true);
    emptyState.classList.add("is-hidden");
    updateReadout();
    draw();
    setActiveTool(saved.activeTool || null);
    syncCropButtons();
    renderCropSelection();
  } catch (error) {
    console.warn("No se pudo restaurar la sesion local.", error);
    localStorage.removeItem(STORAGE_KEY);
    syncControls();
    setEnabled(false);
  } finally {
    isRestoringSession = false;
  }
}

async function restoreOverlayAssets(savedOverlays) {
  const overlays = [];

  for (const overlay of savedOverlays) {
    if (overlay.type === "image") {
      const blob = await getSavedWatermarkBlob(overlay.id);
      if (!blob) continue;
      overlays.push({
        ...overlay,
        image: await createImageBitmap(blob),
        previewUrl: URL.createObjectURL(blob),
      });
      continue;
    }

    overlays.push(overlay);
  }

  return overlays;
}

function toggleCrop() {
  if (!state.image) return;

  setActiveTool(state.activeTool === "crop" ? null : "crop");
}

function openCropToolbox() {
  state.cropMode = true;
  if (!state.cropSelection) setCropFromInputs();
  dropZone.classList.toggle("is-cropping", state.cropMode);
  buttons.cropToggle.classList.toggle("is-active", state.cropMode);
  syncCropInline();
  renderCropSelection();
  syncCropButtons();
}

function closeCropToolbox({ clearSelection = false } = {}) {
  state.cropMode = false;
  if (state.activeTool === "crop") state.activeTool = null;
  state.cropStart = null;
  state.cropDrag = null;
  if (clearSelection) {
    state.cropSelection = null;
    syncCropInputs();
  }
  cropSelectionEl.classList.remove("is-visible");
  dropZone.classList.remove("is-cropping");
  buttons.cropToggle.classList.remove("is-active");
  syncCropInline();
  syncCropButtons();
  schedulePersist();
}

function cancelCrop() {
  closeCropToolbox({ clearSelection: true });
}

async function applyCrop() {
  const crop = state.cropSelection;
  if (!state.image || !crop || crop.width < 4 || crop.height < 4) return;

  pushHistory();

  const tempCanvas = document.createElement("canvas");
  const tempCtx = tempCanvas.getContext("2d");
  tempCanvas.width = crop.width;
  tempCanvas.height = crop.height;
  tempCtx.drawImage(canvas, crop.x, crop.y, crop.width, crop.height, 0, 0, crop.width, crop.height);

  const croppedBlob = await canvasToBlob(tempCanvas);
  if (croppedBlob) {
    state.fileSize = croppedBlob.size;
    state.fileType = croppedBlob.type || "image/png";
    try {
      await saveSourceBlob(croppedBlob);
    } catch (error) {
      console.warn("No se pudo guardar el recorte localmente.", error);
    }
  }
  state.image = await createImageBitmap(tempCanvas);
  state.originalWidth = crop.width;
  state.originalHeight = crop.height;
  state.fileName = `${state.fileName}-crop`;

  const preservedQuality = state.quality;
  Object.assign(state, defaults, { quality: preservedQuality, overlays: [] });
  cancelCrop();
  syncControls();
  updateReadout();
  draw();
  syncCropInputs();
}

function getCanvasPoint(event) {
  const rect = canvas.getBoundingClientRect();
  const x = ((event.clientX - rect.left) / rect.width) * canvas.width;
  const y = ((event.clientY - rect.top) / rect.height) * canvas.height;

  return {
    x: Math.max(0, Math.min(canvas.width, x)),
    y: Math.max(0, Math.min(canvas.height, y)),
  };
}

function syncCropButtons() {
  const canCrop = Boolean(state.image);
  const hasSelection =
    state.cropMode && canCrop && state.cropSelection && state.cropSelection.width >= 4 && state.cropSelection.height >= 4;

  buttons.cropApply.disabled = !hasSelection;
  buttons.cropCancel.disabled = !state.cropMode;
  buttons.cropCenter.disabled = !canCrop;
}

function syncCropInline() {
  cropInlineEl.classList.toggle("is-visible", state.cropMode);
  cropInlineEl.setAttribute("aria-hidden", state.cropMode ? "false" : "true");
}

function toggleCanvasPadding() {
  if (!state.image) return;

  setActiveTool(state.activeTool === "padding" ? null : "padding");
}

function syncPaddingInline() {
  paddingInlineEl.classList.toggle("is-visible", state.canvasPaddingMode);
  paddingInlineEl.setAttribute("aria-hidden", state.canvasPaddingMode ? "false" : "true");
  buttons.paddingToggle.classList.toggle("is-active", state.canvasPaddingMode);
}

function closePaddingToolbox() {
  state.canvasPaddingMode = false;
  if (state.activeTool === "padding") state.activeTool = null;
  syncPaddingInline();
  schedulePersist();
}

function setActiveTool(tool) {
  state.activeTool = tool;
  state.cropMode = tool === "crop";
  state.canvasPaddingMode = tool === "padding";
  state.compareMode = tool === "compare";

  cropInlineEl.classList.toggle("is-visible", tool === "crop");
  paddingInlineEl.classList.toggle("is-visible", tool === "padding");
  resizeInlineEl.classList.toggle("is-visible", tool === "resize");
  textInlineEl.classList.toggle("is-visible", tool === "text");
  watermarkInlineEl.classList.toggle("is-visible", tool === "watermark");

  cropInlineEl.setAttribute("aria-hidden", String(tool !== "crop"));
  paddingInlineEl.setAttribute("aria-hidden", String(tool !== "padding"));
  resizeInlineEl.setAttribute("aria-hidden", String(tool !== "resize"));
  textInlineEl.setAttribute("aria-hidden", String(tool !== "text"));
  watermarkInlineEl.setAttribute("aria-hidden", String(tool !== "watermark"));

  buttons.cropToggle.classList.toggle("is-active", tool === "crop");
  buttons.paddingToggle.classList.toggle("is-active", tool === "padding");
  buttons.resizeToggle.classList.toggle("is-active", tool === "resize");
  buttons.textToggle.classList.toggle("is-active", tool === "text");
  buttons.watermarkToggle.classList.toggle("is-active", tool === "watermark");
  buttons.compareToggle.classList.toggle("is-active", tool === "compare");
  dropZone.classList.toggle("is-cropping", tool === "crop");

  if (tool === "crop" && !state.cropSelection) setCropFromInputs();
  if (tool !== "crop") cropSelectionEl.classList.remove("is-visible");
  if (tool === "resize") syncResizeInputs();
  syncCropButtons();
  draw();
  schedulePersist();
}

function syncCropInputs() {
  if (!state.image) {
    controls.cropWidth.value = "";
    controls.cropHeight.value = "";
    return;
  }

  if (state.cropSelection) {
    controls.cropWidth.value = formatPx(state.cropSelection.width);
    controls.cropHeight.value = formatPx(state.cropSelection.height);
    return;
  }

  controls.cropWidth.value = formatPx(Math.min(canvas.width || state.originalWidth, state.originalWidth));
  controls.cropHeight.value = formatPx(Math.min(canvas.height || state.originalHeight, state.originalHeight));
}

function getInputCropSize() {
  const fallbackWidth = canvas.width || state.originalWidth;
  const fallbackHeight = canvas.height || state.originalHeight;
  const width = Math.max(1, Math.min(fallbackWidth, parsePx(controls.cropWidth.value, fallbackWidth)));
  const height = Math.max(1, Math.min(fallbackHeight, parsePx(controls.cropHeight.value, fallbackHeight)));

  return { width, height };
}

function setCropFromInputs() {
  if (!state.image) return;
  state.canvasPaddingMode = false;
  syncPaddingInline();

  const { width, height } = getInputCropSize();
  const current = state.cropSelection;
  const x = current ? current.x : Math.round((canvas.width - width) / 2);
  const y = current ? current.y : Math.round((canvas.height - height) / 2);

  state.cropSelection = {
    x: Math.max(0, Math.min(canvas.width - width, x)),
    y: Math.max(0, Math.min(canvas.height - height, y)),
    width,
    height,
  };

  state.cropMode = true;
  dropZone.classList.add("is-cropping");
  buttons.cropToggle.classList.add("is-active");
  syncCropInline();
  syncCropInputs();
  renderCropSelection();
  syncCropButtons();
  schedulePersist();
}

function centerCropFromInputs() {
  if (!state.image) return;
  state.canvasPaddingMode = false;
  syncPaddingInline();

  const { width, height } = getInputCropSize();
  state.cropSelection = {
    x: Math.round((canvas.width - width) / 2),
    y: Math.round((canvas.height - height) / 2),
    width,
    height,
  };

  state.cropMode = true;
  dropZone.classList.add("is-cropping");
  buttons.cropToggle.classList.add("is-active");
  syncCropInline();
  syncCropInputs();
  renderCropSelection();
  syncCropButtons();
  schedulePersist();
}

function updateCropSelection(event) {
  if (!state.cropStart) return;

  const current = getCanvasPoint(event);
  const x = Math.round(Math.min(state.cropStart.x, current.x));
  const y = Math.round(Math.min(state.cropStart.y, current.y));
  const width = Math.round(Math.abs(current.x - state.cropStart.x));
  const height = Math.round(Math.abs(current.y - state.cropStart.y));

  state.cropSelection = { x, y, width, height };
  syncCropInputs();
  renderCropSelection();
  syncCropButtons();
}

function startCropDrag(event) {
  if (!state.cropMode || !state.cropSelection) return;

  const handle = event.target.closest("[data-crop-handle]")?.dataset.cropHandle || "move";
  const point = getCanvasPoint(event);
  state.cropDrag = {
    handle,
    startPoint: point,
    startCrop: { ...state.cropSelection },
  };
  cropSelectionEl.setPointerCapture(event.pointerId);
}

function updateCropDrag(event) {
  if (!state.cropDrag) return;

  const point = getCanvasPoint(event);
  const { handle, startPoint, startCrop } = state.cropDrag;
  const deltaX = point.x - startPoint.x;
  const deltaY = point.y - startPoint.y;
  const minSize = 8;
  let next = { ...startCrop };

  if (handle === "move") {
    next.x = clampNumber(startCrop.x + deltaX, 0, canvas.width - startCrop.width);
    next.y = clampNumber(startCrop.y + deltaY, 0, canvas.height - startCrop.height);
  } else {
    const left = handle.includes("w")
      ? clampNumber(startCrop.x + deltaX, 0, startCrop.x + startCrop.width - minSize)
      : startCrop.x;
    const right = handle.includes("e")
      ? clampNumber(startCrop.x + startCrop.width + deltaX, startCrop.x + minSize, canvas.width)
      : startCrop.x + startCrop.width;
    const top = handle.includes("n")
      ? clampNumber(startCrop.y + deltaY, 0, startCrop.y + startCrop.height - minSize)
      : startCrop.y;
    const bottom = handle.includes("s")
      ? clampNumber(startCrop.y + startCrop.height + deltaY, startCrop.y + minSize, canvas.height)
      : startCrop.y + startCrop.height;

    next = {
      x: Math.round(left),
      y: Math.round(top),
      width: Math.round(right - left),
      height: Math.round(bottom - top),
    };
  }

  state.cropSelection = next;
  syncCropInputs();
  renderCropSelection();
  syncCropButtons();
}

function stopCropDrag(event) {
  if (!state.cropDrag) return;

  updateCropDrag(event);
  state.cropDrag = null;
  cropSelectionEl.releasePointerCapture(event.pointerId);
  schedulePersist();
}

function clampNumber(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function startOverlayDrag(event) {
  const item = event.target.closest(".overlay-item");
  if (!item) return;

  const overlay = state.overlays.find((entry) => entry.id === item.dataset.overlayId);
  if (!overlay) return;

  event.preventDefault();
  const handle = event.target.closest("[data-overlay-handle]")?.dataset.overlayHandle || "move";
  state.overlayDrag = {
    id: overlay.id,
    handle,
    startPoint: getCanvasPoint(event),
    startOverlay: { ...overlay },
  };
  item.setPointerCapture(event.pointerId);
}

function updateOverlayDrag(event) {
  if (!state.overlayDrag) return;

  const overlay = state.overlays.find((entry) => entry.id === state.overlayDrag.id);
  if (!overlay) return;

  const point = getCanvasPoint(event);
  const { handle, startOverlay } = state.overlayDrag;
  const deltaX = point.x - state.overlayDrag.startPoint.x;
  const deltaY = point.y - state.overlayDrag.startPoint.y;

  if (handle === "move" || overlay.type !== "image") {
    overlay.x = Math.round(clampNumber(startOverlay.x + deltaX, 0, canvas.width - overlay.width));
    overlay.y = Math.round(clampNumber(startOverlay.y + deltaY, 0, canvas.height - overlay.height));
  } else {
    const minSize = 24;
    let left = handle.includes("w")
      ? clampNumber(startOverlay.x + deltaX, 0, startOverlay.x + startOverlay.width - minSize)
      : startOverlay.x;
    let right = handle.includes("e")
      ? clampNumber(startOverlay.x + startOverlay.width + deltaX, startOverlay.x + minSize, canvas.width)
      : startOverlay.x + startOverlay.width;
    let top = handle.includes("n")
      ? clampNumber(startOverlay.y + deltaY, 0, startOverlay.y + startOverlay.height - minSize)
      : startOverlay.y;
    let bottom = handle.includes("s")
      ? clampNumber(startOverlay.y + startOverlay.height + deltaY, startOverlay.y + minSize, canvas.height)
      : startOverlay.y + startOverlay.height;

    if (handle.length === 2) {
      const ratio = startOverlay.width / startOverlay.height;
      const nextWidth = right - left;
      const nextHeight = bottom - top;
      const scale = Math.max(nextWidth / startOverlay.width, nextHeight / startOverlay.height);
      const proportionalWidth = Math.max(minSize, startOverlay.width * scale);
      const proportionalHeight = proportionalWidth / ratio;

      if (handle.includes("w")) left = startOverlay.x + startOverlay.width - proportionalWidth;
      if (handle.includes("e")) right = startOverlay.x + proportionalWidth;
      if (handle.includes("n")) top = startOverlay.y + startOverlay.height - proportionalHeight;
      if (handle.includes("s")) bottom = startOverlay.y + proportionalHeight;

      if (left < 0) {
        left = 0;
        right = startOverlay.x + startOverlay.width;
      }
      if (right > canvas.width) {
        right = canvas.width;
        left = startOverlay.x;
      }
      if (top < 0) {
        top = 0;
        bottom = startOverlay.y + startOverlay.height;
      }
      if (bottom > canvas.height) {
        bottom = canvas.height;
        top = startOverlay.y;
      }
    }

    overlay.x = Math.round(left);
    overlay.y = Math.round(top);
    overlay.width = Math.round(right - left);
    overlay.height = Math.round(bottom - top);
  }

  const item = overlayLayer.querySelector(`[data-overlay-id="${overlay.id}"]`);
  if (item) positionOverlayElement(item, overlay);
}

function stopOverlayDrag(event) {
  if (!state.overlayDrag) return;

  updateOverlayDrag(event);
  const item = event.target.closest(".overlay-item");
  if (item) item.releasePointerCapture(event.pointerId);
  state.overlayDrag = null;
  draw();
}

function renderCropSelection() {
  const crop = state.cropSelection;
  if (!crop || crop.width < 4 || crop.height < 4) {
    cropSelectionEl.classList.remove("is-visible");
    return;
  }

  const canvasRect = canvas.getBoundingClientRect();
  const zoneRect = dropZone.getBoundingClientRect();
  const scaleX = canvasRect.width / canvas.width;
  const scaleY = canvasRect.height / canvas.height;

  cropSelectionEl.style.left = `${canvasRect.left - zoneRect.left + crop.x * scaleX}px`;
  cropSelectionEl.style.top = `${canvasRect.top - zoneRect.top + crop.y * scaleY}px`;
  cropSelectionEl.style.width = `${crop.width * scaleX}px`;
  cropSelectionEl.style.height = `${crop.height * scaleY}px`;
  cropSelectionEl.classList.add("is-visible");
}

fileInput.addEventListener("change", (event) => {
  loadFile(event.target.files[0]);
});

dropZone.addEventListener("dragover", (event) => {
  event.preventDefault();
  dropZone.classList.add("is-dragging");
});

dropZone.addEventListener("dragleave", () => {
  dropZone.classList.remove("is-dragging");
});

dropZone.addEventListener("drop", (event) => {
  event.preventDefault();
  dropZone.classList.remove("is-dragging");
  loadFile(event.dataTransfer.files[0]);
});

dropZone.addEventListener("pointerdown", (event) => {
  if (!state.cropMode || !state.image || event.target !== canvas) return;

  event.preventDefault();
  state.cropStart = getCanvasPoint(event);
  state.cropSelection = null;
  cropSelectionEl.classList.remove("is-visible");
  dropZone.setPointerCapture(event.pointerId);
});

dropZone.addEventListener("pointermove", (event) => {
  if (!state.cropMode || !state.cropStart) return;

  event.preventDefault();
  updateCropSelection(event);
});

dropZone.addEventListener("pointerup", (event) => {
  if (!state.cropMode || !state.cropStart) return;

  event.preventDefault();
  updateCropSelection(event);
  state.cropStart = null;
  dropZone.releasePointerCapture(event.pointerId);
});

overlayLayer.addEventListener("pointerdown", startOverlayDrag);
overlayLayer.addEventListener("pointermove", (event) => {
  if (!state.overlayDrag) return;
  event.preventDefault();
  updateOverlayDrag(event);
});
overlayLayer.addEventListener("pointerup", stopOverlayDrag);
overlayLayer.addEventListener("pointercancel", stopOverlayDrag);

compareDivider.addEventListener("pointerdown", startCompareDrag);
compareDivider.addEventListener("pointermove", updateCompareDrag);
compareDivider.addEventListener("pointerup", stopCompareDrag);
compareDivider.addEventListener("pointercancel", stopCompareDrag);

cropSelectionEl.addEventListener("pointerdown", (event) => {
  if (!state.cropMode || !state.image) return;

  event.preventDefault();
  event.stopPropagation();
  startCropDrag(event);
});

cropSelectionEl.addEventListener("pointermove", (event) => {
  if (!state.cropDrag) return;

  event.preventDefault();
  updateCropDrag(event);
});

cropSelectionEl.addEventListener("pointerup", (event) => {
  if (!state.cropDrag) return;

  event.preventDefault();
  stopCropDrag(event);
});

cropSelectionEl.addEventListener("pointercancel", (event) => {
  if (!state.cropDrag) return;

  event.preventDefault();
  stopCropDrag(event);
});

window.addEventListener("resize", renderCropSelection);

controls.brightness.addEventListener("change", () => updateControl("brightness"));
controls.contrast.addEventListener("change", () => updateControl("contrast"));
controls.saturation.addEventListener("change", () => updateControl("saturation"));
controls.temperature.addEventListener("change", () => updateControl("temperature"));
controls.vignette.addEventListener("change", () => updateControl("vignette"));
controls.canvasPaddingTop.addEventListener("change", () => updateCanvasPadding("canvasPaddingTop"));
controls.canvasPaddingRight.addEventListener("change", () => updateCanvasPadding("canvasPaddingRight"));
controls.canvasPaddingBottom.addEventListener("change", () => updateCanvasPadding("canvasPaddingBottom"));
controls.canvasPaddingLeft.addEventListener("change", () => updateCanvasPadding("canvasPaddingLeft"));
controls.canvasBackground.addEventListener("change", updateCanvasBackground);
controls.canvasTransparent.addEventListener("change", updateCanvasTransparency);
controls.cropWidth.addEventListener("change", setCropFromInputs);
controls.cropHeight.addEventListener("change", setCropFromInputs);
controls.resizeWidth.addEventListener("input", () => updateResizeDimension("width"));
controls.resizeHeight.addEventListener("input", () => updateResizeDimension("height"));
controls.resizePreset.addEventListener("change", applyResizePreset);
controls.overlaySize.addEventListener("change", updateOverlayDefaults);
controls.overlayFont.addEventListener("change", updateOverlayDefaults);
controls.overlayColor.addEventListener("change", updateOverlayDefaults);
controls.overlayOpacity.addEventListener("change", updateOverlayDefaults);
controls.watermarkOpacity.addEventListener("change", updateWatermarkDefaults);
controls.watermarkInput.addEventListener("change", (event) => addWatermark(event.target.files[0]));
controls.quality.addEventListener("input", () => {
  state.quality = Number(controls.quality.value);
  syncControls();
  updateDownloadSummary();
  schedulePersist();
});
controls.format.addEventListener("change", () => {
  updateDownloadSummary();
  schedulePersist();
});

buttons.rotateLeft.addEventListener("click", () => rotate(-90));
buttons.rotateRight.addEventListener("click", () => rotate(90));
buttons.flipX.addEventListener("click", () => flip("flipX"));
buttons.flipY.addEventListener("click", () => flip("flipY"));
buttons.cropToggle.addEventListener("click", toggleCrop);
buttons.cropApply.addEventListener("click", applyCrop);
buttons.cropCancel.addEventListener("click", cancelCrop);
buttons.cropCenter.addEventListener("click", centerCropFromInputs);
buttons.paddingToggle.addEventListener("click", toggleCanvasPadding);
buttons.resizeToggle.addEventListener("click", () => setActiveTool(state.activeTool === "resize" ? null : "resize"));
buttons.resizeLock.addEventListener("click", () => {
  state.resizeLockAspect = !state.resizeLockAspect;
  syncControls();
  schedulePersist();
});
buttons.resizeApply.addEventListener("click", applyResize);
buttons.textToggle.addEventListener("click", () => setActiveTool(state.activeTool === "text" ? null : "text"));
buttons.watermarkToggle.addEventListener("click", () => setActiveTool(state.activeTool === "watermark" ? null : "watermark"));
buttons.overlayAddText.addEventListener("click", addTextOverlay);
buttons.compareToggle.addEventListener("click", () => setActiveTool(state.activeTool === "compare" ? null : "compare"));
buttons.inspectorToggle.addEventListener("click", toggleInspector);
buttons.reset.addEventListener("click", reset);
buttons.undo.addEventListener("click", undo);
buttons.download.addEventListener("click", openDownloadModal);
buttons.downloadConfirm.addEventListener("click", download);
buttons.downloadModalClose.addEventListener("click", closeDownloadModal);
buttons.downloadModalCancel.addEventListener("click", closeDownloadModal);
downloadModal.addEventListener("click", (event) => {
  if (event.target === downloadModal) closeDownloadModal();
});
window.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeDownloadModal();
});

restoreSession();
