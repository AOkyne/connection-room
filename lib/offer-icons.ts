// Map offer IDs to icon components
import {
  IconProfileNav,
  IconConnection,
  IconForYou,
  IconCouples,
  IconEmbodiment,
  IconIntegration,
} from "@/components/Icons";

export function getOfferIcon(offerId: string) {
  const iconMap: Record<string, any> = {
    "offer-quiz": IconProfileNav,
    "offer-consult": IconConnection,
    "offer-couples": IconCouples,
    "offer-feel-more": IconEmbodiment,
    "offer-services": IconForYou,
  };

  return iconMap[offerId] || IconIntegration;
}
