const BLOCKED_HOSTNAME_PATTERNS = [
  /^localhost$/i,
  /^127\./,
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^169\.254\./,
  /^0\.0\.0\.0$/,
  /^::1$/,
  /^\[::1\]$/,
];

const ALLOWED_SCHEMES = ['http:', 'https:'];
const MAX_URL_LENGTH = 2048;
const DEFAULT_USER_AGENT = 'VFX-Spriter/1.0 (URL Import)';

export function validateImportUrl(rawUrl: string): { url?: URL; error?: string } {
  if (!rawUrl || rawUrl.length > MAX_URL_LENGTH) {
    return { error: 'URL is empty or too long (max 2048 characters)' };
  }

  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return { error: 'Invalid URL format' };
  }

  if (!ALLOWED_SCHEMES.includes(url.protocol)) {
    return { error: 'Only HTTP and HTTPS URLs are allowed' };
  }

  const hostname = url.hostname;
  if (BLOCKED_HOSTNAME_PATTERNS.some((p) => p.test(hostname))) {
    return { error: 'Access to local/private addresses is not allowed' };
  }

  return { url };
}

export async function safeHead(url: URL, timeoutMs = 5000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url.href, {
      method: 'HEAD',
      signal: controller.signal,
      headers: { 'User-Agent': DEFAULT_USER_AGENT },
      redirect: 'follow',
    });

    // Re-validate final URL after redirects
    const finalUrl = new URL(res.url);
    const finalHostname = finalUrl.hostname;
    if (BLOCKED_HOSTNAME_PATTERNS.some((p) => p.test(finalHostname))) {
      throw new Error('Redirect to local/private address blocked');
    }

    return res;
  } finally {
    clearTimeout(timer);
  }
}

export async function safeFetch(
  url: URL,
  maxBytes: number,
  timeoutMs = 30000
): Promise<Buffer> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url.href, {
      signal: controller.signal,
      headers: { 'User-Agent': DEFAULT_USER_AGENT },
      redirect: 'follow',
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }

    // Re-validate final URL after redirects
    const finalUrl = new URL(res.url);
    if (BLOCKED_HOSTNAME_PATTERNS.some((p) => p.test(finalUrl.hostname))) {
      throw new Error('Redirect to local/private address blocked');
    }

    // Check Content-Length header if available
    const contentLength = res.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > maxBytes) {
      throw new Error(`File too large: ${Math.round(parseInt(contentLength) / 1024 / 1024)}MB exceeds limit`);
    }

    // Stream and enforce byte limit
    const reader = res.body?.getReader();
    if (!reader) throw new Error('No response body');

    const chunks: Uint8Array[] = [];
    let totalBytes = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      totalBytes += value.byteLength;
      if (totalBytes > maxBytes) {
        reader.cancel();
        throw new Error(`Download exceeded ${Math.round(maxBytes / 1024 / 1024)}MB limit`);
      }

      chunks.push(value);
    }

    return Buffer.concat(chunks);
  } finally {
    clearTimeout(timer);
  }
}

export async function safeGetHtml(url: URL, maxBytes = 2 * 1024 * 1024): Promise<string> {
  const buffer = await safeFetch(url, maxBytes, 15000);
  return buffer.toString('utf-8');
}
