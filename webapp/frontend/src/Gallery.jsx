import React, { useCallback, useEffect, useRef, useState } from "react";
import { useApp, useT } from "./ui.jsx";
import { siteAr } from "./alula.js";

// A slow, self-advancing exhibition of the inscriptions whose meaning is documented.
const DURATION = 7000;

export default function Gallery({ items }) {
  const t = useT();
  const { lang, go } = useApp();
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const [visible, setVisible] = useState(false);
  const ref = useRef(null);
  const n = items.length;

  const goTo = useCallback((k) => setI(((k % n) + n) % n), [n]);

  // Only run while the gallery is on screen and the tab is visible.
  useEffect(() => {
    const el = ref.current;
    if (!el || !("IntersectionObserver" in window)) { setVisible(true); return undefined; }
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.25 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // The progress bar drives the slideshow: when its fill animation ends, the next slide comes in.
  // So the bar and the slide change can never get out of step (pausing pauses both).
  const running = visible && !paused && n > 1;

  if (!n) return null;
  const rec = items[i];
  const meaning = lang === "ar" ? rec.explanation_ar || rec.translation_en : rec.translation_en || rec.explanation_ar;
  const photo = rec.photos[0];
  const next = (d) => goTo(i + d);

  return (
    <div
      className={`gallery-x ${running ? "running" : ""}`}
      ref={ref}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") next(lang === "ar" ? -1 : 1);
        if (e.key === "ArrowLeft") next(lang === "ar" ? 1 : -1);
      }}
      tabIndex={0}
      aria-roledescription="carousel"
    >
      <div className="gx-stage">
        {items.map((r, k) => (
          <figure key={r.class_name} className={`gx-slide ${k === i ? "on" : ""}`} aria-hidden={k !== i}>
            {r.photos[0] && <img src={r.photos[0].url} alt={r.name_en} loading={k < 2 ? "eager" : "lazy"} />}
          </figure>
        ))}
        <div className="gx-shade" />
        {photo && <span className="photo-credit" dir="ltr">{photo.author} · {photo.license}</span>}
        <div className="gx-arrows">
          {/* the left arrow always moves left in reading order: back in English, forward in Arabic */}
          <button onClick={() => next(lang === "ar" ? 1 : -1)} aria-label={lang === "ar" ? "Next" : "Previous"}><svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7" /></svg></button>
          <button onClick={() => next(lang === "ar" ? -1 : 1)} aria-label={lang === "ar" ? "Previous" : "Next"}><svg viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" /></svg></button>
        </div>
      </div>

      <div className="gx-text" key={rec.class_name}>
        <span className="gx-site">{lang === "ar" ? `${siteAr(rec.site)} · العُلا`.replace("العُلا · العُلا", "العُلا") : rec.site}</span>
        <h3 lang={lang}>{lang === "ar" ? rec.name_ar : rec.name_en}</h3>
        <span className="gx-alt" lang={lang === "ar" ? "en" : "ar"} dir={lang === "ar" ? "ltr" : "rtl"}>
          {lang === "ar" ? rec.name_en : rec.name_ar}
        </span>
        <span className="gx-label">{t.galleryMeaning}</span>
        <p className="gx-meaning" lang={lang}>{meaning}</p>
        <button className="btn ghost light" onClick={() => go("explore", rec.class_name)}>{t.galleryOpen}</button>
      </div>

      <div className="gx-dots">
        {items.map((r, k) => (
          <button key={r.class_name} className={k === i ? "on" : ""} onClick={() => goTo(k)} aria-label={r.name_en}>
            <span>
              {k === i && <i key={i} style={{ animationDuration: `${DURATION}ms` }} onAnimationEnd={() => goTo(i + 1)} />}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
