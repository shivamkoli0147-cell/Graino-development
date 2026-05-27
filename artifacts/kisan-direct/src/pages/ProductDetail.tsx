import { useState } from "react";
import { useGetProduct } from "@workspace/api-client-react";
import { formatINR, type Cart, type CartItem } from "../lib/utils";

interface ProductDetailProps {
  productId: number;
  cart: Cart;
  onBack: () => void;
  onCartChange: (key: string, item: CartItem | null) => void;
}

type BenefitObj = { id?: number; text: string };
type Variety = {
  id: number; name: string; price_per_kg: number;
  description?: string; shelf_life?: string; in_stock: boolean | number;
  benefits?: BenefitObj[]; disadvantages?: BenefitObj[];
};
type Product = {
  id: number; name: string; name_en: string; emoji: string; bg_color: string;
  category: string; min_kg: number; varieties: Variety[];
  benefits?: BenefitObj[]; disadvantages?: BenefitObj[];
};

export function ProductDetail({ productId, cart, onBack, onCartChange }: ProductDetailProps) {
  const { data: product, isLoading } = useGetProduct(productId);
  const [selected, setSelected] = useState<number | null>(null);
  const [qty, setQty] = useState<Record<number, number>>({});

  if (isLoading) return (
    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", background: "#F7F4EF" }}>
      <div style={{ fontSize: 32 }}>🌾</div>
    </div>
  );

  if (!product) return null;

  const p = product as unknown as Product;
  const varieties = p.varieties.filter(v => v.in_stock);
  const minKg = p.min_kg;

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

  const getBenefitText = (b: BenefitObj | string): string =>
    typeof b === "string" ? b : b.text;

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: "#F7F4EF" }}>
      {/* Header */}
      <div style={{
        background: p.bg_color || "linear-gradient(135deg,#e8f5e8,#d1fae5)",
        padding: "16px 16px 24px", flexShrink: 0, position: "relative",
      }}>
        <button onClick={onBack} className="btn-press" style={{
          background: "rgba(255,255,255,0.8)", border: "none", borderRadius: 12,
          padding: "6px 12px", fontFamily: "'Baloo 2', sans-serif", fontWeight: 700,
          fontSize: 14, cursor: "pointer", color: "#1C1C1C",
        }}>← वापस</button>
        <div style={{ textAlign: "center", marginTop: 12 }}>
          <div style={{ fontSize: 56 }}>{p.emoji}</div>
          <div style={{ fontWeight: 800, fontSize: 24, color: "#1C1C1C" }}>{p.name}</div>
          <div style={{ fontSize: 13, color: "#555", fontWeight: 500 }}>{p.name_en} • न्यूनतम {minKg} kg</div>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "16px 16px 24px" }}>
          {/* Varieties */}
        <div style={{ fontWeight: 800, fontSize: 14, color: "#1C1C1C", marginBottom: 10 }}>किस्में चुनें</div>
        {varieties.length === 0 ? (
          <div style={{ textAlign: "center", padding: 32, color: "#777", background: "white", borderRadius: 16 }}>
            <div style={{ fontSize: 32 }}>😔</div>
            <div style={{ fontWeight: 700, marginTop: 8 }}>फिलहाल stock नहीं है</div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {varieties.map(v => {
              const key = `${p.id}-${v.id}`;
              const inCart = !!cart[key];
              const q = getQty(v.id);
              const isOpen = selected === v.id;

              return (
                <div key={v.id}
                  style={{
                    background: "white", borderRadius: 16, overflow: "hidden",
                    border: inCart ? "2px solid #2D6A2D" : "1.5px solid #E5DDD0",
                    boxShadow: inCart ? "0 2px 12px rgba(45,106,45,0.15)" : "0 2px 6px rgba(0,0,0,0.05)",
                  }}
                >
                  <div style={{ padding: "14px 14px 12px", cursor: "pointer" }}
                    onClick={() => setSelected(isOpen ? null : v.id)}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: 15, color: "#1C1C1C" }}>{v.name}</div>
                        {v.description && <div style={{ fontSize: 12, color: "#777", marginTop: 2 }}>{v.description}</div>}
                        {v.shelf_life && (
                          <div style={{ fontSize: 11, color: "#4A9B4A", fontWeight: 600, marginTop: 3 }}>
                            📦 shelf life: {v.shelf_life}
                          </div>
                        )}
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontWeight: 800, fontSize: 17, color: "#2D6A2D" }}>{formatINR(v.price_per_kg)}</div>
                        <div style={{ fontSize: 10, color: "#777" }}>per kg</div>
                      </div>
                    </div>

                    {/* Qty + Cart */}
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 12 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 0, background: "#F0EDE8", borderRadius: 12, overflow: "hidden" }}>
                        <button onClick={e => { e.stopPropagation(); updateQty(v.id, -minKg); }} className="btn-press" style={{
                          background: "none", border: "none", padding: "8px 12px", cursor: "pointer",
                          fontFamily: "'Baloo 2', sans-serif", fontWeight: 800, fontSize: 16, color: "#2D6A2D",
                        }}>−</button>
                        <div style={{ fontWeight: 800, fontSize: 13, minWidth: 36, textAlign: "center", color: "#1C1C1C" }}>{q}kg</div>
                        <button onClick={e => { e.stopPropagation(); updateQty(v.id, minKg); }} className="btn-press" style={{
                          background: "none", border: "none", padding: "8px 12px", cursor: "pointer",
                          fontFamily: "'Baloo 2', sans-serif", fontWeight: 800, fontSize: 16, color: "#2D6A2D",
                        }}>+</button>
                      </div>
                      <button onClick={e => { e.stopPropagation(); toggleCart(v); }} className="btn-press" style={{
                        flex: 1, background: inCart ? "#dc2626" : "#2D6A2D", color: "white",
                        border: "none", borderRadius: 12, padding: "9px 0",
                        fontFamily: "'Baloo 2', sans-serif", fontWeight: 700, fontSize: 13, cursor: "pointer",
                      }}>
                        {inCart ? "✓ Cart में है" : `Cart में डालो • ${formatINR(v.price_per_kg * q)}`}
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
