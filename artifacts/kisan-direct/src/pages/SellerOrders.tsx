import { useState, useEffect, useCallback } from "react";
import { useGetOrders, useUpdateOrderStatus } from "@workspace/api-client-react";
import type { OrderStatusUpdateStatus } from "@workspace/api-client-react";
import { formatINR } from "../lib/utils";
import { InvoiceModal } from "../components/InvoiceModal";

interface SellerOrdersProps {
  onBack: () => void;
}

type OrderItem = { product_name: string; variety_name: string; price_per_kg: number; quantity_kg: number };
type Order = {
  id: number; status: string; payment_status: string; total_amount: number;
  created_at: string; customer_name: string; customer_phone: string; village: string;
  items: OrderItem[]; return_requested: boolean; return_note?: string; return_status?: string | null;
  delivery_slot?: string; address?: string; landmark?: string;
  customer_lat?: number; customer_lng?: number;
  invoice_url?: string | null;
};

// ── Status maps ───────────────────────────────────────────────────────────────
const STATUS_ICON: Record<string, string> = {
  placed: "🕐", accepted: "✅", out_for_delivery: "🚚", delivered: "✅✅", cancelled: "❌",
};
const STATUS_LABEL: Record<string, string> = {
  placed: "Order मिला", accepted: "Accept हुआ",
  out_for_delivery: "रास्ते में", delivered: "Delivered", cancelled: "Cancel",
};

// ── Tab definitions ────────────────────────────────────────────────────────────
const TABS = [
  { id: "new",       label: "नए",      icon: "🔴", statuses: ["placed"] },
  { id: "confirmed", label: "Confirm", icon: "🔵", statuses: ["accepted", "out_for_delivery"] },
  { id: "delivered", label: "Done",    icon: "✅", statuses: ["delivered"] },
  { id: "cancelled", label: "रद्द",   icon: "❌", statuses: ["cancelled"] },
] as const;
type TabId = typeof TABS[number]["id"];

// ── Pulse style ────────────────────────────────────────────────────────────────
function ensurePulse() {
  if (document.getElementById("so-pulse")) return;
  const s = document.createElement("style");
  s.id = "so-pulse";
  s.textContent = `
    @keyframes so-ping { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.5;transform:scale(1.3)} }
    .so-ping { animation: so-ping 1.4s ease-in-out infinite; }
    @keyframes so-sheet { from{transform:translateY(100%)} to{transform:translateY(0)} }
    .so-sheet { animation: so-sheet 0.28s cubic-bezier(.25,.8,.25,1) forwards; }
    @keyframes so-overlay { from{opacity:0} to{opacity:1} }
    .so-overlay { animation: so-overlay 0.22s ease forwards; }
  `;
  document.head.appendChild(s);
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function fmt(dateStr: string): string {
  const d = new Date(dateStr);
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const h = d.getHours(), m = d.getMinutes();
  return `${d.getDate()} ${months[d.getMonth()]}, ${h % 12 || 12}:${String(m).padStart(2,"0")} ${h < 12 ? "AM" : "PM"}`;
}

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return "अभी";
  if (diff < 3600) return `${Math.floor(diff / 60)} मि. पहले`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} घंटे पहले`;
  return `${Math.floor(diff / 86400)} दिन पहले`;
}

function mapsUrl(address: string, lat?: number, lng?: number): string {
  if (lat && lng) return `https://maps.google.com/?q=${lat},${lng}`;
  return `https://maps.google.com/?q=${encodeURIComponent(address)}`;
}

// ── Main Component ─────────────────────────────────────────────────────────────
export function SellerOrders({ onBack }: SellerOrdersProps) {
  ensurePulse();
  const [tab, setTab] = useState<TabId>("new");
  const [detail, setDetail] = useState<Order | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const { data: orders, isLoading, refetch } = useGetOrders({ status: undefined });
  const updateStatus = useUpdateOrderStatus();

  const allOrders: Order[] = (orders as Order[]) || [];

  const handleRefetch = useCallback(() => {
    refetch();
    setLastUpdated(new Date());
  }, [refetch]);

  // Auto-refresh every 60s
  useEffect(() => {
    const t = setInterval(handleRefetch, 60000);
    return () => clearInterval(t);
  }, [handleRefetch]);

  const advance = (orderId: number, status: string) => {
    updateStatus.mutate(
      { id: orderId, data: { status: status as OrderStatusUpdateStatus } },
      {
        onSuccess: () => {
          handleRefetch();
          setDetail(prev => prev?.id === orderId ? { ...prev, status } : prev);
        },
      }
    );
  };

  const handleReturnStatus = async (orderId: number, status: string) => {
    try {
      await fetch(`/api/orders/${orderId}/return-status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      handleRefetch();
      setDetail(prev => prev?.id === orderId ? { ...prev, return_status: status } : prev);
    } catch { /* ignore */ }
  };

  // Count per tab
  const counts: Record<TabId, number> = {
    new: allOrders.filter(o => o.status === "placed").length,
    confirmed: allOrders.filter(o => o.status === "accepted" || o.status === "out_for_delivery").length,
    delivered: allOrders.filter(o => o.status === "delivered").length,
    cancelled: allOrders.filter(o => o.status === "cancelled").length,
  };

  // Orders for current tab
  const tabDef = TABS.find(t => t.id === tab)!;
  const tabOrders = allOrders
    .filter(o => tabDef.statuses.includes(o.status as never))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const lastUpdatedStr = (() => {
    const diff = Math.floor((Date.now() - lastUpdated.getTime()) / 1000);
    if (diff < 10) return "अभी update हुआ";
    if (diff < 60) return `${diff} सेकंड पहले`;
    return `${Math.floor(diff / 60)} मिनट पहले`;
  })();

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: "#F7F4EF", position: "relative" }}>

      {/* ── Header ─────────────────────────────────────────────────────────────── */}
      <div style={{
        background: "linear-gradient(135deg,#1a3d1a,#2D6A2D)",
        padding: "14px 14px 0", flexShrink: 0,
        willChange: "transform", transform: "translateZ(0)", zIndex: 100,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <button onClick={onBack} className="btn-press" style={{
            background: "rgba(255,255,255,0.15)", border: "none", borderRadius: 10,
            padding: "6px 12px", color: "white", fontFamily: "'Baloo 2', sans-serif",
            fontWeight: 700, fontSize: 13, cursor: "pointer", flexShrink: 0,
          }}>← Back</button>

          <div style={{ color: "white", fontWeight: 800, fontSize: 17, flex: 1 }}>
            📋 Orders
            {counts.new > 0 && (
              <span className="so-ping" style={{
                display: "inline-block", marginLeft: 8,
                background: "#EF4444", color: "white",
                borderRadius: 10, padding: "1px 8px", fontSize: 12, fontWeight: 700,
              }}>{counts.new} नए</span>
            )}
          </div>

          <div style={{ textAlign: "right" }}>
            <button onClick={handleRefetch} className="btn-press" style={{
              background: "rgba(255,255,255,0.15)", border: "none", borderRadius: 10,
              padding: "6px 10px", color: "white", fontFamily: "'Baloo 2', sans-serif",
              fontWeight: 700, fontSize: 12, cursor: "pointer",
            }}>↻ Refresh</button>
            <div style={{ color: "rgba(255,255,255,0.55)", fontSize: 10, marginTop: 2 }}>{lastUpdatedStr}</div>
          </div>
        </div>

        {/* ── Tabs ─────────────────────────────────────────────────────────────── */}
        <div style={{ display: "flex", gap: 0 }}>
          {TABS.map(t => {
            const isActive = tab === t.id;
            const cnt = counts[t.id];
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                style={{
                  flex: 1, border: "none", cursor: "pointer", padding: "9px 4px 11px",
                  background: isActive ? "white" : "transparent",
                  borderRadius: isActive ? "12px 12px 0 0" : 0,
                  fontFamily: "'Baloo 2', sans-serif",
                  transition: "background 0.15s",
                  position: "relative",
                }}
              >
                <div style={{ fontSize: 15 }}>{t.icon}</div>
                <div style={{
                  fontSize: 10, fontWeight: 800, marginTop: 1,
                  color: isActive ? "#1a3d1a" : "rgba(255,255,255,0.75)",
                  lineHeight: 1.1,
                }}>{t.label}</div>
                {cnt > 0 && (
                  <div style={{
                    position: "absolute", top: 4, right: "50%", transform: "translateX(10px)",
                    background: t.id === "new" ? "#EF4444" : t.id === "confirmed" ? "#3B82F6" : t.id === "delivered" ? "#22C55E" : "#9CA3AF",
                    color: "white", borderRadius: 10, padding: "0 5px",
                    fontSize: 9, fontWeight: 800, lineHeight: "14px", minWidth: 14, textAlign: "center",
                  }}>{cnt}</div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Tab body ────────────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: "auto", padding: "12px 14px 24px", WebkitOverflowScrolling: "touch" }}>
        {isLoading ? (
          <div style={{ textAlign: "center", padding: 60, color: "#888", fontSize: 14 }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
            लोड हो रहा है...
          </div>
        ) : tabOrders.length === 0 ? (
          <EmptyState tab={tab} />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {tabOrders.map(order => (
              <OrderCard
                key={order.id}
                order={order}
                tab={tab}
                onAdvance={advance}
                onOpenDetail={() => setDetail(order)}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Detail bottom sheet ─────────────────────────────────────────────────── */}
      {detail && (
        <OrderDetailSheet
          order={detail}
          onClose={() => setDetail(null)}
          onAdvance={(id, status) => advance(id, status)}
          onReturnStatus={handleReturnStatus}
        />
      )}
    </div>
  );
}

// ── Empty states ───────────────────────────────────────────────────────────────
function EmptyState({ tab }: { tab: TabId }) {
  const config = {
    new:       { emoji: "🌟", msg: "नए orders नहीं हैं", sub: "जब customer order करेगा, यहाँ दिखेगा" },
    confirmed: { emoji: "📦", msg: "कोई pending delivery नहीं", sub: "Accept किए orders यहाँ आते हैं" },
    delivered: { emoji: "🎉", msg: "अभी तक कोई delivery नहीं", sub: "Delivered orders यहाँ दिखेंगे" },
    cancelled: { emoji: "✅", msg: "कोई cancelled order नहीं", sub: "अच्छी बात है!" },
  }[tab];
  return (
    <div style={{ textAlign: "center", padding: "60px 24px", color: "#777" }}>
      <div style={{ fontSize: 52, marginBottom: 12 }}>{config.emoji}</div>
      <div style={{ fontWeight: 700, fontSize: 15, color: "#444" }}>{config.msg}</div>
      <div style={{ fontSize: 12, color: "#aaa", marginTop: 6 }}>{config.sub}</div>
    </div>
  );
}

// ── Order card ─────────────────────────────────────────────────────────────────
const TAB_CARD_STYLE: Record<TabId, { border: string; bg: string; badge: string; badgeText: string; badgeColor: string }> = {
  new: {
    border: "#F59E0B", bg: "#FFFBEB",
    badge: "नया Order — तुरंत Action लो", badgeText: "#92400E", badgeColor: "#FEF3C7",
  },
  confirmed: {
    border: "#3B82F6", bg: "#EFF6FF",
    badge: "Confirmed — Delivery करो", badgeText: "#1E40AF", badgeColor: "#DBEAFE",
  },
  delivered: {
    border: "#22C55E", bg: "#F0FDF4",
    badge: "पहुंच गया", badgeText: "#15803D", badgeColor: "#DCFCE7",
  },
  cancelled: {
    border: "#9CA3AF", bg: "#F9FAFB",
    badge: "रद्द हो गया", badgeText: "#6B7280", badgeColor: "#F3F4F6",
  },
};

function OrderCard({
  order, tab, onAdvance, onOpenDetail,
}: {
  order: Order; tab: TabId;
  onAdvance: (id: number, status: string) => void;
  onOpenDetail: () => void;
}) {
  const [confirmCancel, setConfirmCancel] = useState(false);
  const style = TAB_CARD_STYLE[tab];
  const isDimmed = tab === "delivered" || tab === "cancelled";
  const canCancel = order.status !== "cancelled";

  return (
    <div
      style={{
        background: "white", borderRadius: 16, overflow: "hidden",
        borderLeft: `4px solid ${style.border}`,
        boxShadow: isDimmed ? "0 1px 4px rgba(0,0,0,0.04)" : "0 3px 12px rgba(0,0,0,0.09)",
        opacity: isDimmed ? 0.85 : 1,
      }}
    >
      {/* Top badge strip */}
      <div style={{
        background: style.bg, padding: "8px 12px",
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {tab === "new" && (
            <span className="so-ping" style={{
              display: "inline-block", width: 8, height: 8, borderRadius: "50%",
              background: "#EF4444", flexShrink: 0,
            }} />
          )}
          <span style={{
            background: style.badgeColor, color: style.badgeText,
            borderRadius: 20, padding: "3px 10px",
            fontSize: 11, fontWeight: 800,
          }}>
            {STATUS_ICON[order.status]} {STATUS_LABEL[order.status]}
          </span>
          {order.return_requested && (
            <span style={{
              background: "#FEE2E2", color: "#DC2626",
              borderRadius: 20, padding: "3px 8px", fontSize: 10, fontWeight: 700,
            }}>🔄 Return</span>
          )}
        </div>
        <span style={{ fontSize: 11, color: "#888" }}>#{order.id} · {timeAgo(order.created_at)}</span>
      </div>

      {/* Card body */}
      <div style={{ padding: "11px 13px 12px" }}>
        {/* Customer row */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 14, color: "#1C1C1C" }}>
              {order.customer_name}
              <span style={{ fontWeight: 500, color: "#666", fontSize: 12 }}> · {order.village}</span>
            </div>
            <div style={{ fontSize: 12, color: "#888", marginTop: 1 }}>📱 {order.customer_phone}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{
              fontWeight: 900, fontSize: 17,
              color: isDimmed ? "#6B7280" : "#1a6b1a",
            }}>{formatINR(order.total_amount)}</div>
            <div style={{ fontSize: 10, color: "#aaa" }}>COD</div>
          </div>
        </div>

        {/* Items summary */}
        <div style={{ marginBottom: 8 }}>
          {order.items.map((item, i) => (
            <div key={i} style={{
              display: "flex", justifyContent: "space-between",
              fontSize: 12, color: "#444", marginBottom: 2,
            }}>
              <span style={{ fontWeight: 600 }}>{item.product_name}
                <span style={{ color: "#888", fontWeight: 400 }}> · {item.variety_name}</span>
              </span>
              <span style={{ color: "#555", flexShrink: 0, marginLeft: 8 }}>
                {item.quantity_kg}kg × {formatINR(item.price_per_kg)}
              </span>
            </div>
          ))}
        </div>

        {/* Address row */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
          {order.address && (
            <span style={{
              background: "#F0FDF4", color: "#166534",
              borderRadius: 8, padding: "3px 9px", fontSize: 11, fontWeight: 600,
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "100%",
            }}>📍 {order.address}</span>
          )}
        </div>

        {/* Action buttons */}
        <div style={{ display: "flex", gap: 7 }}>
          {/* View detail */}
          <button onClick={onOpenDetail} className="btn-press" style={{
            flex: 1, background: "#F5F5F5", border: "none", borderRadius: 10,
            padding: "8px", fontFamily: "'Baloo 2', sans-serif",
            fontWeight: 700, fontSize: 12, color: "#555", cursor: "pointer",
          }}>
            👁 Detail देखो
          </button>

          {/* Accept (placed) */}
          {order.status === "placed" && (
            <button onClick={() => onAdvance(order.id, "accepted")} className="btn-press" style={{
              flex: 2, background: "#1a6b1a", color: "white", border: "none",
              borderRadius: 10, padding: "8px", fontFamily: "'Baloo 2', sans-serif",
              fontWeight: 800, fontSize: 13, cursor: "pointer",
            }}>
              ✅ Accept करो
            </button>
          )}

          {/* Out for delivery (accepted) */}
          {order.status === "accepted" && (
            <button onClick={() => onAdvance(order.id, "out_for_delivery")} className="btn-press" style={{
              flex: 2, background: "#F97316", color: "white", border: "none",
              borderRadius: 10, padding: "8px", fontFamily: "'Baloo 2', sans-serif",
              fontWeight: 800, fontSize: 12, cursor: "pointer",
            }}>
              🚚 Out for Delivery
            </button>
          )}

          {/* Mark delivered (out_for_delivery) */}
          {order.status === "out_for_delivery" && (
            <button onClick={() => onAdvance(order.id, "delivered")} className="btn-press" style={{
              flex: 2, background: "#22C55E", color: "white", border: "none",
              borderRadius: 10, padding: "8px", fontFamily: "'Baloo 2', sans-serif",
              fontWeight: 800, fontSize: 12, cursor: "pointer",
            }}>
              ✅ Delivered!
            </button>
          )}

          {/* Small cancel button — any non-cancelled status */}
          {canCancel && !confirmCancel && (
            <button onClick={() => setConfirmCancel(true)} className="btn-press" style={{
              background: "none", border: "1.5px solid #DC2626", color: "#DC2626",
              borderRadius: 10, padding: "8px 10px", fontFamily: "'Baloo 2', sans-serif",
              fontWeight: 700, fontSize: 12, cursor: "pointer", flexShrink: 0,
            }}>
              ✕
            </button>
          )}
        </div>

        {/* Inline cancel confirmation */}
        {confirmCancel && (
          <div style={{
            marginTop: 8, background: "#FEF2F2", border: "1.5px solid #FCA5A5",
            borderRadius: 10, padding: "8px 10px",
          }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#991B1B", marginBottom: 7 }}>
              ⚠️ Order #{order.id} cancel करें?
            </div>
            <div style={{ display: "flex", gap: 7 }}>
              <button
                onClick={() => { onAdvance(order.id, "cancelled"); setConfirmCancel(false); }}
                className="btn-press"
                style={{
                  flex: 1, background: "#DC2626", color: "white", border: "none",
                  borderRadius: 8, padding: "7px",
                  fontFamily: "'Baloo 2', sans-serif", fontWeight: 800, fontSize: 12, cursor: "pointer",
                }}
              >
                हाँ, Cancel करो
              </button>
              <button
                onClick={() => setConfirmCancel(false)}
                className="btn-press"
                style={{
                  flex: 1, background: "white", color: "#555",
                  border: "1.5px solid #E5E7EB", borderRadius: 8, padding: "7px",
                  fontFamily: "'Baloo 2', sans-serif", fontWeight: 700, fontSize: 12, cursor: "pointer",
                }}
              >
                नहीं
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Order Detail Bottom Sheet ──────────────────────────────────────────────────
function OrderDetailSheet({
  order, onClose, onAdvance, onReturnStatus,
}: {
  order: Order;
  onClose: () => void;
  onAdvance: (id: number, status: string) => void;
  onReturnStatus: (id: number, status: string) => void;
}) {
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [showInvoice, setShowInvoice] = useState(false);
  const itemsTotal = order.items.reduce((s, i) => s + i.price_per_kg * i.quantity_kg, 0);
  const canCancel = order.status !== "cancelled";

  const nextActionMap: Record<string, { label: string; status: string; bg: string } | null> = {
    placed:           { label: "✅ Accept करो", status: "accepted", bg: "#1a6b1a" },
    accepted:         { label: "🚚 Out for Delivery", status: "out_for_delivery", bg: "#F97316" },
    out_for_delivery: { label: "✅✅ Mark Delivered", status: "delivered", bg: "#22C55E" },
    delivered:        null,
    cancelled:        null,
  };
  const nextAction = nextActionMap[order.status];

  return (
    <>
      {/* Overlay */}
      <div
        className="so-overlay"
        onClick={onClose}
        style={{
          position: "absolute", inset: 0,
          background: "rgba(0,0,0,0.45)", zIndex: 100,
        }}
      />
      {/* Sheet */}
      <div
        className="so-sheet"
        style={{
          position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 101,
          background: "white", borderRadius: "20px 20px 0 0",
          maxHeight: "88%", display: "flex", flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Sheet handle */}
        <div style={{ padding: "12px 16px 0", flexShrink: 0 }}>
          <div style={{ width: 40, height: 4, background: "#E5E7EB", borderRadius: 2, margin: "0 auto 12px" }} />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ fontWeight: 800, fontSize: 16, color: "#1C1C1C" }}>
              Order #{order.id} · {timeAgo(order.created_at)}
            </div>
            <button onClick={onClose} style={{
              background: "#F3F4F6", border: "none", borderRadius: 20,
              width: 32, height: 32, fontSize: 16, cursor: "pointer", color: "#666",
            }}>✕</button>
          </div>
        </div>

        {/* Scrollable content */}
        <div style={{ flex: 1, overflowY: "auto", padding: "0 16px 20px" }}>

          {/* Customer info */}
          <Section title="👤 Customer">
            <Row label="नाम" value={order.customer_name} />
            <Row label="गाँव" value={order.village} />
            <div style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "8px 0", borderBottom: "1px solid #F3F4F6",
            }}>
              <span style={{ fontSize: 13, color: "#888", fontWeight: 600 }}>📱 Phone</span>
              <a
                href={`tel:${order.customer_phone}`}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  background: "#1a6b1a", color: "white",
                  borderRadius: 20, padding: "5px 14px",
                  fontSize: 13, fontWeight: 800, textDecoration: "none",
                }}
              >
                📞 {order.customer_phone}
              </a>
            </div>
          </Section>

          {/* Delivery address */}
          {(order.address || order.landmark) && (
            <Section title="📍 Delivery Address">
              {order.address && (
                <div style={{ fontSize: 14, color: "#1C1C1C", fontWeight: 600, marginBottom: 6 }}>
                  {order.address}
                </div>
              )}
              {order.landmark && (
                <div style={{ fontSize: 13, color: "#666", marginBottom: 10 }}>
                  🏠 Landmark: {order.landmark}
                </div>
              )}
              {order.address && (
                <a
                  href={mapsUrl(order.address, order.customer_lat, order.customer_lng)}
                  target="_blank" rel="noreferrer"
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 6,
                    background: "#4285F4", color: "white",
                    borderRadius: 10, padding: "8px 16px",
                    fontSize: 13, fontWeight: 700, textDecoration: "none",
                  }}
                >
                  🗺 Google Maps पर खोलो
                </a>
              )}
            </Section>
          )}

          {/* Items */}
          <Section title="🛒 Items">
            {order.items.map((item, i) => (
              <div key={i} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "8px 0",
                borderBottom: i < order.items.length - 1 ? "1px solid #F3F4F6" : "none",
              }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#1C1C1C" }}>
                    {item.product_name}
                  </div>
                  <div style={{ fontSize: 12, color: "#888" }}>{item.variety_name} · {item.quantity_kg}kg</div>
                </div>
                <div style={{ fontWeight: 800, fontSize: 14, color: "#333" }}>
                  {formatINR(item.price_per_kg * item.quantity_kg)}
                </div>
              </div>
            ))}

            {/* Total */}
            <div style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              marginTop: 8, paddingTop: 10, borderTop: "2px solid #E5E7EB",
            }}>
              <span style={{ fontWeight: 700, fontSize: 14 }}>कुल Total</span>
              <span style={{ fontWeight: 900, fontSize: 18, color: "#1a6b1a" }}>
                {formatINR(order.total_amount)}
              </span>
            </div>
          </Section>

          {/* Payment & timestamps */}
          <Section title="💳 Payment & Info">
            <Row label="Payment" value={order.payment_status === "paid" ? "✅ Paid" : "💵 Cash on Delivery"} />
            <Row label="Order Time" value={fmt(order.created_at)} />
            <Row label="Status" value={`${STATUS_ICON[order.status]} ${STATUS_LABEL[order.status]}`} />
          </Section>

          {/* Invoice button — for delivered orders */}
          {order.status === "delivered" && order.invoice_url && (
            <div style={{ marginBottom: 16 }}>
              <button
                onClick={() => setShowInvoice(true)}
                className="btn-press"
                style={{
                  width: "100%",
                  background: "linear-gradient(135deg,#1a3d1a,#2D6A2D)",
                  color: "white", border: "none",
                  borderRadius: 12, padding: "12px 14px",
                  fontFamily: "'Baloo 2', sans-serif",
                  fontWeight: 800, fontSize: 14, cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
                }}
              >
                📄 Invoice / Receipt देखो
              </button>
            </div>
          )}

          {/* Return request */}
          {order.return_requested && (() => {
            const s = order.return_status;
            return (
              <div style={{ marginBottom: 16 }}>
                <div style={{ background: "#FEF3C7", borderRadius: 12, padding: "10px 14px", marginBottom: s === "requested" ? 8 : 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: "#92400E", marginBottom: 3 }}>
                    🔄 Return Request
                  </div>
                  <div style={{ fontSize: 12, color: "#78350F" }}>{order.return_note || "Customer ने return माँगा है"}</div>
                  {s === "accepted" && <div style={{ marginTop: 4, fontSize: 12, color: "#15803D", fontWeight: 700 }}>✅ Accept हुआ — Pick up pending</div>}
                  {s === "rejected" && <div style={{ marginTop: 4, fontSize: 12, color: "#DC2626", fontWeight: 700 }}>❌ Reject हो गया</div>}
                  {s === "picked_up" && <div style={{ marginTop: 4, fontSize: 12, color: "#1E40AF", fontWeight: 700 }}>📦 Pick Up हो गया</div>}
                </div>
                {(!s || s === "requested") && (
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => { onReturnStatus(order.id, "accepted"); }} className="btn-press" style={{
                      flex: 1, background: "#22C55E", color: "white", border: "none", borderRadius: 10, padding: "9px",
                      fontFamily: "'Baloo 2', sans-serif", fontWeight: 800, fontSize: 12, cursor: "pointer",
                    }}>✅ Accept करो</button>
                    <button onClick={() => { onReturnStatus(order.id, "rejected"); }} className="btn-press" style={{
                      flex: 1, background: "#EF4444", color: "white", border: "none", borderRadius: 10, padding: "9px",
                      fontFamily: "'Baloo 2', sans-serif", fontWeight: 800, fontSize: 12, cursor: "pointer",
                    }}>❌ Reject करो</button>
                  </div>
                )}
                {s === "accepted" && (
                  <button onClick={() => { onReturnStatus(order.id, "picked_up"); onClose(); }} className="btn-press" style={{
                    width: "100%", background: "#3B82F6", color: "white", border: "none", borderRadius: 10, padding: "9px",
                    fontFamily: "'Baloo 2', sans-serif", fontWeight: 800, fontSize: 12, cursor: "pointer",
                  }}>📦 Pick Up हो गया</button>
                )}
              </div>
            );
          })()}
        </div>

        {/* Action buttons pinned at bottom */}
        {(nextAction || canCancel) && (
          <div style={{
            padding: "12px 16px 20px", borderTop: "1px solid #F3F4F6",
            flexShrink: 0,
          }}>
            {/* Primary action + small cancel row */}
            <div style={{ display: "flex", gap: 8, marginBottom: confirmCancel ? 8 : 0 }}>
              {nextAction && (
                <button onClick={() => { onAdvance(order.id, nextAction.status); onClose(); }} className="btn-press" style={{
                  flex: 1, background: nextAction.bg, color: "white", border: "none",
                  borderRadius: 12, padding: "14px",
                  fontFamily: "'Baloo 2', sans-serif", fontWeight: 800, fontSize: 15,
                  cursor: "pointer",
                }}>
                  {nextAction.label}
                </button>
              )}
              {canCancel && !confirmCancel && (
                <button onClick={() => setConfirmCancel(true)} className="btn-press" style={{
                  background: "none", border: "1.5px solid #DC2626", color: "#DC2626",
                  borderRadius: 12, padding: "14px 18px",
                  fontFamily: "'Baloo 2', sans-serif", fontWeight: 700, fontSize: 13,
                  cursor: "pointer", flexShrink: 0,
                }}>
                  ✕ Cancel
                </button>
              )}
            </div>
            {/* Inline cancel confirmation */}
            {confirmCancel && (
              <div style={{
                background: "#FEF2F2", border: "1.5px solid #FCA5A5",
                borderRadius: 12, padding: "12px 14px",
              }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#991B1B", marginBottom: 10 }}>
                  ⚠️ Order #{order.id} cancel करना चाहते हो?
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={() => { onAdvance(order.id, "cancelled"); onClose(); }}
                    className="btn-press"
                    style={{
                      flex: 1, background: "#DC2626", color: "white", border: "none",
                      borderRadius: 10, padding: "12px",
                      fontFamily: "'Baloo 2', sans-serif", fontWeight: 800, fontSize: 14, cursor: "pointer",
                    }}
                  >
                    हाँ, Cancel करो
                  </button>
                  <button
                    onClick={() => setConfirmCancel(false)}
                    className="btn-press"
                    style={{
                      flex: 1, background: "white", color: "#555",
                      border: "1.5px solid #E5E7EB", borderRadius: 10, padding: "12px",
                      fontFamily: "'Baloo 2', sans-serif", fontWeight: 700, fontSize: 14, cursor: "pointer",
                    }}
                  >
                    नहीं, रहने दो
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Invoice modal */}
      {showInvoice && order.invoice_url && (
        <InvoiceModal
          invoiceUrl={order.invoice_url}
          orderId={order.id}
          onClose={() => setShowInvoice(false)}
        />
      )}
    </>
  );
}

// ── Reusable sub-components ────────────────────────────────────────────────────
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontWeight: 800, fontSize: 12, color: "#888", letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 8 }}>
        {title}
      </div>
      <div style={{ background: "#FAFAFA", borderRadius: 12, padding: "4px 12px" }}>
        {children}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: "8px 0", borderBottom: "1px solid #F3F4F6",
    }}>
      <span style={{ fontSize: 13, color: "#888", fontWeight: 600 }}>{label}</span>
      <span style={{ fontSize: 13, color: "#1C1C1C", fontWeight: 700, textAlign: "right", maxWidth: "65%" }}>{value}</span>
    </div>
  );
}
