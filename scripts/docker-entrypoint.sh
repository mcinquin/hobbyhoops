#!/bin/sh
set -eu

mkdir -p /app/data
node /app/scripts/docker-ensure-db.mjs
exec "$@"
