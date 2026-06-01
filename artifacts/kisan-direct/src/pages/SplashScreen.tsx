import { useEffect, useState } from "react";

interface SplashScreenProps {
  onDone: () => void;
}

export function SplashScreen({ onDone }: SplashScreenProps) {
  const [phase, setPhase] = useState<"in" | "hold" | "out">("in");

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("hold"), 100);
    const t2 = setTimeout(() => setPhase("out"), 2400);
    const t3 = setTimeout(onDone, 2800);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [onDone]);

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      background: "linear-gradient(160deg, #0d2e1a 0%, #1B4332 45%, #14532d 100%)",
      transition: "opacity 0.45s ease",
      opacity: phase === "out" ? 0 : 1,
      overflow: "hidden",
    }}>

      {/* Radial glow behind logo */}
      <div style={{
        position: "absolute",
        width: 320, height: 320,
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(212,175,55,0.18) 0%, transparent 70%)",
        top: "50%", left: "50%",
        transform: "translate(-50%, -58%)",
        pointerEvents: "none",
      }} />

      {/* Floating grain particles */}
      <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
        {PARTICLES.map((p, i) => (
          <div key={i} className="grain-particle" style={{
            left: p.x + "%",
            width: p.size, height: p.size,
            animationDuration: p.dur + "s",
            animationDelay: p.delay + "s",
            background: p.gold
              ? "rgba(212,175,55,0.22)"
              : "rgba(255,255,255,0.07)",
            borderRadius: "50%",
            position: "absolute",
            bottom: "-20px",
          }} />
        ))}
      </div>

      {/* Main content */}
      <div style={{
        display: "flex", flexDirection: "column",
        alignItems: "center", position: "relative", zIndex: 2,
        opacity: phase === "in" ? 0 : 1,
        transform: phase === "in" ? "translateY(24px) scale(0.95)" : "translateY(0) scale(1)",
        transition: "opacity 0.55s cubic-bezier(0.22,1,0.36,1), transform 0.55s cubic-bezier(0.22,1,0.36,1)",
      }}>

        {/* Logo card — white circle with shadow */}
        <div style={{
          width: 180, height: 180,
          borderRadius: "50%",
          background: "white",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 8px 48px rgba(0,0,0,0.35), 0 0 0 6px rgba(212,175,55,0.25), 0 0 0 12px rgba(212,175,55,0.08)",
          marginBottom: 28,
          overflow: "hidden",
        }}>
          <img
            src="/graino-logo.jpeg"
            alt="Graino"
            style={{
              width: "88%", height: "88%",
              objectFit: "contain",
            }}
          />
        </div>

        {/* Brand name */}
        <div style={{
          fontFamily: "'Baloo 2', sans-serif",
          fontWeight: 800,
          fontSize: 44,
          letterSpacing: -1,
          color: "white",
          lineHeight: 1,
          marginBottom: 6,
          textShadow: "0 2px 16px rgba(0,0,0,0.3)",
        }}>
          Grai<span style={{ color: "#D4AF37" }}>no</span>
        </div>

        {/* Gold divider */}
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          marginBottom: 8,
        }}>
          <div style={{ width: 32, height: 1.5, background: "rgba(212,175,55,0.5)", borderRadius: 99 }} />
          <div style={{ fontSize: 13, color: "#D4AF37", fontWeight: 500, letterSpacing: 0.5, opacity: 0.85 }}>🌾</div>
          <div style={{ width: 32, height: 1.5, background: "rgba(212,175,55,0.5)", borderRadius: 99 }} />
        </div>

        {/* Tagline */}
        <div style={{
          fontFamily: "'Baloo 2', sans-serif",
          fontSize: 14,
          color: "rgba(255,255,255,0.75)",
          fontWeight: 500,
          letterSpacing: 1.2,
          textTransform: "uppercase",
        }}>
          हर किसान, हमारा वादा
        </div>
      </div>

      {/* Bottom text */}
      <div style={{
        position: "absolute", bottom: 40,
        fontFamily: "'Baloo 2', sans-serif",
        fontSize: 11, color: "rgba(255,255,255,0.25)", fontWeight: 500,
        letterSpacing: 1.5, textTransform: "uppercase",
        opacity: phase === "in" ? 0 : 1,
        transition: "opacity 0.8s ease 0.4s",
      }}>
        सीधे खेत से आपके द्वार तक
      </div>
    </div>
  );
}

const PARTICLES = Array.from({ length: 26 }, (_, i) => ({
  x: Math.random() * 100,
  size: Math.random() * 7 + 3,
  dur: Math.random() * 6 + 5,
  delay: Math.random() * 5,
  gold: i % 3 === 0,
}));
