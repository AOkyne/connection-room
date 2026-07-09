import { supabase } from "@/lib/supabase/client";

export interface Offer {
  id: string;
  title: string;
  slug?: string;
  subtitle?: string;
  description?: string;
  shortDescription?: string;
  category: string;
  status: "draft" | "active" | "inactive" | "archived";
  visibility: "public" | "members" | "admin_only";
  imageUrl?: string;
  priceCents?: number;
  currency?: string;
  priceLabel?: string;
  ctaLabel?: string;
  ctaUrl?: string;
  bookingUrl?: string;
  relatedSpaceId?: string;
  relatedEventId?: string;
  tags?: string[];
  featured?: boolean;
  sortOrder?: number;
  startsAt?: string;
  endsAt?: string;
  createdBy?: string;
  updatedBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

// Get all offers (admin)
export async function getAdminOffers(): Promise<Offer[]> {
  if (!supabase) return [];

  try {
    const { data, error } = await supabase
      .from("offers")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });

    if (error) throw error;

    return (data || []).map(mapOfferFromDb);
  } catch (err) {
    console.error("Error fetching admin offers:", err);
    return [];
  }
}

// Get active offers (public)
export async function getPublicOffers(): Promise<Offer[]> {
  if (!supabase) return [];

  try {
    const { data, error } = await supabase
      .from("offers")
      .select("*")
      .eq("status", "active")
      .in("visibility", ["public", "members"])
      .order("featured", { ascending: false })
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });

    if (error) throw error;

    return (data || []).map(mapOfferFromDb);
  } catch (err) {
    console.error("Error fetching public offers:", err);
    return [];
  }
}

// Get single offer
export async function getOffer(id: string): Promise<Offer | null> {
  if (!supabase) return null;

  try {
    const { data, error } = await supabase
      .from("offers")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;
    return data ? mapOfferFromDb(data) : null;
  } catch (err) {
    console.error("Error fetching offer:", err);
    return null;
  }
}

// Create offer
export async function createOffer(offer: Partial<Offer>): Promise<Offer | null> {
  if (!supabase) return null;

  try {
    const { data, error } = await supabase
      .from("offers")
      .insert([mapOfferToDb(offer)])
      .select()
      .single();

    if (error) throw error;
    return data ? mapOfferFromDb(data) : null;
  } catch (err) {
    console.error("Error creating offer:", err);
    return null;
  }
}

// Update offer
export async function updateOffer(id: string, offer: Partial<Offer>): Promise<Offer | null> {
  if (!supabase) return null;

  try {
    const { data, error } = await supabase
      .from("offers")
      .update({
        ...mapOfferToDb(offer),
        updated_at: new Date(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data ? mapOfferFromDb(data) : null;
  } catch (err) {
    console.error("Error updating offer:", err);
    return null;
  }
}

// Delete offer
export async function deleteOffer(id: string): Promise<boolean> {
  if (!supabase) return false;

  try {
    const { error } = await supabase.from("offers").delete().eq("id", id);

    if (error) throw error;
    return true;
  } catch (err) {
    console.error("Error deleting offer:", err);
    return false;
  }
}

// Helper functions
function mapOfferFromDb(dbOffer: any): Offer {
  return {
    id: dbOffer.id,
    title: dbOffer.title,
    slug: dbOffer.slug,
    subtitle: dbOffer.subtitle,
    description: dbOffer.description,
    shortDescription: dbOffer.short_description,
    category: dbOffer.category,
    status: dbOffer.status,
    visibility: dbOffer.visibility,
    imageUrl: dbOffer.image_url,
    priceCents: dbOffer.price_cents,
    currency: dbOffer.currency,
    priceLabel: dbOffer.price_label,
    ctaLabel: dbOffer.cta_label,
    ctaUrl: dbOffer.cta_url,
    bookingUrl: dbOffer.booking_url,
    relatedSpaceId: dbOffer.related_space_id,
    relatedEventId: dbOffer.related_event_id,
    tags: dbOffer.tags,
    featured: dbOffer.featured,
    sortOrder: dbOffer.sort_order,
    startsAt: dbOffer.starts_at,
    endsAt: dbOffer.ends_at,
    createdBy: dbOffer.created_by,
    updatedBy: dbOffer.updated_by,
    createdAt: dbOffer.created_at,
    updatedAt: dbOffer.updated_at,
  };
}

function mapOfferToDb(offer: Partial<Offer>): any {
  return {
    title: offer.title,
    slug: offer.slug,
    subtitle: offer.subtitle,
    description: offer.description,
    short_description: offer.shortDescription,
    category: offer.category,
    status: offer.status,
    visibility: offer.visibility,
    image_url: offer.imageUrl,
    price_cents: offer.priceCents,
    currency: offer.currency,
    price_label: offer.priceLabel,
    cta_label: offer.ctaLabel,
    cta_url: offer.ctaUrl,
    booking_url: offer.bookingUrl,
    related_space_id: offer.relatedSpaceId,
    related_event_id: offer.relatedEventId,
    tags: offer.tags,
    featured: offer.featured,
    sort_order: offer.sortOrder,
    starts_at: offer.startsAt,
    ends_at: offer.endsAt,
  };
}
