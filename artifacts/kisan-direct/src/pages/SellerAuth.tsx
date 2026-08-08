import { useState } from "react";
import { useSellerAuth } from "@workspace/api-client-react";
import { setSellerSession } from "../lib/utils";

interface SellerAuthProps {
  onSuccess: () => void;
}

const FIXED_SELLER_PHONE = "9999999999";
const SMS_SELLER_PHONE = "7089550147";

export function SellerAuth({ onSuccess }: SellerAuthProps) {
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [sendingOtp, setSendingOtp] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const authMutation = useSellerAuth();

  const sendOtp = async () => {
    if (phone !== SMS_SELLER_PHONE) {
      setError("इस नंबर के लिए OTP भेजने की जरूरत नहीं है");
      return;
    }
    setError("");
    setSendingOtp(true);
    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "OTP भेजने में समस्या हुई");
        return;
      }
      setOtpSent(true);
      setResendIn(30);
      const timer = window.setInterval(() => {
        setResendIn(value => {
          if (value <= 1) {
            window.clearInterval(timer);
            return 0;
          }
          return value - 1;
        });
      }, 1000);
    } catch {
      setError("OTP भेजने में समस्या हुई, दोबारा कोशिश करें");
    } finally {
      setSendingOtp(false);
    }
  };

  const login = () => {
    if (!phone || !otp) { setError("Phone और OTP दोनों डालें"); return; }
    if (phone === SMS_SELLER_PHONE && !otpSent) {
      setError("पहले OTP भेजें");
      return;
    }
    setError("");
    authMutation.mutate(
      { data: { phone, otp } },
      {
        onSuccess: () => { setSellerSession(); onSuccess(); },
        onError: (e: unknown) => {
          const message = (e as { data?: { message?: string; error?: string } })?.data;
          setError(message?.message || message?.error || "गलत Seller credentials");
        },
      }
    );
  };

  return (
    <div className="slide-up" style={{ flex: 1, display: "flex", flexDirection: "column", background: "#F7F4EF" }}>
      <div style={{ background: "linear-gradient(135deg,#1a3d1a,#2D6A2D)", padding: "48px 24px 36px" }}>
        <div style={{ fontSize: 48, marginBottom: 8 }}>🌾</div>
        <div style={{ color: "white", fontSize: 26, fontWeight: 800 }}>
          Seller <span style={{ color: "#F59E0B" }}>Dashboard</span>
        </div>
        <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 13, marginTop: 4 }}>
          Seller · KisanDirect
        </div>
      </div>

      <div style={{ flex: 1, padding: "28px 20px 40px" }}>
        <div style={{ background: "white", borderRadius: 20, padding: 24,
          boxShadow: "0 4px 20px rgba(0,0,0,0.08)", border: "1px solid #E5DDD0" }}>
          <div style={{ fontWeight: 800, fontSize: 18, color: "#1C1C1C", marginBottom: 6 }}>
            Seller Login
          </div>
          <div style={{ background: "#FEF3C7", borderRadius: 10, padding: "10px 14px", fontSize: 12,
            color: "#92400e", fontWeight: 600, marginBottom: 20 }}>
             Fixed Seller: <strong>9999999999</strong> · OTP: <strong>7089</strong><br />
             दूसरा Seller: <strong>7089550147</strong> · OTP SMS से आएगा
          </div>
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#777", marginBottom: 6 }}>Seller Phone</div>
            <input value={phone} onChange={e => {
              setPhone(e.target.value.replace(/\D/g, "").slice(0, 10));
              setOtpSent(false); setOtp(""); setError("");
            }}
              placeholder="9999999999" type="tel" inputMode="numeric" style={iSty} />
          </div>
          <div style={{ marginBottom: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#777" }}>OTP</div>
              {phone === SMS_SELLER_PHONE && (
                <button onClick={() => { if (!resendIn && !sendingOtp) void sendOtp(); }}
                  disabled={sendingOtp || resendIn > 0}
                  style={{
                    border: "none", background: "none", color: resendIn ? "#aaa" : "#1a6b1a",
                    fontFamily: "'Baloo 2', sans-serif", fontWeight: 800, fontSize: 12,
                    cursor: resendIn || sendingOtp ? "default" : "pointer",
                  }}>
                  {sendingOtp ? "भेज रहे हैं..." : resendIn ? `दोबारा भेजें (${resendIn}s)` : otpSent ? "OTP दोबारा भेजें" : "OTP भेजें"}
                </button>
              )}
            </div>
            <input value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="7089" type="tel" inputMode="numeric"
              style={{ ...iSty, letterSpacing: 8, fontSize: 20, fontWeight: 800, textAlign: "center" }} />
          </div>
          {error && <div style={{ color: "#dc2626", fontSize: 13, marginBottom: 12 }}>{error}</div>}
          <button onClick={login} disabled={authMutation.isPending} className="btn-press" style={{
            width: "100%", background: "#1a3d1a", color: "white", border: "none",
            borderRadius: 14, padding: "14px", fontFamily: "'Baloo 2', sans-serif",
            fontSize: 16, fontWeight: 700, cursor: "pointer",
          }}>
            {authMutation.isPending ? "..." : "Seller Login →"}
          </button>
        </div>
      </div>
    </div>
  );
}

const iSty: React.CSSProperties = {
  width: "100%", padding: "11px 14px", borderRadius: 12, border: "1.5px solid #E5DDD0",
  fontSize: 14, fontFamily: "'Baloo 2', sans-serif", outline: "none", color: "#1C1C1C",
  background: "white", boxSizing: "border-box",
};
