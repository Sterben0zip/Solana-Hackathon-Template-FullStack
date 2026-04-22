const QR_PREFIX = "GERAERO-BIN";
const SESSION_STORAGE_KEY = "geraero-active-session";
const SESSION_TTL_MS = 10 * 60 * 1000;
const SIGNATURE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export type AllowedBinQr = {
  activationUrl: string;
  binId: string;
  normalizedCode: string;
  signature: string;
};

export type TemporaryQrSession = {
  binId: string;
  code: string;
  expiresAt: number;
  issuedAt: number;
  signature: string;
  token: string;
};

export type ValidatedRecyclingDrop = {
  awardMultiplier: bigint;
  binId: string;
  estimatedPoints: number;
  residueLabel: string;
  sessionToken: string;
  weightKg: number;
  weightUnits: bigint;
};

function normalizeQrPayload(input: string) {
  return input.trim().replace(/\s+/g, "").toUpperCase();
}

function extractQrPayload(input: string) {
  const candidate = input.trim();

  if (!candidate) {
    return "";
  }

  try {
    const url = new URL(candidate);
    const pathParts = url.pathname.split("/").filter(Boolean);
    const queryValue =
      url.searchParams.get("qr") ??
      url.searchParams.get("bin") ??
      pathParts[pathParts.length - 1] ??
      "";

    return normalizeQrPayload(queryValue);
  } catch {
    return normalizeQrPayload(candidate);
  }
}

function buildSignature(binId: string) {
  let hash = 2166136261;

  for (const character of binId) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }

  let signature = "";
  let cursor = Math.abs(hash);

  for (let index = 0; index < 6; index += 1) {
    signature += SIGNATURE_ALPHABET[cursor % SIGNATURE_ALPHABET.length];
    cursor = Math.floor(cursor / SIGNATURE_ALPHABET.length) ^ ((index + 1) * 97);
  }

  return signature;
}

function buildSessionToken(binId: string) {
  const suffix = crypto.randomUUID().replace(/-/g, "").slice(0, 10).toUpperCase();
  return `TMP-${binId}-${suffix}`;
}

export function buildAllowedBinQr(binId: string, origin = "") {
  const normalizedBinId = normalizeQrPayload(binId);
  const signature = buildSignature(normalizedBinId);
  const normalizedCode = `${QR_PREFIX}-${normalizedBinId}-${signature}`;
  const baseOrigin = origin || window.location.origin;

  return {
    activationUrl: `${baseOrigin}/?qr=${normalizedCode}`,
    binId: normalizedBinId,
    normalizedCode,
    signature,
  } satisfies AllowedBinQr;
}

export function parseAllowedBinQr(input: string) {
  const payload = extractQrPayload(input);
  const match = payload.match(/^GERAERO-BIN-([A-Z0-9-]+)-([A-Z2-9]{6})$/);

  if (!match) {
    return null;
  }

  const [, binId, signature] = match;
  const expectedSignature = buildSignature(binId);

  if (signature !== expectedSignature) {
    return null;
  }

  return {
    activationUrl: `${window.location.origin}/?qr=${payload}`,
    binId,
    normalizedCode: payload,
    signature,
  } satisfies AllowedBinQr;
}

export function createTemporarySession(qr: AllowedBinQr) {
  const issuedAt = Date.now();

  return {
    binId: qr.binId,
    code: qr.normalizedCode,
    expiresAt: issuedAt + SESSION_TTL_MS,
    issuedAt,
    signature: qr.signature,
    token: buildSessionToken(qr.binId),
  } satisfies TemporaryQrSession;
}

export function isSessionActive(session: TemporaryQrSession | null) {
  return Boolean(session && session.expiresAt > Date.now());
}

export function saveTemporarySession(session: TemporaryQrSession) {
  sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
}

export function loadTemporarySession() {
  const raw = sessionStorage.getItem(SESSION_STORAGE_KEY);

  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as TemporaryQrSession;

    if (!isSessionActive(parsed)) {
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
      return null;
    }

    return parsed;
  } catch {
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
    return null;
  }
}

export function clearTemporarySession() {
  sessionStorage.removeItem(SESSION_STORAGE_KEY);
}

export function getSessionRemainingMs(session: TemporaryQrSession | null) {
  if (!session) {
    return 0;
  }

  return Math.max(session.expiresAt - Date.now(), 0);
}

export function formatRemainingTime(milliseconds: number) {
  const totalSeconds = Math.max(Math.floor(milliseconds / 1000), 0);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}
