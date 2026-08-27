/**
 * Chromecast support.
 *
 * Uses Google's own Cast Application Framework (CAF) sender SDK, which is the
 * only sanctioned way to cast from a web view. It is loaded lazily in the
 * browser only — SSR and the native web view without Cast simply report
 * "unavailable" and the UI hides the button.
 *
 * Only direct media URLs (HLS/MP4) can be cast. YouTube embeds are cast from
 * the YouTube app itself, so for those sources we point the user there.
 */

type CastContext = {
  setOptions: (o: Record<string, unknown>) => void;
  getCurrentSession: () => CastSession | null;
  requestSession: () => Promise<unknown>;
  endCurrentSession: (stop: boolean) => void;
  addEventListener: (type: string, cb: (e: unknown) => void) => void;
  removeEventListener: (type: string, cb: (e: unknown) => void) => void;
};

type CastSession = {
  loadMedia: (req: unknown) => Promise<unknown>;
  getCastDevice: () => { friendlyName?: string } | undefined;
};

type CastWindow = Window & {
  __onGCastApiAvailable?: (available: boolean) => void;
  cast?: {
    framework: {
      CastContext: { getInstance: () => CastContext };
      CastContextEventType: { SESSION_STATE_CHANGED: string };
      SessionState: { SESSION_STARTED: string; SESSION_RESUMED: string; SESSION_ENDED: string };
    };
  };
  chrome?: {
    cast?: {
      media: {
        DEFAULT_MEDIA_RECEIVER_APP_ID: string;
        MediaInfo: new (contentId: string, contentType: string) => MediaInfoLike;
        StreamType: { LIVE: string };
        GenericMediaMetadata: new () => Record<string, unknown>;
        LoadRequest: new (media: MediaInfoLike) => Record<string, unknown>;
      };
      AutoJoinPolicy: { ORIGIN_SCOPED: string };
    };
  };
};

type MediaInfoLike = {
  contentType: string;
  streamType: string;
  metadata?: Record<string, unknown>;
};

const SDK_URL = "https://www.gstatic.com/cv/js/sender/v1/cast_sender.js?loadCastFramework=1";

let loading: Promise<boolean> | null = null;

/** Loads the Cast sender SDK once. Resolves false when casting isn't possible. */
export function loadCast(): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);
  const w = window as CastWindow;
  if (w.cast?.framework) return Promise.resolve(true);
  if (loading) return loading;

  loading = new Promise<boolean>((resolve) => {
    const timeout = setTimeout(() => resolve(false), 8000);
    w.__onGCastApiAvailable = (available: boolean) => {
      clearTimeout(timeout);
      if (!available) return resolve(false);
      try {
        w.cast!.framework.CastContext.getInstance().setOptions({
          receiverApplicationId: w.chrome!.cast!.media.DEFAULT_MEDIA_RECEIVER_APP_ID,
          autoJoinPolicy: w.chrome!.cast!.AutoJoinPolicy.ORIGIN_SCOPED,
        });
        resolve(true);
      } catch {
        resolve(false);
      }
    };
    const script = document.createElement("script");
    script.src = SDK_URL;
    script.async = true;
    script.onerror = () => {
      clearTimeout(timeout);
      resolve(false);
    };
    document.head.appendChild(script);
  });
  return loading;
}

function context(): CastContext | null {
  const w = window as CastWindow;
  return w.cast?.framework ? w.cast.framework.CastContext.getInstance() : null;
}

export function castSessionDevice(): string | null {
  try {
    const session = context()?.getCurrentSession();
    return session?.getCastDevice()?.friendlyName ?? null;
  } catch {
    return null;
  }
}

/** Starts (or reuses) a session and plays a media URL on the TV. */
export async function castMedia(url: string, title: string, subtitle?: string): Promise<void> {
  const ok = await loadCast();
  if (!ok) throw new Error("Casting isn't available on this device.");
  const ctx = context();
  if (!ctx) throw new Error("Casting isn't available on this device.");

  let session = ctx.getCurrentSession();
  if (!session) {
    await ctx.requestSession();
    session = ctx.getCurrentSession();
  }
  if (!session) throw new Error("No Chromecast was selected.");

  const chrome = (window as CastWindow).chrome!;
  const contentType = url.includes(".m3u8") ? "application/x-mpegURL" : "video/mp4";
  const media = new chrome.cast!.media.MediaInfo(url, contentType);
  media.streamType = chrome.cast!.media.StreamType.LIVE;
  const metadata = new chrome.cast!.media.GenericMediaMetadata();
  metadata["title"] = title;
  if (subtitle) metadata["subtitle"] = subtitle;
  media.metadata = metadata;

  await session.loadMedia(new chrome.cast!.media.LoadRequest(media));
}

export function stopCasting(): void {
  try {
    context()?.endCurrentSession(true);
  } catch {
    /* nothing to stop */
  }
}

/** Subscribes to session start/stop. Returns an unsubscribe function. */
export function onCastSessionChange(cb: (connected: boolean) => void): () => void {
  const w = window as CastWindow;
  const ctx = context();
  if (!ctx || !w.cast) return () => undefined;
  const type = w.cast.framework.CastContextEventType.SESSION_STATE_CHANGED;
  const handler = () => cb(Boolean(ctx.getCurrentSession()));
  ctx.addEventListener(type, handler);
  return () => ctx.removeEventListener(type, handler);
}
