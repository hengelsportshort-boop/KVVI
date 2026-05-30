#!/bin/bash
set -e

DATA_DIR="/app/public/data"
SEED_DIR="/app/public/data-seed"

if [ ! -d "$DATA_DIR" ]; then
  mkdir -p "$DATA_DIR"
fi

for f in "$SEED_DIR"/*; do
  name=$(basename "$f")
  if [ ! -f "$DATA_DIR/$name" ]; then
    echo "  seeding $name..."
    cp "$f" "$DATA_DIR/"
  fi
done

exec node server.mjs
