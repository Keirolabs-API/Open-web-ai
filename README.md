# loginwith-openrouter

Let users sign in with their OpenRouter account and use their own API key to call AI models — all from the browser, no backend required.

```bash
npm i loginwith-openrouter
```

```html
<script type="module" src="node_modules/loginwith-openrouter/src/button.js"></script>
<login-with-openrouter app-name="My App"></login-with-openrouter>
```

```js
import { ai } from "loginwith-openrouter";
await ai.completeSignIn();
const answer = await ai.ask("Summarize this: ...");
```

## How it works

1. User clicks **Sign in with OpenRouter** → redirected to `openrouter.ai` to authorize
2. They come back with a scoped API key stored in their browser — **your server never sees it**
3. You call AI models from the frontend using their key, on their quota, with their payment method

The key is only sent to OpenRouter's API. There is no backend, no proxy, no key storage on your servers.

## Why

**For users:** Use your own AI account and models on any site. No new subscriptions. Set spending caps. Revoke access anytime.

**For sites:** Add AI features with zero AI infrastructure cost — users bring their own credits. No API keys to protect, no data liability, no model hosting.

## Features

- **OAuth PKCE** — no client secret, no backend needed
- **Chat, streaming, JSON Schema, tool-use agent loop, vision**
- **RAG framework** — retrievers (static, HTTP, vector, hybrid) + rerankers + `ai.rag()`
- **Any provider** — OpenRouter (OAuth), any OpenAI-compatible endpoint, local Ollama
- **Zero-infra failover** — `ai.fallbacks = ["model-b", "model-c"]`
- **Spending cap** — `ai.setBudget(1)` stops at $1
- **Web component** — `<login-with-openrouter>` handles sign-in, model picker, budget
- **React hook** — `useOpenRouter()` via `loginwith-openrouter/react`
- **Zero runtime deps, no build step**

## Quickstart

See the [guide](docs/guide.md) for streaming, tool use, JSON mode, vision, and running the demo.

## Docs

| | |
|---|---|
| [Vision](docs/vision.md) | full concept and security model |
| [Guide](docs/guide.md) | install, button, `ai` object, recipes |
| [API](docs/api.md) | exports, types, every method |
| [Providers](docs/providers.md) | OpenRouter, OpenAI, Ollama, fallbacks |
| [Security](docs/security.md) | trust model, XSS, caps |

## Status

`0.1.0-beta`. Core logic unit-tested (15 passing). OAuth round-trip verified by inspection.

## License

MIT
