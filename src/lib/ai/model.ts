import { anthropic } from '@ai-sdk/anthropic';
import { DEFAULT_MODEL_ID, isAllowedModelId } from './models';

// Resolved per-call so that TRAVEL_MODEL is always read at request time,
// not at module-evaluation time where Next.js 16 may not yet have env loaded.
// `requestedModel` comes from the client's model picker; it's validated against
// the same allowlist the UI offers so an arbitrary string can't reach the
// Anthropic API. A validated selection takes priority over the server default.
export function getPlannerModel(requestedModel?: string) {
  const envModel = process.env.TRAVEL_MODEL?.trim();
  const id = isAllowedModelId(requestedModel)
    ? requestedModel
    : isAllowedModelId(envModel)
      ? envModel
      : DEFAULT_MODEL_ID;
  return anthropic(id || DEFAULT_MODEL_ID);
}
