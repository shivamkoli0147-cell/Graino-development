import { useState } from "react";
import { useGetProduct } from "@workspace/api-client-react";
import { formatINR, type Cart, type CartItem } from "../lib/utils";

interface ProductDetailProps {
  productId: number;
  cart: Cart;
  onBack: () => void;
  onCartChange: (key: string, item: CartItem | null) => void;
}

type ProductImage = { id: number; url: string; sort_order: number };
type Variety = {
  id: number; name: string; price_per_kg: number;
  description?: string; shelf_life?: string; in_stock: boolean | number;
};
type Product = {
  id: number; name: string; name_en: string; emoji: string; bg_color: string;
  category: string; min_kg: number; varieties: Variety[];
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

export function ProductDetail({ productId, cart, onBack, onCartChange }: ProductDetailProps) {
  const { data: product, isLoading } = useGetProduct(productId);
  const [selected, setSelected] = useState<number | null>(null);
  const [qty, setQty] = useState<Record<number, number>>({});

  if (isLoading) return (
    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", background: "#F4F6F3" }}>
      <div style={{ fontSize: 32, animation: "pop 1s infinite" }}>🌾</div>
    </div>
  );
  if (!product) return null;

  const p = product as unknown as Product;
  const varieties = p.varieties.filter(v => v.in_stock);
  const minKg = p.min_kg;
  const images = (p.images ?? []).sort((a, b) => a.sort_order - b.sort_order);

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

      {/* ── Varieties ── */}
      <div style={{ flex: 1, overflowY: "auto", padding: "14px 14px 24px", WebkitOverflowScrolling: "touch" }}>
        <div style={{ fontWeight: 800, fontSize: 14, color: "#1C1C1C",
          marginBottom: 10, fontFamily: "'Baloo 2', sans-serif" }}>
          किस्में चुनें
        </div>

        {varieties.length === 0 ? (
          <div style={{
            textAlign: "center", padding: 32, color: "#777",
            background: "white", borderRadius: 16,
          }}>
            <div style={{ fontSize: 32 }}>😔</div>
            <div style={{ fontWeight: 700, marginTop: 8, fontFamily: "'Baloo 2', sans-serif" }}>
              फिलहाल stock नहीं है
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
                    onClick={() => setSelected(isOpen ? null : v.id)}>

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
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
                      <div style={{ textAlign: "right", flexShrink: 0, marginLeft: 12 }}>
                        <div style={{ fontWeight: 800, fontSize: 18, color: "#1B4332",
                          fontFamily: "'Baloo 2', sans-serif" }}>
                          {formatINR(v.price_per_kg)}
                        </div>
                        <div style={{ fontSize: 10, color: "#999",
                          fontFamily: "'Baloo 2', sans-serif" }}>per kg</div>
                      </div>
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
                        {inCart
                          ? "✓ Cart में है"
                          : `Cart में डालो • ${formatINR(v.price_per_kg * q)}`}
                      </button>
                    </div>
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
