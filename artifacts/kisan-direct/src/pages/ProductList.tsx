import { useState } from "react";
import { useGetProducts } from "@workspace/api-client-react";
import { formatINR, type Cart, type CustomerSession } from "../lib/utils";

const CATEGORIES = ["सब", "अनाज", "दालें", "तिलहन", "मसाले"];

interface ProductListProps {
  cart: Cart;
  onAddToCart: (item: { productId: number; varietyId: number; productName: string; productNameEn: string;
    productEmoji: string; varietyName: string; pricePerKg: number; quantityKg: number; minKg: number }) => void;
  onViewProduct: (id: number) => void;
  customer?: CustomerSession | null;
  onOpenProfile?: () => void;
}

export function ProductList({ cart, onAddToCart, onViewProduct, customer, onOpenProfile }: ProductListProps) {
  const [category, setCategory] = useState("सब");
  const [search, setSearch] = useState("");
  const { data: products, isLoading } = useGetProducts({ category: category === "सब" ? undefined : category, search: search || undefined });

  const cartKeys = new Set(Object.keys(cart));
  const initial = customer ? (customer.name || "?")[0].toUpperCase() : null;

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: "#F7F4EF" }}>
      {/* Header */}
      <div style={{ background: "white", padding: "16px 16px 0", flexShrink: 0, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <div style={{ fontWeight: 800, fontSize: 20, color: "#1C1C1C" }}>
            🌾 ताज़ा उपज
          </div>
          {/* Profile avatar button */}
          {customer && onOpenProfile && (
            <button onClick={onOpenProfile} className="btn-press" style={{
              width: 38, height: 38, borderRadius: "50%",
              background: "linear-gradient(135deg,#2D6A2D,#4A9B4A)",
              border: "none", cursor: "pointer", display: "flex",
              alignItems: "center", justifyContent: "center",
              color: "white", fontWeight: 800, fontSize: 16,
              fontFamily: "'Baloo 2',sans-serif",
              boxShadow: "0 2px 8px rgba(45,106,45,0.3)",
              flexShrink: 0,
            }}>
              {initial}
            </button>
          )}
        </div>

        {/* Search */}
        <div style={{ position: "relative", marginBottom: 12 }}>
          <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 16 }}>🔍</span>
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="गेहूं, मूंग, चना ढूंढो..."
            style={{ width: "100%", padding: "9px 12px 9px 38px", borderRadius: 12,
              border: "1.5px solid #E5DDD0", fontSize: 13, fontFamily: "'Baloo 2', sans-serif",
              outline: "none", boxSizing: "border-box", background: "#F7F4EF", color: "#1C1C1C" }}
          />
        </div>
        {/* Category tabs */}
        <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 12 }}>
          {CATEGORIES.map(c => (
            <button key={c} onClick={() => setCategory(c)} className="btn-press" style={{
              flexShrink: 0, padding: "6px 14px", borderRadius: 20,
              background: category === c ? "#2D6A2D" : "#F0EDE8",
              color: category === c ? "white" : "#555",
              border: "none", fontFamily: "'Baloo 2', sans-serif",
              fontWeight: 700, fontSize: 13, cursor: "pointer",
            }}>
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Product grid */}
      <div style={{ flex: 1, overflowY: "auto", padding: "12px 12px 8px" }}>
        {isLoading ? (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {[1,2,3,4].map(i => (
              <div key={i} style={{ height: 180, borderRadius: 16, background: "#E8E3DC", animation: "pulse 1.5s infinite" }} />
            ))}
          </div>
        ) : !products?.length ? (
          <div style={{ textAlign: "center", padding: "48px 24px", color: "#777" }}>
            <div style={{ fontSize: 40 }}>🌾</div>
            <div style={{ fontWeight: 700, marginTop: 12 }}>कोई product नहीं मिला</div>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {(products as Product[]).map(product => {
              const cheapestInStock = (product.varieties as Variety[])
                .filter(v => v.in_stock)
                .sort((a, b) => a.price_per_kg - b.price_per_kg)[0];
              const inCartCount = (product.varieties as Variety[]).filter(v => cartKeys.has(`${product.id}-${v.id}`)).length;

              return (
                <div key={product.id} onClick={() => onViewProduct(product.id)}
                  className="btn-press"
                  style={{
                    borderRadius: 16, overflow: "hidden", cursor: "pointer",
                    background: "white", boxShadow: "0 2px 8px rgba(0,0,0,0.07)",
                    border: inCartCount > 0 ? "2px solid #2D6A2D" : "1.5px solid #E5DDD0",
                    position: "relative",
                  }}
                >
                  <div style={{
                    background: product.bg_color as string || "linear-gradient(135deg,#e8f5e8,#d1fae5)",
                    padding: "16px 12px 12px", textAlign: "center",
                  }}>
                    <div style={{ fontSize: 36 }}>{product.emoji as string}</div>
                    <div style={{ fontWeight: 800, fontSize: 13, color: "#1C1C1C", marginTop: 4 }}>{product.name as string}</div>
                    <div style={{ fontSize: 10, color: "#777", fontWeight: 500 }}>{product.name_en as string}</div>
                  </div>
                  <div style={{ padding: "10px 10px 12px" }}>
                    {cheapestInStock ? (
                      <>
                        <div style={{ fontSize: 11, color: "#777", fontWeight: 500 }}>से शुरू</div>
                        <div style={{ fontWeight: 800, fontSize: 15, color: "#2D6A2D" }}>
                          {formatINR(cheapestInStock.price_per_kg)}/kg
                        </div>
                        <div style={{ fontSize: 10, color: "#4A9B4A", fontWeight: 600, marginTop: 2 }}>
                          {(product.varieties as Variety[]).filter(v => v.in_stock).length} किस्में उपलब्ध
                        </div>
                      </>
                    ) : (
                      <div style={{ fontSize: 12, color: "#ef4444", fontWeight: 700, textAlign: "center", padding: "4px 0" }}>
                        Out of Stock
                      </div>
                    )}
                    {inCartCount > 0 && (
                      <div style={{
                        position: "absolute", top: 8, right: 8, background: "#2D6A2D",
                        color: "white", borderRadius: "50%", width: 20, height: 20,
                        fontSize: 11, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        {inCartCount}
                      </div>
                    )}
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

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _onAddToCart = (item: Parameters<ProductListProps["onAddToCart"]>[0]) => item;

type Variety = { id: number; in_stock: boolean | number; price_per_kg: number; name: string };
type Product = { id: number; name: string; name_en: string; emoji: string; bg_color: string;
  category: string; min_kg: number; varieties: Variety[]; benefits: string[] };
