import { useState } from "react";
import { useCreateOrder } from "@workspace/api-client-react";
import { formatINR, getCartTotal, type Cart, type CartItem, type CustomerSession } from "../lib/utils";

interface CartPageProps {
  cart: Cart;
  customer: CustomerSession;
  onCartChange: (key: string, item: CartItem | null) => void;
  onClearCart: () => void;
  onOrderSuccess: () => void;
}

export function CartPage({ cart, customer, onCartChange, onClearCart, onOrderSuccess }: CartPageProps) {
  const [address, setAddress] = useState("");
  const [ordered, setOrdered] = useState(false);
  const [orderId, setOrderId] = useState<number | null>(null);
  const createOrder = useCreateOrder();

  const items = Object.entries(cart);
  const total = getCartTotal(cart);

  const placeOrder = () => {
    createOrder.mutate(
      {
        data: {
          customer_id: customer.id,
          village: customer.village,
          address: address || `${customer.village} गांव`,
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
    return (
      <div className="slide-up" style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", padding: 32, background: "#F7F4EF", textAlign: "center" }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>✅</div>
        <div style={{ fontWeight: 800, fontSize: 22, color: "#2D6A2D" }}>Order हो गया!</div>
        <div style={{ fontSize: 14, color: "#777", marginTop: 8, fontWeight: 500 }}>
          Order #{orderId} · Rohit जल्द पहुंचेगा
        </div>
        <button onClick={onOrderSuccess} className="btn-press" style={{
          marginTop: 28, background: "#2D6A2D", color: "white", border: "none",
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
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", padding: 32, background: "#F7F4EF", textAlign: "center" }}>
        <div style={{ fontSize: 56 }}>🛒</div>
        <div style={{ fontWeight: 700, fontSize: 18, color: "#777", marginTop: 16 }}>Cart खाली है</div>
        <div style={{ fontSize: 13, color: "#aaa", marginTop: 6 }}>Products tab से items add करो</div>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: "#F7F4EF" }}>
      {/* Header */}
      <div style={{ background: "white", padding: "16px 16px 14px", flexShrink: 0,
        boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
        <div style={{ fontWeight: 800, fontSize: 20, color: "#1C1C1C" }}>🛒 Cart</div>
        <div style={{ fontSize: 12, color: "#777", fontWeight: 500, marginTop: 2 }}>
          {customer.name} · {customer.village}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px 8px" }}>
        {/* Items */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
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

        {/* Delivery address */}
        <div style={{ background: "white", borderRadius: 16, padding: 16, marginBottom: 16,
          border: "1.5px solid #E5DDD0" }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: "#1C1C1C", marginBottom: 8 }}>
            📍 Delivery Address
          </div>
          <input value={address} onChange={e => setAddress(e.target.value)}
            placeholder={`${customer.village} गांव (optional)`}
            style={{ width: "100%", padding: "9px 12px", borderRadius: 10, border: "1.5px solid #E5DDD0",
              fontSize: 13, fontFamily: "'Baloo 2', sans-serif", outline: "none", boxSizing: "border-box" }} />
          <div style={{ fontSize: 11, color: "#4A9B4A", fontWeight: 600, marginTop: 6 }}>
            ✓ Delivery: {customer.village}
          </div>
        </div>

        {/* Summary */}
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
            fontWeight: 800, fontSize: 16, cursor: "pointer",
          }}>
            {createOrder.isPending ? "Order हो रहा है..." : "Order करो →"}
          </button>
          <div style={{ color: "rgba(255,255,255,0.65)", fontSize: 11, textAlign: "center", marginTop: 10 }}>
            Payment on Delivery · Rohit Mukati
          </div>
        </div>
      </div>
    </div>
  );
}
