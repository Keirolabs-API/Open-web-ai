// Embeddings on the user's key. Calls the provider's embeddings endpoint
// (derived from chatURL). Same OpenAI-compatible shape OpenRouter / OpenAI / Ollama use.
//
//   embed("hello")            → number[]
//   embed(["a","b"], {model}) → number[][]

import { config } from "./provider.js";
import { getApiKey } from "./auth.js";

const embedURL = () => config.chatURL.replace("/chat/completions", "/embeddings");

export async function embed(input, { model = "openai/text-embedding-3-small" } = {}) {
  const key = getApiKey();
  if (!key) throw new Error("Not signed in (no key).");
  const inputs = Array.isArray(input) ? input : [input];

  const res = await fetch(embedURL(), {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model, input: inputs }),
  });
  if (!res.ok) throw new Error(`${config.name} embeddings ${res.status}: ${await res.text()}`);

  const data = await res.json();
  const vecs = (data.data || []).map((d) => d.embedding);
  return Array.isArray(input) ? vecs : vecs[0];
}