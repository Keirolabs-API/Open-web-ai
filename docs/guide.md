# Getting started & recipes

## Install

```bash
npm i loginwith-openrouter
```

Zero runtime deps, zero build step — `src/*.js` is shipped verbatim and consumed
directly by modern bundlers and browsers (`<script type="module">`).

## 1. The drop-in button (user side)

The `<login-with-openrouter>` web component renders the sign-in button, the
model picker, and a spending-cap field. One tag, framework-agnostic:

```html
<script type="module" src="node_modules/loginwith-openrouter/src/button.js"></script>
<login-with-openrouter app-name="My App" default-model="openai/gpt-oss-20b:free"></login-with-openrouter>
```

Click → auth on `openrouter.ai` → pick a model → set a `$` cap. No wiring.

## 1b. The model picker (standalone)

`<openrouter-model-picker>` is a proper, searchable model selector — filter by
name/provider/id, grouped by provider, with `free` / `vision` / `tools` /
`reason` badges and pricing. It works **before sign-in** (the models endpoint is
public), so you can drop it anywhere to let a user choose their brain:

```html
<script type="module" src="node_modules/loginwith-openrouter/src/picker.js"></script>
<openrouter-model-picker></openrouter-model-picker>
<openrouter-model-picker free-only></openrouter-model-picker>   <!-- free models only -->
```

Selecting a model persists it (`ai.model`) and emits a `model` event:

```js
document.querySelector("openrouter-model-picker")
  .addEventListener("model", (e) => console.log("chose", e.detail.id));
```

The `<login-with-openrouter>` button uses this picker internally, so you get the
rich selector for free when you use the button.

### Events

The button fires `signed-in` and `signed-out` (bubbling, composed) so your page
can react without polling:

```js
const btn = document.querySelector("login-with-openrouter");
btn.addEventListener("signed-in",  () => myApp.unlock());
btn.addEventListener("signed-out", () => myApp.lock());
```

### Attributes

| attribute | purpose |
|---|---|
| `app-name` | App name for OpenRouter attribution |
| `default-model` | Preselected model id |

### Imperative refresh

```js
document.querySelector("login-with-openrouter").refresh();  // re-render (e.g. after ai.ask)
```

## 2. The `ai` object (dev side)

```js
import { ai } from "loginwith-openrouter";

ai.completeSignIn();                 // call once on load (the button does this for you)
await ai.signIn();                     // kick off login manually (OAuth providers only)
ai.setBudget(1);                       // $1 cap — user or dev sets it
const ans = await ai.ask("Summarize…");// on the user's account
ai.spend;                              // 0.0023
ai.remaining();                        // 0.9977 (Infinity if no cap)
ai.listModels({ free: true });         // browse models, no key needed
```

The button and `ai` share the same `localStorage` state: a model picked in the
button is instantly reflected in `ai.model`.

## 3. Recipes

### Streaming (live typing)

```js
for await (const ev of ai.stream("write a sonnet about tabs vs spaces")) {
  if (ev.type === "delta") out.textContent = ev.full;
}
// ev.type ∈ "delta" | "reasoning" | "tool_calls" | "done"
```

Cancel mid-stream:

```js
const ctrl = new AbortController();
setTimeout(() => ctrl.abort(), 2000);
for await (const ev of ai.stream(prompt, { signal: ctrl.signal })) { … }
```

### Structured output (JSON Schema)

```js
const data = await ai.json("extract facts: " + text, {
  name: "facts",
  schema: { type:"object", properties:{
    topic:{type:"string"},
    claims:{type:"array", items:{type:"string"}},
    confident:{type:"boolean"},
  }, required:["topic","claims","confident"] },
});
```

### Tool use / agent loop

```js
const tools = [{
  type: "function",
  function: {
    name: "get_weather", description: "weather for a city",
    parameters: { type:"object", properties:{ city:{type:"string"} }, required:["city"] },
    handler: async (a) => ({ city:a.city, temp:22, condition:"sunny" }),  // runs in the browser
  },
}];
const { content, steps } = await ai.agent(
  "Plan a trip to Paris — check the weather first.",
  { tools, maxSteps: 5 }
);
```

The model calls tools; handlers execute in the browser; results are fed back;
the loop stops on a plain reply or after `maxSteps`.

### Vision

```js
await ai.ask("what's in this image?", { images: ["https://…/cat.png"] });
// or a data URL: "data:image/png;base64,…"
```

### Passthrough params

`opts` is forwarded as the request body, so `tools`, `tool_choice`,
`response_format`, `reasoning`, `plugins`, `route`, `provider`, `top_p`,
`max_tokens`, `seed`, `stop`, … all work with no SDK change.

## 4. Running the example

```bash
git clone <repo> && cd loginwith-openrouter
npx serve .
# open http://localhost:3000/example/
```

The **Quill** example (`example/index.html`) demos streaming text actions, a
trip-planning tool agent, and JSON extraction — all on your own OpenRouter credits.