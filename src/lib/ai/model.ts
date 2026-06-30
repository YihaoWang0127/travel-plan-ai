import { anthropic } from '@ai-sdk/anthropic';
import { PLANNER_MODELS, DEFAULT_MODEL_ID } from './models';

function isAllowedModelId(id: string | undefined): id is string {
  return !!id && PLANNER_MODELS.some((m) => m.id === id && m.enabled);
}

// Resolved per-call so that TRAVEL_MODEL is always read at request time,
// not at module-evaluation time where Next.js 16 may not yet have env loaded.
// modelId is client-controlled input, so it must be checked against the
// PLANNER_MODELS allowlist before ever reaching anthropic().
export function getPlannerModel(modelId?: string) {
  if (isAllowedModelId(modelId)) {
    return anthropic(modelId);
  }

  const envId = process.env.TRAVEL_MODEL?.trim();
  if (isAllowedModelId(envId)) {
    return anthropic(envId);
  }

  return anthropic(DEFAULT_MODEL_ID);
}
