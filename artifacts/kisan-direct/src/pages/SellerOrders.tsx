import { useState } from "react";
import { useGetOrders, useUpdateOrderStatus } from "@workspace/api-client-react";
import type { OrderStatusUpdateStatus } from "@workspace/api-client-react";
import { formatINR, timeAgo } from "../lib/utils";

interface SellerOrdersProps {
  onBack: () => void;
}

const STATUS_FLOW = ["placed","accepted","out_for_delivery","delivered","cancelled"];
const STATUS_META: Record<string, { label: string; emoji: string; color: string; bg: string }> = {
  placed:            { label: "नया Order",        emoji: "📋", color: "#b45309", bg: "#FEF3C7" },
  accepted:          { label: "Accept हुआ",       emoji: "✅", color: "#15803d", bg: "#DCFCE7" },
  out_for_delivery:  { label: "Delivery पर",      emoji: "🚚", color: "#1d4ed8", bg: "#DBEAFE" },
  delivered:         { label: "Delivered",         emoji: "🎉", color: "#15803d", bg: "#F0FDF4" },
  cancelled:         { label: "Cancel",            emoji: "❌", color: "#dc2626", bg: "#FEE2E2" },
};

const FILTERS = ["all","placed","accepted","out_for_delivery","delivered"];

export function SellerOrders({ onBack }: SellerOrdersProps) {
  const [filter, setFilter] = useState("all");
  const [expanded, setExpanded] = useState<number | null>(null);
  const { data: orders, isLoading, refetch } = useGetOrders({ status: filter === "all" ? undefined : filter });
  const updateStatus = useUpdateOrderStatus();

  const list = (orders as Order[]) || [];

  const nextStatus = (status: string) => {
    const idx = STATUS_FLOW.indexOf(status);
    if (idx < 0 || idx >= STATUS_FLOW.length - 2) return null;
    return STATUS_FLOW[idx + 1];
  };

  const advance = (orderId: number, status: string) => {
    updateStatus.mutate(
      { id: orderId, data: { status: status as OrderStatusUpdateStatus } },
      { onSuccess: () => refetch() }
    );
  };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: "#F7F4EF" }}>
      {/* Header */}
      <div style={{ background: "linear-gradient(135deg,#1a3d1a,#2D6A2D)", padding: "16px 16px 0", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
          <button onClick={onBack} className="btn-press" style={{
            background: "rgba(255,255,255,0.15)", border: "none", borderRadius: 10,
            padding: "6px 12px", color: "white", fontFamily: "'Baloo 2', sans-serif",
            fontWeight: 700, fontSize: 13, cursor: "pointer",
          }}>← Back</button>
          <div style={{ color: "white", fontWeight: 800, fontSize: 18 }}>📋 Orders</div>
          <button onClick={() => refetch()} className="btn-press" style={{
            marginLeft: "auto", background: "rgba(255,255,255,0.15)", border: "none",
            borderRadius: 10, padding: "6px 12px", color: "white",
            fontFamily: "'Baloo 2', sans-serif", fontWeight: 700, fontSize: 12, cursor: "pointer",
          }}>↻</button>
        </div>
        {/* Filter tabs */}
        <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 12 }}>
          {FILTERS.map(f => {
            const m = STATUS_META[f];
            return (
              <button key={f} onClick={() => setFilter(f)} className="btn-press" style={{
                flexShrink: 0, padding: "5px 12px", borderRadius: 16,
                background: filter === f ? "rgba(255,255,255,0.25)" : "transparent",
                color: "white", border: "1px solid rgba(255,255,255,0.3)",
                fontFamily: "'Baloo 2', sans-serif", fontWeight: 700, fontSize: 12, cursor: "pointer",
              }}>
                {m ? `${m.emoji} ${m.label}` : "सब"}
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "12px 14px 24px" }}>
        {isLoading ? (
          <div style={{ textAlign: "center", padding: 48, color: "#777" }}>लोड हो रहा है...</div>
        ) : !list.length ? (
          <div style={{ textAlign: "center", padding: "60px 24px", color: "#777" }}>
            <div style={{ fontSize: 40 }}>📦</div>
            <div style={{ fontWeight: 700, marginTop: 12 }}>कोई order नहीं</div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {list.map(order => {
              const s = STATUS_META[order.status] || STATUS_META.placed;
              const next = nextStatus(order.status);
              const isExpanded = expanded === order.id;

              return (
                <div key={order.id} style={{
                  background: "white", borderRadius: 16, overflow: "hidden",
                  border: "1.5px solid #E5DDD0", boxShadow: "0 2px 6px rgba(0,0,0,0.05)",
                }}>
                  {/* Status header */}
                  <div style={{ background: s.bg, padding: "10px 14px", display: "flex", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span>{s.emoji}</span>
                      <span style={{ fontWeight: 700, fontSize: 12, color: s.color }}>{s.label}</span>
                    </div>
                    <span style={{ fontSize: 11, color: "#777" }}>{timeAgo(order.created_at)}</span>
                  </div>

                  {/* Content */}
                  <div style={{ padding: "12px 14px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 14, color: "#1C1C1C" }}>
                          {order.customer_name} · {order.village}
                        </div>
                        <div style={{ fontSize: 12, color: "#777" }}>
                          📱 {order.customer_phone} · Order #{order.id}
                        </div>
                      </div>
                      <div style={{ fontWeight: 800, fontSize: 16, color: "#2D6A2D" }}>
                        {formatINR(order.total_amount)}
                      </div>
                    </div>

                    {/* Items preview */}
                    <div style={{ fontSize: 12, color: "#555", marginBottom: 10 }}>
                      {order.items.slice(0, isExpanded ? 999 : 2).map((item, i) => (
                        <div key={i}>{item.product_name} · {item.variety_name} — {item.quantity_kg}kg</div>
                      ))}
                      {!isExpanded && order.items.length > 2 && (
                        <div style={{ color: "#2D6A2D", fontSize: 11, fontWeight: 700, cursor: "pointer" }}
                          onClick={() => setExpanded(order.id)}>
                          +{order.items.length - 2} और items
                        </div>
                      )}
                    </div>

                    {/* Return flag */}
                    {order.return_requested && (
                      <div style={{ background: "#FEE2E2", borderRadius: 8, padding: "6px 10px", marginBottom: 8,
                        fontSize: 12, color: "#dc2626", fontWeight: 600 }}>
                        🔄 Return Request: {order.return_note || "Requested"}
                      </div>
                    )}

                    {/* Action buttons */}
                    <div style={{ display: "flex", gap: 8 }}>
                      {next && next !== "cancelled" && (
                        <button onClick={() => advance(order.id, next)} className="btn-press" style={{
                          flex: 1, background: "#2D6A2D", color: "white", border: "none",
                          borderRadius: 10, padding: "9px", fontFamily: "'Baloo 2', sans-serif",
                          fontWeight: 700, fontSize: 12, cursor: "pointer",
                        }}>
                          → {STATUS_META[next]?.emoji} {STATUS_META[next]?.label}
                        </button>
                      )}
                      {order.status === "placed" && (
                        <button onClick={() => advance(order.id, "cancelled")} className="btn-press" style={{
                          background: "none", border: "1.5px solid #dc2626", color: "#dc2626",
                          borderRadius: 10, padding: "9px 14px", fontFamily: "'Baloo 2', sans-serif",
                          fontWeight: 700, fontSize: 12, cursor: "pointer",
                        }}>
                          ✕ Cancel
                        </button>
                      )}
                      <button onClick={() => setExpanded(isExpanded ? null : order.id)} style={{
                        background: "#F0EDE8", border: "none", borderRadius: 10, padding: "9px 12px",
                        fontFamily: "'Baloo 2', sans-serif", fontSize: 12, color: "#777", cursor: "pointer",
                      }}>
                        {isExpanded ? "▲" : "▼"}
                      </button>
                    </div>
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
  created_at: string; customer_name: string; customer_phone: string; village: string;
  items: OrderItem[]; return_requested: boolean; return_note?: string };
