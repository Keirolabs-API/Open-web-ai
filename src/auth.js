// Auth: OAuth PKCE sign-in + key storage.
//
// The user authenticates ON openrouter.ai (we never see their password),
// comes back with a code, we exchange it for a scoped API key, and store it
// in localStorage. For non-OAuth providers (OpenAI-compatible / Ollama) the key
// is set directly via setApiKey().
//
// This file sends the key to NO-ONE — it only stores it. complete()/stream()
// in chat.js are the only places the key is sent (to provider.chatURL).

import { createVerifier, challengeFromVerifier } from "./pkce.js";
import { config } from "./provider.js";

export const STORE_KEY = "loginwith_openrouter_key";

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