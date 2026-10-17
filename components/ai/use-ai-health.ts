"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type AiHealth = {
  status: "connected" | "model_missing" | "offline";
  connected: boolean;
  model: string;
  modelInstalled: boolean;
  latencyMs: number | null;
  availableModels: string[];
  vision: {
    configured: boolean;
    supported: boolean;
    model: string | null;
    reason: string;
    source: string;
  };
  limits: { maxImageSizeMb: number; timeoutSeconds: number; rateLimitPerMinute: number };
  deploymentMode: "local" | "remote";
  hostedInference: boolean;
  message: string;
  hint?: string;
  checkedAt: string;
};

type State = {
  data: AiHealth | null;
  loading: boolean;
  error: string | null;
};

export function useAiHealth() {
  const [state, setState] = useState<State>({ data: null, loading: true, error: null });
  const mounted = useRef(true);

  const refresh = useCallback(async () => {
    setState((current) => ({ ...current, loading: true, error: null }));
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12_000);
    try {
      const response = await fetch("/api/health", { cache: "no-store", signal: controller.signal });
      if (!response.ok) throw new Error(`Health check failed (${response.status})`);
      const data = (await response.json()) as AiHealth;
      if (mounted.current) setState({ data, loading: false, error: null });
    } catch (error) {
      if (mounted.current) {
        setState((current) => ({
          data: current.data,
          loading: false,
          error: error instanceof Error && error.name === "AbortError" ? "Health check timed out." : "Could not reach the app's health endpoint.",
        }));
      }
    } finally {
      clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    void refresh();
    return () => {
      mounted.current = false;
    };
  }, [refresh]);

  return { ...state, refresh };
}
