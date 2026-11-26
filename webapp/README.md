# NAQSH AI — Ancient Inscription Recognition in AlUla (Web App)

An interactive website for the NAQSH AI deep learning project. You upload a photo of an
inscription, the **real trained Keras model** analyses it, and the site shows whether the
inscription is recognised. If it is, the site shows that inscription's documented record.

This version matches the latest notebook, **`NAQSH.ipynb`**: 181 real AlUla photos,
**35 supported inscriptions** (Dadanitic, Nabataean, Minaic, Latin, Nabataeo-Arabic,
early Islamic Arabic and one rock-art panel).

- **Frontend:** React 19, pre-built into `frontend/dist`, so you don't need Node to run it.
- **Backend:** FastAPI + TensorFlow/Keras. It runs `models/naqsh_model.keras` locally.
- **Languages:** English and Arabic, with a full right-to-left layout.

## Step 1 — copy the trained model from the notebook

The trained weights are made on your computer when you run `NAQSH.ipynb`, so they are not
in this package. After the notebook has run, copy these files from the notebook's `models/`
folder into this project's `models/` folder:

| File | Saved by notebook section |
|---|---|
| `naqsh_model.keras` | 6 (training, best checkpoint) |
| `threshold.json` | 8 (threshold 0.997) |
| `class_names.json` | 6 (already included here; it is identical: the 35 labels sorted) |
| `evaluation_results.json` | 10 (optional; the site shows these numbers on the results panels) |

Instead of copying, you can point the server to the notebook's folder:
`NAQSH_MODEL_DIR=/path/to/notebook/models bash start.sh`.

If a file is missing, the site says which one and disables prediction. The gallery and
pages still work.

## Step 2 — run it

```bash
conda activate tf_env
pip install fastapi uvicorn
NAQSH_PYTHON=$(which python) bash start.sh
```

Then open **http://localhost:8000** (press Cmd+Shift+R the first time). TensorFlow takes
about 10–20 seconds to load; the status dot changes from *Model loading…* to *Model ready*.

## How to check that the site matches the notebook

`models/MODEL_INFO.json` holds the score that `NAQSH.ipynb` printed for every known test
photo (section 9). Run the test photos in the site: each live score should match the
notebook's value (for example IMG-002 → 0.999, IMG-004 → 0.425), and the totals should be
10/35 known photos accepted (all correct), 25/35 rejected, 23/23 unknown photos rejected.

## Data

```
metadata/images.csv                181 photos: split, label, source, author, licence
metadata/supported_inscriptions.csv 35 records (reading, translation, Arabic explanation, source)
metadata/knowledge_base.csv        1,657 documented inscriptions (text only)
dataset/images, images_added, images_merged   the photos (paths are in images.csv)
dataset/splits/                    train 98 · val 2 + 23 unknown · test 35 + 23 unknown
```

The server serves the three photo folders at `/dataset/images`, `/dataset/images_added` and
`/dataset/images_merged`.

## Inference pipeline (`backend/inference.py`)

Same steps as `load_image` and `recognise` in the notebook:

1. Uploads only: EXIF rotation → RGB → long side at most 640 px → JPEG quality 90
   (the same form as the dataset photos).
2. EXIF rotation, RGB, `ImageOps.pad` to 224 × 224 with grey (127,127,127). Never stretched.
3. `keras.applications.mobilenet_v2.preprocess_input`.
4. The model, called with `training=False`.
5. Top score ≥ threshold → **RECOGNISED**, otherwise **NOT RECOGNISED** and no reading is shown.
6. Only if recognised: the record from `metadata/supported_inscriptions.csv`.

## API

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/health` | Model status, threshold, versions, missing files |
| GET | `/api/inscriptions` | The 35 supported inscriptions and their photos |
| GET | `/api/samples` | All 181 dataset photos with split and ground truth |
| POST | `/api/predict` | Body = raw image bytes → prediction |
| POST | `/api/samples/{image_id}/predict` | Run one dataset photo through the model |

You only need to rebuild the frontend if you edit `frontend/src`:
`cd frontend && npm install && npm run build`.

## Limitations

- Recognises only 35 known inscriptions or objects. It is not OCR and cannot read new texts.
- Most inscriptions have 1–3 training photos and one test photo. Test accuracy 26/35
  (74.3 %); a second check with swapped photos gave 28/35.
- The threshold (0.997) is strict: 25 of 35 known test photos were rejected, but no wrong
  reading was shown and all 23 unknown test photos were rejected.
- The Jabal ʿIkmah panels and several other inscriptions have no verified reading yet.
- Two photos (IMG-092, IMG-152) are CC BY-NC: fine for a student project, not for a commercial app.
- This is a student project. It is not affiliated with the Royal Commission for AlUla.

## Free online version (GitHub Pages)

The same model also runs **inside the browser**, so the site can be hosted for free with no server.

- `models/tfjs/` holds the model converted to TensorFlow.js from `models/naqsh_model.keras`
  (SavedModel → `tensorflowjs_converter`, graph model).
- `frontend/src/api.static.js` replaces the server API: it prepares each photo exactly like the
  notebook (EXIF rotation, RGB, `ImageOps.pad` to 224×224 with grey 127 using Pillow's BICUBIC filter,
  ported in `frontend/src/pilimage.js`), scales it to −1..1 and applies the same threshold.
- Checked in headless Chrome on all 58 test photos (35 known + 23 unknown): same top class and
  same accept/reject decision as Keras for every photo; largest score difference 5 × 10⁻⁶.

Rebuild the static site:

```bash
python tools/export_static_data.py frontend/static/data
cd frontend && node build-static.mjs
```

Then copy `frontend/static` to `docs/app` in the repository. With GitHub Pages serving `main /docs`,
the site is at `https://<user>.github.io/<repo>/app/`.

TensorFlow.js (Apache-2.0) is included in `frontend/vendor/`.
