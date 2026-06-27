// Spend + budget guard.
//
// ponytail: client-side cap is a GUARD RAIL, not a hard billing limit. The
// real ceiling is the credit limit the user sets on their key in the OpenRouter
// dashboard. This caps what THIS app will spend while the user is in it; a key
// shared across apps is tracked separately in each. Upgrade to server-side
// metering for a true hard cap.

const SPEND_KEY = "loginwith_openrouter_spend";
const BUDGET_KEY = "loginwith_openrouter_budget";

const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch {} },
  del(k) { try { localStorage.removeItem(k); } catch {} },
};

const round = (n) => Math.round((n || 0) * 1e6) / 1e6;

// --- pure decision logic (unit-tested) ---
export function remainingOf(spent, budget) {
  if (budget == null) return Infinity;
  return Math.max(0, budget - spent);
}
export function wouldExceed(spent, budget, next = 0) {
  if (budget == null) return false;
  return spent + next >= budget; // >= : block a call that would hit the cap
}

// --- localStorage-backed state ---
export function getSpend() { return parseFloat(store.get(SPEND_KEY) || "0") || 0; }
export function addSpend(usd) { const s = round(getSpend() + (usd || 0)); store.set(SPEND_KEY, String(s)); return s; }
export function resetSpend() { store.del(SPEND_KEY); }

export function getBudget() {
  const v = store.get(BUDGET_KEY);
  if (v == null || v === "") return null;
  const n = parseFloat(v);
  return isNaN(n) || n < 0 ? null : n;
}
export function setBudget(usd) {
  if (usd == null || usd === "" || isNaN(usd) || usd < 0) { store.del(BUDGET_KEY); return null; }
  const n = round(usd); store.set(BUDGET_KEY, String(n)); return n;
}
export function remaining() { return remainingOf(getSpend(), getBudget()); }
export function exhausted() { const b = getBudget(); return b != null && getSpend() >= b; }