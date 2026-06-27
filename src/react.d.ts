import type { SignInOptions, AskOptions } from "./index.d.ts";

export interface UseOpenRouterResult {
  isSignedIn: boolean;
  signIn: () => void;
  signOut: () => void;
  ask: (prompt: string, opts?: AskOptions) => Promise<string>;
  loading: boolean;
  error: string | null;
  data: string | null;
}

export declare function useOpenRouter(): UseOpenRouterResult;