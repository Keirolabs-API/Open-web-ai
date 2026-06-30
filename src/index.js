// loginwith-openrouter — public barrel.
//
// Nothing lives here. This file just re-exports the package surface so consumers
// can `import { ai, complete, signIn, retrievers, … } from "loginwith-openrouter"`.
// The actual code is split by concern:
//   auth.js       — OAuth PKCE + key storage
//   chat.js       — complete / stream / ask (the only place the key is sent)
//   ai.js         — the high-level `ai` surface
//   retrieval.js  — RAG framework (retrievers / rerankers / rag)
//   embed.js      — embeddings on the user's key
//   models.js     — model catalog
//   provider.js   — provider config + configure()
//   pkce.js / sse.js / budget.js — primitives
//   button.js / picker.js / react.js — UI bindings
//
// Trust contract: the key is sent to exactly provider.chatURL (see chat.js).
// There is no other outbound call in the package.

export { signIn, completeSignIn, isSignedIn, getApiKey, setApiKey, signOut } from "./auth.js";
export { complete, stream, ask } from "./chat.js";
export { ai } from "./ai.js";
export { listModels } from "./models.js";
export { configure, config as provider } from "./provider.js";
export { embed } from "./embed.js";
export { retrievers, rerankers, rag } from "./retrieval.js";
export { SSEParser } from "./sse.js";