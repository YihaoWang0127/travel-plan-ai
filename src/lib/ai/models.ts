export const PLANNER_MODELS = [
  { id: 'claude-sonnet-4-6', label: 'Sonnet 4.6', enabled: true },
  { id: 'claude-opus-4-8', label: 'Opus 4.8 (coming soon)', enabled: false },
] as const;

export const DEFAULT_MODEL_ID = PLANNER_MODELS[0].id;
