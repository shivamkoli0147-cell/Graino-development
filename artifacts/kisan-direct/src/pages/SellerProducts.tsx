import { useState, useRef, useEffect, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetProducts,
  useCreateProduct,
  useUpdateProduct,
  useDeleteProduct,
  getGetProductsQueryKey,
} from "@workspace/api-client-react";

// ─── Types ────────────────────────────────────────────────────────────────────
type BenefitItem = { text: string };
type VarietyForm = {
  id?: number;
  name: string;
  price_per_kg: string;
  description: string;
  shelf_life: string;
  in_stock: boolean;
  benefits: BenefitItem[];
  disadvantages: BenefitItem[];
};
type ProductForm = {
  id?: number;
  name: string;
  name_en: string;
  emoji: string;
  category: string;
  min_kg: string;
  bg_color: string;
  price_per_kg: string;
  varieties: VarietyForm[];
  benefits: BenefitItem[];
  disadvantages: BenefitItem[];
};

type ApiProduct = {
  id: number; name: string; name_en: string; emoji: string;
  category: string; min_kg: number; bg_color: string; price_per_kg?: number | null;
  varieties: {
    id: number; name: string; price_per_kg: number; description?: string;
    shelf_life?: string; in_stock: boolean;
    benefits?: { text: string }[];
    disadvantages?: { text: string }[];
  }[];
  benefits?: { text: string }[];
  disadvantages?: { text: string }[];
};

// ─── Constants ─────────────────────────────────────────────────────────────────
const EMOJI_OPTIONS = ["🌾","🟢","🟡","🥜","🌽","🌿","🍅","🧅","🧄","🌰","🫘","🥦","🍋","🍇","🍎","🫚","🌶️","🫛"];
const BG_COLORS = [
  { label: "हरा", value: "linear-gradient(135deg,#dcfce7,#d1fae5)" },
  { label: "पीला", value: "linear-gradient(135deg,#fef9c3,#fef3c7)" },
  { label: "लाल", value: "linear-gradient(135deg,#fee2e2,#fef2f2)" },
  { label: "नीला", value: "linear-gradient(135deg,#dbeafe,#e0f2fe)" },
  { label: "बैंगनी", value: "linear-gradient(135deg,#ede9fe,#f5f3ff)" },
  { label: "नारंगी", value: "linear-gradient(135deg,#ffedd5,#fff7ed)" },
  { label: "टील", value: "linear-gradient(135deg,#ccfbf1,#e0f7f3)" },
  { label: "गुलाबी", value: "linear-gradient(135deg,#fce7f3,#fdf2f8)" },
];

const EMPTY_VARIETY: VarietyForm = {
  name: "", price_per_kg: "", description: "", shelf_life: "",
  in_stock: true, benefits: [], disadvantages: [],
};
const EMPTY_FORM: ProductForm = {
  name: "", name_en: "", emoji: "🌾", category: "अनाज", min_kg: "10",
  bg_color: BG_COLORS[0].value,
  price_per_kg: "", varieties: [], benefits: [], disadvantages: [],
};

function productToForm(p: ApiProduct): ProductForm {
  return {
    id: p.id,
    name: p.name, name_en: p.name_en, emoji: p.emoji,
    category: p.category, min_kg: String(p.min_kg), bg_color: p.bg_color,
    price_per_kg: p.price_per_kg != null ? String(p.price_per_kg) : "",
    varieties: (p.varieties || []).map(v => ({
      id: v.id, name: v.name, price_per_kg: String(v.price_per_kg),
      description: v.description || "", shelf_life: v.shelf_life || "",
      in_stock: v.in_stock,
      benefits: (v.benefits || []).map(b => ({ text: b.text })),
      disadvantages: (v.disadvantages || []).map(b => ({ text: b.text })),
    })),
    benefits: (p.benefits || []).map(b => ({ text: b.text })),
    disadvantages: (p.disadvantages || []).map(b => ({ text: b.text })),
  };
}

// ─── Small UI helpers ──────────────────────────────────────────────────────────
function Label({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 12, fontWeight: 700, color: "#555", marginBottom: 4 }}>{children}</div>;
}

function Input({ value, onChange, placeholder, type = "text" }: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string;
}) {
  return (
    <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} type={type}
      style={{
        width: "100%", boxSizing: "border-box", border: "1.5px solid #E5DDD0",
        borderRadius: 10, padding: "9px 12px", fontFamily: "'Baloo 2',sans-serif",
        fontSize: 14, outline: "none", background: "#FAFAF8",
      }} />
  );
}

function TagsInput({ label, items, color, onAdd, onRemove }: {
  label: string; items: BenefitItem[]; color: "green" | "yellow";
  onAdd: (text: string) => void; onRemove: (i: number) => void;
}) {
  const [input, setInput] = useState("");
  const tagBg = color === "green" ? "#E8F5E8" : "#FEF9C3";
  const tagColor = color === "green" ? "#2D6A2D" : "#92400E";

  const add = () => {
    const t = input.trim();
    if (t) { onAdd(t); setInput(""); }
  };

  return (
    <div style={{ marginBottom: 10 }}>
      <Label>{label}</Label>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 6 }}>
        {items.map((b, i) => (
          <span key={i} style={{
            background: tagBg, color: tagColor, borderRadius: 20,
            padding: "3px 10px 3px 12px", fontSize: 12, fontWeight: 600,
            display: "flex", alignItems: "center", gap: 4,
          }}>
            {b.text}
            <button onClick={() => onRemove(i)} style={{
              background: "none", border: "none", cursor: "pointer", padding: 0,
              color: tagColor, fontSize: 14, lineHeight: 1, fontWeight: 800,
            }}>×</button>
          </span>
        ))}
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        <input value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && add()}
          placeholder="लिखें और ＋ दबाएं"
          style={{
            flex: 1, border: "1.5px solid #E5DDD0", borderRadius: 10,
            padding: "7px 10px", fontFamily: "'Baloo 2',sans-serif", fontSize: 13,
            outline: "none", background: "#FAFAF8",
          }} />
        <button onClick={add} style={{
          background: tagBg, color: tagColor, border: "none", borderRadius: 10,
          padding: "7px 12px", fontFamily: "'Baloo 2',sans-serif",
          fontWeight: 800, fontSize: 15, cursor: "pointer",
        }}>＋</button>
      </div>
    </div>
  );
}

// ─── Image Manager (only for existing products) ────────────────────────────────
type ProductImageItem = { id: number; url: string; sort_order: number };

function ImageManager({ productId }: { productId: number }) {
  const [images, setImages] = useState<ProductImageItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchImages = useCallback(async () => {
    try {
      const res = await fetch(`/api/products/${productId}/images`);
      if (res.ok) setImages(await res.json());
    } catch { /* ignore */ }
  }, [productId]);

  useEffect(() => { void fetchImages(); }, [fetchImages]);

  const handleUpload = async (files: FileList) => {
    if (images.length >= 5) { setError("अधिकतम 5 images allowed"); return; }
    const toUpload = Array.from(files).slice(0, 5 - images.length);
    setUploading(true); setError(null);
    try {
      const formData = new FormData();
      toUpload.forEach(f => formData.append("images", f));
      const res = await fetch(`/api/products/${productId}/images`, { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Upload failed"); }
      else { await fetchImages(); }
    } catch (e) { setError("Upload failed: " + String(e)); }
    finally { setUploading(false); if (fileInputRef.current) fileInputRef.current.value = ""; }
  };

  const handleDelete = async (imageId: number) => {
    try {
      await fetch(`/api/products/images/${imageId}`, { method: "DELETE" });
      await fetchImages();
    } catch { setError("Delete failed"); }
  };

  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
        {images.map((img, idx) => (
          <div key={img.id} style={{ position: "relative" }}>
            <img
              src={img.url}
              alt={`Image ${idx + 1}`}
              style={{ width: 76, height: 76, objectFit: "cover", borderRadius: 10, display: "block", border: "1.5px solid #E5DDD0" }}
            />
            <div style={{
              position: "absolute", top: 3, left: 5,
              background: "rgba(0,0,0,0.55)", borderRadius: 6,
              padding: "1px 5px", color: "white", fontSize: 9, fontWeight: 700,
            }}>{idx + 1}</div>
            <button
              onClick={() => handleDelete(img.id)}
              style={{
                position: "absolute", top: -6, right: -6,
                width: 20, height: 20, borderRadius: "50%",
                background: "#dc2626", color: "white", border: "2px solid white",
                cursor: "pointer", fontSize: 12, fontWeight: 800,
                display: "flex", alignItems: "center", justifyContent: "center",
                lineHeight: 1, padding: 0,
              }}>×</button>
          </div>
        ))}
        {images.length < 5 && (
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            style={{
              width: 76, height: 76, borderRadius: 10,
              border: "2px dashed #C5D8C5", background: "#F7FBF7",
              cursor: uploading ? "default" : "pointer",
              display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center", gap: 3,
              color: "#4A9B4A", fontSize: 10, fontWeight: 700,
              fontFamily: "'Baloo 2', sans-serif",
            }}>
            {uploading ? <span style={{ fontSize: 18 }}>⏳</span> : <><span style={{ fontSize: 22 }}>📷</span>Add</>}
          </button>
        )}
      </div>
      <input
        ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp"
        multiple style={{ display: "none" }}
        onChange={e => { if (e.target.files?.length) void handleUpload(e.target.files); }}
      />
      <div style={{ fontSize: 11, color: "#999", fontFamily: "'Baloo 2', sans-serif" }}>
        {images.length}/5 images · JPG/PNG/WebP · max 10MB each
      </div>
      {error && (
        <div style={{ marginTop: 6, fontSize: 12, color: "#dc2626", background: "#FEE2E2",
          borderRadius: 8, padding: "6px 10px", fontFamily: "'Baloo 2', sans-serif" }}>
          ❌ {error}
        </div>
      )}
    </div>
  );
}

// ─── Variety Editor ────────────────────────────────────────────────────────────
function VarietyEditor({ variety, index, onUpdate, onDelete, canDelete }: {
  variety: VarietyForm; index: number;
  onUpdate: (v: VarietyForm) => void;
  onDelete: () => void;
  canDelete: boolean;
}) {
  const [open, setOpen] = useState(index === 0);
  const upd = (patch: Partial<VarietyForm>) => onUpdate({ ...variety, ...patch });

  return (
    <div style={{
      border: "1.5px solid #E5DDD0", borderRadius: 14,
      overflow: "hidden", marginBottom: 8, background: "white",
    }}>
      <div onClick={() => setOpen(!open)} style={{
        display: "flex", alignItems: "center", padding: "10px 14px",
        cursor: "pointer", background: open ? "#F0FDF4" : "white",
        justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 14, color: "#999" }}>{open ? "▾" : "▸"}</span>
          <span style={{ fontWeight: 700, fontSize: 14, color: "#1C1C1C" }}>
            {variety.name || `किस्म ${index + 1}`}
          </span>
          {variety.price_per_kg && (
            <span style={{ fontSize: 12, color: "#2D6A2D", fontWeight: 700 }}>
              ₹{variety.price_per_kg}/kg
            </span>
          )}
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <button
            onClick={e => { e.stopPropagation(); upd({ in_stock: !variety.in_stock }); }}
            style={{
              background: variety.in_stock ? "#E8F5E8" : "#FEE2E2",
              color: variety.in_stock ? "#2D6A2D" : "#dc2626",
              border: "none", borderRadius: 8, padding: "3px 8px",
              fontSize: 11, fontWeight: 700, cursor: "pointer",
            }}>
            {variety.in_stock ? "✓ In Stock" : "✗ Out"}
          </button>
          {canDelete && (
            <button onClick={e => { e.stopPropagation(); onDelete(); }} style={{
              background: "none", border: "none", cursor: "pointer",
              fontSize: 15, color: "#dc2626", padding: "2px 4px",
            }}>🗑</button>
          )}
        </div>
      </div>

      {open && (
        <div style={{ padding: "0 14px 14px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
            <div>
              <Label>किस्म का नाम *</Label>
              <Input value={variety.name} onChange={v => upd({ name: v })} placeholder="जैसे: Lokman" />
            </div>
            <div>
              <Label>₹ per kg *</Label>
              <Input value={variety.price_per_kg} onChange={v => upd({ price_per_kg: v })} placeholder="22" type="number" />
            </div>
          </div>
          <div style={{ marginBottom: 8 }}>
            <Label>विवरण</Label>
            <Input value={variety.description} onChange={v => upd({ description: v })} placeholder="किस्म के बारे में..." />
          </div>
          <div style={{ marginBottom: 12 }}>
            <Label>Shelf Life</Label>
            <Input value={variety.shelf_life} onChange={v => upd({ shelf_life: v })} placeholder="जैसे: 2 साल" />
          </div>
          <TagsInput
            label="✅ फायदे (इस किस्म के)"
            items={variety.benefits} color="green"
            onAdd={t => upd({ benefits: [...variety.benefits, { text: t }] })}
            onRemove={i => upd({ benefits: variety.benefits.filter((_, idx) => idx !== i) })}
          />
          <TagsInput
            label="⚠️ नुकसान (इस किस्म के)"
            items={variety.disadvantages} color="yellow"
            onAdd={t => upd({ disadvantages: [...variety.disadvantages, { text: t }] })}
            onRemove={i => upd({ disadvantages: variety.disadvantages.filter((_, idx) => idx !== i) })}
          />
        </div>
      )}
    </div>
  );
}

// ─── Product Form View ──────────────────────────────────────────────────────────
function ProductFormView({ form, categories, onSave, onCancel, onDelete, saving, deleting }: {
  form: ProductForm; categories: string[]; onSave: (f: ProductForm) => void;
  onCancel: () => void; onDelete?: () => void;
  saving: boolean; deleting: boolean;
}) {
  const [f, setF] = useState<ProductForm>(form);
  const upd = (patch: Partial<ProductForm>) => setF(prev => ({ ...prev, ...patch }));
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const updateVariety = (i: number, v: VarietyForm) =>
    upd({ varieties: f.varieties.map((x, idx) => idx === i ? v : x) });
  const deleteVariety = (i: number) =>
    upd({ varieties: f.varieties.filter((_, idx) => idx !== i) });
  const addVariety = () =>
    upd({ varieties: [...f.varieties, { ...EMPTY_VARIETY }] });

  const noVarieties = f.varieties.length === 0;
  const valid = f.name.trim() && f.name_en.trim() && f.emoji.trim() &&
    (noVarieties
      ? !!f.price_per_kg && !isNaN(parseFloat(f.price_per_kg))
      : f.varieties.every(v => v.name.trim() && v.price_per_kg));

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: "#F7F4EF" }}>
      {/* Top bar */}
      <div style={{
        background: "white", borderBottom: "1px solid #E5DDD0",
        padding: "14px 16px", display: "flex", alignItems: "center",
        justifyContent: "space-between", flexShrink: 0,
        willChange: "transform", transform: "translateZ(0)", zIndex: 100,
      }}>
        <button onClick={onCancel} style={{
          background: "none", border: "none", cursor: "pointer",
          fontFamily: "'Baloo 2',sans-serif", fontWeight: 700, fontSize: 15, color: "#555",
        }}>← वापस</button>
        <div style={{ fontWeight: 800, fontSize: 16, color: "#1C1C1C" }}>
          {form.id ? "Product Edit करें" : "नया Product जोड़ें"}
        </div>
        <button onClick={() => onSave(f)} disabled={!valid || saving} style={{
          background: valid && !saving ? "#2D6A2D" : "#ccc", color: "white",
          border: "none", borderRadius: 10, padding: "7px 14px",
          fontFamily: "'Baloo 2',sans-serif", fontWeight: 700, fontSize: 14,
          cursor: valid && !saving ? "pointer" : "default",
        }}>
          {saving ? "..." : "Save ✓"}
        </button>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "16px", WebkitOverflowScrolling: "touch" }}>

        {/* Basic Info */}
        <div style={{ background: "white", borderRadius: 16, padding: 16, marginBottom: 12 }}>
          <div style={{ fontWeight: 800, fontSize: 15, color: "#1C1C1C", marginBottom: 12 }}>📝 Basic जानकारी</div>

          <div style={{ marginBottom: 10 }}>
            <Label>Emoji चुनें</Label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {EMOJI_OPTIONS.map(e => (
                <button key={e} onClick={() => upd({ emoji: e })} style={{
                  fontSize: 22, background: f.emoji === e ? "#E8F5E8" : "white",
                  border: f.emoji === e ? "2px solid #2D6A2D" : "1.5px solid #E5DDD0",
                  borderRadius: 10, padding: "4px 8px", cursor: "pointer",
                }}>{e}</button>
              ))}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
            <div>
              <Label>हिंदी नाम *</Label>
              <Input value={f.name} onChange={v => upd({ name: v })} placeholder="जैसे: गेहूं" />
            </div>
            <div>
              <Label>English Name *</Label>
              <Input value={f.name_en} onChange={v => upd({ name_en: v })} placeholder="e.g. Wheat" />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
            <div>
              <Label>Category *</Label>
              <select value={f.category} onChange={e => upd({ category: e.target.value })}
                style={{
                  width: "100%", border: "1.5px solid #E5DDD0", borderRadius: 10,
                  padding: "9px 10px", fontFamily: "'Baloo 2',sans-serif", fontSize: 14,
                  outline: "none", background: "#FAFAF8", cursor: "pointer",
                }}>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <Label>Min Order (kg) *</Label>
              <Input value={f.min_kg} onChange={v => upd({ min_kg: v })} placeholder="10" type="number" />
            </div>
          </div>

          <div>
            <Label>Card का रंग</Label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {BG_COLORS.map(bg => (
                <button key={bg.value} onClick={() => upd({ bg_color: bg.value })} style={{
                  background: bg.value, border: f.bg_color === bg.value ? "2.5px solid #2D6A2D" : "1.5px solid #E5DDD0",
                  borderRadius: 10, padding: "6px 12px", cursor: "pointer",
                  fontFamily: "'Baloo 2',sans-serif", fontSize: 12, fontWeight: 600,
                  outline: "none",
                }}>{bg.label}</button>
              ))}
            </div>
          </div>
        </div>

        {/* Images — only when editing existing product */}
        {f.id && (
          <div style={{ background: "white", borderRadius: 16, padding: 16, marginBottom: 12 }}>
            <div style={{ fontWeight: 800, fontSize: 15, color: "#1C1C1C", marginBottom: 4 }}>
              📸 Product Images
            </div>
            <div style={{ fontSize: 12, color: "#888", marginBottom: 12, fontFamily: "'Baloo 2', sans-serif" }}>
              अधिकतम 5 फ़ोटो। पहली image card पर दिखेगी।
            </div>
            <ImageManager productId={f.id} />
          </div>
        )}
        {!f.id && (
          <div style={{ background: "#F0FDF4", borderRadius: 16, padding: 14, marginBottom: 12, border: "1.5px dashed #4A9B4A" }}>
            <div style={{ fontSize: 13, color: "#2D6A2D", fontWeight: 600, fontFamily: "'Baloo 2', sans-serif" }}>
              📸 Images — Product save करने के बाद upload कर सकते हैं
            </div>
          </div>
        )}

        {/* Product-level benefits / disadvantages */}
        <div style={{ background: "white", borderRadius: 16, padding: 16, marginBottom: 12 }}>
          <div style={{ fontWeight: 800, fontSize: 15, color: "#1C1C1C", marginBottom: 12 }}>
            🌿 फायदे / नुकसान (Product level)
          </div>
          <TagsInput
            label="✅ फायदे"
            items={f.benefits} color="green"
            onAdd={t => upd({ benefits: [...f.benefits, { text: t }] })}
            onRemove={i => upd({ benefits: f.benefits.filter((_, idx) => idx !== i) })}
          />
          <TagsInput
            label="⚠️ नुकसान"
            items={f.disadvantages} color="yellow"
            onAdd={t => upd({ disadvantages: [...f.disadvantages, { text: t }] })}
            onRemove={i => upd({ disadvantages: f.disadvantages.filter((_, idx) => idx !== i) })}
          />
        </div>

        {/* Varieties */}
        <div style={{ background: "white", borderRadius: 16, padding: 16, marginBottom: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <div style={{ fontWeight: 800, fontSize: 15, color: "#1C1C1C" }}>
              🌱 किस्में ({f.varieties.length})
            </div>
            <button onClick={addVariety} style={{
              background: "#E8F5E8", color: "#2D6A2D", border: "none",
              borderRadius: 10, padding: "6px 14px",
              fontFamily: "'Baloo 2',sans-serif", fontWeight: 700, fontSize: 13, cursor: "pointer",
            }}>＋ किस्म जोड़ें</button>
          </div>

          {noVarieties ? (
            <div style={{ marginBottom: 4 }}>
              <div style={{
                background: "#F0FDF4", border: "1.5px dashed #4A9B4A",
                borderRadius: 12, padding: "10px 14px", marginBottom: 10,
                fontSize: 12, color: "#2D6A2D", fontFamily: "'Baloo 2',sans-serif", fontWeight: 600,
              }}>
                ℹ️ कोई किस्म नहीं — नीचे सीधे price डालें
              </div>
              <Label>सीधा Rate (₹ per kg) *</Label>
              <Input
                value={f.price_per_kg}
                onChange={v => upd({ price_per_kg: v })}
                placeholder="जैसे: 25"
                type="number"
              />
            </div>
          ) : (
            f.varieties.map((v, i) => (
              <VarietyEditor key={i} variety={v} index={i}
                onUpdate={nv => updateVariety(i, nv)}
                onDelete={() => deleteVariety(i)}
                canDelete={true}
              />
            ))
          )}
        </div>

        {/* Preview */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontWeight: 700, fontSize: 12, color: "#999", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>Preview</div>
          <div style={{
            background: f.bg_color, borderRadius: 16, padding: 16,
            display: "flex", alignItems: "center", gap: 12,
          }}>
            <span style={{ fontSize: 36 }}>{f.emoji}</span>
            <div>
              <div style={{ fontWeight: 800, fontSize: 18 }}>{f.name || "Product नाम"}</div>
              <div style={{ fontSize: 12, color: "#555" }}>{f.name_en || "Name"} • min {f.min_kg || 10} kg</div>
              <div style={{ fontSize: 11, color: "#777", marginTop: 2 }}>
            {f.varieties.length > 0 ? `${f.varieties.length} किस्में` : (f.price_per_kg ? `₹${f.price_per_kg}/kg` : "कोई किस्म नहीं")}
          </div>
            </div>
          </div>
        </div>

        {/* Delete button */}
        {form.id && (
          <div style={{ marginBottom: 32 }}>
            {!showDeleteConfirm ? (
              <button onClick={() => setShowDeleteConfirm(true)} style={{
                width: "100%", background: "#FEE2E2", color: "#dc2626", border: "none",
                borderRadius: 12, padding: "12px 0",
                fontFamily: "'Baloo 2',sans-serif", fontWeight: 700, fontSize: 14, cursor: "pointer",
              }}>🗑 यह Product Delete करें</button>
            ) : (
              <div style={{ background: "#FEE2E2", borderRadius: 12, padding: 16 }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: "#dc2626", marginBottom: 12 }}>
                  क्या आप सच में "{f.name}" delete करना चाहते हैं?
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => setShowDeleteConfirm(false)} style={{
                    flex: 1, background: "white", color: "#555", border: "1.5px solid #E5DDD0",
                    borderRadius: 10, padding: "10px 0",
                    fontFamily: "'Baloo 2',sans-serif", fontWeight: 700, fontSize: 14, cursor: "pointer",
                  }}>नहीं, रहने दो</button>
                  <button onClick={onDelete} disabled={deleting} style={{
                    flex: 1, background: "#dc2626", color: "white", border: "none",
                    borderRadius: 10, padding: "10px 0",
                    fontFamily: "'Baloo 2',sans-serif", fontWeight: 700, fontSize: 14,
                    cursor: deleting ? "default" : "pointer",
                  }}>{deleting ? "..." : "हाँ, Delete करो"}</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main SellerProducts ────────────────────────────────────────────────────────
interface SellerProductsProps {
  onBack: () => void;
}

export function SellerProducts({ onBack: _onBack }: SellerProductsProps) {
  const { data: products, isLoading } = useGetProducts({});
  const qc = useQueryClient();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();

  const [formCategories, setFormCategories] = useState<string[]>(["अनाज","दालें","तिलहन","मसाले","सब्जी","फल","अन्य"]);
  useEffect(() => {
    fetch("/api/settings/categories")
      .then(r => r.json())
      .then((rows: { id: number; name: string }[]) => { if (rows.length) setFormCategories(rows.map(r => r.name)); })
      .catch(() => {});
  }, []);

  const [editing, setEditing] = useState<ProductForm | null>(null);
  const [filterCat, setFilterCat] = useState("सब");
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2500);
  };

  const invalidate = () => qc.invalidateQueries({ queryKey: getGetProductsQueryKey() });

  const handleSave = (f: ProductForm) => {
    const noVarieties = f.varieties.length === 0;
    const payload = {
      name: f.name.trim(), name_en: f.name_en.trim(), emoji: f.emoji,
      category: f.category, min_kg: parseInt(f.min_kg) || 10, bg_color: f.bg_color,
      price_per_kg: noVarieties && f.price_per_kg ? parseFloat(f.price_per_kg) : null,
      varieties: f.varieties.map(v => ({
        ...(v.id ? { id: v.id } : {}),
        name: v.name.trim(), price_per_kg: parseFloat(v.price_per_kg),
        description: v.description.trim(), shelf_life: v.shelf_life.trim(),
        in_stock: v.in_stock,
        benefits: v.benefits,
        disadvantages: v.disadvantages,
      })),
      benefits: f.benefits.map(b => b.text),
      disadvantages: f.disadvantages.map(b => b.text),
    };

    if (f.id) {
      updateProduct.mutate(
        { id: f.id, data: payload as Parameters<typeof updateProduct.mutate>[0]["data"] },
        {
          onSuccess: () => { invalidate(); setEditing(null); showToast("✅ Product update हो गया!"); },
          onError: () => showToast("❌ Save नहीं हो सका"),
        }
      );
    } else {
      createProduct.mutate(
        { data: payload as Parameters<typeof createProduct.mutate>[0]["data"] },
        {
          onSuccess: () => { invalidate(); setEditing(null); showToast("✅ नया Product जोड़ा गया!"); },
          onError: () => showToast("❌ Save नहीं हो सका"),
        }
      );
    }
  };

  const handleDelete = (id: number) => {
    deleteProduct.mutate({ id }, {
      onSuccess: () => { invalidate(); setEditing(null); showToast("🗑 Product delete हो गया"); },
      onError: () => showToast("❌ Delete नहीं हो सका"),
    });
  };

  if (editing) {
    return (
      <ProductFormView
        form={editing}
        categories={formCategories}
        onSave={handleSave}
        onCancel={() => setEditing(null)}
        onDelete={editing.id ? () => handleDelete(editing.id!) : undefined}
        saving={createProduct.isPending || updateProduct.isPending}
        deleting={deleteProduct.isPending}
      />
    );
  }

  const allProducts = (products as unknown as ApiProduct[] | undefined) || [];
  const categories = ["सब", ...Array.from(new Set(allProducts.map(p => p.category)))];
  const filtered = filterCat === "सब" ? allProducts : allProducts.filter(p => p.category === filterCat);

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: "#F7F4EF" }}>
      {toast && (
        <div style={{
          position: "fixed", top: 60, left: "50%", transform: "translateX(-50%)",
          background: "#1C1C1C", color: "white", borderRadius: 20,
          padding: "10px 20px", fontSize: 14, fontWeight: 700, zIndex: 999,
          whiteSpace: "nowrap", boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
        }}>{toast}</div>
      )}

      {/* Header */}
      <div style={{
        background: "white", borderBottom: "1px solid #E5DDD0",
        padding: "14px 16px", flexShrink: 0,
        display: "flex", justifyContent: "space-between", alignItems: "center",
        willChange: "transform", transform: "translateZ(0)", zIndex: 100,
      }}>
        <div style={{ fontWeight: 800, fontSize: 18, color: "#1C1C1C" }}>
          🛒 Products ({allProducts.length})
        </div>
        <button onClick={() => setEditing({ ...EMPTY_FORM, varieties: [{ ...EMPTY_VARIETY }] })} style={{
          background: "#2D6A2D", color: "white", border: "none",
          borderRadius: 12, padding: "8px 16px",
          fontFamily: "'Baloo 2',sans-serif", fontWeight: 700, fontSize: 14, cursor: "pointer",
        }}>＋ नया Product</button>
      </div>

      {/* Category filter */}
      {categories.length > 2 && (
        <div style={{
          background: "white", padding: "8px 16px 10px",
          borderBottom: "1px solid #E5DDD0", flexShrink: 0,
          willChange: "transform", transform: "translateZ(0)", zIndex: 99,
        }}>
          <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 2 }}>
            {categories.map(c => (
              <button key={c} onClick={() => setFilterCat(c)} style={{
                background: filterCat === c ? "#2D6A2D" : "#F0EDE8",
                color: filterCat === c ? "white" : "#555",
                border: "none", borderRadius: 20, padding: "5px 14px",
                fontFamily: "'Baloo 2',sans-serif", fontWeight: 700, fontSize: 12,
                cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0,
              }}>{c}</button>
            ))}
          </div>
        </div>
      )}

      <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px 24px", WebkitOverflowScrolling: "touch" }}>
        {isLoading ? (
          <div style={{ textAlign: "center", padding: 40, color: "#777" }}>
            <div style={{ fontSize: 32 }}>🌾</div>
            <div style={{ marginTop: 8 }}>लोड हो रहा है...</div>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{
            textAlign: "center", padding: 40, background: "white",
            borderRadius: 16, color: "#777",
          }}>
            <div style={{ fontSize: 40 }}>🌱</div>
            <div style={{ fontWeight: 700, marginTop: 8 }}>कोई product नहीं मिला</div>
            <button onClick={() => setEditing({ ...EMPTY_FORM, varieties: [{ ...EMPTY_VARIETY }] })} style={{
              marginTop: 16, background: "#2D6A2D", color: "white", border: "none",
              borderRadius: 12, padding: "10px 24px",
              fontFamily: "'Baloo 2',sans-serif", fontWeight: 700, fontSize: 14, cursor: "pointer",
            }}>＋ पहला Product जोड़ें</button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {filtered.map(p => {
              const inStockCount = p.varieties.filter(v => v.in_stock).length;
              return (
                <div key={p.id}
                  onClick={() => setEditing(productToForm(p))}
                  className="btn-press"
                  style={{
                    background: "white", borderRadius: 16, overflow: "hidden",
                    border: "1.5px solid #E5DDD0",
                    boxShadow: "0 2px 6px rgba(0,0,0,0.05)", cursor: "pointer",
                  }}>
                  <div style={{ display: "flex", alignItems: "center" }}>
                    <div style={{
                      background: p.bg_color, width: 64, minHeight: 72,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 30, flexShrink: 0,
                    }}>{p.emoji}</div>
                    <div style={{ flex: 1, padding: "12px 14px" }}>
                      <div style={{ fontWeight: 800, fontSize: 15, color: "#1C1C1C" }}>{p.name}</div>
                      <div style={{ fontSize: 12, color: "#777" }}>{p.name_en} • {p.category}</div>
                      <div style={{ fontSize: 12, marginTop: 4, display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <span style={{
                          background: inStockCount > 0 ? "#E8F5E8" : "#FEE2E2",
                          color: inStockCount > 0 ? "#2D6A2D" : "#dc2626",
                          borderRadius: 8, padding: "2px 8px", fontWeight: 700,
                        }}>
                          {inStockCount}/{p.varieties.length} in stock
                        </span>
                        <span style={{ color: "#999" }}>min {p.min_kg} kg</span>
                      </div>
                    </div>
                    <div style={{ padding: "0 14px", fontSize: 16 }}>✏️</div>
                  </div>
                  <div style={{
                    borderTop: "1px solid #F0EDE8", padding: "8px 14px",
                    display: "flex", gap: 6, flexWrap: "wrap",
                  }}>
                    {p.varieties.map(v => (
                      <span key={v.id} style={{
                        background: v.in_stock ? "#F0FDF4" : "#FEF2F2",
                        color: v.in_stock ? "#2D6A2D" : "#dc2626",
                        border: `1px solid ${v.in_stock ? "#BBF7D0" : "#FECACA"}`,
                        borderRadius: 8, padding: "2px 8px", fontSize: 11, fontWeight: 600,
                      }}>{v.name} ₹{v.price_per_kg}</span>
                    ))}
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
