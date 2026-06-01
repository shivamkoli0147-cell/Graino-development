import { useState } from "react";
import { useGetProducts } from "@workspace/api-client-react";
import { formatINR, type Cart, type CustomerSession } from "../lib/utils";
import { VillagePicker } from "../components/kisan/VillagePicker";

interface ProductListProps {
  cart: Cart;
  onAddToCart: (item: { productId: number; varietyId: number; productName: string; productNameEn: string;
    productEmoji: string; varietyName: string; pricePerKg: number; quantityKg: number; minKg: number }) => void;
  onViewProduct: (id: number) => void;
  customer?: CustomerSession | null;
  onOpenProfile?: () => void;
  onVillageChange?: (village: string) => void;
}

export function ProductList({ cart, onAddToCart, onViewProduct, customer, onOpenProfile, onVillageChange }: ProductListProps) {
  const [search, setSearch] = useState("");
  const [showVillagePicker, setShowVillagePicker] = useState(false);
  const { data: products, isLoading } = useGetProducts({ search: search || undefined });
  const { data: allNavProducts } = useGetProducts({});

  const cartKeys = new Set(Object.keys(cart));
  const initial = customer ? (customer.name || "?")[0].toUpperCase() : null;

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: "#F4F6F3" }}>

      {/* ── Top bar ── */}
      <div style={{
        background: "#1B4332",
        padding: "14px 16px 12px",
        flexShrink: 0,
        willChange: "transform",
        transform: "translateZ(0)",
        zIndex: 100,
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          {/* Location — tappable */}
          <button
            onClick={() => customer && setShowVillagePicker(true)}
            style={{
              display: "flex", alignItems: "center", gap: 6, flex: 1,
              background: "none", border: "none", cursor: customer ? "pointer" : "default",
              padding: 0, fontFamily: "'Baloo 2', sans-serif", textAlign: "left",
            }}
          >
            <span style={{ fontSize: 16 }}>📍</span>
            <div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", fontWeight: 500 }}>
                Delivery to ▾
              </div>
              <div style={{ fontSize: 14, color: "white", fontWeight: 800, lineHeight: 1.1 }}>
                {customer?.village || "गांव"}
                <span style={{ fontSize: 11, color: "#F59E0B", marginLeft: 4 }}>बदलें</span>
              </div>
            </div>
          </button>

          {/* Graino wordmark (center) */}
          <div style={{
            position: "absolute", left: "50%", transform: "translateX(-50%)",
            fontFamily: "'Baloo 2', sans-serif", fontWeight: 800, fontSize: 20,
            color: "white", letterSpacing: -0.5,
          }}>
            Grai<span style={{ color: "#F59E0B" }}>no</span>
          </div>

          {/* Avatar */}
          {customer && onOpenProfile && (
            <button onClick={onOpenProfile} className="btn-press" style={{
              width: 36, height: 36, borderRadius: "50%",
              background: "linear-gradient(135deg,#F59E0B,#D97706)",
              border: "none", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#1B4332", fontWeight: 800, fontSize: 15,
              fontFamily: "'Baloo 2',sans-serif",
              boxShadow: "0 2px 8px rgba(245,158,11,0.4)",
              flexShrink: 0,
            }}>
              {initial}
            </button>
          )}
        </div>

        {/* Search bar */}
        <div style={{ position: "relative" }}>
          <span style={{
            position: "absolute", left: 12, top: "50%",
            transform: "translateY(-50%)", fontSize: 15, opacity: 0.5,
          }}>🔍</span>
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="गेहूं, चावल खोजें..."
            style={{
              width: "100%", padding: "10px 12px 10px 38px", borderRadius: 12,
              border: "none", fontSize: 13, fontFamily: "'Baloo 2', sans-serif",
              outline: "none", boxSizing: "border-box",
              background: "rgba(255,255,255,0.12)", color: "white",
            }}
          />
        </div>
      </div>

      {/* ── Product quick-nav ── */}
      {(allNavProducts as NavProduct[] | undefined)?.length ? (
        <div style={{
          background: "white", padding: "10px 12px 8px",
          flexShrink: 0, borderBottom: "1px solid #EDEAE5",
          boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
          willChange: "transform", transform: "translateZ(0)", zIndex: 99,
        }}>
          <div style={{
            display: "flex", gap: 6, overflowX: "auto", paddingBottom: 4,
            scrollbarWidth: "none",
          }}>
            {(allNavProducts as NavProduct[]).map(p => {
              const firstImg = (p.images ?? [])[0];
              const inCartCount = (p.varieties as NavVariety[]).filter(v =>
                (Object.keys(cart)).includes(`${p.id}-${v.id}`)
              ).length + (cart[`${p.id}-0`] ? 1 : 0);
              return (
                <button
                  key={p.id}
                  onClick={() => onViewProduct(p.id)}
                  className="btn-press"
                  style={{
                    flexShrink: 0, display: "flex", flexDirection: "column",
                    alignItems: "center", gap: 4,
                    background: "none", border: "none", cursor: "pointer",
                    padding: "2px 4px",
                  }}
                >
                  <div style={{
                    width: 56, height: 56, borderRadius: "50%", overflow: "hidden",
                    border: "2.5px solid #E0E0E0",
                    boxShadow: inCartCount > 0
                      ? "0 0 0 2px #1B4332, 0 2px 8px rgba(27,67,50,0.25)"
                      : "0 1px 4px rgba(0,0,0,0.08)",
                    position: "relative", flexShrink: 0,
                    transition: "box-shadow 0.15s",
                  }}>
                    {firstImg ? (
                      <img src={firstImg.url} alt={p.name as string}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      <div style={{
                        width: "100%", height: "100%",
                        background: p.bg_color as string || "linear-gradient(135deg,#e8f5e8,#d1fae5)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 24,
                      }}>{p.emoji as string}</div>
                    )}
                    {inCartCount > 0 && (
                      <div style={{
                        position: "absolute", top: 0, right: 0,
                        background: "#1B4332", color: "white",
                        borderRadius: "50%", width: 17, height: 17,
                        fontSize: 9, fontWeight: 800,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        border: "1.5px solid white",
                      }}>{inCartCount}</div>
                    )}
                  </div>
                  <span style={{
                    fontFamily: "'Baloo 2', sans-serif", fontSize: 10, fontWeight: 700,
                    color: "#333", maxWidth: 60,
                    textAlign: "center", lineHeight: 1.2,
                    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                  }}>{p.name as string}</span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {/* ── Section header ── */}
      <div style={{ padding: "14px 14px 4px", flexShrink: 0 }}>
        <div style={{ fontWeight: 800, fontSize: 15, color: "#1C1C1C",
          fontFamily: "'Baloo 2', sans-serif" }}>
          {search ? `"${search}" के नतीजे` : "सभी उत्पाद"}
          {products && !isLoading && (
            <span style={{ fontWeight: 500, fontSize: 12, color: "#888", marginLeft: 8 }}>
              ({(products as Product[]).length})
            </span>
          )}
        </div>
      </div>

      {/* ── Product grid ── */}
      <div style={{ flex: 1, overflowY: "auto", padding: "6px 12px 12px", WebkitOverflowScrolling: "touch" }}>
        {isLoading ? (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {[1,2,3,4].map(i => (
              <div key={i} style={{
                height: 200, borderRadius: 16,
                background: "linear-gradient(90deg,#e8e8e8 25%,#f0f0f0 50%,#e8e8e8 75%)",
                backgroundSize: "200% 100%",
                animation: "shimmer 1.4s infinite",
              }} />
            ))}
          </div>
        ) : !(products as Product[] | undefined)?.length ? (
          <div style={{ textAlign: "center", padding: "56px 24px", color: "#888" }}>
            <div style={{ fontSize: 44 }}>🌾</div>
            <div style={{ fontWeight: 700, marginTop: 12, fontFamily: "'Baloo 2', sans-serif", fontSize: 15, color: "#555" }}>
              कोई उत्पाद नहीं मिला
            </div>
            <div style={{ fontSize: 12, marginTop: 6, color: "#aaa", fontFamily: "'Baloo 2', sans-serif" }}>
              दूसरे नाम से खोजें
            </div>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {(products as Product[]).map(product => {
              const allVarieties = product.varieties as Variety[];
              const hasNoVarieties = allVarieties.length === 0;
              const directPrice = product.price_per_kg ?? null;
              const cheapest = [...allVarieties].sort((a, b) => a.price_per_kg - b.price_per_kg)[0];
              const isAvailable = hasNoVarieties ? !!directPrice : !!cheapest;
              const inCartCount = hasNoVarieties
                ? (cartKeys.has(`${product.id}-0`) ? 1 : 0)
                : allVarieties.filter(v => cartKeys.has(`${product.id}-${v.id}`)).length;

              return (
                <div key={product.id} onClick={() => onViewProduct(product.id)}
                  className="btn-press"
                  style={{
                    borderRadius: 18, overflow: "hidden", cursor: "pointer",
                    background: "white",
                    boxShadow: inCartCount > 0
                      ? "0 0 0 2px #1B4332, 0 4px 16px rgba(27,67,50,0.12)"
                      : "0 2px 12px rgba(0,0,0,0.07)",
                    position: "relative",
                    transition: "transform 0.1s ease",
                  }}
                >
                  {/* Image/emoji area */}
                  {(() => {
                    const firstImg = ((product as Product & { images?: { id: number; url: string }[] }).images ?? [])[0];
                    return firstImg ? (
                      <div style={{ position: "relative", height: 130, overflow: "hidden", background: "#f0f0f0" }}>
                        <img
                          src={firstImg.url}
                          alt={product.name as string}
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        />
                        <div style={{
                          position: "absolute", bottom: 0, left: 0, right: 0,
                          background: "linear-gradient(to top, rgba(0,0,0,0.6), transparent)",
                          padding: "18px 10px 6px",
                        }}>
                          <div style={{ fontWeight: 800, fontSize: 13, color: "white",
                            fontFamily: "'Baloo 2', sans-serif" }}>{product.name as string}</div>
                          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.75)", fontFamily: "'Baloo 2', sans-serif" }}>
                            {product.name_en as string}
                          </div>
                        </div>
                        {inCartCount > 0 && (
                          <div style={{
                            position: "absolute", top: 8, right: 8,
                            background: "#1B4332", color: "white",
                            borderRadius: "50%", width: 22, height: 22,
                            fontSize: 11, fontWeight: 800,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            boxShadow: "0 2px 6px rgba(27,67,50,0.4)",
                          }}>{inCartCount}</div>
                        )}
                      </div>
                    ) : (
                      <div style={{
                        background: product.bg_color as string || "linear-gradient(135deg,#e8f5e8,#d1fae5)",
                        padding: "20px 12px 14px", textAlign: "center",
                        position: "relative",
                      }}>
                        <div style={{ fontSize: 40 }}>{product.emoji as string}</div>
                        <div style={{ fontWeight: 800, fontSize: 13, color: "#1C1C1C",
                          marginTop: 6, fontFamily: "'Baloo 2', sans-serif" }}>
                          {product.name as string}
                        </div>
                        <div style={{ fontSize: 10, color: "#888", fontWeight: 500, fontFamily: "'Baloo 2', sans-serif" }}>
                          {product.name_en as string}
                        </div>
                        {inCartCount > 0 && (
                          <div style={{
                            position: "absolute", top: 8, right: 8,
                            background: "#1B4332", color: "white",
                            borderRadius: "50%", width: 22, height: 22,
                            fontSize: 11, fontWeight: 800,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            boxShadow: "0 2px 6px rgba(27,67,50,0.4)",
                          }}>{inCartCount}</div>
                        )}
                      </div>
                    );
                  })()}

                  {/* Info + CTA */}
                  <div style={{ padding: "10px 11px 12px" }}>
                    {isAvailable ? (
                      <div style={{ fontSize: 10, color: "#4A9B4A", fontWeight: 600,
                        fontFamily: "'Baloo 2', sans-serif" }}>
                        {hasNoVarieties
                          ? `₹${directPrice}/kg`
                          : `${allVarieties.length} किस्में उपलब्ध`}
                      </div>
                    ) : (
                      <div style={{ fontSize: 12, color: "#ef4444", fontWeight: 700,
                        textAlign: "center", padding: "4px 0", fontFamily: "'Baloo 2', sans-serif" }}>
                        Out of Stock
                      </div>
                    )}

                    {/* Order button */}
                    <button
                      onClick={e => { e.stopPropagation(); onViewProduct(product.id); }}
                      className="btn-press"
                      style={{
                        width: "100%", marginTop: 8,
                        background: isAvailable
                          ? "linear-gradient(135deg,#1B4332,#2D6A2D)"
                          : "#e5e5e5",
                        color: isAvailable ? "white" : "#aaa",
                        border: "none", borderRadius: 10, padding: "7px 0",
                        fontFamily: "'Baloo 2', sans-serif",
                        fontWeight: 700, fontSize: 12, cursor: isAvailable ? "pointer" : "not-allowed",
                        boxShadow: isAvailable ? "0 2px 8px rgba(27,67,50,0.25)" : "none",
                      }}
                    >
                      {isAvailable ? "ऑर्डर करें →" : "Unavailable"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Village picker */}
      {showVillagePicker && customer && (
        <VillagePicker
          currentVillage={customer.village}
          onSelect={v => { onVillageChange?.(v); setShowVillagePicker(false); }}
          onClose={() => setShowVillagePicker(false)}
        />
      )}
    </div>
  );
}

type Variety = { id: number; price_per_kg: number; name: string };
type Product = {
  id: number; name: string; name_en: string; emoji: string; bg_color: string;
  min_kg: number; varieties: Variety[]; benefits: string[];
  price_per_kg?: number | null;
  images?: { id: number; url: string; sort_order: number }[];
};
type NavVariety = { id: number };
type NavProduct = {
  id: number; name: unknown; emoji: unknown; bg_color: unknown;
  varieties: NavVariety[];
  images?: { url: string }[];
};
