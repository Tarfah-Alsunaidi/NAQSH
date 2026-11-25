import React, { useMemo, useState } from "react";
import { api, fmt } from "./api.js";
import ResultCard from "./ResultCard.jsx";
import { ErrorBox } from "./TryPage.jsx";
import { Img, Modal, SectionHead, useApp, useT } from "./ui.jsx";

export function verdictOf(sample, res) {
  if (!res) return null;
  if (sample.supported) {
    if (!res.recognised) return "falseReject";
    return res.top_class === sample.ground_truth ? "correct" : "wrongClass";
  }
  return res.recognised ? "falseAccept" : "correctReject";
}

const GOOD = { correct: true, correctReject: true };

function SampleCard({ s, res, busy, onRun, onOpen }) {
  const t = useT();
  const v = verdictOf(s, res);
  return (
    <div className={`s-card ${v ? (GOOD[v] ? "good" : "bad") : ""}`}>
      <button className="s-img" onClick={() => (res ? onOpen() : onRun())}>
        <Img src={s.url} alt={s.image_id} />
        <span className={`gt ${s.supported ? "sup" : "uns"}`}>{s.supported ? t.gtSupported : t.gtUnsupported}</span>
        {busy && <span className="s-busy"><span className="spinner" /></span>}
      </button>
      <div className="s-body">
        <div className="s-id" dir="ltr">{s.image_id} · {t.split[s.split]}</div>
        <div className="s-gt" dir="ltr" title={s.inscription_id}>
          {s.supported ? s.ground_truth_name_en : s.inscription_id}
        </div>
        <div className="s-loc" dir="ltr">{s.location}</div>
        {res ? (
          <div className="s-res">
            <div className={`s-status ${res.recognised ? "ok" : "no"}`}>
              {res.recognised ? t.result.recognised : t.result.notRecognised}
              <span className="s-score" dir="ltr">{fmt(res.score)}</span>
            </div>
            {res.recognised && <div className="s-pred" dir="ltr">→ {res.top_class_name_en}</div>}
            <div className={`s-verdict ${GOOD[v] ? "good" : "bad"}`}>{t.verdict[v]}</div>
            {s.notebook_score != null && (
              <div className="s-nb" dir="ltr">{t.notebookScore}: {fmt(s.notebook_score)}</div>
            )}
          </div>
        ) : (
          s.notebook_score != null && <div className="s-nb" dir="ltr">{t.notebookScore}: {fmt(s.notebook_score)}</div>
        )}
        <div className="s-actions">
          <button className="btn small" disabled={busy} onClick={onRun}>{res ? t.rerun : t.run}</button>
          {res && <button className="link-btn" onClick={onOpen}>{t.details}</button>}
        </div>
      </div>
    </div>
  );
}

function Summary({ list, results, info }) {
  const t = useT();
  const c = { ok: 0, wrong: 0, rej: 0, urej: 0, uacc: 0 };
  let pending = 0;
  list.forEach((s) => {
    const v = verdictOf(s, results[s.image_id]);
    if (!v) { pending += 1; return; }
    ({ correct: () => c.ok++, wrongClass: () => c.wrong++, falseReject: () => c.rej++,
       correctReject: () => c.urej++, falseAccept: () => c.uacc++ })[v]();
  });
  const nSup = list.filter((s) => s.supported).length;
  const nUns = list.length - nSup;
  const rec = info && info.recorded_results;
  const rows = [
    ["ok", c.ok, nSup, rec && rec.known_test_accepted_and_correct, true],
    ["wrong", c.wrong, nSup, rec && rec.known_test_accepted_but_wrong, false],
    ["rej", c.rej, nSup, rec && rec.known_test_rejected, false],
    ["urej", c.urej, nUns, rec && rec.unknown_test_correctly_rejected, true],
    ["uacc", c.uacc, nUns, rec && rec.unknown_test_wrongly_accepted, false],
  ];
  return (
    <aside className="summary">
      <h3>{t.summaryTitle}</h3>
      <p className="small-text">{t.summaryLead}</p>
      <div className="sum-rows">
        {rows.map(([k, n, of, nb, good]) => (
          <div key={k} className={`sum-row ${good ? "good" : "bad"}`}>
            <div className="sum-label">{t.summaryRows[k]}</div>
            <div className="sum-nums" dir="ltr">
              <span className="live"><strong>{n}</strong> / {of}<small>{t.summaryLive}</small></span>
              {rec && <span className="nb">{nb} / {of}<small>{t.summaryNotebookShort}</small></span>}
            </div>
          </div>
        ))}
      </div>
      {rec && <p className="small-text">{t.summaryNotebook}</p>}
      {pending > 0 && <p className="small-text pending">{t.summaryPending(pending)}</p>}
    </aside>
  );
}

export default function Samples() {
  const t = useT();
  const { samples, health, sampleResults, setSampleResults } = useApp();
  const [group, setGroup] = useState("test");
  const [filter, setFilter] = useState("all");
  const [busy, setBusy] = useState({});
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState(null);
  const [open, setOpen] = useState(null);

  const inGroup = useMemo(() => samples.filter((s) => s.group === group), [samples, group]);
  const list = useMemo(
    () => inGroup.filter((s) => filter === "all" || (filter === "sup" ? s.supported : !s.supported)),
    [inGroup, filter]
  );
  const ready = health && health.ready;

  const runOne = async (s) => {
    setBusy((b) => ({ ...b, [s.image_id]: true }));
    try {
      const res = await api.predictSample(s.image_id);
      setSampleResults((r) => ({ ...r, [s.image_id]: res }));
      setError(null);
      return true;
    } catch (e) {
      setError(e);
      return false;
    } finally {
      setBusy((b) => ({ ...b, [s.image_id]: false }));
    }
  };

  const runAll = async () => {
    for (let i = 0; i < list.length; i++) {
      setProgress([i + 1, list.length]);
      // eslint-disable-next-line no-await-in-loop
      const ok = await runOne(list[i]);
      if (!ok) break;
    }
    setProgress(null);
  };

  return (
    <section className="page samples">
      <div className="container">
        <SectionHead kicker={t.samplesKicker} title={t.samplesTitle} lead={t.samplesLead} />

        <div className="s-toolbar">
          <div className="segmented" role="tablist">
            {["test", "val", "train"].map((g) => (
              <button key={g} role="tab" aria-selected={group === g} className={group === g ? "on" : ""}
                      onClick={() => setGroup(g)}>
                {t.groups[g].t} <span className="count">{samples.filter((s) => s.group === g).length}</span>
              </button>
            ))}
          </div>
          <div className="chips">
            {[["all", t.filterAll], ["sup", t.filterSupported], ["uns", t.filterUnsupported]].map(([k, label]) => (
              <button key={k} className={`chip ${filter === k ? "on" : ""}`} onClick={() => setFilter(k)}>{label}</button>
            ))}
          </div>
          <button className="btn primary" disabled={!ready || !!progress || !list.length} onClick={runAll}>
            {progress ? t.running(progress[0], progress[1]) : t.runAll(list.length)}
          </button>
        </div>
        <p className={`group-note ${group}`}>{t.groups[group].d}</p>
        {health && !health.ready && (
          <ErrorBox error={health.status === "error"
            ? { code: "model_unavailable", detail: { error: health.error, missing_files: health.missing_files } }
            : { code: "model_loading" }} />
        )}
        <ErrorBox error={error} />

        <div className="s-layout">
          <div className="s-grid">
            {list.map((s) => (
              <SampleCard key={s.image_id} s={s} res={sampleResults[s.image_id]} busy={!!busy[s.image_id]}
                          onRun={() => ready && runOne(s)} onOpen={() => setOpen(s)} />
            ))}
          </div>
          <Summary list={inGroup} results={sampleResults} info={group === "test" && health ? health.model_info : null} />
        </div>
      </div>

      <Modal open={!!open} onClose={() => setOpen(null)} wide>
        {open && sampleResults[open.image_id] && (
          <ResultCard
            result={sampleResults[open.image_id]}
            imageUrl={open.url}
            recordNo={open.image_id}
            truth={{ supported: open.supported, label: open.ground_truth, name: open.ground_truth_name_en }}
          />
        )}
      </Modal>
    </section>
  );
}
