import React, { useCallback, useEffect, useRef, useState } from "react";
import { api } from "./api.js";
import ResultCard from "./ResultCard.jsx";
import { SectionHead, useApp, useInterval, useT } from "./ui.jsx";

const ACCEPT = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/bmp", "image/tiff"];

export function ErrorBox({ error }) {
  const t = useT();
  if (!error) return null;
  let text = error.message || t.errors.generic;
  if (error.code === "offline") text = t.errors.offline;
  if (error.code === "model_loading") text = t.errors.loading;
  if (error.code === "model_unavailable") text = t.errors.modelError;
  const missing = error.detail && error.detail.missing_files;
  return (
    <div className="error-box" role="alert">
      <strong>{text}</strong>
      {error.detail && error.detail.error && <p className="small-text" dir="ltr">{error.detail.error}</p>}
      {missing && missing.length > 0 && (
        <p className="small-text" dir="ltr">{t.errors.missing} {missing.join(", ")}</p>
      )}
    </div>
  );
}

export function Scanning({ src }) {
  const t = useT();
  const [step, setStep] = useState(0);
  useInterval(() => setStep((s) => Math.min(s + 1, t.steps.length - 1)), 650);
  return (
    <div className="scanning">
      <div className="scan-frame">
        <img src={src} alt="" />
        <div className="scan-line" />
        <div className="scan-grid" />
      </div>
      <ol className="scan-steps">
        {t.steps.map((s, i) => (
          <li key={s} className={i < step ? "done" : i === step ? "now" : ""}>
            <span className="dot" />{s}
          </li>
        ))}
      </ol>
    </div>
  );
}

export default function TryPage() {
  const t = useT();
  const { health } = useApp();
  const [file, setFile] = useState(null);
  const [url, setUrl] = useState(null);
  const [drag, setDrag] = useState(false);
  const [state, setState] = useState("idle"); // idle | loading | done
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [recordNo, setRecordNo] = useState("");
  const input = useRef(null);
  const camera = useRef(null);
  const resultRef = useRef(null);

  useEffect(() => () => url && URL.revokeObjectURL(url), [url]);

  const choose = useCallback((f) => {
    if (!f) return;
    setError(null);
    setResult(null);
    setState("idle");
    if (!f.type.startsWith("image/") && !ACCEPT.includes(f.type)) {
      setError({ message: t.errors.notImage });
      return;
    }
    if (f.size > 20 * 1024 * 1024) {
      setError({ message: t.errors.tooLarge });
      return;
    }
    setFile(f);
    setUrl(URL.createObjectURL(f));
  }, [t]);

  const analyze = async () => {
    if (!file) return;
    setState("loading");
    setError(null);
    const started = Date.now();
    try {
      const res = await api.predictFile(file);
      // Let the reading animation complete its first steps; the result itself is never altered.
      const wait = Math.max(0, 1300 - (Date.now() - started));
      await new Promise((r) => setTimeout(r, wait));
      const d = new Date();
      setRecordNo(`UP-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}-${String(d.getHours()).padStart(2, "0")}${String(d.getMinutes()).padStart(2, "0")}${String(d.getSeconds()).padStart(2, "0")}`);
      setResult(res);
      setState("done");
      setTimeout(() => resultRef.current && resultRef.current.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
    } catch (e) {
      setError(e);
      setState("idle");
    }
  };

  const reset = () => {
    setFile(null);
    setUrl(null);
    setResult(null);
    setError(null);
    setState("idle");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const disabled = !file || state === "loading" || !(health && health.ready);

  return (
    <section className="page try">
      <div className="container">
        <SectionHead kicker={t.tryKicker} title={t.tryTitle} lead={t.tryLead} />
        <div className="try-grid">
          <div className="try-left">
            {state === "loading" && url ? (
              <Scanning src={url} />
            ) : (
              <div
                className={`dropzone ${drag ? "drag" : ""} ${url ? "has" : ""}`}
                onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
                onDragLeave={() => setDrag(false)}
                onDrop={(e) => { e.preventDefault(); setDrag(false); choose(e.dataTransfer.files[0]); }}
                onClick={() => !url && input.current && input.current.click()}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && input.current && input.current.click()}
              >
                {url ? (
                  <img className="preview" src={url} alt={t.result.uploaded} />
                ) : (
                  <div className="drop-inner">
                    <svg viewBox="0 0 64 64" className="drop-icon" aria-hidden="true">
                      <rect x="8" y="14" width="48" height="38" rx="3" />
                      <path d="M8 44l14-14 10 10 8-8 16 16" />
                      <circle cx="44" cy="25" r="4" />
                      <path d="M32 4v18M25 11l7-7 7 7" />
                    </svg>
                    <p className="drop-title">{t.drop}</p>
                    <p className="drop-or">{t.dropOr}</p>
                    <div className="drop-btns">
                      <span className="btn ghost small">{t.browse}</span>
                      <span
                        className="btn primary small"
                        role="button"
                        tabIndex={0}
                        onClick={(e) => { e.stopPropagation(); camera.current && camera.current.click(); }}
                      >
                        <svg viewBox="0 0 24 24" className="arrow"><path d="M4 7h4l2-3h4l2 3h4v12H4z" /><circle cx="12" cy="13" r="3.5" /></svg>
                        {t.takePhoto}
                      </span>
                    </div>
                    <p className="drop-hint">{t.dropHint}</p>
                  </div>
                )}
                <span className="corner tl" /><span className="corner tr" /><span className="corner bl" /><span className="corner br" />
              </div>
            )}
            <input ref={input} type="file" accept="image/*" hidden onChange={(e) => { choose(e.target.files[0]); e.target.value = ""; }} />
            {/* On phones this opens the rear camera directly; on a computer it opens the file picker. */}
            <input ref={camera} type="file" accept="image/*" capture="environment" hidden onChange={(e) => { choose(e.target.files[0]); e.target.value = ""; }} />

            <div className="try-actions">
              <button className="btn primary wide" disabled={disabled} onClick={analyze}>
                {state === "loading" ? t.analyzing : t.analyze}
              </button>
              {url && state !== "loading" && (
                <div className="try-sub">
                  <button className="link-btn" onClick={() => input.current && input.current.click()}>{t.replace}</button>
                  <button className="link-btn" onClick={() => camera.current && camera.current.click()}>{t.takePhoto}</button>
                  <button className="link-btn" onClick={reset}>{t.clear}</button>
                </div>
              )}
            </div>
            {health && !health.ready && (
              <ErrorBox error={health.status === "error"
                ? { code: "model_unavailable", detail: { error: health.error, missing_files: health.missing_files } }
                : { code: "model_loading" }} />
            )}
            <ErrorBox error={error} />
          </div>

          <div className="try-right" ref={resultRef}>
            {state === "done" && result ? (
              <ResultCard result={result} imageUrl={url} recordNo={recordNo} onAgain={reset} />
            ) : (
              <div className="record placeholder">
                <div className="ph-seal" />
                <h3>{t.emptyResultTitle}</h3>
                <p>{t.emptyResultBody}</p>
                <div className="ph-lines"><span /><span /><span /><span /></div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
