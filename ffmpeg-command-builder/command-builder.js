(function (global) {
const INVALID_FILENAME_CHARACTERS = /[<>:"/\\|?*\u0000-\u001f]/g;

const VIDEO_CODEC_PROFILES = {
  copy: {
    qualityLabel: "",
    qualityFlag: "",
    minimum: undefined,
    maximum: undefined,
    defaultQuality: undefined,
    defaultPreset: undefined,
  },
  libx264: {
    qualityLabel: "CRF",
    qualityFlag: "crf",
    minimum: 0,
    maximum: 51,
    defaultQuality: 23,
    defaultPreset: "medium",
  },
  libx265: {
    qualityLabel: "CRF",
    qualityFlag: "crf",
    minimum: 0,
    maximum: 51,
    defaultQuality: 28,
    defaultPreset: "medium",
  },
  "libvpx-vp9": {
    qualityLabel: "CRF",
    qualityFlag: "crf",
    minimum: 0,
    maximum: 63,
    defaultQuality: 31,
    defaultPreset: "medium",
  },
  h264_amf: {
    qualityLabel: "QP",
    qualityFlag: "qp",
    minimum: 0,
    maximum: 51,
    defaultQuality: 23,
    defaultPreset: "balanced",
  },
};

function createDefaultState() {
  return {
    shell: "powershell",
    input: {
      droppedFileName: "",
      inputPath: "input.mp4",
    },
    video: {
      keepAspectRatio: true,
      rotation: 0,
      codec: "copy",
    },
    audio: {
      codec: "copy",
    },
    output: {
      container: "auto",
      fastStart: false,
      overwrite: false,
    },
  };
}

function getFilenamePart(value) {
  const normalized = String(value ?? "").trim().replace(/[\\/]+$/, "");
  const lastSeparator = Math.max(normalized.lastIndexOf("\\"), normalized.lastIndexOf("/"));
  return lastSeparator >= 0 ? normalized.slice(lastSeparator + 1) : normalized;
}

function getExtension(value) {
  const filename = getFilenamePart(value);
  const dotIndex = filename.lastIndexOf(".");
  if (dotIndex <= 0 || dotIndex === filename.length - 1) {
    return "";
  }
  return filename.slice(dotIndex + 1).toLowerCase();
}

function getFilenameStem(value) {
  const filename = getFilenamePart(value);
  const dotIndex = filename.lastIndexOf(".");
  return dotIndex > 0 ? filename.slice(0, dotIndex) : filename;
}

function getOutputExtension(state) {
  if (state.output.container !== "auto") {
    return state.output.container;
  }
  return getExtension(state.input.inputPath || state.input.droppedFileName) || "mp4";
}

function isFiniteNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function isPositiveInteger(value) {
  return isFiniteNumber(value) && Number.isInteger(value) && value > 0;
}

function isNonNegativeInteger(value) {
  return isFiniteNumber(value) && Number.isInteger(value) && value >= 0;
}

function hasVideoFilterOptions(options) {
  return (
    options.rotation !== 0 ||
    options.crop !== undefined ||
    options.width !== undefined ||
    options.height !== undefined ||
    options.fps !== undefined
  );
}

function getVideoCodecProfile(codec) {
  return VIDEO_CODEC_PROFILES[codec] ?? VIDEO_CODEC_PROFILES.libx264;
}

function validateCrop(crop) {
  if (crop === undefined) {
    return [];
  }

  const errors = [];
  if (!isPositiveInteger(crop.width)) {
    errors.push({ field: "cropWidth", message: "裁剪宽度必须是正整数。" });
  }
  if (!isPositiveInteger(crop.height)) {
    errors.push({ field: "cropHeight", message: "裁剪高度必须是正整数。" });
  }
  if (!isNonNegativeInteger(crop.x)) {
    errors.push({ field: "cropX", message: "裁剪 X 必须是非负整数。" });
  }
  if (!isNonNegativeInteger(crop.y)) {
    errors.push({ field: "cropY", message: "裁剪 Y 必须是非负整数。" });
  }
  return errors;
}

function validateState(state) {
  const errors = [];
  const inputPath = state.input.inputPath.trim();

  if (!inputPath) {
    errors.push({ field: "inputPath", message: "请先拖入或选择一个输入文件。" });
  }

  if (state.video.width !== undefined && !isPositiveInteger(state.video.width)) {
    errors.push({ field: "width", message: "宽度必须是正整数。" });
  }
  if (state.video.height !== undefined && !isPositiveInteger(state.video.height)) {
    errors.push({ field: "height", message: "高度必须是正整数。" });
  }
  if (state.video.width !== undefined && !state.video.keepAspectRatio && state.video.height === undefined) {
    errors.push({ field: "height", message: "不保持比例时必须填写高度。" });
  }
  if (state.video.fps !== undefined && !isFiniteNumber(state.video.fps)) {
    errors.push({ field: "fps", message: "帧率必须是有效数字。" });
  } else if (
    state.video.fps !== undefined &&
    (state.video.fps <= 0 || state.video.fps > 240)
  ) {
    errors.push({ field: "fps", message: "帧率必须在 0 到 240 之间。" });
  }

  errors.push(...validateCrop(state.video.crop));

  if (state.video.codec === "copy" && hasVideoFilterOptions(state.video)) {
    errors.push({
      field: "videoCodec",
      message: "使用画面滤镜时不能使用 -c:v copy，请选择视频重新编码器。",
    });
  }
  if (state.video.codec === "copy" && state.video.crf !== undefined) {
    errors.push({ field: "crf", message: "视频编码为 copy 时不能设置 CRF。" });
  }
  if (state.video.codec === "copy" && state.video.preset !== undefined) {
    errors.push({ field: "preset", message: "视频编码为 copy 时不能设置 preset。" });
  }
  if (state.video.codec !== "copy") {
    const profile = getVideoCodecProfile(state.video.codec);
    if (
      state.video.crf !== undefined &&
      (!isFiniteNumber(state.video.crf) ||
        state.video.crf < profile.minimum ||
        state.video.crf > profile.maximum)
    ) {
      errors.push({
        field: "crf",
        message: `${profile.qualityLabel} 必须是 ${profile.minimum} 到 ${profile.maximum} 之间的数字。`,
      });
    }
    if (!state.video.preset?.trim()) {
      errors.push({ field: "preset", message: "请选择编码速度 preset。" });
    }
  }

  if (state.audio.codec === "copy" && state.audio.bitrate !== undefined) {
    errors.push({ field: "audioBitrate", message: "音频编码为 copy 时不能设置码率。" });
  }
  if (state.audio.codec === "none" && state.audio.bitrate !== undefined) {
    errors.push({ field: "audioBitrate", message: "删除音频时不能设置音频码率。" });
  }
  if (
    state.audio.codec !== "copy" &&
    state.audio.codec !== "none" &&
    !/^\d+(?:\.\d+)?k$/i.test(state.audio.bitrate?.trim() ?? "")
  ) {
    errors.push({ field: "audioBitrate", message: "请输入有效的音频码率，例如 128k。" });
  }

  const extension = getOutputExtension(state);
  if (extension === "webm") {
    if (state.video.codec !== "copy" && state.video.codec !== "libvpx-vp9") {
      errors.push({
        field: "videoCodec",
        message: "WebM 输出需要选择 libvpx-vp9，或保持视频编码为 copy。",
      });
    }
    if (
      state.audio.codec !== "copy" &&
      state.audio.codec !== "none" &&
      state.audio.codec !== "libopus"
    ) {
      errors.push({
        field: "audioCodec",
        message: "WebM 输出的音频编码请选择 libopus，或保持音频编码为 copy。",
      });
    }
  }

  if (state.output.fastStart && extension !== "mp4") {
    errors.push({
      field: "fastStart",
      message: "只有 MP4 输出支持 Web 优化（-movflags +faststart）。",
    });
  }

  if (state.output.manualOutputName !== undefined) {
    const manualName = state.output.manualOutputName.trim();
    if (!manualName) {
      errors.push({ field: "manualOutputName", message: "输出文件名不能为空。" });
    } else if (INVALID_FILENAME_CHARACTERS.test(manualName)) {
      errors.push({
        field: "manualOutputName",
        message: "输出文件名不能包含路径分隔符或 Windows 非法字符。",
      });
    }
    INVALID_FILENAME_CHARACTERS.lastIndex = 0;
  }

  return errors;
}

function buildVideoFilters(options) {
  const filters = [];

  if (options.rotation === 90) {
    filters.push("transpose=1");
  } else if (options.rotation === 180) {
    filters.push("transpose=1", "transpose=1");
  } else if (options.rotation === 270) {
    filters.push("transpose=2");
  }

  if (options.crop?.width !== undefined && options.crop?.height !== undefined) {
    const x = options.crop.x ?? 0;
    const y = options.crop.y ?? 0;
    filters.push(`crop=${options.crop.width}:${options.crop.height}:${x}:${y}`);
  }

  if (options.width !== undefined) {
    const height = options.keepAspectRatio ? "-2" : String(options.height ?? "");
    filters.push(`scale=${options.width}:${height}`);
  }

  if (options.fps !== undefined) {
    filters.push(`fps=${options.fps}`);
  }

  return filters;
}

function buildVideoArguments(options) {
  const args = [];
  const filters = buildVideoFilters(options);
  if (filters.length > 0) {
    args.push("-vf", filters.join(","));
  }

  args.push("-c:v", options.codec);
  if (options.codec !== "copy") {
    if (options.codec === "h264_amf") {
      if (options.preset) {
        args.push("-quality", options.preset);
      }
      args.push("-rc", "cqp");
      if (options.crf !== undefined) {
        args.push(
          "-qp_i",
          String(options.crf),
          "-qp_p",
          String(options.crf),
          "-qp_b",
          String(options.crf),
        );
      }
    } else {
      if (options.preset) {
        args.push("-preset", options.preset);
      }
      if (options.crf !== undefined) {
        args.push("-crf", String(options.crf));
      }
    }
  }
  return args;
}

function buildAudioArguments(options) {
  if (options.codec === "none") {
    return ["-an"];
  }
  if (options.codec === "copy") {
    return ["-c:a", "copy"];
  }
  return ["-c:a", options.codec, "-b:a", options.bitrate || "128k"];
}

function sanitizeSuffixPart(value) {
  return value
    .replace(/\s+/g, "_")
    .replace(INVALID_FILENAME_CHARACTERS, "_")
    .replace(/%/g, "")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function getManualOutputName(state, extension) {
  const manual = state.output.manualOutputName?.trim();
  if (!manual) {
    return undefined;
  }
  return getExtension(manual) ? manual : `${manual}.${extension}`;
}

function buildOutputFileName(state) {
  const extension = getOutputExtension(state);
  const manualName = getManualOutputName(state, extension);
  if (manualName) {
    return manualName;
  }

  const stem = getFilenameStem(state.input.inputPath || state.input.droppedFileName) || "output";
  const parts = [];
  const video = state.video;
  const audio = state.audio;

  if (video.width !== undefined) {
    parts.push(`scale${video.width}x${video.height ?? "auto"}`);
  }
  if (video.crop !== undefined) {
    const crop = video.crop;
    parts.push(
      `crop${crop.width ?? "auto"}x${crop.height ?? "auto"}x${crop.x ?? 0}x${crop.y ?? 0}`,
    );
  }
  if (video.fps !== undefined) {
    parts.push(`fps${video.fps}`);
  }
  if (video.rotation !== 0) {
    parts.push(`rotate${video.rotation}`);
  }
  if (video.codec !== "copy") {
    parts.push(`v${video.codec}`);
    if (video.crf !== undefined) {
      parts.push(`${video.codec === "h264_amf" ? "qp" : "crf"}${video.crf}`);
    }
    const profile = getVideoCodecProfile(video.codec);
    if (video.preset && video.preset !== profile.defaultPreset) {
      parts.push(`${video.codec === "h264_amf" ? "quality" : "preset"}${video.preset}`);
    }
  }
  if (audio.codec === "none") {
    parts.push("an");
  } else if (audio.codec !== "copy") {
    parts.push(`${audio.codec}${audio.bitrate ?? ""}`);
  }

  const suffix = parts.map(sanitizeSuffixPart).filter(Boolean).join("_") || "output";
  return `${stem}_${suffix}.${extension}`;
}

function quoteArgument(value, shell) {
  if (shell === "cmd") {
    const escaped = value
      .replace(/%/g, "%%")
      .replace(/(["^&|<>])/g, "^$1");
    return `"${escaped}"`;
  }
  if (shell === "bash") {
    return `'${value.replace(/'/g, "'\\''")}'`;
  }
  return `'${value.replace(/'/g, "''")}'`;
}

function generateCommand(state) {
  if (validateState(state).length > 0) {
    return "";
  }

  const outputName = buildOutputFileName(state);
  const args = ["ffmpeg", "-i", quoteArgument(state.input.inputPath.trim(), state.shell)];
  const videoArguments = buildVideoArguments(state.video);
  for (let index = 0; index < videoArguments.length; index += 1) {
    const value = videoArguments[index];
    args.push(
      videoArguments[index - 1] === "-vf"
        ? quoteArgument(value, state.shell)
        : value,
    );
  }
  args.push(...buildAudioArguments(state.audio));
  if (state.output.fastStart) {
    args.push("-movflags", "+faststart");
  }
  if (state.output.overwrite) {
    args.push("-y");
  }
  args.push(quoteArgument(outputName, state.shell));
  return args.join(" ");
}

global.FFmpegCommandBuilder = {
  VIDEO_CODEC_PROFILES,
  createDefaultState,
  getFilenamePart,
  getExtension,
  getFilenameStem,
  getOutputExtension,
  getVideoCodecProfile,
  validateState,
  buildVideoFilters,
  buildVideoArguments,
  buildAudioArguments,
  buildOutputFileName,
  quoteArgument,
  generateCommand,
};
})(typeof window === "undefined" ? globalThis : window);
