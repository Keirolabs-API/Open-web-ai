import { test } from "node:test";
import assert from "node:assert/strict";
import { challengeFromVerifier, selfCheck } from "../src/pkce.js";

test("S256 matches RFC 7636 Appendix B reference vector", async () => {
  const v = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk";
  const want = "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM";
  assert.equal(await challengeFromVerifier(v), want);
});

test("selfCheck passes", async () => {
  assert.equal(await selfCheck(), true);
});