# API reference

All exports come from the package root unless a subpath is given.

## The `ai` object

The high-level surface. One import, everything wired.

```js
import { ai } from "loginwith-openrouter";
```

| member | signature | description |
|---|---|---|
| `isSignedIn` | `boolean` | Is a key present? (Does not validate it.) |
| `signIn(opts?)` | `(opts?) => Promise<void>` | Start OAuth (OAuth providers only). Redirects to the provider. |
| `completeSignIn()` | `() => Promise<string\|null>` | On return, exchange `?code=` for a key. Call once on load. No-op for non-OAuth providers. |
| `signOut()` | `() => void` | Forget the key locally + reset spend. |
| `model` | `string` (get/set) | Selected model id. Persisted; the picker writes here. |
| `listModels(opts?)` | `({free?}) => Promise<ModelInfo[]>` | Fetch the model catalog (public on OpenRouter — no key needed). |
| `budget` | `number\|null` (get) | Current cap in USD, or `null` for none. |
| `setBudget(usd)` | `(n\|null) => number\|null` | Set/clear the cap. |
| `spend` | `number` (readonly) | USD spent so far in this app (from `usage.cost`). |
| `remaining()` | `() => number` | Budget minus spend; `Infinity` if no cap. |
| `provider` | `ProviderConfig` (readonly) | Active provider config. |
| `configure(patch)` | `(patch) => ProviderConfig` | Switch provider. See [Providers](providers.md). |
| `fallbacks` | `string[]` (get/set) | Failover model list, injected into `route.fallbacks`. |
| `complete(msgs, opts?)` | `(msgs, opts?) => Promise<CompleteResult>` | Full result (content + tool_calls + usage + raw). Budget-guarded. |
| `ask(prompt, opts?)` | `(prompt, opts?) => Promise<string>` | One prompt → one string. |
| `stream(prompt, opts?)` | `AsyncGenerator<StreamEvent>` | Live deltas. |
| `json(prompt, schema, opts?)` | `(prompt, {name,schema}, opts?) => Promise<any>` | Structured output via JSON Schema; returns parsed object. |
| `agent(prompt, opts?)` | `(prompt, {tools,maxSteps,…}) => Promise<{content,steps}>` | Tool-use loop. |

`opts` for the call methods is a `ChatOptions` — see [Types](#types) below.

## Low-level (core) exports

```js
import { signIn, completeSignIn, isSignedIn, getApiKey, setApiKey,
         signOut, complete, stream, ask, listModels, configure, provider } from "loginwith-openrouter";
```

| fn | description |
|---|---|
| `signIn(opts?)` | Begin OAuth redirect (OAuth providers). |
| `completeSignIn()` | Exchange `?code=` → key. |
| `isSignedIn()` | Boolean. |
| `getApiKey()` / `setApiKey(key)` | Raw key access (for non-OAuth providers, paste a key). |
| `signOut()` | Forget the key. |
| `complete(messages, opts?)` | Core completion; returns `CompleteResult`. |
| `stream(messages, opts?)` | Core streaming generator. |
| `ask(prompt, opts?)` | Convenience → string. |
| `listModels(opts?)` | Model catalog. |
| `configure(patch)` | Switch provider. |
| `provider` | Active `ProviderConfig`. |

## The web component

```html
<login-with-openrouter app-name="…" default-model="…"></login-with-openrouter>
```

Events: `signed-in`, `signed-out`. Method: `refresh()`.

## React

```jsx
import { useOpenRouter } from "loginwith-openrouter/react";
const { isSignedIn, signIn, signOut, ask, data, loading, error } = useOpenRouter();
```

React is an **optional** peer dependency (`>=18`). Don't install it if you don't use it.

## Types

```ts
interface Message {
  role: "system" | "user" | "assistant" | "tool";
  content: string | ContentPart[];
  tool_calls?: ToolCall[]; tool_call_id?: string;
}
interface ContentPart { type:"text"|"image_url"; text?:string; image_url?:{url:string} }
interface Tool { type:"function"; function:{ name:string; description?:string; parameters?:object; handler?:(a:any)=>any } }
interface ToolCall { id:string; type:"function"; function:{ name:string; arguments:string } }

interface ChatOptions {
  model?: string; system?: string; images?: string[];
  temperature?: number; top_p?: number; max_tokens?: number; stop?: string|string[]; seed?: number;
  response_format?: { type:"json_object" } | { type:"json_schema"; json_schema:{ name:string; strict?:boolean; schema:object } };
  tools?: Tool[]; tool_choice?: "auto"|"none"|"required"|{ type:"function"; function:{name:string} };
  reasoning?: { effort?:"low"|"medium"|"high"; exclude?:boolean; max_tokens?:number };
  include_reasoning?: boolean; plugins?: {id:string}[]; transforms?: string[];
  route?: { fallbacks?: string[] }; provider?: object; signal?: AbortSignal;
  [k:string]: unknown;   // passthrough for any other OpenRouter request field
}

interface CompleteResult {
  content: string; tool_calls: ToolCall[]; reasoning: string;
  usage: { prompt_tokens?:number; completion_tokens?:number; total_tokens?:number; cost?:number };
  model: string; raw: any;
}

type StreamEvent =
  | { type:"delta"; content:string; full:string }
  | { type:"reasoning"; reasoning:string }
  | { type:"tool_calls"; tool_calls: ToolCall[] }
  | { type:"done"; content:string; reasoning:string; tool_calls:ToolCall[]; usage:CompleteResult["usage"]; model:string };

interface ProviderConfig { name:string; authURL:string|null; keyURL:string|null; chatURL:string; modelsURL:string; oauth:boolean }
interface ModelInfo { id:string; provider:string; name:string; contextLength:number; promptPrice:number; completionPrice:number; free:boolean }
```

The key is **only ever sent** to `provider.chatURL` (default `api.openrouter.ai`).
There is no other outbound call in the core — see [Security](security.md).