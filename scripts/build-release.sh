#!/usr/bin/env sh
set -eu

project_dir=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)

cd "$project_dir/web"
if [ -f package-lock.json ]; then
  npm ci
else
  npm install
fi
npm run build

cd "$project_dir"
cargo build --release

printf '\nBuilt %s/target/release/teks\n' "$project_dir"
