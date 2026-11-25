// Builds the React interface into frontend/dist (no dev server needed).
import { build } from "esbuild";
import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";

mkdirSync("dist/assets", { recursive: true });
await build({
  entryPoints: { app: "src/main.jsx" },
  bundle: true,
  minify: true,
  sourcemap: false,
  target: ["es2019"],
  jsx: "automatic",
  loader: { ".js": "jsx" },
  outdir: "dist/assets",
  define: { "process.env.NODE_ENV": '"production"' },
  legalComments: "eof",
  external: ["/assets/*"],
  logLevel: "info",
});
// Version the asset URLs so the browser always loads the newest build (no stale cache).
const hash = (f) => createHash("sha1").update(readFileSync(f)).digest("hex").slice(0, 10);
const html = readFileSync("index.html", "utf8")
  .replace('/assets/app.css"', `/assets/app.css?v=${hash("dist/assets/app.css")}"`)
  .replace('/assets/app.js"', `/assets/app.js?v=${hash("dist/assets/app.js")}"`);
writeFileSync("dist/index.html", html);
// static images used by the home page (backgrounds, script and site photos)
if (existsSync("public")) cpSync("public", "dist/assets", { recursive: true });
