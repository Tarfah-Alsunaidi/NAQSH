import React, { useState } from "react";
import { fmt } from "./api.js";
import { Ornament, ScoreMeter, Seal, useApp, useT } from "./ui.jsx";
import AlulaMap, { siteIdFor } from "./AlulaMap.jsx";
import { SITES, siteAr } from "./alula.js";
import { canShareFiles, download, resultCard, shareFile } from "./share.js";

// After a photo is recognised: where the inscription is, and a card the visitor can share.
function ResultExtras({ rec, imageUrl }) {
  const t = useT();
  const { lang } = useApp();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState("");
  const siteId = siteIdFor(rec);
  const site = SITES.find((x) => x.id === siteId);
  const meaning = lang === "ar" ? rec.explanation_ar || rec.translation_en : rec.translation_en || rec.explanation_ar;

  const run = async (how) => {
    setBusy(true);
    setDone("");
    try {
      const blob = await resultCard({
        photoUrl: imageUrl,
        site: lang === "ar" ? `${siteAr(rec.site)} · العُلا`.replace("العُلا · العُلا", "العُلا") : rec.site,
        title: lang === "ar" ? rec.name_ar || rec.name_en : rec.name_en,
        alt: lang === "ar" ? rec.name_en : rec.name_ar,
        meaning,
        label: t.galleryMeaning,
        lang,
      });
      if (how === "share") await shareFile(blob, "naqsh-ai-result.png", "NAQSH AI");
      else { download(blob, "naqsh-ai-result.png"); setDone(t.shareSaved); }
    } catch (e) {
      setDone(t.errors.generic);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="result-extras">
      <div className="rx-map">
        <span className="rx-label">{t.rxWhere}</span>
        {site ? (
          <>
            <AlulaMap focus={siteId} mini />
            <p className="rx-site"><strong>{site[lang]}</strong> · {site.body[lang]}</p>
          </>
        ) : (
          <p className="rx-site muted">{t.rxNoSite}</p>
        )}
      </div>
      <div className="rx-share">
        <button className="btn primary" onClick={() => run("download")} disabled={busy}>
          <svg viewBox="0 0 24 24" className="ico"><path d="M12 3v12M7 10l5 5 5-5M5 20h14" /></svg>
          {t.shareBtn}
        </button>
        {canShareFiles() && (
          <button className="btn ghost" onClick={() => run("share")} disabled={busy}>
            <svg viewBox="0 0 24 24" className="ico"><path d="M12 15V3M7 8l5-5 5 5M5 13v7h14v-7" /></svg>
            {t.shareOnly}
          </button>
        )}
        <span className="small-text">{done || t.shareHint}</span>
      </div>
    </div>
  );
}

function Field({ label, children, ltr, rtl, wide, muted }) {
  return (
    <div className={`field ${wide ? "wide" : ""} ${muted ? "muted" : ""}`}>
      <dt>{label}</dt>
      <dd dir={ltr ? "ltr" : rtl ? "rtl" : undefined} lang={rtl ? "ar" : ltr ? "en" : undefined}>
        {children}
      </dd>
    </div>
  );
}

export default function ResultCard({ result, imageUrl, recordNo, truth, onAgain }) {
  const t = useT();
  const { lang } = useApp();
  const [showModel, setShowModel] = useState(false);
  const r = t.result;
  const ok = result.recognised;
  const rec = result.record;

  return (
    <article className={`record ${ok ? "is-ok" : "is-no"}`}>
      <header className="record-head">
        <div>
          <div className="record-title">{r.record}</div>
          <div className="record-sub" lang={lang === "en" ? "ar" : "en"}>{r.recordAr}</div>
        </div>
        <div className="record-no" dir="ltr">No. {recordNo}</div>
      </header>
      <Ornament />

      <div className="record-body">
        <figure className="record-photo">
          <div className="frame">
            <img src={imageUrl} alt={r.uploaded} />
            <span className="corner tl" /><span className="corner tr" /><span className="corner bl" /><span className="corner br" />
          </div>
          <Seal ok={ok} />
          {truth && (
            <figcaption className="truth">
              <span>{r.truth}:</span>{" "}
              <strong dir="ltr">{truth.supported ? truth.name || truth.label : r.unsupported}</strong>
            </figcaption>
          )}
        </figure>

        <div className="record-info">
          <ScoreMeter score={result.score} threshold={result.threshold} />

          {ok && rec ? (
            <dl className="fields">
              <Field label={r.name} wide>
                <span className="rec-name" dir="ltr" lang="en">{rec.name_en}</span>
                {rec.name_ar && <span className="rec-name-ar" dir="rtl" lang="ar">{rec.name_ar}</span>}
              </Field>
              <Field label={r.ids} ltr>{rec.official_ids || "—"}</Field>
              <Field label={r.site} ltr>{rec.site}</Field>
              <Field label={r.script} ltr wide>{rec.script}</Field>
              <Field label={r.translit} ltr wide muted={!rec.transliteration}>
                {rec.transliteration ? <span className="translit">{rec.transliteration}</span> : r.noTranslit}
              </Field>
              <Field label={r.transl} ltr wide muted={!rec.translation_en}>
                {rec.translation_en ? <span className="quote">{rec.translation_en}</span> : r.noTransl}
              </Field>
              <Field label={r.arabic} rtl wide muted={!rec.explanation_ar}>
                {rec.explanation_ar || r.noArabic}
              </Field>
              {rec.context_en && <Field label={r.context} ltr wide>{rec.context_en}</Field>}
              <Field label={r.source} ltr wide>
                <span className="small-text">{rec.citation}</span>
                {rec.transliteration_source && rec.transliteration_source !== rec.citation && (
                  <span className="small-text block">{r.translitSource}: {rec.transliteration_source}</span>
                )}
                {rec.translation_source && rec.translation_source !== rec.citation && (
                  <span className="small-text block">{r.translSource}: {rec.translation_source}</span>
                )}
              </Field>
              <Field label={r.basis} ltr wide><span className="small-text">{rec.identification_confidence}</span></Field>
            </dl>
          ) : (
            <div className="not-box">
              <h3>{r.notTitle}</h3>
              <p>{r.notBody}</p>
            </div>
          )}

          {ok && rec && imageUrl && <ResultExtras rec={rec} imageUrl={imageUrl} />}

        </div>
      </div>
    </article>
  );
}
