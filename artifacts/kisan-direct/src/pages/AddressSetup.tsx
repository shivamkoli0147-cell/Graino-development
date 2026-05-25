import { useState } from "react";
import { MapPicker } from "../components/kisan/MapPicker";
import { setCustomerSession, type CustomerSession } from "../lib/utils";

interface AddressSetupProps {
  customer: CustomerSession;
  onComplete: (updated: CustomerSession) => void;
  onSkip: () => void;
}

// Default center: Pichor, Madhya Pradesh area
const DEFAULT_LAT = 25.9797;
const DEFAULT_LNG = 78.2039;

export function AddressSetup({ customer, onComplete, onSkip }: AddressSetupProps) {
  const [street, setStreet] = useState(customer.address || "");
  const [landmark, setLandmark] = useState("");
  const [lat, setLat] = useState(customer.lat || DEFAULT_LAT);
  const [lng, setLng] = useState(customer.lng || DEFAULT_LNG);
  const [locating, setLocating] = useState(false);
  const [locErr, setLocErr] = useState("");
  const [saving, setSaving] = useState(false);
  const [showMap, setShowMap] = useState(false);

  const getLocation = () => {
    if (!navigator.geolocation) { setLocErr("Location support नहीं है इस browser में"); return; }
    setLocating(true); setLocErr("");
    navigator.geolocation.getCurrentPosition(
      async pos => {
        const { latitude, longitude } = pos.coords;
        setLat(latitude); setLng(longitude);
        setShowMap(true);
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
            { headers: { "Accept-Language": "hi,en" } }
          );
          const data = await res.json() as {
            address?: { road?: string; hamlet?: string; village?: string; town?: string; county?: string; state?: string }
          };
          const a = data.address || {};
          const parts = [a.road || a.hamlet, a.village || a.town, a.county].filter(Boolean);
          if (parts.length) setStreet(parts.join(", "));
        } catch { /* use coordinates, no reverse geocode */ }
        setLocating(false);
      },
      err => {
        setLocErr(err.code === 1 ? "Location access deny हो गया। Settings में allow करें।" : "Location नहीं मिला");
        setLocating(false);
      },
      { timeout: 12000, enableHighAccuracy: true }
    );
  };

  const handleSave = async () => {
    setSaving(true);
    const fullAddress = [street.trim(), landmark.trim(), customer.village].filter(Boolean).join(", ");
    try {
      const res = await fetch(`/api/customers/${customer.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: customer.name, address: fullAddress, lat, lng }),
      });
      if (res.ok) {
        const updated: CustomerSession = { ...customer, address: fullAddress, lat, lng };
        setCustomerSession(updated);
        onComplete(updated);
      }
    } catch { /* fallback: save locally */ }
    // Fallback if API fails — save to localStorage anyway
    const fullAddr = [street.trim(), landmark.trim(), customer.village].filter(Boolean).join(", ");
    const updated: CustomerSession = { ...customer, address: fullAddr, lat, lng };
    setCustomerSession(updated);
    onComplete(updated);
    setSaving(false);
  };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "#F7F4EF", overflow: "hidden" }}>
      {/* Header */}
      <div style={{
        background: "linear-gradient(135deg,#1a3d1a,#2D6A2D)",
        padding: "20px 20px 28px", flexShrink: 0, color: "white",
      }}>
        <div style={{ fontSize: 36, marginBottom: 8 }}>📍</div>
        <div style={{ fontWeight: 800, fontSize: 22 }}>Delivery Location सेट करें</div>
        <div style={{ fontSize: 13, opacity: 0.85, marginTop: 4 }}>
          नमस्ते {customer.name}! एक बार अपना घर का पता बताओ ताकि Rohit आसानी से deliver कर सके।
        </div>
        <div style={{
          marginTop: 12, background: "rgba(255,255,255,0.15)", borderRadius: 10,
          padding: "6px 12px", display: "inline-block", fontSize: 12, fontWeight: 700,
        }}>
          🏘 {customer.village} · {customer.phone}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "16px 16px 100px" }}>

        {/* GPS Button */}
        <button onClick={getLocation} disabled={locating} style={{
          width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
          background: locating ? "#F0EDE8" : "#2D6A2D", color: locating ? "#999" : "white",
          border: "none", borderRadius: 14, padding: "14px 0",
          fontFamily: "'Baloo 2',sans-serif", fontWeight: 800, fontSize: 15,
          cursor: locating ? "default" : "pointer", marginBottom: 12,
          boxShadow: locating ? "none" : "0 4px 16px rgba(45,106,45,0.3)",
        }}>
          <span style={{ fontSize: 20 }}>{locating ? "⏳" : "📍"}</span>
          {locating ? "GPS से location मिल रहा है..." : "📍 Current Location Use करें"}
        </button>
        {locErr && <div style={{ fontSize: 12, color: "#dc2626", marginBottom: 10, paddingLeft: 4 }}>{locErr}</div>}

        {/* Street / Mohalla */}
        <div style={{ background: "white", borderRadius: 16, padding: 16, marginBottom: 12 }}>
          <div style={{ fontWeight: 800, fontSize: 14, color: "#1C1C1C", marginBottom: 12 }}>🏠 पता लिखें</div>

          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#555", marginBottom: 5 }}>
              गली / मोहल्ला / Street
            </div>
            <input value={street} onChange={e => setStreet(e.target.value)}
              placeholder="जैसे: राम गली नंबर 3, बड़ा बाजार के पास"
              style={{
                width: "100%", boxSizing: "border-box",
                border: "1.5px solid #E5DDD0", borderRadius: 12,
                padding: "11px 14px", fontFamily: "'Baloo 2',sans-serif",
                fontSize: 14, outline: "none", background: "#FAFAF8",
              }} />
          </div>

          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#555", marginBottom: 5 }}>
              Landmark (optional)
            </div>
            <input value={landmark} onChange={e => setLandmark(e.target.value)}
              placeholder="जैसे: शिव मंदिर के पास, नीला मकान"
              style={{
                width: "100%", boxSizing: "border-box",
                border: "1.5px solid #E5DDD0", borderRadius: 12,
                padding: "11px 14px", fontFamily: "'Baloo 2',sans-serif",
                fontSize: 14, outline: "none", background: "#FAFAF8",
              }} />
          </div>
        </div>

        {/* Map */}
        <div style={{ background: "white", borderRadius: 16, padding: 16, marginBottom: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <div style={{ fontWeight: 800, fontSize: 14, color: "#1C1C1C" }}>🗺️ Map पर Pin करें</div>
            {!showMap && (
              <button onClick={() => setShowMap(true)} style={{
                background: "#E8F5E8", color: "#2D6A2D", border: "none",
                borderRadius: 10, padding: "5px 14px",
                fontFamily: "'Baloo 2',sans-serif", fontWeight: 700, fontSize: 12, cursor: "pointer",
              }}>Map खोलें</button>
            )}
          </div>
          {showMap ? (
            <MapPicker lat={lat} lng={lng} onChange={(la, lo) => { setLat(la); setLng(lo); }} height={240} />
          ) : (
            <div onClick={() => setShowMap(true)} style={{
              height: 100, background: "#F0FDF4", borderRadius: 14, cursor: "pointer",
              border: "1.5px dashed #BBF7D0", display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center", gap: 6,
            }}>
              <span style={{ fontSize: 28 }}>🗺️</span>
              <span style={{ fontSize: 12, color: "#2D6A2D", fontWeight: 700 }}>
                Map खोलें और pin drag करें
              </span>
            </div>
          )}
          {showMap && (
            <div style={{ fontSize: 11, color: "#777", marginTop: 8 }}>
              📐 Coordinates: {lat.toFixed(5)}, {lng.toFixed(5)}
            </div>
          )}
        </div>
      </div>

      {/* Fixed bottom buttons */}
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0,
        background: "white", padding: "12px 16px 20px",
        borderTop: "1px solid #E5DDD0",
        display: "flex", gap: 10,
      }}>
        <button onClick={onSkip} style={{
          flex: 0, background: "#F0EDE8", color: "#777", border: "none",
          borderRadius: 14, padding: "12px 20px",
          fontFamily: "'Baloo 2',sans-serif", fontWeight: 700, fontSize: 14, cursor: "pointer",
        }}>बाद में</button>
        <button onClick={handleSave} disabled={saving} style={{
          flex: 1, background: saving ? "#ccc" : "#2D6A2D", color: "white",
          border: "none", borderRadius: 14, padding: "14px 0",
          fontFamily: "'Baloo 2',sans-serif", fontWeight: 800, fontSize: 16,
          cursor: saving ? "default" : "pointer",
        }}>
          {saving ? "Save हो रहा है..." : "Save करें और शुरू करें →"}
        </button>
      </div>
    </div>
  );
}
