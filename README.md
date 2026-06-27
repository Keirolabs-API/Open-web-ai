# loginwith-openrouter

> "Log in with Claude" — but the version that's actually allowed. 🪪

A drop-in **"Sign in with OpenRouter"** for the browser. The user clicks a button,
authenticates on `openrouter.ai` (you never see their password), comes back with a
scoped API key, and you use that key to run AI actions **from the frontend** —
on their account, with their quota, including free models. **No backend required.**

The platform ships data + UI. The user ships the AI. They meet in the browser.

## The 30-second pitch

- **For the platform:** zero AI bill, zero AI infra, zero AI downtime of your own,
  zero data liability — your server never sees the AI and never sees the data go to it.
- **For the user:** one OAuth click, a model picker, a spending cap, and their own
  free-tier quota. They revoke anytime on openrouter.ai.
- **For trust:** zero runtime deps, one default wire (`openrouter.ai`), SRI-pinnable,
  one file away from auditable.

## Quickstart

```bash
npm i loginwith-openrouter
```

User side — one tag handles sign-in + model picker + spending cap:

```html
<script type="module" src="node_modules/loginwith-openrouter/src/button.js"></script>
<login-with-openrouter app-name="My App"></login-with-openrouter>
```

Dev side — one import, one call:

```js
import { ai } from "loginwith-openrouter";
ai.completeSignIn();                                   // call once on load (the button does this)
const ans = await ai.ask("Summarize this: …");          // on the user's account
ai.spend;                                              // 0.0023  (tracked from usage.cost)
```

Or via CDN, hash-pinned (`npm run sri` generates the hash):

```html
<script type="module" integrity="sha384-…" crossorigin
  src="https://cdn.jsdelivr.net/npm/loginwith-openrouter@0.1.0/src/button.js"></script>
```

See it live: `npx serve .` then open `/example/` (a SaaS demo with streaming,
a tool-using agent, and JSON mode).

## Features

- **OAuth PKCE** sign-in — no client secret, no backend, browser-direct (CORS-verified).
- **Chat, streaming, structured output (JSON Schema), tool use (agent loop), vision.**
- **Any provider** — OpenRouter (OAuth), any OpenAI-compatible endpoint, local Ollama,
  or point at your own. Rug-pull proof.
- **Zero-infra failover** — set `ai.fallbacks`; if the primary model is down, the next serves.
- **Spending cap** — `ai.setBudget(1)` stops this app past `$1`, tracked from real `usage.cost`.
- **Pinnable** — SRI hash so a tampered CDN can't swap "no backend" for "phones home."
- **Framework-agnostic** — a `<login-with-openrouter>` web component + an optional React hook.
- **Zero runtime deps, zero build step** — `src/*.js` ships verbatim.

## Documentation

| | |
|---|---|
| [Getting started & recipes](docs/guide.md) | install, the button, the `ai` object, streaming/tools/JSON/vision, running the example |
| [API reference](docs/api.md) | every export, the `ai` surface, types |
| [Providers](docs/providers.md) | OpenRouter, OpenAI-compatible, Ollama, fallbacks, SRI |
| [Security & trust](docs/security.md) | the trust thesis, XSS, the cap reality, what's legit vs banned |

## What this is *not*

This is **not** "log in with a consumer Claude/ChatGPT account and use that
subscription." Anthropic bans proxying consumer credentials through third-party
apps (enforced at their edge since Jan 2026); OpenAI's consumer login is
identity-only. Both get you revoked. This project uses **OpenRouter's
first-class browser OAuth** (and BYO API keys for other providers) — the legit,
ToS-clean path. See [Security & trust](docs/security.md).

## Status

`0.1.0-beta`. PKCE, SSE, budget, and provider logic are unit-tested (15 passing).
The **live OAuth round-trip** and real `usage.cost` accounting are verified by
inspection, not yet by a maintainer click-through — verify on your account before
calling it production.

## License

MIT — see [LICENSE](LICENSE).