import React, { useMemo, useState } from "react";
import { toDadanitic } from "./dadanitic.js";
import { canShareFiles, download, nameCard, shareFile } from "./share.js";
import { useT } from "./ui.jsx";

export default function NameWriter() {
  const t = useT();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const shown = name.trim() || t.nwExample;
  const letters = useMemo(() => toDadanitic(shown), [shown]);
  const kept = letters.filter((l) => !l.space && !l.dropped);
  const glyphs = letters.map((l) => (l.space ? " " : l.dropped ? "" : l.glyph)).join("").trim();
  const translit = letters.map((l) => (l.space ? " " : l.dropped ? "" : l.tr)).join("").trim();
  const hasArabic = kept.length > 0;

  const run = async (how) => {
    if (!hasArabic) return;
    setBusy(true);
    try {
      const blob = await nameCard({ glyphs, arabic: shown, translit, caption: t.nwCardCaption, note: t.nwNote });
      if (how === "share") await shareFile(blob, "naqsh-dadanitic-name.png", t.nwTitle);
      else download(blob, "naqsh-dadanitic-name.png");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="section name-writer">
      <div className="container nw-grid">
        <div className="nw-intro reveal">
          <span className="kicker"><span className="kicker-line" />{t.nwKicker}</span>
          <h2 className="display">{t.nwTitle}</h2>
          <p className="lead">{t.nwLead}</p>
          <label className="nw-input">
            <input
              value={name}
              onChange={(e) => setName(e.target.value.slice(0, 24))}
              placeholder={t.nwPlaceholder}
              dir="rtl"
              lang="ar"
              aria-label={t.nwPlaceholder}
            />
          </label>
          {name && !hasArabic && <p className="nw-warn">{t.nwArabicOnly}</p>}
        </div>

        <div className="nw-stone reveal">
          <div className="nw-glyphs" dir="rtl" aria-label={translit}>
            {letters.map((l, i) => (l.space
              ? <span key={i} className="nw-gap" />
              : l.dropped ? null : <span key={`${i}-${l.glyph}`} className="nw-g" style={{ animationDelay: `${i * 70}ms` }}>{l.glyph}</span>))}
          </div>
          <div className="nw-translit" dir="ltr">{translit}</div>
          <div className="nw-map" dir="rtl">
            {letters.filter((l) => !l.space).map((l, i) => (
              <span key={i} className={`nw-pair ${l.dropped ? "dropped" : ""}`} title={l.dropped ? t.nwDropped : undefined}>
                <b>{l.dropped ? "–" : l.glyph}</b>
                <i lang="ar">{l.ar}</i>
                <small dir="ltr">{l.dropped ? "" : l.tr}</small>
              </span>
            ))}
          </div>
          <p className="nw-note">{t.nwNote}</p>
          <div className="nw-actions">
            <button className="btn primary" onClick={() => run("download")} disabled={!hasArabic || busy}>
              <svg viewBox="0 0 24 24" className="ico"><path d="M12 3v12M7 10l5 5 5-5M5 20h14" /></svg>
              {t.nwSave}
            </button>
            {canShareFiles() && (
              <button className="btn ghost light" onClick={() => run("share")} disabled={!hasArabic || busy}>
                <svg viewBox="0 0 24 24" className="ico"><path d="M12 15V3M7 8l5-5 5 5M5 13v7h14v-7" /></svg>
                {t.shareOnly}
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
