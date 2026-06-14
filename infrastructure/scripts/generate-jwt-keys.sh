#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
KEYS_DIR="$REPO_ROOT/apps/api/keys"

mkdir -p "$KEYS_DIR"

if [ -f "$KEYS_DIR/jwt-private.key" ]; then
  echo "JWT keys already exist at apps/api/keys/ — skipping."
  exit 0
fi

echo "Generating JWT RS256 key pair..."
openssl genrsa -out "$KEYS_DIR/jwt-private.key" 2048
openssl rsa -in "$KEYS_DIR/jwt-private.key" -pubout -out "$KEYS_DIR/jwt-public.key"

chmod 600 "$KEYS_DIR/jwt-private.key"
chmod 644 "$KEYS_DIR/jwt-public.key"

echo "✓ JWT keys generated:"
echo "  Private: apps/api/keys/jwt-private.key (chmod 600)"
echo "  Public:  apps/api/keys/jwt-public.key"
echo ""
echo "WARNING: These keys are gitignored. Upload to AWS Secrets Manager for staging/production:"
echo "  aws secretsmanager create-secret --name dreamcloud/jwt/private-key \\"
echo "    --secret-string file://apps/api/keys/jwt-private.key"
echo "  aws secretsmanager create-secret --name dreamcloud/jwt/public-key \\"
echo "    --secret-string file://apps/api/keys/jwt-public.key"
