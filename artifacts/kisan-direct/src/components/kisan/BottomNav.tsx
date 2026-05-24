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
    <div
      style={{
        background: "white",
        borderTop: "1px solid #E5DDD0",
        display: "grid",
        gridTemplateColumns: `repeat(${tabs.length},1fr)`,
        padding: "8px 0 16px",
        flexShrink: 0,
        zIndex: 50,
        position: "sticky",
        bottom: 0,
      }}
    >
      {tabs.map((t) => (
        <div
          key={t.id}
          onClick={() => onSelect(t.id)}
          className="btn-press"
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 2,
            cursor: "pointer",
            padding: "4px 0",
            position: "relative",
          }}
        >
          <div style={{ fontSize: 22, position: "relative" }}>
            {t.icon}
            {!!t.badge && t.badge > 0 && (
              <div
                style={{
                  position: "absolute",
                  top: -4,
                  right: -6,
                  background: "#ef4444",
                  color: "white",
                  borderRadius: "50%",
                  width: 16,
                  height: 16,
                  fontSize: 10,
                  fontWeight: 800,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {t.badge}
              </div>
            )}
          </div>
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: active === t.id ? "#2D6A2D" : "#777",
            }}
          >
            {t.label}
          </div>
          {active === t.id && (
            <div
              style={{
                width: 4,
                height: 4,
                borderRadius: "50%",
                background: "#2D6A2D",
                marginTop: 1,
              }}
            />
          )}
        </div>
      ))}
    </div>
  );
}
