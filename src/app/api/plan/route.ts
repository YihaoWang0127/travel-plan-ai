import {
  streamText,
  stepCountIs,
  convertToModelMessages,
  type UIMessage,
} from 'ai';
import { getPlannerModel } from '@/lib/ai/model';
import { SYSTEM_PROMPT } from '@/lib/ai/prompt';
import { plannerTools } from '@/lib/ai/tools';

// Plans involve several tool round-trips and long output.
export const maxDuration = 120;

export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return new Response(
      JSON.stringify({ error: 'ANTHROPIC_API_KEY is not set on the server.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }

  const { messages }: { messages: UIMessage[] } = await req.json();

  const result = streamText({
    model: getPlannerModel(),
    system: SYSTEM_PROMPT,
    messages: await convertToModelMessages(messages),
    tools: plannerTools,
    // Allow the model to research across multiple tool calls before writing.
    stopWhen: stepCountIs(12),
  });

  return result.toUIMessageStreamResponse();
}
