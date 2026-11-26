// Builds a static copy of NAQSH AI (no server) into frontend/static, ready for GitHub Pages.
// The model runs in the browser with TensorFlow.js; see src/api.static.js.
//
//   cd frontend
//   python ../tools/export_static_data.py static/data
//   node build-static.mjs
import { build } from "esbuild";
import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";

const OUT = "static";
for (const d of ["assets", "dataset"]) rmSync(path.join(OUT, d), { recursive: true, force: true });
mkdirSync(`${OUT}/assets`, { recursive: true });

// Use the in-browser API instead of the server API.
const staticApi = {
  name: "static-api",
  setup(b) {
    b.onResolve({ filter: /^\.\/api(\.js)?$/ }, (args) => ({ path: path.resolve(args.resolveDir, "api.static.js") }));
  },
};

await build({
  entryPoints: { app: "src/main.jsx" },
  bundle: true,
  minify: true,
  target: ["es2019"],
  jsx: "automatic",
  loader: { ".js": "jsx" },
  outdir: `${OUT}/assets`,
  define: { "process.env.NODE_ENV": '"production"' },
  legalComments: "eof",
  external: ["/assets/*"],
  plugins: [staticApi],
  logLevel: "info",
});

// app.css lives in assets/, so its /assets/... links become relative to it.
const cssFile = `${OUT}/assets/app.css`;
writeFileSync(cssFile, readFileSync(cssFile, "utf8").replaceAll('url("/assets/', 'url("').replaceAll("url(/assets/", "url("));

const hash = (f) => createHash("sha1").update(readFileSync(f)).digest("hex").slice(0, 10);
const html = readFileSync("index.html", "utf8")
  .replace('href="/assets/app.css"', `href="assets/app.css?v=${hash(cssFile)}"`)
  .replace('src="/assets/app.js"', `src="assets/app.js?v=${hash(`${OUT}/assets/app.js`)}"`);
writeFileSync(`${OUT}/index.html`, html);

if (existsSync("public")) cpSync("public", `${OUT}/assets`, { recursive: true });
cpSync("vendor", `${OUT}/assets/vendor`, { recursive: true });
cpSync("../models/tfjs", `${OUT}/assets/model`, { recursive: true });
for (const folder of ["images", "images_added", "images_merged"]) {
  if (existsSync(`../dataset/${folder}`)) cpSync(`../dataset/${folder}`, `${OUT}/dataset/${folder}`, { recursive: true });
}
writeFileSync(`${OUT}/.nojekyll`, "");
if (!existsSync(`${OUT}/data/health.json`)) console.warn("! static/data is missing: run python ../tools/export_static_data.py static/data");
console.log("Static site ready in frontend/static");
