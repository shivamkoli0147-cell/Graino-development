import { useState, useEffect, useCallback, useRef } from "react";

type Village = { id: number; name: string };
type Category = { id: number; name: string; image_url?: string | null };

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

  // Image management state
  const [expandedCatId, setExpandedCatId] = useState<number | null>(null);
  const [imgUploading, setImgUploading] = useState<number | null>(null);
  const [imgRemoving, setImgRemoving] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingUploadId = useRef<number | null>(null);

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
    setVillages(prev => prev.filter(v => v.id !== id));
    showToast(`🗑 "${name}" हटाया गया`, "delete");
    await fetch(`/api/settings/villages/${id}`, { method: "DELETE" });
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
    setCategories(prev => prev.filter(c => c.id !== id));
    if (expandedCatId === id) setExpandedCatId(null);
    showToast(`🗑 "${name}" हटाई गई`, "delete");
    await fetch(`/api/settings/categories/${id}`, { method: "DELETE" });
  };

  const handleImageUpload = async (catId: number, file: File) => {
    setImgUploading(catId);
    const form = new FormData();
    form.append("image", file);
    try {
      const res = await fetch(`/api/settings/categories/${catId}/image`, {
        method: "POST", body: form,
      });
      if (res.ok) {
        const updated: Category = await res.json();
        setCategories(prev => prev.map(c => c.id === catId ? { ...c, image_url: updated.image_url } : c));
        showToast("✅ Photo save हो गया!", "success");
      } else {
        showToast("❌ Upload नहीं हो सका", "error");
      }
    } catch {
      showToast("❌ Upload नहीं हो सका", "error");
    }
    setImgUploading(null);
  };

  const handleImageRemove = async (catId: number) => {
    setImgRemoving(catId);
    try {
      const res = await fetch(`/api/settings/categories/${catId}/image`, { method: "DELETE" });
      if (res.ok) {
        setCategories(prev => prev.map(c => c.id === catId ? { ...c, image_url: null } : c));
        showToast("🗑 Photo हटाया गया", "delete");
      } else {
        showToast("❌ नहीं हटा सका", "error");
      }
    } catch {
      showToast("❌ नहीं हटा सका", "error");
    }
    setImgRemoving(null);
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

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={e => {
          const file = e.target.files?.[0];
          if (file && pendingUploadId.current !== null) {
            void handleImageUpload(pendingUploadId.current, file);
          }
          e.target.value = "";
        }}
      />

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
      <div style={{
        background: "linear-gradient(135deg,#1a3d1a,#2D6A2D)",
        flexShrink: 0, willChange: "transform", transform: "translateZ(0)", zIndex: 100,
      }}>
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
      )}

      {/* ── Categories Tab ──────────────────────────────────────── */}
      {activeTab === "categories" && (
        <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
          <div style={{
            padding: "12px 14px 10px", background: "white",
            borderBottom: "1px solid #F0EDE8", flexShrink: 0,
          }}>
            {categoryErr && (
              <div style={{ fontSize: 12, color: "#dc2626", marginBottom: 6,
                fontFamily: "'Baloo 2', sans-serif" }}>⚠ {categoryErr}</div>
            )}
            <div style={{ display: "flex", gap: 8 }}>
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
            <div style={{ fontSize: 11, color: "#bbb", marginTop: 6, fontFamily: "'Baloo 2', sans-serif" }}>
              💡 Category tap करें — photo add/remove करें
            </div>
          </div>

          <div style={{
            flex: 1, minHeight: 0, overflowY: "auto", overflowX: "hidden",
            WebkitOverflowScrolling: "touch", padding: "10px 14px 24px",
          }}>
            {categories.length === 0 ? (
              <div style={{ textAlign: "center", padding: "48px 20px", color: "#bbb", fontFamily: "'Baloo 2', sans-serif" }}>
                <div style={{ fontSize: 40, marginBottom: 10 }}>🏷</div>
                <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>कोई category नहीं</div>
                <div style={{ fontSize: 13 }}>ऊपर नाम लिखकर + दबाएं</div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {categories.map(c => {
                  const isExpanded = expandedCatId === c.id;
                  const isUploading = imgUploading === c.id;
                  const isRemoving = imgRemoving === c.id;
                  return (
                    <div key={c.id} style={{
                      background: "white", borderRadius: 14,
                      border: isExpanded ? "1.5px solid #F59E0B" : "1.5px solid #FEF3C7",
                      boxShadow: isExpanded ? "0 4px 16px rgba(245,158,11,0.12)" : "0 1px 4px rgba(0,0,0,0.04)",
                      overflow: "hidden", transition: "border-color 0.15s, box-shadow 0.15s",
                    }}>
                      {/* Row */}
                      <div
                        onClick={() => setExpandedCatId(isExpanded ? null : c.id)}
                        style={{
                          display: "flex", alignItems: "center", gap: 10,
                          padding: "11px 12px", cursor: "pointer",
                          boxSizing: "border-box",
                        }}
                      >
                        {/* Circle image or placeholder */}
                        <div style={{
                          width: 40, height: 40, borderRadius: "50%", flexShrink: 0,
                          background: c.image_url ? "transparent" : "#FEF3C7",
                          border: c.image_url ? "2px solid #F59E0B" : "2px dashed #F59E0B",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          overflow: "hidden",
                        }}>
                          {c.image_url ? (
                            <img src={c.image_url} alt={c.name}
                              style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          ) : (
                            <span style={{ fontSize: 16 }}>📷</span>
                          )}
                        </div>

                        <span style={{
                          fontWeight: 700, fontSize: 14, color: "#1C1C1C",
                          fontFamily: "'Baloo 2', sans-serif", flex: 1, minWidth: 0,
                          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        }}>
                          {c.name}
                        </span>

                        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                          {c.image_url && (
                            <span style={{
                              background: "#DCFCE7", color: "#15803D",
                              borderRadius: 6, padding: "2px 6px", fontSize: 10, fontWeight: 700,
                            }}>✓ Photo</span>
                          )}
                          <span style={{ fontSize: 13, color: "#aaa" }}>{isExpanded ? "▲" : "▼"}</span>
                          <button
                            onClick={e => { e.stopPropagation(); void removeCategory(c.id, c.name); }}
                            style={{
                              background: "#FEE2E2", color: "#dc2626",
                              border: "none", borderRadius: 8, width: 32, height: 32,
                              cursor: "pointer", fontSize: 16, fontWeight: 800,
                              display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1,
                            }}
                          >×</button>
                        </div>
                      </div>

                      {/* Expanded image management panel */}
                      {isExpanded && (
                        <div style={{
                          borderTop: "1px solid #FEF3C7",
                          padding: "12px 14px 14px",
                          background: "#FFFBEB",
                        }}>
                          {/* Image preview */}
                          {c.image_url && (
                            <div style={{ marginBottom: 12, display: "flex", alignItems: "center", gap: 10 }}>
                              <img
                                src={c.image_url}
                                alt={c.name}
                                style={{
                                  width: 64, height: 64, borderRadius: "50%",
                                  objectFit: "cover", border: "2px solid #F59E0B",
                                }}
                              />
                              <div>
                                <div style={{ fontWeight: 700, fontSize: 13, color: "#92400E" }}>
                                  {c.name} का Photo
                                </div>
                                <div style={{ fontSize: 11, color: "#b45309", marginTop: 2 }}>
                                  Customer app में circle में दिखेगा
                                </div>
                              </div>
                            </div>
                          )}

                          <div style={{ display: "flex", gap: 8 }}>
                            {/* Upload / Change button */}
                            <button
                              onClick={() => {
                                pendingUploadId.current = c.id;
                                fileInputRef.current?.click();
                              }}
                              disabled={isUploading}
                              style={{
                                flex: 1, background: isUploading ? "#aaa" : "#D97706",
                                color: "white", border: "none", borderRadius: 10,
                                padding: "10px", fontFamily: "'Baloo 2', sans-serif",
                                fontWeight: 800, fontSize: 13, cursor: isUploading ? "default" : "pointer",
                              }}
                            >
                              {isUploading ? "Upload हो रहा है..." : c.image_url ? "📷 Photo बदलें" : "📷 Photo Add करें"}
                            </button>

                            {/* Remove button (only if image exists) */}
                            {c.image_url && (
                              <button
                                onClick={() => void handleImageRemove(c.id)}
                                disabled={isRemoving}
                                style={{
                                  background: isRemoving ? "#aaa" : "none",
                                  border: "1.5px solid #DC2626", color: "#DC2626",
                                  borderRadius: 10, padding: "10px 14px",
                                  fontFamily: "'Baloo 2', sans-serif",
                                  fontWeight: 700, fontSize: 12, cursor: isRemoving ? "default" : "pointer",
                                  flexShrink: 0,
                                }}
                              >
                                {isRemoving ? "..." : "🗑 हटाएं"}
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
