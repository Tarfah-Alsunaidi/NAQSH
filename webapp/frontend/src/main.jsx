import React, { useCallback, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";
import { api } from "./api.js";
import { STRINGS } from "./i18n.js";
import { AppContext, scanReveal, useInterval } from "./ui.jsx";
import Home from "./Home.jsx";
import Explore from "./Explore.jsx";
import TryPage from "./TryPage.jsx";

const ROUTES = ["home", "explore", "try"];

function parseHash() {
  const [route, arg] = window.location.hash.replace(/^#\/?/, "").split("/");
  return { route: ROUTES.includes(route) ? route : "home", arg: arg ? decodeURIComponent(arg) : null };
}

function storedLang() {
  try {
    return window.localStorage.getItem("naqsh-lang") === "ar" ? "ar" : "en";
  } catch (e) {
    return "en";
  }
}

function Logo({ play = 0, still = false }) {
  // Elephant Rock (Jabal AlFil), AlUla. Animated: the frame draws itself, then the rock fills in from right to left.
  return (
    <svg className={`logo ${still ? "" : "anim"}`} viewBox="0 0 40 40" aria-hidden="true" key={play}>
      <rect className="logo-frame" x="2" y="2" width="36" height="36" rx="3" pathLength="1" />
      <path
        className="logo-rock"
        fill="#e6c27a"
        stroke="none"
        d="M7.8 31 C10.2 28.6 10.3 23.4 9.3 20 C8.3 16.4 9.2 12.3 12.7 10.9 C14.9 10 16.9 9.8 18.8 10.4 C21.8 8.1 27 8.1 30 10.8 C32.7 13.3 33.1 18.4 32.5 23.4 C32.2 26.7 33.1 29.3 34 31 L20.2 31 C19.9 23.6 17.6 16.2 15.2 16.2 C13.2 16.2 12.1 21.8 11.9 31 Z"
      />
      <path className="logo-ground" d="M34 31H6" pathLength="1" />
    </svg>
  );
}

function Brand({ t }) {
  const [play, setPlay] = useState(0);
  return (
    <a className="brand" href="#/home" onMouseEnter={() => setPlay((n) => n + 1)}>
      <Logo play={play} />
      <span>
        <strong>{t.brand}</strong>
        <small>{t.brandSub}</small>
      </span>
    </a>
  );
}

function Splash({ quick, t }) {
  // Shown on first visit (full logo animation) and briefly on every page change from the header.
  const style = quick ? { "--hold": "0.95s", "--name-delay": "0.35s" } : { "--hold": "2.4s", "--name-delay": "1.5s" };
  return (
    <div className={`splash ${quick ? "quick" : ""}`} style={style} aria-hidden="true">
      <div className="splash-inner">
        <Logo />
        <div className="splash-name">{t.brand}</div>
        {!quick && <div className="splash-sub">{t.brandSub}</div>}
      </div>
    </div>
  );
}

function StatusPill({ health, offline, t }) {
  let cls = "loading";
  let text = t.model.loading;
  if (offline) { cls = "error"; text = t.model.offline; }
  else if (health && health.status === "ready") { cls = "ready"; text = t.model.ready; }
  else if (health && health.status === "error") { cls = "error"; text = t.model.error; }
  return <span className={`status-pill ${cls}`} title={text} role="status"><span className="dot" /><span className="sr">{text}</span></span>;
}

function App() {
  const [lang, setLang] = useState(storedLang);
  const [{ route, arg }, setRoute] = useState(parseHash);
  const [health, setHealth] = useState(null);
  const [offline, setOffline] = useState(false);
  const [inscriptions, setInscriptions] = useState([]);
  const [samples, setSamples] = useState([]);
  const [sampleResults, setSampleResults] = useState({});
  const [menu, setMenu] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [splash, setSplash] = useState({ n: 1, quick: false });
  const t = STRINGS[lang];

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    try { window.localStorage.setItem("naqsh-lang", lang); } catch (e) { /* storage unavailable */ }
  }, [lang]);

  useEffect(() => {
    const onHash = () => {
      setRoute((prev) => {
        const next = parseHash();
        if (next.route !== prev.route) setSplash((sp) => ({ n: sp.n + 1, quick: true }));
        return next;
      });
      setMenu(false);
      window.scrollTo(0, 0);
    };
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("hashchange", onHash);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => { window.removeEventListener("hashchange", onHash); window.removeEventListener("scroll", onScroll); };
  }, []);

  const refresh = useCallback(async () => {
    try {
      const h = await api.health();
      setHealth(h);
      setOffline(false);
      if (!inscriptions.length) api.inscriptions().then(setInscriptions).catch(() => {});
      if (!samples.length) api.samples().then(setSamples).catch(() => {});
    } catch (e) {
      setOffline(true);
    }
  }, [inscriptions.length, samples.length]);

  useEffect(() => { refresh(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const settled = health && (health.status === "ready" || health.status === "error") && inscriptions.length && samples.length;
  useInterval(refresh, settled && !offline ? null : 2000);

  const go = useCallback((r, a) => {
    window.location.hash = `#/${r}${a ? `/${encodeURIComponent(a)}` : ""}`;
  }, []);

  const ctx = useMemo(
    () => ({ lang, setLang, health, offline, inscriptions, samples, sampleResults, setSampleResults, go, routeArg: arg }),
    [lang, health, offline, inscriptions, samples, sampleResults, go, arg]
  );

  useEffect(() => { scanReveal(); });

  // Remove the splash from the page once its fade-out has finished.
  useEffect(() => {
    if (!splash.n) return undefined;
    const id = setTimeout(() => setSplash((sp) => (sp.n === splash.n ? { ...sp, n: 0 } : sp)), splash.quick ? 1600 : 3100);
    return () => clearTimeout(id);
  }, [splash.n, splash.quick]);

  const Page = { home: Home, explore: Explore, try: TryPage }[route];

  return (
    <AppContext.Provider value={ctx}>
      {splash.n > 0 && <Splash key={splash.n} quick={splash.quick} t={t} />}
      <header className={`nav ${scrolled || route !== "home" ? "solid" : ""} ${menu ? "open" : ""}`}>
        <Brand t={t} />
        <nav className="nav-links">
          {ROUTES.map((r) => (
            <a key={r} href={`#/${r}`} className={route === r ? "active" : ""}>{t.nav[r]}</a>
          ))}
        </nav>
        <div className="nav-end">
          <StatusPill health={health} offline={offline} t={t} />
          <button className="lang-btn" onClick={() => setLang(lang === "en" ? "ar" : "en")} lang={lang === "en" ? "ar" : "en"}>
            {t.lang}
          </button>
          <button className="menu-btn" onClick={() => setMenu((m) => !m)} aria-label="Menu" aria-expanded={menu}>
            <span /><span /><span />
          </button>
        </div>
      </header>

      {offline && <div className="banner error">{t.errors.offline}</div>}
      {!offline && health && health.status === "error" && (
        <div className="banner error">
          <strong>{t.errors.modelError}</strong>{" "}
          <span dir="ltr">{health.missing_files && health.missing_files.length ? `${t.errors.missing} ${health.missing_files.join(", ")}` : health.error}</span>
        </div>
      )}

      <main key={route} className={`route route-${route}`}>
        <Page />
      </main>

      <footer className="footer">
        <div className="container footer-min">
          <a className="brand" href="#/home"><Logo still /><strong>{t.brand}</strong></a>
          <p className="footer-team">{t.footerTeam}</p>
          <p className="footer-legal">{t.footerLegal}</p>
        </div>
      </footer>
    </AppContext.Provider>
  );
}

createRoot(document.getElementById("root")).render(<App />);
