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

const VILLAGE_PILLS = [
  "Pichor", "Bamori", "Datia", "Sirsod", "Lahar", "Dabra", "Mungaoli", "Khategaon",
];

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
    if (!otp || otp.length < 1) { setError("OTP डालें"); return; }
    setError("");
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
      background: "#0d2018", display: "flex", flexDirection: "column",
    }}>
      {/* CSS for particle + pill animations */}
      <style>{`
        @keyframes floatUp {
          0% { transform: translateY(0) scale(1); opacity: var(--op); }
          50% { transform: translateY(-45vh) scale(1.1); opacity: calc(var(--op) * 0.8); }
          100% { transform: translateY(-90vh) scale(0.8); opacity: 0; }
        }
        @keyframes pillScroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .auth-particle {
          position: absolute;
          border-radius: 50%;
          animation: floatUp linear infinite;
          bottom: -20px;
          pointer-events: none;
        }
        .pill-track {
          display: flex;
          gap: 8px;
          animation: pillScroll 18s linear infinite;
          width: max-content;
        }
      `}</style>

      {/* ── Floating grain particles ── */}
      {AUTH_PARTICLES.map((p, i) => (
        <div key={i} className="auth-particle" style={{
          left: p.x + "%",
          width: p.size, height: p.size,
          animationDuration: p.dur + "s",
          animationDelay: p.delay + "s",
          background: p.gold
            ? `rgba(245,158,11,${p.opacity})`
            : `rgba(74,155,74,${p.opacity})`,
          borderRadius: p.size > 10 ? "30%" : "50%",
          "--op": p.opacity,
        } as React.CSSProperties} />
      ))}

      {/* ── Dark gradient overlay ── */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none", zIndex: 1,
        background: "linear-gradient(180deg, rgba(13,32,24,0.3) 0%, rgba(13,32,24,0.7) 55%, rgba(13,32,24,0.97) 100%)",
      }} />

      {/* ── Hero top 60% ── */}
      <div style={{
        position: "relative", zIndex: 2,
        flex: "0 0 60%",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        paddingTop: 32, overflow: "hidden",
      }}>
        {/* Logo + tagline (UNCHANGED) */}
        <div style={{ textAlign: "center", marginBottom: 24 }}>
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
        </div>

        {/* ── Infinite scrolling village pills strip ── */}
        <div style={{
          width: "100%",
          overflow: "hidden",
          position: "relative",
          WebkitMaskImage: "linear-gradient(to right, transparent 0%, black 12%, black 88%, transparent 100%)",
          maskImage: "linear-gradient(to right, transparent 0%, black 12%, black 88%, transparent 100%)",
        }}>
          <div className="pill-track">
            {/* Duplicated list for seamless loop */}
            {[...VILLAGE_PILLS, ...VILLAGE_PILLS].map((v, i) => (
              <span key={i} style={{
                flexShrink: 0,
                background: "rgba(245,158,11,0.12)",
                border: "1px solid rgba(245,158,11,0.28)",
                borderRadius: 20, padding: "5px 14px",
                fontSize: 12, fontWeight: 700,
                color: "rgba(245,158,11,0.9)",
                fontFamily: "'Baloo 2', sans-serif",
                whiteSpace: "nowrap",
              }}>📍 {v}</span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Bottom floating card ── */}
      <div style={{
        position: "relative", zIndex: 10,
        flex: "0 0 auto",
        margin: "0 10px 10px",
        borderRadius: "24px 24px 18px 18px",
        background: "#1a2e22",
        border: "1px solid rgba(255,255,255,0.08)",
        boxShadow: "0 -4px 32px rgba(0,0,0,0.5), 0 2px 24px rgba(0,0,0,0.3)",
        padding: "16px 20px 28px",
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
                Login या Register करें — बिल्कुल free
              </div>
            </div>

            {/* Phone input */}
            <div style={{
              display: "flex", alignItems: "center",
              background: "rgba(255,255,255,0.06)",
              border: "1.5px solid rgba(255,255,255,0.12)",
              borderRadius: 14, overflow: "hidden", marginBottom: 16,
            }}>
              <div style={{
                padding: "13px 16px",
                background: "rgba(255,255,255,0.1)",
                borderRight: "1.5px solid rgba(255,255,255,0.25)",
                fontFamily: "'Baloo 2', sans-serif", fontWeight: 800,
                fontSize: 15, color: "rgba(255,255,255,0.92)", whiteSpace: "nowrap",
                letterSpacing: 0.5,
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

            <div style={{
              textAlign: "center", marginTop: 14, fontSize: 12,
              color: "rgba(255,255,255,0.35)", fontFamily: "'Baloo 2', sans-serif",
            }}>
              📱 Rohit आपको OTP बताएंगे
            </div>
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
                +91 {phone} पर Rohit से OTP लें
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

const AUTH_PARTICLES = Array.from({ length: 28 }, (_, i) => ({
  x: Math.random() * 100,
  size: Math.random() * 12 + 5,
  dur: Math.random() * 6 + 5,
  delay: Math.random() * 5,
  gold: i % 3 === 0,
  opacity: Math.random() * 0.15 + 0.06,
}));
