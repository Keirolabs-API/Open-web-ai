// Model list. The /models endpoint is PUBLIC (no key) on OpenRouter — safe to
// fetch before sign-in so the picker can populate before the user authenticates.

import { config } from "./provider.js";

let cache = null;

/**
 * List available models. No auth needed on OpenRouter.
 * @param {{ free?: boolean }} [opts]  free=true → only zero-cost models
 * @returns {Promise<Array<{id,provider,name,contextLength,promptPrice,completionPrice,free}>>}
 */
export async function listModels({ free = false } = {}) {
  if (!cache) {
    const r = await fetch(config.modelsURL);
    if (!r.ok) throw new Error(`models ${r.status}`);
    cache = await r.json();
  }
  // OpenRouter: { data:[...] }. OpenAI/Ollama: { data:[...] } or { models:[...] }.
  const all = cache.data || cache.models || cache;
  return all
    .filter((m) => (free ? isFree(m) : true))
    .map((m) => ({
      id: m.id,
      provider: m.id.split("/")[0],
      name: m.name,
      contextLength: m.context_length,
      promptPrice: +(m.pricing?.prompt || 0) * 1e6,        // $/1M input tokens
      completionPrice: +(m.pricing?.completion || 0) * 1e6, // $/1M output tokens
      free: isFree(m),
    }))
    .sort((a, b) => a.provider.localeCompare(b.provider) || a.name.localeCompare(b.name));
}

function isFree(m) {
  return m.id.endsWith(":free") || (+m.pricing?.prompt === 0 && +m.pricing?.completion === 0);
}