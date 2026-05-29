import { useState, useEffect, useCallback } from "react";

type Village = { id: number; name: string };
type Category = { id: number; name: string };

interface SellerSettingsProps {
  onBack: () => void;
}

type SettingsTab = "villages" | "categories";

export function SellerSettings({ onBack }: SellerSettingsProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>("villages");

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

      {/* ── Header ────────────────────────────────────────────── */}
      <div style={{
        background: "linear-gradient(135deg,#1a3d1a,#2D6A2D)",
        flexShrink: 0,
      }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 12,
          padding: "16px 16px 0",
        }}>
          <button onClick={onBack} style={{
            background: "rgba(255,255,255,0.15)", border: "none", borderRadius: 10,
            padding: "7px 12px", color: "white", fontFamily: "'Baloo 2', sans-serif",
            fontWeight: 700, fontSize: 14, cursor: "pointer", flexShrink: 0,
          }}>←</button>
          <div style={{ minWidth: 0 }}>
            <div style={{ color: "white", fontSize: 17, fontWeight: 800 }}>⚙️ Settings</div>
            <div style={{ color: "rgba(255,255,255,0.65)", fontSize: 11, marginTop: 1 }}>
              Villages & Categories manage करें
            </div>
          </div>
        </div>

        {/* ── Sub-tabs ──────────────────────────────────────────── */}
        <div style={{ display: "flex", padding: "10px 16px 0", gap: 0 }}>
          {([
            { id: "villages" as SettingsTab, label: "🏘 Villages", count: villages.length },
            { id: "categories" as SettingsTab, label: "🏷 Categories", count: categories.length },
          ]).map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              style={{
                flex: 1, border: "none", cursor: "pointer",
                padding: "9px 4px 11px",
                background: activeTab === t.id ? "white" : "transparent",
                borderRadius: activeTab === t.id ? "12px 12px 0 0" : 0,
                fontFamily: "'Baloo 2', sans-serif",
                transition: "background 0.15s",
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 800,
                color: activeTab === t.id ? "#1a3d1a" : "rgba(255,255,255,0.8)" }}>
                {t.label}
              </div>
              <div style={{ fontSize: 10, marginTop: 1,
                color: activeTab === t.id ? "#2D6A2D" : "rgba(255,255,255,0.55)",
                fontWeight: 600 }}>
                {t.count} {t.id === "villages" ? "गांव" : "categories"}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ── Villages Tab ──────────────────────────────────────── */}
      {activeTab === "villages" && (
        <div style={{
          flex: 1, display: "flex", flexDirection: "column",
          overflow: "hidden", width: "100%", boxSizing: "border-box",
        }}>
          {/* Add input */}
          <div style={{
            padding: "14px 14px 12px", background: "white",
            borderBottom: "1px solid #F0EDE8", flexShrink: 0,
          }}>
            {villageErr && (
              <div style={{ fontSize: 12, color: "#dc2626", marginBottom: 6,
                fontFamily: "'Baloo 2', sans-serif" }}>⚠ {villageErr}</div>
            )}
            <div style={{ display: "flex", gap: 8, width: "100%", boxSizing: "border-box" }}>
              <input
                value={villageInput}
                onChange={e => { setVillageInput(e.target.value); setVillageErr(""); }}
                onKeyDown={e => e.key === "Enter" && void addVillage()}
                placeholder="नया गांव का नाम लिखें..."
                style={{
                  flex: 1, minWidth: 0, border: "1.5px solid #E5DDD0", borderRadius: 10,
                  padding: "10px 12px", fontFamily: "'Baloo 2', sans-serif",
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
                  border: "none", borderRadius: 10, padding: "10px 18px",
                  fontFamily: "'Baloo 2', sans-serif", fontWeight: 800, fontSize: 17,
                  cursor: villageLoading || !villageInput.trim() ? "default" : "pointer",
                  lineHeight: 1,
                }}
              >+</button>
            </div>
          </div>

          {/* Village list — scrollable */}
          <div style={{
            flex: 1, overflowY: "auto", overflowX: "hidden",
            padding: "10px 14px 20px",
            display: "flex", flexDirection: "column", gap: 7,
          }}>
            {villages.length === 0 ? (
              <div style={{
                textAlign: "center", padding: "40px 20px",
                color: "#aaa", fontSize: 14, fontFamily: "'Baloo 2', sans-serif",
              }}>
                <div style={{ fontSize: 36, marginBottom: 8 }}>🏘</div>
                कोई गांव नहीं है<br />ऊपर से नया गांव जोड़ें
              </div>
            ) : (
              villages.map(v => (
                <div key={v.id} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "12px 14px", background: "white", borderRadius: 12,
                  border: "1.5px solid #E8F5E8", gap: 8,
                  boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
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
                      flexShrink: 0, background: "#FEE2E2", color: "#dc2626",
                      border: "none", borderRadius: 8, width: 30, height: 30,
                      cursor: "pointer", fontSize: 15, fontWeight: 800,
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}
                  >×</button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ── Categories Tab ────────────────────────────────────── */}
      {activeTab === "categories" && (
        <div style={{
          flex: 1, display: "flex", flexDirection: "column",
          overflow: "hidden", width: "100%", boxSizing: "border-box",
        }}>
          {/* Add input */}
          <div style={{
            padding: "14px 14px 12px", background: "white",
            borderBottom: "1px solid #F0EDE8", flexShrink: 0,
          }}>
            {categoryErr && (
              <div style={{ fontSize: 12, color: "#dc2626", marginBottom: 6,
                fontFamily: "'Baloo 2', sans-serif" }}>⚠ {categoryErr}</div>
            )}
            <div style={{ display: "flex", gap: 8, width: "100%", boxSizing: "border-box" }}>
              <input
                value={categoryInput}
                onChange={e => { setCategoryInput(e.target.value); setCategoryErr(""); }}
                onKeyDown={e => e.key === "Enter" && void addCategory()}
                placeholder="नई category का नाम लिखें..."
                style={{
                  flex: 1, minWidth: 0, border: "1.5px solid #E5DDD0", borderRadius: 10,
                  padding: "10px 12px", fontFamily: "'Baloo 2', sans-serif",
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
                  border: "none", borderRadius: 10, padding: "10px 18px",
                  fontFamily: "'Baloo 2', sans-serif", fontWeight: 800, fontSize: 17,
                  cursor: categoryLoading || !categoryInput.trim() ? "default" : "pointer",
                  lineHeight: 1,
                }}
              >+</button>
            </div>
          </div>

          {/* Category list — scrollable */}
          <div style={{
            flex: 1, overflowY: "auto", overflowX: "hidden",
            padding: "10px 14px 20px",
            display: "flex", flexDirection: "column", gap: 7,
          }}>
            {categories.length === 0 ? (
              <div style={{
                textAlign: "center", padding: "40px 20px",
                color: "#aaa", fontSize: 14, fontFamily: "'Baloo 2', sans-serif",
              }}>
                <div style={{ fontSize: 36, marginBottom: 8 }}>🏷</div>
                कोई category नहीं है<br />ऊपर से नई category जोड़ें
              </div>
            ) : (
              categories.map(c => (
                <div key={c.id} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "12px 14px", background: "white", borderRadius: 12,
                  border: "1.5px solid #FEF3C7", gap: 8,
                  boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
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
                      flexShrink: 0, background: "#FEE2E2", color: "#dc2626",
                      border: "none", borderRadius: 8, width: 30, height: 30,
                      cursor: "pointer", fontSize: 15, fontWeight: 800,
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}
                  >×</button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

    </div>
  );
}
