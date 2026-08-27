import { useCallback, useEffect, useState } from "react";
import { castMedia, castSessionDevice, loadCast, onCastSessionChange, stopCasting } from "./cast";

export interface CastState {
  /** True once the Cast SDK reported at least one receiver is reachable. */
  available: boolean;
  connected: boolean;
  device: string | null;
  error: string | null;
  cast: (url: string, title: string, subtitle?: string) => Promise<void>;
  stop: () => void;
}

/** Chromecast state for a player surface. */
export function useCast(): CastState {
  const [available, setAvailable] = useState(false);
  const [connected, setConnected] = useState(false);
  const [device, setDevice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let unsubscribe = () => undefined as void;
    let cancelled = false;
    void loadCast().then((ok) => {
      if (cancelled || !ok) return;
      setAvailable(true);
      setConnected(Boolean(castSessionDevice()));
      setDevice(castSessionDevice());
      unsubscribe = onCastSessionChange((isConnected) => {
        setConnected(isConnected);
        setDevice(isConnected ? castSessionDevice() : null);
      });
    });
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  const cast = useCallback(async (url: string, title: string, subtitle?: string) => {
    setError(null);
    try {
      await castMedia(url, title, subtitle);
      setConnected(true);
      setDevice(castSessionDevice());
    } catch (e) {
      const message = e instanceof Error ? e.message : "Couldn't start casting.";
      setError(message.includes("cancel") ? null : message);
    }
  }, []);

  const stop = useCallback(() => {
    stopCasting();
    setConnected(false);
    setDevice(null);
  }, []);

  return { available, connected, device, error, cast, stop };
}
