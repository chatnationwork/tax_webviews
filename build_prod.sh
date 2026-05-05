#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

docker build \
  -t ghcr.io/chatnationwork/tax-app:prod \
  -t ghcr.io/chatnationwork/tax-app:prod_0.1.1 .

# Optional: ./build_prod.sh --deploy
# Overrides: CONTAINER_NAME HOST_PORT ENV_FILE IMAGE
if [[ "${1:-}" == "--deploy" ]]; then
  IMAGE="${IMAGE:-ghcr.io/chatnationwork/tax-app:prod}"
  CONTAINER_NAME="${CONTAINER_NAME:-tax-app}"
  HOST_PORT="${HOST_PORT:-3000}"
  ENV_FILE="${ENV_FILE:-$SCRIPT_DIR/.env}"
  docker stop "$CONTAINER_NAME" 2>/dev/null || true
  docker rm "$CONTAINER_NAME" 2>/dev/null || true
  docker run -d \
    -p "${HOST_PORT}:3000" \
    --name "$CONTAINER_NAME" \
    --env-file "$ENV_FILE" \
    --restart always \
    "$IMAGE"
  echo "Deployed $CONTAINER_NAME -> localhost:${HOST_PORT} (image: $IMAGE, env: $ENV_FILE)"
fi
