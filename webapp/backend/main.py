"""NAQSH AI web server (FastAPI).

Start it from the NAQSH_AI_WebApp folder:
    python -m uvicorn backend.main:app --port 8000
then open http://localhost:8000
"""

import threading
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from starlette.concurrency import run_in_threadpool

from .inference import DATASET_DIR, IMAGE_FOLDERS, ROOT, ImageError, engine

FRONTEND_DIR = ROOT / "frontend" / "dist"
MAX_UPLOAD_BYTES = 20 * 1024 * 1024


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Load TensorFlow and the model in the background so the website opens immediately.
    threading.Thread(target=engine.load, name="naqsh-model-loader", daemon=True).start()
    yield


app = FastAPI(title="NAQSH AI", version="1.0", lifespan=lifespan)


def require_ready() -> None:
    if engine.status == "ready":
        return
    if engine.status == "error":
        raise HTTPException(status_code=503, detail={
            "code": "model_unavailable",
            "message": "The NAQSH AI model could not be loaded, so no prediction can be made.",
            "error": engine.error,
            "missing_files": engine.missing,
        })
    raise HTTPException(status_code=503, detail={
        "code": "model_loading",
        "message": "The model is still loading. Please try again in a few seconds.",
    })


@app.get("/api/health")
def health():
    return engine.health()


@app.get("/api/inscriptions")
def inscriptions():
    if not engine.records:
        raise HTTPException(status_code=503, detail={"code": "metadata_unavailable",
                                                     "message": "metadata/supported_inscriptions.csv is not loaded yet.",
                                                     "missing_files": engine.missing})
    return engine.inscriptions()


@app.get("/api/samples")
def samples():
    if not engine.images:
        raise HTTPException(status_code=503, detail={"code": "metadata_unavailable",
                                                     "message": "metadata/images.csv is not loaded yet.",
                                                     "missing_files": engine.missing})
    return engine.samples()


@app.post("/api/predict")
async def predict(request: Request):
    """Body = the raw image bytes (the browser sends the file as-is)."""
    require_ready()
    raw = await request.body()
    if not raw:
        raise HTTPException(status_code=400, detail={"code": "empty", "message": "No image was received."})
    if len(raw) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail={"code": "too_large", "message": "The image is larger than 20 MB."})
    try:
        return await run_in_threadpool(engine.predict_upload, raw)
    except ImageError as exc:
        raise HTTPException(status_code=415, detail={"code": "bad_image", "message": str(exc)})


@app.post("/api/samples/{image_id}/predict")
async def predict_sample(image_id: str):
    require_ready()
    if image_id not in engine.images:
        raise HTTPException(status_code=404, detail={"code": "unknown_sample", "message": f"No dataset photo {image_id}."})
    return await run_in_threadpool(engine.predict_dataset_image, image_id)


@app.exception_handler(Exception)
async def unexpected_error(request: Request, exc: Exception):
    return JSONResponse(status_code=500, content={"detail": {
        "code": "server_error", "message": "The server hit an unexpected error.", "error": f"{type(exc).__name__}: {exc}"}})


# Real project photos (licensed CC BY / CC BY-SA / CC0, credited in the interface).
for _folder in IMAGE_FOLDERS:
    if (DATASET_DIR / _folder).is_dir():
        app.mount(f"/dataset/{_folder}", StaticFiles(directory=str(DATASET_DIR / _folder)), name=_folder)

# The built React interface.
if (FRONTEND_DIR / "index.html").exists():
    app.mount("/assets", StaticFiles(directory=str(FRONTEND_DIR / "assets")), name="assets")

    NO_CACHE = {"Cache-Control": "no-cache, no-store, must-revalidate"}

    @app.get("/{path:path}", include_in_schema=False)
    def frontend(path: str):
        target = (FRONTEND_DIR / path).resolve()
        if path and target.is_file() and FRONTEND_DIR.resolve() in target.parents and target.name != "index.html":
            return FileResponse(str(target))
        # index.html is never cached, so a new build shows up on a normal reload.
        return FileResponse(str(FRONTEND_DIR / "index.html"), headers=NO_CACHE)
else:
    @app.get("/", include_in_schema=False)
    def no_frontend():
        return JSONResponse({"message": "frontend/dist is missing. Rebuild it: cd frontend && npm install && npm run build"})
