import { useState, useRef } from "react";
import { setCustomerSession, clearCustomerSession, type CustomerSession } from "../lib/utils";
import { VillagePicker } from "../components/kisan/VillagePicker";

interface CustomerProfileProps {
  customer: CustomerSession;
  onUpdate: (c: CustomerSession) => void;
  onLogout: () => void;
  onClose: () => void;
  onGoSeller: () => void;
  onOpenLegal?: (type: "privacy" | "terms") => void;
}

const DEFAULT_LAT = 25.9797;
const DEFAULT_LNG = 78.2039;

export function CustomerProfile({ customer, onUpdate, onLogout, onClose, onGoSeller, onOpenLegal }: CustomerProfileProps) {
  const [name, setName] = useState(customer.name);
  const [village, setVillage] = useState(customer.village);
  const [address, setAddress] = useState(customer.address || "");
  const [lat, setLat] = useState(customer.lat || DEFAULT_LAT);
  const [lng, setLng] = useState(customer.lng || DEFAULT_LNG);
  const [showVillagePicker, setShowVillagePicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const touchStartY = useRef(0);
  const handleTouchStart = (e: React.TouchEvent) => { touchStartY.current = e.touches[0].clientY; };
  const handleTouchEnd = (e: React.TouchEvent) => {
    const diff = e.changedTouches[0].clientY - touchStartY.current;
    if (diff > 80) onClose();
  };

  const handleSave = async () => {
    setSaving(true);
    const updated: CustomerSession = {
      ...customer,
      name: name.trim() || customer.name,
      village,
      address: address.trim(),
      lat, lng,
    };
    // Save to DB
    try {
      await fetch(`/api/customers/${customer.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: updated.name, village: updated.village, address: updated.address, lat, lng }),
      });
    } catch { /* silent — save to localStorage anyway */ }
    setCustomerSession(updated);
    onUpdate(updated);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  };

  const initial = (customer.name || "?")[0].toUpperCase();

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)",
        zIndex: 1100, backdropFilter: "blur(2px)",
      }} />

      {/* Panel */}
      <div onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd} style={{
        position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)",
        width: "100%", maxWidth: 390, zIndex: 1101,
        background: "white", borderRadius: "24px 24px 0 0",
        boxShadow: "0 -8px 40px rgba(0,0,0,0.2)",
        display: "flex", flexDirection: "column",
        maxHeight: "92vh", overflowY: "auto",
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

          {/* Village */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#555", marginBottom: 5 }}>🏘 मेरा गांव</div>
            <div style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              border: "1.5px solid #E5DDD0", borderRadius: 12, padding: "11px 14px",
              background: "#FAFAF8",
            }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: "#1C1C1C", fontFamily: "'Baloo 2',sans-serif" }}>
                📍 {village}
              </span>
              <button
                onClick={() => setShowVillagePicker(true)}
                style={{
                  background: "#E8F5E8", border: "none", borderRadius: 8,
                  padding: "4px 12px", color: "#1a6b1a",
                  fontFamily: "'Baloo 2',sans-serif", fontWeight: 700, fontSize: 12,
                  cursor: "pointer",
                }}
              >
                बदलें
              </button>
            </div>
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
          <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#555", marginBottom: 5 }}>
              📍 Delivery Address
            </div>
            <textarea
              value={address} onChange={e => setAddress(e.target.value)}
              placeholder="घर का पता, गली, मोहल्ला, landmark..."
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

          {/* Save */}
          <button onClick={handleSave} disabled={saving} style={{
            width: "100%", background: saved ? "#4A9B4A" : saving ? "#ccc" : "#2D6A2D", color: "white",
            border: "none", borderRadius: 14, padding: "13px 0",
            fontFamily: "'Baloo 2',sans-serif", fontWeight: 800, fontSize: 16,
            cursor: saving ? "default" : "pointer", marginTop: 4, marginBottom: 16,
            transition: "background 0.3s",
          }}>
            {saving ? "Save हो रहा है..." : saved ? "✓ Save हो गया!" : "Save करें"}
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

          <div style={{ display: "flex", justifyContent: "center", gap: 14, marginBottom: 10 }}>
            <span
              onClick={() => onOpenLegal?.("privacy")}
              style={{ color: "#999", fontSize: 12, fontFamily: "'Baloo 2',sans-serif", fontWeight: 600, cursor: "pointer", textDecoration: "underline" }}
            >
              Privacy Policy
            </span>
            <span
              onClick={() => onOpenLegal?.("terms")}
              style={{ color: "#999", fontSize: 12, fontFamily: "'Baloo 2',sans-serif", fontWeight: 600, cursor: "pointer", textDecoration: "underline" }}
            >
              Terms & Conditions
            </span>
          </div>

          <div style={{ textAlign: "center" }}>
            <span style={{ color: "#CCC", fontSize: 11, fontFamily: "'Baloo 2',sans-serif" }}>
              Graino v1.0
            </span>
          </div>
        </div>
      </div>

      {/* Village picker */}
      {showVillagePicker && (
        <VillagePicker
          currentVillage={village}
          onSelect={v => { setVillage(v); setShowVillagePicker(false); }}
          onClose={() => setShowVillagePicker(false)}
        />
      )}
    </>
  );
}
