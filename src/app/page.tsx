'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { Compass, RotateCcw, Square } from 'lucide-react';
import { TripForm } from '@/components/TripForm';
import { PlanView } from '@/components/PlanView';

export default function Home() {
  const { messages, sendMessage, status, stop, setMessages, error } = useChat({
    transport: new DefaultChatTransport({ api: '/api/plan' }),
  });

  const busy = status === 'submitted' || status === 'streaming';

  const plan = (brief: string) => {
    setMessages([]); // each submission starts a fresh itinerary
    sendMessage({ text: brief });
  };

  const reset = () => {
    stop();
    setMessages([]);
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-7xl flex-col gap-6 px-4 py-8 lg:flex-row lg:py-12">
      {/* Sidebar: brief */}
      <aside className="w-full shrink-0 lg:sticky lg:top-12 lg:h-fit lg:w-96">
        <header className="mb-6 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm">
            <Compass className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              TravelPlan AI
            </h1>
            <p className="text-xs text-slate-500">
              Live web · places · flights · hotels
            </p>
          </div>
        </header>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <TripForm onPlan={plan} busy={busy} />
        </div>
      </aside>

      {/* Main: the plan */}
      <main className="min-h-[70vh] flex-1">
        <div className="flex min-h-[70vh] flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:p-10">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
              Your itinerary
            </h2>
            {(busy || messages.length > 0) && (
              <div className="flex gap-2">
                {busy && (
                  <button
                    onClick={stop}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
                  >
                    <Square className="h-3 w-3" /> Stop
                  </button>
                )}
                {!busy && messages.length > 0 && (
                  <button
                    onClick={reset}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
                  >
                    <RotateCcw className="h-3 w-3" /> Clear
                  </button>
                )}
              </div>
            )}
          </div>

          {error && (
            <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error.message ||
                'Something went wrong. Check that ANTHROPIC_API_KEY is set on the server.'}
            </div>
          )}

          <div className="flex-1">
            <PlanView messages={messages} busy={busy} />
          </div>
        </div>
      </main>
    </div>
  );
}
