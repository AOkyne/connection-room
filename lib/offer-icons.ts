// Map offer IDs to icon components
import {
  IconProfileNav,
  IconConnection,
  IconForYou,
} from "@/components/Icons";

export function getOfferIcon(offerId: string) {
  const iconMap: Record<string, any> = {
    "offer-quiz": IconProfileNav,
    "offer-consult": IconConnection,
    "offer-couples": IconConnection,
    "offer-services": IconForYou,
  };

  return iconMap[offerId] || IconForYou;
}
