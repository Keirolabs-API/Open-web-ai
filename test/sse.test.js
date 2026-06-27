import { test } from "node:test";
import assert from "node:assert/strict";
import { SSEParser } from "../src/sse.js";

test("parses a complete event", () => {
  const p = new SSEParser();
  const ev = p.push('data: {"choices":[{"delta":{"content":"hi"}}]}\n\n');
  assert.equal(ev.length, 1);
  assert.equal(ev[0].choices[0].delta.content, "hi");
});

test("buffers a partial event across chunks", () => {
  const p = new SSEParser();
  assert.equal(p.push('data: {"a":1').length, 0);     // no terminator yet
  assert.equal(p.push('}\n\n')[0].a, 1);                // completed
});

test("detects [DONE]", () => {
  const p = new SSEParser();
  const ev = p.push('data: {"x":1}\n\ndata: [DONE]\n\n');
  assert.equal(ev.length, 2);
  assert.equal(ev[0].x, 1);
  assert.equal(ev[1].done, true);
});

test("\\r\\n framing with JSON event", () => {
  const p = new SSEParser();
  const ev = p.push('data: {"ok":true}\r\n\r\n');
  assert.equal(ev.length, 1);
  assert.equal(ev[0].ok, true);
});

test("non-JSON data lines are dropped (OpenRouter only sends JSON + [DONE])", () => {
  const p = new SSEParser();
  assert.equal(p.push("data: not-json\n\n").length, 0);
});