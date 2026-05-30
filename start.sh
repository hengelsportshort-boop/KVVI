#!/bin/bash
set -e

DATA_DIR="/app/public/data"
SEED_DIR="/app/public/data-seed"

if [ ! -d "$DATA_DIR" ]; then
  mkdir -p "$DATA_DIR"
fi

if [ ! -f "$DATA_DIR/hengelmap.csv" ]; then
  echo "Seeding data volume with initial files..."
  cp -r "$SEED_DIR"/* "$DATA_DIR/"
fi

exec node server.mjs
