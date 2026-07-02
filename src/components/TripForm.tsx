'use client';

import { useState } from 'react';
import {
  Loader2,
  Utensils,
  Landmark,
  Palette,
  Trees,
  Moon,
  ShoppingBag,
  Building2,
  Waves,
  Mountain,
  Flower2,
  Users,
  Footprints,
} from 'lucide-react';
import { MODEL_OPTIONS, DEFAULT_MODEL_ID, type ModelId } from '@/lib/ai/models';

const INTERESTS = [
  'Food & dining',
  'History & culture',
  'Art & museums',
  'Nature & outdoors',
  'Nightlife',
  'Shopping',
  'Architecture',
  'Beaches',
  'Adventure & sports',
  'Relaxation & wellness',
  'Family-friendly',
  'Off the beaten path',
];

const INTEREST_ICONS: Record<string, typeof Utensils> = {
  'Food & dining': Utensils,
  'History & culture': Landmark,
  'Art & museums': Palette,
  'Nature & outdoors': Trees,
  Nightlife: Moon,
  Shopping: ShoppingBag,
  Architecture: Building2,
  Beaches: Waves,
  'Adventure & sports': Mountain,
  'Relaxation & wellness': Flower2,
  'Family-friendly': Users,
  'Off the beaten path': Footprints,
};

const PACES = ['Relaxed', 'Balanced', 'Packed'] as const;
const BUDGETS = ['Budget', 'Mid-range', 'Comfortable', 'Luxury'] as const;

export type TripFormValues = {
  destination: string;
  origin: string;
  startDate: string;
  endDate: string;
  travelers: string;
  budget: (typeof BUDGETS)[number];
  pace: (typeof PACES)[number];
  interests: string[];
  notes: string;
  model: ModelId;
};

export type TripMeta = {
  destination: string;
  startDate?: string;
  endDate?: string;
  travelers: string;
  model: ModelId;
};

function buildBrief(v: TripFormValues): string {
  const lines = [
    `Destination: ${v.destination}`,
    v.origin && `Departing from: ${v.origin}`,
    v.startDate && v.endDate
      ? `Dates: ${v.startDate} to ${v.endDate}`
      : v.startDate
        ? `Start date: ${v.startDate}`
        : 'Dates: flexible (assume the next suitable season)',
    `Travelers: ${v.travelers}`,
    `Budget level: ${v.budget}`,
    `Pace: ${v.pace}`,
    v.interests.length && `Interests: ${v.interests.join(', ')}`,
    v.notes && `Additional notes: ${v.notes}`,
  ].filter(Boolean);
  return `Plan a trip with the following brief:\n\n${lines.join('\n')}`;
}

export function TripForm({
  onPlan,
  onCancel,
  busy,
}: {
  onPlan: (brief: string, meta: TripMeta) => void;
  onCancel: () => void;
  busy: boolean;
}) {
  const [v, setV] = useState<TripFormValues>({
    destination: '',
    origin: '',
    startDate: '',
    endDate: '',
    travelers: '2 adults',
    budget: 'Mid-range',
    pace: 'Balanced',
    interests: [],
    notes: '',
    model: DEFAULT_MODEL_ID,
  });

  const set = <K extends keyof TripFormValues>(k: K, val: TripFormValues[K]) =>
    setV((prev) => ({ ...prev, [k]: val }));

  const toggleInterest = (i: string) =>
    setV((prev) => ({
      ...prev,
      interests: prev.interests.includes(i)
        ? prev.interests.filter((x) => x !== i)
        : [...prev.interests, i],
    }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!v.destination.trim() || busy) return;
    onPlan(buildBrief(v), {
      destination: v.destination,
      startDate: v.startDate,
      endDate: v.endDate,
      travelers: v.travelers,
      model: v.model,
    });
  };

  const field =
    'w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-cream shadow-sm outline-none transition placeholder:text-cream/30 focus:border-gold focus:ring-2 focus:ring-gold/30';
  const label =
    'mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-cream/60';

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className={label}>Where to? *</label>
        <input
          className={field}
          placeholder="e.g. Tokyo, Japan or “Italy: Rome + Florence”"
          value={v.destination}
          onChange={(e) => set('destination', e.target.value)}
          required
        />
      </div>

      <div>
        <label className={label}>Departing from (optional)</label>
        <input
          className={field}
          placeholder="e.g. San Francisco (SFO) — enables flight pricing"
          value={v.origin}
          onChange={(e) => set('origin', e.target.value)}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={label}>Start date</label>
          <input
            type="date"
            className={`${field} [color-scheme:dark]`}
            value={v.startDate}
            onChange={(e) => set('startDate', e.target.value)}
          />
        </div>
        <div>
          <label className={label}>End date</label>
          <input
            type="date"
            className={`${field} [color-scheme:dark]`}
            value={v.endDate}
            onChange={(e) => set('endDate', e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={label}>Travelers</label>
          <input
            className={field}
            value={v.travelers}
            onChange={(e) => set('travelers', e.target.value)}
          />
        </div>
        <div>
          <label className={label}>Budget</label>
          <select
            className={`${field} [color-scheme:dark]`}
            value={v.budget}
            onChange={(e) => set('budget', e.target.value as TripFormValues['budget'])}
          >
            {BUDGETS.map((b) => (
              <option key={b}>{b}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className={label}>Pace</label>
        <div className="flex gap-2">
          {PACES.map((p) => (
            <button
              type="button"
              key={p}
              onClick={() => set('pace', p)}
              className={`flex-1 rounded-md border px-3 py-2 text-sm transition ${
                v.pace === p
                  ? 'border-gold bg-gold font-medium text-navy'
                  : 'border-white/15 bg-transparent text-cream/70 hover:border-white/30'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className={label}>AI model</label>
        <div className="flex gap-2">
          {MODEL_OPTIONS.map((m) => (
            <button
              type="button"
              key={m.id}
              disabled={!m.enabled}
              onClick={() => m.enabled && set('model', m.id)}
              title={m.enabled ? m.description : `${m.description} — coming soon`}
              className={`flex-1 rounded-md border px-3 py-2 text-sm transition ${
                !m.enabled
                  ? 'cursor-not-allowed border-white/10 bg-transparent text-cream/25'
                  : v.model === m.id
                    ? 'border-gold bg-gold font-medium text-navy'
                    : 'border-white/15 bg-transparent text-cream/70 hover:border-white/30'
              }`}
            >
              {m.label}
              {!m.enabled && (
                <span className="ml-1 text-[9px] uppercase tracking-wider">
                  Soon
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className={label}>Interests</label>
        <div className="flex flex-wrap gap-2">
          {INTERESTS.map((i) => {
            const on = v.interests.includes(i);
            const Icon = INTEREST_ICONS[i];
            return (
              <button
                type="button"
                key={i}
                onClick={() => toggleInterest(i)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition ${
                  on
                    ? 'border-gold bg-gold text-navy'
                    : 'border-white/15 bg-transparent text-cream/70 hover:border-gold/50'
                }`}
              >
                <Icon className="h-3 w-3" />
                {i}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label className={label}>Anything else?</label>
        <textarea
          className={`${field} min-h-20 resize-y`}
          placeholder="Dietary needs, mobility, must-sees, travel style, celebrating something…"
          value={v.notes}
          onChange={(e) => set('notes', e.target.value)}
        />
      </div>

      {busy ? (
        <button
          type="button"
          onClick={onCancel}
          className="flex w-full items-center justify-center gap-2 rounded-md border border-rose-400/60 bg-transparent px-4 py-3 text-xs font-semibold uppercase tracking-wider text-rose-300 shadow-sm transition hover:border-rose-400 hover:bg-rose-500/10"
        >
          <Loader2 className="h-4 w-4 animate-spin" /> Planning… (click to cancel)
        </button>
      ) : (
        <button
          type="submit"
          disabled={!v.destination.trim()}
          className="flex w-full items-center justify-center gap-2 rounded-md bg-gold px-4 py-3 text-xs font-semibold uppercase tracking-wider text-navy shadow-sm transition hover:bg-gold-dark disabled:cursor-not-allowed disabled:opacity-50"
        >
          Generate bespoke itinerary
        </button>
      )}
    </form>
  );
}
