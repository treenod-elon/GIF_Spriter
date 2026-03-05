import { NextRequest } from 'next/server';
import { subscribe } from '@/lib/processing/progress';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      const unsubscribe = subscribe(id, (update) => {
        const data = JSON.stringify(update);
        const eventType = update.stage === 'complete' ? 'complete'
          : update.stage === 'error' ? 'error'
          : 'progress';
        controller.enqueue(encoder.encode(`event: ${eventType}\ndata: ${data}\n\n`));

        if (update.stage === 'complete' || update.stage === 'error') {
          setTimeout(() => {
            try { controller.close(); } catch { /* already closed */ }
          }, 100);
        }
      });

      _request.signal.addEventListener('abort', () => {
        unsubscribe();
        try { controller.close(); } catch { /* already closed */ }
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
