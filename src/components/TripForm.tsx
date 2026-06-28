'use client';

import { useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';

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
  busy,
}: {
  onPlan: (brief: string) => void;
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
    onPlan(buildBrief(v));
  };

  const field =
    'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200';
  const label = 'mb-1 block text-xs font-medium text-slate-600';

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
            className={field}
            value={v.startDate}
            onChange={(e) => set('startDate', e.target.value)}
          />
        </div>
        <div>
          <label className={label}>End date</label>
          <input
            type="date"
            className={field}
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
            className={field}
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
              className={`flex-1 rounded-lg border px-3 py-2 text-sm transition ${
                v.pace === p
                  ? 'border-indigo-500 bg-indigo-50 font-medium text-indigo-700'
                  : 'border-slate-300 bg-white text-slate-600 hover:border-slate-400'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className={label}>Interests</label>
        <div className="flex flex-wrap gap-2">
          {INTERESTS.map((i) => {
            const on = v.interests.includes(i);
            return (
              <button
                type="button"
                key={i}
                onClick={() => toggleInterest(i)}
                className={`rounded-full border px-3 py-1 text-xs transition ${
                  on
                    ? 'border-indigo-500 bg-indigo-500 text-white'
                    : 'border-slate-300 bg-white text-slate-600 hover:border-indigo-400'
                }`}
              >
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

      <button
        type="submit"
        disabled={busy || !v.destination.trim()}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Planning…
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4" /> Build my plan
          </>
        )}
      </button>
    </form>
  );
}
