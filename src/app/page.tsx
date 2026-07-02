'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { Compass, MapPin, Calendar, Users, RotateCcw, Square } from 'lucide-react';
import { TripForm, type TripMeta } from '@/components/TripForm';
import { PlanView } from '@/components/PlanView';

const MIN_PANEL_WIDTH = 360;
const MAX_PANEL_WIDTH = 720;
const DEFAULT_PANEL_WIDTH = 480;

export default function Home() {
  const { messages, sendMessage, status, stop, setMessages, error } = useChat({
    transport: new DefaultChatTransport({ api: '/api/plan' }),
  });
  const [tripMeta, setTripMeta] = useState<TripMeta | null>(null);
  const [panelWidth, setPanelWidth] = useState(DEFAULT_PANEL_WIDTH);
  const draggingRef = useRef(false);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!draggingRef.current) return;
      setPanelWidth(Math.min(MAX_PANEL_WIDTH, Math.max(MIN_PANEL_WIDTH, e.clientX)));
    };
    const stopDragging = () => {
      draggingRef.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', stopDragging);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', stopDragging);
    };
  }, []);

  const startResize = () => {
    draggingRef.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  const busy = status === 'submitted' || status === 'streaming';

  const plan = (brief: string, meta: TripMeta) => {
    setMessages([]); // each submission starts a fresh itinerary
    setTripMeta(meta);
    sendMessage({ text: brief }, { body: { model: meta.model } });
  };

  const reset = () => {
    stop();
    setMessages([]);
    setTripMeta(null);
  };

  const heroSubtitle = tripMeta
    ? [
        tripMeta.startDate && tripMeta.endDate
          ? `${tripMeta.startDate} – ${tripMeta.endDate}`
          : null,
        tripMeta.travelers,
      ]
        .filter(Boolean)
        .join(' | ')
    : null;

  return (
    <div className="flex min-h-screen flex-col bg-cream lg:flex-row">
      {/* Sidebar: icon rail + brief */}
      <aside
        className="flex w-full shrink-0 lg:sticky lg:top-0 lg:h-screen lg:w-auto"
        style={{ '--panel-w': `${panelWidth}px` } as CSSProperties}
      >
        {/* decorative icon rail */}
        <div className="hidden flex-col items-center gap-6 bg-navy py-8 lg:flex lg:w-14">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gold text-navy">
            <Compass className="h-5 w-5" />
          </div>
          <MapPin className="h-4 w-4 text-cream/40" />
          <Calendar className="h-4 w-4 text-cream/40" />
          <Users className="h-4 w-4 text-cream/40" />
        </div>

        <div className="flex-1 bg-navy-light px-6 py-8 lg:w-[var(--panel-w)] lg:flex-none lg:overflow-y-auto lg:px-8">
          <header className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gold text-navy">
              <Compass className="h-5 w-5" />
            </div>
            <h1 className="font-serif text-lg tracking-[0.2em] text-cream">
              TRAVEL PLAN
            </h1>
          </header>
          <h1 className="mb-8 hidden font-serif text-lg tracking-[0.2em] text-cream lg:block">
            TRAVEL PLAN
          </h1>

          <TripForm onPlan={plan} onCancel={stop} busy={busy} />
        </div>

        {/* drag handle to resize the form panel */}
        <div
          role="separator"
          aria-orientation="vertical"
          onMouseDown={startResize}
          className="hidden shrink-0 lg:block lg:w-1.5 lg:cursor-col-resize lg:bg-navy/60 lg:transition-colors lg:hover:bg-gold"
        />
      </aside>

      {/* Main: the plan */}
      <main className="flex flex-1 flex-col lg:h-screen lg:overflow-y-auto">
        <div className="flex flex-1 flex-col p-4 lg:p-8">
          <div className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-navy/10 bg-white shadow-sm">
            {tripMeta && (
              <div className="relative flex h-56 flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-navy via-navy-light to-gold-dark px-6 text-center">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(201,161,90,0.35),transparent_55%)]" />
                <h2 className="relative font-serif text-3xl text-cream lg:text-4xl">
                  Your {tripMeta.destination} Odyssey
                </h2>
                {heroSubtitle && (
                  <p className="relative mt-2 text-xs uppercase tracking-[0.2em] text-cream/70">
                    {heroSubtitle}
                  </p>
                )}
              </div>
            )}

            <div className="flex flex-1 flex-col p-6 lg:p-10">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-xs font-semibold uppercase tracking-widest text-navy/40">
                  {tripMeta ? 'Itinerary' : 'Your itinerary'}
                </h2>
                {(busy || messages.length > 0) && (
                  <div className="flex gap-2">
                    {busy && (
                      <button
                        onClick={stop}
                        className="inline-flex items-center gap-1.5 rounded-md border border-navy/15 px-3 py-1.5 text-xs font-medium text-navy/70 transition hover:bg-cream-dim"
                      >
                        <Square className="h-3 w-3" /> Stop
                      </button>
                    )}
                    {!busy && messages.length > 0 && (
                      <button
                        onClick={reset}
                        className="inline-flex items-center gap-1.5 rounded-md border border-navy/15 px-3 py-1.5 text-xs font-medium text-navy/70 transition hover:bg-cream-dim"
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
          </div>
        </div>
      </main>
    </div>
  );
}
