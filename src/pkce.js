// Pure PKCE (RFC 7636) helpers — no DOM, runs in Node and browser.
// Isolated from index.js so the crypto path is unit-testable without a browser.

const crypto = globalThis.crypto;

// base64url encode a Uint8Array, no padding (RFC 4648 sec 5)
export function base64url(bytes) {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// 43+ char random string. 32 random bytes -> base64url (~43 chars).
export function createVerifier() {
  return base64url(crypto.getRandomValues(new Uint8Array(32)));
}

// S256 challenge: base64url(SHA-256(ASCII(verifier)))
export async function challengeFromVerifier(verifier) {
  const data = new TextEncoder().encode(verifier);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return base64url(new Uint8Array(digest));
}

// ponytail: RFC 7636 Appendix B reference vector — proves the math.
export async function selfCheck() {
  const v = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk";
  const want = "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM";
  const got = await challengeFromVerifier(v);
  if (got !== want) throw new Error(`PKCE self-check failed: ${got}`);
  return true;
}