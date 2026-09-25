# Teks

Local SMS testing for developers. Teks captures SMS requests on localhost and shows them instantly in a conversation-style inbox.

## Run locally

```bash
cargo run -- --no-open
```

Teks listens on `http://127.0.0.1:8026` by default. Send a message with:

```bash
curl -X POST http://127.0.0.1:8026/api/messages \
  -H "Content-Type: application/json" \
  -d '{
    "to": "09171234567",
    "from": "MyApp",
    "message": "Your OTP is 123456"
  }'
```

Messages persist in the operating system's per-user application data directory.

## Semaphore compatibility

Point an existing Semaphore integration at `http://127.0.0.1:8026` and keep its documented
paths unchanged. Any non-empty local API key is accepted and is redacted before the request is
stored. Teks never contacts Semaphore.

Start directly in Semaphore mode with:

```bash
teks --provider semaphore
```

Plain `teks` starts in REST API mode (`--semaphore` still works as a shorthand). The first-use provider setup and the Change provider button
can switch the running server between the two modes. Only the selected provider's public endpoints
are enabled; requests to the other provider return a `409 Conflict` response explaining which
endpoints can be used.

```bash
curl --data \
  "apikey=local&number=09171234567&message=Hello from Teks&sendername=MyApp" \
  http://127.0.0.1:8026/api/v4/messages
```

Supported endpoints:

```text
POST /api/v4/messages
POST /api/v4/priority
POST /api/v4/otp
GET  /api/v4/messages
GET  /api/v4/messages/:id
GET  /api/v4/account
GET  /api/v4/account/transactions
GET  /api/v4/account/sendernames
GET  /api/v4/account/users
```

## Adding a provider

Every provider is declared in [`src/providers/registry.rs`](src/providers/registry.rs). To add one:

1. Implement its adapter under `src/providers/<name>/` and expose a `router()` for its endpoints.
2. Add one line to the `providers!` list in the registry and write its `ProviderSpec` there.

The CLI `--provider` values, endpoint gating, startup banner and the entire inbox UI (onboarding
cards, endpoint docs, cURL example, inspector fields) read from the registry through
`GET /api/_teks/providers`, so no frontend changes are needed.

## Frontend development

Run the Rust backend, then in a second terminal:

```bash
cd web
npm install
npm run dev
```

Vite proxies `/api` to the Rust server on port 8026.
Changes under `web/src` appear immediately in the Vite browser window; no manual frontend build is needed in this mode.

`cargo run` serves the frontend already compiled into `web/dist`. To view layout changes through the Rust server instead of Vite, rebuild the frontend first:

```bash
cd web
npm run build
cd ..
cargo run
```

## Production build

```bash
./scripts/build-release.sh
```

This builds the React frontend first, embeds `web/dist` into the Rust binary, and produces the standalone executable at `target/release/teks`.

## CLI

```text
teks [--host <HOST>] [--port <PORT>] [--no-open] [--provider <rest|semaphore>]
```

Teks binds to `127.0.0.1` by default and makes no external requests during normal operation.
