#!/usr/bin/env bash
# One-time server setup for the backend on Ubuntu (AWS EC2).
#
# Usage (from the project root on the server):
#     bash deploy/setup.sh your-subdomain.duckdns.org
#
# Before running: backend/.env must exist on the server (copy it over by hand,
# it is never committed to git).
set -euo pipefail

DOMAIN="${1:-}"
if [ -z "$DOMAIN" ]; then
    echo "Usage: bash deploy/setup.sh <domain>   e.g. mentorship-api.duckdns.org"
    exit 1
fi

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_DIR"

if [ ! -f backend/.env ]; then
    echo "ERROR: backend/.env is missing. Copy it to the server first."
    exit 1
fi

echo "==> Installing system packages"
sudo apt-get update -y
sudo apt-get install -y git curl build-essential libgl1 libglib2.0-0 libgomp1
if ! sudo apt-get install -y caddy; then
    # Fallback: Caddy's official apt repository
    sudo apt-get install -y debian-keyring debian-archive-keyring apt-transport-https gnupg
    curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' \
        | sudo gpg --dearmor --yes -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
    curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' \
        | sudo tee /etc/apt/sources.list.d/caddy-stable.list
    sudo apt-get update -y
    sudo apt-get install -y caddy
fi

echo "==> Adding 4 GB swap (safety net for model loading / pip installs)"
if [ ! -f /swapfile ]; then
    sudo fallocate -l 4G /swapfile
    sudo chmod 600 /swapfile
    sudo mkswap /swapfile
    sudo swapon /swapfile
    echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
fi

echo "==> Installing Python 3.12 via uv (server default is newer than our ML libs support)"
if ! command -v uv >/dev/null 2>&1 && [ ! -x "$HOME/.local/bin/uv" ]; then
    curl -LsSf https://astral.sh/uv/install.sh | sh
fi
UV="$HOME/.local/bin/uv"
[ -x "$UV" ] || UV="$(command -v uv)"

if [ ! -d venv ]; then
    "$UV" venv --python 3.12 --seed venv
fi

echo "==> Installing Python dependencies"
# requirements.txt is saved as UTF-16 on Windows; convert to UTF-8 for the installer.
venv/bin/python - <<'EOF'
from pathlib import Path
raw = Path("backend/requirements.txt").read_bytes()
text = raw.decode("utf-16") if raw[:2] in (b"\xff\xfe", b"\xfe\xff") else raw.decode("utf-8-sig")
Path("/tmp/requirements-utf8.txt").write_text(text, encoding="utf-8")
EOF
# CPU-only torch: avoids ~3 GB of unused NVIDIA/CUDA libraries.
VIRTUAL_ENV="$PROJECT_DIR/venv" "$UV" pip install torch --index-url https://download.pytorch.org/whl/cpu
VIRTUAL_ENV="$PROJECT_DIR/venv" "$UV" pip install -r /tmp/requirements-utf8.txt
venv/bin/python -m spacy download en_core_web_sm

echo "==> Installing the backend service"
sed -e "s|__PROJECT_DIR__|$PROJECT_DIR|g" -e "s|__USER__|$USER|g" \
    deploy/mentorship-backend.service | sudo tee /etc/systemd/system/mentorship-backend.service >/dev/null
sudo systemctl daemon-reload
sudo systemctl enable mentorship-backend
sudo systemctl restart mentorship-backend

echo "==> Configuring Caddy (HTTPS) for $DOMAIN"
sed "s|__DOMAIN__|$DOMAIN|g" deploy/Caddyfile | sudo tee /etc/caddy/Caddyfile >/dev/null
sudo systemctl enable caddy
sudo systemctl reload caddy || sudo systemctl restart caddy

echo
echo "Done. The backend is starting (first start loads the ML models, give it a few minutes)."
echo "  Logs:   sudo journalctl -u mentorship-backend -f"
echo "  Check:  curl https://$DOMAIN/api/health"
