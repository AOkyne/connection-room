interface SpaceIconProps {
  iconId: string;
  size?: number;
}

const iconStyles: { [key: string]: { bg: string; letter: string } } = {
  commons: { bg: "#d4a348", letter: "C" },
  "start-here": { bg: "#8b6f47", letter: "S" },
  "intimacy-patterns": { bg: "#a84a2a", letter: "I" },
  "touch-affection": { bg: "#c97a2a", letter: "T" },
  "spirituality-sexuality": { bg: "#1a0f0a", letter: "X" },
  "dating-desire": { bg: "#a0704a", letter: "D" },
  couples: { bg: "#c9956b", letter: "U" },
  embodiment: { bg: "#8b6f47", letter: "E" },
  workshops: { bg: "#a84a2a", letter: "W" },
};

export function SpaceIcon({ iconId, size = 24 }: SpaceIconProps) {
  console.log("SpaceIcon iconId:", iconId, "available keys:", Object.keys(iconStyles));
  const style = iconStyles[iconId] || iconStyles.commons;

  return (
    <div
      style={{
        width: `${size}px`,
        height: `${size}px`,
        backgroundColor: style.bg,
        borderRadius: "6px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "white",
        fontSize: `${size * 0.5}px`,
        fontWeight: "900",
        fontFamily: "system-ui, sans-serif",
        letterSpacing: "0",
      }}
    >
      {style.letter}
    </div>
  );
}
