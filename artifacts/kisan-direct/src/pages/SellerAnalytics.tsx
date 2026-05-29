import { useState, useEffect } from "react";
import { formatINR } from "../lib/utils";

type TrendPoint = { date: string; earnings: number };
type TopProduct = { name: string; emoji: string; revenue: number; order_count: number };
type VillageSale = { village: string; revenue: number; order_count: number };
type AnalyticsData = {
  top_products: TopProduct[];
  village_sales: VillageSale[];
  earnings_trend: TrendPoint[];
};

const DAY_LABELS_HI = ["रवि", "सोम", "मंगल", "बुध", "गुरु", "शुक्र", "शनि"];

function getLast7Days(): { date: string; label: string }[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return { date: `${y}-${m}-${dd}`, label: DAY_LABELS_HI[d.getDay()] };
  });
}

const PALETTE = ["#2D6A2D", "#F59E0B", "#06B6D4", "#8B5CF6", "#E67E22", "#ef4444", "#4ade80", "#0ea5e9"];
const BAR_GRADIENTS = [
  ["#1a3d1a", "#4ade80"],
  ["#D97706", "#fbbf24"],
  ["#0e7490", "#67e8f9"],
  ["#6d28d9", "#c4b5fd"],
  ["#9a3412", "#fca5a5"],
];

function polarXY(cx: number, cy: number, r: number, deg: number) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function donutArcPath(cx: number, cy: number, outerR: number, innerR: number, a1: number, a2: number): string {
  const o1 = polarXY(cx, cy, outerR, a1);
  const o2 = polarXY(cx, cy, outerR, a2);
  const i1 = polarXY(cx, cy, innerR, a2);
  const i2 = polarXY(cx, cy, innerR, a1);
  const large = a2 - a1 > 180 ? 1 : 0;
  return [
    `M ${o1.x.toFixed(2)} ${o1.y.toFixed(2)}`,
    `A ${outerR} ${outerR} 0 ${large} 1 ${o2.x.toFixed(2)} ${o2.y.toFixed(2)}`,
    `L ${i1.x.toFixed(2)} ${i1.y.toFixed(2)}`,
    `A ${innerR} ${innerR} 0 ${large} 0 ${i2.x.toFixed(2)} ${i2.y.toFixed(2)}`,
    "Z",
  ].join(" ");
}

// ── Chart 1: 7-Day Earnings Trend ────────────────────────────────────────────

function EarningsTrendCard({ trend }: { trend: TrendPoint[] }) {
  const days = getLast7Days();
  const chartData = days.map(({ date, label }) => {
    const found = trend.find(t => t.date === date);
    return { label, earnings: found ? Number(found.earnings) : 0 };
  });

  const maxVal = Math.max(...chartData.map(d => d.earnings), 1);
  const total = chartData.reduce((s, d) => s + d.earnings, 0);
  const hasData = total > 0;

  const W = 320, H = 82;
  const PX = 12, PT = 8, PB = 20;
  const cW = W - 2 * PX, cH = H - PT - PB;

  const pts = chartData.map((d, i) => ({
    x: PX + (i / 6) * cW,
    y: PT + cH - (d.earnings / maxVal) * cH,
  }));

  let linePath = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
  for (let i = 1; i < pts.length; i++) {
    const p = pts[i - 1], c = pts[i];
    const cpX = ((p.x + c.x) / 2).toFixed(1);
    linePath += ` C ${cpX} ${p.y.toFixed(1)} ${cpX} ${c.y.toFixed(1)} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`;
  }
  const areaPath = `${linePath} L ${pts[6].x.toFixed(1)} ${(PT + cH).toFixed(1)} L ${pts[0].x.toFixed(1)} ${(PT + cH).toFixed(1)} Z`;

  return (
    <div style={{
      background: "white", borderRadius: 20, overflow: "hidden",
      boxShadow: "0 2px 16px rgba(0,0,0,0.07)", border: "1.5px solid #F0EDE8",
    }}>
      <div style={{
        background: "linear-gradient(135deg,#1a3d1a,#2D6A2D)",
        padding: "14px 16px 10px",
        display: "flex", justifyContent: "space-between", alignItems: "flex-start",
      }}>
        <div>
          <div style={{ color: "white", fontWeight: 800, fontSize: 15 }}>📈 7 दिन की कमाई</div>
          <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 11, marginTop: 1 }}>Daily earnings trend</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ color: "#4ade80", fontWeight: 800, fontSize: 18 }}>{formatINR(total)}</div>
          <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 10 }}>7-day total</div>
        </div>
      </div>

      <div style={{ padding: "12px 12px 8px", background: "#FAFAF8" }}>
        {!hasData ? (
          <div style={{ textAlign: "center", padding: "18px 0", color: "#ccc", fontSize: 12, fontFamily: "'Baloo 2', sans-serif" }}>
            अभी कोई completed orders नहीं हैं
          </div>
        ) : (
          <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", display: "block" }}>
            <defs>
              <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2D6A2D" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#2D6A2D" stopOpacity="0.01" />
              </linearGradient>
            </defs>
            {[0.33, 0.66].map(f => (
              <line key={f}
                x1={PX} y1={(PT + cH * (1 - f)).toFixed(1)} x2={W - PX} y2={(PT + cH * (1 - f)).toFixed(1)}
                stroke="#EDEAE5" strokeWidth="1" strokeDasharray="3 3"
              />
            ))}
            <path d={areaPath} fill="url(#areaFill)" />
            <path d={linePath} fill="none" stroke="#2D6A2D" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            {pts.map((p, i) => (
              <g key={i}>
                {chartData[i].earnings > 0 && (
                  <>
                    <circle cx={p.x} cy={p.y} r="4.5" fill="white" />
                    <circle cx={p.x} cy={p.y} r="3" fill="#F59E0B" />
                  </>
                )}
                <text x={p.x} y={H - 3} textAnchor="middle"
                  style={{ fontSize: "7.5px", fill: "#AAA", fontFamily: "'Baloo 2', sans-serif", fontWeight: 600 }}>
                  {chartData[i].label}
                </text>
              </g>
            ))}
          </svg>
        )}
      </div>
    </div>
  );
}

// ── Chart 2: Top Products Bar Chart ──────────────────────────────────────────

function TopProductsCard({ products }: { products: TopProduct[] }) {
  const maxRev = Math.max(...products.map(p => Number(p.revenue)), 1);

  return (
    <div style={{
      background: "white", borderRadius: 20, overflow: "hidden",
      boxShadow: "0 2px 16px rgba(0,0,0,0.07)", border: "1.5px solid #F0EDE8",
    }}>
      <div style={{ padding: "14px 16px 6px" }}>
        <div style={{ fontWeight: 800, fontSize: 15, color: "#1C1C1C" }}>🌾 Top Products</div>
        <div style={{ fontSize: 11, color: "#AAA", marginTop: 1, marginBottom: 14 }}>सबसे ज़्यादा revenue वाले products</div>

        {products.length === 0 ? (
          <div style={{ textAlign: "center", padding: "16px 0", color: "#ccc", fontSize: 12, fontFamily: "'Baloo 2', sans-serif" }}>
            अभी कोई product sales नहीं हैं
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12, paddingBottom: 6 }}>
            {products.map((p, i) => {
              const pct = (Number(p.revenue) / maxRev) * 100;
              const [from, to] = BAR_GRADIENTS[i] || BAR_GRADIENTS[0];
              return (
                <div key={i}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#1C1C1C", display: "flex", alignItems: "center", gap: 5 }}>
                      <span style={{ fontSize: 16 }}>{p.emoji}</span>
                      {p.name}
                    </span>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 12, fontWeight: 800, color: from }}>{formatINR(Number(p.revenue))}</div>
                      <div style={{ fontSize: 9, color: "#bbb" }}>{p.order_count} orders</div>
                    </div>
                  </div>
                  <div style={{ height: 9, background: "#F0EDE8", borderRadius: 99, overflow: "hidden", position: "relative" }}>
                    <div style={{
                      height: "100%", borderRadius: 99,
                      width: `${pct}%`,
                      background: `linear-gradient(90deg, ${from}, ${to})`,
                      boxShadow: `0 1px 6px ${from}55`,
                      transition: "width 0.8s cubic-bezier(.4,0,.2,1)",
                    }} />
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

// ── Chart 3: Village Sales Donut ──────────────────────────────────────────────

function VillageSalesCard({ sales }: { sales: VillageSale[] }) {
  const total = sales.reduce((s, v) => s + Number(v.revenue), 0);

  let cumDeg = 0;
  const segs = sales.map((s, i) => {
    const pct = total > 0 ? Number(s.revenue) / total : 1 / sales.length;
    const span = pct * 355;
    const start = cumDeg;
    cumDeg += span + (sales.length > 1 ? 360 / 355 : 0);
    return { ...s, pct, start, end: start + span, color: PALETTE[i % PALETTE.length] };
  });

  const topSales = sales.slice(0, 5);

  return (
    <div style={{
      background: "white", borderRadius: 20, overflow: "hidden",
      boxShadow: "0 2px 16px rgba(0,0,0,0.07)", border: "1.5px solid #F0EDE8",
    }}>
      <div style={{ padding: "14px 16px 16px" }}>
        <div style={{ fontWeight: 800, fontSize: 15, color: "#1C1C1C" }}>🗺️ Village-wise Sales</div>
        <div style={{ fontSize: 11, color: "#AAA", marginTop: 1, marginBottom: 12 }}>
          {sales.length > 0 ? `${sales.length} गांव से orders · कुल ${formatINR(total)}` : "गांव-वार बिक्री का विवरण"}
        </div>

        {sales.length === 0 ? (
          <div style={{ textAlign: "center", padding: "16px 0", color: "#ccc", fontSize: 12, fontFamily: "'Baloo 2', sans-serif" }}>
            अभी कोई village orders नहीं हैं
          </div>
        ) : (
          <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
            {/* Donut */}
            <svg viewBox="0 0 100 100" style={{ width: 96, height: 96, flexShrink: 0 }}>
              <defs>
                <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
                  <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodOpacity="0.15" />
                </filter>
              </defs>
              {sales.length === 1 ? (
                <>
                  <circle cx="50" cy="50" r="42" fill={segs[0].color} filter="url(#shadow)" />
                  <circle cx="50" cy="50" r="28" fill="white" />
                </>
              ) : (
                segs.map((seg, i) => (
                  <path key={i} d={donutArcPath(50, 50, 42, 28, seg.start, seg.end)}
                    fill={seg.color} filter="url(#shadow)" />
                ))
              )}
              <text x="50" y="46" textAnchor="middle"
                style={{ fontSize: "9px", fill: "#555", fontFamily: "'Baloo 2', sans-serif", fontWeight: 800 }}>
                {sales.length}
              </text>
              <text x="50" y="55" textAnchor="middle"
                style={{ fontSize: "6.5px", fill: "#AAA", fontFamily: "'Baloo 2', sans-serif" }}>
                गांव
              </text>
            </svg>

            {/* Legend */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 7 }}>
              {topSales.map((s, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <div style={{
                    width: 9, height: 9, borderRadius: 3, flexShrink: 0,
                    background: PALETTE[i % PALETTE.length],
                    boxShadow: `0 1px 4px ${PALETTE[i % PALETTE.length]}66`,
                  }} />
                  <span style={{
                    fontSize: 12, fontWeight: 600, color: "#333", flex: 1,
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    fontFamily: "'Baloo 2', sans-serif",
                  }}>{s.village}</span>
                  <span style={{ fontSize: 11, fontWeight: 800, color: "#2D6A2D", flexShrink: 0, fontFamily: "'Baloo 2', sans-serif" }}>
                    {formatINR(Number(s.revenue))}
                  </span>
                </div>
              ))}
              {sales.length > 5 && (
                <div style={{ fontSize: 11, color: "#bbb", fontFamily: "'Baloo 2', sans-serif" }}>
                  +{sales.length - 5} और गांव
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Export ───────────────────────────────────────────────────────────────

export function SellerAnalytics() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/analytics")
      .then(r => r.json())
      .then((d: AnalyticsData) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ padding: "16px 0", textAlign: "center" }}>
        <div style={{ fontSize: 12, color: "#bbb", fontFamily: "'Baloo 2', sans-serif" }}>
          📊 Analytics load हो रहा है...
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ fontWeight: 800, fontSize: 15, color: "#1C1C1C" }}>📊 Analytics</div>
      <EarningsTrendCard trend={data.earnings_trend} />
      <TopProductsCard products={data.top_products} />
      <VillageSalesCard sales={data.village_sales} />
    </div>
  );
}
