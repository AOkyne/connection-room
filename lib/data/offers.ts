// Offers data access layer - demo mode with localStorage

import { demoOffers } from "./demo-data";
import type { Profile } from "./profiles";

// Get offers relevant to user's profile
export function getRelevantOffers(profile: Profile): typeof demoOffers {
  return demoOffers.filter((offer) => offer.condition(profile));
}

// Get a specific offer
export function getOffer(offerId: string) {
  return demoOffers.find((o) => o.id === offerId);
}

// Get all offers
export function getAllOffers() {
  return demoOffers;
}
