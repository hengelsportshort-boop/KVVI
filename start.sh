#!/bin/bash
set -e

DATA_DIR="/app/public/data"
SEED_DIR="/app/public/data-seed"
SENIOREN_DIR="/app/public/images/senioren"
UPLOADS_DIR="/app/public/data/uploads"

if [ ! -d "$DATA_DIR" ]; then
  mkdir -p "$DATA_DIR"
fi

if [ ! -d "$SENIOREN_DIR" ]; then
  mkdir -p "$SENIOREN_DIR"
fi

if [ ! -d "$UPLOADS_DIR" ]; then
  mkdir -p "$UPLOADS_DIR"
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
