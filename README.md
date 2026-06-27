# loginwith-openrouter

> "Log in with Claude" — but the version that's actually allowed. 🪪

A drop-in **"Sign in with OpenRouter"** for the browser. The user clicks a button,
authenticates on `openrouter.ai` (you never see their password), comes back with a
scoped API key, and you use that key to run AI actions **from the frontend** —
on their account, with their quota, including free models. **No backend required.**

The platform ships data + UI. The user ships the AI. They meet in the browser.

## Vision

**Your AI, your bill, your choice — on every site.** The platform running the
website never gets your API key and can't see it: the key lives only in your
browser and is sent only to OpenRouter, never to the website's servers (there is
no website server for AI). It's like plugging your own headphones into a site's
stereo — the site supplies the music, your account decides how it sounds, and
the site never holds your headphones. One AI account, every app, the user in
control. Full version for technical and non-technical readers: [Vision](docs/vision.md).

## Why

**For users (the people who log in):**

- Use the AI you already have — your own account, your own model choice. You're
  not paying some random site for a new subscription.
- Your key and your data stay in your browser. The site never receives your key
  and never sends your data to an AI it controls.
- Set a spending cap and revoke access anytime on openrouter.ai. You're in charge.
- Free models mean you can try it at zero cost.

**For companies (the sites that integrate it):**

- Add AI features with no AI bill — users bring their own credits, so you don't
  pay per token.
- No AI infrastructure to build, run, or babysit — no model hosting, no rate
  limits, no failover to manage.
- Less AI data liability — your servers never process user data with an AI (it
  runs in the user's browser on their key), so there's less to worry about.
- No keys to protect — you never hold user API keys, so there's nothing to leak.
- Ship in minutes — one tag for the UI, one `await ai.ask()` for the action.

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
| [Vision](docs/vision.md) | the dream, in plain English and in technical terms — and why we never see your key |
| [Getting started & recipes](docs/guide.md) | install, the button, the `ai` object, streaming/tools/JSON/vision, running the example |
| [API reference](docs/api.md) | every export, the `ai` surface, types |
| [Providers](docs/providers.md) | OpenRouter, OpenAI-compatible, Ollama, fallbacks, SRI |
| [Security & trust](docs/security.md) | the trust thesis, XSS, the cap reality, what's legit vs banned |

## Status

`0.1.0-beta`. PKCE, SSE, budget, and provider logic are unit-tested (15 passing).
The **live OAuth round-trip** and real `usage.cost` accounting are verified by
inspection, not yet by a maintainer click-through — verify on your account before
calling it production.

## License

MIT — see [LICENSE](LICENSE).