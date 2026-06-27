// Provider abstraction. Defaults to OpenRouter (OAuth PKCE). configure() switches
// to any OpenAI-compatible endpoint — including a local Ollama running its
// OpenAI-compat server — so the platform's AI isn't locked to one provider.
//
// The wire is replaceable: this is the rug-pull-proof layer. If OpenRouter
// ever ships a hostile change, you point at another endpoint in one call.
// No imports here — pure config, unit-testable without a browser.

const OPENROUTER = Object.freeze({
  name: "openrouter",
  authURL: "https://openrouter.ai/auth",
  keyURL: "https://openrouter.ai/api/v1/auth/keys",
  chatURL: "https://openrouter.ai/api/v1/chat/completions",
  modelsURL: "https://openrouter.ai/api/v1/models",
  oauth: true,
});

export const config = { ...OPENROUTER };

/**
 * Switch provider.
 *   configure()                                    → OpenRouter (OAuth, default)
 *   configure({ provider: "openai-compatible", baseURL, apiKey })
 *   configure({ provider: "ollama", baseURL: "http://localhost:11434" })  // local, no key
 * Any OpenAI-compatible endpoint works: the chat request/response shape is shared.
 * Returns the active config. Set the key separately via ai.setApiKey() (or pass apiKey).
 */
export function configure(patch = {}) {
  const base = (patch.baseURL || "").replace(/\/+$/, "");
  const wantCustom = patch.provider === "openai-compatible" || patch.provider === "ollama" || (base && patch.provider !== "openrouter");

  if (!wantCustom) {
    Object.assign(config, OPENROUTER, { name: "openrouter" });
  } else {
    config.name = patch.provider || "custom";
    config.chatURL = base + "/v1/chat/completions";
    config.modelsURL = base + "/v1/models";
    config.oauth = false;
    config.authURL = null;
    config.keyURL = null;
  }
  return config;
}

export function reset() { Object.assign(config, OPENROUTER); }