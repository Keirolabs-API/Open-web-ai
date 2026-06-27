# Providers

The lib is **provider-agnostic**. Defaults to OpenRouter (OAuth); `configure()`
re-points the wire to any OpenAI-compatible endpoint, including a local Ollama.
This is the rug-pull-proof layer: no single provider is load-bearing, and if one
goes hostile you switch in one call.

## Switch provider

```js
import { ai } from "loginwith-openrouter";

ai.configure({ provider: "openrouter" });                                      // default (OAuth)
ai.configure({ provider: "openai-compatible", baseURL: "https://api.openai.com", apiKey: "sk-…" });
ai.configure({ provider: "ollama", baseURL: "http://localhost:11434" });       // local, no key, offline
ai.configure({ baseURL: "https://your-internal-llm.corp", apiKey: "…" });       // anything OpenAI-compatible
```

For non-OAuth providers, set the key directly:

```js
ai.configure({ provider: "openai-compatible", baseURL, apiKey });
// or: import { setApiKey } from "loginwith-openrouter"; setApiKey("sk-…");
```

`isSignedIn` is true whenever a key is present, OAuth or pasted.

## Provider matrix

| Provider | Type | Key | Chat shape | Notes |
|---|---|---|---|---|
| **OpenRouter** | OAuth | `sk-or-…` (issued by OAuth) | OpenAI-compat | Default. Free models. CORS ✓. The only OAuth path. |
| **OpenAI** | API key | `sk-…` (platform.openai.com) | OpenAI-compat | Drop-in. |
| **Groq** | API key | `gsk_…` | OpenAI-compat | Free tier, very fast. Drop-in. |
| **Together / Fireworks / DeepSeek / Mistral / Cohere** | API key | per provider | OpenAI-compat | Drop-in. Some have free tiers. |
| **Ollama** | none | — | OpenAI-compat (`/v1`) | Local, offline, private. |
| **LM Studio / llama.cpp / Jan** | none | — | OpenAI-compat | Local. Drop-in. |
| **Anthropic** | API key | `sk-ant-…` (console.anthropic.com) | **Messages API** (not OpenAI-compat) | Needs an adapter. ToS-clean (official API). |

> **Anthropic (direct API)** is legit — it's the official `api.anthropic.com`
> with your own API key, **not** a consumer claude.ai login. Its request shape
> differs from OpenAI's, so it needs a small Messages-API adapter (not yet built).
> The *banned* thing is consumer-account OAuth — see [Security](security.md).

## Claude in your app, the legit way

Claude is already reachable **today** via OpenRouter — just pick an
`anthropic/claude-*` model in the picker (or `ai.model = "anthropic/claude-3.5-sonnet"`).
Runs on the user's OpenRouter credits. Zero new code.

## Zero-infra failover

Set a fallback list; if the primary model is down, OpenRouter's routing serves
the next. No failover infra of your own:

```js
ai.fallbacks = ["anthropic/claude-3.5-sonnet", "openai/gpt-oss-20b:free"];
```

`ai.fallbacks` is merged into every call's `route.fallbacks` (unless you pass
`route` explicitly). Clear with `ai.fallbacks = []`.

## Pinned, verifiable install (SRI)

```bash
npm run sri
```

Emits a `sha384`-pinned `<script>` snippet against **jsdelivr** (which serves
the npm tarball verbatim — `esm.sh` rewrites modules and breaks byte-for-byte
pinning, so don't SRI against it):

```html
<script type="module" integrity="sha384-…" crossorigin
  src="https://cdn.jsdelivr.net/npm/loginwith-openrouter@0.1.0/src/button.js"></script>
```

The browser refuses a tampered copy — "no backend" can't be silently swapped
for "phones home." See [Security](security.md).