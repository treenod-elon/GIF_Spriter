import { NextRequest, NextResponse } from 'next/server';
import { validateImportUrl, safeHead, safeGetHtml } from '@/lib/utils/url-fetcher';
import { checkRateLimit } from '@/lib/utils/rate-limiter';
import { parsePageForCandidates, extractPageTitle } from '@/lib/utils/html-parser';
import { analyzePageForGifs } from '@/lib/ai/gemini-client';
import { ALL_ACCEPTED_TYPES } from '@/lib/utils/constants';

const IMAGE_CONTENT_TYPES = [
  'image/gif', 'image/png', 'image/jpeg', 'image/webp', 'image/apng',
];

export async function POST(request: NextRequest) {
  try {
    // Rate limit by IP
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || request.headers.get('x-real-ip')
      || 'unknown';
    const limit = checkRateLimit(`analyze:${ip}`, 10, 60_000);
    if (!limit.allowed) {
      return NextResponse.json(
        { error: `Rate limited. Try again in ${limit.retryAfter}s` },
        { status: 429 }
      );
    }

    const body = await request.json();
    const rawUrl = body?.url;

    if (!rawUrl || typeof rawUrl !== 'string') {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    // Validate URL (SSRF protection)
    const validation = validateImportUrl(rawUrl);
    if (validation.error || !validation.url) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const url = validation.url;

    // HEAD request to determine content type
    let headRes: Response;
    try {
      headRes = await safeHead(url);
    } catch (err) {
      return NextResponse.json(
        { error: `Cannot reach URL: ${err instanceof Error ? err.message : 'Unknown error'}` },
        { status: 422 }
      );
    }

    const contentType = headRes.headers.get('content-type')?.split(';')[0]?.trim().toLowerCase() || '';
    const contentLength = headRes.headers.get('content-length');

    // Direct image URL
    if (IMAGE_CONTENT_TYPES.some((t) => contentType.startsWith(t))) {
      // Check if it's an accepted type for our pipeline
      if (!ALL_ACCEPTED_TYPES.includes(contentType)) {
        return NextResponse.json(
          { error: `Unsupported image type: ${contentType}` },
          { status: 400 }
        );
      }

      const filename = decodeURIComponent(url.pathname.split('/').pop() || 'image.gif');

      return NextResponse.json({
        mode: 'direct',
        candidate: {
          url: url.href,
          mimeType: contentType,
          fileSize: contentLength ? parseInt(contentLength) : null,
          filename,
        },
      });
    }

    // HTML page — parse for images
    if (contentType.startsWith('text/html') || contentType === '') {
      let html: string;
      try {
        html = await safeGetHtml(url);
      } catch (err) {
        return NextResponse.json(
          { error: `Failed to fetch page: ${err instanceof Error ? err.message : 'Unknown error'}` },
          { status: 422 }
        );
      }

      const pageTitle = extractPageTitle(html);
      const candidates = parsePageForCandidates(html, url);

      if (candidates.length === 0) {
        return NextResponse.json({
          mode: 'page',
          pageTitle,
          candidates: [],
        });
      }

      // AI scoring
      const ranked = await analyzePageForGifs(candidates, pageTitle, url.href);

      return NextResponse.json({
        mode: 'page',
        pageTitle,
        candidates: ranked,
      });
    }

    return NextResponse.json(
      { error: `Unsupported content type: ${contentType}` },
      { status: 400 }
    );
  } catch (error) {
    console.error('Import analyze error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Analysis failed' },
      { status: 500 }
    );
  }
}
