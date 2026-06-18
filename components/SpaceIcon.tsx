interface SpaceIconProps {
  iconId: string;
  size?: number;
}

const iconStyles: { [key: string]: { bg: string; letter: string } } = {
  commons: { bg: "#d4a574", letter: "C" },
  "start-here": { bg: "#9d7f5c", letter: "S" },
  "intimacy-patterns": { bg: "#b86a52", letter: "I" },
  "touch-affection": { bg: "#8fa878", letter: "T" },
  "spirituality-sexuality": { bg: "#6b5f52", letter: "X" },
  "dating-desire": { bg: "#a0968a", letter: "D" },
  couples: { bg: "#c9956b", letter: "U" },
  embodiment: { bg: "#9d7f5c", letter: "E" },
  workshops: { bg: "#b86a52", letter: "W" },
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
