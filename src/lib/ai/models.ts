export const MODEL_OPTIONS = [
  {
    id: 'claude-opus-4-8',
    label: 'Opus 4.8',
    description: 'Most capable — best for detail-rich itineraries',
  },
  {
    id: 'claude-sonnet-5',
    label: 'Sonnet 5',
    description: 'Balanced speed and quality',
  },
  {
    id: 'claude-haiku-4-5',
    label: 'Haiku 4.5',
    description: 'Fastest and most economical',
  },
] as const;

export type ModelId = (typeof MODEL_OPTIONS)[number]['id'];

export const DEFAULT_MODEL_ID: ModelId = 'claude-opus-4-8';

const ALLOWED_MODEL_IDS = new Set<string>(MODEL_OPTIONS.map((m) => m.id));

export function isAllowedModelId(id: string | undefined | null): id is ModelId {
  return !!id && ALLOWED_MODEL_IDS.has(id);
}
