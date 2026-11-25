import React, { useEffect, useMemo, useRef } from "react";

// An original, procedurally drawn AlUla-inspired landscape: eroded sandstone outcrops
// on a desert plain at dusk, with a rock-cut façade in the spirit of Hegra.
// Purely decorative — it contains no writing, so no inscription is invented.

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const W = 1600;
const H = 900;

// A height-field of wind-eroded sandstone massifs: steep sides, softened tops, rough edges.
function massif(seed, base, { count, minH, maxH, minW, maxW, power = 0.45, rough = 4, from = -80, to = W + 80, cMin, cMax }) {
  const r = rng(seed);
  const between = (a, b) => a + (b - a) * r();
  const bumps = [];
  for (let i = 0; i < count; i++) {
    const c = between(cMin != null ? cMin : from, cMax != null ? cMax : to);
    const w = between(minW, maxW);
    bumps.push({ c, w, h: between(minH, maxH), p: power * between(0.75, 1.3), tilt: between(-0.25, 0.25) });
    // secondary shoulder / eroded step
    if (r() < 0.6) bumps.push({ c: c + between(-0.45, 0.45) * w, w: w * between(0.35, 0.6), h: 0, k: between(0.75, 1.08), parent: bumps.length - 1, p: power, tilt: 0 });
  }
  bumps.forEach((b) => { if (b.parent != null) b.h = bumps[b.parent].h * b.k; });
  const noise = [];
  for (let i = 0; i < 400; i++) noise.push(r() * 2 - 1);
  const smooth = (x) => {
    const t = (x - from) / 22;
    const i = Math.floor(t);
    const f = t - i;
    const a = noise[((i % 400) + 400) % 400];
    const b = noise[(((i + 1) % 400) + 400) % 400];
    return a + (b - a) * (f * f * (3 - 2 * f));
  };
  const height = (x) => {
    let h = 0;
    for (const b of bumps) {
      const u = (x - b.c) / (b.w / 2) + b.tilt * ((x - b.c) / (b.w / 2)) ** 2;
      if (Math.abs(u) < 1) h = Math.max(h, b.h * Math.pow(1 - u * u, b.p));
    }
    return h > 2 ? h + smooth(x) * rough + (r() - 0.5) * rough * 0.35 : 0;
  };
  const pts = [];
  for (let x = from; x <= to; x += 5) pts.push([x, base - height(x)]);
  const d = `M ${from} ${H} ` + pts.map(([x, y]) => `L ${x.toFixed(1)} ${y.toFixed(1)}`).join(" ") + ` L ${to} ${H} Z`;
  const rim = pts.filter(([, y]) => y < base - 3).length;
  // vertical erosion fissures starting at the rock's top
  const fis = [];
  for (let i = 0; i < count * 6; i++) {
    const x = between(from, to);
    const h = height(x);
    if (h < 40) continue;
    const y0 = base - h + between(4, h * 0.25);
    const len = between(h * 0.25, h * 0.85);
    fis.push(`M ${x.toFixed(1)} ${y0.toFixed(1)} q ${between(-5, 5).toFixed(1)} ${(len / 2).toFixed(1)} ${between(-3, 3).toFixed(1)} ${len.toFixed(1)}`);
  }
  return { d, fis: fis.join(" "), rim };
}

function dust(seed, n) {
  const r = rng(seed);
  return Array.from({ length: n }, (_, i) => ({
    id: i,
    left: r() * 100,
    top: 35 + r() * 60,
    size: 1 + r() * 2.4,
    delay: -r() * 20,
    dur: 14 + r() * 18,
    drift: 20 + r() * 80,
  }));
}

// Built once: a 160x160 tile of dark specks with random transparency (same look as the old feTurbulence grain).
function makeGrainTile() {
  if (typeof document === "undefined") return "";
  const size = 160;
  const canvas = document.createElement("canvas");
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext("2d");
  const img = ctx.createImageData(size, size);
  const r = rng(4);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = r();
    img.data[i] = 40; img.data[i + 1] = 20; img.data[i + 2] = 10;
    img.data[i + 3] = Math.round(v * v * 0.12 * 255);
  }
  ctx.putImageData(img, 0, 0);
  return canvas.toDataURL("image/png");
}

export default function Landscape() {
  const grainTile = useMemo(makeGrainTile, []);
  const ref = useRef(null);
  const paths = useMemo(
    () => ({
      far: massif(11, 585, { count: 9, minH: 50, maxH: 120, minW: 260, maxW: 520, power: 0.3, rough: 3 }),
      mid: massif(23, 655, { count: 8, minH: 110, maxH: 240, minW: 150, maxW: 300, power: 0.42, rough: 5 }),
      tomb: massif(61, 800, { count: 3, minH: 250, maxH: 320, minW: 240, maxW: 330, power: 0.34, rough: 6, from: 1080, to: 1640, cMin: 1260, cMax: 1460 }),
      near: massif(47, 770, { count: 6, minH: 70, maxH: 170, minW: 220, maxW: 420, power: 0.5, rough: 6 }),
    }),
    []
  );
  const particles = useMemo(() => dust(3, 38), []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return undefined;
    let frame = 0;
    let tx = 0, ty = 0, cx = 0, cy = 0, sy = 0, lastSy = -1;
    let visible = true;
    // Animate only while something is still moving, and only while the hero is on screen.
    // A loop that runs every frame forever keeps the main thread busy and makes hover feel late.
    const loop = () => {
      frame = 0;
      cx += (tx - cx) * 0.12;
      cy += (ty - cy) * 0.12;
      el.style.setProperty("--mx", cx.toFixed(4));
      el.style.setProperty("--my", cy.toFixed(4));
      if (sy !== lastSy) { el.style.setProperty("--sy", Math.min(sy, 1200).toFixed(1)); lastSy = sy; }
      if (visible && (Math.abs(tx - cx) > 0.001 || Math.abs(ty - cy) > 0.001)) frame = requestAnimationFrame(loop);
    };
    const kick = () => { if (visible && !frame) frame = requestAnimationFrame(loop); };
    const onMove = (e) => {
      tx = (e.clientX / window.innerWidth - 0.5) * 2;
      ty = (e.clientY / window.innerHeight - 0.5) * 2;
      kick();
    };
    const onScroll = () => { sy = window.scrollY; kick(); };
    const io = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; if (visible) kick(); });
    io.observe(el);
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    kick();
    return () => {
      if (frame) cancelAnimationFrame(frame);
      io.disconnect();
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  return (
    <div className="landscape" ref={ref} aria-hidden="true">
      <svg className="ls-svg" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMax slice">
        <defs>
          <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#140b08" />
            <stop offset="0.32" stopColor="#3b1d14" />
            <stop offset="0.55" stopColor="#8c3f24" />
            <stop offset="0.7" stopColor="#d07a3f" />
            <stop offset="0.8" stopColor="#efb46a" />
          </linearGradient>
          <radialGradient id="sun" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#fff2cf" />
            <stop offset="0.25" stopColor="#ffd38a" stopOpacity="0.95" />
            <stop offset="0.6" stopColor="#f0954a" stopOpacity="0.35" />
            <stop offset="1" stopColor="#f0954a" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="rockFar" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#b9693f" />
            <stop offset="1" stopColor="#7b3b22" />
          </linearGradient>
          <linearGradient id="rockMid" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#c47a48" />
            <stop offset="0.45" stopColor="#8f4527" />
            <stop offset="1" stopColor="#4a2114" />
          </linearGradient>
          <linearGradient id="rockNear" x1="0" y1="0" x2="0.4" y2="1">
            <stop offset="0" stopColor="#7c3d22" />
            <stop offset="1" stopColor="#2b140c" />
          </linearGradient>
          <linearGradient id="sand" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#3a1d10" />
            <stop offset="1" stopColor="#140a06" />
          </linearGradient>
          <linearGradient id="haze" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#f2b06b" stopOpacity="0" />
            <stop offset="1" stopColor="#f2b06b" stopOpacity="0.38" />
          </linearGradient>
          <linearGradient id="facade" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#d08a55" />
            <stop offset="0.55" stopColor="#b26a3d" />
            <stop offset="1" stopColor="#7a3c22" />
          </linearGradient>
          {/* Rock grain as a small pre-rendered noise tile: a live SVG filter on moving layers
              is re-rendered on every frame and makes the whole page feel slow. */}
          <pattern id="grain" width="160" height="160" patternUnits="userSpaceOnUse">
            <image href={grainTile} width="160" height="160" />
          </pattern>
        </defs>

        <rect width={W} height={H} fill="url(#sky)" />
        </svg>
        <svg className="ls-svg ls-stars" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMax slice" aria-hidden="true">
          {Array.from({ length: 60 }, (_, i) => {
            const r = rng(100 + i);
            return <circle key={i} cx={r() * W} cy={r() * 260} r={0.4 + r() * 1.1} fill="#fbe7c4" opacity={0.15 + r() * 0.5} />;
          })}
        </svg>
        <svg className="ls-svg ls-static" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMax slice" aria-hidden="true">
        </svg>
        <svg className="ls-svg ls-layer ls-sun" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMax slice" aria-hidden="true">
          <circle cx="1000" cy="575" r="250" fill="url(#sun)" />
          <circle cx="1000" cy="575" r="48" fill="#fff0cd" opacity="0.92" />
        </svg>
        <svg className="ls-svg ls-static" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMax slice" aria-hidden="true">
        </svg>
        <svg className="ls-svg ls-layer ls-far" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMax slice" aria-hidden="true">
          <path d={paths.far.d} fill="url(#rockFar)" opacity="0.6" />
          <rect y="440" width={W} height="200" fill="url(#haze)" />
        </svg>
        <svg className="ls-svg ls-static" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMax slice" aria-hidden="true">
        </svg>
        <svg className="ls-svg ls-layer ls-mid" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMax slice" aria-hidden="true">
          <clipPath id="clipMid"><path d={paths.mid.d} /></clipPath>
          <path d={paths.mid.d} fill="url(#rockMid)" />
          <path d={paths.mid.d} fill="url(#grain)" />
          <path d={paths.mid.d} fill="none" stroke="#f3b878" strokeOpacity="0.35" strokeWidth="1.2" />
          <path d={paths.mid.fis} clipPath="url(#clipMid)" stroke="#3a180c" strokeOpacity="0.38" strokeWidth="1.5" fill="none" />
          <rect y="560" width={W} height="100" fill="url(#haze)" opacity="0.6" />
        </svg>
        <svg className="ls-svg ls-static" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMax slice" aria-hidden="true">

        {/* Rock-cut façade, inspired by the monumental tombs of Hegra */}
        </svg>
        <svg className="ls-svg ls-layer ls-tomb" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMax slice" aria-hidden="true">
          <path d={paths.tomb.d} fill="url(#rockMid)" />
          <path d={paths.tomb.d} fill="url(#grain)" />
          <path d={paths.tomb.d} fill="none" stroke="#f3b878" strokeOpacity="0.4" strokeWidth="1.3" />
          <clipPath id="clipTomb"><path d={paths.tomb.d} /></clipPath>
          <path d={paths.tomb.fis} clipPath="url(#clipTomb)" stroke="#3a180c" strokeOpacity="0.35" strokeWidth="1.4" fill="none" />
          <g transform="translate(1290 548)">
            <rect x="0" y="40" width="150" height="200" fill="url(#facade)" />
            {[0, 1, 2, 3, 4].map((i) => (
              <g key={i}>
                <rect x={6 + i * 30} y="14" width="14" height="10" fill="#c47c49" />
                <rect x={10 + i * 30} y="4" width="6" height="10" fill="#c47c49" />
              </g>
            ))}
            <rect x="0" y="24" width="150" height="16" fill="#b26a3d" />
            <rect x="-4" y="36" width="158" height="6" fill="#d9975f" />
            <rect x="8" y="48" width="8" height="192" fill="#8c4a2b" opacity="0.7" />
            <rect x="134" y="48" width="8" height="192" fill="#5f2c18" opacity="0.8" />
            <rect x="24" y="96" width="102" height="5" fill="#8c4a2b" opacity="0.8" />
            <path d="M 52 240 L 52 150 L 98 150 L 98 240 Z" fill="#2d140b" />
            <path d="M 46 150 L 104 150 L 104 142 L 46 142 Z" fill="#9c5532" />
            <path d="M 60 142 L 75 124 L 90 142 Z" fill="#a85d37" />
          </g>
        </svg>
        <svg className="ls-svg ls-static" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMax slice" aria-hidden="true">

        </svg>
        <svg className="ls-svg ls-layer ls-near" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMax slice" aria-hidden="true">
          <clipPath id="clipNear"><path d={paths.near.d} /></clipPath>
          <path d={paths.near.d} fill="url(#rockNear)" />
          <path d={paths.near.d} fill="url(#grain)" />
          <path d={paths.near.d} fill="none" stroke="#e59a5e" strokeOpacity="0.28" strokeWidth="1.2" />
          <path d={paths.near.fis} clipPath="url(#clipNear)" stroke="#120804" strokeOpacity="0.45" strokeWidth="1.6" fill="none" />
        </svg>
        <svg className="ls-svg ls-static" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMax slice" aria-hidden="true">
        <path d={`M 0 812 C 400 790, 900 826, ${W} 800 L ${W} ${H} L 0 ${H} Z`} fill="url(#sand)" />
      </svg>
      <div className="ls-dust">
        {particles.map((p) => (
          <span
            key={p.id}
            style={{
              left: `${p.left}%`,
              top: `${p.top}%`,
              width: p.size,
              height: p.size,
              animationDelay: `${p.delay}s`,
              animationDuration: `${p.dur}s`,
              "--drift": `${p.drift}px`,
            }}
          />
        ))}
      </div>
      <div className="ls-vignette" />
    </div>
  );
}
