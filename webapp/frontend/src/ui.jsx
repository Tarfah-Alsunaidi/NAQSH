import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { STRINGS } from "./i18n.js";
import { fmt } from "./api.js";

export const AppContext = createContext(null);
export const useApp = () => useContext(AppContext);
export const useT = () => STRINGS[useApp().lang];

export function Kicker({ children }) {
  return (
    <div className="kicker">
      <span className="kicker-line" />
      <span>{children}</span>
    </div>
  );
}

export function SectionHead({ kicker, title, lead, center }) {
  return (
    <header className={`section-head reveal ${center ? "center" : ""}`}>
      {kicker && <Kicker>{kicker}</Kicker>}
      <h2 className="display">{title}</h2>
      {lead && <p className="lead">{lead}</p>}
    </header>
  );
}

// A thin geometric divider inspired by carved architectural bands (no letters).
export function Ornament({ className = "" }) {
  return (
    <svg className={`ornament ${className}`} viewBox="0 0 240 16" aria-hidden="true">
      <path d="M0 8 H92" />
      <path d="M148 8 H240" />
      <path d="M104 8 l8 -6 l8 6 l8 -6 l8 6" fill="none" />
      <path d="M104 8 l8 6 l8 -6 l8 6 l8 -6" fill="none" />
      <circle cx="98" cy="8" r="2" />
      <circle cx="142" cy="8" r="2" />
    </svg>
  );
}

export function Modal({ open, onClose, children, wide }) {
  const t = useT();
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.classList.add("no-scroll");
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.classList.remove("no-scroll");
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className={`modal ${wide ? "wide" : ""}`} onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label={t.close}>
          <svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18" /></svg>
        </button>
        {children}
      </div>
    </div>
  );
}

// Score meter. Scores of this model cluster near 1, so the bar shows the full 0–1 range
// and a magnified strip around the threshold, both drawn from the real numbers.
export function ScoreMeter({ score, threshold, compact }) {
  const t = useT();
  const ok = score >= threshold;
  const lo = Math.max(0, Math.min(score, threshold) - 0.05);
  const span = 1 - lo || 1;
  const z = (v) => `${((v - lo) / span) * 100}%`;
  const diff = Math.abs(score - threshold);
  return (
    <div className={`meter ${ok ? "ok" : "no"} ${compact ? "compact" : ""}`}>
      <div className="meter-numbers">
        <div>
          <span className="meter-label">{t.result.score}</span>
          <span className="meter-value">{fmt(score)}</span>
        </div>
        <div className="meter-th">
          <span className="meter-label">{t.result.threshold}</span>
          <span className="meter-value small">{fmt(threshold)}</span>
        </div>
      </div>
      <div className="meter-track" dir="ltr">
        <div className="meter-fill" style={{ width: `${Math.max(0, Math.min(1, score)) * 100}%` }} />
        <div className="meter-tick" style={{ left: `${threshold * 100}%` }} />
      </div>
      {!compact && (
        <>
          <div className="meter-zoom" dir="ltr">
            <span className="meter-zoom-label">{fmt(lo, 2)}</span>
            <div className="meter-zoom-track">
              <div className="meter-fill" style={{ width: z(score) }} />
              <div className="meter-tick" style={{ left: z(threshold) }} />
            </div>
            <span className="meter-zoom-label">1.00</span>
          </div>
          <p className="meter-caption">
            {ok ? t.result.aboveBy(fmt(diff)) : t.result.belowBy(fmt(diff))} · {t.result.scoreNote}
          </p>
        </>
      )}
    </div>
  );
}

export function Seal({ ok }) {
  const t = useT();
  return (
    <div className={`seal ${ok ? "ok" : "no"}`}>
      <svg viewBox="0 0 120 120" aria-hidden="true">
        <circle cx="60" cy="60" r="56" />
        <circle cx="60" cy="60" r="46" />
        {ok ? <path d="M40 61 l13 13 l28 -30" /> : <path d="M44 44 l32 32 M76 44 l-32 32" />}
      </svg>
      <span>{ok ? t.result.recognised : t.result.notRecognised}</span>
    </div>
  );
}

// Reveal-on-scroll: one shared observer; call scanReveal() after anything renders new .reveal elements.
let revealObserver = null;
export function scanReveal() {
  if (typeof window === "undefined") return;
  const els = document.querySelectorAll(".reveal:not(.in):not([data-obs])");
  if (!("IntersectionObserver" in window)) {
    els.forEach((el) => el.classList.add("in"));
    return;
  }
  if (!revealObserver) {
    revealObserver = new IntersectionObserver(
      (entries) => entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add("in"); revealObserver.unobserve(e.target); }
      }),
      { rootMargin: "0px 0px -6% 0px" }
    );
  }
  els.forEach((el) => { el.dataset.obs = "1"; revealObserver.observe(el); });
}

export function useReveal(deps = []) {
  useEffect(() => { scanReveal(); }, deps); // eslint-disable-line react-hooks/exhaustive-deps
}

export function Img({ src, alt, className }) {
  const [loaded, setLoaded] = useState(false);
  return (
    <img
      src={src}
      alt={alt}
      className={`${className || ""} ${loaded ? "loaded" : ""}`}
      loading="lazy"
      onLoad={() => setLoaded(true)}
    />
  );
}

export function Credit({ photo }) {
  const t = useT();
  if (!photo) return null;
  return (
    <p className="credit" dir="ltr">
      {t.credit}: {photo.author} · {photo.license} ·{" "}
      <a href={photo.source_url} target="_blank" rel="noreferrer">
        {photo.source}
      </a>
    </p>
  );
}

export function readingKind(rec) {
  if (rec.transliteration && rec.translation_en) return "full";
  if (rec.translation_en) return "transl";
  return "none";
}

export function useInterval(cb, ms) {
  const saved = useRef(cb);
  useEffect(() => { saved.current = cb; }, [cb]);
  useEffect(() => {
    if (ms == null) return undefined;
    const id = setInterval(() => saved.current(), ms);
    return () => clearInterval(id);
  }, [ms]);
}
