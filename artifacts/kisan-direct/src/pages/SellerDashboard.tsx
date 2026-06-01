import { useState, useEffect } from "react";
import { useGetDashboardStats } from "@workspace/api-client-react";
import { formatINR } from "../lib/utils";
import { SellerAnalytics } from "./SellerAnalytics";

interface SellerDashboardProps {
  onLogout: () => void;
  onManageOrders: () => void;
  onManageProducts: () => void;
  onManageSettings: () => void;
}

export function SellerDashboard({ onLogout, onManageOrders, onManageProducts, onManageSettings }: SellerDashboardProps) {
  const { data: stats, isLoading, refetch } = useGetDashboardStats();
  const s = stats as DashboardStats | undefined;

  const [coverageVillages, setCoverageVillages] = useState<string[]>([]);
  useEffect(() => {
    fetch("/api/settings/villages")
      .then(r => r.json())
      .then((rows: { id: number; name: string }[]) => setCoverageVillages(rows.map(r => r.name)))
      .catch(() => {});
  }, []);

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: "#F7F4EF" }}>
      {/* Header */}
      <div style={{ background: "linear-gradient(135deg,#1a3d1a,#2D6A2D)", padding: "20px 16px 20px", flexShrink: 0, willChange: "transform", transform: "translateZ(0)", zIndex: 100 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ color: "rgba(255,255,255,0.75)", fontSize: 12, fontWeight: 600 }}>नमस्ते 🙏</div>
            <div style={{ color: "white", fontSize: 22, fontWeight: 800, marginTop: 2 }}>Rohit Mukati</div>
            <div style={{ color: "rgba(255,255,255,0.65)", fontSize: 12, fontWeight: 500 }}>KisanDirect · MP</div>
          </div>
          <button onClick={onLogout} className="btn-press" style={{
            background: "rgba(255,255,255,0.15)", border: "none", borderRadius: 12,
            padding: "8px 14px", color: "white", fontFamily: "'Baloo 2', sans-serif",
            fontWeight: 700, fontSize: 12, cursor: "pointer",
          }}>Logout</button>
        </div>

        {/* Stats row */}
        {!isLoading && s && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 16 }}>
            <StatCard emoji="📋" label="नए Orders" value={String(s.new_orders)}
              sub="अभी pending" alert={s.new_orders > 0} />
            <StatCard emoji="💰" label="आज की कमाई" value={formatINR(s.today_earnings)} sub="आज" />
          </div>
        )}
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "16px 16px 24px", WebkitOverflowScrolling: "touch" }}>
        {/* Quick actions */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 800, fontSize: 15, color: "#1C1C1C", marginBottom: 10 }}>Quick Actions</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <ActionCard emoji="📋" label="Orders देखो" sub="सभी orders manage करो"
              color="#2D6A2D" onClick={onManageOrders} badge={s?.new_orders} />
            <ActionCard emoji="🌾" label="Products" sub="Products और prices update करो"
              color="#1a3d1a" onClick={onManageProducts} />
            <ActionCard emoji="⚙️" label="Settings" sub="Villages & categories manage करो"
              color="#6B4F12" onClick={onManageSettings} />
          </div>
        </div>


        {/* Village info */}
        {coverageVillages.length > 0 && (
          <div style={{ marginTop: 16, background: "linear-gradient(135deg,#E8F5E8,#d1fae5)", borderRadius: 16, padding: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: "#2D6A2D", marginBottom: 4 }}>
              🗺️ Delivery Coverage · {coverageVillages.length} गांव
            </div>
            <div style={{ fontSize: 12, color: "#555", lineHeight: 1.6 }}>
              {coverageVillages.join(", ")}
            </div>
          </div>
        )}

        <button onClick={() => refetch()} className="btn-press" style={{
          marginTop: 16, width: "100%", background: "#F0EDE8", border: "none",
          borderRadius: 14, padding: "12px", fontFamily: "'Baloo 2', sans-serif",
          fontWeight: 700, fontSize: 13, color: "#555", cursor: "pointer",
        }}>
          ↻ Refresh
        </button>

        <SellerAnalytics />
      </div>
    </div>
  );
}

function StatCard({ emoji, label, value, sub, alert }: { emoji: string; label: string; value: string; sub: string; alert?: boolean }) {
  return (
    <div style={{
      background: "rgba(255,255,255,0.15)", borderRadius: 14, padding: "12px 12px",
      backdropFilter: "blur(8px)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
        <span style={{ fontSize: 16 }}>{emoji}</span>
        {alert && <span style={{
          width: 8, height: 8, borderRadius: "50%", background: "#ef4444",
          boxShadow: "0 0 0 2px rgba(239,68,68,0.3)",
        }} className="pulse-ring" />}
      </div>
      <div style={{ color: "white", fontSize: 22, fontWeight: 800 }}>{value}</div>
      <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 11, fontWeight: 500, marginTop: 2 }}>{sub}</div>
      <div style={{ color: "rgba(255,255,255,0.55)", fontSize: 11, fontWeight: 600 }}>{label}</div>
    </div>
  );
}

function ActionCard({ emoji, label, sub, color, onClick, badge }: {
  emoji: string; label: string; sub: string; color: string; onClick: () => void; badge?: number;
}) {
  return (
    <button onClick={onClick} className="btn-press" style={{
      background: "white", border: "1.5px solid #E5DDD0", borderRadius: 16, padding: "16px 14px",
      textAlign: "left", cursor: "pointer", fontFamily: "'Baloo 2', sans-serif",
      boxShadow: "0 2px 8px rgba(0,0,0,0.05)", position: "relative",
    }}>
      <div style={{ fontSize: 28, marginBottom: 8 }}>{emoji}</div>
      <div style={{ fontWeight: 800, fontSize: 14, color }}>{label}</div>
      <div style={{ fontSize: 11, color: "#777", marginTop: 2 }}>{sub}</div>
      {!!badge && badge > 0 && (
        <div style={{
          position: "absolute", top: 10, right: 10,
          background: "#ef4444", color: "white", borderRadius: "50%",
          width: 20, height: 20, fontSize: 11, fontWeight: 800,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          {badge}
        </div>
      )}
    </button>
  );
}

type SlotBreakdownItem = { delivery_slot: string | null; count: number };
type DashboardStats = {
  new_orders: number; today_earnings: number; village_count: number;
  total_orders_today: number; slot_breakdown?: SlotBreakdownItem[];
};
