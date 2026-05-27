interface NavTab {
  id: string;
  icon: string;
  label: string;
  badge?: number;
}

interface BottomNavProps {
  tabs: NavTab[];
  active: string;
  onSelect: (id: string) => void;
}

export function BottomNav({ tabs, active, onSelect }: BottomNavProps) {
  return (
    <div style={{
      background: "white",
      borderTop: "1px solid #EDEAE5",
      display: "grid",
      gridTemplateColumns: `repeat(${tabs.length},1fr)`,
      padding: "8px 0 18px",
      flexShrink: 0,
      zIndex: 50,
      position: "sticky",
      bottom: 0,
      boxShadow: "0 -4px 16px rgba(0,0,0,0.06)",
    }}>
      {tabs.map((t) => {
        const isActive = active === t.id;
        return (
          <div
            key={t.id}
            onClick={() => onSelect(t.id)}
            className="btn-press"
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 3,
              cursor: "pointer",
              padding: "4px 0",
              position: "relative",
            }}
          >
            {/* Active pill indicator above icon */}
            {isActive && (
              <div style={{
                position: "absolute",
                top: -8,
                width: 32, height: 3,
                borderRadius: 99,
                background: "linear-gradient(90deg,#1B4332,#2D6A2D)",
              }} />
            )}

            <div style={{
              fontSize: 22, position: "relative",
              filter: isActive ? "none" : "grayscale(0.4)",
              opacity: isActive ? 1 : 0.55,
              transition: "all 0.15s ease",
            }}>
              {t.icon}
              {!!t.badge && t.badge > 0 && (
                <div style={{
                  position: "absolute", top: -5, right: -7,
                  background: "#ef4444", color: "white",
                  borderRadius: "50%", width: 17, height: 17,
                  fontSize: 10, fontWeight: 800,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  boxShadow: "0 1px 4px rgba(239,68,68,0.4)",
                }}>
                  {t.badge}
                </div>
              )}
            </div>

            <div style={{
              fontSize: 10, fontWeight: isActive ? 800 : 600,
              color: isActive ? "#1B4332" : "#999",
              fontFamily: "'Baloo 2', sans-serif",
              transition: "color 0.15s ease",
            }}>
              {t.label}
            </div>
          </div>
        );
      })}
    </div>
  );
}
