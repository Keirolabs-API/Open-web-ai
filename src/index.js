// loginwith-openrouter — "Sign in with OpenRouter" for the browser.
//
// What this is: the user clicks a button, authenticates ON openrouter.ai
// (we never see their password), comes back with a code, we exchange it for a
// scoped API key, and use that key to call models from the frontend.
//
// Trust contract: this file only ever sends the key to api.openrouter.ai.
// There is no other network call. Read it — that's the whole point.

import { createVerifier, challengeFromVerifier } from "./pkce.js";
import { SSEParser } from "./sse.js";
import { config, configure } from "./provider.js";

const STORE_KEY = "loginwith_openrouter_key";

// --- PKCE plumbing ---

async function pkcePair() {
  const verifier = createVerifier();
  const challenge = await challengeFromVerifier(verifier);
  return { verifier, challenge };
}

// sessionStorage dies when the tab closes — a dangling verifier is the worst
// that can leak, and it's useless without the matching redirect.
const tmp = {
  get: (k) => sessionStorage.getItem(k),
  set: (k, v) => sessionStorage.setItem(k, v),
  del: (k) => sessionStorage.removeItem(k),
};

// --- public API ---

/**
 * Kick off the OAuth flow. Redirects the browser to openrouter.ai.
 * @param {{ callbackUrl?: string, appName?: string }} [opts]
 */
export async function signIn({ callbackUrl, appName } = {}) {
  if (!config.oauth) throw new Error(`${config.name} is not an OAuth provider — set a key via setApiKey().`);
  const { verifier, challenge } = await pkcePair();
  tmp.set("lwor_verifier", verifier);

  const cb = callbackUrl || window.location.origin + window.location.pathname;
  // appName feeds OpenRouter's attribution; nice to have, not required.
  if (appName) tmp.set("lwor_app", appName);

  const url = new URL(config.authURL);
  url.searchParams.set("callback_url", cb);
  url.searchParams.set("code_challenge", challenge);
  url.searchParams.set("code_challenge_method", "S256");
  window.location.assign(url.toString());
}

/**
 * On the return page, exchange the ?code= for an API key. Call once on load.
 * Returns the key, or null if no code is present (not a redirect).
 */
export async function completeSignIn() {
  if (!config.oauth) return null;   // non-OAuth providers have no round-trip
  const params = new URLSearchParams(window.location.search);
  const code = params.get("code");
  if (!code) return null;

  const verifier = tmp.get("lwor_verifier");
  if (!verifier) throw new Error("No PKCE verifier in sessionStorage — retry signIn().");

  const res = await fetch(config.keyURL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, code_verifier: verifier, code_challenge_method: "S256" }),
  });
  if (!res.ok) throw new Error(`Key exchange failed: ${res.status} ${await res.text()}`);

  const { key } = await res.json();
  if (!key) throw new Error("OpenRouter returned no key.");

  localStorage.setItem(STORE_KEY, key);
  tmp.del("lwor_verifier");
  // scrub the ?code= from the URL so it isn't shared/logged
  history.replaceState(null, "", window.location.pathname);
  return key;
}

/** Is a key present? (Does not validate it.) */
export function isSignedIn() {
  return !!localStorage.getItem(STORE_KEY);
}

/** Get the stored key, or null. */
export function getApiKey() {
  return localStorage.getItem(STORE_KEY);
}

/** Set a key directly — for non-OAuth providers (OpenAI-compatible / Ollama). */
export function setApiKey(key) {
  if (key) localStorage.setItem(STORE_KEY, key);
  else localStorage.removeItem(STORE_KEY);
}

/** Forget the key. (Revoking the grant itself is the user's job on openrouter.ai.) */
export function signOut() {
  localStorage.removeItem(STORE_KEY);
}

/**
 * Run a chat completion. The ONLY place the key is sent.
 *
 * `opts` is passed through to OpenRouter as the request body (minus `signal`),
 * so every supported param works: tools, tool_choice, response_format,
 * reasoning, plugins, route, provider, top_p, max_tokens, seed, stop, …
 * New OpenRouter params need no SDK change.
 *
 * @param {Array} messages
 * @param {object} [opts]  model?, signal?, + any OpenRouter request field
 * @returns {Promise<{content:string, tool_calls:array, reasoning:string, usage:object, model:string, raw:object}>}
 */
export async function complete(messages, opts = {}) {
  const key = getApiKey();
  if (!key) throw new Error("Not signed in. Call completeSignIn() / signIn() first.");

  const { signal, ...body } = opts;
  body.model = body.model || "openai/gpt-oss-20b:free";
  body.messages = messages;

  const res = await fetch(config.chatURL, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });

  if (!res.ok) throw new Error(`${config.name} ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const msg = data.choices?.[0]?.message ?? {};
  return {
    content: msg.content ?? "",
    tool_calls: msg.tool_calls ?? [],
    reasoning: msg.reasoning ?? "",
    usage: data.usage ?? {},
    model: data.model ?? body.model,
    raw: data,
  };
}

/**
 * Stream a completion. Async generator yielding incremental events:
 *   { type:"delta", content, full }
 *   { type:"reasoning", reasoning }
 *   { type:"tool_calls", tool_calls }
 *   { type:"done", content, tool_calls, usage, model }   (terminal)
 * `opts.signal` (AbortSignal) cancels mid-stream.
 * @returns {AsyncGenerator}
 */
export async function* stream(messages, opts = {}) {
  const key = getApiKey();
  if (!key) throw new Error("Not signed in. Call completeSignIn() / signIn() first.");

  const { signal, ...body } = opts;
  body.model = body.model || "openai/gpt-oss-20b:free";
  body.messages = messages;
  body.stream = true;
  body.stream_options = { include_usage: true };   // so we get usage.cost on the last chunk

  const res = await fetch(config.chatURL, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok) throw new Error(`${config.name} ${res.status}: ${await res.text()}`);

  const parser = new SSEParser();
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let content = "", reasoning = "", usage = null;
  const toolCalls = [];

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      for (const evt of parser.push(decoder.decode(value, { stream: true }))) {
        if (evt.done) continue;
        const delta = evt.choices?.[0]?.delta;
        if (evt.usage) usage = evt.usage;
        if (!delta) continue;
        if (delta.content) { content += delta.content; yield { type: "delta", content: delta.content, full: content }; }
        if (delta.reasoning) { reasoning += delta.reasoning; yield { type: "reasoning", reasoning: delta.reasoning }; }
        if (delta.tool_calls) { mergeToolCalls(toolCalls, delta.tool_calls); yield { type: "tool_calls", tool_calls: toolCalls }; }
      }
    }
  } finally {
    reader.releaseLock?.();
  }
  yield { type: "done", content, reasoning, tool_calls: toolCalls, usage, model: body.model };
}

// OpenRouter streams tool_calls incrementally (index + fragment); merge them.
function mergeToolCalls(acc, deltas) {
  for (const d of deltas) {
    const i = d.index ?? acc.length;
    const slot = acc[i] || (acc[i] = { id: "", type: "function", function: { name: "", arguments: "" } });
    if (d.id) slot.id = d.id;
    if (d.type) slot.type = d.type;
    if (d.function?.name) slot.function.name += d.function.name;
    if (d.function?.arguments) slot.function.arguments += d.function.arguments;
  }
}

/**
 * Convenience: one prompt -> one string.
 * Forwards all opts (tools, response_format, images, …) to complete().
 */
export async function ask(prompt, opts = {}) {
  const messages = [];
  if (opts.system) messages.push({ role: "system", content: opts.system });
  if (opts.images?.length) {
    messages.push({ role: "user", content: [
      { type: "text", text: prompt },
      ...opts.images.map((u) => ({ type: "image_url", image_url: { url: u } })),
    ] });
  } else {
    messages.push({ role: "user", content: prompt });
  }
  const { content } = await complete(messages, opts);
  return content;
}

// High-level dev surface: ai.ask / ai.stream / ai.json / ai.agent / ai.setBudget / …
export { ai } from "./ai.js";
export { listModels } from "./models.js";
export { SSEParser } from "./sse.js";
export { configure, config as provider } from "./provider.js";