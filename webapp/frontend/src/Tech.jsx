import React from "react";
import { fmt } from "./api.js";
import { Ornament, SectionHead, readingKind, useApp, useReveal, useT } from "./ui.jsx";

export default function Tech() {
  const t = useT();
  const { health, inscriptions } = useApp();
  useReveal([inscriptions.length, !!health]);
  const th = health && health.threshold != null ? fmt(health.threshold) : "—";
  const rec = health && health.model_info && health.model_info.recorded_results;

  return (
    <section className="page tech">
      <div className="container">
        <SectionHead kicker={t.techKicker} title={t.techTitle} lead={t.techLead} />

        <ol className="pipeline reveal">
          {t.pipeline.map((p, i) => (
            <li key={p.t} className={i === 2 ? "core" : ""}>
              <span className="p-num">{i + 1}</span>
              <h4>{p.t}</h4>
              <p>{p.d}</p>
            </li>
          ))}
        </ol>

        <div className="tech-grid">
          <article className="tech-card reveal">
            <h3>{t.mnTitle}</h3>
            <p>{t.mnBody}</p>
            <svg className="net" viewBox="0 0 360 120" aria-hidden="true">
              {[0, 1, 2, 3, 4, 5, 6].map((i) => {
                const h = 100 - i * 11;
                return <rect key={i} x={10 + i * 40} y={(120 - h) / 2} width={26} height={h} rx="3" />;
              })}
              <rect className="head" x="300" y="35" width="18" height="50" rx="3" />
              <rect className="head" x="332" y="45" width="18" height="30" rx="3" />
            </svg>
          </article>
          <article className="tech-card reveal">
            <h3>{t.trTitle}</h3>
            <ul className="ticks">{t.trItems.map((x) => <li key={x}>{x}</li>)}</ul>
          </article>
          <article className="tech-card reveal">
            <h3>{t.thTitle}</h3>
            <p>{t.thBody(th)}</p>
          </article>
          {rec && (
            <article className="tech-card results reveal">
              <h3>{t.resTitle}</h3>
              <div className="res-grid">
                {t.resItems(rec).map(([n, l]) => (
                  <div key={l}><span className="res-n" dir="ltr">{n}</span><span className="res-l">{l}</span></div>
                ))}
              </div>
              <p className="small-text">{t.resNote}</p>
            </article>
          )}
        </div>

        <Ornament className="center" />
        <h3 className="display small reveal">{t.classesTitle}</h3>
        <div className="class-table reveal">
          {inscriptions.map((r, i) => (
            <div className="class-row" key={r.class_name}>
              <span className="cr-i">{String(i + 1).padStart(2, "0")}</span>
              <span className="cr-name" dir="ltr">{r.name_en}<small>{r.class_name}</small></span>
              <span className="cr-site" dir="ltr">{r.site}</span>
              <span className={`badge ${readingKind(r)}`}>{t.readingBadge[readingKind(r)]}</span>
            </div>
          ))}
        </div>

        <div className="tech-grid two">
          <article className="tech-card limits reveal">
            <h3>{t.limTitle}</h3>
            <ul className="ticks warn">{t.lim.map((x) => <li key={x}>{x}</li>)}</ul>
          </article>
          <article className="tech-card reveal">
            <h3>{t.stackTitle}</h3>
            <p className="stack" dir="ltr">{t.stack}</p>
            {health && health.ready && (
              <p className="small-text" dir="ltr">
                {health.model_file} · TensorFlow {health.versions.tensorflow} · Keras {health.versions.keras} · loaded in {health.load_seconds}s
              </p>
            )}
            {health && health.model_info && health.model_info.trained_by && (
              <p className="small-text" dir="ltr">{health.model_info.trained_by}</p>
            )}
          </article>
        </div>
      </div>
    </section>
  );
}
