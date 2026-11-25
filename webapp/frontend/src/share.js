// Builds shareable PNG cards in the browser (nothing is uploaded anywhere).

const W = 1080;

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

async function fontsReady(list) {
  try { await Promise.all(list.map((f) => document.fonts.load(f))); } catch (e) { /* fall back to system fonts */ }
}

function wrap(ctx, text, maxWidth) {
  const words = (text || "").split(/\s+/);
  const lines = [];
  let line = "";
  words.forEach((w) => {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth && line) { lines.push(line); line = w; } else { line = test; }
  });
  if (line) lines.push(line);
  return lines;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function background(ctx, h) {
  const g = ctx.createLinearGradient(0, 0, W, h);
  g.addColorStop(0, "#2a170e");
  g.addColorStop(1, "#120a07");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, h);
  const glow = ctx.createRadialGradient(W * 0.85, h, 50, W * 0.85, h, h * 0.7);
  glow.addColorStop(0, "rgba(200,106,58,0.35)");
  glow.addColorStop(1, "rgba(200,106,58,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, h);
  ctx.strokeStyle = "rgba(230,194,122,0.35)";
  ctx.lineWidth = 2;
  ctx.strokeRect(28, 28, W - 56, h - 56);
}

function brand(ctx, h, rtl) {
  ctx.fillStyle = "#e6c27a";
  ctx.font = "600 34px 'Reem Kufi', 'IBM Plex Sans Arabic', sans-serif";
  // draw the three parts separately so the Arabic and Latin runs never get reordered
  const parts = [["NAQSH AI", "ltr"], ["  |  ", "ltr"], ["نقش AI", "rtl"]];
  const widths = parts.map(([txt, dir]) => { ctx.direction = dir; return ctx.measureText(txt).width; });
  let x0 = (W - widths.reduce((a, b) => a + b, 0)) / 2;
  ctx.textAlign = "left";
  parts.forEach(([txt, dir], i) => {
    ctx.direction = dir;
    ctx.textAlign = dir === "rtl" ? "right" : "left";
    ctx.fillText(txt, dir === "rtl" ? x0 + widths[i] : x0, h - 70);
    x0 += widths[i];
  });
  ctx.direction = rtl ? "rtl" : "ltr";
}

function toBlob(canvas) {
  return new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
}

// Card for a recognised inscription: the visitor's own photo + the documented meaning.
export async function resultCard({ photoUrl, site, title, alt, meaning, label, lang }) {
  const H = 1350;
  const rtl = lang === "ar";
  await fontsReady(["600 40px 'Reem Kufi'", "400 30px Amiri", "400 30px 'IBM Plex Sans Arabic'", "600 40px 'Cormorant Garamond'"]);
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  const ctx = c.getContext("2d");
  background(ctx, H);

  const img = await loadImage(photoUrl);
  const box = { x: 70, y: 70, w: W - 140, h: 640 };
  ctx.save();
  roundRect(ctx, box.x, box.y, box.w, box.h, 18);
  ctx.clip();
  const s = Math.max(box.w / img.width, box.h / img.height);
  ctx.drawImage(img, box.x + (box.w - img.width * s) / 2, box.y + (box.h - img.height * s) / 2, img.width * s, img.height * s);
  ctx.restore();

  const x = rtl ? W - 90 : 90;
  ctx.textAlign = rtl ? "right" : "left";
  ctx.direction = rtl ? "rtl" : "ltr";
  let y = 790;
  ctx.fillStyle = "#e6c27a";
  ctx.font = "500 28px 'IBM Plex Sans Arabic', sans-serif";
  ctx.fillText(site, x, y);
  y += 66;
  ctx.fillStyle = "#fbeedb";
  ctx.font = rtl ? "600 54px 'Reem Kufi', sans-serif" : "600 56px 'Cormorant Garamond', serif";
  wrap(ctx, title, W - 180).slice(0, 2).forEach((l) => { ctx.fillText(l, x, y); y += 66; });
  ctx.fillStyle = "rgba(251,238,219,0.55)";
  ctx.font = rtl ? "400 30px 'Cormorant Garamond', serif" : "400 30px Amiri, serif";
  ctx.direction = rtl ? "ltr" : "rtl";
  ctx.fillText(alt || "", x, y);
  ctx.direction = rtl ? "rtl" : "ltr";
  y += 56;
  if (meaning) {
    ctx.fillStyle = "rgba(251,238,219,0.5)";
    ctx.font = "500 24px 'IBM Plex Sans Arabic', sans-serif";
    ctx.fillText(label, x, y);
    y += 46;
    ctx.fillStyle = "rgba(251,238,219,0.9)";
    ctx.font = rtl ? "400 33px Amiri, serif" : "400 31px 'Cormorant Garamond', serif";
    const lines = wrap(ctx, meaning, W - 180);
    const max = Math.max(1, Math.floor((H - 130 - y) / 46));
    lines.slice(0, max).forEach((l, i) => {
      ctx.fillText(i === max - 1 && lines.length > max ? `${l}…` : l, x, y);
      y += 46;
    });
  }
  brand(ctx, H, rtl);
  return toBlob(c);
}

// Card for "write your name in Dadanitic".
export async function nameCard({ glyphs, arabic, translit, caption, note }) {
  const H = 1080;
  await fontsReady(["120px NotoONA", "600 40px 'Reem Kufi'", "400 30px 'IBM Plex Sans Arabic'"]);
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  const ctx = c.getContext("2d");
  background(ctx, H);
  ctx.textAlign = "center";
  // Draw the Dadanitic letters one by one from right to left, so every browser
  // (Safari included) shows them in the correct reading order.
  ctx.fillStyle = "#e6c27a";
  ctx.textAlign = "left";
  ctx.direction = "ltr";
  const chars = [...glyphs];
  const gap = (sz) => sz * 0.12;
  const widthAt = (sz) => {
    ctx.font = `${sz}px NotoONA`;
    return chars.reduce((w, ch) => w + (ch === " " ? sz * 0.45 : ctx.measureText(ch).width + gap(sz)), 0);
  };
  let size = 190;
  while (widthAt(size) > W - 200 && size > 60) size -= 10;
  ctx.font = `${size}px NotoONA`;
  let x = (W + widthAt(size)) / 2;
  chars.forEach((ch) => {
    if (ch === " ") { x -= size * 0.45; return; }
    const w = ctx.measureText(ch).width;
    x -= w;
    ctx.fillText(ch, x, 500);
    x -= gap(size);
  });
  ctx.textAlign = "center";
  ctx.fillStyle = "#fbeedb";
  ctx.font = "600 64px 'Reem Kufi', sans-serif";
  ctx.fillText(arabic, W / 2, 680);
  ctx.fillStyle = "rgba(251,238,219,0.55)";
  ctx.font = "400 34px 'Gentium Book Plus', serif";
  ctx.direction = "ltr";
  ctx.fillText(translit, W / 2, 750);
  ctx.direction = "rtl";
  brand(ctx, H, true);
  return toBlob(c);
}

export function canShareFiles() {
  try {
    const f = new File([new Blob(["x"], { type: "image/png" })], "x.png", { type: "image/png" });
    return !!(navigator.canShare && navigator.canShare({ files: [f] }));
  } catch (e) {
    return false;
  }
}

export function download(blob, filename) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}

export async function shareFile(blob, filename, title) {
  const file = new File([blob], filename, { type: "image/png" });
  try { await navigator.share({ files: [file], title }); } catch (e) { /* cancelled */ }
}

// Share with the phone's share sheet when possible, otherwise download the PNG.
export async function shareOrDownload(blob, filename, title) {
  const file = new File([blob], filename, { type: "image/png" });
  try {
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title });
      return "shared";
    }
  } catch (e) {
    if (e && e.name === "AbortError") return "cancelled";
  }
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  return "downloaded";
}
