// Drop-in button: <login-with-openrouter></login-with-openrouter>
// One tag → sign-in button, model/provider picker, budget cap, live spend.
// Framework-agnostic. Shares state with the `ai` object, so dev code and the
// button stay in sync.

import { ai } from "./ai.js";
import { listModels } from "./models.js";
import "./picker.js";   // registers <openrouter-model-picker>, used below

// Declared ABOVE customElements.define: the browser upgrades any
// <login-with-openrouter> already in the DOM synchronously during define(),
// which fires connectedCallback -> render() -> references STYLE. A const
// declared below define() would still be in the temporal dead zone then.
const STYLE = `
  :host { display:block; --bg:#0d1117; --fg:#e6edf3; --acc:#7c3aed; --muted:#8b949e; font:13px/1.4 ui-sans-serif,system-ui,sans-serif; }
  .wrap { display:flex; flex-direction:column; gap:10px; max-width:320px; }
  button { cursor:pointer; border:0; border-radius:8px; padding:10px 14px; font-weight:600; }
  button.primary { background:var(--acc); color:#fff; }
  button.ghost { background:transparent; color:var(--fg); border:1px solid #30363d; }
  .ok { color:#3fb950; }
  label { display:flex; flex-direction:column; gap:4px; color:var(--muted); font-size:12px; }
  select, input { background:#161b22; color:var(--fg); border:1px solid #30363d; border-radius:6px; padding:7px 8px; color:var(--fg); }
  .spend { color:var(--muted); font-family:ui-monospace,monospace; font-size:12px; }
  .err { color:#f85149; font-size:12px; }
`;

const NAME = "login-with-openrouter";
if (!customElements.get(NAME)) customElements.define(NAME, class extends HTMLElement {
  static get observedAttributes() { return ["app-name", "default-model"]; }

  constructor() {
    super();
    this._appName = "My App";
    this._defaultModel = "openai/gpt-oss-20b:free";
    this.attachShadow({ mode: "open" });
  }

  attributeChangedCallback(name, _old, val) {
    if (name === "app-name" && val) this._appName = val;
    if (name === "default-model" && val) this._defaultModel = val;
  }

  async connectedCallback() {
    this.render();
    // complete the OAuth round-trip if we landed back with ?code=
    const wasSigned = ai.isSignedIn;
    await ai.completeSignIn().catch((e) => this._err = e.message);
    if (ai.isSignedIn && !ai.model) ai.model = this._defaultModel;
    this.render();
    // fire signed-in if the round-trip just logged us in
    if (!wasSigned && ai.isSignedIn) this._emit("signed-in");
  }

  _emit(name) { this.dispatchEvent(new CustomEvent(name, { bubbles: true, composed: true })); }

  /** Re-render (e.g. after ai.ask updates spend). Safe to call anytime. */
  refresh() { this.render(); }

  // --- handlers ---
  _onSignIn = () => ai.signIn({ callbackUrl: location.href, appName: this._appName });
  _onSignOut = () => { ai.signOut(); this.render(); this._emit("signed-out"); };
  _onBudget = (e) => {
    const v = e.target.value;
    ai.setBudget(v === "" ? null : parseFloat(v));
    this.render();
  };

  // --- render ---
  render() {
    const s = this.shadowRoot;
    const signed = ai.isSignedIn;
    const spend = ai.spend.toFixed(4).replace(/\.?0+$/, "");
    const budget = ai.budget;
    const budgetLabel = budget == null ? "no cap" : `$${budget}`;

    s.innerHTML = `
      <style>${STYLE}</style>
      <div class="wrap">
        ${signed ? `
          <div class="ok">✓ signed in</div>
          <openrouter-model-picker part="model"></openrouter-model-picker>
          <label>Spending cap ($)
            <input part="budget" type="number" min="0" step="0.10" placeholder="no cap"
                   value="${budget == null ? "" : budget}">
          </label>
          <div class="spend">spent $${spend} / ${budgetLabel}</div>
          <button class="ghost" part="signout">Sign out</button>
        ` : `
          <button class="primary" part="signin">Sign in with OpenRouter</button>
        `}
        ${this._err ? `<div class="err">${this._err}</div>` : ""}
      </div>`;

    s.querySelector(".primary")?.addEventListener("click", this._onSignIn);
    s.querySelector(".ghost")?.addEventListener("click", this._onSignOut);
    s.querySelector('input[type=number]')?.addEventListener("change", this._onBudget);
  }
});