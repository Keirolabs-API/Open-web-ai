// `ai` — the high-level dev surface. One import, everything wired.
//
//   import { ai } from "loginwith-openrouter";
//   ai.completeSignIn();
//   ai.setBudget(1);
//   await ai.ask("…");                 // string
//   for await (const ev of ai.stream("…")) { … }   // live deltas
//   const data = await ai.json("…", schema);        // structured output
//   const { content } = await ai.agent("…", { tools });  // tool loop
//   ai.spend / ai.remaining()

import * as core from "./index.js";
import * as budget from "./budget.js";
import { listModels } from "./models.js";
import { configure as configureProvider, config as provider } from "./provider.js";

const MODEL_KEY = "loginwith_openrouter_model";
const FALLBACKS_KEY = "loginwith_openrouter_fallbacks";
const get = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
const set = (k, v) => { try { localStorage.setItem(k, v); } catch {} };
const del = (k) => { try { localStorage.removeItem(k); } catch {} };

/** Merge the user's fallback list into opts.route.fallbacks (zero-infra failover). */
function withFallbacks(opts = {}) {
  const fb = ai.fallbacks;
  if (!fb?.length || opts.route) return opts;
  return { ...opts, route: { fallbacks: fb } };
}

function buildMessages(prompt, opts = {}) {
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
  return messages;
}

export const ai = {
  // --- auth ---
  get isSignedIn() { return core.isSignedIn(); },
  signIn: core.signIn,
  completeSignIn: core.completeSignIn,
  signOut() { core.signOut(); budget.resetSpend(); },

  // --- model preference (the picker writes here) ---
  get model() { return get(MODEL_KEY) || "openai/gpt-oss-20b:free"; },
  set model(id) { set(MODEL_KEY, id); },
  listModels,

  // --- provider (rug-pull proof: switch wire in one call) ---
  get provider() { return provider; },
  configure(patch = {}) {
    configureProvider(patch);
    if (patch.apiKey) core.setApiKey(patch.apiKey);
    return provider;
  },

  // --- fallbacks (zero-infra failover via provider routing) ---
  get fallbacks() {
    try { return JSON.parse(get(FALLBACKS_KEY) || "[]"); } catch { return []; }
  },
  set fallbacks(arr) {
    if (Array.isArray(arr) && arr.length) set(FALLBACKS_KEY, JSON.stringify(arr));
    else del(FALLBACKS_KEY);
  },

  // --- budget ---
  get budget() { return budget.getBudget(); },
  setBudget: budget.setBudget,
  get spend() { return budget.getSpend(); },
  remaining: budget.remaining,

  /** Track spend from a completion result. No-op if no cost reported. */
  _track(usage) { if (usage?.cost) budget.addSpend(usage.cost); if (budget.exhausted()) console.warn(`loginwith-openrouter: budget reached ($${budget.getSpend()} / $${budget.getBudget()}).`); },
  _guard() { if (budget.exhausted()) throw new Error(`Budget reached: $${budget.getSpend()} of $${budget.getBudget()}. Raise the cap or revoke the key on openrouter.ai.`); },

  /** Full completion result (content + tool_calls + usage + raw). */
  async complete(messages, opts = {}) {
    this._guard();
    const res = await core.complete(messages, withFallbacks({ ...opts, model: opts.model || this.model }));
    this._track(res.usage);
    return res;
  },

  /** One prompt -> one string. Supports images, tools, response_format, … */
  async ask(prompt, opts = {}) {
    const { content } = await this.complete(buildMessages(prompt, opts), opts);
    return content;
  },

  /**
   * Stream a completion. Async generator of events:
   *   { type:"delta", content, full }
   *   { type:"reasoning", reasoning }
   *   { type:"tool_calls", tool_calls }
   *   { type:"done", content, tool_calls, usage, model }
   * Pass opts.signal (AbortSignal) to cancel.
   */
  async *stream(prompt, opts = {}) {
    this._guard();
    const messages = buildMessages(prompt, opts);
    for await (const ev of core.stream(messages, withFallbacks({ ...opts, model: opts.model || this.model }))) {
      if (ev.type === "done") this._track(ev.usage);
      yield ev;
    }
  },

  /**
   * Structured output via JSON Schema. Returns a parsed object.
   * @param {string} prompt
   * @param {{name?:string, schema:object}} schemaDef  JSON Schema
   */
  async json(prompt, schemaDef, opts = {}) {
    const text = await this.ask(prompt, {
      ...opts,
      response_format: {
        type: "json_schema",
        json_schema: { name: schemaDef.name || "response", strict: true, schema: schemaDef.schema },
      },
    });
    return JSON.parse(text);
  },

  /**
   * Run an agent loop with tools. Each tool: { type:"function", function:{ name, description, parameters, handler } }.
   * `handler(args)` is called when the model invokes the tool; return a value or string.
   * Stops when the model replies without tool_calls, or after maxSteps.
   * @returns {Promise<{content:string, steps:array}>}
   */
  async agent(prompt, opts = {}) {
    const tools = opts.tools || [];
    const maxSteps = opts.maxSteps ?? 5;
    const messages = buildMessages(prompt, opts);
    const steps = [];

    for (let step = 0; step < maxSteps; step++) {
      this._guard();
      const res = await core.complete(messages, withFallbacks({
        ...opts,
        model: opts.model || this.model,
        tools: tools.map(({ function: { handler, ...fn } }) => ({ type: "function", function: fn })),
        tool_choice: opts.tool_choice ?? (tools.length ? "auto" : undefined),
      }));
      this._track(res.usage);
      steps.push(res);

      if (!res.tool_calls?.length) return { content: res.content, steps };

      // echo the assistant's tool-call message back, then each tool result
      messages.push({ role: "assistant", content: res.content || "", tool_calls: res.tool_calls });
      for (const tc of res.tool_calls) {
        const def = tools.find((t) => t.function.name === tc.function.name);
        let out;
        try {
          const args = JSON.parse(tc.function.arguments || "{}");
          out = def?.function?.handler ? await def.function.handler(args) : "no handler";
        } catch (e) { out = "error: " + e.message; }
        messages.push({ role: "tool", tool_call_id: tc.id, content: typeof out === "string" ? out : JSON.stringify(out) });
      }
    }
    return { content: steps[steps.length - 1]?.content ?? "", steps };
  },
};