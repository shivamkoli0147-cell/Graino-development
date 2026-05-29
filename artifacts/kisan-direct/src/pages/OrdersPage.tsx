import { useGetOrders } from "@workspace/api-client-react";
import { formatINR, DELIVERY_SLOTS, type CustomerSession } from "../lib/utils";

interface OrdersPageProps {
  customer: CustomerSession;
  onRequestReturn: (orderId: number) => void;
}

type OrderItem = { product_name: string; variety_name: string; price_per_kg: number; quantity_kg: number };
type Order = {
  id: number; status: string; payment_status: string; total_amount: number;
  created_at: string; delivery_slot?: string | null; items: OrderItem[];
  return_requested: boolean; return_note?: string;
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

  const { data: orders, isLoading, refetch } = useGetOrders({ phone: customer.phone, status: undefined });

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
    // Within same status: newest first for active, oldest first for done
    const timeA = new Date(a.created_at).getTime();
    const timeB = new Date(b.created_at).getTime();
    return sa <= 2 ? timeB - timeA : timeA - timeB;
  });

  // Summary counts
  const counts = {
    pending: list.filter(o => o.status === "placed").length,
    confirm: list.filter(o => o.status === "accepted" || o.status === "out_for_delivery").length,
    done: list.filter(o => o.status === "delivered").length,
    cancelled: list.filter(o => o.status === "cancelled").length,
  };

  const activeCount = counts.pending + counts.confirm;

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: "#F7F4EF" }}>

      {/* ── Header ───────────────────────────────────────────────────────────── */}
      <div style={{
        background: "white", padding: "14px 16px 12px", flexShrink: 0,
        boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontWeight: 800, fontSize: 19, color: "#1C1C1C" }}>📋 मेरे Orders</div>
          <button onClick={() => refetch()} className="btn-press" style={{
            background: "#E8F5E8", border: "none", borderRadius: 10, padding: "6px 12px",
            color: "#2D6A2D", fontFamily: "'Baloo 2', sans-serif", fontWeight: 700, fontSize: 12, cursor: "pointer",
          }}>↻ Refresh</button>
        </div>
        <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>{customer.name} · {customer.village}</div>
      </div>

      {/* ── Summary strip ─────────────────────────────────────────────────────── */}
      {list.length > 0 && (
        <div style={{
          background: "white", borderTop: "1px solid #F0EDE8",
          padding: "10px 16px", flexShrink: 0,
          display: "flex", gap: 8, overflowX: "auto",
        }}>
          {counts.pending > 0 && (
            <SummaryChip
              label={`🕐 ${counts.pending} प्रतीक्षा में`}
              bg="#FEF3C7" color="#92400E" pulse
            />
          )}
          {counts.confirm > 0 && (
            <SummaryChip
              label={`✅ ${counts.confirm} Confirm/रास्ते में`}
              bg="#DBEAFE" color="#1E40AF"
            />
          )}
          {counts.done > 0 && (
            <SummaryChip
              label={`📦 ${counts.done} पहुंचा`}
              bg="#DCFCE7" color="#15803D"
            />
          )}
          {counts.cancelled > 0 && (
            <SummaryChip
              label={`❌ ${counts.cancelled} रद्द`}
              bg="#F3F4F6" color="#6B7280"
            />
          )}
        </div>
      )}

      {/* ── Order list ────────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: "auto", padding: "12px 14px 24px" }}>
        {!list.length ? (
          <div style={{ textAlign: "center", padding: "60px 24px", color: "#777" }}>
            <div style={{ fontSize: 52 }}>📦</div>
            <div style={{ fontWeight: 700, fontSize: 16, marginTop: 16 }}>अभी कोई order नहीं</div>
            <div style={{ fontSize: 13, color: "#aaa", marginTop: 6 }}>Products tab से order करो</div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {/* Separator between active and done */}
            {activeCount > 0 && activeCount < list.length && (
              <>
                {sorted.map((order, idx) => {
                  const isLast = idx === activeCount - 1;
                  return (
                    <OrderCard
                      key={order.id}
                      order={order}
                      onRequestReturn={onRequestReturn}
                      showDivider={isLast}
                    />
                  );
                })}
              </>
            )}
            {(activeCount === 0 || activeCount === list.length) && sorted.map(order => (
              <OrderCard key={order.id} order={order} onRequestReturn={onRequestReturn} />
            ))}
          </div>
        )}
      </div>
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
function OrderCard({ order, onRequestReturn, showDivider }: {
  order: Order;
  onRequestReturn: (id: number) => void;
  showDivider?: boolean;
}) {
  const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.placed;
  const isActive = order.status === "placed" || order.status === "accepted" || order.status === "out_for_delivery";
  const canReturn = order.status === "delivered" && !order.return_requested;

  const timeStr = (order.status === "delivered" || order.status === "cancelled")
    ? fullDate(order.created_at)
    : timeAgoActive(order.created_at);

  const slot = order.delivery_slot ? DELIVERY_SLOTS.find(s => s.id === order.delivery_slot) : null;

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
          {/* Badge */}
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

          {/* Order # + time */}
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#666" }}>#{order.id}</div>
            <div style={{ fontSize: 11, color: "#888", marginTop: 1 }}>{timeStr}</div>
          </div>
        </div>

        {/* ── Order body ───────────────────────────────────────────────────────── */}
        <div style={{
          padding: cfg.dimmed ? "10px 14px 12px" : "12px 14px 14px",
        }}>

          {/* Delivery slot pill */}
          {slot && (
            <div style={{
              marginBottom: 9,
              display: "inline-flex", alignItems: "center", gap: 4,
              background: "#F5F3FF", borderRadius: 8, padding: "3px 10px",
            }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#6D28D9" }}>
                🚐 {slot.label} {slot.time}
              </span>
            </div>
          )}

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

          {/* Return request info */}
          {order.return_requested && (
            <div style={{
              background: "#FEE2E2", borderRadius: 8,
              padding: "6px 10px", marginTop: 8,
              fontSize: 12, color: "#dc2626", fontWeight: 600,
            }}>
              🔄 Return request भेजा गया
            </div>
          )}

          {/* Return button */}
          {canReturn && (
            <button
              onClick={() => onRequestReturn(order.id)}
              className="btn-press"
              style={{
                marginTop: 10, width: "100%",
                background: "none", border: "1.5px solid #dc2626", color: "#dc2626",
                borderRadius: 10, padding: "8px 14px",
                fontFamily: "'Baloo 2', sans-serif", fontWeight: 700, fontSize: 12,
                cursor: "pointer",
              }}
            >
              🔄 Return Request करो
            </button>
          )}
        </div>
      </div>

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
