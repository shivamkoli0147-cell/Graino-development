import { useState, useEffect, useRef } from "react";
import { useGetOrders, useUpdateOrderStatus } from "@workspace/api-client-react";
import { formatINR, type CustomerSession } from "../lib/utils";
import { InvoiceModal } from "../components/InvoiceModal";

interface OrdersPageProps {
  customer: CustomerSession;
  onRequestReturn: (orderId: number, note: string) => void;
}

type OrderItem = { product_name: string; variety_name: string; price_per_kg: number; quantity_kg: number };
type Order = {
  id: number; status: string; payment_status: string; total_amount: number;
  created_at: string; delivery_slot?: string | null; items: OrderItem[];
  return_requested: boolean; return_note?: string; return_status?: string | null;
  invoice_url?: string | null;
};

// ── Status config ──────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, {
  badge: string; icon: string; borderColor: string; bgColor: string;
  badgeBg: string; badgeColor: string; dimmed?: boolean; pulse?: boolean;
}> = {
  placed: {
    badge: "प्रतीक्षा में", icon: "🕐",
    borderColor: "#F59E0B", bgColor: "#FFFBEB",
    badgeBg: "#FEF3C7", badgeColor: "#92400E",
    pulse: true,
  },
  accepted: {
    badge: "Confirm हो गया", icon: "✅",
    borderColor: "#3B82F6", bgColor: "#EFF6FF",
    badgeBg: "#DBEAFE", badgeColor: "#1E40AF",
  },
  out_for_delivery: {
    badge: "रास्ते में है", icon: "🚚",
    borderColor: "#F97316", bgColor: "#FFF7ED",
    badgeBg: "#FFEDD5", badgeColor: "#9A3412",
  },
  delivered: {
    badge: "पहुंच गया", icon: "✅✅",
    borderColor: "#22C55E", bgColor: "#F0FDF4",
    badgeBg: "#DCFCE7", badgeColor: "#15803D",
    dimmed: true,
  },
  cancelled: {
    badge: "रद्द हो गया", icon: "❌",
    borderColor: "#9CA3AF", bgColor: "#F9FAFB",
    badgeBg: "#F3F4F6", badgeColor: "#6B7280",
    dimmed: true,
  },
};

const STATUS_SORT: Record<string, number> = {
  placed: 0, accepted: 1, out_for_delivery: 2, delivered: 3, cancelled: 4,
};

// ── Time helpers ───────────────────────────────────────────────────────────────
function timeAgoActive(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diff < 60) return "अभी";
  if (diff < 3600) return `${Math.floor(diff / 60)} मिनट पहले`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} घंटे पहले`;
  return `${Math.floor(diff / 86400)} दिन पहले`;
}

function fullDate(dateStr: string): string {
  const d = new Date(dateStr);
  const months = ["जन", "फर", "मार्च", "अप्रैल", "मई", "जून", "जुलाई", "अग", "सितं", "अक्टू", "नवं", "दिसं"];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

// ── Pulse keyframes injected once ─────────────────────────────────────────────
function ensurePulseStyle() {
  if (document.getElementById("kd-pulse-style")) return;
  const style = document.createElement("style");
  style.id = "kd-pulse-style";
  style.textContent = `
    @keyframes kd-pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.55; }
    }
    .kd-pulse { animation: kd-pulse 1.6s ease-in-out infinite; }
  `;
  document.head.appendChild(style);
}

export function OrdersPage({ customer, onRequestReturn }: OrdersPageProps) {
  ensurePulseStyle();

  const { data: orders, isLoading, refetch } = useGetOrders(
    { phone: customer.phone, status: undefined },
    { query: { refetchInterval: 20000, refetchIntervalInBackground: true } }
  );
  const updateStatus = useUpdateOrderStatus();

  const handleCancel = (orderId: number) => {
    updateStatus.mutate(
      { id: orderId, data: { status: "cancelled" as const } },
      { onSuccess: () => void refetch() }
    );
  };

  // ── Live status-change alert ── track previous statuses so we can tell the
  // customer the moment an order actually moves (out for delivery / delivered).
  const [liveAlert, setLiveAlert] = useState<string | null>(null);
  const prevStatuses = useRef<Record<number, string> | null>(null);

  useEffect(() => {
    const list = (orders as Order[]) || [];
    if (!list.length) return;
    if (prevStatuses.current) {
      for (const o of list) {
        const prev = prevStatuses.current[o.id];
        if (prev && prev !== o.status) {
          if (o.status === "out_for_delivery") {
            setLiveAlert(`🚚 Order #${o.id} अब रास्ते में है!`);
          } else if (o.status === "delivered") {
            setLiveAlert(`✅ Order #${o.id} पहुंच गया!`);
          } else if (o.status === "accepted") {
            setLiveAlert(`✅ Order #${o.id} Confirm हो गया!`);
          }
        }
      }
    }
    prevStatuses.current = Object.fromEntries(list.map(o => [o.id, o.status]));
  }, [orders]);

  useEffect(() => {
    if (!liveAlert) return;
    const t = setTimeout(() => setLiveAlert(null), 4000);
    return () => clearTimeout(t);
  }, [liveAlert]);

  if (isLoading) return (
    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", background: "#F7F4EF" }}>
      <div style={{ fontSize: 36, animation: "kd-pulse 1.2s infinite" }}>📋</div>
    </div>
  );

  const list: Order[] = (orders as Order[]) || [];

  // Sort: active first (placed → accepted → out_for_delivery), then done (delivered → cancelled)
  const sorted = [...list].sort((a, b) => {
    const sa = STATUS_SORT[a.status] ?? 5;
    const sb = STATUS_SORT[b.status] ?? 5;
    if (sa !== sb) return sa - sb;
    const timeA = new Date(a.created_at).getTime();
    const timeB = new Date(b.created_at).getTime();
    return sa <= 2 ? timeB - timeA : timeA - timeB;
  });

  const counts = {
    pending: list.filter(o => o.status === "placed").length,
    confirm: list.filter(o => o.status === "accepted" || o.status === "out_for_delivery").length,
    done: list.filter(o => o.status === "delivered").length,
    cancelled: list.filter(o => o.status === "cancelled").length,
  };

  const activeCount = counts.pending + counts.confirm;

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: "#F7F4EF", position: "relative" }}>

      {/* ── Live status alert (top toast) ───────────────────────────────────── */}
      {liveAlert && (
        <div style={{
          position: "absolute", top: 10, left: "50%", transform: "translateX(-50%)",
          zIndex: 500, background: "#1a3d1a", color: "white",
          borderRadius: 30, padding: "9px 18px", fontSize: 13, fontWeight: 700,
          boxShadow: "0 6px 20px rgba(0,0,0,0.25)", whiteSpace: "nowrap",
          fontFamily: "'Baloo 2', sans-serif",
        }}>
          {liveAlert}
        </div>
      )}

      {/* ── Header ───────────────────────────────────────────────────────────── */}
      <div style={{
        background: "white", padding: "14px 16px 12px", flexShrink: 0,
        boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
        willChange: "transform", transform: "translateZ(0)", zIndex: 100,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontWeight: 800, fontSize: 19, color: "#1C1C1C" }}>📋 मेरे Orders</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <a href="tel:7089550147" style={{
              width: 32, height: 32, borderRadius: "50%", background: "#E8F5E8",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 15, textDecoration: "none", flexShrink: 0,
            }} title="Help: 7089550147">📞</a>
            <button onClick={() => refetch()} className="btn-press" style={{
              background: "#E8F5E8", border: "none", borderRadius: 10, padding: "6px 12px",
              color: "#2D6A2D", fontFamily: "'Baloo 2', sans-serif", fontWeight: 700, fontSize: 12, cursor: "pointer",
            }}>↻ Refresh</button>
          </div>
        </div>
        <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>{customer.name} · {customer.village}</div>
      </div>

      {/* ── Summary strip ─────────────────────────────────────────────────────── */}
      {list.length > 0 && (
        <div style={{
          background: "white", borderTop: "1px solid #F0EDE8",
          padding: "10px 16px", flexShrink: 0,
          display: "flex", gap: 8, overflowX: "auto",
          willChange: "transform", transform: "translateZ(0)", zIndex: 99,
        }}>
          {counts.pending > 0 && (
            <SummaryChip label={`🕐 ${counts.pending} प्रतीक्षा में`} bg="#FEF3C7" color="#92400E" pulse />
          )}
          {counts.confirm > 0 && (
            <SummaryChip label={`✅ ${counts.confirm} Confirm/रास्ते में`} bg="#DBEAFE" color="#1E40AF" />
          )}
          {counts.done > 0 && (
            <SummaryChip label={`📦 ${counts.done} पहुंचा`} bg="#DCFCE7" color="#15803D" />
          )}
          {counts.cancelled > 0 && (
            <SummaryChip label={`❌ ${counts.cancelled} रद्द`} bg="#F3F4F6" color="#6B7280" />
          )}
        </div>
      )}

      {/* ── Order list ────────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: "auto", padding: "12px 14px 24px", WebkitOverflowScrolling: "touch" }}>
        {!list.length ? (
          <div style={{ textAlign: "center", padding: "60px 24px", color: "#777" }}>
            <div style={{ fontSize: 52 }}>📦</div>
            <div style={{ fontWeight: 700, fontSize: 16, marginTop: 16 }}>अभी कोई order नहीं</div>
            <div style={{ fontSize: 13, color: "#aaa", marginTop: 6 }}>Products tab से order करो</div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {activeCount > 0 && activeCount < list.length ? (
              sorted.map((order, idx) => {
                const isLast = idx === activeCount - 1;
                return (
                  <OrderCard
                    key={order.id}
                    order={order}
                    onCancel={handleCancel}
                    onRequestReturn={onRequestReturn}
                    showDivider={isLast}
                  />
                );
              })
            ) : (
              sorted.map(order => (
                <OrderCard key={order.id} order={order} onCancel={handleCancel} onRequestReturn={onRequestReturn} />
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Live status tracker (placed → accepted → out for delivery → delivered) ─────
const TRACKER_STEPS = [
  { id: "placed", label: "मिला", icon: "🕐" },
  { id: "accepted", label: "Confirm", icon: "✅" },
  { id: "out_for_delivery", label: "रास्ते में", icon: "🚚" },
  { id: "delivered", label: "पहुंचा", icon: "📦" },
];

function StatusTracker({ status }: { status: string }) {
  const currentIdx = TRACKER_STEPS.findIndex(s => s.id === status);
  if (currentIdx < 0) return null;
  return (
    <div style={{ display: "flex", alignItems: "flex-start", marginTop: 10, padding: "2px 2px" }}>
      {TRACKER_STEPS.map((step, i) => {
        const done = i <= currentIdx;
        const isCurrent = i === currentIdx;
        return (
          <div key={step.id} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", position: "relative" }}>
            {i > 0 && (
              <div style={{
                position: "absolute", top: 9, right: "50%", width: "100%", height: 2,
                background: i <= currentIdx ? "#2D6A2D" : "#E5DDD0", zIndex: 0,
              }} />
            )}
            <div
              className={isCurrent ? "kd-pulse" : undefined}
              style={{
                width: 20, height: 20, borderRadius: "50%", zIndex: 1,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 10, background: done ? "#2D6A2D" : "#E5DDD0",
                color: done ? "white" : "#999",
              }}
            >
              {done ? "✓" : ""}
            </div>
            <div style={{
              fontSize: 9.5, fontWeight: isCurrent ? 800 : 600, marginTop: 4, textAlign: "center",
              color: isCurrent ? "#1a3d1a" : done ? "#2D6A2D" : "#aaa",
            }}>
              {step.icon} {step.label}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Summary chip ───────────────────────────────────────────────────────────────
function SummaryChip({ label, bg, color, pulse }: { label: string; bg: string; color: string; pulse?: boolean }) {
  return (
    <div
      className={pulse ? "kd-pulse" : undefined}
      style={{
        background: bg, color, fontWeight: 700, fontSize: 12,
        padding: "5px 12px", borderRadius: 20, whiteSpace: "nowrap",
        flexShrink: 0,
      }}
    >
      {label}
    </div>
  );
}

// ── Individual order card ──────────────────────────────────────────────────────
function OrderCard({ order, onCancel, onRequestReturn, showDivider }: {
  order: Order;
  onCancel: (id: number) => void;
  onRequestReturn: (id: number, note: string) => void;
  showDivider?: boolean;
}) {
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [showReturnForm, setShowReturnForm] = useState(false);
  const [returnNote, setReturnNote] = useState("");
  const [showInvoice, setShowInvoice] = useState(false);
  const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.placed;
  const canCancel = order.status === "placed" || order.status === "accepted";

  const timeStr = (order.status === "delivered" || order.status === "cancelled")
    ? fullDate(order.created_at)
    : timeAgoActive(order.created_at);

  return (
    <>
      <div style={{
        background: "white",
        borderRadius: 16,
        overflow: "hidden",
        borderLeft: `4px solid ${cfg.borderColor}`,
        boxShadow: cfg.dimmed
          ? "0 1px 4px rgba(0,0,0,0.04)"
          : "0 2px 10px rgba(0,0,0,0.08)",
        opacity: cfg.dimmed ? 0.82 : 1,
        transition: "opacity 0.2s",
      }}>

        {/* ── Top color band with badge ─────────────────────────────────────── */}
        <div style={{
          background: cfg.bgColor,
          padding: "9px 14px",
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <div
            className={cfg.pulse ? "kd-pulse" : undefined}
            style={{
              display: "inline-flex", alignItems: "center", gap: 5,
              background: cfg.badgeBg, borderRadius: 20,
              padding: "4px 12px 4px 8px",
            }}
          >
            <span style={{ fontSize: 16, lineHeight: 1 }}>{cfg.icon}</span>
            <span style={{ fontWeight: 800, fontSize: 13, color: cfg.badgeColor }}>
              {cfg.badge}
            </span>
          </div>

          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#666" }}>#{order.id}</div>
            <div style={{ fontSize: 11, color: "#888", marginTop: 1 }}>{timeStr}</div>
          </div>
        </div>

        {/* ── Order body ───────────────────────────────────────────────────────── */}
        <div style={{
          padding: cfg.dimmed ? "10px 14px 12px" : "12px 14px 14px",
        }}>

          {/* Items */}
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {order.items.map((item, i) => (
              <div key={i} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                fontSize: cfg.dimmed ? 12 : 13,
              }}>
                <span style={{ color: "#1C1C1C", fontWeight: 600 }}>
                  {item.product_name}
                  <span style={{ color: "#777", fontWeight: 400 }}> · {item.variety_name}</span>
                </span>
                <span style={{ color: "#555", marginLeft: 8, flexShrink: 0 }}>
                  {item.quantity_kg}kg
                </span>
              </div>
            ))}
          </div>

          {/* Divider + total row */}
          <div style={{
            borderTop: `1px solid ${cfg.dimmed ? "#F0EDE8" : "#E8E4DE"}`,
            marginTop: 10, paddingTop: 8,
            display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
            <span style={{ fontSize: 12, color: "#888", fontWeight: 600 }}>
              {order.payment_status === "paid" ? "✅ Paid" : "💵 COD"}
            </span>
            <span style={{
              fontWeight: 900, fontSize: cfg.dimmed ? 14 : 16,
              color: cfg.dimmed ? "#6B7280" : "#1C6B1C",
            }}>
              {formatINR(order.total_amount)}
            </span>
          </div>

          {/* Live progress tracker — only while order is still active */}
          {!cfg.dimmed && order.status !== "cancelled" && (
            <StatusTracker status={order.status} />
          )}

          {/* Invoice button — only for delivered orders */}
          {order.status === "delivered" && order.invoice_url && (
            <button
              onClick={() => setShowInvoice(true)}
              className="btn-press"
              style={{
                marginTop: 10, width: "100%",
                background: "linear-gradient(135deg,#1a3d1a,#2D6A2D)",
                color: "white", border: "none",
                borderRadius: 10, padding: "9px 14px",
                fontFamily: "'Baloo 2', sans-serif",
                fontWeight: 800, fontSize: 13, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              }}
            >
              📄 Invoice देखो
            </button>
          )}

          {/* Return request button */}
          {!order.return_requested && order.status !== "cancelled" && (
            showReturnForm ? (
              <div style={{ marginTop: 10, background: "#FFF7ED", border: "1.5px solid #FCD34D", borderRadius: 12, padding: "10px 12px" }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#92400E", marginBottom: 8 }}>
                  🔄 Return Request भेजें
                </div>
                <textarea
                  value={returnNote}
                  onChange={e => setReturnNote(e.target.value)}
                  placeholder="वापसी की वजह बताएं (optional)..."
                  rows={2}
                  style={{ width: "100%", borderRadius: 8, border: "1.5px solid #FCD34D", padding: "7px 10px", fontFamily: "'Baloo 2', sans-serif", fontSize: 12, resize: "none", boxSizing: "border-box", outline: "none" }}
                />
                <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                  <button
                    onClick={() => { onRequestReturn(order.id, returnNote.trim() || "Return requested"); setShowReturnForm(false); setReturnNote(""); }}
                    className="btn-press"
                    style={{ flex: 1, background: "#F59E0B", color: "#1B4332", border: "none", borderRadius: 10, padding: "8px", fontFamily: "'Baloo 2', sans-serif", fontWeight: 800, fontSize: 12, cursor: "pointer" }}>
                    भेजो
                  </button>
                  <button onClick={() => setShowReturnForm(false)} className="btn-press"
                    style={{ flex: 1, background: "white", color: "#555", border: "1.5px solid #E5E7EB", borderRadius: 10, padding: "8px", fontFamily: "'Baloo 2', sans-serif", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
                    रद्द करो
                  </button>
                </div>
              </div>
            ) : (
              <button onClick={() => setShowReturnForm(true)} className="btn-press"
                style={{ marginTop: 8, width: "100%", background: "none", border: "1.5px solid #F59E0B", color: "#92400E", borderRadius: 10, padding: "7px 14px", fontFamily: "'Baloo 2', sans-serif", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
                🔄 Return Request
              </button>
            )
          )}

          {/* Return status display */}
          {order.return_requested && (() => {
            const s = order.return_status;
            if (s === "accepted") return (
              <div style={{ background: "#DCFCE7", borderRadius: 8, padding: "6px 10px", marginTop: 8, fontSize: 12, color: "#15803D", fontWeight: 600 }}>
                ✅ Return Accept हुआ — Seller लेने आएंगे
              </div>
            );
            if (s === "rejected") return (
              <div style={{ background: "#FEE2E2", borderRadius: 8, padding: "6px 10px", marginTop: 8, fontSize: 12, color: "#dc2626", fontWeight: 600 }}>
                ❌ Return Reject हुआ
              </div>
            );
            if (s === "picked_up") return (
              <div style={{ background: "#DBEAFE", borderRadius: 8, padding: "6px 10px", marginTop: 8, fontSize: 12, color: "#1E40AF", fontWeight: 600 }}>
                📦 Return Pick Up हो गया
              </div>
            );
            return (
              <div style={{ background: "#FEF3C7", borderRadius: 8, padding: "6px 10px", marginTop: 8, fontSize: 12, color: "#92400E", fontWeight: 600 }}>
                ⏳ Return Request भेजा गया — जवाब का इंतजार है
              </div>
            );
          })()}

          {/* Cancel button — only for placed or accepted */}
          {canCancel && (
            confirmCancel ? (
              <div style={{
                marginTop: 10, background: "#FEF2F2", border: "1.5px solid #FCA5A5",
                borderRadius: 12, padding: "10px 12px",
              }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#991B1B", marginBottom: 8 }}>
                  ⚠️ Order #{order.id} रद्द करना चाहते हो?
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={() => { onCancel(order.id); setConfirmCancel(false); }}
                    className="btn-press"
                    style={{
                      flex: 1, background: "#DC2626", color: "white", border: "none",
                      borderRadius: 10, padding: "8px",
                      fontFamily: "'Baloo 2', sans-serif", fontWeight: 800, fontSize: 13, cursor: "pointer",
                    }}
                  >
                    हाँ, रद्द करो
                  </button>
                  <button
                    onClick={() => setConfirmCancel(false)}
                    className="btn-press"
                    style={{
                      flex: 1, background: "white", color: "#555",
                      border: "1.5px solid #E5E7EB", borderRadius: 10, padding: "8px",
                      fontFamily: "'Baloo 2', sans-serif", fontWeight: 700, fontSize: 13, cursor: "pointer",
                    }}
                  >
                    नहीं, रहने दो
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setConfirmCancel(true)}
                className="btn-press"
                style={{
                  marginTop: 10, width: "100%",
                  background: "none", border: "1.5px solid #DC2626", color: "#DC2626",
                  borderRadius: 10, padding: "8px 14px",
                  fontFamily: "'Baloo 2', sans-serif", fontWeight: 700, fontSize: 12,
                  cursor: "pointer",
                }}
              >
                ✕ Order रद्द करो
              </button>
            )
          )}
        </div>
      </div>

      {/* Invoice modal */}
      {showInvoice && order.invoice_url && (
        <InvoiceModal
          invoiceUrl={order.invoice_url}
          orderId={order.id}
          onClose={() => setShowInvoice(false)}
        />
      )}

      {/* Divider between active and past orders */}
      {showDivider && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "6px 0" }}>
          <div style={{ flex: 1, height: 1, background: "#E5DDD0" }} />
          <span style={{ fontSize: 11, color: "#AAA", fontWeight: 600, whiteSpace: "nowrap" }}>
            पुराने Orders ↓
          </span>
          <div style={{ flex: 1, height: 1, background: "#E5DDD0" }} />
        </div>
      )}
    </>
  );
}
