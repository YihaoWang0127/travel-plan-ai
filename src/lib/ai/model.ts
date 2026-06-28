import { anthropic } from '@ai-sdk/anthropic';

const DEFAULT_MODEL = 'claude-opus-4-8';

// Resolved per-call so that TRAVEL_MODEL is always read at request time,
// not at module-evaluation time where Next.js 16 may not yet have env loaded.
export function getPlannerModel() {
  const id = process.env.TRAVEL_MODEL?.trim() || DEFAULT_MODEL;
  return anthropic(id || DEFAULT_MODEL);
}
