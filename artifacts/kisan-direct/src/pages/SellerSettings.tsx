import { useState, useEffect, useCallback, useRef } from "react";

type Village = { id: number; name: string };
type Category = { id: number; name: string };

interface SellerSettingsProps {
  onBack: () => void;
}

type SettingsTab = "villages" | "categories";

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
  const [activeTab, setActiveTab] = useState<SettingsTab>("villages");

  const [villages, setVillages] = useState<Village[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [villageInput, setVillageInput] = useState("");
  const [categoryInput, setCategoryInput] = useState("");
  const [villageLoading, setVillageLoading] = useState(false);
  const [categoryLoading, setCategoryLoading] = useState(false);
  const [villageErr, setVillageErr] = useState("");
  const [categoryErr, setCategoryErr] = useState("");
  const [confirmDeleteVillage, setConfirmDeleteVillage] = useState<number | null>(null);
  const [confirmDeleteCategory, setConfirmDeleteCategory] = useState<number | null>(null);

  const { toast, show: showToast } = useToast();

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
    setConfirmDeleteVillage(null);
    await fetch(`/api/settings/villages/${id}`, { method: "DELETE" });
    await fetchVillages();
    showToast(`🗑 "${name}" हटाया गया`, "delete");
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
    if (res.ok) {
      setCategoryInput("");
      await fetchCategories();
      showToast(`✅ "${name}" जोड़ी गई!`, "success");
    } else {
      const d = await res.json();
      setCategoryErr(d.error || "Error");
      showToast("❌ जोड़ी नहीं हो सकी", "error");
    }
    setCategoryLoading(false);
  };

  const removeCategory = async (id: number, name: string) => {
    setConfirmDeleteCategory(null);
    await fetch(`/api/settings/categories/${id}`, { method: "DELETE" });
    await fetchCategories();
    showToast(`🗑 "${name}" हटाई गई`, "delete");
  };

  const toastBg =
    toast?.type === "success" ? "#1a3d1a" :
    toast?.type === "delete"  ? "#7C3AED" : "#dc2626";

  return (
    <div style={{
      flex: 1, display: "flex", flexDirection: "column",
      overflow: "hidden", background: "#F7F4EF",
      width: "100%", boxSizing: "border-box", position: "relative",
    }}>

      {/* ── Toast ──────────────────────────────────────────────── */}
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

      {/* ── Header ─────────────────────────────────────────────── */}
      <div style={{ background: "linear-gradient(135deg,#1a3d1a,#2D6A2D)", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 16px 0" }}>
          <button onClick={onBack} style={{
            background: "rgba(255,255,255,0.15)", border: "none", borderRadius: 10,
            padding: "7px 12px", color: "white", fontFamily: "'Baloo 2', sans-serif",
            fontWeight: 700, fontSize: 14, cursor: "pointer", flexShrink: 0,
          }}>←</button>
          <div style={{ minWidth: 0 }}>
            <div style={{ color: "white", fontSize: 17, fontWeight: 800 }}>⚙️ Settings</div>
            <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 11, marginTop: 1 }}>
              Villages & Categories manage करें
            </div>
          </div>
        </div>

        {/* Sub-tabs */}
        <div style={{ display: "flex", padding: "10px 16px 0" }}>
          {([
            { id: "villages" as SettingsTab, label: "🏘 Villages", count: villages.length, unit: "गांव" },
            { id: "categories" as SettingsTab, label: "🏷 Categories", count: categories.length, unit: "items" },
          ]).map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
              flex: 1, border: "none", cursor: "pointer",
              padding: "9px 4px 11px",
              background: activeTab === t.id ? "white" : "transparent",
              borderRadius: activeTab === t.id ? "12px 12px 0 0" : 0,
              fontFamily: "'Baloo 2', sans-serif",
              transition: "background 0.15s",
            }}>
              <div style={{ fontSize: 13, fontWeight: 800,
                color: activeTab === t.id ? "#1a3d1a" : "rgba(255,255,255,0.8)" }}>
                {t.label}
              </div>
              <div style={{ fontSize: 10, marginTop: 1, fontWeight: 600,
                color: activeTab === t.id ? "#2D6A2D" : "rgba(255,255,255,0.55)" }}>
                {t.count} {t.unit}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ── Villages Tab ────────────────────────────────────────── */}
      {activeTab === "villages" && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {/* Add input — always pinned at top */}
          <div style={{
            padding: "12px 14px 10px", background: "white",
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
            <div style={{ fontSize: 11, color: "#bbb", marginTop: 6,
              fontFamily: "'Baloo 2', sans-serif" }}>
              💡 Enter दबाएं या + tap करें
            </div>
          </div>

          {/* Village list */}
          <div style={{
            flex: 1, overflowY: "auto", overflowX: "hidden",
            padding: "10px 14px 24px", display: "flex", flexDirection: "column", gap: 7,
          }}>
            {villages.length === 0 ? (
              <div style={{
                textAlign: "center", padding: "48px 20px",
                color: "#bbb", fontFamily: "'Baloo 2', sans-serif",
              }}>
                <div style={{ fontSize: 40, marginBottom: 10 }}>🏘</div>
                <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>कोई गांव नहीं</div>
                <div style={{ fontSize: 13 }}>ऊपर नाम लिखकर + दबाएं</div>
              </div>
            ) : (
              villages.map(v => (
                <VillageRow
                  key={v.id}
                  village={v}
                  confirming={confirmDeleteVillage === v.id}
                  onDeleteTap={() => setConfirmDeleteVillage(v.id)}
                  onConfirm={() => void removeVillage(v.id, v.name)}
                  onCancel={() => setConfirmDeleteVillage(null)}
                />
              ))
            )}
          </div>
        </div>
      )}

      {/* ── Categories Tab ──────────────────────────────────────── */}
      {activeTab === "categories" && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {/* Add input — always pinned at top */}
          <div style={{
            padding: "12px 14px 10px", background: "white",
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
                placeholder="नई category का नाम..."
                style={{
                  flex: 1, minWidth: 0, border: "1.5px solid #E5DDD0", borderRadius: 10,
                  padding: "10px 12px", fontFamily: "'Baloo 2', sans-serif",
                  fontSize: 14, outline: "none", background: "#FAFAF8", boxSizing: "border-box",
                }}
              />
              <button
                onClick={() => void addCategory()}
                disabled={categoryLoading || !categoryInput.trim()}
                style={{
                  flexShrink: 0,
                  background: categoryLoading ? "#aaa" : !categoryInput.trim() ? "#E5DDD0" : "#D97706",
                  color: categoryLoading || !categoryInput.trim() ? "#888" : "white",
                  border: "none", borderRadius: 10, padding: "10px 18px",
                  fontFamily: "'Baloo 2', sans-serif", fontWeight: 800, fontSize: 18,
                  cursor: categoryLoading || !categoryInput.trim() ? "default" : "pointer",
                  lineHeight: 1, minWidth: 44,
                }}
              >{categoryLoading ? "…" : "+"}</button>
            </div>
            <div style={{ fontSize: 11, color: "#bbb", marginTop: 6,
              fontFamily: "'Baloo 2', sans-serif" }}>
              💡 Enter दबाएं या + tap करें
            </div>
          </div>

          {/* Category list */}
          <div style={{
            flex: 1, overflowY: "auto", overflowX: "hidden",
            padding: "10px 14px 24px", display: "flex", flexDirection: "column", gap: 7,
          }}>
            {categories.length === 0 ? (
              <div style={{
                textAlign: "center", padding: "48px 20px",
                color: "#bbb", fontFamily: "'Baloo 2', sans-serif",
              }}>
                <div style={{ fontSize: 40, marginBottom: 10 }}>🏷</div>
                <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>कोई category नहीं</div>
                <div style={{ fontSize: 13 }}>ऊपर नाम लिखकर + दबाएं</div>
              </div>
            ) : (
              categories.map(c => (
                <CategoryRow
                  key={c.id}
                  category={c}
                  confirming={confirmDeleteCategory === c.id}
                  onDeleteTap={() => setConfirmDeleteCategory(c.id)}
                  onConfirm={() => void removeCategory(c.id, c.name)}
                  onCancel={() => setConfirmDeleteCategory(null)}
                />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function VillageRow({ village, confirming, onDeleteTap, onConfirm, onCancel }: {
  village: Village;
  confirming: boolean;
  onDeleteTap: () => void;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div style={{
      background: "white", borderRadius: 12,
      border: confirming ? "1.5px solid #FCA5A5" : "1.5px solid #E8F5E8",
      boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
      overflow: "hidden", transition: "border-color 0.15s",
    }}>
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "11px 12px", gap: 8,
      }}>
        <span style={{
          fontWeight: 700, fontSize: 14, color: "#1C1C1C",
          fontFamily: "'Baloo 2', sans-serif", minWidth: 0,
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          📍 {village.name}
        </span>
        {!confirming && (
          <button onClick={onDeleteTap} style={{
            flexShrink: 0, background: "#FEE2E2", color: "#dc2626",
            border: "none", borderRadius: 8, width: 30, height: 30,
            cursor: "pointer", fontSize: 15, fontWeight: 800,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>×</button>
        )}
      </div>
      {confirming && (
        <div style={{
          padding: "8px 12px 10px", background: "#FEF2F2",
          borderTop: "1px solid #FCA5A5",
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8,
        }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: "#dc2626",
            fontFamily: "'Baloo 2', sans-serif" }}>
            पक्का हटाएं?
          </span>
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={onCancel} style={{
              background: "#F3F4F6", color: "#555", border: "none",
              borderRadius: 8, padding: "5px 12px", fontSize: 12,
              fontFamily: "'Baloo 2', sans-serif", fontWeight: 700, cursor: "pointer",
            }}>नहीं</button>
            <button onClick={onConfirm} style={{
              background: "#dc2626", color: "white", border: "none",
              borderRadius: 8, padding: "5px 12px", fontSize: 12,
              fontFamily: "'Baloo 2', sans-serif", fontWeight: 800, cursor: "pointer",
            }}>हाँ, हटाओ</button>
          </div>
        </div>
      )}
    </div>
  );
}

function CategoryRow({ category, confirming, onDeleteTap, onConfirm, onCancel }: {
  category: Category;
  confirming: boolean;
  onDeleteTap: () => void;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div style={{
      background: "white", borderRadius: 12,
      border: confirming ? "1.5px solid #FCA5A5" : "1.5px solid #FEF3C7",
      boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
      overflow: "hidden", transition: "border-color 0.15s",
    }}>
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "11px 12px", gap: 8,
      }}>
        <span style={{
          fontWeight: 700, fontSize: 14, color: "#1C1C1C",
          fontFamily: "'Baloo 2', sans-serif", minWidth: 0,
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          🏷 {category.name}
        </span>
        {!confirming && (
          <button onClick={onDeleteTap} style={{
            flexShrink: 0, background: "#FEE2E2", color: "#dc2626",
            border: "none", borderRadius: 8, width: 30, height: 30,
            cursor: "pointer", fontSize: 15, fontWeight: 800,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>×</button>
        )}
      </div>
      {confirming && (
        <div style={{
          padding: "8px 12px 10px", background: "#FEF2F2",
          borderTop: "1px solid #FCA5A5",
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8,
        }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: "#dc2626",
            fontFamily: "'Baloo 2', sans-serif" }}>
            पक्का हटाएं?
          </span>
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={onCancel} style={{
              background: "#F3F4F6", color: "#555", border: "none",
              borderRadius: 8, padding: "5px 12px", fontSize: 12,
              fontFamily: "'Baloo 2', sans-serif", fontWeight: 700, cursor: "pointer",
            }}>नहीं</button>
            <button onClick={onConfirm} style={{
              background: "#dc2626", color: "white", border: "none",
              borderRadius: 8, padding: "5px 12px", fontSize: 12,
              fontFamily: "'Baloo 2', sans-serif", fontWeight: 800, cursor: "pointer",
            }}>हाँ, हटाओ</button>
          </div>
        </div>
      )}
    </div>
  );
}
