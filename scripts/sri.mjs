// Emit a Subresource-Integrity-pinned install snippet for the drop-in button.
// Pins the EXACT bytes shipped on the CDN, so a tampered CDN can't swap
// "no-backend" for "phones-home" without breaking the hash.
//
//   npm run sri
//
// Why jsdelivr/unpkg (not esm.sh): they serve the npm tarball verbatim, so the
// SRI hash matches the file you audited in the repo. esm.sh rewrites modules,
// which breaks byte-for-byte pinning.

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
const file = "src/button.js";
const bytes = readFileSync(new URL("../" + file, import.meta.url));
const hash = createHash("sha384").update(bytes).digest("base64");
const url = `https://cdn.jsdelivr.net/npm/${pkg.name}@${pkg.version}/${file}`;

console.log(`# ${pkg.name}@${pkg.version} — SRI-pinned drop-in\n`);
console.log(`<script type="module" integrity="sha384-${hash}" crossorigin
  src="${url}"></script>`);
console.log(`\n# verify: grep "fetch(" ${file} → only openrouter.ai`);