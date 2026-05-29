import { useState } from "react";
import { useCustomerAuth } from "@workspace/api-client-react";
import { setCustomerSession, type CustomerSession } from "../lib/utils";
import { VillagePicker } from "../components/kisan/VillagePicker";

interface CustomerAuthProps {
  onSuccess: (customer: CustomerSession) => void;
}

type Step = "phone" | "otp" | "village";

type RawCustomer = {
  id: number; name: string; phone: string; village: string;
  address?: string | null; lat?: number | null; lng?: number | null;
};

export function CustomerAuth({ onSuccess }: CustomerAuthProps) {
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
    if (!/^\d{4}$/.test(otp)) { setError("4 अंकों का OTP डालें"); return; }
    setError("");
    authMutation.mutate(
      { data: { phone, otp } },
      {
        onSuccess: (result: unknown) => {
          const c = (result as { customer: RawCustomer }).customer;
          // If customer already has a village, go straight to home
          if (c.village && c.village.trim() !== "") {
            const session: CustomerSession = {
              id: c.id, name: c.name, phone: c.phone, village: c.village,
              address: c.address || undefined, lat: c.lat || undefined, lng: c.lng || undefined,
            };
            setCustomerSession(session);
            onSuccess(session);
          } else {
            // New customer or no village — show village picker
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
    // Save village to DB
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
    <div style={{ flex: 1, position: "relative", overflow: "hidden", background: "#0f2418" }}>

      {/* ── Animated floating grain particles ── */}
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }}>
        {AUTH_PARTICLES.map((p, i) => (
          <div key={i} className="grain-particle" style={{
            left: p.x + "%",
            width: p.size, height: p.size,
            animationDuration: p.dur + "s",
            animationDelay: p.delay + "s",
            background: p.gold
              ? `rgba(245,158,11,${p.opacity})`
              : `rgba(74,155,74,${p.opacity})`,
            borderRadius: p.size > 10 ? "30%" : "50%",
            position: "absolute", bottom: "-20px",
          }} />
        ))}
      </div>

      {/* ── Dark gradient overlay ── */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        background: "linear-gradient(180deg, rgba(15,36,24,0.4) 0%, rgba(15,36,24,0.75) 60%, rgba(15,36,24,0.95) 100%)",
      }} />

      {/* ── Hero content (top 60%) ── */}
      <div style={{
        position: "relative", zIndex: 2,
        height: "62%",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        padding: "32px 24px 0",
        pointerEvents: "none",
      }}>
        <div className="splash-fade" style={{ textAlign: "center" }}>
          <div style={{
            fontSize: 54, lineHeight: 1, marginBottom: 12,
            filter: "drop-shadow(0 4px 20px rgba(245,158,11,0.7))",
          }}>🌾</div>
          <div style={{
            fontFamily: "'Baloo 2', sans-serif", fontWeight: 800,
            fontSize: 44, color: "white", lineHeight: 1, letterSpacing: -1,
          }}>
            Grai<span style={{ color: "#F59E0B" }}>no</span>
          </div>
          <div style={{
            fontFamily: "'Baloo 2', sans-serif", fontSize: 13,
            color: "rgba(212,175,55,0.85)", fontWeight: 600,
            marginTop: 6, letterSpacing: 0.5,
          }}>
            हर किसान, हमारा वादा
          </div>
          <div style={{
            marginTop: 14, display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap",
          }}>
            {["Pichor", "Bamori", "Datia", "और 7 गांव"].map(v => (
              <span key={v} style={{
                background: "rgba(245,158,11,0.15)", border: "1px solid rgba(245,158,11,0.3)",
                borderRadius: 20, padding: "3px 10px", fontSize: 11,
                color: "rgba(245,158,11,0.9)", fontFamily: "'Baloo 2',sans-serif", fontWeight: 600,
              }}>{v}</span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Bottom sheet ── */}
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 10,
        background: "white",
        borderRadius: "28px 28px 0 0",
        padding: "20px 22px 36px",
        boxShadow: "0 -8px 40px rgba(0,0,0,0.25)",
      }}>
        {/* Drag handle */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 18 }}>
          <div style={{ width: 44, height: 4, borderRadius: 2, background: "#E5DDD0" }} />
        </div>

        {step === "phone" && (
          <>
            <div style={{ marginBottom: 6 }}>
              <div style={{ fontFamily: "'Baloo 2', sans-serif", fontWeight: 800, fontSize: 20, color: "#1C1C1C" }}>
                अपना नंबर डालें
              </div>
              <div style={{ fontSize: 13, color: "#888", fontFamily: "'Baloo 2', sans-serif", marginTop: 2 }}>
                Login या Register करें — बिल्कुल free
              </div>
            </div>

            <div style={{ marginTop: 18, marginBottom: 16 }}>
              <div style={{
                display: "flex", alignItems: "center",
                border: "1.5px solid #E5DDD0", borderRadius: 14,
                overflow: "hidden", background: "#FAFAF8",
              }}>
                <div style={{
                  padding: "13px 14px", background: "#F4F6F3",
                  borderRight: "1.5px solid #E5DDD0",
                  fontFamily: "'Baloo 2', sans-serif", fontWeight: 700,
                  fontSize: 15, color: "#555", whiteSpace: "nowrap",
                }}>+91</div>
                <input
                  value={phone}
                  onChange={e => { setPhone(e.target.value.replace(/\D/g, "").slice(0, 10)); setError(""); }}
                  onKeyDown={e => e.key === "Enter" && goToOtp()}
                  type="tel" inputMode="numeric"
                  placeholder="10 अंकों का नंबर"
                  autoFocus
                  style={{
                    flex: 1, border: "none", outline: "none",
                    padding: "13px 14px", fontSize: 18,
                    fontFamily: "'Baloo 2', sans-serif",
                    fontWeight: 700, letterSpacing: 1.5,
                    background: "transparent", color: "#1C1C1C",
                  }}
                />
              </div>
              {error && (
                <div style={{ color: "#dc2626", fontSize: 12, marginTop: 8,
                  fontFamily: "'Baloo 2', sans-serif", fontWeight: 600 }}>
                  ⚠ {error}
                </div>
              )}
            </div>

            <GoldBtn onClick={goToOtp} label="आगे बढ़ें →" />

            <div style={{ textAlign: "center", marginTop: 14, fontSize: 12,
              color: "#aaa", fontFamily: "'Baloo 2', sans-serif" }}>
              📱 Rohit आपको OTP बताएंगे
            </div>
          </>
        )}

        {step === "otp" && (
          <>
            <div style={{ marginBottom: 6 }}>
              <div style={{ fontFamily: "'Baloo 2', sans-serif", fontWeight: 800, fontSize: 20, color: "#1C1C1C" }}>
                OTP डालें
              </div>
              <div style={{ fontSize: 13, color: "#888", fontFamily: "'Baloo 2', sans-serif", marginTop: 2 }}>
                +91 {phone} पर Rohit से OTP लें
              </div>
            </div>

            <div style={{ marginTop: 18, marginBottom: 16 }}>
              <input
                value={otp}
                onChange={e => { setOtp(e.target.value.replace(/\D/g, "").slice(0, 4)); setError(""); }}
                onKeyDown={e => e.key === "Enter" && verifyOtp()}
                type="tel" inputMode="numeric"
                placeholder="• • • •"
                autoFocus
                style={{
                  width: "100%", boxSizing: "border-box",
                  border: "1.5px solid #E5DDD0", borderRadius: 14,
                  padding: "14px", outline: "none", background: "#FAFAF8",
                  textAlign: "center", letterSpacing: 20, fontSize: 28,
                  fontWeight: 800, fontFamily: "'Baloo 2', sans-serif", color: "#1C1C1C",
                }}
              />
              {error && (
                <div style={{ color: "#dc2626", fontSize: 12, marginTop: 8,
                  fontFamily: "'Baloo 2', sans-serif", fontWeight: 600 }}>
                  ⚠ {error}
                </div>
              )}
            </div>

            <GoldBtn onClick={verifyOtp} label="Login करें ✓" loading={authMutation.isPending} />

            <button
              onClick={() => { setStep("phone"); setOtp(""); setError(""); }}
              style={{
                background: "none", border: "none", color: "#888",
                fontSize: 13, cursor: "pointer", fontFamily: "'Baloo 2', sans-serif",
                marginTop: 14, display: "block", width: "100%", textAlign: "center",
              }}
            >
              ← वापस जाएं
            </button>
          </>
        )}
      </div>

      {/* ── Village picker overlay (step === "village") ── */}
      {step === "village" && pendingCustomer && (
        <VillagePicker
          currentVillage=""
          onSelect={handleVillageSelect}
          onClose={() => {
            // Don't allow closing without selecting village for new customers
            // just ignore close — they must pick a village
          }}
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
        background: loading ? "rgba(245,158,11,0.55)" : "linear-gradient(135deg,#F59E0B,#D97706)",
        color: "#1B4332", border: "none",
        borderRadius: 16, padding: "15px",
        fontFamily: "'Baloo 2', sans-serif",
        fontSize: 16, fontWeight: 800,
        cursor: loading ? "not-allowed" : "pointer",
        boxShadow: loading ? "none" : "0 4px 16px rgba(245,158,11,0.4)",
        transition: "opacity 0.15s",
      }}
    >
      {loading ? "कृपया रुकें..." : label}
    </button>
  );
}

const AUTH_PARTICLES = Array.from({ length: 28 }, (_, i) => ({
  x: Math.random() * 100,
  size: Math.random() * 12 + 5,
  dur: Math.random() * 6 + 5,
  delay: Math.random() * 5,
  gold: i % 3 === 0,
  opacity: Math.random() * 0.15 + 0.06,
}));
