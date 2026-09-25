# Teks

Local SMS testing for developers. Teks captures SMS requests on localhost and shows them instantly in a conversation-style inbox.

## Install

macOS / Linux (Homebrew):

```bash
brew install kentj-dev/tap/teks
```

macOS / Linux (shell installer):

```bash
curl --proto '=https' --tlsv1.2 -LsSf https://github.com/kentj-dev/teks-rust/releases/latest/download/teks-installer.sh | sh
```

Windows (PowerShell):

```powershell
powershell -ExecutionPolicy Bypass -c "irm https://github.com/kentj-dev/teks-rust/releases/latest/download/teks-installer.ps1 | iex"
```

Then run `teks`. The inbox opens in your browser at `http://127.0.0.1:8026`.

## Run from source

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

## Twilio compatibility

Start with `teks --provider twilio` (or pick Twilio in the inbox). Teks serves Twilio's Messages API
under the same paths as `https://api.twilio.com`, and never contacts Twilio:

```text
POST   /2010-04-01/Accounts/:AccountSid/Messages.json
GET    /2010-04-01/Accounts/:AccountSid/Messages.json
GET    /2010-04-01/Accounts/:AccountSid/Messages/:Sid.json
DELETE /2010-04-01/Accounts/:AccountSid/Messages/:Sid.json
```

Any HTTP Basic credentials are accepted and never stored. Responses, `SM…` SIDs, paging URIs,
and error bodies (`code`, `message`, `more_info`, `status`) follow Twilio's OpenAPI spec, so the
official helper libraries work unchanged once their requests are pointed at Teks:

```js
// Node (twilio)
const twilio = require('twilio');

class TeksClient extends twilio.RequestClient {
  request(opts) {
    return super.request({ ...opts, uri: opts.uri.replace('https://api.twilio.com', 'http://127.0.0.1:8026') });
  }
}

const client = twilio(accountSid, authToken, { httpClient: new TeksClient() });
```

```python
# Python (twilio)
from twilio.http.http_client import TwilioHttpClient
from twilio.rest import Client

class TeksHttpClient(TwilioHttpClient):
    def request(self, method, url, *args, **kwargs):
        url = url.replace("https://api.twilio.com", "http://127.0.0.1:8026")
        return super().request(method, url, *args, **kwargs)

client = Client(account_sid, auth_token, http_client=TeksHttpClient())
```

Or with cURL:

```bash
curl -X POST http://127.0.0.1:8026/2010-04-01/Accounts/AC00000000000000000000000000000000/Messages.json \
  -u AC00000000000000000000000000000000:local \
  --data-urlencode "To=+15558675310" \
  --data-urlencode "From=+15017122661" \
  --data-urlencode "Body=Your OTP is 123456"
```

Updating a message (`POST …/Messages/:Sid.json`), media sub-resources, and status callbacks are
not emulated yet.

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

## Releasing

Releases are built by [dist](https://github.com/axodotdev/cargo-dist) in GitHub Actions
(`.github/workflows/release.yml`). Bump `version` in `Cargo.toml`, commit, then push a matching tag:

```bash
git tag v0.1.0
git push origin v0.1.0
```

CI builds the frontend, compiles binaries for macOS, Linux, and Windows, publishes a GitHub
Release with the installers, and updates the formula in `kentj-dev/homebrew-tap` (using the
`HOMEBREW_TAP_TOKEN` secret). After changing `dist-workspace.toml`, run `dist generate`.

This builds the React frontend first, embeds `web/dist` into the Rust binary, and produces the standalone executable at `target/release/teks`.

## CLI

```text
teks [--host <HOST>] [--port <PORT>] [--no-open] [--provider <rest|semaphore|twilio>]
```

Teks binds to `127.0.0.1` by default and makes no external requests during normal operation.
