import { useState } from "react";
import { setCustomerSession, clearCustomerSession, type CustomerSession } from "../lib/utils";

interface CustomerProfileProps {
  customer: CustomerSession;
  onUpdate: (c: CustomerSession) => void;
  onLogout: () => void;
  onClose: () => void;
  onGoSeller: () => void;
}

export function CustomerProfile({ customer, onUpdate, onLogout, onClose, onGoSeller }: CustomerProfileProps) {
  const [name, setName] = useState(customer.name);
  const [address, setAddress] = useState(customer.address || "");
  const [locating, setLocating] = useState(false);
  const [locErr, setLocErr] = useState("");
  const [saved, setSaved] = useState(false);
  const [sellerTaps, setSellerTaps] = useState(0);

  const handleSave = () => {
    const updated: CustomerSession = { ...customer, name: name.trim() || customer.name, address: address.trim() };
    setCustomerSession(updated);
    onUpdate(updated);
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  };

  const useLocation = () => {
    if (!navigator.geolocation) { setLocErr("इस browser में location support नहीं है"); return; }
    setLocating(true);
    setLocErr("");
    navigator.geolocation.getCurrentPosition(
      async pos => {
        const { latitude, longitude } = pos.coords;
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
            { headers: { "Accept-Language": "hi,en" } }
          );
          const data = await res.json() as {
            display_name?: string;
            address?: { village?: string; town?: string; city?: string; county?: string; state_district?: string; state?: string }
          };
          const a = data.address || {};
          const short = [a.village || a.town || a.city, a.county || a.state_district, a.state]
            .filter(Boolean).join(", ");
          setAddress(short || data.display_name || `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
        } catch {
          setAddress(`${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
        }
        setLocating(false);
      },
      err => {
        setLocErr(err.code === 1 ? "Location access deny हो गया। Settings में allow करें।" : "Location नहीं मिला, फिर try करें");
        setLocating(false);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const handleSellerTap = () => {
    const next = sellerTaps + 1;
    setSellerTaps(next);
    if (next >= 5) { setSellerTaps(0); onGoSeller(); }
  };

  const initial = (customer.name || "?")[0].toUpperCase();

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)",
        zIndex: 900, backdropFilter: "blur(2px)",
      }} />

      {/* Panel */}
      <div style={{
        position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)",
        width: "100%", maxWidth: 390, zIndex: 901,
        background: "white", borderRadius: "24px 24px 0 0",
        boxShadow: "0 -8px 40px rgba(0,0,0,0.2)",
        display: "flex", flexDirection: "column",
        maxHeight: "88vh", overflowY: "auto",
      }}>
        {/* Handle */}
        <div style={{ display: "flex", justifyContent: "center", padding: "12px 0 4px" }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: "#E5DDD0" }} />
        </div>

        <div style={{ padding: "8px 20px 32px" }}>
          {/* Avatar */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 20 }}>
            <div style={{
              width: 72, height: 72, borderRadius: "50%",
              background: "linear-gradient(135deg,#2D6A2D,#4A9B4A)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 30, color: "white", fontWeight: 800, marginBottom: 8,
            }}>{initial}</div>
            <div style={{ fontWeight: 800, fontSize: 18, color: "#1C1C1C" }}>{customer.name}</div>
            <div style={{ fontSize: 13, color: "#777", marginTop: 2 }}>📱 {customer.phone} • 🏘 {customer.village}</div>
          </div>

          {/* Name */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#555", marginBottom: 5 }}>आपका नाम</div>
            <input
              value={name} onChange={e => setName(e.target.value)}
              placeholder="अपना पूरा नाम लिखें"
              style={{
                width: "100%", boxSizing: "border-box",
                border: "1.5px solid #E5DDD0", borderRadius: 12,
                padding: "11px 14px", fontFamily: "'Baloo 2',sans-serif",
                fontSize: 15, outline: "none", background: "#FAFAF8",
              }}
            />
          </div>

          {/* Address */}
          <div style={{ marginBottom: 6 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#555", marginBottom: 5 }}>
              Delivery Address
            </div>
            <div style={{ position: "relative" }}>
              <textarea
                value={address} onChange={e => setAddress(e.target.value)}
                placeholder="घर का पता, गली, मोहल्ला..."
                rows={3}
                style={{
                  width: "100%", boxSizing: "border-box",
                  border: "1.5px solid #E5DDD0", borderRadius: 12,
                  padding: "11px 14px", fontFamily: "'Baloo 2',sans-serif",
                  fontSize: 14, outline: "none", background: "#FAFAF8",
                  resize: "none", lineHeight: 1.5,
                }}
              />
            </div>
          </div>

          {/* Location button */}
          <button onClick={useLocation} disabled={locating} style={{
            width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            background: locating ? "#F0EDE8" : "#E8F5E8", color: locating ? "#999" : "#2D6A2D",
            border: "none", borderRadius: 12, padding: "10px 0",
            fontFamily: "'Baloo 2',sans-serif", fontWeight: 700, fontSize: 13,
            cursor: locating ? "default" : "pointer", marginBottom: 6,
          }}>
            <span style={{ fontSize: 16 }}>{locating ? "⏳" : "📍"}</span>
            {locating ? "Location मिल रहा है..." : "Current Location Use करें"}
          </button>
          {locErr && (
            <div style={{ fontSize: 12, color: "#dc2626", marginBottom: 10, paddingLeft: 4 }}>{locErr}</div>
          )}

          {/* Save */}
          <button onClick={handleSave} style={{
            width: "100%", background: saved ? "#4A9B4A" : "#2D6A2D", color: "white",
            border: "none", borderRadius: 14, padding: "13px 0",
            fontFamily: "'Baloo 2',sans-serif", fontWeight: 800, fontSize: 16,
            cursor: "pointer", marginTop: 8, marginBottom: 16,
            transition: "background 0.3s",
          }}>
            {saved ? "✓ Save हो गया!" : "Save करें"}
          </button>

          {/* Divider */}
          <div style={{ borderTop: "1px solid #F0EDE8", marginBottom: 16 }} />

          {/* Logout */}
          <button onClick={() => { clearCustomerSession(); onLogout(); }} style={{
            width: "100%", background: "#FEF2F2", color: "#dc2626",
            border: "none", borderRadius: 12, padding: "11px 0",
            fontFamily: "'Baloo 2',sans-serif", fontWeight: 700, fontSize: 14,
            cursor: "pointer", marginBottom: 20,
          }}>
            Logout करें
          </button>

          {/* Hidden seller access — tap 5× */}
          <div style={{ textAlign: "center" }}>
            <button onClick={handleSellerTap} style={{
              background: "none", border: "none", cursor: "pointer",
              color: "#CCC", fontSize: 11, fontFamily: "'Baloo 2',sans-serif",
            }}>
              {sellerTaps > 0 ? `${5 - sellerTaps} और बार tap करें...` : "KisanDirect v1.0"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
