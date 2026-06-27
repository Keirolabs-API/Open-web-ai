// Types for loginwith-openrouter.

export interface SignInOptions {
  callbackUrl?: string;
  appName?: string;
}

export interface Message {
  role: "system" | "user" | "assistant" | "tool";
  content: string | ContentPart[];
  tool_calls?: ToolCall[];
  tool_call_id?: string;
}

export interface ContentPart {
  type: "text" | "image_url";
  text?: string;
  image_url?: { url: string };
}

export interface Tool {
  type: "function";
  function: {
    name: string;
    description?: string;
    parameters?: object;
    /** Agent-only: executed in the browser when the model calls this tool. */
    handler?: (args: any) => any | Promise<any>;
  };
}

export interface ToolCall {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
}

/** Any OpenRouter chat request field, plus our extras. Passthrough — new params need no SDK change. */
export interface ChatOptions {
  model?: string;
  system?: string;
  images?: string[];            // data URLs or https URLs
  temperature?: number;
  top_p?: number;
  max_tokens?: number;
  stop?: string | string[];
  seed?: number;
  response_format?: { type: "json_object" } | { type: "json_schema"; json_schema: { name: string; strict?: boolean; schema: object } };
  tools?: Tool[];
  tool_choice?: "auto" | "none" | "required" | { type: "function"; function: { name: string } };
  reasoning?: { effort?: "low" | "medium" | "high"; exclude?: boolean; max_tokens?: number };
  include_reasoning?: boolean;
  plugins?: { id: string }[];
  transforms?: string[];
  route?: { fallbacks?: string[] };
  provider?: { order?: string[]; allow_fallbacks?: boolean };
  signal?: AbortSignal;
  [k: string]: unknown;
}

export interface CompleteResult {
  content: string;
  tool_calls: ToolCall[];
  reasoning: string;
  usage: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number; cost?: number };
  model: string;
  raw: any;
}

export type StreamEvent =
  | { type: "delta"; content: string; full: string }
  | { type: "reasoning"; reasoning: string }
  | { type: "tool_calls"; tool_calls: ToolCall[] }
  | { type: "done"; content: string; reasoning: string; tool_calls: ToolCall[]; usage: CompleteResult["usage"]; model: string };

export interface ModelInfo {
  id: string; provider: string; name: string; contextLength: number;
  promptPrice: number; completionPrice: number; free: boolean;
}

export declare function signIn(opts?: SignInOptions): Promise<void>;
export declare function completeSignIn(): Promise<string | null>;
export declare function isSignedIn(): boolean;
export declare function getApiKey(): string | null;
export declare function setApiKey(key: string | null): void;
export declare function signOut(): void;
export declare function complete(messages: Message[], opts?: ChatOptions): Promise<CompleteResult>;
export declare function stream(messages: Message[], opts?: ChatOptions): AsyncGenerator<StreamEvent>;
export declare function ask(prompt: string, opts?: ChatOptions): Promise<string>;
export declare function listModels(opts?: { free?: boolean }): Promise<ModelInfo[]>;

export interface ProviderConfig {
  name: string;
  authURL: string | null;
  keyURL: string | null;
  chatURL: string;
  modelsURL: string;
  oauth: boolean;
}
export declare const provider: ProviderConfig;
export declare function configure(patch: {
  provider?: "openrouter" | "openai-compatible" | "ollama" | "custom";
  baseURL?: string;
  apiKey?: string;
  name?: string;
}): ProviderConfig;

export const ai: {
  isSignedIn: boolean;
  signIn(opts?: SignInOptions): Promise<void>;
  completeSignIn(): Promise<string | null>;
  signOut(): void;
  model: string;
  listModels(opts?: { free?: boolean }): Promise<ModelInfo[]>;
  budget: number | null;
  setBudget(usd: number | null): number | null;
  readonly spend: number;
  remaining(): number;
  readonly provider: ProviderConfig;
  configure(patch: { provider?: string; baseURL?: string; apiKey?: string; name?: string }): ProviderConfig;
  fallbacks: string[];
  complete(messages: Message[], opts?: ChatOptions): Promise<CompleteResult>;
  ask(prompt: string, opts?: ChatOptions): Promise<string>;
  stream(prompt: string, opts?: ChatOptions): AsyncGenerator<StreamEvent>;
  json(prompt: string, schemaDef: { name?: string; schema: object }, opts?: ChatOptions): Promise<any>;
  agent(prompt: string, opts?: ChatOptions & { tools?: Tool[]; maxSteps?: number }): Promise<{ content: string; steps: CompleteResult[] }>;
};