import { useState, useEffect } from "react";
import { useGetProduct } from "@workspace/api-client-react";
import { formatINR, type Cart, type CartItem } from "../lib/utils";

interface ProductDetailProps {
  productId: number;
  cart: Cart;
  onBack: () => void;
  onCartChange: (key: string, item: CartItem | null) => void;
  onGoToCart?: () => void;
  customer?: { id: number; name: string } | null;
}

type ProductImage = { id: number; url: string; sort_order: number };
type Variety = {
  id: number; name: string; price_per_kg: number;
  description?: string; shelf_life?: string;
  offer_price?: number | null; offer_label?: string | null;
  images?: ProductImage[];
};
type Product = {
  id: number; name: string; name_en: string; emoji: string; bg_color: string;
  category: string; min_kg: number; varieties: Variety[];
  price_per_kg?: number | null;
  images?: ProductImage[];
};

function ImageCarousel({ images, emoji, bgColor }: { images: ProductImage[]; emoji: string; bgColor: string }) {
  const [active, setActive] = useState(0);

  if (images.length === 0) {
    return (
      <div style={{
        background: bgColor || "linear-gradient(135deg,#e8f5e8,#d1fae5)",
        padding: "32px 12px 24px", textAlign: "center",
      }}>
        <div style={{ fontSize: 72 }}>{emoji}</div>
      </div>
    );
  }

  return (
    <div style={{ position: "relative", background: "#000", flexShrink: 0 }}>
      <div style={{
        width: "100%", height: 260, overflow: "hidden", position: "relative",
      }}>
        {images.map((img, i) => (
          <img
            key={img.id}
            src={img.url}
            alt={`Product image ${i + 1}`}
            style={{
              position: "absolute", inset: 0, width: "100%", height: "100%",
              objectFit: "cover",
              opacity: i === active ? 1 : 0,
              transition: "opacity 0.35s ease",
            }}
          />
        ))}
        {/* Gradient overlay at bottom */}
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0, height: 80,
          background: "linear-gradient(to top, rgba(0,0,0,0.55), transparent)",
        }} />
      </div>

      {/* Dot indicators */}
      {images.length > 1 && (
        <div style={{
          position: "absolute", bottom: 12, left: "50%", transform: "translateX(-50%)",
          display: "flex", gap: 6,
        }}>
          {images.map((_, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              style={{
                width: i === active ? 20 : 7, height: 7,
                borderRadius: 4, border: "none", cursor: "pointer",
                background: i === active ? "#F59E0B" : "rgba(255,255,255,0.55)",
                transition: "all 0.25s ease", padding: 0,
              }}
            />
          ))}
        </div>
      )}

      {/* Left / Right arrows */}
      {images.length > 1 && (
        <>
          <button
            onClick={() => setActive(i => Math.max(0, i - 1))}
            disabled={active === 0}
            style={{
              position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)",
              width: 32, height: 32, borderRadius: "50%", border: "none",
              background: active === 0 ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.75)",
              cursor: active === 0 ? "default" : "pointer",
              fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center",
              color: "#1C1C1C",
            }}>‹</button>
          <button
            onClick={() => setActive(i => Math.min(images.length - 1, i + 1))}
            disabled={active === images.length - 1}
            style={{
              position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
              width: 32, height: 32, borderRadius: "50%", border: "none",
              background: active === images.length - 1 ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.75)",
              cursor: active === images.length - 1 ? "default" : "pointer",
              fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center",
              color: "#1C1C1C",
            }}>›</button>
        </>
      )}

      {/* Thumbnail strip */}
      {images.length > 1 && (
        <div style={{
          display: "flex", gap: 6, padding: "8px 12px",
          background: "#f8f8f8", overflowX: "auto",
        }}>
          {images.map((img, i) => (
            <button
              key={img.id}
              onClick={() => setActive(i)}
              style={{
                flexShrink: 0, width: 52, height: 52, borderRadius: 8, padding: 0,
                border: i === active ? "2.5px solid #1B4332" : "2px solid transparent",
                overflow: "hidden", cursor: "pointer", background: "none",
                transition: "border-color 0.15s",
              }}
            >
              <img src={img.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Variety Bottom Sheet ───────────────────────────────────────────────────────
function VarietySheet({ variety, product, cart, onCartChange, onGoToCart, onClose, minKg }: {
  variety: Variety;
  product: Product;
  cart: Cart;
  onCartChange: (key: string, item: CartItem | null) => void;
  onGoToCart?: () => void;
  onClose: () => void;
  minKg: number;
}) {
  const key = `${product.id}-${variety.id}`;
  const inCart = !!cart[key];
  const [qty, setQty] = useState<number>((cart[key]?.quantityKg) ?? minKg);
  const font = "'Baloo 2', sans-serif";

  // If variety has its own images use them, otherwise fall back to product images
  const sheetImages: ProductImage[] = (variety.images && variety.images.length > 0)
    ? [...variety.images].sort((a, b) => a.sort_order - b.sort_order)
    : (product.images ?? []).sort((a, b) => a.sort_order - b.sort_order);

  const updateQty = (delta: number) => {
    const next = Math.max(minKg, qty + delta);
    setQty(next);
    if (cart[key]) onCartChange(key, { ...cart[key], quantityKg: next });
  };

  const toggleCart = () => {
    if (inCart) {
      onCartChange(key, null);
    } else {
      onCartChange(key, {
        productId: product.id, varietyId: variety.id,
        productName: product.name, productNameEn: product.name_en,
        productEmoji: product.emoji, varietyName: variety.name,
        pricePerKg: variety.price_per_kg, quantityKg: qty, minKg,
      });
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
          zIndex: 300, animation: "fadeIn 0.2s ease",
        }}
      />

      {/* Sheet panel */}
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0,
        margin: "0 auto", width: "100%", maxWidth: 390,
        background: "white", borderRadius: "22px 22px 0 0",
        zIndex: 301, maxHeight: "90vh", display: "flex", flexDirection: "column",
        animation: "variety-sheet 0.4s cubic-bezier(0.22,1,0.36,1) both",
        boxShadow: "0 -8px 40px rgba(0,0,0,0.25)",
        overflow: "hidden",
      }}>
        {/* Drag handle + close */}
        <div style={{ padding: "12px 16px 0", flexShrink: 0, textAlign: "center", position: "relative" }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: "#E5E7EB", margin: "0 auto 4px" }} />
          <button onClick={onClose} style={{
            position: "absolute", top: 10, right: 14,
            background: "rgba(0,0,0,0.07)", border: "none", borderRadius: "50%",
            width: 28, height: 28, cursor: "pointer", fontSize: 14,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>✕</button>
        </div>

        <div style={{ overflowY: "auto", flex: 1, WebkitOverflowScrolling: "touch" as const }}>
          {/* Image carousel */}
          <ImageCarousel images={sheetImages} emoji={product.emoji} bgColor={product.bg_color} />

          {/* Variety info */}
          <div style={{ padding: "16px 16px 0" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 800, fontSize: 18, color: "#1C1C1C", fontFamily: font }}>{variety.name}</div>
                <div style={{ fontSize: 12, color: "#777", fontFamily: font }}>{product.name} • {product.name_en}</div>
                {variety.offer_price && variety.offer_label && (
                  <div style={{
                    display: "inline-block", marginTop: 4,
                    background: "#FEF3C7", color: "#92400E",
                    borderRadius: 8, padding: "2px 8px",
                    fontSize: 11, fontWeight: 800, fontFamily: font,
                  }}>🏷️ {variety.offer_label}</div>
                )}
              </div>
              {variety.price_per_kg ? (
                <div style={{ textAlign: "right", marginLeft: 12, flexShrink: 0 }}>
                  {variety.offer_price ? (
                    <>
                      <div style={{ fontSize: 12, color: "#999", fontFamily: font,
                        textDecoration: "line-through", lineHeight: 1.2 }}>
                        {formatINR(variety.price_per_kg)}
                      </div>
                      <div style={{ fontWeight: 900, fontSize: 24, color: "#D97706", fontFamily: font, lineHeight: 1 }}>
                        {formatINR(variety.offer_price)}
                      </div>
                      <div style={{ fontSize: 10, color: "#999", fontFamily: font }}>per kg</div>
                    </>
                  ) : (
                    <>
                      <div style={{ fontWeight: 900, fontSize: 22, color: "#1B4332", fontFamily: font }}>
                        {formatINR(variety.price_per_kg)}
                      </div>
                      <div style={{ fontSize: 10, color: "#999", fontFamily: font }}>per kg</div>
                    </>
                  )}
                </div>
              ) : null}
            </div>

            {variety.description && (
              <div style={{ fontSize: 13, color: "#555", fontFamily: font, marginBottom: 6, lineHeight: 1.5 }}>
                {variety.description}
              </div>
            )}
            {variety.shelf_life && (
              <div style={{ fontSize: 12, color: "#4A9B4A", fontWeight: 600, fontFamily: font, marginBottom: 10 }}>
                📦 shelf life: {variety.shelf_life}
              </div>
            )}
          </div>

          {/* Qty + Buy/Cart */}
          <div style={{ padding: "12px 16px 28px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{
                display: "flex", alignItems: "center",
                background: "#F0F4F0", borderRadius: 12, overflow: "hidden",
              }}>
                <button
                  onClick={() => updateQty(-minKg)}
                  className="btn-press"
                  style={{
                    background: "none", border: "none", padding: "10px 15px",
                    cursor: "pointer", fontFamily: font,
                    fontWeight: 800, fontSize: 20, color: "#1B4332",
                  }}>−</button>
                <div style={{
                  fontWeight: 800, fontSize: 14, minWidth: 46, textAlign: "center",
                  color: "#1C1C1C", fontFamily: font,
                }}>{qty}kg</div>
                <button
                  onClick={() => updateQty(minKg)}
                  className="btn-press"
                  style={{
                    background: "none", border: "none", padding: "10px 15px",
                    cursor: "pointer", fontFamily: font,
                    fontWeight: 800, fontSize: 20, color: "#1B4332",
                  }}>+</button>
              </div>
              <button
                onClick={toggleCart}
                className="btn-press"
                style={{
                  flex: 1,
                  background: inCart
                    ? "linear-gradient(135deg,#dc2626,#b91c1c)"
                    : "linear-gradient(135deg,#1B4332,#2D6A2D)",
                  color: "white", border: "none", borderRadius: 12,
                  padding: "11px 0", fontFamily: font,
                  fontWeight: 700, fontSize: 13, cursor: "pointer",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                }}>
                {inCart ? "✓ Cart में है" : "🛒 Cart"}
              </button>
              {onGoToCart && (
                <button
                  onClick={() => { if (!inCart) toggleCart(); onGoToCart(); onClose(); }}
                  className="btn-press"
                  style={{
                    flex: 1.4,
                    background: "linear-gradient(135deg,#F59E0B,#D97706)",
                    color: "#1B4332", border: "none", borderRadius: 12,
                    padding: "11px 0", fontFamily: font,
                    fontWeight: 800, fontSize: 13, cursor: "pointer",
                    boxShadow: "0 2px 8px rgba(245,158,11,0.4)",
                  }}>
                  ⚡ अभी खरीदो
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Star display ──────────────────────────────────────────────────────────────
function StarRow({ stars, size = 14 }: { stars: number; size?: number }) {
  return (
    <span style={{ fontSize: size, letterSpacing: 1 }}>
      {[1,2,3,4,5].map(i => (
        <span key={i} style={{ color: i <= stars ? "#F59E0B" : "#D1D5DB" }}>★</span>
      ))}
    </span>
  );
}

// ── Ratings section ────────────────────────────────────────────────────────────
type RatingRow = { id: number; customer_name: string; stars: number; comment: string | null; created_at: string };

function RatingsSection({ productId, customer }: {
  productId: number;
  customer?: { id: number; name: string } | null;
}) {
  const [data, setData] = useState<{ average: number; count: number; ratings: RatingRow[] } | null>(null);
  const [myStars, setMyStars] = useState(0);
  const [myComment, setMyComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const font = "'Baloo 2', sans-serif";

  const load = () => {
    fetch(`/api/products/${productId}/ratings`).then(r => r.json()).then(setData).catch(() => {});
  };
  useEffect(() => { load(); }, [productId]);

  const submit = async () => {
    if (!myStars) return;
    setSubmitting(true);
    try {
      await fetch(`/api/products/${productId}/ratings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customer_id: customer?.id, customer_name: customer?.name || "Customer", stars: myStars, comment: myComment.trim() || undefined }),
      });
      setSubmitted(true); setMyStars(0); setMyComment(""); load();
    } finally { setSubmitting(false); }
  };

  if (!data) return null;

  return (
    <div style={{ marginTop: 18, paddingBottom: 8 }}>
      <div style={{ fontWeight: 800, fontSize: 14, color: "#1C1C1C", marginBottom: 10, fontFamily: font }}>
        ⭐ Ratings & Reviews
      </div>
      {data.count > 0 && (
        <div style={{ background: "white", borderRadius: 14, padding: "10px 16px", marginBottom: 10, display: "flex", alignItems: "center", gap: 14, border: "1.5px solid #EDEAE5" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontWeight: 900, fontSize: 30, color: "#1C1C1C", fontFamily: font, lineHeight: 1 }}>{data.average.toFixed(1)}</div>
            <StarRow stars={Math.round(data.average)} />
            <div style={{ fontSize: 11, color: "#888", marginTop: 3, fontFamily: font }}>{data.count} reviews</div>
          </div>
        </div>
      )}
      {customer && !submitted && (
        <div style={{ background: "white", borderRadius: 14, padding: "12px 14px", marginBottom: 10, border: "1.5px solid #EDEAE5" }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: "#555", marginBottom: 8, fontFamily: font }}>आपका अनुभव कैसा रहा?</div>
          <div style={{ display: "flex", gap: 4, marginBottom: 8 }}>
            {[1,2,3,4,5].map(s => (
              <button key={s} onClick={() => setMyStars(s)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, fontSize: 28, opacity: s <= myStars ? 1 : 0.22, transition: "opacity 0.15s" }}>★</button>
            ))}
          </div>
          <textarea value={myComment} onChange={e => setMyComment(e.target.value)} placeholder="Comment लिखें (optional)..." rows={2}
            style={{ width: "100%", borderRadius: 10, border: "1.5px solid #E5DDD0", padding: "8px 10px", fontFamily: font, fontSize: 13, resize: "none", boxSizing: "border-box", outline: "none", background: "#FAFAF8" }} />
          <button onClick={submit} disabled={!myStars || submitting} className="btn-press"
            style={{ marginTop: 8, width: "100%", background: myStars ? "linear-gradient(135deg,#1B4332,#2D6A2D)" : "#E5E7EB", color: myStars ? "white" : "#9CA3AF", border: "none", borderRadius: 10, padding: "9px 0", fontFamily: font, fontWeight: 700, fontSize: 13, cursor: myStars ? "pointer" : "default" }}>
            {submitting ? "..." : "⭐ Rating दें"}
          </button>
        </div>
      )}
      {submitted && <div style={{ background: "#DCFCE7", borderRadius: 12, padding: "8px 14px", marginBottom: 10, fontSize: 13, color: "#15803D", fontWeight: 700, fontFamily: font }}>✅ Rating दे दी गई, धन्यवाद!</div>}
      {data.ratings.slice(0, 5).map(r => (
        <div key={r.id} style={{ background: "white", borderRadius: 12, padding: "10px 14px", marginBottom: 8, border: "1.5px solid #F0EDE8" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
            <span style={{ fontWeight: 700, fontSize: 13, color: "#1C1C1C", fontFamily: font }}>{r.customer_name}</span>
            <StarRow stars={r.stars} size={13} />
          </div>
          {r.comment && <div style={{ fontSize: 12, color: "#555", fontFamily: font }}>{r.comment}</div>}
        </div>
      ))}
      {data.count === 0 && <div style={{ textAlign: "center", padding: "16px 0", fontSize: 13, color: "#AAA", fontFamily: font }}>अभी कोई review नहीं है</div>}
    </div>
  );
}

export function ProductDetail({ productId, cart, onBack, onCartChange, onGoToCart, customer }: ProductDetailProps) {
  const { data: product, isLoading } = useGetProduct(productId);
  const [selected, setSelected] = useState<number | null>(null);
  const [qty, setQty] = useState<Record<number, number>>({});
  const [noVarQty, setNoVarQty] = useState<number | null>(null);
  const [sheetVariety, setSheetVariety] = useState<Variety | null>(null);

  if (isLoading) return (
    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", background: "#F4F6F3" }}>
      <div style={{ fontSize: 32, animation: "pop 1s infinite" }}>🌾</div>
    </div>
  );
  if (!product) return null;

  const p = product as unknown as Product;
  const allVarieties = p.varieties ?? [];
  const varieties = allVarieties;
  const minKg = p.min_kg;
  const images = (p.images ?? []).sort((a, b) => a.sort_order - b.sort_order);
  const hasNoVarieties = allVarieties.length === 0;
  const directPrice = p.price_per_kg ?? null;
  const noVarCartKey = `${p.id}-0`;
  const noVarCurrentQty = noVarQty ?? minKg;

  const getQty = (varId: number) => qty[varId] ?? minKg;

  const toggleCart = (v: Variety) => {
    const key = `${p.id}-${v.id}`;
    if (cart[key]) {
      onCartChange(key, null);
    } else {
      const q = getQty(v.id);
      onCartChange(key, {
        productId: p.id, varietyId: v.id, productName: p.name, productNameEn: p.name_en,
        productEmoji: p.emoji, varietyName: v.name, pricePerKg: v.price_per_kg,
        quantityKg: q, minKg,
      });
    }
  };

  const toggleNoVarCart = () => {
    if (!directPrice) return;
    if (cart[noVarCartKey]) {
      onCartChange(noVarCartKey, null);
    } else {
      onCartChange(noVarCartKey, {
        productId: p.id, varietyId: 0, productName: p.name, productNameEn: p.name_en,
        productEmoji: p.emoji, varietyName: p.name, pricePerKg: directPrice,
        quantityKg: noVarCurrentQty, minKg,
      });
    }
  };

  const updateNoVarQty = (delta: number) => {
    const next = Math.max(minKg, noVarCurrentQty + delta);
    setNoVarQty(next);
    if (cart[noVarCartKey]) {
      onCartChange(noVarCartKey, { ...cart[noVarCartKey], quantityKg: next });
    }
  };

  const updateQty = (varId: number, delta: number) => {
    const cur = getQty(varId);
    const next = Math.max(minKg, cur + delta);
    setQty(prev => ({ ...prev, [varId]: next }));
    const key = `${p.id}-${varId}`;
    if (cart[key]) {
      onCartChange(key, { ...cart[key], quantityKg: next });
    }
  };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: "#F4F6F3" }}>

      {/* ── Image Carousel / Header ── */}
      <div style={{ position: "relative", flexShrink: 0, willChange: "transform", transform: "translateZ(0)", zIndex: 100 }}>
        <ImageCarousel images={images} emoji={p.emoji} bgColor={p.bg_color} />

        {/* Back button overlay */}
        <button onClick={onBack} className="btn-press" style={{
          position: "absolute", top: 12, left: 12,
          background: "rgba(255,255,255,0.88)", backdropFilter: "blur(8px)",
          border: "none", borderRadius: 12,
          padding: "7px 13px", fontFamily: "'Baloo 2', sans-serif", fontWeight: 700,
          fontSize: 14, cursor: "pointer", color: "#1C1C1C",
          boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
        }}>← वापस</button>

        {/* Image count badge */}
        {images.length > 0 && (
          <div style={{
            position: "absolute", top: 12, right: 12,
            background: "rgba(0,0,0,0.5)", borderRadius: 20,
            padding: "3px 10px", color: "white", fontSize: 11, fontWeight: 700,
            fontFamily: "'Baloo 2', sans-serif",
          }}>
            📷 {images.length}
          </div>
        )}
      </div>

      {/* ── Product name row ── */}
      <div style={{
        background: "white", padding: "14px 16px 12px",
        flexShrink: 0, borderBottom: "1px solid #EDEAE5",
        willChange: "transform", transform: "translateZ(0)", zIndex: 99,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 32 }}>{p.emoji}</span>
          <div>
            <div style={{ fontWeight: 800, fontSize: 20, color: "#1C1C1C",
              fontFamily: "'Baloo 2', sans-serif" }}>{p.name}</div>
            <div style={{ fontSize: 12, color: "#777", fontWeight: 500,
              fontFamily: "'Baloo 2', sans-serif" }}>
              {p.name_en} • न्यूनतम {minKg} kg
            </div>
          </div>
        </div>
      </div>

      {/* ── Varieties / Direct Buy ── */}
      <div style={{ flex: 1, overflowY: "auto", padding: "14px 14px 24px", WebkitOverflowScrolling: "touch" }}>

        {/* ── No-variety product ── */}
        {hasNoVarieties ? (
            <div>
              <div style={{ fontWeight: 800, fontSize: 14, color: "#1C1C1C",
                marginBottom: 10, fontFamily: "'Baloo 2', sans-serif" }}>
                खरीदें
              </div>
              <div style={{
                background: "white", borderRadius: 16, overflow: "hidden",
                border: cart[noVarCartKey] ? "2px solid #1B4332" : "1.5px solid #EDEAE5",
                boxShadow: cart[noVarCartKey] ? "0 2px 12px rgba(27,67,50,0.15)" : "0 2px 6px rgba(0,0,0,0.04)",
              }}>
                <div style={{ padding: "14px 14px 12px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                    <div style={{ fontWeight: 800, fontSize: 16, color: "#1C1C1C",
                      fontFamily: "'Baloo 2', sans-serif" }}>{p.name}</div>
                    {directPrice ? (
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontWeight: 800, fontSize: 20, color: "#1B4332",
                          fontFamily: "'Baloo 2', sans-serif" }}>{formatINR(directPrice)}</div>
                        <div style={{ fontSize: 10, color: "#999", fontFamily: "'Baloo 2', sans-serif" }}>per kg</div>
                      </div>
                    ) : null}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{
                      display: "flex", alignItems: "center",
                      background: "#F0F4F0", borderRadius: 12, overflow: "hidden",
                    }}>
                      <button
                        onClick={() => updateNoVarQty(-minKg)}
                        className="btn-press"
                        style={{
                          background: "none", border: "none", padding: "8px 13px",
                          cursor: "pointer", fontFamily: "'Baloo 2', sans-serif",
                          fontWeight: 800, fontSize: 18, color: "#1B4332",
                        }}>−</button>
                      <div style={{
                        fontWeight: 800, fontSize: 13, minWidth: 40, textAlign: "center",
                        color: "#1C1C1C", fontFamily: "'Baloo 2', sans-serif",
                      }}>{noVarCurrentQty}kg</div>
                      <button
                        onClick={() => updateNoVarQty(minKg)}
                        className="btn-press"
                        style={{
                          background: "none", border: "none", padding: "8px 13px",
                          cursor: "pointer", fontFamily: "'Baloo 2', sans-serif",
                          fontWeight: 800, fontSize: 18, color: "#1B4332",
                        }}>+</button>
                    </div>
                    <button
                      onClick={toggleNoVarCart}
                      className="btn-press"
                      style={{
                        flex: 1,
                        background: cart[noVarCartKey]
                          ? "linear-gradient(135deg,#dc2626,#b91c1c)"
                          : "linear-gradient(135deg,#1B4332,#2D6A2D)",
                        color: "white", border: "none", borderRadius: 12,
                        padding: "10px 0", fontFamily: "'Baloo 2', sans-serif",
                        fontWeight: 700, fontSize: 13, cursor: "pointer",
                        boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                      }}>
                      {cart[noVarCartKey] ? "✓ Cart में है" : "🛒 Cart"}
                    </button>
                    {onGoToCart && (
                      <button
                        onClick={() => { if (!cart[noVarCartKey]) toggleNoVarCart(); onGoToCart(); }}
                        className="btn-press"
                        style={{
                          flex: 1.4,
                          background: "linear-gradient(135deg,#F59E0B,#D97706)",
                          color: "#1B4332", border: "none", borderRadius: 12,
                          padding: "10px 0", fontFamily: "'Baloo 2', sans-serif",
                          fontWeight: 800, fontSize: 13, cursor: "pointer",
                          boxShadow: "0 2px 8px rgba(245,158,11,0.4)",
                        }}>
                        ⚡ अभी खरीदो
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
        ) : (
          /* ── Has varieties ── */
          <>
            <div style={{ fontWeight: 800, fontSize: 14, color: "#1C1C1C",
              marginBottom: 10, fontFamily: "'Baloo 2', sans-serif" }}>
              किस्में चुनें
            </div>
            {varieties.length === 0 ? (
              <div style={{
                textAlign: "center", padding: 32, color: "#777",
                background: "white", borderRadius: 16,
              }}>
                <div style={{ fontSize: 32 }}>🌱</div>
                <div style={{ fontWeight: 700, marginTop: 8, fontFamily: "'Baloo 2', sans-serif" }}>
                  कोई किस्म उपलब्ध नहीं है
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {varieties.map(v => {
                  const key = `${p.id}-${v.id}`;
                  const inCart = !!cart[key];
                  const q = getQty(v.id);
                  const isOpen = selected === v.id;

                  return (
                    <div key={v.id} style={{
                      background: "white", borderRadius: 16, overflow: "hidden",
                      border: inCart ? "2px solid #1B4332" : "1.5px solid #EDEAE5",
                      boxShadow: inCart ? "0 2px 12px rgba(27,67,50,0.15)" : "0 2px 6px rgba(0,0,0,0.04)",
                    }}>
                      <div style={{ padding: "14px 14px 12px", cursor: "pointer" }}
                        onClick={() => { setSelected(isOpen ? null : v.id); setSheetVariety(v); }}>

                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                          {/* Variety thumbnail */}
                          {v.images && v.images.length > 0 && (
                            <div style={{
                              flexShrink: 0, width: 58, height: 58, borderRadius: 12,
                              overflow: "hidden", border: "1.5px solid #EDEAE5",
                            }}>
                              <img
                                src={v.images[0].url}
                                alt={v.name}
                                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                              />
                            </div>
                          )}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 800, fontSize: 15, color: "#1C1C1C",
                              fontFamily: "'Baloo 2', sans-serif" }}>{v.name}</div>
                            {v.description && (
                              <div style={{ fontSize: 12, color: "#777", marginTop: 2,
                                fontFamily: "'Baloo 2', sans-serif" }}>{v.description}</div>
                            )}
                            {v.shelf_life && (
                              <div style={{ fontSize: 11, color: "#4A9B4A", fontWeight: 600, marginTop: 3,
                                fontFamily: "'Baloo 2', sans-serif" }}>
                                📦 shelf life: {v.shelf_life}
                              </div>
                            )}
                          </div>
                          {v.price_per_kg ? (
                            <div style={{ textAlign: "right", flexShrink: 0 }}>
                              {v.offer_price ? (
                                <>
                                  <div style={{ fontSize: 10, color: "#999", fontFamily: "'Baloo 2', sans-serif",
                                    textDecoration: "line-through" }}>
                                    {formatINR(v.price_per_kg)}
                                  </div>
                                  <div style={{ fontWeight: 900, fontSize: 18, color: "#D97706",
                                    fontFamily: "'Baloo 2', sans-serif" }}>
                                    {formatINR(v.offer_price)}
                                  </div>
                                  <div style={{ fontSize: 10, background: "#FEF3C7", color: "#92400E",
                                    borderRadius: 6, padding: "1px 5px", fontWeight: 800,
                                    fontFamily: "'Baloo 2', sans-serif" }}>
                                    {v.offer_label || `${Math.round((1 - v.offer_price/v.price_per_kg)*100)}% OFF`}
                                  </div>
                                </>
                              ) : (
                                <>
                                  <div style={{ fontWeight: 800, fontSize: 18, color: "#1B4332",
                                    fontFamily: "'Baloo 2', sans-serif" }}>
                                    {formatINR(v.price_per_kg)}
                                  </div>
                                  <div style={{ fontSize: 10, color: "#999", fontFamily: "'Baloo 2', sans-serif" }}>per kg</div>
                                </>
                              )}
                            </div>
                          ) : null}
                        </div>

                        {/* Qty + Cart */}
                        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 12 }}>
                          <div style={{
                            display: "flex", alignItems: "center",
                            background: "#F0F4F0", borderRadius: 12, overflow: "hidden",
                          }}>
                            <button
                              onClick={e => { e.stopPropagation(); updateQty(v.id, -minKg); }}
                              className="btn-press"
                              style={{
                                background: "none", border: "none", padding: "8px 13px",
                                cursor: "pointer", fontFamily: "'Baloo 2', sans-serif",
                                fontWeight: 800, fontSize: 18, color: "#1B4332",
                              }}>−</button>
                            <div style={{
                              fontWeight: 800, fontSize: 13, minWidth: 40, textAlign: "center",
                              color: "#1C1C1C", fontFamily: "'Baloo 2', sans-serif",
                            }}>{q}kg</div>
                            <button
                              onClick={e => { e.stopPropagation(); updateQty(v.id, minKg); }}
                              className="btn-press"
                              style={{
                                background: "none", border: "none", padding: "8px 13px",
                                cursor: "pointer", fontFamily: "'Baloo 2', sans-serif",
                                fontWeight: 800, fontSize: 18, color: "#1B4332",
                              }}>+</button>
                          </div>
                          <button
                            onClick={e => { e.stopPropagation(); toggleCart(v); }}
                            className="btn-press"
                            style={{
                              flex: 1,
                              background: inCart
                                ? "linear-gradient(135deg,#dc2626,#b91c1c)"
                                : "linear-gradient(135deg,#1B4332,#2D6A2D)",
                              color: "white", border: "none", borderRadius: 12,
                              padding: "10px 0", fontFamily: "'Baloo 2', sans-serif",
                              fontWeight: 700, fontSize: 13, cursor: "pointer",
                              boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                            }}>
                            {inCart ? "✓ Cart में है" : "🛒 Cart"}
                          </button>
                          {onGoToCart && (
                            <button
                              onClick={e => { e.stopPropagation(); if (!inCart) toggleCart(v); onGoToCart(); }}
                              className="btn-press"
                              style={{
                                flex: 1.4,
                                background: "linear-gradient(135deg,#F59E0B,#D97706)",
                                color: "#1B4332", border: "none", borderRadius: 12,
                                padding: "10px 0", fontFamily: "'Baloo 2', sans-serif",
                                fontWeight: 800, fontSize: 13, cursor: "pointer",
                                boxShadow: "0 2px 8px rgba(245,158,11,0.4)",
                              }}>
                              ⚡ अभी खरीदो
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
        <RatingsSection productId={p.id} customer={customer} />
      </div>

      {/* ── Variety Bottom Sheet ── */}
      {sheetVariety && (
        <VarietySheet
          variety={sheetVariety}
          product={p}
          cart={cart}
          onCartChange={onCartChange}
          onGoToCart={onGoToCart}
          onClose={() => setSheetVariety(null)}
          minKg={minKg}
        />
      )}

      {/* ── Floating "Go to Cart" button ── */}
      {onGoToCart && Object.keys(cart).some(k => k.startsWith(`${p.id}-`)) && (
        <div style={{
          position: "absolute", bottom: 18, right: 14,
          zIndex: 200,
          animation: "pop 0.2s ease",
        }}>
          <button
            onClick={onGoToCart}
            className="btn-press"
            style={{
              display: "flex", alignItems: "center", gap: 7,
              background: "linear-gradient(135deg,#F59E0B,#D97706)",
              color: "#1B4332", border: "none", borderRadius: 24,
              padding: "10px 18px",
              fontFamily: "'Baloo 2', sans-serif", fontWeight: 800, fontSize: 13,
              cursor: "pointer",
              boxShadow: "0 4px 18px rgba(245,158,11,0.55)",
            }}
          >
            <span style={{ fontSize: 16 }}>🛒</span>
            Cart देखें →
          </button>
        </div>
      )}
    </div>
  );
}
