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
    <div className="slide-up" style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ background: "linear-gradient(135deg,#2D6A2D,#4A9B4A)", padding: "48px 24px 36px", flexShrink: 0 }}>
        <div style={{ fontSize: 52, marginBottom: 8 }}>🌾</div>
        <div style={{ color: "white", fontSize: 30, fontWeight: 800, letterSpacing: -0.5 }}>
          Kisan<span style={{ color: "#F59E0B" }}>Direct</span>
        </div>
        <div style={{ color: "rgba(255,255,255,0.80)", fontSize: 14, marginTop: 4, fontWeight: 500 }}>
          सीधे खेत से आपके घर तक 🏡
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "24px 20px 40px", background: "#F7F4EF" }}>
        <div style={{
          background: "white", borderRadius: 20, padding: 24,
          boxShadow: "0 4px 20px rgba(0,0,0,0.08)", border: "1px solid #E5DDD0",
        }}>
          <div style={{ fontWeight: 800, fontSize: 18, color: "#1C1C1C", marginBottom: 6 }}>
            {step === "phone" ? "Login / Register करो" : "OTP डालो"}
          </div>
          <div style={{ fontSize: 13, color: "#777", marginBottom: 20 }}>
            {step === "phone" ? "अपना phone number और details भरो" : `${phone} पर OTP भेजा गया`}
          </div>

          {step === "phone" && (
            <>
              <InputField label="आपका नाम *"
                value={name} onChange={setName} placeholder="जैसे: Ramesh Kumar" />
              <InputField label="Phone Number *"
                value={phone} onChange={v => setPhone(v.replace(/\D/g, "").slice(0, 10))}
                placeholder="10 अंकों का नंबर" type="tel" />
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#777", marginBottom: 6 }}>गांव चुनें *</div>
                <select value={village} onChange={e => setVillage(e.target.value)} style={iSty}>
                  <option value="">-- गांव select करो --</option>
                  {VILLAGES.map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
              {error && <div style={{ color: "#dc2626", fontSize: 13, marginBottom: 12 }}>{error}</div>}
              <GreenBtn onClick={sendOtp} label="OTP भेजो →" />
            </>
          )}

          {step === "otp" && (
            <>
              <div style={{
                background: "#E8F5E8", borderRadius: 12, padding: 12, fontSize: 13,
                color: "#2D6A2D", fontWeight: 600, marginBottom: 16,
              }}>
                Test OTP: <strong>1234</strong> (कोई भी 4 अंक चलेंगे)
              </div>
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#777", marginBottom: 6 }}>4-Digit OTP *</div>
                <input value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  placeholder="1234" type="tel" inputMode="numeric"
                  style={{ ...iSty, letterSpacing: 8, fontSize: 22, fontWeight: 800, textAlign: "center" }} />
              </div>
              {error && <div style={{ color: "#dc2626", fontSize: 13, marginBottom: 12 }}>{error}</div>}
              <GreenBtn onClick={login} label="Login करो ✓" loading={authMutation.isPending} />
              <button onClick={() => { setStep("phone"); setOtp(""); setError(""); }}
                style={{ background: "none", border: "none", color: "#777", fontSize: 13,
                  cursor: "pointer", fontFamily: "'Baloo 2', sans-serif", marginTop: 10,
                  display: "block", width: "100%", textAlign: "center" }}>
                ← वापस जाओ
              </button>
            </>
          )}
        </div>

        <div style={{ marginTop: 20, textAlign: "center", fontSize: 12, color: "#aaa", fontWeight: 500 }}>
          Pichor, Bamori, Datia और 7 अन्य गांवों में delivery
        </div>
      </div>
    </div>
  );
}

function InputField({ label, value, onChange, placeholder, type = "text" }: {
  label: string; value: string; onChange: (v: string) => void; placeholder: string; type?: string;
}) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: "#777", marginBottom: 6 }}>{label}</div>
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} type={type}
        style={iSty} />
    </div>
  );
}

function GreenBtn({ onClick, label, loading }: { onClick: () => void; label: string; loading?: boolean }) {
  return (
    <button onClick={onClick} disabled={loading} className="btn-press" style={{
      width: "100%", background: loading ? "#4A9B4A" : "#2D6A2D", color: "white", border: "none",
      borderRadius: 14, padding: "14px", fontFamily: "'Baloo 2', sans-serif",
      fontSize: 16, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer",
    }}>
      {loading ? "कृपया रुकें..." : label}
    </button>
  );
}

const iSty: React.CSSProperties = {
  width: "100%", padding: "11px 14px", borderRadius: 12, border: "1.5px solid #E5DDD0",
  fontSize: 14, fontFamily: "'Baloo 2', sans-serif", outline: "none", color: "#1C1C1C",
  background: "white", boxSizing: "border-box",
};
