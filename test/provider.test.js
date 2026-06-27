import { test } from "node:test";
import assert from "node:assert/strict";
import { config, configure, reset } from "../src/provider.js";

test("defaults to OpenRouter OAuth", () => {
  reset();
  assert.equal(config.name, "openrouter");
  assert.equal(config.oauth, true);
  assert.match(config.chatURL, /openrouter\.ai/);
});

test("switches to OpenAI-compatible endpoint", () => {
  configure({ provider: "openai-compatible", baseURL: "https://api.openai.com/" });
  assert.equal(config.oauth, false);
  assert.equal(config.chatURL, "https://api.openai.com/v1/chat/completions");
  assert.equal(config.modelsURL, "https://api.openai.com/v1/models");
});

test("switches to local Ollama", () => {
  configure({ provider: "ollama", baseURL: "http://localhost:11434" });
  assert.equal(config.chatURL, "http://localhost:11434/v1/chat/completions");
  assert.equal(config.oauth, false);
});

test("reset returns to OpenRouter", () => {
  configure({ provider: "ollama", baseURL: "http://localhost:11434" });
  reset();
  assert.equal(config.name, "openrouter");
  assert.equal(config.oauth, true);
});