// The retrieval framework.
//
// Three pluggable pieces, each with built-in types:
//   • Retriever  — given a query, returns chunks.       (static, fn, http, vector, hybrid)
//   • Reranker   — re-scores/prunes retrieved chunks.    (identity, score, llm)
//   • rag()      — the bridge: retrieve → rerank → generate
//
// A Chunk is { text, source?, score?, meta? }. A Retriever is any object with
// `async retrieve(query, opts) => Chunk[]` — or a plain function, which we wrap.
// Everything here is pure and stubbable, so the framework is unit-tested without
// a network, a key, or a browser.

// ---------- helpers ----------
function norm(c) {
  return typeof c === "string" ? { text: c } : { text: c.text, source: c.source, score: c.score, meta: c.meta };
}
function cosine(a, b) {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
  return na && nb ? dot / (Math.sqrt(na) * Math.sqrt(nb)) : 0;
}
function defaultContext(chunks) {
  if (!chunks.length) return "No relevant context was found. Answer from general knowledge and say so.";
  return "Answer using only the following context. If the answer isn't in it, say so.\n\n" +
    chunks.map((c, i) => `[${i + 1}]${c.source ? " (" + c.source + ")" : ""} ${c.text}`).join("\n\n");
}
function defaultRerankPrompt(query, chunks) {
  return "Given a query and chunks, return a JSON array of the 0-based indices of the most " +
    "relevant chunks, most relevant first. Nothing else.\nQuery: " + query + "\nChunks:\n" +
    chunks.map((c, i) => `${i}: ${c.text.slice(0, 240)}`).join("\n") + "\nJSON:";
}
const asRetriever = (r) => (typeof r === "function" ? { retrieve: r } : r);

// ---------- Retriever types ----------
export const retrievers = {
  // a plain function (query, opts) => Chunk[]
  fn(f) { return { retrieve: (q, o) => f(q, o) }; },

  // fixed set of chunks (tests / tiny corpora)
  static(docs) { const chunks = docs.map(norm); return { retrieve: async () => chunks }; },

  // call an HTTP endpoint; map the response to chunks
  http({ url, method = "POST", queryField = "query", headers = {}, body, map }) {
    return {
      retrieve: async (query, opts = {}) => {
        const payload = body ? body(query, opts) : { [queryField]: query, ...(opts.filter || {}) };
        const res = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json", ...headers },
          body: method === "GET" ? undefined : JSON.stringify(payload),
        });
        if (!res.ok) throw new Error(`retriever http ${res.status}`);
        const data = await res.json();
        return (map ? map(data, query) : data.chunks || data).map(norm);
      },
    };
  },

  // client-side vector search over a doc set + an embed function (e.g. ai.embed)
  async vector({ embed, docs, model }) {
    const items = [];
    for (const d of docs) {
      const text = typeof d === "string" ? d : d.text;
      const vec = await embed(text, { model });
      items.push({ text, vector: vec, source: typeof d === "object" ? d.id : null, meta: typeof d === "object" ? d.meta : null });
    }
    return {
      retrieve: async (query, opts = {}) => {
        const qv = await embed(query, { model });
        const k = opts.k ?? 4;
        return items
          .map((it) => ({ text: it.text, source: it.source, meta: it.meta, score: cosine(qv, it.vector) }))
          .sort((a, b) => b.score - a.score)
          .slice(0, k);
      },
    };
  },

  // combine several retrievers; merge + dedup by text (best score wins), then re-sort
  hybrid(parts, { dedup = true } = {}) {
    return {
      retrieve: async (query, opts = {}) => {
        const all = (await Promise.all(parts.map((p) => asRetriever(p).retrieve(query, opts)))).flat();
        if (!dedup) return all.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
        const seen = new Map();
        for (const c of all) { const key = c.text; if (!seen.has(key) || (seen.get(key).score ?? -1) < (c.score ?? -1)) seen.set(key, c); }
        return [...seen.values()].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
      },
    };
  },
};

// ---------- Rerankers ----------
export const rerankers = {
  identity() { return { rerank: async (_q, chunks) => chunks }; },

  // score each chunk with (query, chunk) => 0..1, then re-sort
  score(scorer) {
    return {
      rerank: async (query, chunks) => {
        const out = await Promise.all(chunks.map(async (c) => ({ ...c, score: await scorer(query, c) })));
        return out.sort((a, b) => b.score - a.score);
      },
    };
  },

  // ask an LLM (generate) which chunk indices are most relevant; keep top `keep`
  llm({ generate, prompt = defaultRerankPrompt, keep = 4 }) {
    return {
      rerank: async (query, chunks) => {
        const txt = await generate(prompt(query, chunks), {});
        let idxs;
        try { idxs = JSON.parse(txt); } catch { idxs = chunks.slice(0, keep).map((_, i) => i); }
        return idxs.slice(0, keep).map((i) => chunks[i]).filter(Boolean);
      },
    };
  },
};

// ---------- the bridge ----------
/**
 * rag() — retrieve relevant chunks, (optionally) rerank, then generate grounded in them.
 * @param {string} query
 * @param {{ retrieve, rerank?, generate, k?, system?, buildContext? }} opts
 *   retrieve  — Retriever or function (query, opts) => Chunk[]
 *   generate  — (prompt, opts) => Promise<string>  (the LLM call; ai.rag binds ai.ask)
 * @returns {Promise<string>} the generated answer
 */
export async function rag(query, { retrieve, rerank, generate, k = 4, system, buildContext = defaultContext } = {}) {
  if (!retrieve) throw new Error("rag: `retrieve` is required");
  if (!generate) throw new Error("rag: `generate` is required");

  let chunks = await asRetriever(retrieve).retrieve(query, { k });
  if (rerank) chunks = await rerank.rerank(query, chunks);
  chunks = chunks.slice(0, k);

  const ctx = buildContext(chunks);
  const sys = (system ? system + "\n\n" : "") + ctx;
  return generate(query, { system: sys });
}

export { cosine };   // exported for testing / custom retrievers