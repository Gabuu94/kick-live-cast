import { APP_NAME, DEEP_LINK_SCHEME } from "@/lib/app-info";

function getWebUrl(matchId: string): string {
  if (typeof window !== "undefined") {
    return `${window.location.origin}/match/${matchId}`;
  }
  // Stable preview URL fallback for SSR / server-side rendering.
  return `https://id-preview--4a11b24f-e2cb-4bc8-b260-bf1cdceff056.lovable.app/match/${matchId}`;
}

export async function shareMatch(matchId: string, teams: string) {
  const deepLink = `${DEEP_LINK_SCHEME}://match/${matchId}`;
  const webUrl = getWebUrl(matchId);
  const title = `${teams} — ${APP_NAME}`;
  const body = `${title}\n${deepLink}\n${webUrl}`;

  // Native path: use the OS share sheet.
  const { Capacitor } = await import("@capacitor/core");
  if (Capacitor.isNativePlatform()) {
    const { Share } = await import("@capacitor/share");
    await Share.share({
      title,
      text: body,
      url: deepLink,
      dialogTitle: "Share match",
    });
    return;
  }

  // Web path: prefer the native Web Share API, then fall back to clipboard.
  if (typeof navigator !== "undefined" && "share" in navigator) {
    try {
      await navigator.share({ title, text: body, url: deepLink });
      return;
    } catch (err) {
      // User cancelled or share failed — fall through to clipboard.
    }
  }

  if (typeof navigator !== "undefined" && "clipboard" in navigator) {
    await navigator.clipboard.writeText(body);
    const { toast } = await import("sonner");
    toast.success("Match link copied to clipboard");
  } else {
    const { toast } = await import("sonner");
    toast.error("Sharing is not supported on this device");
  }
}
