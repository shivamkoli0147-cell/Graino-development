import { useState, useEffect, useCallback, useRef } from "react";

type Village = { id: number; name: string };

interface SellerSettingsProps {
  onBack: () => void;
}

function useToast() {
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" | "delete" } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const show = (msg: string, type: "success" | "error" | "delete" = "success") => {
    if (timer.current) clearTimeout(timer.current);
    setToast({ msg, type });
    timer.current = setTimeout(() => setToast(null), 2200);
  };
  return { toast, show };
}

export function SellerSettings({ onBack }: SellerSettingsProps) {
  const [villages, setVillages] = useState<Village[]>([]);
  const [villageInput, setVillageInput] = useState("");
  const [villageLoading, setVillageLoading] = useState(false);
  const [villageErr, setVillageErr] = useState("");

  const { toast, show: showToast } = useToast();

  const fetchVillages = useCallback(async () => {
    const res = await fetch("/api/settings/villages");
    if (res.ok) setVillages(await res.json());
  }, []);

  useEffect(() => { void fetchVillages(); }, [fetchVillages]);

  const addVillage = async () => {
    const name = villageInput.trim();
    if (!name) return;
    if (villages.some(v => v.name.toLowerCase() === name.toLowerCase())) {
      setVillageErr("यह गांव पहले से है"); return;
    }
    setVillageLoading(true); setVillageErr("");
    const res = await fetch("/api/settings/villages", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (res.ok) {
      setVillageInput("");
      await fetchVillages();
      showToast(`✅ "${name}" जोड़ा गया!`, "success");
    } else {
      const d = await res.json();
      setVillageErr(d.error || "Error");
      showToast("❌ जोड़ा नहीं हो सका", "error");
    }
    setVillageLoading(false);
  };

  const removeVillage = async (id: number, name: string) => {
    setVillages(prev => prev.filter(v => v.id !== id));
    showToast(`🗑 "${name}" हटाया गया`, "delete");
    await fetch(`/api/settings/villages/${id}`, { method: "DELETE" });
  };

  const toastBg =
    toast?.type === "success" ? "#1a3d1a" :
    toast?.type === "delete"  ? "#7C3AED" : "#dc2626";

  return (
    <div style={{
      flex: 1, minHeight: 0,
      display: "flex", flexDirection: "column",
      overflow: "hidden", background: "#F7F4EF",
      width: "100%", boxSizing: "border-box",
    }}>

      {/* ── Toast ── */}
      {toast && (
        <div style={{
          position: "absolute", top: 70, left: "50%",
          transform: "translateX(-50%)", zIndex: 999,
          background: toastBg, color: "white", borderRadius: 20,
          padding: "9px 20px", fontSize: 13, fontWeight: 700,
          fontFamily: "'Baloo 2', sans-serif",
          whiteSpace: "nowrap", boxShadow: "0 4px 20px rgba(0,0,0,0.25)",
          animation: "slideUp 0.25s ease",
          pointerEvents: "none",
        }}>{toast.msg}</div>
      )}

      {/* ── Header ── */}
      <div style={{
        background: "linear-gradient(135deg,#1a3d1a,#2D6A2D)",
        flexShrink: 0, willChange: "transform", transform: "translateZ(0)", zIndex: 100,
        padding: "16px 16px 14px",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={onBack} style={{
            background: "rgba(255,255,255,0.15)", border: "none", borderRadius: 10,
            padding: "7px 12px", color: "white", fontFamily: "'Baloo 2', sans-serif",
            fontWeight: 700, fontSize: 14, cursor: "pointer", flexShrink: 0,
          }}>←</button>
          <div style={{ minWidth: 0 }}>
            <div style={{ color: "white", fontSize: 17, fontWeight: 800 }}>⚙️ Settings</div>
            <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 11, marginTop: 1 }}>
              Delivery villages manage करें
            </div>
          </div>
        </div>
      </div>

      {/* ── Villages ── */}
      <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
        <div style={{
          padding: "12px 14px 10px", background: "white",
          borderBottom: "1px solid #F0EDE8", flexShrink: 0,
        }}>
          {villageErr && (
            <div style={{ fontSize: 12, color: "#dc2626", marginBottom: 6,
              fontFamily: "'Baloo 2', sans-serif" }}>⚠ {villageErr}</div>
          )}
          <div style={{ display: "flex", gap: 8 }}>
            <input
              value={villageInput}
              onChange={e => { setVillageInput(e.target.value); setVillageErr(""); }}
              onKeyDown={e => e.key === "Enter" && void addVillage()}
              placeholder="नया गांव का नाम..."
              style={{
                flex: 1, minWidth: 0, border: "1.5px solid #E5DDD0", borderRadius: 10,
                padding: "10px 12px", fontFamily: "'Baloo 2', sans-serif",
                fontSize: 14, outline: "none", background: "#FAFAF8", boxSizing: "border-box",
              }}
            />
            <button
              onClick={() => void addVillage()}
              disabled={villageLoading || !villageInput.trim()}
              style={{
                flexShrink: 0,
                background: villageLoading ? "#aaa" : !villageInput.trim() ? "#E5DDD0" : "#2D6A2D",
                color: villageLoading || !villageInput.trim() ? "#888" : "white",
                border: "none", borderRadius: 10, padding: "10px 18px",
                fontFamily: "'Baloo 2', sans-serif", fontWeight: 800, fontSize: 18,
                cursor: villageLoading || !villageInput.trim() ? "default" : "pointer",
                lineHeight: 1, minWidth: 44,
              }}
            >{villageLoading ? "…" : "+"}</button>
          </div>
          <div style={{ fontSize: 11, color: "#bbb", marginTop: 6, fontFamily: "'Baloo 2', sans-serif" }}>
            💡 Enter दबाएं या + tap करें
          </div>
        </div>

        <div style={{
          flex: 1, minHeight: 0, overflowY: "auto", overflowX: "hidden",
          WebkitOverflowScrolling: "touch", padding: "10px 14px 24px",
        }}>
          {villages.length === 0 ? (
            <div style={{ textAlign: "center", padding: "48px 20px", color: "#bbb", fontFamily: "'Baloo 2', sans-serif" }}>
              <div style={{ fontSize: 40, marginBottom: 10 }}>🏘</div>
              <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>कोई गांव नहीं</div>
              <div style={{ fontSize: 13 }}>ऊपर नाम लिखकर + दबाएं</div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {villages.map(v => (
                <div key={v.id} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  gap: 8, background: "white", borderRadius: 12,
                  border: "1.5px solid #E8F5E8", boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
                  padding: "11px 12px", boxSizing: "border-box",
                }}>
                  <span style={{
                    fontWeight: 700, fontSize: 14, color: "#1C1C1C",
                    fontFamily: "'Baloo 2', sans-serif", flex: 1, minWidth: 0,
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>📍 {v.name}</span>
                  <button onClick={() => void removeVillage(v.id, v.name)} style={{
                    flexShrink: 0, background: "#FEE2E2", color: "#dc2626",
                    border: "none", borderRadius: 8, width: 32, height: 32,
                    cursor: "pointer", fontSize: 16, fontWeight: 800,
                    display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1,
                  }}>×</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
