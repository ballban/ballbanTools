const {
  buildOutputFileName,
  buildVideoFilters,
  createDefaultState,
  generateCommand,
  getExtension,
  getFilenamePart,
  getOutputExtension,
  getVideoCodecProfile,
  validateState,
} = window.FFmpegCommandBuilder;

const state = createDefaultState();
const elements = {};
let noticeTimer;

const shellLabels = {
  powershell: "PowerShell",
  cmd: "CMD",
  bash: "Bash / Zsh",
};

const resolutionPresets = new Map([
  ["1920x1080", [1920, 1080]],
  ["1280x720", [1280, 720]],
  ["854x480", [854, 480]],
]);

const bitrateOptions = new Set(["96k", "128k", "192k", "256k", "320k"]);
const softwarePresetOptions = [
  "ultrafast",
  "superfast",
  "veryfast",
  "faster",
  "fast",
  "medium",
  "slow",
  "slower",
  "veryslow",
];
const amfQualityOptions = ["speed", "balanced", "quality"];

function byId(id) {
  return document.getElementById(id);
}

function readNumber(id) {
  const value = byId(id).value.trim();
  if (!value) {
    return undefined;
  }
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

function setOptionalNumber(target, key, value) {
  if (value === undefined) {
    delete target[key];
  } else {
    target[key] = value;
  }
}

function formatBytes(value) {
  if (!Number.isFinite(value)) {
    return "大小未知";
  }
  if (value < 1024) {
    return `${value} B`;
  }
  const units = ["KB", "MB", "GB", "TB"];
  let size = value / 1024;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }
  return `${size.toFixed(size >= 10 ? 0 : 1)} ${units[unitIndex]}`;
}

function showNotice(message) {
  elements.notice.textContent = message;
  elements.notice.hidden = !message;
  window.clearTimeout(noticeTimer);
  if (message) {
    noticeTimer = window.setTimeout(() => {
      elements.notice.hidden = true;
    }, 5000);
  }
}

function setFileDetails(file) {
  state.input.droppedFileName = file.name;
  state.input.inputPath = file.name;
  state.input.fileSize = file.size;
  state.input.mimeType = file.type;
  showNotice("");
}

function handleFiles(fileList) {
  const files = Array.from(fileList ?? []);
  if (files.length === 0) {
    return;
  }
  setFileDetails(files[0]);
  if (files.length > 1) {
    showNotice(`检测到 ${files.length} 个文件，MVP 只使用第一个：${files[0].name}`);
  }
  render();
}

function setResolution(value) {
  if (value === "original") {
    delete state.video.width;
    delete state.video.height;
    return;
  }
  if (value === "custom") {
    setOptionalNumber(state.video, "width", readNumber("custom-width"));
    setOptionalNumber(state.video, "height", readNumber("custom-height"));
    return;
  }
  const preset = resolutionPresets.get(value);
  if (preset) {
    state.video.width = preset[0];
    state.video.height = preset[1];
  }
}

function setFps(value) {
  if (value === "original") {
    delete state.video.fps;
  } else if (value === "custom") {
    setOptionalNumber(state.video, "fps", readNumber("custom-fps"));
  } else {
    state.video.fps = Number(value);
  }
}

function setCropEnabled(enabled) {
  if (enabled) {
    state.video.crop = state.video.crop ?? { x: 0, y: 0 };
  } else {
    delete state.video.crop;
  }
}

function updateAudioBitrate() {
  if (state.audio.codec === "copy" || state.audio.codec === "none") {
    delete state.audio.bitrate;
    return;
  }
  const selected = elements.audioBitrate.value;
  state.audio.bitrate = selected === "custom"
    ? elements.customAudioBitrate.value.trim()
    : bitrateOptions.has(selected)
      ? selected
      : "128k";
}

function updateManualOutput(enabled) {
  if (enabled) {
    state.output.manualOutputName =
      elements.manualOutputName.value.trim() || getAutomaticOutputName();
  } else {
    delete state.output.manualOutputName;
  }
}

function getAutomaticOutputName() {
  if (!state.input.inputPath.trim()) {
    return "—";
  }
  const outputState = {
    ...state,
    output: {
      ...state.output,
      manualOutputName: undefined,
    },
  };
  return buildOutputFileName(outputState);
}

function updateFromControl(id) {
  switch (id) {
    case "input-path":
      state.input.inputPath = elements.inputPath.value;
      break;
    case "shell-type":
      state.shell = elements.shellType.value;
      break;
    case "resolution":
      setResolution(elements.resolution.value);
      break;
    case "keep-aspect":
      state.video.keepAspectRatio = elements.keepAspect.checked;
      break;
    case "custom-width":
    case "custom-height":
      if (elements.resolution.value === "custom") {
        setResolution("custom");
      }
      break;
    case "fps":
      setFps(elements.fps.value);
      break;
    case "custom-fps":
      if (elements.fps.value === "custom") {
        setFps("custom");
      }
      break;
    case "rotation":
      state.video.rotation = Number(elements.rotation.value);
      break;
    case "crop-enabled":
      setCropEnabled(elements.cropEnabled.checked);
      break;
    case "crop-width":
      state.video.crop = state.video.crop ?? {};
      setOptionalNumber(state.video.crop, "width", readNumber("crop-width"));
      break;
    case "crop-height":
      state.video.crop = state.video.crop ?? {};
      setOptionalNumber(state.video.crop, "height", readNumber("crop-height"));
      break;
    case "crop-x":
      state.video.crop = state.video.crop ?? {};
      setOptionalNumber(state.video.crop, "x", readNumber("crop-x"));
      break;
    case "crop-y":
      state.video.crop = state.video.crop ?? {};
      setOptionalNumber(state.video.crop, "y", readNumber("crop-y"));
      break;
    case "video-codec":
      state.video.codec = elements.videoCodec.value;
      if (state.video.codec === "copy") {
        delete state.video.crf;
        delete state.video.preset;
      } else {
        const profile = getVideoCodecProfile(state.video.codec);
        state.video.crf = profile.defaultQuality;
        state.video.preset = profile.defaultPreset;
      }
      break;
    case "crf":
      if (state.video.codec !== "copy") {
        setOptionalNumber(state.video, "crf", readNumber("crf"));
      }
      break;
    case "preset":
      if (state.video.codec !== "copy") {
        state.video.preset = elements.preset.value;
      }
      break;
    case "audio-codec":
      state.audio.codec = elements.audioCodec.value;
      updateAudioBitrate();
      break;
    case "audio-bitrate":
    case "custom-audio-bitrate":
      updateAudioBitrate();
      break;
    case "output-container":
      state.output.container = elements.outputContainer.value;
      if (getOutputExtension(state) !== "mp4") {
        state.output.fastStart = false;
      }
      break;
    case "fast-start":
      state.output.fastStart = elements.fastStart.checked;
      break;
    case "overwrite":
      state.output.overwrite = elements.overwrite.checked;
      break;
    case "manual-output":
      updateManualOutput(elements.manualOutput.checked);
      break;
    case "manual-output-name":
      if (elements.manualOutput.checked) {
        state.output.manualOutputName = elements.manualOutputName.value;
      }
      break;
    default:
      break;
  }
  render();
}

function renderFileDetails() {
  const hasFile = Boolean(state.input.droppedFileName);
  elements.fileDetails.hidden = !hasFile;
  elements.clearFile.hidden = !hasFile;
  if (!hasFile) {
    return;
  }
  const extension = getExtension(state.input.droppedFileName);
  const extensionLabel = extension ? extension.toUpperCase() : "无扩展名";
  elements.fileName.textContent = state.input.droppedFileName;
  elements.fileMeta.textContent = [
    extensionLabel,
    formatBytes(state.input.fileSize),
    state.input.mimeType || "MIME 类型未知",
  ].join(" · ");
}

function renderControls() {
  const resolution = state.video.width === undefined
    ? "original"
    : [...resolutionPresets.entries()].find(
        ([, pair]) => pair[0] === state.video.width && pair[1] === state.video.height,
      )?.[0] ?? "custom";
  elements.resolution.value = resolution;
  elements.customResolutionFields.hidden = resolution !== "custom";
  elements.customWidth.value = state.video.width ?? "";
  elements.customHeight.value = state.video.height ?? "";
  elements.customHeight.disabled = state.video.keepAspectRatio;
  elements.keepAspect.checked = state.video.keepAspectRatio;

  const fps = state.video.fps === undefined
    ? "original"
    : ["24", "25", "30", "60"].includes(String(state.video.fps))
      ? String(state.video.fps)
      : "custom";
  elements.fps.value = fps;
  elements.customFpsField.hidden = fps !== "custom";
  elements.customFps.value = state.video.fps ?? "";

  elements.rotation.value = String(state.video.rotation);
  elements.cropEnabled.checked = state.video.crop !== undefined;
  elements.cropFields.hidden = state.video.crop === undefined;
  for (const [id, key] of [
    ["crop-width", "width"],
    ["crop-height", "height"],
    ["crop-x", "x"],
    ["crop-y", "y"],
  ]) {
    byId(id).value = state.video.crop?.[key] ?? "";
  }

  elements.videoCodec.value = state.video.codec;
  const videoReencode = state.video.codec !== "copy";
  const videoProfile = getVideoCodecProfile(state.video.codec);
  elements.crf.disabled = !videoReencode;
  elements.preset.disabled = !videoReencode;
  elements.qualityLabel.textContent = videoProfile.qualityLabel || "质量";
  elements.qualityRange.textContent = videoProfile.minimum === undefined
    ? ""
    : `${videoProfile.minimum}–${videoProfile.maximum}`;
  elements.crf.min = videoProfile.minimum ?? 0;
  elements.crf.max = videoProfile.maximum ?? 51;
  elements.crf.value = videoReencode ? state.video.crf ?? videoProfile.defaultQuality : "";
  elements.crf.placeholder = videoProfile.defaultQuality ?? "";
  elements.presetLabel.textContent = state.video.codec === "h264_amf"
    ? "AMF 质量"
    : "编码速度 preset";
  const presetOptions = state.video.codec === "h264_amf"
    ? amfQualityOptions
    : softwarePresetOptions;
  const currentPreset = state.video.preset ?? videoProfile.defaultPreset;
  elements.preset.replaceChildren(
    ...presetOptions.map((value) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = value;
      option.selected = value === currentPreset;
      return option;
    }),
  );
  elements.preset.value = currentPreset;

  elements.audioCodec.value = state.audio.codec;
  const audioReencode = state.audio.codec !== "copy" && state.audio.codec !== "none";
  elements.audioBitrate.disabled = !audioReencode;
  const bitrate = state.audio.bitrate ?? "128k";
  elements.audioBitrate.value = audioReencode
    ? bitrateOptions.has(bitrate)
      ? bitrate
      : "custom"
    : "none";
  elements.customAudioBitrate.value = bitrate;
  elements.customAudioBitrateField.hidden =
    !audioReencode || elements.audioBitrate.value !== "custom";
  elements.customAudioBitrate.disabled = !audioReencode;

  elements.outputContainer.value = state.output.container;
  const extension = getOutputExtension(state);
  elements.fastStartField.hidden = extension !== "mp4";
  elements.fastStart.disabled = extension !== "mp4";
  elements.fastStart.checked = state.output.fastStart;
  elements.overwrite.checked = state.output.overwrite;

  const manualEnabled = elements.manualOutput.checked;
  elements.manualOutputName.readOnly = !manualEnabled;
  elements.manualOutputName.value = manualEnabled
    ? state.output.manualOutputName ?? getAutomaticOutputName()
    : getAutomaticOutputName();
  elements.manualOutputWarning.hidden =
    !manualEnabled || elements.manualOutputName.value === getAutomaticOutputName();
}

function renderErrors(errors) {
  for (const errorElement of document.querySelectorAll("[data-error-for]")) {
    errorElement.textContent = "";
  }
  for (const error of errors) {
    const target = document.querySelector(`[data-error-for="${error.field}"]`);
    if (target && !target.textContent) {
      target.textContent = error.message;
    }
  }

  elements.validationBanner.hidden = errors.length === 0;
  elements.validationList.replaceChildren(
    ...errors.slice(0, 5).map((error) => {
      const item = document.createElement("li");
      item.textContent = error.message;
      return item;
    }),
  );
}

function renderResults(errors) {
  const hasInput = Boolean(state.input.inputPath.trim());
  const hasSelectedFile = Boolean(state.input.droppedFileName);
  const command = errors.length === 0 ? generateCommand(state) : "";
  const outputName = hasInput ? buildOutputFileName(state) : "—";
  elements.inputPreview.textContent = hasInput ? state.input.inputPath : "—";
  elements.outputNamePreview.textContent = outputName;
  elements.commandShell.textContent = shellLabels[state.shell];
  elements.commandPreview.textContent = command ||
    (hasInput ? "请先修正上方错误。" : "拖入或选择文件后，命令会显示在这里。");
  elements.copyCommand.disabled = !command;
  elements.downloadCommand.disabled = !command;

  const filters = buildVideoFilters(state.video);
  const summary = [];
  if (hasInput) {
    summary.push(
      hasSelectedFile
        ? `输入：${getFilenamePart(state.input.inputPath)}`
        : `示例输入：${getFilenamePart(state.input.inputPath)}`,
    );
  } else {
    summary.push("尚未选择输入文件");
  }
  summary.push(`Shell：${shellLabels[state.shell]}`);
  summary.push(`画面滤镜：${filters.length ? filters.join(" → ") : "无"}`);
  const videoProfile = getVideoCodecProfile(state.video.codec);
  summary.push(
    `视频：${state.video.codec}${
      state.video.codec === "copy"
        ? ""
        : ` · ${videoProfile.qualityLabel} ${state.video.crf ?? "默认"}`
    }`,
  );
  summary.push(`音频：${state.audio.codec === "none" ? "-an" : state.audio.codec}`);
  summary.push(`输出：${outputName}`);
  elements.summaryList.replaceChildren(
    ...summary.map((text) => {
      const item = document.createElement("li");
      item.textContent = text;
      return item;
    }),
  );
  elements.currentCommand = command;
}

function render() {
  renderFileDetails();
  renderControls();
  const errors = validateState(state);
  renderErrors(errors);
  renderResults(errors);
}

async function copyCommand() {
  const command = elements.currentCommand;
  if (!command) {
    return;
  }
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(command);
    } else {
      throw new Error("Clipboard API unavailable");
    }
    elements.copyStatus.textContent = "已复制";
  } catch {
    const textArea = document.createElement("textarea");
    textArea.value = command;
    textArea.setAttribute("readonly", "");
    textArea.style.position = "fixed";
    textArea.style.opacity = "0";
    document.body.append(textArea);
    textArea.select();
    const copied = document.execCommand?.("copy");
    textArea.remove();
    if (copied) {
      elements.copyStatus.textContent = "已复制";
    } else {
      elements.copyStatus.textContent = "请手动选择命令文本";
      selectCommandText();
    }
  }
  window.setTimeout(() => {
    elements.copyStatus.textContent = "";
  }, 1800);
}

function selectCommandText() {
  const selection = window.getSelection();
  const range = document.createRange();
  range.selectNodeContents(elements.commandPreview);
  selection?.removeAllRanges();
  selection?.addRange(range);
  elements.commandPreview.focus();
}

function downloadCommand() {
  const command = elements.currentCommand;
  if (!command) {
    return;
  }
  const outputName = buildOutputFileName(state);
  const textName = outputName.replace(/\.[^.]+$/, "") + ".txt";
  const blob = new Blob([`${command}\n`], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = textName;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function clearFile() {
  state.input = { droppedFileName: "", inputPath: "input.mp4" };
  elements.fileInput.value = "";
  elements.manualOutput.checked = false;
  delete state.output.manualOutputName;
  showNotice("");
  render();
}

function bindEvents() {
  const changeAndInputIds = [
    "input-path",
    "shell-type",
    "resolution",
    "keep-aspect",
    "custom-width",
    "custom-height",
    "fps",
    "custom-fps",
    "rotation",
    "crop-enabled",
    "crop-width",
    "crop-height",
    "crop-x",
    "crop-y",
    "video-codec",
    "crf",
    "preset",
    "audio-codec",
    "audio-bitrate",
    "custom-audio-bitrate",
    "output-container",
    "fast-start",
    "overwrite",
    "manual-output",
    "manual-output-name",
  ];
  for (const id of changeAndInputIds) {
    const element = byId(id);
    element.addEventListener(element.tagName === "INPUT" && element.type === "text" ? "input" : "change", () =>
      updateFromControl(id),
    );
    if (element.tagName === "INPUT" && element.type === "number") {
      element.addEventListener("input", () => updateFromControl(id));
    }
  }

  elements.fileInput.addEventListener("change", () => handleFiles(elements.fileInput.files));
  elements.dropZone.addEventListener("click", (event) => {
    if (event.target !== elements.clearFile) {
      elements.fileInput.click();
    }
  });
  elements.dropZone.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      elements.fileInput.click();
    }
  });
  elements.clearFile.addEventListener("click", (event) => {
    event.stopPropagation();
    clearFile();
  });
  for (const eventName of ["dragenter", "dragover"]) {
    elements.dropZone.addEventListener(eventName, (event) => {
      event.preventDefault();
      elements.dropZone.classList.add("is-active");
    });
  }
  for (const eventName of ["dragleave", "drop"]) {
    elements.dropZone.addEventListener(eventName, (event) => {
      event.preventDefault();
      elements.dropZone.classList.remove("is-active");
    });
  }
  elements.dropZone.addEventListener("drop", (event) => handleFiles(event.dataTransfer.files));
  elements.copyCommand.addEventListener("click", copyCommand);
  elements.downloadCommand.addEventListener("click", downloadCommand);
}

function cacheElements() {
  for (const id of [
    "notice",
    "file-input",
    "drop-zone",
    "file-details",
    "file-name",
    "file-meta",
    "clear-file",
    "input-path",
    "shell-type",
    "resolution",
    "keep-aspect",
    "custom-resolution-fields",
    "custom-width",
    "custom-height",
    "fps",
    "custom-fps-field",
    "custom-fps",
    "rotation",
    "crop-enabled",
    "crop-fields",
    "video-codec",
    "crf",
    "quality-label",
    "quality-range",
    "preset",
    "preset-label",
    "audio-codec",
    "audio-bitrate",
    "custom-audio-bitrate-field",
    "custom-audio-bitrate",
    "output-container",
    "fast-start-field",
    "fast-start",
    "overwrite",
    "manual-output",
    "manual-output-name",
    "manual-output-warning",
    "validation-banner",
    "validation-list",
    "input-preview",
    "output-name-preview",
    "command-shell",
    "command-preview",
    "copy-command",
    "download-command",
    "copy-status",
    "summary-list",
  ]) {
    const camelCaseId = id.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
    elements[camelCaseId] = byId(id);
  }
  elements.currentCommand = "";
}

cacheElements();
bindEvents();
render();
