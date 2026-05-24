import { ReactNode } from "react";

interface PhoneShellProps {
  children: ReactNode;
  mode: "customer" | "seller";
  onToggleMode: () => void;
}

export function PhoneShell({ children, mode, onToggleMode }: PhoneShellProps) {
  return (
    <div style={{ display: "flex", justifyContent: "center", background: "#1a3d1a", minHeight: "100vh" }}>
      <div
        style={{
          width: "100%",
          maxWidth: 390,
          background: "#F7F4EF",
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          position: "relative",
          overflow: "hidden",
          fontFamily: "'Baloo 2', sans-serif",
        }}
      >
        {children}
        <button
          onClick={onToggleMode}
          className="btn-press"
          style={{
            position: "fixed",
            bottom: 88,
            right: "calc(50% - 185px)",
            zIndex: 999,
            background: mode === "seller" ? "#F59E0B" : "#1C1C1C",
            color: "white",
            border: "none",
            borderRadius: 30,
            padding: "10px 18px",
            fontFamily: "'Baloo 2', sans-serif",
            fontWeight: 700,
            fontSize: 13,
            cursor: "pointer",
            boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
            display: "flex",
            alignItems: "center",
            gap: 6,
            transition: "all 0.15s",
          }}
        >
          {mode === "customer" ? "🌾 Seller View" : "👤 Customer View"}
        </button>
      </div>
    </div>
  );
}
