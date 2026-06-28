import { tool } from 'ai';
import { z } from 'zod';
import { amadeusConfigured, amadeusGet } from '../amadeus';

/**
 * Real-time flight offers via Amadeus. Claude supplies IATA codes
 * (e.g. SFO, NRT). Falls back gracefully when credentials are unset.
 */
export const searchFlights = tool({
  description:
    'Search real flight offers with live pricing between two airports. ' +
    'Provide IATA airport codes (e.g. SFO, NRT) and ISO dates. Use this to ' +
    'ground the budget and travel days of the plan in actual fares.',
  inputSchema: z.object({
    origin: z.string().length(3).describe('Origin IATA airport code, e.g. SFO'),
    destination: z
      .string()
      .length(3)
      .describe('Destination IATA airport code, e.g. NRT'),
    departureDate: z.string().describe('Departure date, YYYY-MM-DD'),
    returnDate: z
      .string()
      .optional()
      .describe('Return date YYYY-MM-DD for round trips; omit for one-way'),
    adults: z.number().int().min(1).max(9).default(1),
    travelClass: z
      .enum(['ECONOMY', 'PREMIUM_ECONOMY', 'BUSINESS', 'FIRST'])
      .optional(),
    currency: z.string().length(3).default('USD'),
  }),
  execute: async (args) => {
    if (!amadeusConfigured()) {
      return {
        configured: false,
        note: 'Flight API not configured. Estimate fares via web search instead.',
      };
    }

    try {
      type FlightApi = {
        data?: Array<{
          price?: { grandTotal?: string; currency?: string };
          numberOfBookableSeats?: number;
          itineraries?: Array<{
            duration?: string;
            segments?: Array<{
              departure?: { iataCode?: string; at?: string };
              arrival?: { iataCode?: string; at?: string };
              carrierCode?: string;
              number?: string;
            }>;
          }>;
        }>;
      };

      const json = await amadeusGet<FlightApi>('/v2/shopping/flight-offers', {
        originLocationCode: args.origin.toUpperCase(),
        destinationLocationCode: args.destination.toUpperCase(),
        departureDate: args.departureDate,
        returnDate: args.returnDate,
        adults: args.adults,
        travelClass: args.travelClass,
        currencyCode: args.currency,
        max: 6,
      });

      const offers = (json.data ?? []).map((o) => ({
        price: o.price?.grandTotal,
        currency: o.price?.currency,
        seatsLeft: o.numberOfBookableSeats,
        legs: (o.itineraries ?? []).map((it) => ({
          duration: it.duration,
          stops: Math.max((it.segments?.length ?? 1) - 1, 0),
          segments: (it.segments ?? []).map((s) => ({
            flight: `${s.carrierCode}${s.number}`,
            from: s.departure?.iataCode,
            depart: s.departure?.at,
            to: s.arrival?.iataCode,
            arrive: s.arrival?.at,
          })),
        })),
      }));

      return { configured: true, count: offers.length, offers };
    } catch (err) {
      return {
        configured: true,
        error: err instanceof Error ? err.message : 'Flight search failed',
        offers: [],
      };
    }
  },
});
