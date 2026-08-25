import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * Client-callable push endpoints. Thin wrappers only — all runtime logic lives
 * in `src/lib/push/*.server.ts`, loaded inside the handlers.
 */

const scopePrefsSchema = z
  .object({
    kickoff: z.boolean(),
    kickoffMinutesBefore: z.number().int().min(1).max(240),
    goals: z.boolean(),
    fullTime: z.boolean(),
  })
  .partial();

const prefsSchema = z.object({
  kickoff: z.boolean(),
  kickoffMinutesBefore: z.number().int().min(1).max(240),
  goals: z.boolean(),
  fullTime: z.boolean(),
  muteAll: z.boolean(),
  overrides: z.record(z.string(), scopePrefsSchema),
});

const registerSchema = z.object({
  deviceId: z.string().min(8).max(128),
  token: z.string().min(10).max(4096),
  platform: z.enum(["android", "ios", "web"]),
  favorites: z.array(z.string().min(1).max(32)).max(100),
  prefs: prefsSchema,
});

export const registerDevice = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => registerSchema.parse(input))
  .handler(async ({ data }) => {
    const { upsertDevice } = await import("./push/registry.server");
    const record = upsertDevice(data);
    return { ok: true as const, deviceId: record.deviceId, updatedAt: record.updatedAt };
  });

export const unregisterDevice = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ deviceId: z.string().min(8).max(128) }).parse(input),
  )
  .handler(async ({ data }) => {
    const { removeDevice } = await import("./push/registry.server");
    removeDevice(data.deviceId);
    return { ok: true as const };
  });

export const pushStatus = createServerFn({ method: "GET" }).handler(async () => {
  const { fcmConfigured } = await import("./push/fcm.server");
  const { listDevices } = await import("./push/registry.server");
  return { configured: fcmConfigured(), devices: listDevices().length };
});
