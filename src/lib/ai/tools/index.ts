import { anthropic } from '@ai-sdk/anthropic';
import { searchPlaces } from './places';
import { searchFlights } from './flights';
import { searchHotels } from './hotels';

/**
 * The full tool belt for the planning engine:
 *  - webSearch:    Anthropic's native real-time web search (no extra key)
 *  - searchPlaces: Google Places (New) for venues, hours, ratings
 *  - searchFlights / searchHotels: Amadeus live pricing
 *
 * Place/flight/hotel tools degrade gracefully to web search when their
 * API keys are not configured.
 */
export const plannerTools = {
  webSearch: anthropic.tools.webSearch_20250305({ maxUses: 8 }),
  searchPlaces,
  searchFlights,
  searchHotels,
};
