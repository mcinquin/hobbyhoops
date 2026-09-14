#!/bin/sh
set -eu

if ! mkdir -p /app/data; then
  echo "hobbyhoops: cannot create /app/data — mount ./data and chown 1111:1111" >&2
  exit 1
fi

if ! node /app/scripts/docker-ensure-db.mjs; then
  echo "hobbyhoops: preflight failed (see message above). Container will exit." >&2
  exit 1
fi

exec "$@"
