/**
 * FCM HTTP v1 sender — server only.
 *
 * Auth uses a Google service-account key (the JSON you download from
 * Firebase console -> Project settings -> Service accounts). Store the whole
 * JSON blob in the `FCM_SERVICE_ACCOUNT_JSON` secret. We mint a short-lived
 * OAuth access token by signing a JWT with WebCrypto (RS256), which works in
 * the edge worker runtime — no googleapis SDK needed.
 */

interface ServiceAccount {
  project_id: string;
  client_email: string;
  private_key: string;
}

interface CachedToken {
  token: string;
  expiresAt: number;
}

let cachedToken: CachedToken | null = null;

function serviceAccount(): ServiceAccount {
  const raw = process.env["FCM_SERVICE_ACCOUNT_JSON"];
  if (!raw) throw new Error("FCM_SERVICE_ACCOUNT_JSON is not configured");
  const parsed = JSON.parse(raw) as ServiceAccount;
  if (!parsed.client_email || !parsed.private_key || !parsed.project_id) {
    throw new Error("FCM_SERVICE_ACCOUNT_JSON is missing required fields");
  }
  return parsed;
}

function b64url(input: ArrayBuffer | string): string {
  const bytes =
    typeof input === "string" ? new TextEncoder().encode(input) : new Uint8Array(input);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function pemToPkcs8(pem: string): ArrayBuffer {
  const body = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\\n/g, "")
    .replace(/\s/g, "");
  const bin = atob(body);
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return buf.buffer;
}

async function accessToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && cachedToken.expiresAt - 60 > now) return cachedToken.token;

  const sa = serviceAccount();
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = b64url(
    JSON.stringify({
      iss: sa.client_email,
      scope: "https://www.googleapis.com/auth/firebase.messaging",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    }),
  );

  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToPkcs8(sa.private_key.replace(/\\n/g, "\n")),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(`${header}.${claims}`),
  );
  const assertion = `${header}.${claims}.${b64url(signature)}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  if (!res.ok) {
    throw new Error(`Google token exchange failed (${res.status})`);
  }
  const json = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = { token: json.access_token, expiresAt: now + json.expires_in };
  return json.access_token;
}

export interface FcmMessage {
  token: string;
  title: string;
  body: string;
  /** Deep link opened when the alert is tapped, e.g. footylive://match/m-101 */
  link: string;
  /** Collapse key — FCM replaces an undelivered alert with the same key. */
  collapseKey: string;
  data?: Record<string, string>;
}

export interface SendResult {
  token: string;
  ok: boolean;
  /** Token is permanently invalid and should be dropped from the registry. */
  unregistered?: boolean;
  error?: string;
}

export async function sendPush(message: FcmMessage): Promise<SendResult> {
  const sa = serviceAccount();
  const token = await accessToken();

  const payload = {
    message: {
      token: message.token,
      notification: { title: message.title, body: message.body },
      data: { link: message.link, ...(message.data ?? {}) },
      android: {
        priority: "HIGH",
        collapse_key: message.collapseKey,
        notification: {
          channel_id: "match-alerts",
          click_action: "MATCH_ALERT",
          tag: message.collapseKey,
        },
      },
      apns: {
        headers: { "apns-collapse-id": message.collapseKey, "apns-priority": "10" },
        payload: { aps: { sound: "default", "thread-id": message.collapseKey } },
      },
    },
  };

  const res = await fetch(
    `https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`,
    {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify(payload),
    },
  );

  if (res.ok) return { token: message.token, ok: true };

  const text = await res.text();
  const unregistered =
    res.status === 404 || text.includes("UNREGISTERED") || text.includes("INVALID_ARGUMENT");
  return { token: message.token, ok: false, unregistered, error: `${res.status} ${text}` };
}

export async function sendPushBatch(messages: FcmMessage[]): Promise<SendResult[]> {
  const results: SendResult[] = [];
  // Small sequential chunks keep us well under the worker's subrequest budget.
  const size = 10;
  for (let i = 0; i < messages.length; i += size) {
    const chunk = messages.slice(i, i + size);
    results.push(
      ...(await Promise.all(
        chunk.map((m) =>
          sendPush(m).catch((err: unknown) => ({
            token: m.token,
            ok: false,
            error: err instanceof Error ? err.message : "send failed",
          })),
        ),
      )),
    );
  }
  return results;
}

export const fcmConfigured = () => Boolean(process.env["FCM_SERVICE_ACCOUNT_JSON"]);
