import { useState } from "react";
import { useGetProducts, useUpdateVarietyStock } from "@workspace/api-client-react";
import { formatINR } from "../lib/utils";

interface SellerProductsProps {
  onBack: () => void;
}

export function SellerProducts({ onBack }: SellerProductsProps) {
  const { data: products, isLoading, refetch } = useGetProducts({});
  const updateStock = useUpdateVarietyStock();
  const [expandedProduct, setExpandedProduct] = useState<number | null>(null);

  const toggleStock = (productId: number, varietyId: number, currentlyInStock: boolean) => {
    updateStock.mutate(
      {
        id: productId,
        varietyId,
        data: {
          in_stock: !currentlyInStock,
          stock_level: !currentlyInStock ? "High" : "Out of Stock",
        },
      },
      { onSuccess: () => refetch() }
    );
  };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: "#F7F4EF" }}>
      {/* Header */}
      <div style={{ background: "linear-gradient(135deg,#1a3d1a,#2D6A2D)", padding: "16px 16px 16px", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={onBack} className="btn-press" style={{
            background: "rgba(255,255,255,0.15)", border: "none", borderRadius: 10,
            padding: "6px 12px", color: "white", fontFamily: "'Baloo 2', sans-serif",
            fontWeight: 700, fontSize: 13, cursor: "pointer",
          }}>← Back</button>
          <div style={{ color: "white", fontWeight: 800, fontSize: 18 }}>🌾 Products</div>
          <button onClick={() => refetch()} className="btn-press" style={{
            marginLeft: "auto", background: "rgba(255,255,255,0.15)", border: "none",
            borderRadius: 10, padding: "6px 12px", color: "white",
            fontFamily: "'Baloo 2', sans-serif", fontWeight: 700, fontSize: 12, cursor: "pointer",
          }}>↻</button>
        </div>
        <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 12, marginTop: 4 }}>
          Stock ON/OFF toggle करो
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "12px 14px 24px" }}>
        {isLoading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[1,2,3].map(i => (
              <div key={i} style={{ height: 80, borderRadius: 14, background: "#E8E3DC" }} />
            ))}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {(products as Product[] || []).map(product => {
              const isExpanded = expandedProduct === product.id;
              const inStockCount = product.varieties.filter(v => v.in_stock).length;
              const totalCount = product.varieties.length;

              return (
                <div key={product.id} style={{
                  background: "white", borderRadius: 16, overflow: "hidden",
                  border: "1.5px solid #E5DDD0", boxShadow: "0 2px 6px rgba(0,0,0,0.04)",
                }}>
                  {/* Product header */}
                  <div
                    onClick={() => setExpandedProduct(isExpanded ? null : product.id)}
                    className="btn-press"
                    style={{
                      padding: "14px 14px", cursor: "pointer",
                      display: "flex", alignItems: "center", gap: 12,
                    }}
                  >
                    <div style={{
                      width: 48, height: 48, borderRadius: 14, flexShrink: 0,
                      background: product.bg_color || "#E8F5E8",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 24,
                    }}>
                      {product.emoji}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 800, fontSize: 15, color: "#1C1C1C" }}>{product.name}</div>
                      <div style={{ fontSize: 12, color: "#777", fontWeight: 500 }}>{product.category} · {product.min_kg}kg min</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{
                        fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 20,
                        background: inStockCount > 0 ? "#DCFCE7" : "#FEE2E2",
                        color: inStockCount > 0 ? "#15803d" : "#dc2626",
                      }}>
                        {inStockCount}/{totalCount} stock
                      </div>
                      <div style={{ fontSize: 16, marginTop: 4, color: "#777" }}>{isExpanded ? "▲" : "▼"}</div>
                    </div>
                  </div>

                  {/* Varieties */}
                  {isExpanded && (
                    <div style={{ borderTop: "1px solid #F0EDE8" }}>
                      {product.varieties.map((v, i) => (
                        <div key={v.id} style={{
                          display: "flex", alignItems: "center", padding: "12px 14px",
                          borderBottom: i < product.varieties.length - 1 ? "1px solid #F8F5F0" : "none",
                        }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 700, fontSize: 14, color: "#1C1C1C" }}>{v.name}</div>
                            <div style={{ fontSize: 12, color: "#2D6A2D", fontWeight: 600 }}>{formatINR(v.price_per_kg)}/kg</div>
                          </div>
                          {/* Toggle */}
                          <div
                            onClick={() => toggleStock(product.id, v.id, !!v.in_stock)}
                            className="btn-press"
                            style={{
                              width: 52, height: 28, borderRadius: 14, cursor: "pointer",
                              background: v.in_stock ? "#2D6A2D" : "#d1d5db",
                              position: "relative", transition: "background 0.2s",
                            }}
                          >
                            <div style={{
                              position: "absolute", top: 3, left: v.in_stock ? 26 : 3,
                              width: 22, height: 22, borderRadius: "50%", background: "white",
                              transition: "left 0.2s", boxShadow: "0 1px 4px rgba(0,0,0,0.2)",
                            }} />
                          </div>
                          <div style={{ fontSize: 11, fontWeight: 700, color: v.in_stock ? "#15803d" : "#9ca3af", marginLeft: 8, minWidth: 32 }}>
                            {v.in_stock ? "ON" : "OFF"}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

type Variety = { id: number; name: string; price_per_kg: number; in_stock: boolean | number; description?: string };
type Product = { id: number; name: string; name_en: string; emoji: string; bg_color: string;
  category: string; min_kg: number; varieties: Variety[] };
