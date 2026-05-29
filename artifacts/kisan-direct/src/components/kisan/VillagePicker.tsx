import { useState, useEffect } from "react";

interface VillagePickerProps {
  currentVillage: string;
  onSelect: (village: string) => void;
  onClose: () => void;
}

export function VillagePicker({ currentVillage, onSelect, onClose }: VillagePickerProps) {
  const [villages, setVillages] = useState<string[]>([]);

  useEffect(() => {
    fetch("/api/settings/villages")
      .then(r => r.json())
      .then((rows: { id: number; name: string }[]) => setVillages(rows.map(r => r.name)))
      .catch(() => {});
  }, []);

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0,
          background: "rgba(0,0,0,0.5)",
          zIndex: 950,
          backdropFilter: "blur(3px)",
          WebkitBackdropFilter: "blur(3px)",
        }}
      />

      {/* Centered modal */}
      <div style={{
        position: "fixed",
        top: "50%", left: "50%",
        transform: "translate(-50%, -50%)",
        zIndex: 951,
        width: "calc(100% - 40px)",
        maxWidth: 360,
        maxHeight: "70vh",
        background: "white",
        borderRadius: 20,
        boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}>

        {/* Header */}
        <div style={{
          padding: "16px 16px 12px",
          borderBottom: "1px solid #F0EDE8",
          flexShrink: 0,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}>
          <div>
            <div style={{
              fontWeight: 800, fontSize: 16, color: "#1C1C1C",
              fontFamily: "'Baloo 2', sans-serif",
            }}>
              📍 गांव बदलें
            </div>
            <div style={{
              fontSize: 12, color: "#888", marginTop: 2,
              fontFamily: "'Baloo 2', sans-serif",
            }}>
              Delivery किस गांव में करें?
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "#F3F4F6", border: "none", borderRadius: "50%",
              width: 34, height: 34, fontSize: 16, cursor: "pointer",
              color: "#555", display: "flex", alignItems: "center",
              justifyContent: "center", flexShrink: 0,
            }}
          >✕</button>
        </div>

        {/* Scrollable village list */}
        <div style={{
          flex: 1,
          overflowY: "auto",
          padding: "8px 10px 12px",
          display: "flex",
          flexDirection: "column",
          gap: 3,
          WebkitOverflowScrolling: "touch",
        }}>
          {villages.length === 0 && (
            <div style={{
              textAlign: "center", padding: "32px 16px",
              color: "#bbb", fontFamily: "'Baloo 2', sans-serif", fontSize: 14,
            }}>
              गांव लोड हो रहे हैं...
            </div>
          )}
          {villages.map(v => {
            const sel = v === currentVillage;
            return (
              <button
                key={v}
                onClick={() => { onSelect(v); onClose(); }}
                style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "12px 14px", borderRadius: 13,
                  border: sel ? "1.5px solid #86efac" : "1.5px solid transparent",
                  cursor: "pointer", textAlign: "left",
                  background: sel ? "#F0FDF4" : "#FAFAF8",
                  fontFamily: "'Baloo 2', sans-serif",
                  transition: "background 0.12s",
                  width: "100%",
                  boxSizing: "border-box",
                }}
              >
                <span style={{
                  fontWeight: sel ? 800 : 600,
                  fontSize: 15,
                  color: sel ? "#15803D" : "#1C1C1C",
                }}>
                  {sel ? "📍 " : "🏘 "}{v}
                </span>
                {sel && (
                  <span style={{
                    background: "#16a34a", color: "white", borderRadius: "50%",
                    width: 24, height: 24,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 12, fontWeight: 800, flexShrink: 0,
                  }}>✓</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Footer hint */}
        <div style={{
          padding: "10px 16px",
          borderTop: "1px solid #F0EDE8",
          flexShrink: 0,
          textAlign: "center",
          fontSize: 11,
          color: "#bbb",
          fontFamily: "'Baloo 2', sans-serif",
          background: "#FAFAF8",
        }}>
          बाहर tap करें या ✕ दबाएं बंद करने के लिए
        </div>
      </div>
    </>
  );
}
