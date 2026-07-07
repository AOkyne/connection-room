// Map badge IDs to image paths
export function getBadgeImage(badgeId: string): string {
  const imageMap: Record<string, string> = {
    "first-step": "/badges/first_step.png",
    "first-response": "/badges/first_response.png",
    "first-share": "/badges/first_share.png",
    "first-witness": "/badges/first_witness.png",
    "thoughtful-witness": "/badges/thoughtful_witness.png",
    "community-builder": "/badges/community_builder.png",
    "community-ambassador": "/badges/community_ambassador.png",
    "consent-champion": "/badges/consent_champion.png",
    "explorer": "/badges/explorer.png",
    "connection-seeker": "/badges/connection_seeker.png",
    "embodied": "/badges/embodied.png",
    "truth-teller": "/badges/truth_teller.png",
    "self-aware": "/badges/self_aware.png",
    "vulnerability-warrior": "/badges/vulnerability_warrior.png",
    "bridge-builder": "/badges/bridge_builder.png",
  };

  return imageMap[badgeId] || "/badges/badge-default.png";
}

// Legacy function for backwards compatibility - returns icon components
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
    "first-response": IconChat,
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
