"""Open the static site in headless Chrome and check that the in-browser model gives
the same decisions as the notebook on every test photo.

Usage:  python tools/check_static_site.py <http://localhost:PORT/NAQSH/app/> <reference.json>
reference.json = {"ids": [...], "probs": [[...35 scores...], ...]} computed with Keras.
"""
import json
import sys

from playwright.sync_api import sync_playwright

url, ref_path = sys.argv[1], sys.argv[2]
ref = json.load(open(ref_path))
classes = None

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--no-sandbox"])
    page = browser.new_page()
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.on("console", lambda m: m.type == "error" and errors.append(m.text))
    page.goto(url, wait_until="networkidle")
    page.wait_for_function("window.__naqshApi", timeout=30000)
    health = page.evaluate("""async () => {
        for (let i = 0; i < 120; i++) {
            const h = await window.__naqshApi.health();
            if (h.status !== 'loading') return h;
            await new Promise(r => setTimeout(r, 500));
        }
        return {status: 'timeout'};
    }""")
    print("model:", health["status"], health.get("versions"), "loaded in", health.get("load_seconds"), "s")
    classes = health["classes"]
    thr = health["threshold"]
    flips = wrong_class = 0
    max_diff = 0.0
    for image_id, probs in zip(ref["ids"], ref["probs"]):
        res = page.evaluate("id => window.__naqshApi.predictSample(id)", image_id)
        ref_best = max(range(len(probs)), key=probs.__getitem__)
        ref_score = probs[ref_best]
        max_diff = max(max_diff, abs(res["score"] - ref_score))
        if res["top_class"] != classes[ref_best]:
            wrong_class += 1
        if res["recognised"] != (ref_score >= thr):
            flips += 1
            print("decision differs:", image_id, res["score"], ref_score)
    print(f"photos: {len(ref['ids'])}  top-class differences: {wrong_class}  "
          f"accept/reject differences: {flips}  max score difference: {max_diff:.2e}")
    page.screenshot(path="/tmp/static_home.png")
    print("page errors:", errors[:5] or "none")
    browser.close()
