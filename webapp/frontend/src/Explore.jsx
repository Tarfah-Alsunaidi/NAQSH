import React, { useEffect, useState } from "react";
import { siteAr } from "./alula.js";
import { Credit, Img, Modal, Ornament, SectionHead, readingKind, useApp, useReveal, useT } from "./ui.jsx";

function Detail({ rec }) {
  const t = useT();
  const { lang } = useApp();
  const r = t.result;
  const [idx, setIdx] = useState(0);
  const photo = rec.photos[idx];
  return (
    <div className="detail">
      <div className="detail-media">
        <div className="detail-main">
          {photo && <img src={photo.url} alt={rec.name_en} />}
        </div>
        <div className="thumbs">
          {rec.photos.map((p, i) => (
            <button key={p.image_id} className={`thumb ${i === idx ? "on" : ""}`} onClick={() => setIdx(i)}>
              <img src={p.url} alt="" />
            </button>
          ))}
        </div>
        <Credit photo={photo} />
      </div>
      <div className="detail-info">
        <span className="feat-site">{lang === "ar" ? siteAr(rec.site) : rec.site}</span>
        <h2 className="display small" lang={lang}>{lang === "ar" ? rec.name_ar : rec.name_en}</h2>
        <p className="detail-ar" lang={lang === "ar" ? "en" : "ar"} dir={lang === "ar" ? "ltr" : "rtl"}>{lang === "ar" ? rec.name_en : rec.name_ar}</p>
        <Ornament />
        <dl className="fields">
          <div className="field"><dt>{r.ids}</dt><dd dir="ltr">{rec.official_ids || "—"}</dd></div>
          <div className="field"><dt>{r.script}</dt><dd dir="ltr">{rec.script}</dd></div>
          <div className={`field wide ${rec.transliteration ? "" : "muted"}`}>
            <dt>{r.translit}</dt>
            <dd dir="ltr">{rec.transliteration ? <span className="translit">{rec.transliteration}</span> : r.noTranslit}</dd>
          </div>
          <div className={`field wide ${rec.translation_en ? "" : "muted"}`}>
            <dt>{r.transl}</dt>
            <dd dir="ltr">{rec.translation_en ? <span className="quote">{rec.translation_en}</span> : r.noTransl}</dd>
          </div>
          <div className={`field wide ${rec.explanation_ar ? "" : "muted"}`}>
            <dt>{r.arabic}</dt><dd dir="rtl" lang="ar">{rec.explanation_ar || r.noArabic}</dd>
          </div>
          {rec.context_en && <div className="field wide"><dt>{r.context}</dt><dd dir="ltr">{rec.context_en}</dd></div>}
          <div className="field wide"><dt>{r.source}</dt><dd dir="ltr" className="small-text">{rec.citation}</dd></div>
          <div className="field wide"><dt>{r.basis}</dt><dd dir="ltr" className="small-text">{rec.identification_confidence}</dd></div>
        </dl>
      </div>
    </div>
  );
}

// Group each inscription by script family, from its class id.
function groupOf(c) {
  if (c.startsWith("JI-")) return "ikmah";
  if (c.startsWith("HG-T") || c.startsWith("HG-ITHLIB")) return "nabataean";
  if (c.startsWith("AU-ARABIC")) return "arabic";
  if (c.startsWith("HG-LATIN") || c.startsWith("AU-MINAIC") || c.startsWith("AU-NABARAB") || c.startsWith("AU-ROCKART")) return "other";
  return "dadanitic";
}
const GROUPS = ["all", "dadanitic", "ikmah", "nabataean", "arabic", "other"];


export default function Explore() {
  const t = useT();
  const { inscriptions, routeArg, lang } = useApp();
  const [open, setOpen] = useState(null);
  const [group, setGroup] = useState("all");
  const [q, setQ] = useState("");

  useEffect(() => {
    if (routeArg && inscriptions.length) {
      const rec = inscriptions.find((r) => r.class_name === routeArg);
      if (rec) setOpen(rec);
    }
  }, [routeArg, inscriptions]);

  const counts = {};
  inscriptions.forEach((r) => { const g = groupOf(r.class_name); counts[g] = (counts[g] || 0) + 1; });
  counts.all = inscriptions.length;
  const needle = q.trim().toLowerCase();
  const list = inscriptions.filter((r) =>
    (group === "all" || groupOf(r.class_name) === group) &&
    (!needle || [r.name_en, r.name_ar, r.site, r.class_name, r.script].join(" ").toLowerCase().includes(needle)))
    // documented readings first, so the collection opens with its best-understood pieces
    .sort((a, b) => ["full", "transl", "none"].indexOf(readingKind(a)) - ["full", "transl", "none"].indexOf(readingKind(b)));
  useReveal([inscriptions.length, group, needle]);

  return (
    <section className="page explore-page">
      <header className="ex-hero">
        <div className="container">
          <h1 className="display ex-title">{t.exploreTitle}</h1>
          <div className="ex-tools">
            <div className="ex-chips" role="tablist">
              {GROUPS.map((g) => (
                <button key={g} role="tab" aria-selected={group === g} className={group === g ? "on" : ""} onClick={() => setGroup(g)}>
                  {t.exGroups[g]}<span>{counts[g] || 0}</span>
                </button>
              ))}
            </div>
            <label className="ex-search">
              <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5" /><path d="M16 16l4.5 4.5" /></svg>
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t.exSearch} />
            </label>
          </div>
        </div>
      </header>

      <div className="container">
        <p className="ex-count">{t.exShowing(list.length)}</p>
        <div className="ex-grid">
          {list.map((rec, i) => {
            const main = lang === "ar" ? rec.name_ar : rec.name_en;
            const alt = lang === "ar" ? rec.name_en : rec.name_ar;
            return (
              <button key={rec.class_name} className="ex-card reveal" style={{ transitionDelay: `${(i % 4) * 70}ms` }} onClick={() => setOpen(rec)}>
                <div className="ex-img">
                  {rec.photos[0] && <Img src={rec.photos[0].url} alt={rec.name_en} />}
                </div>
                <div className="ex-shade" />
                <div className="ex-top">
                  <span className="ex-tag">{t.exGroups[groupOf(rec.class_name)]}</span>
                </div>
                <div className="ex-body">
                  <span className="ex-site">{lang === "ar" ? siteAr(rec.site) : rec.site}</span>
                  <h3 lang={lang}>{main}</h3>
                  <span className="ex-alt" lang={lang === "ar" ? "en" : "ar"} dir={lang === "ar" ? "ltr" : "rtl"}>{alt}</span>
                  <div className="ex-foot">
                    <span>{t.photosCount(rec.photos.length)}</span>
                  </div>
                </div>
                <span className="ex-open">{t.open}</span>
              </button>
            );
          })}
        </div>
        {!list.length && <p className="ex-empty">{t.exEmpty}</p>}
      </div>
      <Modal open={!!open} onClose={() => setOpen(null)} wide>
        {open && <Detail rec={open} />}
      </Modal>
    </section>
  );
}
