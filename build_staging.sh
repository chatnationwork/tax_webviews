#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

docker build \
  -t ghcr.io/chatnationwork/tax-app:latest \
  -t ghcr.io/chatnationwork/tax-app:0.2.1 .

# On the server: ./build_staging.sh --deploy
# Overrides: CONTAINER_NAME HOST_PORT ENV_FILE
if [[ "${1:-}" == "--deploy" ]]; then
  CONTAINER_NAME="${CONTAINER_NAME:-tax-app-staging}"
  HOST_PORT="${HOST_PORT:-3009}"
  ENV_FILE="${ENV_FILE:-$SCRIPT_DIR/.env}"
  docker stop "$CONTAINER_NAME" 2>/dev/null || true
  docker rm "$CONTAINER_NAME" 2>/dev/null || true
  docker run -d \
    -p "${HOST_PORT}:3000" \
    --name "$CONTAINER_NAME" \
    --env-file "$ENV_FILE" \
    --restart always \
    ghcr.io/chatnationwork/tax-app:latest
  echo "Deployed $CONTAINER_NAME -> localhost:${HOST_PORT} (env: $ENV_FILE)"
fi
