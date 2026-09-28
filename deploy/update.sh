#!/usr/bin/env bash
# Pull the latest code and restart the backend.
#
# Usage (from the project root on the server):
#     bash deploy/update.sh
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_DIR"

OLD_REQS="$(git rev-parse HEAD:backend/requirements.txt)"
git pull
NEW_REQS="$(git rev-parse HEAD:backend/requirements.txt)"

if [ "$OLD_REQS" != "$NEW_REQS" ]; then
    echo "==> requirements.txt changed, installing dependencies"
    venv/bin/python - <<'EOF'
from pathlib import Path
raw = Path("backend/requirements.txt").read_bytes()
text = raw.decode("utf-16") if raw[:2] in (b"\xff\xfe", b"\xfe\xff") else raw.decode("utf-8-sig")
Path("/tmp/requirements-utf8.txt").write_text(text, encoding="utf-8")
EOF
    VIRTUAL_ENV="$PROJECT_DIR/venv" "$HOME/.local/bin/uv" pip install -r /tmp/requirements-utf8.txt
fi

sudo systemctl restart mentorship-backend
echo "Restarted. Follow logs with: sudo journalctl -u mentorship-backend -f"
