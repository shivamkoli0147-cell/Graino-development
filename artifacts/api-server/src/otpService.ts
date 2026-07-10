// ─────────────────────────────────────────────────────────────────────────────
// otpService.ts — Real OTP delivery via 2Factor.in (https://2factor.in)
// Fixed seller number (9999999999) never goes through SMS — its OTP is a
// static "7089" checked directly in the auth route.
// ─────────────────────────────────────────────────────────────────────────────

import { TWOFACTOR_API_KEY, TWOFACTOR_OTP_TEMPLATE } from "./config.js";

export const SELLER_PHONE = "9999999999";
export const SELLER_FIXED_OTP = "7089";

const OTP_TTL_MS = 5 * 60 * 1000; // 5 minutes
// Maps phone -> { sessionId, expiresAt } — 2Factor owns the actual OTP value,
// we just track which session id is "live" for verification.
const sessionStore = new Map<string, { sessionId: string; expiresAt: number }>();

/** Normalizes any phone representation down to bare 10 digits, used as the
 * store key so send/verify always agree regardless of how the caller formatted it. */
export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return digits.length > 10 ? digits.slice(-10) : digits;
}

function toInternational(phone10: string): string {
  // 2Factor expects numbers in international format, e.g. +919999999999
  return `+91${phone10}`;
}

// Periodic sweep so unverified/expired sessions don't accumulate in memory forever.
setInterval(() => {
  const now = Date.now();
  for (const [phone, entry] of sessionStore) {
    if (now > entry.expiresAt) sessionStore.delete(phone);
  }
}, 5 * 60 * 1000).unref();

/**
 * Generates an OTP for `phone` via 2Factor.in and stores the session id.
 * Returns { success, error? }. Never throws.
 */
export async function sendOtp(rawPhone: string): Promise<{ success: boolean; error?: string }> {
  const phone = normalizePhone(rawPhone);
  if (phone === SELLER_PHONE) {
    // Fixed credential login — no SMS needed.
    return { success: true };
  }

  if (!TWOFACTOR_API_KEY) {
    return { success: false, error: "SMS service not configured (missing TWOFACTOR_API_KEY)" };
  }

  try {
    const intlPhone = toInternational(phone);
    const url = `https://2factor.in/API/V1/${TWOFACTOR_API_KEY}/SMS/${encodeURIComponent(
      intlPhone
    )}/AUTOGEN2/${encodeURIComponent(TWOFACTOR_OTP_TEMPLATE)}`;

    const res = await fetch(url, { method: "GET" });
    const data = (await res.json().catch(() => null)) as { Status?: string; Details?: string } | null;

    if (!res.ok || !data || data.Status !== "Success" || !data.Details) {
      const msg = (data && (data.Details || data.Status)) || `2Factor error (${res.status})`;
      return { success: false, error: String(msg) };
    }

    sessionStore.set(phone, { sessionId: data.Details, expiresAt: Date.now() + OTP_TTL_MS });
    return { success: true };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

/**
 * Verifies `otp` for `phone` against the live 2Factor session id.
 */
export async function verifyOtp(
  rawPhone: string,
  otp: string
): Promise<{ valid: boolean; error?: string }> {
  const phone = normalizePhone(rawPhone);

  const entry = sessionStore.get(phone);
  if (!entry) return { valid: false, error: "पहले OTP भेजें" };
  if (Date.now() > entry.expiresAt) {
    sessionStore.delete(phone);
    return { valid: false, error: "OTP expire हो गया, दोबारा भेजें" };
  }

  try {
    const url = `https://2factor.in/API/V1/${TWOFACTOR_API_KEY}/SMS/VERIFY/${entry.sessionId}/${encodeURIComponent(
      otp
    )}`;
    const res = await fetch(url, { method: "GET" });
    const data = (await res.json().catch(() => null)) as { Status?: string; Details?: string } | null;

    // 2Factor quirk: successful match returns Status "Success", Details "OTP Matched".
    // Mismatch returns Status "Error", Details "OTP Mismatch" (still HTTP 200).
    if (data && data.Status === "Success" && data.Details === "OTP Matched") {
      sessionStore.delete(phone);
      return { valid: true };
    }

    // Explicit mismatch response from 2Factor -> genuine wrong OTP.
    if (data && data.Details === "OTP Mismatch") {
      return { valid: false, error: "गलत OTP" };
    }

    // Anything else (non-OK HTTP, malformed body, unexpected Status/Details) is a
    // provider-side failure, not a user input mistake — surface it distinctly.
    return { valid: false, error: "OTP सत्यापन सेवा में समस्या, दोबारा कोशिश करें" };
  } catch {
    // Network/provider failure — distinct from a genuine wrong-OTP so callers
    // can surface a "try again" message instead of blaming the user's input.
    return { valid: false, error: "OTP सत्यापन सेवा में समस्या, दोबारा कोशिश करें" };
  }
}

/** Seller login uses a fixed phone/OTP pair and never touches the SMS provider. */
export function verifySellerOtp(rawPhone: string, otp: string): { valid: boolean; error?: string } {
  const phone = normalizePhone(rawPhone);
  if (phone !== SELLER_PHONE) return { valid: false, error: "अमान्य विक्रेता नंबर" };
  return otp === SELLER_FIXED_OTP ? { valid: true } : { valid: false, error: "गलत OTP" };
}
