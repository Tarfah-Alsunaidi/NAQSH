// Static (no server) version of api.js, used by build-static.mjs for GitHub Pages.
// The same trained model runs inside the browser with TensorFlow.js (WebAssembly backend),
// and every photo is prepared exactly like the notebook: EXIF rotation, RGB,
// Pillow's ImageOps.pad to 224x224 with grey 127 (BICUBIC, ported in pilimage.js),
// MobileNetV2 scaling to -1..1, then the saved softmax threshold.
import { padToSquare, resizeBicubic, thumbnailSize } from "./pilimage";

const IMG_SIZE = 224;
const MAX_SIDE = 640;
const TOP_K = 3;

const cache = {};
const getJSON = (path) => {
  if (!cache[path]) {
    cache[path] = fetch(path).then((r) => {
      if (!r.ok) throw Object.assign(new Error(`HTTP ${r.status}`), { code: "offline" });
      return r.json();
    }).catch((err) => {
      delete cache[path];
      throw Object.assign(new Error("offline"), { code: "offline", cause: err });
    });
  }
  return cache[path];
};

// ------------------------------------------------------------------ model
let tf = null;
let model = null;
let modelState = { status: "loading", error: null, seconds: null, backend: null };
let loading = null;

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = src;
    s.async = true;
    s.onload = resolve;
    s.onerror = () => reject(new Error(`Could not load ${src}`));
    document.head.appendChild(s);
  });
}

async function loadModel() {
  const started = performance.now();
  await loadScript("assets/vendor/tf.min.js");
  await loadScript("assets/vendor/tf-backend-wasm.min.js");
  tf = window.tf;
  tf.wasm.setWasmPaths(new URL("assets/vendor/", document.baseURI).href);
  // WebAssembly computes in float32 like TensorFlow on a CPU; plain JS is the fallback.
  try {
    if (!(await tf.setBackend("wasm"))) throw new Error("wasm unavailable");
  } catch (err) {
    await tf.setBackend("cpu");
  }
  await tf.ready();
  model = await tf.loadGraphModel("assets/model/model.json");
  tf.tidy(() => { model.execute(tf.zeros([1, IMG_SIZE, IMG_SIZE, 3])); });
  modelState = {
    status: "ready", error: null, backend: tf.getBackend(),
    seconds: Math.round((performance.now() - started) / 100) / 10,
  };
}

function ensureModel() {
  if (!loading) {
    loading = loadModel().catch((err) => {
      modelState = { status: "error", error: String(err && err.message || err), seconds: null, backend: null };
    });
  }
  return loading;
}

// ------------------------------------------------------------------ images
function fail(code, message) {
  return Object.assign(new Error(message), { code, detail: { code, message } });
}

// Decode a photo to RGB bytes, with EXIF rotation and without colour management (like Pillow).
async function decode(blob) {
  let source;
  try {
    source = await createImageBitmap(blob, { imageOrientation: "from-image", colorSpaceConversion: "none", premultiplyAlpha: "none" });
  } catch (err) {
    source = await new Promise((resolve, reject) => {
      const url = URL.createObjectURL(blob);
      const img = new Image();
      img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
      img.onerror = () => { URL.revokeObjectURL(url); reject(err); };
      img.src = url;
    }).catch(() => null);
  }
  if (!source) throw fail("bad_image", "This file could not be read as an image. Please upload a JPG, PNG or WebP photo.");
  const w = source.width || source.naturalWidth;
  const h = source.height || source.naturalHeight;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(source, 0, 0);
  if (source.close) source.close();
  const rgba = ctx.getImageData(0, 0, w, h).data;
  const rgb = new Uint8Array(w * h * 3);
  for (let i = 0, j = 0; i < rgba.length; i += 4, j += 3) {
    rgb[j] = rgba[i]; rgb[j + 1] = rgba[i + 1]; rgb[j + 2] = rgba[i + 2];
  }
  return { rgb, w, h };
}

// Same as the server's prepare_upload: long side at most 640 px, then saved as JPEG quality 90.
async function prepareUpload(file) {
  let { rgb, w, h } = await decode(file);
  const [tw, th] = thumbnailSize(w, h, MAX_SIDE);
  if (tw !== w || th !== h) ({ data: rgb, w, h } = resizeBicubic(rgb, w, h, tw, th));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  const img = ctx.createImageData(w, h);
  for (let i = 0, j = 0; j < rgb.length; i += 4, j += 3) {
    img.data[i] = rgb[j]; img.data[i + 1] = rgb[j + 1]; img.data[i + 2] = rgb[j + 2]; img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  const jpeg = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.9));
  return jpeg ? decode(jpeg) : { rgb, w, h };
}

// ------------------------------------------------------------------ prediction
async function records() {
  const list = await getJSON("data/inscriptions.json");
  const map = {};
  list.forEach((r) => { const { photos, ...rest } = r; map[r.class_name] = rest; });
  return map;
}

async function predictRGB({ rgb, w, h }) {
  await ensureModel();
  if (modelState.status !== "ready") throw fail("model_unavailable", "The NAQSH AI model could not be loaded, so no prediction can be made.");
  const [health, recs] = await Promise.all([getJSON("data/health.json"), records()]);
  const padded = padToSquare(rgb, w, h, IMG_SIZE, 127);
  const x = new Float32Array(padded.length);
  for (let i = 0; i < padded.length; i++) x[i] = padded[i] / 127.5 - 1;

  const started = performance.now();
  const out = tf.tidy(() => model.execute(tf.tensor4d(x, [1, IMG_SIZE, IMG_SIZE, 3])));
  const probs = Array.from(await out.data());
  out.dispose();
  const elapsed = Math.round(performance.now() - started);

  const classes = health.classes;
  const order = probs.map((p, i) => i).sort((a, b) => probs[b] - probs[a]);
  const best = order[0];
  const score = probs[best];
  const recognised = score >= health.threshold;
  const bestClass = classes[best];
  return {
    status: recognised ? "recognised" : "not_recognised",
    recognised,
    score,
    threshold: health.threshold,
    top_class: bestClass,
    top_class_name_en: recs[bestClass].name_en,
    top: order.slice(0, TOP_K).map((i) => ({ class_name: classes[i], name_en: recs[classes[i]].name_en, score: probs[i] })),
    record: recognised ? recs[bestClass] : null,
    inference_ms: elapsed,
  };
}

export const api = {
  health: async () => {
    const h = await getJSON("data/health.json");
    ensureModel();
    return {
      ...h,
      status: modelState.status,
      ready: modelState.status === "ready",
      error: modelState.error,
      load_seconds: modelState.seconds,
      versions: { tensorflow: `.js ${tf ? tf.version.tfjs : ""} (${modelState.backend || "…"})`, keras: h.versions.keras },
    };
  },
  inscriptions: () => getJSON("data/inscriptions.json"),
  samples: () => getJSON("data/samples.json"),
  predictFile: async (file) => {
    if (file.size > 20 * 1024 * 1024) throw fail("too_large", "The image is larger than 20 MB.");
    const prepared = await prepareUpload(file);
    const result = await predictRGB(prepared);
    result.input = { kind: "upload", prepared_size: [prepared.w, prepared.h] };
    return result;
  },
  predictSample: async (imageId) => {
    const samples = await getJSON("data/samples.json");
    const s = samples.find((x) => x.image_id === imageId);
    if (!s) throw fail("unknown_sample", `No dataset photo ${imageId}.`);
    const blob = await fetch(s.url).then((r) => r.blob());
    const result = await predictRGB(await decode(blob));
    result.input = { kind: "dataset", image_id: imageId, split: s.split };
    return result;
  },
};

export const fmt = (x, digits = 3) => (typeof x === "number" && isFinite(x) ? x.toFixed(digits) : "—");

// Lets the project's browser check (tools/check_static_site.py) call the same functions the pages use.
if (typeof window !== "undefined") window.__naqshApi = api;
