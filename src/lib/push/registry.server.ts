/**
 * Device registry + delivery ledger — server only.
 *
 * Each install registers its FCM token together with the clubs it follows and
 * its alert preferences, so the sender can decide who should receive a given
 * match event without asking the app.
 *
 * Storage: this build keeps the registry in the worker's module scope. That is
 * enough for a single-region preview and for testing the whole pipeline, but
 * workers are stateless and recycled, so entries are not durable. Enabling
 * Lovable Cloud swaps the two maps below for `push_devices` and
 * `push_deliveries` tables without touching any caller.
 */

import {
  DEFAULT_PREFS,
  resolvePrefs,
  type AlertPrefs,
  type ScopeTarget,
} from "./prefs";
import {
  DEFAULT_THROTTLE,
  createLedger,
  shouldDeliver,
  type Decision,
  type PushEvent,
} from "./dedupe";

export interface DeviceRecord {
  deviceId: string;
  token: string;
  platform: "android" | "ios" | "web";
  favorites: string[];
  prefs: AlertPrefs;
  updatedAt: number;
}

const devices = new Map<string, DeviceRecord>();
const ledgers = new Map<string, ReturnType<typeof createLedger>>();

const DEVICE_TTL_MS = 60 * 24 * 60 * 60 * 1000; // 60 days

export function upsertDevice(input: {
  deviceId: string;
  token: string;
  platform: DeviceRecord["platform"];
  favorites: string[];
  prefs: Partial<AlertPrefs> & { overrides?: AlertPrefs["overrides"] };
}): DeviceRecord {
  const record: DeviceRecord = {
    deviceId: input.deviceId,
    token: input.token,
    platform: input.platform,
    favorites: [...new Set(input.favorites)],
    prefs: { ...DEFAULT_PREFS, ...input.prefs, overrides: input.prefs.overrides ?? {} },
    updatedAt: Date.now(),
  };
  devices.set(input.deviceId, record);
  sweep();
  return record;
}

export function removeDevice(deviceId: string) {
  devices.delete(deviceId);
  ledgers.delete(deviceId);
}

export function removeByToken(token: string) {
  for (const [id, d] of devices) if (d.token === token) removeDevice(id);
}

export function listDevices(): DeviceRecord[] {
  sweep();
  return [...devices.values()];
}

function sweep() {
  const cutoff = Date.now() - DEVICE_TTL_MS;
  for (const [id, d] of devices) if (d.updatedAt < cutoff) removeDevice(id);
}

/**
 * Devices that follow either club in a match and have the relevant alert type
 * enabled for that club/league, after per-device dedupe + throttling.
 */
export function selectRecipients(
  target: ScopeTarget,
  event: PushEvent,
): { device: DeviceRecord; decision: Decision }[] {
  const out: { device: DeviceRecord; decision: Decision }[] = [];

  for (const device of listDevices()) {
    if (device.prefs.muteAll) continue;
    const follows =
      device.favorites.includes(target.homeTeamId) ||
      device.favorites.includes(target.awayTeamId);
    if (!follows) continue;

    const effective = resolvePrefs(device.prefs, target);
    const enabled =
      event.type === "goal" || event.type === "redCard" || event.type === "penalty"
        ? effective.goals
        : event.type === "fullTime"
          ? effective.fullTime
          : effective.kickoff;
    if (!enabled) continue;

    let ledger = ledgers.get(device.deviceId);
    if (!ledger) {
      ledger = createLedger();
      ledgers.set(device.deviceId, ledger);
    }
    const decision = shouldDeliver(ledger, event, DEFAULT_THROTTLE);
    if (decision.deliver) out.push({ device, decision });
  }

  return out;
}
