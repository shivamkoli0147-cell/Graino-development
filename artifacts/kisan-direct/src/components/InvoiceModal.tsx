import { useEffect } from "react";

interface InvoiceModalProps {
  invoiceUrl: string;
  orderId: number;
  onClose: () => void;
}

export function InvoiceModal({ invoiceUrl, orderId, onClose }: InvoiceModalProps) {
  // Lock body scroll while open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "rgba(0,0,0,0.55)",
        display: "flex", flexDirection: "column",
        animation: "inv-overlay 0.22s ease forwards",
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <style>{`
        @keyframes inv-overlay { from{opacity:0} to{opacity:1} }
        @keyframes inv-sheet { from{transform:translateY(100%)} to{transform:translateY(0)} }
      `}</style>

      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0,
        height: "92vh",
        background: "white",
        borderRadius: "20px 20px 0 0",
        display: "flex", flexDirection: "column",
        animation: "inv-sheet 0.28s cubic-bezier(.25,.8,.25,1) forwards",
        overflow: "hidden",
      }}>

        {/* ── Header bar ─────────────────────────────────────────────── */}
        <div style={{
          background: "linear-gradient(135deg,#1a3d1a,#2D6A2D)",
          padding: "14px 16px",
          display: "flex", alignItems: "center", gap: 12,
          flexShrink: 0,
        }}>
          <div style={{ flex: 1 }}>
            <div style={{ color: "white", fontWeight: 800, fontSize: 16 }}>
              📄 Invoice #{orderId}
            </div>
            <div style={{ color: "rgba(255,255,255,0.65)", fontSize: 11, marginTop: 1 }}>
              Order Receipt · KisanDirect
            </div>
          </div>

          {/* Download / print button */}
          <a
            href={invoiceUrl}
            target="_blank"
            rel="noreferrer"
            style={{
              display: "flex", alignItems: "center", gap: 6,
              background: "#4ade80", color: "#14532d",
              borderRadius: 10, padding: "8px 14px",
              fontFamily: "'Baloo 2', sans-serif",
              fontWeight: 800, fontSize: 13,
              textDecoration: "none", flexShrink: 0,
            }}
          >
            📥 Download
          </a>

          <button
            onClick={onClose}
            style={{
              background: "rgba(255,255,255,0.15)", border: "none",
              borderRadius: 10, color: "white",
              width: 36, height: 36,
              fontFamily: "'Baloo 2', sans-serif",
              fontWeight: 800, fontSize: 18, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
            }}
          >✕</button>
        </div>

        {/* ── Invoice iframe ─────────────────────────────────────────── */}
        <iframe
          src={invoiceUrl}
          style={{
            flex: 1, border: "none", width: "100%",
            background: "#f0f7f0",
          }}
          title={`Invoice #${orderId}`}
        />
      </div>
    </div>
  );
}
