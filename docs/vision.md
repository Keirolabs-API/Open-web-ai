# Vision

## The future this points at

AI shouldn't be something every website re-implements behind its own login,
bills you for, and controls. It should be a **personal capability you carry
across the whole web** — like your wallet or your browser. You pick your AI once;
every app you use plugs into it. The app brings its purpose; you bring the
intelligence. They meet in your browser. Nobody in between.

This project is one small step toward that: **let users bring their own AI model
to any platform**, and let platforms offer AI features without becoming AI
companies.

## For non-technical readers

Think of it like headphones.

When you "Log in with OpenRouter," it's like plugging **your own headphones** into
a website's stereo. The site supplies the music — its features, its data — and
your headphones (your AI account) decide how it sounds: what to summarize, what
to translate, what to do next.

Crucially, the website never holds your headphones. It never sees what's inside
them. It can't charge you for the music, because the power comes from you. If you
stop liking the site, you unplug and take your headphones — and your account —
somewhere else. **Your AI, your bill, your choice.**

The key promise in one sentence: **the company running the website never gets
your API key and can't see it.** Your key lives only in your browser and is sent
only to OpenRouter — never to the website's servers, because there is no website
server for AI.

## For technical readers

The platform never receives, proxies, stores, or logs the user's API key.

- The OAuth PKCE flow returns the key **to the user's browser only**, held in
  `localStorage` on their origin.
- The key is sent **exclusively** to `provider.chatURL` (default
  `https://api.openrouter.ai`) **from the user's browser**.
- There is **no server in this architecture** that the key transits — no relay,
  no backend proxy, no key vault, no logging pipeline. The platform's backend
  has no AI endpoint at all.
- Zero runtime dependencies means nothing else can exfiltrate the key either.

It's verifiable:

```bash
grep -rn "fetch(" src/     # every outbound call — all go to provider.chatURL
```

This **eliminates key-handling as a trust surface for the integrator.** The
residual surface is XSS on the host page itself (any script on the page can read
`localStorage`) — which is the integrator's existing frontend-hygiene
responsibility, not a new secret to guard. See [Security](security.md).

## The aim

Let users bring **their desired AI models** — not one provider's. OpenRouter by
default; any OpenAI-compatible endpoint (OpenAI, Groq, Together, Fireworks,
DeepSeek, Mistral, Cohere); Anthropic; or a model running **on their own laptop**
(Ollama / LM Studio / llama.cpp). The platform is model-agnostic and
opinion-free; the user chooses the brain. See [Providers](providers.md).

One AI account, every app, the user in control — that's the bet.