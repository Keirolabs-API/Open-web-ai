// Pure Server-Sent-Events parser. Feed it string chunks from a ReadableStream,
// get back complete `data:` events. Isolated so it's unit-testable without a
// network, and reusable if we add other streaming endpoints.
//
// SSE framing: events separated by a blank line (\n\n). Within an event,
// `data:` lines accumulate. OpenRouter sends `data: {json}` then `data: [DONE]`.

export class SSEParser {
  constructor() { this._buf = ""; }

  /** Push a decoded chunk; returns an array of parsed event objects. */
  push(chunk) {
    this._buf += chunk;
    const events = [];
    let i;
    // handle \n\n and \r\n\r\n
    while ((i = this._findBlankLine()) !== -1) {
      const raw = this._buf.slice(0, i);
      // skip the separator (2 for \n\n, 4 for \r\n\r\n)
      const sep = this._buf[i] === "\r" ? 4 : 2;
      this._buf = this._buf.slice(i + sep);
      const data = raw
        .split("\n")
        .map((l) => l.replace(/\r$/, ""))
        .filter((l) => l.startsWith("data:"))
        .map((l) => l.slice(5).replace(/^ /, ""))
        .join("\n");
      if (data === "[DONE]") { events.push({ done: true }); continue; }
      if (!data) continue;
      try { events.push(JSON.parse(data)); } catch { /* malformed line — skip */ }
    }
    return events;
  }

  _findBlankLine() {
    const a = this._buf.indexOf("\n\n");
    const b = this._buf.indexOf("\r\n\r\n");
    if (a === -1) return b;
    if (b === -1) return a;
    return Math.min(a, b);
  }
}