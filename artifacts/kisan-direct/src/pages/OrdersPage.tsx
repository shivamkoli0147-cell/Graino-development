import { useGetOrders } from "@workspace/api-client-react";
import { formatINR, timeAgo, DELIVERY_SLOTS, type CustomerSession } from "../lib/utils";

interface OrdersPageProps {
  customer: CustomerSession;
  onRequestReturn: (orderId: number) => void;
}

const STATUS_LABELS: Record<string, { label: string; emoji: string; color: string; bg: string }> = {
  placed:            { label: "Order मिला",      emoji: "📋", color: "#b45309", bg: "#FEF3C7" },
  accepted:          { label: "Accept हुआ",      emoji: "✅", color: "#15803d", bg: "#DCFCE7" },
  out_for_delivery:  { label: "आ रहा है",        emoji: "🚚", color: "#1d4ed8", bg: "#DBEAFE" },
  delivered:         { label: "Delivered",        emoji: "🎉", color: "#15803d", bg: "#F0FDF4" },
  cancelled:         { label: "Cancel हुआ",      emoji: "❌", color: "#dc2626", bg: "#FEE2E2" },
};

export function OrdersPage({ customer, onRequestReturn }: OrdersPageProps) {
  const { data: orders, isLoading, refetch } = useGetOrders({ phone: customer.phone, status: undefined });

  if (isLoading) return (
    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", background: "#F7F4EF" }}>
      <div style={{ fontSize: 32 }}>📋</div>
    </div>
  );

  const list = (orders as Order[]) || [];

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: "#F7F4EF" }}>
      {/* Header */}
      <div style={{ background: "white", padding: "16px 16px 14px", flexShrink: 0, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontWeight: 800, fontSize: 20, color: "#1C1C1C" }}>📋 Orders</div>
          <button onClick={() => refetch()} className="btn-press" style={{
            background: "#E8F5E8", border: "none", borderRadius: 10, padding: "6px 12px",
            color: "#2D6A2D", fontFamily: "'Baloo 2', sans-serif", fontWeight: 700, fontSize: 12, cursor: "pointer",
          }}>↻ Refresh</button>
        </div>
        <div style={{ fontSize: 12, color: "#777", marginTop: 2 }}>{customer.name} · {customer.village}</div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px 24px" }}>
        {!list.length ? (
          <div style={{ textAlign: "center", padding: "60px 24px", color: "#777" }}>
            <div style={{ fontSize: 48 }}>📦</div>
            <div style={{ fontWeight: 700, fontSize: 16, marginTop: 16 }}>अभी कोई order नहीं</div>
            <div style={{ fontSize: 13, color: "#aaa", marginTop: 6 }}>Products tab से order करो</div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {list.map(order => {
              const s = STATUS_LABELS[order.status] || STATUS_LABELS.placed;
              const canReturn = order.status === "delivered" && !order.return_requested;
              return (
                <div key={order.id} style={{
                  background: "white", borderRadius: 18, overflow: "hidden",
                  border: "1.5px solid #E5DDD0", boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
                }}>
                  {/* Status bar */}
                  <div style={{ background: s.bg, padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 18 }}>{s.emoji}</span>
                      <span style={{ fontWeight: 700, fontSize: 13, color: s.color }}>{s.label}</span>
                    </div>
                    <span style={{ fontSize: 11, color: "#777" }}>{timeAgo(order.created_at)}</span>
                  </div>

                  {/* Items */}
                  <div style={{ padding: "12px 14px 14px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                      <div style={{ fontSize: 11, color: "#777", fontWeight: 600 }}>Order #{order.id}</div>
                      {order.delivery_slot && (() => {
                        const slot = DELIVERY_SLOTS.find(s => s.id === order.delivery_slot);
                        return slot ? (
                          <div style={{ fontSize: 11, fontWeight: 700, color: "#6d28d9", background: "#F5F3FF", padding: "2px 10px", borderRadius: 8 }}>
                            {slot.label} {slot.time}
                          </div>
                        ) : null;
                      })()}
                    </div>
                    {order.items.map((item, i) => (
                      <div key={i} style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                        <div style={{ fontSize: 13, color: "#1C1C1C", fontWeight: 600 }}>
                          {item.product_name} · {item.variety_name}
                        </div>
                        <div style={{ fontSize: 13, color: "#555" }}>
                          {item.quantity_kg}kg × {formatINR(item.price_per_kg)}
                        </div>
                      </div>
                    ))}
                    <div style={{ borderTop: "1px solid #F0EDE8", marginTop: 10, paddingTop: 8, display: "flex", justifyContent: "space-between" }}>
                      <span style={{ fontWeight: 600, fontSize: 13, color: "#777" }}>
                        Payment: {order.payment_status === "paid" ? "✅ Paid" : "🕐 COD"}
                      </span>
                      <span style={{ fontWeight: 800, fontSize: 15, color: "#2D6A2D" }}>{formatINR(order.total_amount)}</span>
                    </div>
                    {order.return_requested && (
                      <div style={{ background: "#FEE2E2", borderRadius: 8, padding: "6px 10px", marginTop: 8, fontSize: 12, color: "#dc2626", fontWeight: 600 }}>
                        🔄 Return request भेजा गया
                      </div>
                    )}
                    {canReturn && (
                      <button onClick={() => onRequestReturn(order.id)} className="btn-press" style={{
                        marginTop: 10, background: "none", border: "1.5px solid #dc2626", color: "#dc2626",
                        borderRadius: 10, padding: "7px 14px", fontFamily: "'Baloo 2', sans-serif",
                        fontWeight: 700, fontSize: 12, cursor: "pointer",
                      }}>
                        Return Request करो
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

type OrderItem = { product_name: string; variety_name: string; price_per_kg: number; quantity_kg: number };
type Order = { id: number; status: string; payment_status: string; total_amount: number;
  created_at: string; delivery_slot?: string | null; items: OrderItem[];
  return_requested: boolean; return_note?: string };
