import React, { useCallback, useEffect, useRef, useState } from "react";
import { SCRIPTS } from "./alula.js";
import { SectionHead, useApp, useT } from "./ui.jsx";

// Approximate periods in which each script is attested in AlUla.
const MIN = -650;
const MAX = 900;
const ROWS = [
  { id: "dadanitic", from: -600, to: -100 },
  { id: "minaic", from: -550, to: -150 },
  { id: "nabataean", from: -1, to: 75 },
  { id: "latin", from: 213, to: 217 },
  { id: "nabarab", from: 280, to: 280 },
  { id: "arabic", from: 630, to: 880 },
];
const TICKS = [-600, -300, 1, 300, 600, 900];
const SPEED = 55; // years per second while playing

const pct = (y) => ((y - MIN) / (MAX - MIN)) * 100;

// The script shown for a given year: the one whose period contains it, else the nearest one.
function scriptAt(year) {
  let best = ROWS[0];
  let bestD = Infinity;
  ROWS.forEach((r) => {
    const d = year < r.from ? r.from - year : year > r.to ? year - r.to : 0;
    if (d < bestD || (d === bestD && r.from > best.from)) { best = r; bestD = d; }
  });
  return best;
}

function yearText(y, lang) {
  const v = Math.round(y);
  if (lang === "ar") return v <= 0 ? `${Math.abs(v) || 1} ق.م` : `${v}م`;
  return v <= 0 ? `${Math.abs(v) || 1} BCE` : `AD ${v}`;
}

export default function Timeline() {
  const t = useT();
  const { lang } = useApp();
  const rtl = lang === "ar";
  const [year, setYear] = useState(-560);
  const [playing, setPlaying] = useState(true);
  const [visible, setVisible] = useState(false);
  const root = useRef(null);
  const track = useRef(null);
  const yearRef = useRef(year);
  yearRef.current = year;

  // play only while on screen
  useEffect(() => {
    const el = root.current;
    if (!el || !("IntersectionObserver" in window)) { setVisible(true); return undefined; }
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.3 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!playing || !visible) return undefined;
    let raf;
    let last = performance.now();
    const step = (now) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      let next = yearRef.current + dt * SPEED;
      if (next > MAX - 20) next = MIN + 50;
      setYear(next);
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [playing, visible]);

  // drag / click on the track to travel in time
  const fromPointer = useCallback((clientX) => {
    const r = track.current.getBoundingClientRect();
    let f = (clientX - r.left) / r.width;
    if (rtl) f = 1 - f;
    setYear(MIN + Math.max(0, Math.min(1, f)) * (MAX - MIN));
  }, [rtl]);
  const onDown = (e) => {
    setPlaying(false);
    fromPointer(e.clientX);
    const move = (ev) => fromPointer(ev.clientX);
    const up = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };
  const onKey = (e) => {
    const k = { ArrowRight: rtl ? -25 : 25, ArrowLeft: rtl ? 25 : -25 }[e.key];
    if (k) { setPlaying(false); setYear((y) => Math.max(MIN, Math.min(MAX, y + k))); }
  };
  const jump = (r) => { setPlaying(false); setYear((r.from + r.to) / 2); };

  const cur = scriptAt(year);
  const sc = SCRIPTS.find((s) => s.id === cur.id);

  return (
    <section className="section timeline" ref={root}>
      <div className="container">
        <SectionHead kicker={t.tlKicker} title={t.tlTitle} lead={t.tlLead} />

        <div className="tlx reveal">
          <div className="tlx-stage">
            {SCRIPTS.map((s) => (
              <img key={s.id} src={s.img} alt="" className={s.id === cur.id ? "on" : ""} loading="lazy" />
            ))}
            <div className="tlx-shade" />
            <div className="tlx-text" key={cur.id}>
              <span className="tlx-era">{sc.era[lang]}</span>
              <h3>{sc[lang]}</h3>
              <p>{sc.body[lang]}</p>
            </div>
            <div className="tlx-year"><bdi>{yearText(year, lang)}</bdi></div>
            <button className="tlx-play" onClick={() => setPlaying((p) => !p)} aria-label={playing ? t.tlPause : t.tlPlay}>
              {playing
                ? <svg viewBox="0 0 24 24"><path d="M8 5v14M16 5v14" /></svg>
                : <svg viewBox="0 0 24 24"><path d="M7 5l12 7-12 7z" /></svg>}
            </button>
          </div>

          <div
            className="tlx-track"
            ref={track}
            onPointerDown={onDown}
            onKeyDown={onKey}
            role="slider"
            tabIndex={0}
            aria-valuemin={MIN}
            aria-valuemax={MAX}
            aria-valuenow={Math.round(year)}
            aria-valuetext={yearText(year, lang)}
          >
            <div className="tlx-line" />
            {ROWS.map((r) => (
              <span
                key={r.id}
                className={`tlx-seg ${r.id === cur.id ? "on" : ""} ${r.to - r.from < 20 ? "point" : ""}`}
                style={{ insetInlineStart: `${pct(r.from)}%`, width: r.to - r.from < 20 ? undefined : `${pct(r.to) - pct(r.from)}%` }}
              />
            ))}
            <span className="tlx-handle" style={{ insetInlineStart: `${pct(year)}%` }} />
            {TICKS.map((y) => (
              <span key={y} className="tlx-tick" style={{ insetInlineStart: `${pct(y)}%` }}>{y === 1 ? t.tlZero : yearText(y, lang)}</span>
            ))}
          </div>

          <div className="tlx-chips">
            {ROWS.map((r) => {
              const s = SCRIPTS.find((x) => x.id === r.id);
              return (
                <button key={r.id} className={r.id === cur.id ? "on" : ""} onClick={() => jump(r)}>{s[lang]}</button>
              );
            })}
          </div>
          <p className="tl-note">{t.tlNote}</p>
        </div>
      </div>
    </section>
  );
}
