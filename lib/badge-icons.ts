// Map badge IDs to icon components
import {
  IconEmbodiment,
  IconConnection,
  IconIntegration,
  IconProfileNav,
  IconForYou,
  IconAlert,
  IconBadges,
  IconReflection,
  IconChat,
  IconArrow,
} from "@/components/Icons";

export function getBadgeIcon(badgeId: string) {
  const iconMap: Record<string, any> = {
    "first-step": IconEmbodiment,
    "first-share": IconChat,
    "first-witness": IconEmbodiment,
    "thoughtful-witness": IconConnection,
    "community-builder": IconIntegration,
    "consent-champion": IconConnection,
    "explorer": IconArrow,
    "connection-seeker": IconConnection,
    "embodied": IconEmbodiment,
    "truth-teller": IconIntegration,
    "self-aware": IconProfileNav,
    "vulnerability-warrior": IconAlert,
    "bridge-builder": IconArrow,
  };

  return iconMap[badgeId] || IconBadges;
}
