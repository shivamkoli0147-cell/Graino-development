import { useState } from "react";
import { useCustomerAuth } from "@workspace/api-client-react";
import { setCustomerSession, setSellerSession, type CustomerSession } from "../lib/utils";
import { VillagePicker } from "../components/kisan/VillagePicker";

const SELLER_PHONE = "9999999999";
const SELLER_PASS  = "7089";

interface CustomerAuthProps {
  onSuccess: (customer: CustomerSession) => void;
  onSellerLogin?: () => void;
}

type Step = "phone" | "otp" | "village";

type RawCustomer = {
  id: number; name: string; phone: string; village: string;
  address?: string | null; lat?: number | null; lng?: number | null;
};

export function CustomerAuth({ onSuccess, onSellerLogin }: CustomerAuthProps) {
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [pendingCustomer, setPendingCustomer] = useState<RawCustomer | null>(null);

  const authMutation = useCustomerAuth();

  const goToOtp = () => {
    if (!/^\d{10}$/.test(phone)) { setError("10 अंकों का फोन नंबर डालें"); return; }
    setError("");
    setStep("otp");
  };

  const verifyOtp = () => {
    if (!otp || otp.length < 1) { setError("OTP / Password डालें"); return; }
    setError("");
    if (phone === SELLER_PHONE && otp === SELLER_PASS) {
      setSellerSession();
      onSellerLogin?.();
      return;
    }
    authMutation.mutate(
      { data: { phone, otp, name: "", village: "" } },
      {
        onSuccess: (result: unknown) => {
          const c = (result as { customer: RawCustomer }).customer;
          if (c.village && c.village.trim() !== "") {
            const session: CustomerSession = {
              id: c.id, name: c.name, phone: c.phone, village: c.village,
              address: c.address || undefined, lat: c.lat || undefined, lng: c.lng || undefined,
            };
            setCustomerSession(session);
            onSuccess(session);
          } else {
            setPendingCustomer(c);
            setStep("village");
          }
        },
        onError: () => setError("Login नहीं हो सका, दोबारा कोशिश करें"),
      }
    );
  };

  const handleVillageSelect = async (village: string) => {
    if (!pendingCustomer) return;
    await fetch(`/api/customers/${pendingCustomer.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ village }),
    }).catch(() => {});
    const session: CustomerSession = {
      id: pendingCustomer.id, name: pendingCustomer.name,
      phone: pendingCustomer.phone, village,
      address: pendingCustomer.address || undefined,
      lat: pendingCustomer.lat || undefined, lng: pendingCustomer.lng || undefined,
    };
    setCustomerSession(session);
    onSuccess(session);
  };

  return (
    <div style={{
      flex: 1, position: "relative", overflow: "hidden",
      background: "#0d2018",
    }}>
      {/* ── Background video ── */}
      <video
        autoPlay
        loop
        muted
        playsInline
        style={{
          position: "absolute", inset: 0,
          width: "100%", height: "100%",
          objectFit: "cover",
          zIndex: 0,
        }}
      >
        <source src="/bg-video.mp4" type="video/mp4" />
      </video>

      {/* ── Dark gradient overlay ── */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none", zIndex: 1,
        background: "linear-gradient(180deg, rgba(13,32,24,0.3) 0%, rgba(13,32,24,0.55) 50%, rgba(13,32,24,0.92) 100%)",
      }} />

      {/* ── Bottom floating card ── */}
      <div style={{
        position: "absolute", zIndex: 10,
        bottom: 28, left: 12, right: 12,
        borderRadius: "24px 24px 18px 18px",
        background: "#1a2e22",
        border: "1px solid rgba(255,255,255,0.08)",
        boxShadow: "0 -4px 32px rgba(0,0,0,0.5), 0 2px 24px rgba(0,0,0,0.3)",
        padding: "16px 20px 24px",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
      }}>
        {/* Drag handle bar */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.2)" }} />
        </div>

        {step === "phone" && (
          <>
            <div style={{ marginBottom: 18 }}>
              <div style={{
                fontFamily: "'Baloo 2', sans-serif", fontWeight: 800,
                fontSize: 22, color: "white",
              }}>
                अपना नंबर डालें
              </div>
              <div style={{
                fontSize: 13, color: "rgba(255,255,255,0.5)",
                fontFamily: "'Baloo 2', sans-serif", marginTop: 3,
              }}>
                Login या Register करें
              </div>
            </div>

            {/* Phone input */}
            <div style={{
              position: "relative",
              background: "rgba(255,255,255,0.06)",
              border: "1.5px solid rgba(255,255,255,0.12)",
              borderRadius: 14, overflow: "hidden", marginBottom: 16,
            }}>
              <div style={{
                position: "absolute", top: 0, left: 0, bottom: 0,
                width: 72,
                display: "flex", alignItems: "center", justifyContent: "center",
                background: "#F59E0B",
                borderRight: "2px solid rgba(0,0,0,0.12)",
                fontFamily: "'Baloo 2', sans-serif", fontWeight: 900,
                fontSize: 16, color: "#1B4332", letterSpacing: 0.5,
                zIndex: 1,
              }}>+91</div>
              <input
                value={phone}
                onChange={e => { setPhone(e.target.value.replace(/\D/g, "").slice(0, 10)); setError(""); }}
                onKeyDown={e => e.key === "Enter" && goToOtp()}
                type="tel" inputMode="numeric"
                placeholder="10 अंकों का नंबर"
                autoFocus
                style={{
                  display: "block", width: "100%", border: "none", outline: "none",
                  paddingTop: 17, paddingBottom: 17,
                  paddingLeft: 84, paddingRight: 14,
                  fontSize: 18, boxSizing: "border-box",
                  fontFamily: "'Baloo 2', sans-serif",
                  fontWeight: 700, letterSpacing: 1.5,
                  background: "transparent", color: "white",
                }}
              />
            </div>

            {error && (
              <div style={{
                color: "#f87171", fontSize: 12, marginBottom: 12,
                fontFamily: "'Baloo 2', sans-serif", fontWeight: 600,
              }}>⚠ {error}</div>
            )}

            <GoldBtn onClick={goToOtp} label="आगे बढ़ें →" />
          </>
        )}

        {step === "otp" && (
          <>
            <div style={{ marginBottom: 18 }}>
              <div style={{
                fontFamily: "'Baloo 2', sans-serif", fontWeight: 800,
                fontSize: 22, color: "white",
              }}>OTP डालें</div>
              <div style={{
                fontSize: 13, color: "rgba(255,255,255,0.5)",
                fontFamily: "'Baloo 2', sans-serif", marginTop: 3,
              }}>
                {phone === SELLER_PHONE ? "Seller password डालें" : `+91 ${phone} पर OTP भेजा गया`}
              </div>
            </div>

            <input
              value={otp}
              onChange={e => { setOtp(e.target.value.replace(/\D/g, "").slice(0, 6)); setError(""); }}
              onKeyDown={e => e.key === "Enter" && verifyOtp()}
              type="tel" inputMode="numeric"
              placeholder="• • • •"
              autoFocus
              style={{
                width: "100%", boxSizing: "border-box",
                background: "rgba(255,255,255,0.06)",
                border: "1.5px solid rgba(255,255,255,0.12)",
                borderRadius: 14, padding: "14px", outline: "none",
                textAlign: "center", letterSpacing: 20, fontSize: 28,
                fontWeight: 800, fontFamily: "'Baloo 2', sans-serif", color: "white",
                marginBottom: 16,
              }}
            />

            {error && (
              <div style={{
                color: "#f87171", fontSize: 12, marginBottom: 12,
                fontFamily: "'Baloo 2', sans-serif", fontWeight: 600,
              }}>⚠ {error}</div>
            )}

            <GoldBtn onClick={verifyOtp} label="Login करें ✓" loading={authMutation.isPending} />

            <button
              onClick={() => { setStep("phone"); setOtp(""); setError(""); }}
              style={{
                background: "none", border: "none",
                color: "rgba(255,255,255,0.4)",
                fontSize: 13, cursor: "pointer",
                fontFamily: "'Baloo 2', sans-serif",
                marginTop: 14, display: "block", width: "100%", textAlign: "center",
              }}
            >
              ← वापस जाएं
            </button>
          </>
        )}
      </div>

      {/* ── Village picker overlay (step "village") ── */}
      {step === "village" && pendingCustomer && (
        <VillagePicker
          currentVillage=""
          onSelect={handleVillageSelect}
          onClose={() => {}}
        />
      )}
    </div>
  );
}

function GoldBtn({ onClick, label, loading }: { onClick: () => void; label: string; loading?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="btn-press"
      style={{
        width: "100%",
        background: loading ? "rgba(245,158,11,0.45)" : "linear-gradient(135deg,#F59E0B,#D97706)",
        color: "#1B4332", border: "none",
        borderRadius: 16, padding: "15px",
        fontFamily: "'Baloo 2', sans-serif",
        fontSize: 16, fontWeight: 800,
        cursor: loading ? "not-allowed" : "pointer",
        boxShadow: loading ? "none" : "0 4px 20px rgba(245,158,11,0.35)",
        transition: "opacity 0.15s",
      }}
    >
      {loading ? "कृपया रुकें..." : label}
    </button>
  );
}
