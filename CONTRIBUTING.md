# Contributing to Teks

Thanks for helping out! This guide covers running Teks from source, how the code is organized,
adding a provider, and cutting a release.

## Requirements

- [Rust](https://rustup.rs) (stable, edition 2024)
- [Node.js](https://nodejs.org) 22 or newer, for the inbox frontend

## Run from source

The inbox frontend is compiled into the binary, so build it once before the first `cargo run`:

```bash
cd web && npm ci && npm run build && cd ..
cargo run -- --no-open
```

`web/dist` is build output and isn't committed; rebuild it whenever you want `cargo run` to pick
up frontend changes (or use the Vite dev server below). Messages are stored in your
per-user application data folder; pass `--data-dir <PATH>` (a hidden flag) to use a scratch
location instead.

## Frontend development

Run the Rust backend, then start Vite in a second terminal:

```bash
cd web
npm install
npm run dev
```

Vite proxies `/api` to the Rust server on port 8026, and changes under `web/src` appear
immediately.

To see frontend changes through the Rust server instead, rebuild `web/dist` first, because the
binary embeds it:

```bash
cd web && npm run build && cd ..
cargo run
```

## Checks

Run these before opening a pull request:

```bash
cargo fmt
cargo clippy --all-targets
cargo test
(cd web && npm run build)   # type-checks and builds the frontend
```

## Adding a provider

Every provider is declared in [`src/providers/registry.rs`](src/providers/registry.rs). To add one:

1. Implement its adapter under `src/providers/<name>/` and expose a `router()` for its endpoints.
   [`src/providers/twilio/`](src/providers/twilio/) is a good reference.
2. Add one line to the `providers!` list in the registry and write its `ProviderSpec` there:
   label, description, endpoints with request and response examples, auth, path-parameter
   examples, and inspector fields.

The `--provider` CLI values, endpoint gating, startup banner, and the whole inbox UI (onboarding
cards, endpoint docs, Postman Guide, cURL example, inspector fields) read from the registry
through `GET /api/_teks/providers`, so the frontend needs no changes. Registry tests check that
every endpoint's path parameters have examples.

Match the real provider's wire format (paths, status codes, response bodies, and error shapes)
so that official SDKs work unchanged, and add integration tests in `src/api/mod.rs`.

## Production build

```bash
./scripts/build-release.sh
```

This builds the React frontend, embeds `web/dist` into the Rust binary, and produces a
standalone executable at `target/release/teks`.

## Releasing

Releases are built by [dist](https://github.com/axodotdev/cargo-dist) in GitHub Actions
(`.github/workflows/release.yml`). Bump `version` in `Cargo.toml`, commit, then push a matching tag:

```bash
git tag vX.Y.Z
git push origin vX.Y.Z
```

CI builds the frontend, compiles binaries for macOS, Linux, and Windows, publishes a GitHub
Release with the installers, and updates the formula in
[`kentj-dev/homebrew-tap`](https://github.com/kentj-dev/homebrew-tap) using the
`HOMEBREW_TAP_TOKEN` secret.

The workflow is generated from `dist-workspace.toml` and `.github/build-setup.yml`. After
changing either one, run `dist generate` rather than editing `release.yml` by hand.
