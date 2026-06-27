import { test } from "node:test";
import assert from "node:assert/strict";
import { retrievers, rerankers, rag, cosine } from "../src/retrieval.js";

test("cosine: identical → 1, orthogonal → 0", () => {
  assert.equal(cosine([1, 0], [1, 0]), 1);
  assert.equal(cosine([1, 0], [0, 1]), 0);
});

test("static retriever returns its chunks", async () => {
  const r = retrievers.static([{ text: "a" }, { text: "b" }]);
  const out = await r.retrieve("anything");
  assert.equal(out.length, 2);
  assert.equal(out[0].text, "a");
});

test("fn retriever wraps a function", async () => {
  const r = retrievers.fn(async (q) => [{ text: "got:" + q }]);
  const out = await r.retrieve("hi");
  assert.equal(out[0].text, "got:hi");
});

test("hybrid merges + dedups by text, keeping best score", async () => {
  const a = retrievers.static([{ text: "same", score: 0.5 }, { text: "only-a" }]);
  const b = retrievers.static([{ text: "same", score: 0.9 }, { text: "only-b" }]);
  const h = retrievers.hybrid([a, b]);
  const out = await h.retrieve("q");
  const same = out.find((c) => c.text === "same");
  assert.equal(same.score, 0.9);            // best score kept
  assert.equal(out.length, 3);             // deduped
});

test("rerankers.identity is a passthrough", async () => {
  const chunks = [{ text: "x", score: 1 }];
  assert.deepEqual(await rerankers.identity().rerank("q", chunks), chunks);
});

test("rerankers.score re-sorts by scorer", async () => {
  const r = rerankers.score(async (_q, c) => (c.text === "b" ? 0.99 : 0.1));
  const out = await r.rerank("q", [{ text: "a", score: 0.9 }, { text: "b", score: 0.2 }]);
  assert.equal(out[0].text, "b");          // 'b' now first
});

test("rag: retrieve → generate, context includes chunk text", async () => {
  const seen = {};
  const generate = async (query, opts) => { seen.query = query; seen.system = opts.system; return "ANSWER"; };
  const ans = await rag("what is x?", {
    retrieve: retrievers.static([{ text: "X is a thing", source: "doc1" }]),
    generate,
  });
  assert.equal(ans, "ANSWER");
  assert.equal(seen.query, "what is x?");
  assert.match(seen.system, /X is a thing/);
  assert.match(seen.system, /\(doc1\)/);   // source surfaced in context
});

test("rag accepts a function as retrieve", async () => {
  const ans = await rag("q", { retrieve: async () => [{ text: "c1" }], generate: async () => "ok" });
  assert.equal(ans, "ok");
});

test("rag rerank prunes to top k", async () => {
  const calls = [];
  const generate = async (_q, o) => { calls.push(o.system); return "a"; };
  await rag("q", {
    retrieve: retrievers.static(Array.from({ length: 10 }, (_, i) => ({ text: "c" + i }))),
    rerank: rerankers.identity(),
    k: 3,
    generate,
  });
  // context should contain only 3 numbered chunks
  const n = (calls[0].match(/^\[(\d+)\]/gm) || []).length;
  assert.equal(n, 3);
});

test("rag throws without retrieve or generate", async () => {
  await assert.rejects(() => rag("q", { generate: async () => "x" }), /retrieve/);
  await assert.rejects(() => rag("q", { retrieve: async () => [] }), /generate/);
});