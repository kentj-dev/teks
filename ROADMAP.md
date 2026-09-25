# Roadmap

Where Teks is headed. Priorities shift based on what people ask for, so if something here
matters to you (or is missing), [open an issue](https://github.com/kentj-dev/teks/issues) or
👍 an existing one.

**Status:** ✅ shipped · 🚧 in progress · 🔜 next up · 💡 planned / under consideration

## Providers

The goal is that any app can point its existing SMS integration at Teks by changing only the base
URL. Each provider matches the real API's paths, response bodies, and error format, so official
SDKs work unchanged.

### Shipped

| Provider                      | Region      | Status                                |
| ----------------------------- | ----------- | ------------------------------------- |
| REST API (Teks-native)        | Any         | ✅                                    |
| Twilio Programmable Messaging | Global      | ✅ Send, list, fetch, delete          |
| Semaphore                     | Philippines | ✅ Send, priority, OTP, list, account |

### Next up

Ordered by how many developers each one unlocks.

| Provider                         | Region                              | Why                                                                  | Status |
| -------------------------------- | ----------------------------------- | -------------------------------------------------------------------- | ------ |
| Vonage (Nexmo) SMS API           | Global                              | Second most common global SMS API                                    | 🔜     |
| AWS SNS / End User Messaging SMS | Global                              | Default choice for AWS stacks, and its SDKs accept a custom endpoint | 🔜     |
| Telnyx                           | Global                              | Popular with developers, clean JSON API                              | 💡     |
| Plivo                            | Global                              | Twilio-style API, easy to support                                    | 💡     |
| Infobip                          | Global (strong in EU, Asia, Africa) | Common in enterprise and regional apps                               | 💡     |
| Sinch                            | Global                              | Common in enterprise                                                 | 💡     |
| MessageBird (Bird)               | Global (strong in EU)               | Widely used in Europe                                                | 💡     |
| SignalWire                       | Global                              | Twilio-compatible API, so mostly an alias of the Twilio provider     | 💡     |

### Regional providers

| Provider                  | Region      | Status |
| ------------------------- | ----------- | ------ |
| M360, Movider, iTexMo     | Philippines | 💡     |
| MSG91, Textlocal, Gupshup | India       | 💡     |
| Africa's Talking, Termii  | Africa      | 💡     |

### Deeper Twilio support

| Feature                                                                                               | Status |
| ----------------------------------------------------------------------------------------------------- | ------ |
| Status callbacks: POST `StatusCallback` URLs as messages move through `queued` → `sent` → `delivered` | 🔜     |
| Update and redact messages (`POST …/Messages/:Sid.json`)                                              | 💡     |
| Media sub-resources for MMS                                                                           | 💡     |
| Twilio Verify: send and check OTP codes                                                               | 💡     |

## Testing workflows

Features that make Teks useful in automated tests and CI, not just for looking at messages.

| Feature                     | Description                                                                                              | Status |
| --------------------------- | -------------------------------------------------------------------------------------------------------- | ------ |
| Latest message API          | `GET /api/messages/latest?to=…` so Playwright and Cypress tests can read the newest message for a number | 🔜     |
| OTP extraction              | Detect codes in message bodies, show them in the inbox, and return them from the API (`"otp": "123456"`) | 🔜     |
| Docker image                | `docker run -p 8026:8026 ghcr.io/kentj-dev/teks` for docker-compose setups and CI                        | 🔜     |
| Headless and ephemeral mode | Run without a browser, and keep messages only in memory for clean test runs                              | 💡     |
| Failure simulation          | Make chosen numbers fail, return provider errors, or add delays to test error handling                   | 💡     |
| Delivery lifecycle          | Move messages through realistic statuses over time instead of instantly delivering                       | 💡     |
| Inbound SMS                 | Reply from the inbox and have Teks POST the provider's inbound webhook to your app                       | 💡     |
| Multiple providers at once  | Accept requests for several providers at the same time instead of one selected mode                      | 💡     |

## Inbox

| Feature                   | Description                                                                      | Status |
| ------------------------- | -------------------------------------------------------------------------------- | ------ |
| Postman Guide             | Step-by-step Postman setup for every provider and endpoint                       | ✅     |
| Segment and encoding info | Show GSM-7 or UCS-2 and the segment count for every message, as carriers bill it | 💡     |
| Filters                   | Filter by provider, sender, status, and date, not just search                    | 💡     |
| Export                    | Download conversations as JSON or CSV                                            | 💡     |
| MMS preview               | Show images attached with `MediaUrl`                                             | 💡     |
| Retention limits          | Cap how many messages are kept, or for how long                                  | 💡     |

## Install and distribution

| Channel                                         | Status |
| ----------------------------------------------- | ------ |
| Homebrew, shell installer, PowerShell installer | ✅     |
| Docker image (GitHub Container Registry)        | 🔜     |
| `cargo install teks` (crates.io)                | 💡     |
| Windows package managers (Scoop, winget)        | 💡     |
| npm (`npx teks`) for JavaScript projects        | 💡     |
| Signed and notarized macOS binaries             | 💡     |

## Contributing

Adding a provider is the most helpful contribution. The provider registry means it's one adapter
module plus one registry entry, and the inbox UI, Postman Guide, and CLI pick it up automatically.
See [CONTRIBUTING.md](CONTRIBUTING.md#adding-a-provider).
