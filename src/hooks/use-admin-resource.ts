"use client";

import { useCallback, useEffect, useState } from "react";
import type { z } from "zod";
import { API_FETCH_OPTS, parseApiErrorMessage } from "@/lib/api-fetch";

type AdminResourceState<T> = {
  data: T | null;
  loading: boolean;
  error: string | null;
};

/**
 * Loads a JSON admin endpoint when the component mounts and validates the
 * response with `schema`. Previously loaded data is kept while reloading or
 * after a failed reload, so callers can show it alongside the error.
 *
 * `schema` must be stable (module-level) and `errorMessage` is used when the
 * server sends no error message of its own.
 */
export function useAdminResource<S extends z.ZodType>(
  url: string,
  schema: S,
  errorMessage: string
): AdminResourceState<z.output<S>> & { reload: () => void } {
  const [state, setState] = useState<AdminResourceState<z.output<S>>>({
    data: null,
    loading: true,
    error: null,
  });
  const [reloadToken, setReloadToken] = useState(0);

  const reload = useCallback(() => {
    setState((current) => ({ ...current, loading: true, error: null }));
    setReloadToken((token) => token + 1);
  }, []);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const response = await fetch(url, API_FETCH_OPTS);
        if (!response.ok) {
          const message = await parseApiErrorMessage(response, errorMessage);
          if (active) {
            setState((current) => ({ ...current, loading: false, error: message }));
          }
          return;
        }
        const data = schema.parse(await response.json());
        if (active) setState({ data, loading: false, error: null });
      } catch {
        if (active) {
          setState((current) => ({
            ...current,
            loading: false,
            error: errorMessage,
          }));
        }
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, [url, schema, errorMessage, reloadToken]);

  return { ...state, reload };
}
