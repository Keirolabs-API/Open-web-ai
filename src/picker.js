// <openrouter-model-picker> — a proper, searchable model selector.
// Filterable, grouped by provider, with free/vision/tools/reasoning badges and
// pricing. Works before sign-in (the /models endpoint is public). Selecting a
// model persists it via ai.model and emits a `model` event.
//
//   <openrouter-model-picker></openrouter-model-picker>
//   <openrouter-model-picker free-only></openrouter-model-picker>   // free models only
//
//   picker.addEventListener("model", e => console.log(e.detail.id));

import { ai } from "./ai.js";
import { listModels } from "./models.js";

const NAME = "openrouter-model-picker";

const STYLE = `
  :host { display:block; --bg:#0d1117; --fg:#e6edf3; --line:#30363d; --muted:#8b949e; --acc:#7c3aed; font:13px/1.4 ui-sans-serif,system-ui,sans-serif; max-width:100%; }
  * { box-sizing:border-box; }
  .search { display:flex; align-items:center; gap:6px; background:#161b22; border:1px solid var(--line); border-radius:8px; padding:6px 8px; }
  .search input { flex:1; background:transparent; border:0; color:var(--fg); outline:none; font:inherit; }
  .search .count { color:var(--muted); font-size:11px; font-family:ui-monospace,monospace; white-space:nowrap; }
  .list { margin-top:8px; max-height:320px; overflow:auto; border:1px solid var(--line); border-radius:8px; background:#0d1117; }
  .group { position:sticky; top:0; background:#161b22; color:var(--muted); font-size:11px; text-transform:uppercase; letter-spacing:.04em; padding:4px 10px; border-bottom:1px solid var(--line); }
  .row { display:flex; align-items:center; gap:8px; padding:8px 10px; cursor:pointer; border-bottom:1px solid #1b2129; }
  .row:hover { background:#161b22; }
  .row.sel { background:rgba(124,58,237,.18); }
  .name { flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .id { color:var(--muted); font-size:11px; font-family:ui-monospace,monospace; }
  .badge { font-size:10px; padding:1px 6px; border-radius:99px; border:1px solid var(--line); color:var(--muted); white-space:nowrap; }
  .badge.free { color:#3fb950; border-color:#2ea043; }
  .badge.vision { color:#06b6d4; border-color:#0e7490; }
  .badge.tools { color:#d29922; border-color:#9e6a03; }
  .badge.reason { color:#a371f7; border-color:#6e40c9; }
  .price { color:var(--muted); font-size:10px; font-family:ui-monospace,monospace; white-space:nowrap; }
  .empty { padding:16px; color:var(--muted); text-align:center; }
  .err { padding:10px; color:#f85149; font-size:12px; }
`;

if (!customElements.get(NAME)) customElements.define(NAME, class extends HTMLElement {
  static get observedAttributes() { return ["value", "free-only"]; }

  constructor() {
    super();
    this._models = [];
    this._q = "";
    this._err = null;
    this.attachShadow({ mode: "open" });
  }

  attributeChangedCallback(name, _old, val) {
    if (name === "value") { /* host-controlled selection */ }
    this.render();
  }

  async connectedCallback() {
    this.render();
    try {
      this._models = await listModels({ free: this.hasAttribute("free-only") });
      this.render();
    } catch (e) {
      this._err = e.message;
      this.render();
    }
  }

  get value() { return ai.model; }
  set value(id) { ai.model = id; this.render(); this._emit(id); }

  _emit(id) { this.dispatchEvent(new CustomEvent("model", { bubbles: true, composed: true, detail: { id } })); }

  _filtered() {
    const q = this._q.trim().toLowerCase();
    let list = this._models;
    if (q) list = list.filter((m) => (m.id + " " + m.name + " " + m.provider).toLowerCase().includes(q));
    return list;
  }

  _pick(id) { this.value = id; }

  render() {
    const s = this.shadowRoot;
    const sel = ai.model;
    const list = this._filtered();
    const groups = {};
    for (const m of list) (groups[m.provider] ||= []).push(m);
    const providerOrder = Object.keys(groups).sort();

    s.innerHTML = `
      <style>${STYLE}</style>
      <div class="search">
        <input type="search" placeholder="Search models…" part="search" value="${this._q.replace(/"/g, "&quot;")}">
        <span class="count">${list.length}</span>
      </div>
      ${this._err ? `<div class="err">${this._err}</div>` : ""}
      ${list.length === 0 && !this._err ? `<div class="empty">No models match.</div>` : ""}
      <div class="list">
        ${providerOrder.map((p) => `
          <div class="group">${p}</div>
          ${groups[p].map((m) => `
            <div class="row ${m.id === sel ? "sel" : ""}" data-id="${m.id}">
              <span class="name" title="${m.id}">${m.name || m.id.split("/").slice(1).join("/")}</span>
              ${m.free ? `<span class="badge free">free</span>` : ""}
              ${m.vision ? `<span class="badge vision" title="vision">vision</span>` : ""}
              ${m.tools ? `<span class="badge tools" title="tool use">tools</span>` : ""}
              ${m.reasoning ? `<span class="badge reason" title="reasoning">reason</span>` : ""}
              <span class="price">${m.free ? "" : "$" + m.promptPrice.toFixed(2) + "/M"}</span>
            </div>
          `).join("")}
        `).join("")}
      </div>`;

    s.querySelector("input")?.addEventListener("input", (e) => {
      this._q = e.target.value;
      this.render();
      s.querySelector("input")?.focus();
    });
    s.querySelectorAll(".row").forEach((row) =>
      row.addEventListener("click", () => this._pick(row.dataset.id))
    );
  }
});