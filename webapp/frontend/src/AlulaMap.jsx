import React, { useEffect, useMemo, useState } from "react";
import { LANDMARKS, SCRIPTS, SITES } from "./alula.js";
import { useApp, useT } from "./ui.jsx";

// Stylised map of the AlUla valley (approximate positions, north up).
const BOX = { lat0: 26.588, lat1: 26.805, lon0: 37.855, lon1: 38.005 };
const W = 460;
const KM_LON = 99.4; // km per degree of longitude at ~26.6°N
const KM_LAT = 110.8;
const H = Math.round(W * ((BOX.lat1 - BOX.lat0) * KM_LAT) / ((BOX.lon1 - BOX.lon0) * KM_LON));
const px = (lon) => ((lon - BOX.lon0) / (BOX.lon1 - BOX.lon0)) * W;
const py = (lat) => ((BOX.lat1 - lat) / (BOX.lat1 - BOX.lat0)) * H;
const KM = W / ((BOX.lon1 - BOX.lon0) * KM_LON);

function rng(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

// Valley floor (Wadi al-Qura) from Qurh north to the Hegra plain.
const VALLEY = [
  [38.03, 26.47], [38.02, 26.5], [37.985, 26.535], [37.955, 26.565], [37.932, 26.595],
  [37.922, 26.62], [37.914, 26.645], [37.916, 26.67], [37.928, 26.705], [37.94, 26.74], [37.952, 26.785], [37.96, 26.815],
];

function smoothPath(pts) {
  const p = pts.map(([lon, lat]) => [px(lon), py(lat)]);
  let d = `M${p[0][0].toFixed(1)} ${p[0][1].toFixed(1)}`;
  for (let i = 1; i < p.length; i++) {
    const [x0, y0] = p[i - 1];
    const [x1, y1] = p[i];
    const mx = (x0 + x1) / 2;
    const my = (y0 + y1) / 2;
    d += ` Q${x0.toFixed(1)} ${y0.toFixed(1)} ${mx.toFixed(1)} ${my.toFixed(1)}`;
  }
  const last = p[p.length - 1];
  return `${d} T${last[0].toFixed(1)} ${last[1].toFixed(1)}`;
}

function rock(r, cx, cy, rx, ry) {
  const n = 9 + Math.floor(r() * 6);
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + r() * 0.3;
    const k = 0.62 + r() * 0.5;
    pts.push(`${(cx + Math.cos(a) * rx * k).toFixed(1)} ${(cy + Math.sin(a) * ry * k).toFixed(1)}`);
  }
  return `M${pts.join(" L")}Z`;
}

function useTerrain() {
  return useMemo(() => {
    const r = rng(42);
    const rocks = [];
    // Sandstone massifs: west and east of the valley, and scattered outcrops on the Hegra plain.
    const zones = [
      { lon: [37.855, 37.9], lat: [26.6, 26.73], n: 30, s: [22, 44] },
      { lon: [37.94, 38.005], lat: [26.6, 26.725], n: 34, s: [20, 42] },
      { lon: [37.855, 38.005], lat: [26.735, 26.805], n: 46, s: [6, 16] },
    ];
    const pins = SITES.filter((x) => x.lat > BOX.lat0).map((x) => [px(x.lon), py(x.lat) - 18]);
    zones.forEach((z) => {
      for (let i = 0; i < z.n; i++) {
        const lon = z.lon[0] + r() * (z.lon[1] - z.lon[0]);
        const lat = z.lat[0] + r() * (z.lat[1] - z.lat[0]);
        const cx = px(lon);
        const cy = py(lat);
        const s = z.s[0] + r() * (z.s[1] - z.s[0]);
        const nearValley = VALLEY.some(([vl, vt]) => Math.hypot(px(vl) - cx, py(vt) - cy) < 30 + s * 0.6);
        const nearPin = pins.some(([x, y]) => Math.hypot(x - cx, y - cy) < 30 + s * 0.5);
        if (nearValley || nearPin) continue;
        const ry = s * (0.55 + r() * 0.4);
        rocks.push({ d: rock(r, cx, cy, s, ry), shade: rock(r, cx + s * 0.12, cy + ry * 0.22, s * 0.8, ry * 0.7), top: rock(r, cx - s * 0.15, cy - ry * 0.25, s * 0.45, ry * 0.35) });
      }
    });
    const palms = [];
    for (let i = 0; i < 170; i++) {
      const t = r() * (VALLEY.length - 1.2);
      const a = Math.floor(t);
      const f = t - a;
      const [l0, t0] = VALLEY[a];
      const [l1, t1] = VALLEY[a + 1];
      palms.push([px(l0 + (l1 - l0) * f) + (r() - 0.5) * 22, py(t0 + (t1 - t0) * f) + (r() - 0.5) * 10, 1.4 + r() * 1.8]);
    }
    const dunes = [];
    for (let i = 0; i < 26; i++) {
      const x = r() * W;
      const y = r() * H;
      const w = 18 + r() * 34;
      dunes.push(`M${(x - w).toFixed(0)} ${y.toFixed(0)} q${w.toFixed(0)} ${(-8 - r() * 6).toFixed(0)} ${(2 * w).toFixed(0)} 0`);
    }
    return { rocks, palms, dunes, valley: smoothPath(VALLEY) };
  }, []);
}

// Which map site an inscription record belongs to (null when its exact site is not documented).
export function siteIdFor(rec) {
  const c = rec.class_name || "";
  const site = rec.site || "";
  if (c.startsWith("JI-") || /Ikmah/.test(site)) return "ikmah";
  if (c.startsWith("HG-") || /Hegra|Ithlib/.test(site)) return "hegra";
  if (/UMMDARAJ/.test(c) || /^Umm Daraj/.test(site)) return "ummdaraj";
  if (c.startsWith("AU-NABARAB")) return "qurh";
  if (/Dadan|Khuraybah|Ḫuraybah/.test(site) || c.startsWith("MUS-") || c.startsWith("Al-")) return "dadan";
  return null;
}

export default function AlulaMap({ focus = null, mini = false }) {
  const t = useT();
  const { lang } = useApp();
  const [active, setActive] = useState(focus || "ikmah");
  // mini map (result page): start on the whole valley, then glide in to the inscription's site
  const [zoomed, setZoomed] = useState(false);
  useEffect(() => {
    if (!mini) return undefined;
    setZoomed(false);
    const id = setTimeout(() => setZoomed(true), 500);
    return () => clearTimeout(id);
  }, [mini, focus]);
  const terrain = useTerrain();
  const rtl = lang === "ar";
  const site = SITES.find((s) => s.id === active);
  let zoomStyle;
  if (mini) {
    const f = SITES.find((x) => x.id === focus);
    const onMap = f && f.lat >= BOX.lat0;
    const fx = onMap ? px(f.lon) : W / 2;
    const fy = onMap ? py(f.lat) - 18 : H - 120;
    const z = zoomed && onMap ? 1.6 : 1;
    zoomStyle = { transform: `translate(${W / 2 - fx * z}px, ${H / 2 - fy * z}px) scale(${z})`, transformOrigin: "0 0" };
  }
  const scriptName = (id) => {
    const sc = SCRIPTS.find((s) => s.id === id);
    return sc ? sc[lang] : id;
  };

  return (
    <div className="amap">
      <div className={`amap-frame ${mini ? "mini" : "reveal"}`}>
        <svg className="amap-svg" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={t.mapTitle}
             preserveAspectRatio={mini ? "xMidYMid slice" : "xMidYMid meet"}>
          <defs>
            <linearGradient id="amap-sand" x1="0" y1="0" x2="0.4" y2="1">
              <stop offset="0" stopColor="#f0dcb8" />
              <stop offset="0.5" stopColor="#ead1a7" />
              <stop offset="1" stopColor="#e2c193" />
            </linearGradient>
            <linearGradient id="amap-rock" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#d49a68" />
              <stop offset="1" stopColor="#b26a40" />
            </linearGradient>
            <radialGradient id="amap-vignette" cx="0.5" cy="0.5" r="0.75">
              <stop offset="0.6" stopColor="#000" stopOpacity="0" />
              <stop offset="1" stopColor="#5a3420" stopOpacity="0.28" />
            </radialGradient>
          </defs>
          <g className="amap-zoom" style={zoomStyle}>
          <rect width={W} height={H} fill="url(#amap-sand)" />
          <g stroke="#c49a6c" strokeOpacity="0.45" strokeWidth="1" fill="none">
            {terrain.dunes.map((d, i) => <path key={i} d={d} />)}
          </g>
          <path d={terrain.valley} fill="none" stroke="#dcc49a" strokeWidth="46" strokeLinecap="round" strokeOpacity="0.8" />
          <path d={terrain.valley} fill="none" stroke="#c9b083" strokeWidth="1.2" strokeDasharray="2 5" />
          <g fill="#6f7f4a" fillOpacity="0.75">
            {terrain.palms.map(([x, y, r], i) => <circle key={i} cx={x} cy={y} r={r} />)}
          </g>
          <g>
            {terrain.rocks.map((rk, i) => (
              <g key={i}>
                <path d={rk.d} transform="translate(3 4)" fill="#7a4428" fillOpacity="0.22" />
                <path d={rk.d} fill="url(#amap-rock)" />
                <path d={rk.shade} fill="#8f4f2c" fillOpacity="0.28" />
                <path d={rk.top} fill="#f0c493" fillOpacity="0.45" />
              </g>
            ))}
          </g>
          <rect width={W} height={H} fill="url(#amap-vignette)" />

          {/* scale bar and compass */}
          <g className="amap-scale" transform={`translate(18 ${H - 26})`}>
            <path d={`M0 0h${(5 * KM).toFixed(1)}`} />
            <path d={`M0 -4v8M${(5 * KM).toFixed(1)} -4v8`} />
            <text x={(5 * KM) / 2} y="-8">5 km</text>
          </g>
          <g className="amap-compass" transform={`translate(${W - 34} 38)`}>
            <circle r="18" />
            <path d="M0 -15 L5 0 L0 15 L-5 0Z" />
            <path d="M0 -15 L5 0 L-5 0Z" className="n" />
            <text y="-22">N</text>
          </g>

          {LANDMARKS.map((l) => (
            <g key={l.id} className="amap-land" transform={`translate(${px(l.lon).toFixed(1)} ${py(l.lat).toFixed(1)})`}>
              <rect x="-3.5" y="-3.5" width="7" height="7" transform="rotate(45)" />
              <text x={l.id === "oldtown" ? -9 : 9} y="4" direction={rtl ? "rtl" : "ltr"}
                    textAnchor={(l.id === "oldtown") !== rtl ? "end" : "start"}>{l[lang]}</text>
            </g>
          ))}

          {SITES.map((s) => {
            const on = s.id === active;
            const flip = s.id === "ummdaraj" || s.id === "ikmah";
            const off = s.lat < BOX.lat0;
            if (off) {
              const lbl = `${s[lang]} · ${t.mapSouth}`;
              const w = Math.round(lbl.length * 6.4 + 46);
              return (
                <g key={s.id} className={`amap-pin off ${on ? "on" : ""}`} transform={`translate(${(W - w / 2 - 14).toFixed(1)} ${H - 30})`}
                   onClick={() => !mini && setActive(s.id)} onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && !mini && setActive(s.id)}
                   tabIndex={mini ? -1 : 0} role="button" aria-pressed={on} aria-label={s[lang]}>
                  <rect className="tag" x={-w / 2} y="-15" width={w} height="30" rx="15" />
                  <path className="arrow" d={`M${-w / 2 + 14} -4 l6 7 l6 -7`} />
                  <text className="label" x="10" y="4" textAnchor="middle" direction={rtl ? "rtl" : "ltr"}>{lbl}</text>
                </g>
              );
            }
            return (
              <g
                key={s.id}
                className={`amap-pin ${on ? "on" : ""} ${mini && on ? "landing" : ""} ${mini && !on ? "dim" : ""}`}
                transform={`translate(${px(s.lon).toFixed(1)} ${py(s.lat).toFixed(1)})`}
                onClick={() => !mini && setActive(s.id)}
                onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setActive(s.id)}
                tabIndex={mini ? -1 : 0}
                role="button"
                aria-pressed={on}
                aria-label={s[lang]}
              >
                <circle className="ring" r="16" />
                <path className="drop" d="M0 0 C-7 -9 -10 -14 -10 -19 A10 10 0 1 1 10 -19 C10 -14 7 -9 0 0Z" />
                <circle className="dot" cy="-19" r="3.6" />
                <text className="label" x={flip ? -16 : 16} y="-14" direction={rtl ? "rtl" : "ltr"}
                      textAnchor={flip !== rtl ? "end" : "start"}>{s[lang]}</text>
              </g>
            );
          })}
          </g>
        </svg>
        <p className="amap-note">{t.mapNote}</p>
      </div>

      {!mini && site && (
        <article className="amap-card" key={site.id}>
          <div className="amap-card-img">
            <img src={site.img} alt={site[lang]} loading="lazy" />
            <span className="photo-credit" dir="ltr">{site.credit.author} · {site.credit.license}</span>
          </div>
          <div className="amap-card-body">
            <span className="amap-card-kicker">{t.mapSite}</span>
            <h3>{site[lang]}</h3>
            <p>{site.body[lang]}</p>
            <div className="chips">
              {site.scripts.map((id) => <span className="chip" key={id}>{scriptName(id)}</span>)}
            </div>
          </div>
        </article>
      )}
    </div>
  );
}
