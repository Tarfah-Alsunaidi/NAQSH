import React, { useState } from "react";
import Landscape from "./Landscape.jsx";
import AlulaMap from "./AlulaMap.jsx";
import Gallery from "./Gallery.jsx";
import NameWriter from "./NameWriter.jsx";
import Timeline from "./Timeline.jsx";
import { SCRIPTS } from "./alula.js";
import { Img, Ornament, SectionHead, useApp, useReveal, useT } from "./ui.jsx";

export default function Home() {
  const t = useT();
  const { inscriptions, go, lang } = useApp();
  useReveal([inscriptions.length]);
  const [open, setOpen] = useState(null);

  const featured = inscriptions.filter((r) => (r.translation_en || r.explanation_ar) && r.photos.length);

  return (
    <>
      <section className="hero">
        <Landscape />
        <div className="hero-content">
          <div className="hero-mark" aria-hidden="true">نقش</div>
          <p className="hero-kicker">{t.heroKicker}</p>
          <h1 className="hero-title">
            <span>{t.heroTitle}</span>
            <span className="accent">{t.heroTitle2}</span>
          </h1>
          <p className="hero-lead">{t.heroLead}</p>
          <div className="hero-actions">
            <button className="btn primary" onClick={() => go("try")}>
              {t.heroCta}
              <svg viewBox="0 0 24 24" className="arrow"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
            </button>
          </div>
        </div>
        <a className="scroll-cue" href="#scripts" onClick={(e) => { e.preventDefault(); document.getElementById("scripts")?.scrollIntoView({ behavior: "smooth" }); }}>
          <span className="cue-word">{t.scroll}</span><span className="cue-line" />
        </a>
      </section>

      <div className="stone">
        <section className="section scripts" id="scripts">
          <div className="scripts-band" aria-hidden="true" />
          <div className="container">
            <SectionHead kicker={t.introKicker} title={t.introTitle} />
            <div className="reveal">
            <div className={`script-reel ${open != null ? "has-open" : ""}`} onMouseLeave={() => setOpen(null)}>
              {SCRIPTS.map((sc, i) => (
                <article
                  key={sc.id}
                  className={`reel-item ${open === i ? "open" : ""}`}
                  onMouseEnter={() => setOpen(i)}
                  onFocus={() => setOpen(i)}
                  onClick={() => setOpen(open === i ? null : i)}
                  tabIndex={0}
                  aria-expanded={open === i}
                >
                  <img src={sc.img} alt={sc[lang]} loading="lazy" />
                  <div className="reel-shade" />
                  <div className="reel-head">
                    <span className="reel-num">{String(i + 1).padStart(2, "0")}</span>
                    <h3>{sc[lang]}</h3>
                  </div>
                  <div className="reel-more">
                    <span className="reel-era">{sc.era[lang]}</span>
                    <span className="reel-alt" lang={lang === "ar" ? "en" : "ar"} dir={lang === "ar" ? "ltr" : "rtl"}>{lang === "ar" ? sc.en : sc.ar}</span>
                    <p>{sc.body[lang]}</p>
                    <a className="reel-credit" dir="ltr" href={sc.credit.url} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>
                      {sc.credit.author} · {sc.credit.license}
                    </a>
                  </div>
                </article>
              ))}
            </div>
            </div>
            <p className="reel-hint">{t.scriptsHint}</p>
          </div>
        </section>

        <section className="section map-section">
          <div className="container">
            <SectionHead kicker={t.mapKicker} title={t.mapTitle} lead={t.mapLead} />
            <AlulaMap />
          </div>
        </section>

        <Timeline />

      {featured.length > 0 && (
        <section className="section featured-x">
          <div className="container">
            <div className="featured-head">
              <SectionHead kicker={t.featuredKicker} title={t.featuredTitle} />
              <button className="btn ghost light reveal" onClick={() => go("explore")}>{t.viewAll}</button>
            </div>
            <div className="reveal"><Gallery items={featured} /></div>
          </div>
        </section>
      )}

        <NameWriter />
      </div>
    </>
  );
}
