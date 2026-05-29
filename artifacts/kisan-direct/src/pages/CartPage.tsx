import { useState, useRef } from "react";
import { useCreateOrder } from "@workspace/api-client-react";
import { formatINR, getCartTotal, DELIVERY_SLOTS, type Cart, type CartItem, type CustomerSession } from "../lib/utils";

interface CartPageProps {
  cart: Cart;
  customer: CustomerSession;
  onCartChange: (key: string, item: CartItem | null) => void;
  onClearCart: () => void;
  onOrderSuccess: () => void;
}

const SLOT_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  morning:   { bg: "#FFF7ED", border: "#FED7AA", text: "#c2410c" },
  afternoon: { bg: "#FFFBEB", border: "#FDE68A", text: "#b45309" },
  evening:   { bg: "#F5F3FF", border: "#DDD6FE", text: "#6d28d9" },
};

export function CartPage({ cart, customer, onCartChange, onClearCart, onOrderSuccess }: CartPageProps) {
  const [selectedSlot, setSelectedSlot] = useState("");
  const [ordered, setOrdered] = useState(false);
  const [orderId, setOrderId] = useState<number | null>(null);
  const [showSlotError, setShowSlotError] = useState(false);

  const [phone, setPhone] = useState(customer.phone || "");
  const [address, setAddress] = useState(customer.address || "");
  const [landmark, setLandmark] = useState("");
  const [showAddressError, setShowAddressError] = useState(false);
  const [showPhoneError, setShowPhoneError] = useState(false);

  const detailsRef = useRef<HTMLDivElement>(null);
  const createOrder = useCreateOrder();

  const items = Object.entries(cart);
  const total = getCartTotal(cart);

  const finalDeliveryAddress = [address.trim(), landmark.trim()].filter(Boolean).join(", ") || customer.village;

  const placeOrder = () => {
    let hasError = false;

    const addrEmpty = !address.trim();
    const phoneInvalid = !/^\d{10}$/.test(phone.trim());

    setShowAddressError(addrEmpty);
    setShowPhoneError(phoneInvalid);
    if (!selectedSlot) setShowSlotError(true);

    if (addrEmpty || phoneInvalid || !selectedSlot) {
      hasError = true;
      if (addrEmpty || phoneInvalid) {
        detailsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }

    if (hasError) return;

    createOrder.mutate(
      {
        data: {
          customer_id: customer.id,
          village: customer.village,
          address: finalDeliveryAddress,
          delivery_slot: selectedSlot as "morning" | "afternoon" | "evening",
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
        onSuccess: (order) => {
          setOrderId((order as { id: number }).id);
          setOrdered(true);
          onClearCart();
        },
      }
    );
  };

  if (ordered) {
    const slot = DELIVERY_SLOTS.find(s => s.id === selectedSlot);
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

        {/* Confirmation card */}
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
          {slot && <Row label="🕐 Slot" value={`${slot.label} · ${slot.time}`} />}

          <div style={{
            marginTop: 12, background: "#DCFCE7", borderRadius: 12,
            padding: "10px 14px", fontSize: 13, fontWeight: 700, color: "#15803d", textAlign: "center",
          }}>
            {slot ? `${slot.label} ${slot.time} को delivery होगी` : "जल्द delivery होगी"}
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
      <div style={{ background: "white", padding: "16px 16px 14px", flexShrink: 0, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
        <div style={{ fontWeight: 800, fontSize: 20, color: "#1C1C1C" }}>🛒 Cart</div>
        <div style={{ fontSize: 12, color: "#777", fontWeight: 500, marginTop: 2 }}>
          {customer.name} · {customer.village}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px 16px" }}>

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

        {/* ── Order Details Confirm करें ── */}
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
            {showPhoneError && (
              <div style={errorStyle}>⚠️ सही 10-digit फोन नंबर डालें</div>
            )}
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
            {showAddressError && (
              <div style={errorStyle}>⚠️ पता डालना ज़रूरी है</div>
            )}
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

        {/* Delivery Slot */}
        <div style={{
          background: "white", borderRadius: 16, padding: 16, marginBottom: 14,
          border: showSlotError ? "1.5px solid #dc2626" : "1.5px solid #E5DDD0",
        }}>
          <div style={{ fontWeight: 800, fontSize: 14, color: "#1C1C1C", marginBottom: 4 }}>
            🕐 Delivery Time चुनें
          </div>
          <div style={{ fontSize: 12, color: "#777", marginBottom: 12, fontWeight: 500 }}>
            Rohit किस समय आए आपके पास?
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {DELIVERY_SLOTS.map(slot => {
              const selected = selectedSlot === slot.id;
              const colors = SLOT_COLORS[slot.id] || SLOT_COLORS.morning;
              return (
                <button key={slot.id}
                  onClick={() => { setSelectedSlot(slot.id); setShowSlotError(false); }}
                  className="btn-press"
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "12px 16px", borderRadius: 14,
                    background: selected ? colors.bg : "#FAFAF8",
                    border: `2px solid ${selected ? colors.border : "#E5DDD0"}`,
                    cursor: "pointer", fontFamily: "'Baloo 2',sans-serif", textAlign: "left",
                    transition: "all 0.15s",
                  }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 15, color: selected ? colors.text : "#1C1C1C" }}>
                      {slot.label}
                    </div>
                    <div style={{ fontSize: 12, color: selected ? colors.text : "#777", fontWeight: 600 }}>
                      {slot.time}
                    </div>
                  </div>
                  <div style={{
                    width: 22, height: 22, borderRadius: "50%",
                    border: `2px solid ${selected ? colors.border : "#ccc"}`,
                    background: selected ? colors.text : "white",
                    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                  }}>
                    {selected && <span style={{ color: "white", fontSize: 12, fontWeight: 900 }}>✓</span>}
                  </div>
                </button>
              );
            })}
          </div>
          {showSlotError && (
            <div style={{ fontSize: 12, color: "#dc2626", fontWeight: 700, marginTop: 8 }}>
              ⚠️ कृपया delivery time चुनें
            </div>
          )}
        </div>

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
          <button onClick={placeOrder} disabled={createOrder.isPending} className="btn-press" style={{
            width: "100%", background: "#F59E0B", color: "#1C1C1C", border: "none",
            borderRadius: 16, padding: "14px", fontFamily: "'Baloo 2', sans-serif",
            fontWeight: 800, fontSize: 16, cursor: createOrder.isPending ? "default" : "pointer",
          }}>
            {createOrder.isPending ? "Order हो रहा है..." : "Order करो →"}
          </button>
          {selectedSlot && (
            <div style={{ color: "rgba(255,255,255,0.8)", fontSize: 11, textAlign: "center", marginTop: 8 }}>
              {DELIVERY_SLOTS.find(s => s.id === selectedSlot)?.label} {DELIVERY_SLOTS.find(s => s.id === selectedSlot)?.time} · Payment on Delivery
            </div>
          )}
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
