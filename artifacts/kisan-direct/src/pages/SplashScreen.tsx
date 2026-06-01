import { useEffect, useState } from "react";

interface SplashScreenProps {
  onDone: () => void;
}

export function SplashScreen({ onDone }: SplashScreenProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => {
      setVisible(false);
      setTimeout(onDone, 400);
    }, 2500);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      background: "#1B4332",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      transition: "opacity 0.4s ease",
      opacity: visible ? 1 : 0,
    }}>
      {/* Animated grain particles */}
      <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
        {PARTICLES.map((p, i) => (
          <div key={i} className="grain-particle" style={{
            left: p.x + "%",
            width: p.size, height: p.size,
            animationDuration: p.dur + "s",
            animationDelay: p.delay + "s",
            background: p.gold ? "rgba(245,158,11,0.18)" : "rgba(255,255,255,0.08)",
            borderRadius: "50%",
            position: "absolute",
            bottom: "-20px",
          }} />
        ))}
      </div>

      {/* Logo block */}
      <div className="splash-fade" style={{ textAlign: "center", position: "relative", zIndex: 2 }}>
        {/* Wheat icon */}
        <div style={{
          fontSize: 72, lineHeight: 1,
          filter: "drop-shadow(0 4px 24px rgba(245,158,11,0.5))",
          marginBottom: 16,
          animation: "splashIconPop 0.6s cubic-bezier(0.34,1.56,0.64,1) both",
        }}>
          🌾
        </div>

        {/* Graino wordmark */}
        <div style={{
          fontFamily: "'Baloo 2', sans-serif",
          fontWeight: 800,
          fontSize: 52,
          letterSpacing: -1.5,
          color: "white",
          lineHeight: 1,
          marginBottom: 8,
        }}>
          Grai<span style={{ color: "#F59E0B" }}>no</span>
        </div>

        {/* Tagline */}
        <div style={{
          fontFamily: "'Baloo 2', sans-serif",
          fontSize: 15,
          color: "#D4AF37",
          fontWeight: 600,
          letterSpacing: 0.5,
          marginTop: 4,
          opacity: 0.9,
        }}>
          हर किसान, हमारा वादा
        </div>

        {/* Thin gold underline */}
        <div style={{
          width: 48, height: 2, background: "#F59E0B",
          borderRadius: 99, margin: "16px auto 0",
          opacity: 0.6,
        }} />
      </div>

      {/* Bottom tagline */}
      <div style={{
        position: "absolute", bottom: 48,
        fontFamily: "'Baloo 2', sans-serif",
        fontSize: 12, color: "rgba(255,255,255,0.3)", fontWeight: 500,
        letterSpacing: 1,
      }}>
        सीधे खेत से आपके द्वार तक
      </div>
    </div>
  );
}

const PARTICLES = Array.from({ length: 22 }, (_, i) => ({
  x: Math.random() * 100,
  size: Math.random() * 8 + 4,
  dur: Math.random() * 5 + 4,
  delay: Math.random() * 4,
  gold: i % 3 === 0,
}));
