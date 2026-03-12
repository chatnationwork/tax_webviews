#!/bin/bash

# Default to .env.production if no argument is provided
ENV_FILE=${1:-.env.production}

if [ ! -f "$ENV_FILE" ]; then
  echo "Error: $ENV_FILE not found!"
  exit 1
fi

echo "Loading variables from $ENV_FILE..."

# Safely evaluate and export variables from the env file
# This skips comments and blank lines
export $(grep -v '^#' "$ENV_FILE" | xargs)

# Run the docker build using the exported variables
docker build \
  --build-arg NEXT_PUBLIC_ANALYTICS_ENDPOINT="$NEXT_PUBLIC_ANALYTICS_ENDPOINT" \
  --build-arg NEXT_PUBLIC_ANALYTICS_WRITE_KEY="$NEXT_PUBLIC_ANALYTICS_WRITE_KEY" \
  --build-arg NEXT_PUBLIC_ALLOW_DESKTOP_TESTING="$NEXT_PUBLIC_ALLOW_DESKTOP_TESTING" \
  --build-arg NEXT_PUBLIC_WHATSAPP_NUMBER="$NEXT_PUBLIC_WHATSAPP_NUMBER" \
  -t ghcr.io/chatnationwork/tax-app:latest \
  -t ghcr.io/chatnationwork/tax-app:0.1.1 .
