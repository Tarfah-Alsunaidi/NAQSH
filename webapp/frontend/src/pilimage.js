// Pillow's image operations, ported to JavaScript so the browser prepares a photo
// exactly as the notebook did (ImageOps.pad with BICUBIC, grey 127 padding).
// Port of Pillow's Resample.c (8-bit path, PRECISION_BITS = 22) and ImageOps.contain / pad.

const PRECISION_BITS = 32 - 8 - 2;
const SCALE = 2 ** PRECISION_BITS;
const HALF = 2 ** (PRECISION_BITS - 1);

function bicubic(x) {
  const a = -0.5;
  if (x < 0) x = -x;
  if (x < 1) return ((a + 2) * x - (a + 3)) * x * x + 1;
  if (x < 2) return (((x - 5) * x + 8) * x - 4) * a;
  return 0;
}

// Python's round(): ties go to the even number.
export function pyRound(v) {
  const f = Math.floor(v);
  const d = v - f;
  if (d > 0.5) return f + 1;
  if (d < 0.5) return f;
  return f % 2 === 0 ? f : f + 1;
}

function coeffs(inSize, outSize) {
  const support0 = 2;
  const scale = inSize / outSize;
  const filterscale = Math.max(scale, 1);
  const support = support0 * filterscale;
  const ksize = Math.ceil(support) * 2 + 1;
  const bounds = new Int32Array(outSize * 2);
  const kk = new Int32Array(outSize * ksize);
  const pre = new Float64Array(ksize);
  for (let xx = 0; xx < outSize; xx++) {
    const center = (xx + 0.5) * scale;
    const ss = 1 / filterscale;
    let xmin = Math.trunc(center - support + 0.5);
    if (xmin < 0) xmin = 0;
    let xmax = Math.trunc(center + support + 0.5);
    if (xmax > inSize) xmax = inSize;
    xmax -= xmin;
    let ww = 0;
    for (let x = 0; x < xmax; x++) {
      const w = bicubic((x + xmin - center + 0.5) * ss);
      pre[x] = w;
      ww += w;
    }
    for (let x = 0; x < ksize; x++) {
      let v = x < xmax ? pre[x] : 0;
      if (x < xmax && ww !== 0) v /= ww;
      kk[xx * ksize + x] = v < 0 ? Math.trunc(-0.5 + v * SCALE) : Math.trunc(0.5 + v * SCALE);
    }
    bounds[xx * 2] = xmin;
    bounds[xx * 2 + 1] = xmax;
  }
  return { ksize, bounds, kk };
}

const clip8 = (ss) => {
  const v = Math.floor(ss / SCALE);
  return v < 0 ? 0 : v > 255 ? 255 : v;
};

// rgb: Uint8Array of w*h*3. Returns { data, w, h } resized with BICUBIC (horizontal pass, then vertical).
export function resizeBicubic(rgb, w, h, outW, outH) {
  let src = rgb, sw = w, sh = h;
  if (outW !== w) {
    const { ksize, bounds, kk } = coeffs(w, outW);
    const out = new Uint8Array(outW * sh * 3);
    for (let y = 0; y < sh; y++) {
      for (let xx = 0; xx < outW; xx++) {
        const xmin = bounds[xx * 2], xmax = bounds[xx * 2 + 1], k = xx * ksize;
        let r = HALF, g = HALF, b = HALF;
        for (let x = 0; x < xmax; x++) {
          const p = (y * sw + x + xmin) * 3, c = kk[k + x];
          r += src[p] * c; g += src[p + 1] * c; b += src[p + 2] * c;
        }
        const o = (y * outW + xx) * 3;
        out[o] = clip8(r); out[o + 1] = clip8(g); out[o + 2] = clip8(b);
      }
    }
    src = out; sw = outW;
  }
  if (outH !== h) {
    const { ksize, bounds, kk } = coeffs(h, outH);
    const out = new Uint8Array(sw * outH * 3);
    for (let yy = 0; yy < outH; yy++) {
      const ymin = bounds[yy * 2], ymax = bounds[yy * 2 + 1], k = yy * ksize;
      for (let x = 0; x < sw; x++) {
        let r = HALF, g = HALF, b = HALF;
        for (let y = 0; y < ymax; y++) {
          const p = ((y + ymin) * sw + x) * 3, c = kk[k + y];
          r += src[p] * c; g += src[p + 1] * c; b += src[p + 2] * c;
        }
        const o = (yy * sw + x) * 3;
        out[o] = clip8(r); out[o + 1] = clip8(g); out[o + 2] = clip8(b);
      }
    }
    src = out; sh = outH;
  }
  return { data: src, w: sw, h: sh };
}

// ImageOps.pad(image, (size, size), color=(127,127,127)) with the default BICUBIC resample.
export function padToSquare(rgb, w, h, size = 224, grey = 127) {
  const imRatio = w / h;
  let rw = size, rh = size;
  if (imRatio > 1) rh = pyRound((h / w) * size);
  else if (imRatio < 1) rw = pyRound((w / h) * size);
  const resized = rw === w && rh === h ? { data: rgb, w, h } : resizeBicubic(rgb, w, h, rw, rh);
  if (rw === size && rh === size) return resized.data;
  const out = new Uint8Array(size * size * 3).fill(grey);
  const ox = rw !== size ? pyRound((size - rw) * 0.5) : 0;
  const oy = rw !== size ? 0 : pyRound((size - rh) * 0.5);
  for (let y = 0; y < rh; y++) {
    out.set(resized.data.subarray(y * rw * 3, (y + 1) * rw * 3), ((y + oy) * size + ox) * 3);
  }
  return out;
}

// Image.thumbnail((max, max)) size rule (keeps the aspect ratio, never enlarges).
export function thumbnailSize(w, h, max = 640) {
  if (w <= max && h <= max) return [w, h];
  const aspect = w / h;
  let x = max, y = max;
  const pick = (n, key) => Math.max([Math.floor(n), Math.ceil(n)].sort((p, q) => key(p) - key(q))[0], 1);
  if (x / y >= aspect) x = pick(y * aspect, (n) => Math.abs(aspect - n / y));
  else y = pick(x / aspect, (n) => (n === 0 ? 0 : Math.abs(aspect - x / n)));
  return [x, y];
}
