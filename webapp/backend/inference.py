"""NAQSH AI inference engine.

Reproduces the inference pipeline of the NAQSH AI notebooks exactly:
  1. photo -> RGB
  2. pad to 224 x 224 without stretching (ImageOps.pad, grey 127)
  3. keras.applications.mobilenet_v2.preprocess_input  (pixels -> [-1, 1])
  4. the trained Keras model (models/naqsh_model.keras)
  5. highest softmax score >= saved threshold  ->  RECOGNISED, else NOT RECOGNISED
  6. only if recognised: look up the documented record in metadata/supported_inscriptions.csv

Nothing here invents a prediction. If a file is missing or the model cannot be
loaded, the engine reports the problem and refuses to predict.
"""

import csv
import io
import json
import os
import threading
import time
import traceback
from pathlib import Path
from typing import Dict, List, Optional

import numpy as np
from PIL import Image, ImageOps, UnidentifiedImageError

ROOT = Path(__file__).resolve().parent.parent
MODEL_DIR = Path(os.environ.get("NAQSH_MODEL_DIR", ROOT / "models")).resolve()
METADATA_DIR = ROOT / "metadata"
DATASET_DIR = ROOT / "dataset"
IMAGES_DIR = DATASET_DIR / "images"
# The 35-class dataset keeps photos in three folders (original, added, merged team photos).
IMAGE_FOLDERS = ["images", "images_added", "images_merged"]

IMG_SIZE = 224
PAD_COLOR = (127, 127, 127)
MAX_SIDE = 640          # same as prepare_images.py, which produced every training photo
JPEG_QUALITY = 90       # same as prepare_images.py
TOP_K = 3

Image.MAX_IMAGE_PIXELS = 80_000_000   # refuse decompression bombs

REQUIRED_FILES = {
    "model": MODEL_DIR / "naqsh_model.keras",
    "class_names": MODEL_DIR / "class_names.json",
    "threshold": MODEL_DIR / "threshold.json",
    "supported_inscriptions": METADATA_DIR / "supported_inscriptions.csv",
    "images_metadata": METADATA_DIR / "images.csv",
    "test_split": DATASET_DIR / "splits" / "test.csv",
}


class ImageError(ValueError):
    """The uploaded file could not be read as a photo."""


# ---------------------------------------------------------------- preprocessing
def prepare_upload(raw: bytes) -> Image.Image:
    """Turn an uploaded photo into the same kind of file the model was trained on.

    The training photos were made by prepare_images.py:
    EXIF rotation applied -> RGB -> long side at most 640 px -> JPEG quality 90.
    """
    try:
        image = Image.open(io.BytesIO(raw))
        image.load()
    except (UnidentifiedImageError, OSError, Image.DecompressionBombError) as exc:
        raise ImageError("This file could not be read as an image. Please upload a JPG, PNG or WebP photo.") from exc
    image = ImageOps.exif_transpose(image).convert("RGB")
    image.thumbnail((MAX_SIDE, MAX_SIDE))
    buffer = io.BytesIO()
    image.save(buffer, format="JPEG", quality=JPEG_QUALITY)
    buffer.seek(0)
    return Image.open(buffer)


def load_image(image: Image.Image) -> np.ndarray:
    """Notebook `load_image`: EXIF rotation, RGB, pad to 224x224 without stretching, float32 in 0..255."""
    image = ImageOps.exif_transpose(image)
    image = image.convert("RGB")
    image = ImageOps.pad(image, (IMG_SIZE, IMG_SIZE), color=PAD_COLOR)
    return np.array(image, dtype="float32")


# ---------------------------------------------------------------- metadata
def read_csv(path: Path) -> List[Dict[str, str]]:
    with open(path, newline="", encoding="utf-8") as handle:
        return list(csv.DictReader(handle))


RECORD_FIELDS = [
    "class_name", "name_en", "name_ar", "official_ids", "site", "script",
    "transliteration", "transliteration_source", "translation_en", "translation_source",
    "explanation_ar", "context_en", "citation", "identification_confidence",
    "reading_status", "n_photos",
]


class Engine:
    def __init__(self) -> None:
        self.status = "starting"          # starting | loading | ready | error
        self.error: Optional[str] = None
        self.missing: List[str] = []
        self.model = None
        self.preprocess = None
        self.classes: List[str] = []
        self.threshold: Optional[float] = None
        self.records: Dict[str, Dict[str, str]] = {}
        self.images: Dict[str, Dict[str, str]] = {}
        self.model_info: Dict = {}
        self.load_seconds: Optional[float] = None
        self.versions: Dict[str, str] = {}
        self._lock = threading.Lock()

    # ------------------------------------------------------------ loading
    def check_files(self) -> List[str]:
        return [f"{key}: {path.relative_to(ROOT) if ROOT in path.parents else path}"
                for key, path in REQUIRED_FILES.items() if not path.exists()]

    def load_metadata(self) -> None:
        self.records = {row["class_name"]: row for row in read_csv(REQUIRED_FILES["supported_inscriptions"])}
        self.images = {row["image_id"]: row for row in read_csv(REQUIRED_FILES["images_metadata"])}
        info_path = MODEL_DIR / "MODEL_INFO.json"
        self.model_info = json.loads(info_path.read_text(encoding="utf-8")) if info_path.exists() else {}
        # evaluation_results.json is written by the last cell of NAQSH.ipynb; if present it overrides the summary.
        eval_path = MODEL_DIR / "evaluation_results.json"
        if eval_path.exists():
            ev = json.loads(eval_path.read_text(encoding="utf-8"))
            rec = self.model_info.setdefault("recorded_results", {})
            mapping = {
                "known_test_accepted_correct": "known_test_accepted_and_correct",
                "known_test_false_rejections": "known_test_rejected",
                "unknown_test_rejected": "unknown_test_correctly_rejected",
                "unknown_test_false_acceptances": "unknown_test_wrongly_accepted",
                "test_photos": "known_test_total",
                "test_unknown_photos": "unknown_test_total",
            }
            for src, dst in mapping.items():
                if src in ev:
                    rec[dst] = ev[src]
            for key in ("test_accuracy", "test_macro_f1", "swapped_split_accuracy", "threshold"):
                if key in ev:
                    rec[key] = round(float(ev[key]), 3)
            if "test_accuracy" in ev and "test_photos" in ev:
                rec["test_top1_before_rejection"] = f"{round(ev['test_accuracy'] * ev['test_photos'])}/{ev['test_photos']}"
                rec["known_test_accepted_but_wrong"] = ev["test_photos"] - ev.get("known_test_accepted_correct", 0) - ev.get("known_test_false_rejections", 0)

    def load(self) -> None:
        """Load metadata and the real Keras model. Safe to call in a background thread."""
        self.status = "loading"
        started = time.time()
        try:
            self.missing = self.check_files()
            # The catalogue (gallery, samples) works even when the model files are missing.
            if REQUIRED_FILES["supported_inscriptions"].exists() and REQUIRED_FILES["images_metadata"].exists():
                self.load_metadata()
            if REQUIRED_FILES["class_names"].exists():
                self.classes = json.loads(REQUIRED_FILES["class_names"].read_text(encoding="utf-8"))
            if self.missing:
                raise FileNotFoundError("Required files are missing: " + "; ".join(self.missing))

            self.threshold = float(json.loads(REQUIRED_FILES["threshold"].read_text())["threshold"])
            if not 0.0 < self.threshold <= 1.0:
                raise ValueError(f"threshold.json holds {self.threshold}, which is not a score between 0 and 1")

            unknown_classes = [c for c in self.classes if c not in self.records]
            if unknown_classes:
                raise ValueError("class_names.json has classes with no row in supported_inscriptions.csv: "
                                 + ", ".join(unknown_classes))

            os.environ.setdefault("TF_CPP_MIN_LOG_LEVEL", "2")
            import keras  # noqa: E402  (heavy import, done lazily)
            import tensorflow as tf  # noqa: E402

            self.model = keras.models.load_model(str(REQUIRED_FILES["model"]), compile=False)
            self.preprocess = keras.applications.mobilenet_v2.preprocess_input
            self.versions = {"tensorflow": tf.__version__, "keras": keras.__version__}

            n_outputs = int(self.model.output_shape[-1])
            if n_outputs != len(self.classes):
                raise ValueError(f"The model has {n_outputs} outputs but class_names.json lists {len(self.classes)} classes")
            input_shape = tuple(self.model.input_shape[1:])
            if input_shape != (IMG_SIZE, IMG_SIZE, 3):
                raise ValueError(f"The model expects input {input_shape}, not ({IMG_SIZE}, {IMG_SIZE}, 3)")

            # Fast single-image call. model.predict() builds a whole data pipeline on every call,
            # which is slow for one photo; calling the model directly with training=False gives
            # exactly the same scores (no dropout, frozen BatchNorm) in a fraction of the time.
            self._infer = tf.function(lambda x: self.model(x, training=False), reduce_retracing=True)
            # Warm-up call so the first visitor does not wait for graph tracing.
            self._infer(tf.zeros((1, IMG_SIZE, IMG_SIZE, 3), dtype=tf.float32))
            self.load_seconds = round(time.time() - started, 1)
            self.status = "ready"
        except Exception as exc:  # report every failure honestly
            self.status = "error"
            self.error = f"{type(exc).__name__}: {exc}"
            traceback.print_exc()

    # ------------------------------------------------------------ prediction
    def record_for(self, class_name: str) -> Dict[str, str]:
        row = self.records[class_name]
        return {field: row.get(field, "") for field in RECORD_FIELDS}

    def predict_array(self, array: np.ndarray) -> Dict:
        if self.status != "ready":
            raise RuntimeError(self.error or f"The model is not ready (status: {self.status}).")
        batch = self.preprocess(array[None].copy())
        started = time.time()
        with self._lock:
            probs = np.asarray(self._infer(batch.astype("float32")))[0]
        elapsed_ms = round((time.time() - started) * 1000)

        order = np.argsort(probs)[::-1]
        best = int(order[0])
        score = float(probs[best])
        recognised = score >= self.threshold
        best_class = self.classes[best]

        return {
            "status": "recognised" if recognised else "not_recognised",
            "recognised": bool(recognised),
            "score": score,
            "threshold": self.threshold,
            "top_class": best_class,
            "top_class_name_en": self.records[best_class]["name_en"],
            "top": [
                {"class_name": self.classes[i], "name_en": self.records[self.classes[i]]["name_en"],
                 "score": float(probs[i])}
                for i in order[:TOP_K]
            ],
            # The archaeological record is only attached when the model accepts the photo.
            "record": self.record_for(best_class) if recognised else None,
            "inference_ms": elapsed_ms,
        }

    def predict_upload(self, raw: bytes) -> Dict:
        prepared = prepare_upload(raw)
        original_size = prepared.size
        result = self.predict_array(load_image(prepared))
        result["input"] = {"kind": "upload", "prepared_size": list(original_size)}
        return result

    def predict_dataset_image(self, image_id: str) -> Dict:
        row = self.images[image_id]
        path = ROOT / row["image_path"]
        # Dataset photos are already the processed files the notebook used: load them exactly as the notebook did.
        with Image.open(path) as image:
            array = load_image(image)
        result = self.predict_array(array)
        result["input"] = {"kind": "dataset", "image_id": image_id, "split": row["split"]}
        return result

    # ------------------------------------------------------------ catalogue data
    def image_public(self, row: Dict[str, str]) -> Dict:
        return {
            "image_id": row["image_id"],
            "url": "/" + row["image_path"],
            "split": row["split"],
            "ground_truth": row["recognition_label"],
            "inscription_id": row["inscription_id"],
            "location": row["location"],
            "source": row["source"],
            "source_url": row["source_url"],
            "license": row["license"],
            "author": row["author"],
        }

    def inscriptions(self) -> List[Dict]:
        order = self.classes or list(self.records)
        out = []
        for class_name in order:
            record = self.record_for(class_name)
            photos = [self.image_public(r) for r in self.images.values() if r["recognition_label"] == class_name]
            if not photos and self.classes:
                continue
            photos.sort(key=lambda p: {"train": 0, "val": 1, "test": 2}.get(p["split"], 3))
            record["photos"] = photos
            out.append(record)
        return out

    def samples(self) -> List[Dict]:
        recorded = self.model_info.get("recorded_known_test_scores", {})
        out = []
        for row in self.images.values():
            known = row["recognition_label"] != "unknown"
            if known and self.classes and row["recognition_label"] not in self.classes:
                continue   # the notebook drops classes with fewer than 2 photos
            item = self.image_public(row)
            item["supported"] = known
            item["group"] = {"train": "train", "val": "val", "val_unknown": "val",
                             "test": "test", "test_unknown": "test"}.get(row["split"], row["split"])
            item["ground_truth_name_en"] = self.records[row["recognition_label"]]["name_en"] if known else None
            item["notebook_score"] = recorded.get(row["image_id"]) if row["split"] == "test" else None
            out.append(item)
        out.sort(key=lambda s: ({"test": 0, "val": 1, "train": 2}.get(s["group"], 3), not s["supported"], s["image_id"]))
        return out

    def health(self) -> Dict:
        return {
            "status": self.status,
            "ready": self.status == "ready",
            "error": self.error,
            "missing_files": self.missing,
            "model_file": str(REQUIRED_FILES["model"].relative_to(ROOT)) if ROOT in REQUIRED_FILES["model"].parents
            else str(REQUIRED_FILES["model"]),
            "classes": self.classes,
            "threshold": self.threshold,
            "load_seconds": self.load_seconds,
            "versions": self.versions,
            "model_info": self.model_info,
        }


engine = Engine()
