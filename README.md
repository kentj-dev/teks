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
teks [--host <HOST>] [--port <PORT>] [--no-open]
```

Teks binds to `127.0.0.1` by default and makes no external requests during normal operation.
