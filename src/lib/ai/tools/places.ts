import { tool } from 'ai';
import { z } from 'zod';

const PRICE_LABEL: Record<string, string> = {
  PRICE_LEVEL_FREE: 'Free',
  PRICE_LEVEL_INEXPENSIVE: '$',
  PRICE_LEVEL_MODERATE: '$$',
  PRICE_LEVEL_EXPENSIVE: '$$$',
  PRICE_LEVEL_VERY_EXPENSIVE: '$$$$',
};

/**
 * Google Places (New) Text Search — real attractions, restaurants, hours,
 * ratings and geo. Falls back gracefully when GOOGLE_MAPS_API_KEY is unset.
 */
export const searchPlaces = tool({
  description:
    'Find real places (attractions, restaurants, hotels, neighborhoods) with ' +
    'current ratings, price level, opening hours and location. Use this to ' +
    'ground itinerary stops in real, verifiable venues. Make one focused query ' +
    'per need, e.g. "best vegetarian restaurants near Shibuya, Tokyo".',
  inputSchema: z.object({
    query: z
      .string()
      .describe('Natural-language place query including the city/area.'),
    maxResults: z.number().int().min(1).max(15).default(8),
  }),
  execute: async ({ query, maxResults }) => {
    const key = process.env.GOOGLE_MAPS_API_KEY;
    if (!key) {
      return {
        configured: false,
        note: 'Google Places not configured. Use web search for venues instead.',
      };
    }

    const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': key,
        'X-Goog-FieldMask': [
          'places.displayName',
          'places.formattedAddress',
          'places.rating',
          'places.userRatingCount',
          'places.priceLevel',
          'places.currentOpeningHours.openNow',
          'places.regularOpeningHours.weekdayDescriptions',
          'places.websiteUri',
          'places.googleMapsUri',
          'places.location',
          'places.editorialSummary',
          'places.primaryTypeDisplayName',
        ].join(','),
      },
      body: JSON.stringify({ textQuery: query, maxResultCount: maxResults }),
    });

    if (!res.ok) {
      return { configured: true, error: `Places error ${res.status}`, places: [] };
    }

    type PlaceApi = {
      displayName?: { text?: string };
      formattedAddress?: string;
      rating?: number;
      userRatingCount?: number;
      priceLevel?: string;
      websiteUri?: string;
      googleMapsUri?: string;
      location?: { latitude: number; longitude: number };
      editorialSummary?: { text?: string };
      primaryTypeDisplayName?: { text?: string };
      regularOpeningHours?: { weekdayDescriptions?: string[] };
    };

    const json = (await res.json()) as { places?: PlaceApi[] };
    const places = (json.places ?? []).map((p) => ({
      name: p.displayName?.text,
      type: p.primaryTypeDisplayName?.text,
      summary: p.editorialSummary?.text,
      address: p.formattedAddress,
      rating: p.rating,
      reviews: p.userRatingCount,
      price: p.priceLevel ? (PRICE_LABEL[p.priceLevel] ?? p.priceLevel) : undefined,
      hours: p.regularOpeningHours?.weekdayDescriptions,
      website: p.websiteUri,
      mapsUrl: p.googleMapsUri,
      coordinates: p.location,
    }));

    return { configured: true, count: places.length, places };
  },
});
