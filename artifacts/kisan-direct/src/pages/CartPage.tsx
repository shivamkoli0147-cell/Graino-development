import { useState, useRef } from "react";
import { useCreateOrder } from "@workspace/api-client-react";
import { formatINR, getCartTotal, type Cart, type CartItem, type CustomerSession } from "../lib/utils";
import { VillagePicker } from "../components/kisan/VillagePicker";

interface CartPageProps {
  cart: Cart;
  customer: CustomerSession;
  onCartChange: (key: string, item: CartItem | null) => void;
  onClearCart: () => void;
  onOrderSuccess: () => void;
  onVillageChange?: (village: string) => void;
  onCustomerUpdate?: (c: CustomerSession) => void;
}

export function CartPage({ cart, customer, onCartChange, onClearCart, onOrderSuccess, onVillageChange, onCustomerUpdate }: CartPageProps) {
  const [ordered, setOrdered] = useState(false);
  const [orderId, setOrderId] = useState<number | null>(null);

  const [phone, setPhone] = useState(customer.phone || "");
  const [address, setAddress] = useState(customer.address || "");
  const [landmark, setLandmark] = useState("");
  const [village, setVillage] = useState(customer.village);
  const [showVillagePicker, setShowVillagePicker] = useState(false);
  const [showAddressError, setShowAddressError] = useState(false);
  const [showPhoneError, setShowPhoneError] = useState(false);

  // ── Name prompt ────────────────────────────────────────────────────────────
  const [showNamePrompt, setShowNamePrompt] = useState(false);
  const [nameInput, setNameInput] = useState(customer.name || "");
  const [nameSaving, setNameSaving] = useState(false);
  const [nameError, setNameError] = useState("");

  const detailsRef = useRef<HTMLDivElement>(null);
  const nameRef = useRef<HTMLDivElement>(null);
  const createOrder = useCreateOrder();

  const items = Object.entries(cart);
  const total = getCartTotal(cart);

  const handleVillageSelect = (v: string) => {
    setVillage(v);
    setShowVillagePicker(false);
    onVillageChange?.(v);
  };

  const finalDeliveryAddress = [address.trim(), landmark.trim()].filter(Boolean).join(", ") || village;

  const saveName = async (): Promise<boolean> => {
    const n = nameInput.trim();
    if (!n) { setNameError("नाम डालना ज़रूरी है"); return false; }
    setNameSaving(true); setNameError("");
    try {
      const res = await fetch(`/api/customers/${customer.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: n }),
      });
      if (res.ok) {
        const updated = await res.json() as CustomerSession;
        onCustomerUpdate?.({ ...customer, name: updated.name || n });
        setNameSaving(false);
        return true;
      }
    } catch { /* ignore */ }
    setNameError("सेव नहीं हो सका, दोबारा कोशिश करें");
    setNameSaving(false);
    return false;
  };

  const placeOrder = async () => {
    // Name check first
    if (!customer.name || customer.name.trim() === "") {
      setShowNamePrompt(true);
      setTimeout(() => nameRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 100);
      return;
    }

    let hasError = false;
    const addrEmpty = !address.trim();
    const phoneInvalid = !/^\d{10}$/.test(phone.trim());

    setShowAddressError(addrEmpty);
    setShowPhoneError(phoneInvalid);

    if (addrEmpty || phoneInvalid) {
      hasError = true;
      detailsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    if (hasError) return;

    createOrder.mutate(
      {
        data: {
          customer_id: customer.id,
          village: village,
          address: finalDeliveryAddress,
          delivery_slot: "morning" as "morning",
          items: items.map(([, item]) => ({
            variety_id: item.varietyId,
            product_name: item.productName,
            variety_name: item.varietyName,
            price_per_kg: item.pricePerKg,
            quantity_kg: item.quantityKg,
          })),
        },
      },
      {
        onSuccess: (order: unknown) => {
          setOrderId((order as { id: number }).id);
          setOrdered(true);
          onClearCart();
        },
      }
    );
  };

  const handlePlaceOrderClick = () => void placeOrder();

  if (ordered) {
    return (
      <div className="slide-up" style={{
        flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", padding: 28, background: "#F7F4EF", textAlign: "center",
      }}>
        <div style={{ fontSize: 64, marginBottom: 12 }}>✅</div>
        <div style={{ fontWeight: 800, fontSize: 22, color: "#2D6A2D" }}>Order हो गया!</div>
        <div style={{ fontSize: 14, color: "#777", marginTop: 6, fontWeight: 500 }}>
          Rohit जल्द आएंगे 📞
        </div>

        <div style={{
          marginTop: 18, background: "white", borderRadius: 18, padding: "18px 20px",
          width: "100%", textAlign: "left", border: "1.5px solid #E5DDD0",
          boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
        }}>
          <div style={{ fontWeight: 800, fontSize: 13, color: "#1B4332", marginBottom: 12, letterSpacing: 0.3 }}>
            📋 Order #{orderId} — Details
          </div>
          <Row label="📱 Phone" value={phone} />
          <Row label="📍 Address" value={finalDeliveryAddress} />
          <div style={{
            marginTop: 12, background: "#DCFCE7", borderRadius: 12,
            padding: "10px 14px", fontSize: 13, fontWeight: 700, color: "#15803d", textAlign: "center",
          }}>
            🚚 1–2 दिन के अंदर delivery होगी
          </div>
        </div>

        <button onClick={onOrderSuccess} className="btn-press" style={{
          marginTop: 24, background: "#2D6A2D", color: "white", border: "none",
          borderRadius: 16, padding: "14px 32px", fontFamily: "'Baloo 2', sans-serif",
          fontWeight: 700, fontSize: 15, cursor: "pointer",
        }}>
          वापस जाओ
        </button>
      </div>
    );
  }

  if (!items.length) {
    return (
      <div style={{
        flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", padding: 32, background: "#F7F4EF", textAlign: "center",
      }}>
        <div style={{ fontSize: 56 }}>🛒</div>
        <div style={{ fontWeight: 700, fontSize: 18, color: "#777", marginTop: 16 }}>Cart खाली है</div>
        <div style={{ fontSize: 13, color: "#aaa", marginTop: 6 }}>Products tab से items add करो</div>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: "#F7F4EF" }}>
      {/* Header */}
      <div style={{ background: "white", padding: "16px 16px 14px", flexShrink: 0, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", willChange: "transform", transform: "translateZ(0)", zIndex: 100 }}>
        <div style={{ fontWeight: 800, fontSize: 20, color: "#1C1C1C" }}>🛒 Cart</div>
        <div style={{ fontSize: 12, color: "#777", fontWeight: 500, marginTop: 2 }}>
          {customer.name || "नाम नहीं"} · {customer.village || "गांव नहीं"}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px 16px", WebkitOverflowScrolling: "touch" }}>

        {/* Cart items */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 14 }}>
          {items.map(([key, item]) => (
            <div key={key} style={{
              background: "white", borderRadius: 16, padding: "14px",
              border: "1.5px solid #E5DDD0", boxShadow: "0 2px 6px rgba(0,0,0,0.04)",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 18 }}>{item.productEmoji}</span>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14, color: "#1C1C1C" }}>
                        {item.productName} · {item.varietyName}
                      </div>
                      <div style={{ fontSize: 12, color: "#777" }}>
                        {formatINR(item.pricePerKg)}/kg × {item.quantityKg}kg
                      </div>
                    </div>
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontWeight: 800, fontSize: 15, color: "#2D6A2D" }}>
                    {formatINR(item.pricePerKg * item.quantityKg)}
                  </div>
                  <button onClick={() => onCartChange(key, null)} style={{
                    background: "none", border: "none", color: "#dc2626", fontSize: 12,
                    cursor: "pointer", fontFamily: "'Baloo 2', sans-serif", fontWeight: 600,
                  }}>हटाओ ✕</button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Order Details ── */}
        <div ref={detailsRef} style={{
          background: "white", borderRadius: 16, padding: 16, marginBottom: 14,
          border: (showAddressError || showPhoneError)
            ? "2px solid #dc2626"
            : "1.5px solid #BBF7D0",
          transition: "border-color 0.2s",
        }}>
          <div style={{ fontWeight: 800, fontSize: 14, color: "#1C1C1C", marginBottom: 14 }}>
            📋 Order Details Confirm करें
          </div>

          {/* ── Name prompt (inline) ── */}
          {showNamePrompt && (
            <div ref={nameRef} style={{
              marginBottom: 14, background: "#FFFBEB",
              border: "1.5px solid #FDE68A", borderRadius: 14, padding: "12px 14px",
            }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: "#92400E",
                fontFamily: "'Baloo 2',sans-serif", marginBottom: 8 }}>
                👤 आपका नाम डालें (delivery के लिए)
              </div>
              <input
                value={nameInput}
                onChange={e => { setNameInput(e.target.value); setNameError(""); }}
                placeholder="जैसे: Ramesh Kumar"
                autoFocus
                style={{
                  ...inputStyle, border: nameError ? "1.5px solid #dc2626" : "1.5px solid #FDE68A",
                  background: "#FEFCE8", marginBottom: 8,
                }}
              />
              {nameError && <div style={errorStyle}>⚠️ {nameError}</div>}
              <button
                onClick={async () => {
                  const ok = await saveName();
                  if (ok) setShowNamePrompt(false);
                }}
                disabled={nameSaving}
                style={{
                  width: "100%", background: nameSaving ? "#aaa" : "#D97706",
                  color: "white", border: "none", borderRadius: 12,
                  padding: "10px", fontFamily: "'Baloo 2',sans-serif",
                  fontWeight: 800, fontSize: 14, cursor: nameSaving ? "default" : "pointer",
                }}
              >
                {nameSaving ? "सेव हो रहा है..." : "नाम सेव करें ✓"}
              </button>
            </div>
          )}

          {/* Village */}
          <div style={{ marginBottom: 14 }}>
            <div style={labelStyle}>🏘 गांव</div>
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
                  fontFamily: "'Baloo 2',sans-serif", fontWeight: 700, fontSize: 12, cursor: "pointer",
                }}
              >बदलें</button>
            </div>
          </div>

          {/* Phone */}
          <div style={{ marginBottom: 14 }}>
            <div style={labelStyle}>📱 फ़ोन नंबर (Delivery के लिए)</div>
            <input
              value={phone}
              onChange={e => { setPhone(e.target.value.replace(/\D/g, "").slice(0, 10)); setShowPhoneError(false); }}
              type="tel" inputMode="numeric"
              placeholder="10 अंकों का नंबर"
              style={{
                ...inputStyle,
                border: showPhoneError ? "1.5px solid #dc2626" : "1.5px solid #E5DDD0",
                background: showPhoneError ? "#FFF5F5" : "#FAFAF8",
                fontSize: 16, letterSpacing: 1.5, fontWeight: 700,
              }}
            />
            {showPhoneError && <div style={errorStyle}>⚠️ सही 10-digit फोन नंबर डालें</div>}
          </div>

          {/* Address */}
          <div style={{ marginBottom: 14 }}>
            <div style={labelStyle}>🏠 पूरा पता *</div>
            <textarea
              value={address}
              onChange={e => { setAddress(e.target.value); setShowAddressError(false); }}
              placeholder="गली, मोहल्ला, घर नंबर — जैसे: राम गली नंबर 3, बड़ा बाजार के पास"
              rows={3}
              style={{
                ...inputStyle,
                border: showAddressError ? "1.5px solid #dc2626" : "1.5px solid #E5DDD0",
                background: showAddressError ? "#FFF5F5" : "#FAFAF8",
                resize: "none", lineHeight: 1.55,
              }}
            />
            {showAddressError && <div style={errorStyle}>⚠️ पता डालना ज़रूरी है</div>}
          </div>

          {/* Landmark */}
          <div>
            <div style={labelStyle}>🏛️ Landmark (optional)</div>
            <input
              value={landmark}
              onChange={e => setLandmark(e.target.value)}
              placeholder="जैसे: शिव मंदिर के पास, नीला मकान"
              style={{ ...inputStyle, border: "1.5px solid #E5DDD0", background: "#FAFAF8" }}
            />
          </div>
        </div>

        {/* Delivery estimate banner */}
        <div style={{
          background: "#F0FDF4", border: "1.5px solid #BBF7D0", borderRadius: 14,
          padding: "12px 16px", marginBottom: 14,
          display: "flex", alignItems: "center", gap: 10,
        }}>
          <span style={{ fontSize: 24 }}>🚚</span>
          <div>
            <div style={{ fontWeight: 800, fontSize: 14, color: "#15803D" }}>
              1–2 दिन में delivery होगी
            </div>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#166534" }}>
              Rohit खुद घर पर देंगे · Payment on Delivery
            </div>
          </div>
        </div>

        {/* Village picker */}
        {showVillagePicker && (
          <VillagePicker
            currentVillage={village}
            onSelect={handleVillageSelect}
            onClose={() => setShowVillagePicker(false)}
          />
        )}

        {/* Summary + Place Order */}
        <div style={{ background: "linear-gradient(135deg,#2D6A2D,#4A9B4A)", borderRadius: 20, padding: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", color: "rgba(255,255,255,0.8)", fontSize: 13, marginBottom: 8 }}>
            <span>{items.length} items</span>
            <span>{formatINR(total)}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", color: "white", fontSize: 14, fontWeight: 600, marginBottom: 16 }}>
            <span>Delivery</span><span style={{ color: "#86efac" }}>Free ✓</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", color: "white", fontSize: 19, fontWeight: 800, marginBottom: 20 }}>
            <span>Total</span><span>{formatINR(total)}</span>
          </div>
          <button onClick={handlePlaceOrderClick} disabled={createOrder.isPending} className="btn-press" style={{
            width: "100%", background: "#F59E0B", color: "#1C1C1C", border: "none",
            borderRadius: 16, padding: "14px", fontFamily: "'Baloo 2', sans-serif",
            fontWeight: 800, fontSize: 16, cursor: createOrder.isPending ? "default" : "pointer",
          }}>
            {createOrder.isPending ? "Order हो रहा है..." : "Order करो →"}
          </button>
          <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 11, textAlign: "center", marginTop: 8 }}>
            Payment on Delivery · 1–2 दिन में delivery
          </div>
        </div>

      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "flex-start" }}>
      <span style={{ fontSize: 12, color: "#777", fontWeight: 600, whiteSpace: "nowrap", minWidth: 70 }}>{label}</span>
      <span style={{ fontSize: 12, color: "#1C1C1C", fontWeight: 700, flex: 1 }}>{value}</span>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  fontSize: 12, fontWeight: 700, color: "#555", marginBottom: 6,
  fontFamily: "'Baloo 2',sans-serif",
};

const inputStyle: React.CSSProperties = {
  width: "100%", boxSizing: "border-box",
  borderRadius: 12, padding: "11px 14px",
  fontFamily: "'Baloo 2',sans-serif", fontSize: 14, outline: "none",
  transition: "border-color 0.2s, background 0.2s",
};

const errorStyle: React.CSSProperties = {
  fontSize: 12, color: "#dc2626", fontWeight: 700, marginTop: 5,
  fontFamily: "'Baloo 2',sans-serif",
};
