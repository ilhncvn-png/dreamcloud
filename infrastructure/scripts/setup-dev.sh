#!/usr/bin/env bash
set -euo pipefail

echo "════════════════════════════════════════"
echo "  DreamCloud — Dev Environment Setup"
echo "════════════════════════════════════════"

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$REPO_ROOT"

# ── Node.js version check ────────────────────────────────
REQUIRED_NODE="20"
CURRENT_NODE=$(node -v 2>/dev/null | sed 's/v//' | cut -d. -f1 || echo "0")
if [ "$CURRENT_NODE" -lt "$REQUIRED_NODE" ]; then
  echo "ERROR: Node.js $REQUIRED_NODE+ required. Current: $(node -v 2>/dev/null || echo 'not found')"
  echo "Install via nvm: nvm install 20 && nvm use 20"
  exit 1
fi
echo "✓ Node.js $(node -v)"

# ── Python version check ─────────────────────────────────
REQUIRED_PYTHON="3.11"
CURRENT_PYTHON=$(python3 --version 2>/dev/null | awk '{print $2}' | cut -d. -f1-2 || echo "0.0")
if [ "$(printf '%s\n' "$REQUIRED_PYTHON" "$CURRENT_PYTHON" | sort -V | head -n1)" != "$REQUIRED_PYTHON" ]; then
  echo "WARNING: Python $REQUIRED_PYTHON+ recommended. Current: $CURRENT_PYTHON"
fi
echo "✓ Python $(python3 --version 2>/dev/null || echo 'not found')"

# ── Docker check ─────────────────────────────────────────
if ! command -v docker &>/dev/null; then
  echo "ERROR: Docker not found. Install Docker Desktop: https://www.docker.com/products/docker-desktop/"
  exit 1
fi
echo "✓ Docker $(docker --version | awk '{print $3}' | tr -d ',')"

# ── Install JS dependencies ───────────────────────────────
echo ""
echo "Installing npm dependencies..."
npm ci
echo "✓ npm dependencies installed"

# ── .env files ───────────────────────────────────────────
echo ""
echo "Setting up .env files..."
if [ ! -f "apps/api/.env" ]; then
  cp apps/api/.env.example apps/api/.env
  echo "✓ apps/api/.env created from .env.example"
else
  echo "→ apps/api/.env already exists (skipping)"
fi
if [ ! -f "apps/mobile/.env" ]; then
  cp apps/mobile/.env.example apps/mobile/.env
  echo "✓ apps/mobile/.env created from .env.example"
else
  echo "→ apps/mobile/.env already exists (skipping)"
fi
if [ ! -f "apps/nlp/.env" ]; then
  cp apps/nlp/.env.example apps/nlp/.env
  echo "✓ apps/nlp/.env created from .env.example"
else
  echo "→ apps/nlp/.env already exists (skipping)"
fi

# ── Python venv ───────────────────────────────────────────
echo ""
echo "Setting up Python virtual environment..."
cd apps/nlp
if [ ! -d ".venv" ]; then
  python3 -m venv .venv
fi
source .venv/bin/activate
pip install -q -r requirements-dev.txt
echo "✓ Python dependencies installed"
deactivate
cd "$REPO_ROOT"

# ── Docker Compose ────────────────────────────────────────
echo ""
echo "Starting Docker services (PostgreSQL + Redis)..."
docker compose -f infrastructure/docker/docker-compose.yml up -d
echo "✓ Docker services started"

# ── Wait for Postgres ─────────────────────────────────────
echo ""
echo "Waiting for PostgreSQL..."
for i in {1..30}; do
  if docker exec dreamcloud-postgres pg_isready -U dreamcloud -d dreamcloud_dev &>/dev/null; then
    echo "✓ PostgreSQL ready"
    break
  fi
  sleep 1
done

# ── JWT keys ──────────────────────────────────────────────
echo ""
if [ ! -f "apps/api/keys/jwt-private.key" ]; then
  bash infrastructure/scripts/generate-jwt-keys.sh
else
  echo "→ JWT keys already exist (skipping)"
fi

echo ""
echo "════════════════════════════════════════"
echo "  Setup complete! Next steps:"
echo ""
echo "  1. Edit apps/api/.env with your credentials"
echo "  2. Run migrations: npm run db:migrate"
echo "  3. Start API: cd apps/api && npm run dev"
echo "  4. Start mobile: cd apps/mobile && npm run dev"
echo "════════════════════════════════════════"
