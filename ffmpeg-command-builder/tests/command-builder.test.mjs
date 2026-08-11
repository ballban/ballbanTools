import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const browserContext = { console };
browserContext.globalThis = browserContext;
vm.runInNewContext(
  readFileSync(new URL("../command-builder.js", import.meta.url), "utf8"),
  browserContext,
);
const {
  buildVideoArguments,
  buildOutputFileName,
  buildVideoFilters,
  createDefaultState,
  generateCommand,
  getVideoCodecProfile,
  quoteArgument,
  validateState,
} = browserContext.FFmpegCommandBuilder;

function stateWithInput(name = "holiday video.mp4") {
  const state = createDefaultState();
  state.input.droppedFileName = name;
  state.input.inputPath = name;
  return state;
}

test("uses only the final extension when creating output names", () => {
  const state = stateWithInput("my video.final.v2.mp4");
  state.video.width = 1280;
  state.video.height = 720;
  assert.equal(buildOutputFileName(state), "my video.final.v2_scale1280x720.mp4");
});

test("builds filters in rotation, crop, scale, fps order", () => {
  const state = stateWithInput();
  state.video.rotation = 90;
  state.video.crop = { width: 1000, height: 800, x: 10, y: 20 };
  state.video.width = 1280;
  state.video.height = 720;
  state.video.fps = 30;
  assert.deepEqual(Array.from(buildVideoFilters(state.video)), [
    "transpose=1",
    "crop=1000:800:10:20",
    "scale=1280:-2",
    "fps=30",
  ]);
});

test("does not duplicate FPS and quotes shell-specific paths", () => {
  const state = stateWithInput("holiday video.mp4");
  state.video.codec = "libx264";
  state.video.crf = 23;
  state.video.preset = "medium";
  state.video.fps = 30;
  state.audio.codec = "aac";
  state.audio.bitrate = "128k";
  const command = generateCommand(state);
  assert.equal((command.match(/fps=30/g) ?? []).length, 1);
  assert.match(command, /-vf 'fps=30'/);
  assert.equal(
    quoteArgument("C:\\Videos\\holiday video.mp4", "cmd"),
    '"C:\\Videos\\holiday video.mp4"',
  );
  assert.equal(quoteArgument("O'Brien.mp4", "powershell"), "'O''Brien.mp4'");
  assert.equal(quoteArgument("O'Brien.mp4", "bash"), "'O'\\''Brien.mp4'");
});

test("rejects filters with copy video encoding", () => {
  const state = stateWithInput();
  state.video.width = 1280;
  state.video.height = 720;
  const errors = validateState(state);
  assert.ok(errors.some((error) => error.field === "videoCodec"));
  assert.equal(generateCommand(state), "");
});

test("omits bitrate for copied or deleted audio", () => {
  const copied = stateWithInput();
  copied.audio.bitrate = "128k";
  assert.ok(validateState(copied).some((error) => error.field === "audioBitrate"));

  const deleted = stateWithInput();
  deleted.audio.codec = "none";
  assert.deepEqual(
    generateCommand(deleted).split(" ").filter((value) => value === "-an"),
    ["-an"],
  );
});

test("adds output flags and follows the no-parameter naming rule", () => {
  const state = stateWithInput();
  state.output.fastStart = true;
  state.output.overwrite = true;
  assert.equal(buildOutputFileName(state), "holiday video_output.mp4");
  assert.match(generateCommand(state), /-movflags \+faststart -y/);
});

test("changes output extension and validates WebM compatibility", () => {
  const state = stateWithInput();
  state.output.container = "webm";
  state.video.codec = "libx264";
  state.video.crf = 23;
  state.video.preset = "medium";
  state.audio.codec = "libopus";
  state.audio.bitrate = "128k";
  assert.ok(validateState(state).some((error) => error.field === "videoCodec"));
  state.video.codec = "libvpx-vp9";
  assert.equal(validateState(state).length, 0);
  assert.equal(buildOutputFileName(state), "holiday video_vlibvpx-vp9_crf23_libopus128k.webm");
});

test("supports Unicode names, manual output names, and all rotations", () => {
  const state = stateWithInput("旅行.final.日文.mp4");
  state.video.rotation = 180;
  state.video.codec = "libx264";
  state.video.crf = 18;
  state.video.preset = "slow";
  state.audio.codec = "none";
  assert.deepEqual(Array.from(buildVideoFilters(state.video)), [
    "transpose=1",
    "transpose=1",
  ]);
  assert.equal(
    buildOutputFileName(state),
    "旅行.final.日文_rotate180_vlibx264_crf18_presetslow_an.mp4",
  );
  state.output.manualOutputName = "最终版本.mkv";
  assert.equal(buildOutputFileName(state), "最终版本.mkv");
});

test("sanitizes parameter suffixes and quotes CMD metacharacters", () => {
  const state = stateWithInput("clip.mp4");
  state.video.width = 1280;
  state.video.height = 720;
  state.video.codec = "libx264";
  state.video.crf = 23;
  state.video.preset = "very slow / custom";
  state.audio.codec = "aac";
  state.audio.bitrate = "192k";
  const outputName = buildOutputFileName(state);
  assert.equal(
    outputName,
    "clip_scale1280x720_vlibx264_crf23_presetvery_slow_custom_aac192k.mp4",
  );
  assert.equal(quoteArgument("C:\\Videos\\a&b [final].mp4", "cmd"), '"C:\\Videos\\a^&b [final].mp4"');
});

test("rejects unsupported faststart and invalid manual output names", () => {
  const state = stateWithInput("clip.mkv");
  state.output.fastStart = true;
  state.output.manualOutputName = "folder\\bad:name.mkv";
  const errors = validateState(state);
  assert.ok(errors.some((error) => error.field === "fastStart"));
  assert.ok(errors.some((error) => error.field === "manualOutputName"));
});

test("shows a usable preview without a dropped file", () => {
  const state = createDefaultState();
  assert.equal(state.input.inputPath, "input.mp4");
  assert.match(generateCommand(state), /^ffmpeg -i 'input\.mp4'/);
});

test("uses codec-specific quality defaults and AMF QP arguments", () => {
  assert.equal(getVideoCodecProfile("libx264").defaultQuality, 23);
  assert.equal(getVideoCodecProfile("libx265").defaultQuality, 28);
  assert.equal(getVideoCodecProfile("libvpx-vp9").maximum, 63);
  assert.equal(getVideoCodecProfile("h264_amf").qualityLabel, "QP");

  const state = stateWithInput();
  state.video.codec = "h264_amf";
  state.video.crf = 23;
  state.video.preset = "balanced";
  assert.deepEqual(Array.from(buildVideoArguments(state.video)), [
    "-c:v",
    "h264_amf",
    "-quality",
    "balanced",
    "-rc",
    "cqp",
    "-qp_i",
    "23",
    "-qp_p",
    "23",
    "-qp_b",
    "23",
  ]);
  assert.match(generateCommand(state), /-rc cqp -qp_i 23 -qp_p 23 -qp_b 23/);
});
