# loginwith-openrouter

A button your users click to log in with their OpenRouter account — so your site can use AI
without paying for API calls. The user brings their own key, their own quota, their own models.

**No backend. No API bill. No keys to store.**

## What this solves

Normally, if you add AI to your site, you pay per API call. You store API keys on your server.
You worry about abuse, rate limits, and data liability.

With this library:

- **You** add a button to your page
- **Your user** clicks it, signs in on OpenRouter, and comes back with a key in their browser
- **Your frontend JS** calls AI models using their key, on their account, with their billing
- **Your server never touches the key** — there's no backend at all

The user pays for the AI they use. You just provide the UI and logic.

## Install

```bash
npm i loginwith-openrouter
```

## Usage

**1. Add the button** — handles sign-in, model picker, and spending cap:

```html
<script type="module" src="node_modules/loginwith-openrouter/src/button.js"></script>
<login-with-openrouter app-name="My App"></login-with-openrouter>
```

**2. Call AI from your frontend:**

```js
import { ai } from "loginwith-openrouter";

// Call once on page load (handles returning from OpenRouter)
await ai.completeSignIn();

// Now the user is signed in. Make AI calls on their account.
const summary = await ai.ask("Summarize this article: ...");
```

That's it. No backend, no proxy, no API key setup.

## What you can do

| What | How |
|---|---|
| Chat / text | `await ai.ask("...")` |
| Streaming chat | `for await (const ev of ai.stream("..."))` |
| Structured output (JSON) | `await ai.json("...", { schema })` |
| Tool-use agent loop | `await ai.agent("...", { tools })` |
| Vision (images) | `await ai.ask("...", { images: [...] })` |
| RAG (retrieval + generation) | `await ai.rag("...", { retrieve })` |
| Embeddings | `await ai.embed("text")` |
| Budget cap | `ai.setBudget(1)` — stops spending at $1 |

## How the auth flow works

1. User clicks "Sign in with OpenRouter" → redirected to `openrouter.ai`
2. User approves on OpenRouter's site (you never see their password)
3. Browser comes back with a short-lived code
4. Library exchanges the code for a scoped API key — **stored only in the browser**
5. All AI calls go directly from the browser to OpenRouter's API with that key

Your server never sees the key. There's nothing to leak.

## Switch providers

Not locked to OpenRouter. Point at any OpenAI-compatible endpoint:

```js
ai.configure({ provider: "ollama", baseURL: "http://localhost:11434" });
ai.setApiKey("sk-...");  // or omit for local models that don't need auth
```

## Example

Run `npx serve .` and open `/example/` — a full demo with streaming, tool-use agent,
JSON extraction, and RAG against a built-in knowledge base.

## Docs

| | |
|---|---|
| [Guide](docs/guide.md) | setup, streaming, tools, vision, recipes |
| [API](docs/api.md) | all methods, types, options |
| [Providers](docs/providers.md) | OpenRouter, OpenAI, Ollama, fallbacks |
| [Security](docs/security.md) | trust model, what this can and can't do |
| [Vision](docs/vision.md) | the full concept |

## Status

`0.1.0-beta`. Core logic unit-tested. Live OAuth round-trip verified by inspection.

## License

MIT
