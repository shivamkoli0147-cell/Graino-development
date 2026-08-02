import { useState, useEffect } from "react";

const font = "'Baloo 2', sans-serif";

type ProductSummary = {
  id: number; name: string; name_en: string; emoji: string;
  count: number; average: number;
};

type Review = {
  id: number; customer_name: string; stars: number;
  comment: string | null; created_at: string;
};

function Stars({ value, size = 14, interactive = false, onChange }: {
  value: number; size?: number; interactive?: boolean; onChange?: (v: number) => void;
}) {
  return (
    <span style={{ display: "inline-flex", gap: 1 }}>
      {[1,2,3,4,5].map(i => (
        <span
          key={i}
          onClick={() => interactive && onChange?.(i)}
          style={{
            fontSize: size, color: i <= value ? "#F59E0B" : "#D1D5DB",
            cursor: interactive ? "pointer" : "default",
            transition: "color 0.1s",
          }}>★</span>
      ))}
    </span>
  );
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("hi-IN", { day: "2-digit", month: "short", year: "numeric" });
  } catch { return iso; }
}

// ── Edit / Add modal ──────────────────────────────────────────────────────────
function ReviewModal({ review, productId, onSave, onClose }: {
  review?: Review; productId: number;
  onSave: () => void; onClose: () => void;
}) {
  const [name, setName] = useState(review?.customer_name ?? "");
  const [stars, setStars] = useState(review?.stars ?? 5);
  const [comment, setComment] = useState(review?.comment ?? "");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const handleSave = async () => {
    if (!name.trim()) { setErr("नाम जरूरी है"); return; }
    setSaving(true); setErr("");
    try {
      let res: Response;
      if (review) {
        res = await fetch(`/api/admin/ratings/${review.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ customer_name: name.trim(), stars, comment: comment.trim() }),
        });
      } else {
        res = await fetch(`/api/products/${productId}/ratings`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ customer_name: name.trim(), stars, comment: comment.trim() }),
        });
      }
      if (!res.ok) { const d = await res.json(); setErr(d.error || "Error"); return; }
      onSave();
    } catch (e) { setErr(String(e)); }
    finally { setSaving(false); }
  };

  return (
    <>
      <div onClick={onClose} style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 400,
        animation: "fadeIn 0.15s ease",
      }} />
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0, margin: "0 auto",
        maxWidth: 390, background: "white", borderRadius: "22px 22px 0 0",
        zIndex: 401, padding: "20px 18px 32px",
        animation: "variety-sheet 0.35s cubic-bezier(0.22,1,0.36,1) both",
        boxShadow: "0 -8px 40px rgba(0,0,0,0.2)",
        maxHeight: "90vh", overflowY: "auto",
      }}>
        {/* Handle */}
        <div style={{ width: 36, height: 4, borderRadius: 2, background: "#E5E7EB", margin: "0 auto 16px" }} />
        <div style={{ fontWeight: 800, fontSize: 16, color: "#1C1C1C", marginBottom: 14, fontFamily: font }}>
          {review ? "✏️ Review Edit करें" : "➕ नई Review जोड़ें"}
        </div>

        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#555", marginBottom: 4, fontFamily: font }}>Customer का नाम</div>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="जैसे: Ramesh Kumar"
            style={{
              width: "100%", boxSizing: "border-box", border: "1.5px solid #E5DDD0",
              borderRadius: 10, padding: "9px 12px", fontFamily: font, fontSize: 14,
              outline: "none", background: "#FAFAF8",
            }} />
        </div>

        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#555", marginBottom: 6, fontFamily: font }}>Rating</div>
          <Stars value={stars} size={30} interactive onChange={setStars} />
        </div>

        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#555", marginBottom: 4, fontFamily: font }}>Comment (Optional)</div>
          <textarea value={comment} onChange={e => setComment(e.target.value)}
            placeholder="Review लिखें..." rows={3}
            style={{
              width: "100%", boxSizing: "border-box", border: "1.5px solid #E5DDD0",
              borderRadius: 10, padding: "9px 12px", fontFamily: font, fontSize: 13,
              outline: "none", background: "#FAFAF8", resize: "none",
            }} />
        </div>

        {err && (
          <div style={{ background: "#FEE2E2", borderRadius: 10, padding: "8px 12px",
            fontSize: 12, color: "#dc2626", fontWeight: 600, marginBottom: 12, fontFamily: font }}>
            ❌ {err}
          </div>
        )}

        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={onClose} style={{
            flex: 1, background: "#F4F4F4", color: "#555", border: "none",
            borderRadius: 12, padding: "11px 0", fontFamily: font, fontWeight: 700, fontSize: 14, cursor: "pointer",
          }}>रद्द करें</button>
          <button onClick={handleSave} disabled={saving} style={{
            flex: 2, background: saving ? "#ccc" : "linear-gradient(135deg,#1B4332,#2D6A2D)",
            color: "white", border: "none", borderRadius: 12, padding: "11px 0",
            fontFamily: font, fontWeight: 700, fontSize: 14, cursor: saving ? "default" : "pointer",
          }}>{saving ? "..." : (review ? "✓ Save करें" : "➕ जोड़ें")}</button>
        </div>
      </div>
    </>
  );
}

// ── Reviews list for one product ──────────────────────────────────────────────
function ProductReviews({ product, onBack }: { product: ProductSummary; onBack: () => void }) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<"add" | Review | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [toast, setToast] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/products/${product.id}/ratings`);
      const data = await res.json();
      setReviews(data.ratings ?? []);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, [product.id]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2500);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("क्या आप इस review को delete करना चाहते हैं?")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/ratings/${id}`, { method: "DELETE" });
      if (res.ok) { showToast("🗑 Review delete हो गई"); await load(); }
      else showToast("❌ Delete नहीं हो सका");
    } catch { showToast("❌ Error"); }
    finally { setDeletingId(null); }
  };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: "#F4F6F3" }}>
      {toast && (
        <div style={{
          position: "fixed", top: 60, left: "50%", transform: "translateX(-50%)",
          background: "#1C1C1C", color: "white", borderRadius: 20,
          padding: "10px 20px", fontSize: 13, fontWeight: 700, zIndex: 999,
          whiteSpace: "nowrap", boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
        }}>{toast}</div>
      )}

      {/* Header */}
      <div style={{
        background: "white", borderBottom: "1px solid #EDEAE5",
        padding: "14px 16px", flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        willChange: "transform", transform: "translateZ(0)", zIndex: 100,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={onBack} style={{
            background: "none", border: "none", cursor: "pointer",
            fontFamily: font, fontWeight: 700, fontSize: 15, color: "#555",
          }}>← वापस</button>
          <span style={{ fontSize: 22 }}>{product.emoji}</span>
          <div>
            <div style={{ fontWeight: 800, fontSize: 15, color: "#1C1C1C", fontFamily: font }}>{product.name}</div>
            <div style={{ fontSize: 11, color: "#888", fontFamily: font }}>
              {reviews.length} reviews
              {product.average > 0 && ` • ⭐ ${product.average}`}
            </div>
          </div>
        </div>
        <button onClick={() => setModal("add")} style={{
          background: "#2D6A2D", color: "white", border: "none",
          borderRadius: 10, padding: "7px 14px",
          fontFamily: font, fontWeight: 700, fontSize: 13, cursor: "pointer",
        }}>➕ जोड़ें</button>
      </div>

      {/* Reviews */}
      <div style={{ flex: 1, overflowY: "auto", padding: "12px 14px 24px" }}>
        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[1,2,3].map(i => (
              <div key={i} style={{
                height: 90, borderRadius: 14,
                background: "linear-gradient(90deg,#e8e8e8 25%,#f0f0f0 50%,#e8e8e8 75%)",
                backgroundSize: "200% 100%", animation: "shimmer 1.4s infinite",
              }} />
            ))}
          </div>
        ) : reviews.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px 24px", color: "#888" }}>
            <div style={{ fontSize: 44 }}>⭐</div>
            <div style={{ fontWeight: 700, marginTop: 12, fontFamily: font, fontSize: 15 }}>
              अभी कोई review नहीं है
            </div>
            <div style={{ fontSize: 12, color: "#aaa", marginTop: 4, fontFamily: font }}>
              ऊपर "➕ जोड़ें" से नई review add करें
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {reviews.map(r => (
              <div key={r.id} style={{
                background: "white", borderRadius: 14,
                border: "1.5px solid #EDEAE5",
                padding: "12px 14px",
                boxShadow: "0 1px 6px rgba(0,0,0,0.04)",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <div style={{
                        width: 30, height: 30, borderRadius: "50%",
                        background: "linear-gradient(135deg,#1B4332,#2D6A2D)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        color: "white", fontWeight: 800, fontSize: 13, flexShrink: 0,
                      }}>
                        {(r.customer_name || "?")[0].toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 13, color: "#1C1C1C", fontFamily: font }}>
                          {r.customer_name}
                        </div>
                        <div style={{ fontSize: 10, color: "#aaa", fontFamily: font }}>
                          {formatDate(r.created_at)}
                        </div>
                      </div>
                    </div>
                    <div style={{ marginBottom: r.comment ? 6 : 0 }}>
                      <Stars value={r.stars} size={14} />
                    </div>
                    {r.comment && (
                      <div style={{
                        fontSize: 12, color: "#555", fontFamily: font,
                        lineHeight: 1.5, background: "#F8F8F6",
                        borderRadius: 8, padding: "6px 10px", marginTop: 4,
                      }}>
                        "{r.comment}"
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div style={{ display: "flex", gap: 6, marginLeft: 10, flexShrink: 0 }}>
                    <button
                      onClick={() => setModal(r)}
                      style={{
                        background: "#EFF6FF", color: "#2563EB", border: "none",
                        borderRadius: 8, padding: "5px 10px",
                        fontFamily: font, fontWeight: 700, fontSize: 11, cursor: "pointer",
                      }}>✏️ Edit</button>
                    <button
                      onClick={() => handleDelete(r.id)}
                      disabled={deletingId === r.id}
                      style={{
                        background: "#FEE2E2", color: "#dc2626", border: "none",
                        borderRadius: 8, padding: "5px 10px",
                        fontFamily: font, fontWeight: 700, fontSize: 11,
                        cursor: deletingId === r.id ? "default" : "pointer",
                      }}>{deletingId === r.id ? "..." : "🗑"}</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {modal && (
        <ReviewModal
          review={modal === "add" ? undefined : modal}
          productId={product.id}
          onSave={() => { setModal(null); void load(); showToast(modal === "add" ? "✅ Review जोड़ी गई!" : "✅ Review update हो गई!"); }}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}

// ── Main: product list ────────────────────────────────────────────────────────
export function SellerReviews() {
  const [products, setProducts] = useState<ProductSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchErr, setFetchErr] = useState(false);
  const [selected, setSelected] = useState<ProductSummary | null>(null);

  const load = async () => {
    setLoading(true); setFetchErr(false);
    try {
      const res = await fetch("/api/admin/products-ratings");
      if (!res.ok) { setFetchErr(true); return; }
      const data = await res.json();
      setProducts(Array.isArray(data) ? data : []);
    } catch { setFetchErr(true); }
    finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, []);

  if (selected) {
    return <ProductReviews product={selected} onBack={() => { setSelected(null); void load(); }} />;
  }

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: "#F4F6F3" }}>

      {/* Header */}
      <div style={{
        background: "#1B4332", padding: "16px 16px 14px", flexShrink: 0,
        willChange: "transform", transform: "translateZ(0)", zIndex: 100,
      }}>
        <div style={{ fontWeight: 800, fontSize: 18, color: "white", fontFamily: font }}>
          ⭐ Reviews Management
        </div>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.65)", marginTop: 2, fontFamily: font }}>
          Product choose करें और reviews manage करें
        </div>
      </div>

      {/* Product list */}
      <div style={{ flex: 1, overflowY: "auto", padding: "12px 14px 24px" }}>
        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[1,2,3,4].map(i => (
              <div key={i} style={{
                height: 70, borderRadius: 14,
                background: "linear-gradient(90deg,#e8e8e8 25%,#f0f0f0 50%,#e8e8e8 75%)",
                backgroundSize: "200% 100%", animation: "shimmer 1.4s infinite",
              }} />
            ))}
          </div>
        ) : fetchErr ? (
          <div style={{ textAlign: "center", padding: "56px 24px" }}>
            <div style={{ fontSize: 44 }}>⚠️</div>
            <div style={{ fontWeight: 700, marginTop: 12, fontFamily: font, color: "#555" }}>
              Products load नहीं हो सके
            </div>
            <button onClick={load} style={{
              marginTop: 14, background: "#1B4332", color: "white",
              border: "none", borderRadius: 12, padding: "10px 24px",
              fontFamily: font, fontWeight: 700, fontSize: 14, cursor: "pointer",
            }}>🔄 दोबारा कोशिश करें</button>
          </div>
        ) : products.length === 0 ? (
          <div style={{ textAlign: "center", padding: "56px 24px", color: "#888" }}>
            <div style={{ fontSize: 44 }}>🌾</div>
            <div style={{ fontWeight: 700, marginTop: 12, fontFamily: font }}>कोई product नहीं मिला</div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {products.map(p => (
              <button
                key={p.id}
                onClick={() => setSelected(p)}
                className="btn-press"
                style={{
                  background: "white", borderRadius: 14,
                  border: "1.5px solid #EDEAE5",
                  padding: "14px 14px", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  boxShadow: "0 1px 6px rgba(0,0,0,0.04)",
                  textAlign: "left",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 12,
                    background: "linear-gradient(135deg,#dcfce7,#d1fae5)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 24, flexShrink: 0,
                  }}>{p.emoji}</div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 14, color: "#1C1C1C", fontFamily: font }}>
                      {p.name}
                    </div>
                    <div style={{ fontSize: 11, color: "#888", fontFamily: font }}>{p.name_en}</div>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                  {p.count > 0 ? (
                    <div style={{ textAlign: "right" }}>
                      <div style={{
                        background: "#FEF3C7", color: "#92400E",
                        borderRadius: 8, padding: "3px 8px",
                        fontSize: 11, fontWeight: 800, fontFamily: font,
                      }}>⭐ {p.average}</div>
                      <div style={{ fontSize: 10, color: "#aaa", marginTop: 2, fontFamily: font }}>
                        {p.count} reviews
                      </div>
                    </div>
                  ) : (
                    <div style={{
                      background: "#F4F4F4", color: "#aaa",
                      borderRadius: 8, padding: "3px 8px",
                      fontSize: 11, fontWeight: 700, fontFamily: font,
                    }}>No reviews</div>
                  )}
                  <span style={{ color: "#ccc", fontSize: 18 }}>›</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
