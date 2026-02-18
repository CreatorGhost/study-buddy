import { NextRequest } from 'next/server';
import { routeToAgent } from '@/lib/agents/orchestrator';
import { streamTutorResponse } from '@/lib/agents/tutor';
import { streamDiagramResponse } from '@/lib/agents/diagram';
import { Message, Subject, AgentType } from '@/types';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const { messages, subject }: { messages: Message[]; subject: Subject } = await req.json();

  const lastMessage = messages[messages.length - 1];
  if (!lastMessage || lastMessage.role !== 'user') {
    return new Response(JSON.stringify({ error: 'No user message provided' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      function send(type: string, data: string, agent?: AgentType) {
        const event: Record<string, string> = { type, data };
        if (agent) event.agent = agent;
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      }

      try {
        // Route to the right agent
        const { agent, reason } = await routeToAgent(lastMessage.content, subject);
        send('agent_selected', reason, agent);

        // Get the streaming response from the selected agent
        let streamer: AsyncGenerator<string>;

        switch (agent) {
          case 'diagram':
            streamer = streamDiagramResponse(messages, subject);
            break;
          case 'tutor':
          default:
            streamer = streamTutorResponse(messages, subject);
            break;
        }

        for await (const chunk of streamer) {
          send('text_delta', chunk, agent);
        }

        send('done', '', agent);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        send('error', message);
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
