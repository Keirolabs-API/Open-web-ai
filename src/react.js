// Thin React binding. The core (src/index.js) stays zero-dependency; React is
// a peer dep so non-React users pay nothing.
//
//   const { signIn, signOut, isSignedIn, ask, loading, error, data } = useOpenRouter();

import { useEffect, useState, useCallback } from "react";
import {
  signIn as signInCore,
  completeSignIn,
  isSignedIn,
  signOut as signOutCore,
  ask as askCore,
} from "./index.js";

export function useOpenRouter() {
  const [signedIn, setSignedIn] = useState(isSignedIn());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  // handle the redirect back from openrouter.ai on mount
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        await completeSignIn();
        if (alive) setSignedIn(isSignedIn());
      } catch (e) {
        if (alive) setError(e.message);
      }
    })();
    return () => { alive = false; };
  }, []);

  const signIn = useCallback(() => signInCore(), []);
  const signOut = useCallback(() => { signOutCore(); setSignedIn(false); setData(null); }, []);

  const ask = useCallback(async (prompt, opts) => {
    setLoading(true); setError(null); setData(null);
    try {
      const out = await askCore(prompt, opts);
      setData(out);
      return out;
    } catch (e) {
      setError(e.message);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  return { isSignedIn: signedIn, signIn, signOut, ask, loading, error, data };
}