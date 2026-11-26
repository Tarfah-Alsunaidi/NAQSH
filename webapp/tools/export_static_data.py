"""Write the JSON files the static (GitHub Pages) site reads instead of the FastAPI server.

Usage (from the NAQSH_AI_WebApp folder):
    python tools/export_static_data.py frontend/static/data

Uses the same metadata code as the server, so the site shows exactly the same records.
No TensorFlow is needed: the model itself runs in the browser (models/tfjs).
"""

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from backend.inference import REQUIRED_FILES, engine  # noqa: E402

out = Path(sys.argv[1] if len(sys.argv) > 1 else ROOT / "frontend" / "static" / "data")
out.mkdir(parents=True, exist_ok=True)

engine.load_metadata()
engine.classes = json.loads(REQUIRED_FILES["class_names"].read_text(encoding="utf-8"))
engine.threshold = float(json.loads(REQUIRED_FILES["threshold"].read_text())["threshold"])
missing = [c for c in engine.classes if c not in engine.records]
if missing:
    raise SystemExit("class_names.json has classes with no record: " + ", ".join(missing))


def relative(items):
    # Page URLs must be relative so the site works under https://<user>.github.io/<repo>/app/
    for item in items:
        if item.get("url", "").startswith("/"):
            item["url"] = item["url"][1:]
        for photo in item.get("photos", []):
            if photo["url"].startswith("/"):
                photo["url"] = photo["url"][1:]
    return items


health = engine.health()
health.update({
    "status": "loading", "ready": False, "error": None, "missing_files": [],
    "model_file": "models/tfjs/model.json (converted from models/naqsh_model.keras)",
    "versions": {"tensorflow": ".js", "keras": "converted"},
})

files = {
    "health.json": health,
    "inscriptions.json": relative(engine.inscriptions()),
    "samples.json": relative(engine.samples()),
}
for name, data in files.items():
    (out / name).write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")
    print("wrote", out / name)
