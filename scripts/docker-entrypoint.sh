#!/bin/sh
set -eu

DATA_DIR="/app/data"
SEED_DIR="/app/data-seed"

mkdir -p "$DATA_DIR"

for file in collection.json references.json fr-nba.json; do
  if [ ! -f "$DATA_DIR/$file" ] && [ -f "$SEED_DIR/$file" ]; then
    cp "$SEED_DIR/$file" "$DATA_DIR/$file"
  fi
done

if [ ! -f "$DATA_DIR/users.json" ]; then
  printf '[]\n' > "$DATA_DIR/users.json"
fi

if [ ! -f "$DATA_DIR/sessions.json" ]; then
  printf '[]\n' > "$DATA_DIR/sessions.json"
fi

exec "$@"
