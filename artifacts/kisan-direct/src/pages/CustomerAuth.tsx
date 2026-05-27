import { useState } from "react";
import { useCustomerAuth } from "@workspace/api-client-react";
import { setCustomerSession, VILLAGES, type CustomerSession } from "../lib/utils";

interface CustomerAuthProps {
  onSuccess: (customer: CustomerSession) => void;
}

export function CustomerAuth({ onSuccess }: CustomerAuthProps) {
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [name, setName] = useState("");
  const [village, setVillage] = useState("");
  const [error, setError] = useState("");

  const authMutation = useCustomerAuth();

  const sendOtp = () => {
    if (!/^\d{10}$/.test(phone)) { setError("10 अंकों का फोन नंबर डालें"); return; }
    if (!name.trim()) { setError("अपना नाम डालें"); return; }
    if (!village) { setError("गांव चुनें"); return; }
    setError("");
    setStep("otp");
  };

  const login = () => {
    if (!/^\d{4}$/.test(otp)) { setError("4 अंकों का OTP डालें"); return; }
    setError("");
    authMutation.mutate(
      { data: { phone, otp, name: name.trim(), village } },
      {
        onSuccess: (result) => {
          const c = result.customer as { id: number; name: string; phone: string; village: string; address?: string | null; lat?: number | null; lng?: number | null };
          const session = {
            id: c.id, name: c.name, phone: c.phone, village: c.village,
            address: c.address || undefined,
            lat: c.lat || undefined,
            lng: c.lng || undefined,
          };
          setCustomerSession(session);
          onSuccess(session);
        },
        onError: () => setError("Login नहीं हो सका, दोबारा कोशिश करें"),
      }
    );
  };

  return (
    <div style={{ flex: 1, position: "relative", overflow: "hidden", background: "#0f2418" }}>
      {/* Animated floating grain particles */}
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
            position: "absolute",
            bottom: "-20px",
          }} />
        ))}
      </div>

      {/* Dark overlay */}
      <div style={{
        position: "absolute", inset: 0,
        background: "linear-gradient(180deg, rgba(15,36,24,0.55) 0%, rgba(15,36,24,0.85) 100%)",
        pointerEvents: "none",
      }} />

      {/* Content */}
      <div style={{
        position: "relative", zIndex: 2,
        height: "100%", display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        padding: "24px 20px",
        overflowY: "auto",
      }}>
        {/* Logo */}
        <div className="splash-fade" style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ fontSize: 44, lineHeight: 1, marginBottom: 8,
            filter: "drop-shadow(0 2px 12px rgba(245,158,11,0.6))" }}>🌾</div>
          <div style={{
            fontFamily: "'Baloo 2', sans-serif", fontWeight: 800, fontSize: 38,
            color: "white", lineHeight: 1, letterSpacing: -1,
          }}>
            Grai<span style={{ color: "#F59E0B" }}>no</span>
          </div>
          <div style={{
            fontFamily: "'Baloo 2', sans-serif", fontSize: 12,
            color: "rgba(212,175,55,0.9)", fontWeight: 600, marginTop: 4, letterSpacing: 0.5,
          }}>
            हर किसान, हमारा वादा
          </div>
        </div>

        {/* Auth card */}
        <div className="slide-up" style={{
          background: "rgba(255,255,255,0.10)",
          backdropFilter: "blur(18px)",
          WebkitBackdropFilter: "blur(18px)",
          borderRadius: 24,
          padding: "24px 22px",
          width: "100%",
          maxWidth: 360,
          border: "1px solid rgba(255,255,255,0.15)",
          boxShadow: "0 8px 40px rgba(0,0,0,0.35)",
        }}>
          <div style={{
            fontFamily: "'Baloo 2', sans-serif", fontWeight: 800,
            fontSize: 17, color: "white", marginBottom: 4,
          }}>
            {step === "phone" ? "अपना नंबर डालें" : "OTP डालें"}
          </div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", marginBottom: 20, fontFamily: "'Baloo 2', sans-serif" }}>
            {step === "phone" ? "Login या Register करें" : `${phone} पर OTP भेजा गया`}
          </div>

          {step === "phone" && (
            <>
              <GlassInput label="आपका नाम *" value={name}
                onChange={setName} placeholder="जैसे: Ramesh Kumar" />
              <GlassInput label="Phone Number *" value={phone}
                onChange={v => setPhone(v.replace(/\D/g, "").slice(0, 10))}
                placeholder="10 अंकों का नंबर" type="tel" />

              <div style={{ marginBottom: 16 }}>
                <div style={labelSty}>गांव चुनें *</div>
                <select value={village} onChange={e => setVillage(e.target.value)} style={glassSty}>
                  <option value="" style={{ background: "#1B4332", color: "white" }}>-- गांव select करो --</option>
                  {VILLAGES.map(v => (
                    <option key={v} value={v} style={{ background: "#1B4332", color: "white" }}>{v}</option>
                  ))}
                </select>
              </div>

              {error && <div style={{ color: "#fca5a5", fontSize: 12, marginBottom: 12,
                fontFamily: "'Baloo 2', sans-serif", fontWeight: 600 }}>{error}</div>}

              <GoldBtn onClick={sendOtp} label="आगे बढ़ें →" />
            </>
          )}

          {step === "otp" && (
            <>
              <div style={{
                background: "rgba(245,158,11,0.15)", borderRadius: 12, padding: "10px 14px",
                fontSize: 12, color: "#FCD34D", fontWeight: 600, marginBottom: 16,
                fontFamily: "'Baloo 2', sans-serif", border: "1px solid rgba(245,158,11,0.25)",
              }}>
                Test OTP: <strong>1234</strong> (कोई भी 4 अंक चलेंगे)
              </div>

              <div style={{ marginBottom: 16 }}>
                <div style={labelSty}>4-Digit OTP *</div>
                <input value={otp}
                  onChange={e => setOtp(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  placeholder="1234" type="tel" inputMode="numeric"
                  style={{ ...glassSty, letterSpacing: 12, fontSize: 24, fontWeight: 800, textAlign: "center" }} />
              </div>

              {error && <div style={{ color: "#fca5a5", fontSize: 12, marginBottom: 12,
                fontFamily: "'Baloo 2', sans-serif", fontWeight: 600 }}>{error}</div>}

              <GoldBtn onClick={login} label="Login करें ✓" loading={authMutation.isPending} />
              <button onClick={() => { setStep("phone"); setOtp(""); setError(""); }}
                style={{
                  background: "none", border: "none", color: "rgba(255,255,255,0.5)",
                  fontSize: 13, cursor: "pointer", fontFamily: "'Baloo 2', sans-serif",
                  marginTop: 12, display: "block", width: "100%", textAlign: "center",
                }}>
                ← वापस जाएं
              </button>
            </>
          )}
        </div>

        {/* Bottom note */}
        <div style={{
          marginTop: 20, textAlign: "center", fontSize: 12,
          color: "rgba(255,255,255,0.35)", fontFamily: "'Baloo 2', sans-serif", fontWeight: 500,
        }}>
          नया हैं? अभी जुड़ें — Pichor, Bamori और 8 गांवों में delivery
        </div>
      </div>
    </div>
  );
}

function GlassInput({ label, value, onChange, placeholder, type = "text" }: {
  label: string; value: string; onChange: (v: string) => void; placeholder: string; type?: string;
}) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={labelSty}>{label}</div>
      <input value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder} type={type} style={glassSty} />
    </div>
  );
}

function GoldBtn({ onClick, label, loading }: { onClick: () => void; label: string; loading?: boolean }) {
  return (
    <button onClick={onClick} disabled={loading} className="btn-press" style={{
      width: "100%",
      background: loading ? "rgba(245,158,11,0.6)" : "linear-gradient(135deg,#F59E0B,#D97706)",
      color: "#1B4332", border: "none",
      borderRadius: 14, padding: "14px",
      fontFamily: "'Baloo 2', sans-serif",
      fontSize: 16, fontWeight: 800, cursor: loading ? "not-allowed" : "pointer",
      boxShadow: "0 4px 16px rgba(245,158,11,0.35)",
    }}>
      {loading ? "कृपया रुकें..." : label}
    </button>
  );
}

const labelSty: React.CSSProperties = {
  fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.6)",
  marginBottom: 6, fontFamily: "'Baloo 2', sans-serif",
  textTransform: "uppercase", letterSpacing: 0.5,
};

const glassSty: React.CSSProperties = {
  width: "100%", padding: "12px 14px", borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.18)",
  fontSize: 14, fontFamily: "'Baloo 2', sans-serif", outline: "none",
  color: "white", background: "rgba(255,255,255,0.08)", boxSizing: "border-box",
};

const AUTH_PARTICLES = Array.from({ length: 28 }, (_, i) => ({
  x: Math.random() * 100,
  size: Math.random() * 12 + 5,
  dur: Math.random() * 6 + 5,
  delay: Math.random() * 5,
  gold: i % 3 === 0,
  opacity: Math.random() * 0.15 + 0.06,
}));
