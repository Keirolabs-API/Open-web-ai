// Chat: completions + streaming. This is the ONLY place the key is sent
// (to provider.chatURL). Everything else in the package passes opts through
// to these two functions.
//
//   complete(messages, opts) → { content, tool_calls, reasoning, usage, model, raw }
//   stream(messages, opts)   → async generator of { type, ... } events
//   ask(prompt, opts)        → string (convenience)

import { config } from "./provider.js";
import { SSEParser } from "./sse.js";
import { getApiKey } from "./auth.js";

/**
 * Run a chat completion. The ONLY place the key is sent.
 *
 * `opts` is passed through as the request body (minus `signal`), so every
 * supported param works: tools, tool_choice, response_format, reasoning,
 * plugins, route, provider, top_p, max_tokens, seed, stop, … New params need
 * no SDK change.
 *
 * @param {Array} messages
 * @param {object} [opts]  model?, signal?, + any request field
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