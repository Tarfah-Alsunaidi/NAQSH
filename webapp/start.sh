#!/usr/bin/env bash
# Start the NAQSH AI website:  bash start.sh   then open http://localhost:8000
set -e
cd "$(dirname "$0")"
PY="${NAQSH_PYTHON:-$HOME/ghadi/.venv/bin/python}"
[ -x "$PY" ] || PY="$(command -v python3)"
echo "Using Python: $PY"
if ! "$PY" -c "import fastapi, uvicorn" 2>/dev/null; then
  echo "Installing the two web packages (fastapi, uvicorn)…"
  "$PY" -m pip install "fastapi>=0.110" "uvicorn>=0.29"
fi
PORT="${PORT:-8000}"
# An old NAQSH server still running on the port would keep serving the OLD site. Stop it first.
OLD_PIDS="$(lsof -ti tcp:"$PORT" 2>/dev/null || true)"
for pid in $OLD_PIDS; do
  if ps -o command= -p "$pid" | grep -q "backend.main:app"; then
    echo "Stopping an older NAQSH AI server (pid $pid) that was still running on port $PORT…"
    kill "$pid" 2>/dev/null || true
  else
    echo "Port $PORT is used by another program:"; ps -o pid=,command= -p "$pid"
    echo "Close it, or run:  PORT=8001 bash start.sh"; exit 1
  fi
done
[ -n "$OLD_PIDS" ] && sleep 1
# The trained weights are made by running NAQSH.ipynb on this computer. If they are not in
# models/ yet, look for the notebook's models folder and copy them (35-class model only).
if [ ! -f models/naqsh_model.keras ] || [ ! -f models/threshold.json ]; then
  echo "models/naqsh_model.keras or threshold.json is missing here. Looking for the notebook's trained model…"
  HERE="$(pwd)"
  BEST=""
  for d in "$HOME/ghadi" "$HOME/Desktop" "$HOME/Documents" "$HOME/Downloads" "$(dirname "$HERE")"; do
    [ -d "$d" ] || continue
    while IFS= read -r f; do
      dir="$(dirname "$f")"
      case "$dir" in "$HERE"*) continue ;; esac
      [ -f "$dir/threshold.json" ] && [ -f "$dir/class_names.json" ] || continue
      n="$("$PY" -c "import json,sys; print(len(json.load(open(sys.argv[1]))))" "$dir/class_names.json" 2>/dev/null || echo 0)"
      [ "$n" = "35" ] || continue
      if [ -z "$BEST" ] || [ "$f" -nt "$BEST" ]; then BEST="$f"; fi
    done < <(find "$d" -maxdepth 6 -name naqsh_model.keras -not -path "*/node_modules/*" -not -path "*/.Trash/*" 2>/dev/null)
  done
  if [ -n "$BEST" ]; then
    SRC="$(dirname "$BEST")"
    echo "Found the trained 35-class model in: $SRC  → copying it into models/"
    cp "$SRC/naqsh_model.keras" "$SRC/threshold.json" models/
    [ -f "$SRC/evaluation_results.json" ] && cp "$SRC/evaluation_results.json" models/
  else
    echo "!! No trained 35-class model found. Run NAQSH.ipynb to the end (it saves models/naqsh_model.keras"
    echo "!! and models/threshold.json), then copy those two files into: $HERE/models/"
    echo "!! The site will open, but predictions stay disabled until then."
  fi
fi
echo "Project folder: $(pwd)"
echo "Model files:    $(ls models | tr '\n' ' ')"
( sleep 4; command -v open >/dev/null && open "http://localhost:$PORT" ) &
echo "NAQSH AI → http://localhost:$PORT   (press Ctrl+C to stop)"
exec "$PY" -m uvicorn backend.main:app --host 127.0.0.1 --port "$PORT"
