/**
 * Capacitor runtime detection.
 * Everything native is loaded through dynamic import so the web build (and SSR)
 * never touches a native plugin.
 */
export const isNative = (): boolean => {
  if (typeof window === "undefined") return false;
  const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } })
    .Capacitor;
  return Boolean(cap?.isNativePlatform?.());
};

export const nativePlatform = (): "ios" | "android" | "web" => {
  if (typeof window === "undefined") return "web";
  const cap = (window as unknown as { Capacitor?: { getPlatform?: () => string } }).Capacitor;
  return (cap?.getPlatform?.() as "ios" | "android" | "web") ?? "web";
};
