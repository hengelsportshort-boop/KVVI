#!/bin/bash
set -e

DATA_DIR="/app/public/data"
SEED_DIR="/app/public/data-seed"

if [ ! -d "$DATA_DIR" ]; then
  mkdir -p "$DATA_DIR"
fi

for f in "$SEED_DIR"/*; do
  [ -e "$f" ] || continue
  name=$(basename "$f")
  if [ ! -e "$DATA_DIR/$name" ]; then
    echo "  seeding $name..."
    cp -r "$f" "$DATA_DIR/"
  fi
done

exec node server.mjs
