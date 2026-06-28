import { tool } from 'ai';
import { z } from 'zod';
import { amadeusConfigured, amadeusGet } from '../amadeus';

/**
 * Real-time hotel offers via Amadeus. Claude supplies a city IATA code
 * (e.g. PAR, TYO). Falls back gracefully when credentials are unset.
 */
export const searchHotels = tool({
  description:
    'Search real hotels with live nightly pricing for a city and date range. ' +
    'Provide the city IATA code (e.g. PAR, TYO, NYC). Use this to ground ' +
    'lodging recommendations and the accommodation budget.',
  inputSchema: z.object({
    cityCode: z
      .string()
      .length(3)
      .describe('City IATA code, e.g. PAR for Paris, TYO for Tokyo'),
    checkInDate: z.string().describe('Check-in date, YYYY-MM-DD'),
    checkOutDate: z.string().describe('Check-out date, YYYY-MM-DD'),
    adults: z.number().int().min(1).max(9).default(2),
    radiusKm: z.number().int().min(1).max(50).default(8),
    currency: z.string().length(3).default('USD'),
  }),
  execute: async (args) => {
    if (!amadeusConfigured()) {
      return {
        configured: false,
        note: 'Hotel API not configured. Suggest lodging via web search instead.',
      };
    }

    try {
      // Step 1: find hotels in the city.
      type ByCity = { data?: Array<{ hotelId: string }> };
      const list = await amadeusGet<ByCity>(
        '/v1/reference-data/locations/hotels/by-city',
        {
          cityCode: args.cityCode.toUpperCase(),
          radius: args.radiusKm,
          radiusUnit: 'KM',
          hotelSource: 'ALL',
        },
      );

      const hotelIds = (list.data ?? []).slice(0, 25).map((h) => h.hotelId);
      if (hotelIds.length === 0) {
        return { configured: true, count: 0, hotels: [], note: 'No hotels found.' };
      }

      // Step 2: fetch live offers for those hotels.
      type Offers = {
        data?: Array<{
          hotel?: { name?: string; rating?: string; cityCode?: string };
          offers?: Array<{
            price?: { total?: string; currency?: string };
            room?: { typeEstimated?: { category?: string }; description?: { text?: string } };
          }>;
        }>;
      };

      const offers = await amadeusGet<Offers>('/v3/shopping/hotel-offers', {
        hotelIds: hotelIds.join(','),
        checkInDate: args.checkInDate,
        checkOutDate: args.checkOutDate,
        adults: args.adults,
        currency: args.currency,
        bestRateOnly: 'true',
      });

      const hotels = (offers.data ?? []).map((h) => {
        const best = h.offers?.[0];
        return {
          name: h.hotel?.name,
          stars: h.hotel?.rating,
          totalPrice: best?.price?.total,
          currency: best?.price?.currency,
          room: best?.room?.typeEstimated?.category ?? best?.room?.description?.text,
        };
      });

      return { configured: true, count: hotels.length, hotels };
    } catch (err) {
      return {
        configured: true,
        error: err instanceof Error ? err.message : 'Hotel search failed',
        hotels: [],
      };
    }
  },
});
