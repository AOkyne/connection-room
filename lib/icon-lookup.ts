// Universal icon lookup for emoji-to-SVG mappings
import {
  IconIntegration,
  IconSpaces,
  IconProfileNav,
  IconCouples,
  IconEmbodiment,
  IconConnection,
  IconHeart,
  IconArrow,
  IconChat,
  IconBadges,
} from "@/components/Icons";

export function getIconComponent(iconString: string) {
  const iconMap: Record<string, any> = {
    // Recommendations
    "✨": IconIntegration,
    "🏛️": IconSpaces,
    "🧭": IconProfileNav,
    "🕊️": IconCouples,
    "💕": IconHeart,
    "🧘": IconEmbodiment,
    "🤝": IconConnection,
    "🏕️": IconArrow,
    "🌟": IconIntegration,
    // Suggested spaces
    "👋": IconProfileNav,
    "🤲": IconConnection,
  };

  return iconMap[iconString] || IconBadges;
}
