import { useState, useEffect, useCallback } from "react";

type Village = { id: number; name: string };
type Category = { id: number; name: string };

interface SellerSettingsProps {
  onBack: () => void;
}

export function SellerSettings({ onBack }: SellerSettingsProps) {
  const [villages, setVillages] = useState<Village[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [villageInput, setVillageInput] = useState("");
  const [categoryInput, setCategoryInput] = useState("");
  const [villageLoading, setVillageLoading] = useState(false);
  const [categoryLoading, setCategoryLoading] = useState(false);
  const [villageErr, setVillageErr] = useState("");
  const [categoryErr, setCategoryErr] = useState("");

  const fetchVillages = useCallback(async () => {
    const res = await fetch("/api/settings/villages");
    if (res.ok) setVillages(await res.json());
  }, []);

  const fetchCategories = useCallback(async () => {
    const res = await fetch("/api/settings/categories");
    if (res.ok) setCategories(await res.json());
  }, []);

  useEffect(() => { void fetchVillages(); void fetchCategories(); }, [fetchVillages, fetchCategories]);

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
    if (res.ok) { setVillageInput(""); await fetchVillages(); }
    else { const d = await res.json(); setVillageErr(d.error || "Error"); }
    setVillageLoading(false);
  };

  const removeVillage = async (id: number) => {
    await fetch(`/api/settings/villages/${id}`, { method: "DELETE" });
    await fetchVillages();
  };

  const addCategory = async () => {
    const name = categoryInput.trim();
    if (!name) return;
    if (categories.some(c => c.name.toLowerCase() === name.toLowerCase())) {
      setCategoryErr("यह category पहले से है"); return;
    }
    setCategoryLoading(true); setCategoryErr("");
    const res = await fetch("/api/settings/categories", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (res.ok) { setCategoryInput(""); await fetchCategories(); }
    else { const d = await res.json(); setCategoryErr(d.error || "Error"); }
    setCategoryLoading(false);
  };

  const removeCategory = async (id: number) => {
    await fetch(`/api/settings/categories/${id}`, { method: "DELETE" });
    await fetchCategories();
  };

  return (
    <div style={{
      flex: 1, display: "flex", flexDirection: "column",
      overflow: "hidden", background: "#F7F4EF",
      width: "100%", boxSizing: "border-box",
    }}>
      {/* Header */}
      <div style={{
        background: "linear-gradient(135deg,#1a3d1a,#2D6A2D)",
        padding: "16px 16px 16px", flexShrink: 0,
        display: "flex", alignItems: "center", gap: 12,
      }}>
        <button onClick={onBack} style={{
          background: "rgba(255,255,255,0.15)", border: "none", borderRadius: 10,
          padding: "7px 12px", color: "white", fontFamily: "'Baloo 2', sans-serif",
          fontWeight: 700, fontSize: 14, cursor: "pointer", flexShrink: 0,
        }}>←</button>
        <div style={{ minWidth: 0 }}>
          <div style={{ color: "white", fontSize: 18, fontWeight: 800 }}>⚙️ Manage Settings</div>
          <div style={{ color: "rgba(255,255,255,0.65)", fontSize: 11, marginTop: 1 }}>
            Villages & Categories manage करें
          </div>
        </div>
      </div>

      {/* Scrollable content */}
      <div style={{
        flex: 1, overflowY: "auto", overflowX: "hidden",
        padding: "14px 14px 28px", display: "flex",
        flexDirection: "column", gap: 14, width: "100%", boxSizing: "border-box",
      }}>

        {/* ── Villages Section ─────────────────────────────────── */}
        <div style={{
          background: "white", borderRadius: 16,
          boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
          width: "100%", boxSizing: "border-box", overflow: "hidden",
        }}>
          {/* Section header */}
          <div style={{
            background: "linear-gradient(135deg,#E8F5E8,#d1fae5)",
            padding: "12px 14px", borderBottom: "1px solid #E5DDD0",
          }}>
            <div style={{ fontWeight: 800, fontSize: 15, color: "#1a3d1a" }}>🏘 Delivery Villages</div>
            <div style={{ fontSize: 12, color: "#2D6A2D", marginTop: 2 }}>
              {villages.length} गांव · Customer इन्हें देख सकते हैं
            </div>
          </div>

          {/* Add input — always visible at top */}
          <div style={{ padding: "12px 14px 10px", borderBottom: "1px solid #F0EDE8" }}>
            {villageErr && (
              <div style={{
                fontSize: 12, color: "#dc2626", marginBottom: 6,
                fontFamily: "'Baloo 2', sans-serif",
              }}>⚠ {villageErr}</div>
            )}
            <div style={{
              display: "flex", gap: 8, width: "100%", boxSizing: "border-box",
            }}>
              <input
                value={villageInput}
                onChange={e => { setVillageInput(e.target.value); setVillageErr(""); }}
                onKeyDown={e => e.key === "Enter" && void addVillage()}
                placeholder="नया गांव का नाम..."
                style={{
                  flex: 1, minWidth: 0, border: "1.5px solid #E5DDD0", borderRadius: 10,
                  padding: "9px 12px", fontFamily: "'Baloo 2', sans-serif",
                  fontSize: 14, outline: "none", background: "#FAFAF8",
                  boxSizing: "border-box",
                }}
              />
              <button
                onClick={() => void addVillage()}
                disabled={villageLoading || !villageInput.trim()}
                style={{
                  flexShrink: 0,
                  background: villageLoading || !villageInput.trim() ? "#E5DDD0" : "#2D6A2D",
                  color: villageLoading || !villageInput.trim() ? "#aaa" : "white",
                  border: "none", borderRadius: 10, padding: "9px 16px",
                  fontFamily: "'Baloo 2', sans-serif", fontWeight: 800, fontSize: 18,
                  cursor: villageLoading || !villageInput.trim() ? "default" : "pointer",
                  lineHeight: 1,
                }}
              >+</button>
            </div>
          </div>

          {/* Village list */}
          <div style={{ padding: "8px 14px 12px", display: "flex", flexDirection: "column", gap: 6 }}>
            {villages.length === 0 && (
              <div style={{ fontSize: 13, color: "#aaa", textAlign: "center", padding: "12px 0" }}>
                कोई गांव नहीं है, नया जोड़ें ↑
              </div>
            )}
            {villages.map(v => (
              <div key={v.id} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "9px 12px", background: "#F7FBF7", borderRadius: 10,
                border: "1.5px solid #E8F5E8", gap: 8,
              }}>
                <span style={{
                  fontWeight: 700, fontSize: 14, color: "#1C1C1C",
                  fontFamily: "'Baloo 2', sans-serif", minWidth: 0,
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>
                  📍 {v.name}
                </span>
                <button
                  onClick={() => void removeVillage(v.id)}
                  style={{
                    flexShrink: 0, background: "#FEE2E2", color: "#dc2626", border: "none",
                    borderRadius: 8, width: 28, height: 28, cursor: "pointer",
                    fontSize: 14, fontWeight: 800, display: "flex",
                    alignItems: "center", justifyContent: "center",
                  }}
                >×</button>
              </div>
            ))}
          </div>
        </div>

        {/* ── Categories Section ───────────────────────────────── */}
        <div style={{
          background: "white", borderRadius: 16,
          boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
          width: "100%", boxSizing: "border-box", overflow: "hidden",
        }}>
          {/* Section header */}
          <div style={{
            background: "linear-gradient(135deg,#FEF9C3,#fef3c7)",
            padding: "12px 14px", borderBottom: "1px solid #E5DDD0",
          }}>
            <div style={{ fontWeight: 800, fontSize: 15, color: "#92400E" }}>🏷 Product Categories</div>
            <div style={{ fontSize: 12, color: "#B45309", marginTop: 2 }}>
              {categories.length} categories · Products add करते समय दिखती हैं
            </div>
          </div>

          {/* Add input — always visible at top */}
          <div style={{ padding: "12px 14px 10px", borderBottom: "1px solid #F0EDE8" }}>
            {categoryErr && (
              <div style={{
                fontSize: 12, color: "#dc2626", marginBottom: 6,
                fontFamily: "'Baloo 2', sans-serif",
              }}>⚠ {categoryErr}</div>
            )}
            <div style={{
              display: "flex", gap: 8, width: "100%", boxSizing: "border-box",
            }}>
              <input
                value={categoryInput}
                onChange={e => { setCategoryInput(e.target.value); setCategoryErr(""); }}
                onKeyDown={e => e.key === "Enter" && void addCategory()}
                placeholder="नई category का नाम..."
                style={{
                  flex: 1, minWidth: 0, border: "1.5px solid #E5DDD0", borderRadius: 10,
                  padding: "9px 12px", fontFamily: "'Baloo 2', sans-serif",
                  fontSize: 14, outline: "none", background: "#FAFAF8",
                  boxSizing: "border-box",
                }}
              />
              <button
                onClick={() => void addCategory()}
                disabled={categoryLoading || !categoryInput.trim()}
                style={{
                  flexShrink: 0,
                  background: categoryLoading || !categoryInput.trim() ? "#E5DDD0" : "#D97706",
                  color: categoryLoading || !categoryInput.trim() ? "#aaa" : "white",
                  border: "none", borderRadius: 10, padding: "9px 16px",
                  fontFamily: "'Baloo 2', sans-serif", fontWeight: 800, fontSize: 18,
                  cursor: categoryLoading || !categoryInput.trim() ? "default" : "pointer",
                  lineHeight: 1,
                }}
              >+</button>
            </div>
          </div>

          {/* Category list */}
          <div style={{ padding: "8px 14px 12px", display: "flex", flexDirection: "column", gap: 6 }}>
            {categories.length === 0 && (
              <div style={{ fontSize: 13, color: "#aaa", textAlign: "center", padding: "12px 0" }}>
                कोई category नहीं है, नई जोड़ें ↑
              </div>
            )}
            {categories.map(c => (
              <div key={c.id} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "9px 12px", background: "#FFFBEB", borderRadius: 10,
                border: "1.5px solid #FEF3C7", gap: 8,
              }}>
                <span style={{
                  fontWeight: 700, fontSize: 14, color: "#1C1C1C",
                  fontFamily: "'Baloo 2', sans-serif", minWidth: 0,
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>
                  🏷 {c.name}
                </span>
                <button
                  onClick={() => void removeCategory(c.id)}
                  style={{
                    flexShrink: 0, background: "#FEE2E2", color: "#dc2626", border: "none",
                    borderRadius: 8, width: 28, height: 28, cursor: "pointer",
                    fontSize: 14, fontWeight: 800, display: "flex",
                    alignItems: "center", justifyContent: "center",
                  }}
                >×</button>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
