import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { validateImportUrl, safeFetch } from '@/lib/utils/url-fetcher';
import { checkRateLimit } from '@/lib/utils/rate-limiter';
import { processUpload } from '@/lib/processing/pipeline';
import { createJob, updateProgress, removeJob } from '@/lib/processing/progress';
import {
  ALL_ACCEPTED_TYPES,
  MAX_GIF_SIZE_MB,
  MAX_IMAGE_SIZE_MB,
} from '@/lib/utils/constants';

export async function POST(request: NextRequest) {
  try {
    // Rate limit by IP
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || request.headers.get('x-real-ip')
      || 'unknown';
    const limit = checkRateLimit(`fetch:${ip}`, 20, 60_000);
    if (!limit.allowed) {
      return NextResponse.json(
        { error: `Rate limited. Try again in ${limit.retryAfter}s` },
        { status: 429 }
      );
    }

    const body = await request.json();
    const rawUrl = body?.url;
    const declaredMimeType = body?.mimeType;

    if (!rawUrl || typeof rawUrl !== 'string') {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    // Validate URL
    const validation = validateImportUrl(rawUrl);
    if (validation.error || !validation.url) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const url = validation.url;

    // Determine max bytes based on type
    const isGif = declaredMimeType === 'image/gif' || url.pathname.endsWith('.gif');
    const maxBytes = (isGif ? MAX_GIF_SIZE_MB : MAX_IMAGE_SIZE_MB) * 1024 * 1024;

    // Download the file
    let buffer: Buffer;
    try {
      buffer = await safeFetch(url, maxBytes);
    } catch (err) {
      return NextResponse.json(
        { error: `Download failed: ${err instanceof Error ? err.message : 'Unknown error'}` },
        { status: 422 }
      );
    }

    // Derive filename and mime type
    const pathname = url.pathname;
    const filename = decodeURIComponent(pathname.split('/').pop() || 'imported.gif');
    const ext = filename.split('.').pop()?.toLowerCase();

    const mimeMap: Record<string, string> = {
      gif: 'image/gif',
      png: 'image/png',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      webp: 'image/webp',
    };
    const mimeType = declaredMimeType || mimeMap[ext || ''] || 'image/gif';

    // Validate mime type
    if (!ALL_ACCEPTED_TYPES.includes(mimeType)) {
      return NextResponse.json(
        { error: `Unsupported file type: ${mimeType}` },
        { status: 400 }
      );
    }

    // Create a File object from the buffer
    const file = new File([new Uint8Array(buffer)], filename, { type: mimeType });

    // Fire-and-forget processing (same pattern as /api/upload)
    const jobId = randomUUID();
    createJob(jobId);

    processUpload(file, {}, jobId)
      .then((result) => {
        updateProgress(jobId, {
          stage: 'complete',
          progress: 100,
          result: JSON.stringify(result),
        });
      })
      .catch((err) => {
        console.error('Import processing error:', err);
        updateProgress(jobId, {
          stage: 'error',
          progress: 0,
          error: err instanceof Error ? err.message : 'Processing failed',
        });
      })
      .finally(() => {
        removeJob(jobId);
      });

    return NextResponse.json({ jobId, status: 'processing' }, { status: 202 });
  } catch (error) {
    console.error('Import fetch error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Import failed' },
      { status: 500 }
    );
  }
}
