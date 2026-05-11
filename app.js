const canvas = document.querySelector("#editor-canvas");
const ctx = canvas.getContext("2d", { willReadFrequently: true });

const fileInput = document.querySelector("#file-input");
const dropZone = document.querySelector("#drop-zone");
const emptyState = document.querySelector("#empty-state");
const imageReadout = document.querySelector("#image-readout");
const cropSelectionEl = document.querySelector("#crop-selection");
const cropInlineEl = document.querySelector("#crop-inline");
const paddingInlineEl = document.querySelector("#padding-inline");
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
  quality: 92,
};

const state = {
  image: null,
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
  canvasPaddingMode: false,
  ...defaults,
};

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
  controls.cropWidth,
  controls.cropHeight,
];

function setEnabled(enabled) {
  editableInputs.forEach((input) => {
    input.disabled = !enabled;
  });
  if (!enabled) {
    state.canvasPaddingMode = false;
    syncPaddingInline();
  }
  buttons.undo.disabled = state.history.length === 0;
  syncCropButtons();
}

function snapshot() {
  return {
    image: state.image,
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
  };
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
  controls.quality.value = state.quality;

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
    return;
  }

  const { width: imageWidth, height: imageHeight } = getRotatedSize();
  const padding = getCanvasPadding();
  const width = imageWidth + padding.left + padding.right;
  const height = imageHeight + padding.top + padding.bottom;
  canvas.width = width;
  canvas.height = height;

  ctx.save();
  ctx.clearRect(0, 0, width, height);
  if (!state.canvasTransparent) {
    ctx.fillStyle = state.canvasBackground;
    ctx.fillRect(0, 0, width, height);
  }
  ctx.filter = `brightness(${state.brightness}%) contrast(${state.contrast}%) saturate(${state.saturation}%)`;
  ctx.translate(padding.left + imageWidth / 2, padding.top + imageHeight / 2);
  ctx.rotate((state.rotation * Math.PI) / 180);
  ctx.scale(state.flipX, state.flipY);
  ctx.drawImage(state.image, -state.originalWidth / 2, -state.originalHeight / 2);
  ctx.restore();

  applyTemperature();
  applyVignette();
}

function applyTemperature() {
  if (state.temperature === 0) return;

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  const warm = state.temperature;

  for (let i = 0; i < data.length; i += 4) {
    data[i] = clamp(data[i] + warm * 0.45);
    data[i + 2] = clamp(data[i + 2] - warm * 0.42);
  }

  ctx.putImageData(imageData, 0, 0);
}

function applyVignette() {
  if (state.vignette === 0) return;

  const gradient = ctx.createRadialGradient(
    canvas.width / 2,
    canvas.height / 2,
    Math.min(canvas.width, canvas.height) * 0.2,
    canvas.width / 2,
    canvas.height / 2,
    Math.max(canvas.width, canvas.height) * 0.62,
  );
  gradient.addColorStop(0, "rgba(0, 0, 0, 0)");
  gradient.addColorStop(1, `rgba(0, 0, 0, ${state.vignette / 100})`);

  ctx.save();
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.restore();
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

async function loadFile(file) {
  if (!file || !file.type.startsWith("image/")) return;

  const bitmap = await createImageBitmap(file);
  state.image = bitmap;
  state.fileName = file.name.replace(/\.[^.]+$/, "") || "blackbelt-edit";
  state.fileDisplayName = file.name;
  state.fileSize = file.size;
  state.fileType = file.type || "image";
  state.originalWidth = bitmap.width;
  state.originalHeight = bitmap.height;
  state.history = [];

  Object.assign(state, defaults);
  cancelCrop();
  syncControls();
  setEnabled(true);
  emptyState.classList.add("is-hidden");
  updateReadout();
  draw();
  syncCropInputs();
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

function reset() {
  pushHistory();
  Object.assign(state, defaults);
  closeCropToolbox({ clearSelection: true });
  state.canvasPaddingMode = false;
  syncPaddingInline();
  syncControls();
  draw();
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
  if (type !== "image/jpeg" || !state.canvasTransparent) return canvas;

  const exportCanvas = document.createElement("canvas");
  const exportCtx = exportCanvas.getContext("2d");
  exportCanvas.width = canvas.width;
  exportCanvas.height = canvas.height;
  exportCtx.fillStyle = "#ffffff";
  exportCtx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
  exportCtx.drawImage(canvas, 0, 0);
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

function toggleCrop() {
  if (!state.image) return;

  if (state.cropMode) {
    closeCropToolbox();
    return;
  }

  openCropToolbox();
}

function openCropToolbox() {
  state.canvasPaddingMode = false;
  syncPaddingInline();
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

  state.image = await createImageBitmap(tempCanvas);
  state.originalWidth = crop.width;
  state.originalHeight = crop.height;
  state.fileName = `${state.fileName}-crop`;

  const preservedQuality = state.quality;
  Object.assign(state, defaults, { quality: preservedQuality });
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

  if (!state.canvasPaddingMode) {
    closeCropToolbox();
  }
  state.canvasPaddingMode = !state.canvasPaddingMode;
  syncPaddingInline();
}

function syncPaddingInline() {
  paddingInlineEl.classList.toggle("is-visible", state.canvasPaddingMode);
  paddingInlineEl.setAttribute("aria-hidden", state.canvasPaddingMode ? "false" : "true");
  buttons.paddingToggle.classList.toggle("is-active", state.canvasPaddingMode);
}

function closePaddingToolbox() {
  state.canvasPaddingMode = false;
  syncPaddingInline();
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
}

function clampNumber(value, min, max) {
  return Math.max(min, Math.min(max, value));
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
controls.quality.addEventListener("input", () => {
  state.quality = Number(controls.quality.value);
  syncControls();
  updateDownloadSummary();
});
controls.format.addEventListener("change", updateDownloadSummary);

buttons.rotateLeft.addEventListener("click", () => rotate(-90));
buttons.rotateRight.addEventListener("click", () => rotate(90));
buttons.flipX.addEventListener("click", () => flip("flipX"));
buttons.flipY.addEventListener("click", () => flip("flipY"));
buttons.cropToggle.addEventListener("click", toggleCrop);
buttons.cropApply.addEventListener("click", applyCrop);
buttons.cropCancel.addEventListener("click", cancelCrop);
buttons.cropCenter.addEventListener("click", centerCropFromInputs);
buttons.paddingToggle.addEventListener("click", toggleCanvasPadding);
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

syncControls();
setEnabled(false);
