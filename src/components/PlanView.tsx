'use client';

import type { UIMessage } from 'ai';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Globe, MapPin, Plane, Hotel, Search, Map, Loader2 } from 'lucide-react';

const TOOL_META: Record<string, { label: string; Icon: typeof Globe }> = {
  webSearch: { label: 'Searching the web', Icon: Globe },
  searchPlaces: { label: 'Finding places', Icon: MapPin },
  searchFlights: { label: 'Checking flights', Icon: Plane },
  searchHotels: { label: 'Checking hotels', Icon: Hotel },
};

function toolName(partType: string): string {
  return partType.replace(/^tool-/, '').replace(/^dynamic-tool$/, 'webSearch');
}

function ActivityChip({ name, done }: { name: string; done: boolean }) {
  const meta = TOOL_META[name] ?? { label: name, Icon: Search };
  const { Icon } = meta;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs ${
        done
          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
          : 'border-indigo-200 bg-indigo-50 text-indigo-700'
      }`}
    >
      {done ? <Icon className="h-3 w-3" /> : <Loader2 className="h-3 w-3 animate-spin" />}
      {meta.label}
      {done ? ' ✓' : '…'}
    </span>
  );
}

export function PlanView({
  messages,
  busy,
}: {
  messages: UIMessage[];
  busy: boolean;
}) {
  const assistantMessages = messages.filter((m) => m.role === 'assistant');

  if (assistantMessages.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-8 text-center text-slate-400">
        <Map className="mb-4 h-12 w-12 text-slate-300" />
        <p className="max-w-sm text-sm">
          Fill in your trip brief and TravelPlan AI will research live flights,
          hotels, places and the web to craft a detailed day-by-day itinerary.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {assistantMessages.map((m) => {
        const chips: React.ReactNode[] = [];
        const blocks: React.ReactNode[] = [];

        m.parts.forEach((part, i) => {
          if (part.type === 'text') {
            blocks.push(
              <article
                key={`t-${i}`}
                className="prose prose-slate prose-headings:scroll-mt-20 prose-h1:text-2xl prose-h2:mt-8 prose-h2:border-t prose-h2:border-slate-100 prose-h2:pt-6 prose-table:text-sm prose-a:text-indigo-600 max-w-none"
              >
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {part.text}
                </ReactMarkdown>
              </article>,
            );
          } else if (part.type.startsWith('tool-') || part.type === 'dynamic-tool') {
            const name = toolName(part.type);
            const state = (part as { state?: string }).state ?? '';
            const done = state === 'output-available' || state === 'output-error';
            chips.push(<ActivityChip key={`c-${i}`} name={name} done={done} />);
          }
        });

        return (
          <div key={m.id} className="space-y-4">
            {chips.length > 0 && (
              <div className="flex flex-wrap gap-2">{chips}</div>
            )}
            {blocks}
          </div>
        );
      })}

      {busy && (
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <Loader2 className="h-4 w-4 animate-spin" /> Researching and writing your plan…
        </div>
      )}
    </div>
  );
}
