// ─────────────────────────────────────────────────────────────────────────────
// otpService.ts — Real OTP delivery via Fast2SMS (https://www.fast2sms.com/otp-sms/)
// Fixed seller number (9999999999) never goes through SMS — its OTP is a
// static "7089" checked directly in the auth route.
// ─────────────────────────────────────────────────────────────────────────────

export const SELLER_PHONE = "9999999999";
export const SELLER_FIXED_OTP = "7089";

const OTP_TTL_MS = 5 * 60 * 1000; // 5 minutes
const otpStore = new Map<string, { otp: string; expiresAt: number }>();

function generateOtp(): string {
  return String(Math.floor(1000 + Math.random() * 9000)); // 4-digit numeric
}

/**
 * Generates an OTP for `phone`, stores it, and sends it via Fast2SMS.
 * Returns { success, error? }. Never throws.
 */
export async function sendOtp(phone: string): Promise<{ success: boolean; error?: string }> {
  if (phone === SELLER_PHONE) {
    // Fixed credential login — no SMS needed.
    return { success: true };
  }

  const apiKey = process.env.FAST2SMS_API_KEY;
  if (!apiKey) {
    return { success: false, error: "SMS service not configured (missing FAST2SMS_API_KEY)" };
  }

  const otp = generateOtp();
  otpStore.set(phone, { otp, expiresAt: Date.now() + OTP_TTL_MS });

  try {
    const url = new URL("https://www.fast2sms.com/dev/bulkV2");
    url.searchParams.set("authorization", apiKey);
    url.searchParams.set("variables_values", otp);
    url.searchParams.set("route", "otp");
    url.searchParams.set("numbers", phone);

    const res = await fetch(url.toString(), { method: "GET" });
    const data = await res.json().catch(() => null);

    if (!res.ok || (data && data.return === false)) {
      otpStore.delete(phone);
      let msg: unknown = data?.message;
      if (Array.isArray(msg)) msg = msg[0];
      if (!msg) msg = `Fast2SMS error (${res.status})`;
      return { success: false, error: String(msg) };
    }
    return { success: true };
  } catch (e) {
    otpStore.delete(phone);
    return { success: false, error: String(e) };
  }
}

/**
 * Verifies `otp` for `phone`. One-time use — deletes the entry on success.
 */
export function verifyOtp(phone: string, otp: string): { valid: boolean; error?: string } {
  if (phone === SELLER_PHONE) {
    return otp === SELLER_FIXED_OTP ? { valid: true } : { valid: false, error: "गलत OTP" };
  }

  const entry = otpStore.get(phone);
  if (!entry) return { valid: false, error: "पहले OTP भेजें" };
  if (Date.now() > entry.expiresAt) {
    otpStore.delete(phone);
    return { valid: false, error: "OTP expire हो गया, दोबारा भेजें" };
  }
  if (entry.otp !== otp) return { valid: false, error: "गलत OTP" };

  otpStore.delete(phone);
  return { valid: true };
}
