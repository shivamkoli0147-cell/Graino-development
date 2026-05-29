import { VILLAGES } from "../../lib/utils";

interface VillagePickerProps {
  currentVillage: string;
  onSelect: (village: string) => void;
  onClose: () => void;
}

export function VillagePicker({ currentVillage, onSelect, onClose }: VillagePickerProps) {
  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)",
          zIndex: 950, backdropFilter: "blur(2px)",
        }}
      />
      <div style={{
        position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)",
        width: "100%", maxWidth: 390, zIndex: 951,
        background: "white", borderRadius: "20px 20px 0 0",
        boxShadow: "0 -8px 40px rgba(0,0,0,0.2)",
        animation: "so-sheet 0.25s cubic-bezier(.25,.8,.25,1) forwards",
      }}>
        <div style={{ display: "flex", justifyContent: "center", padding: "12px 0 0" }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: "#E5DDD0" }} />
        </div>

        <div style={{
          padding: "12px 18px 10px",
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 16, color: "#1C1C1C" }}>📍 गांव चुनें</div>
            <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>Delivery इस गांव में होगी</div>
          </div>
          <button onClick={onClose} style={{
            background: "#F3F4F6", border: "none", borderRadius: 20,
            width: 32, height: 32, fontSize: 15, cursor: "pointer", color: "#666",
            fontFamily: "'Baloo 2', sans-serif",
          }}>✕</button>
        </div>

        <div style={{ padding: "4px 12px 32px", display: "flex", flexDirection: "column", gap: 3 }}>
          {VILLAGES.map(v => {
            const sel = v === currentVillage;
            return (
              <button
                key={v}
                onClick={() => { onSelect(v); onClose(); }}
                style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "11px 14px", borderRadius: 14, border: "none", cursor: "pointer",
                  background: sel ? "#E8F5E8" : "transparent",
                  fontFamily: "'Baloo 2', sans-serif", textAlign: "left",
                  transition: "background 0.12s",
                }}
              >
                <span style={{
                  fontWeight: sel ? 800 : 600, fontSize: 15,
                  color: sel ? "#1a6b1a" : "#1C1C1C",
                }}>
                  {sel && <span style={{ marginRight: 4 }}>📍</span>}{v}
                </span>
                {sel && (
                  <span style={{
                    background: "#1a6b1a", color: "white", borderRadius: "50%",
                    width: 22, height: 22, display: "flex", alignItems: "center",
                    justifyContent: "center", fontSize: 12, fontWeight: 800, flexShrink: 0,
                  }}>✓</span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}
