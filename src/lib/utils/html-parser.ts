export interface PageCandidate {
  url: string;
  filename: string;
  altText?: string;
  contextText?: string;
}

const IMAGE_EXTENSIONS = /\.(gif|png|webp|jpe?g|apng)(\?[^"']*)?$/i;
const GIF_EXTENSION = /\.gif(\?[^"']*)?$/i;

// Extract <title> content
function extractPageTitle(html: string): string {
  const match = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  return match ? match[1].trim() : '';
}

// Resolve potentially relative URL to absolute
function resolveUrl(href: string, baseUrl: URL): string | null {
  if (!href || href.startsWith('data:') || href.startsWith('javascript:')) return null;
  try {
    return new URL(href, baseUrl.href).href;
  } catch {
    return null;
  }
}

// Extract filename from URL
function extractFilename(url: string): string {
  try {
    const pathname = new URL(url).pathname;
    const parts = pathname.split('/');
    const last = parts[parts.length - 1];
    return decodeURIComponent(last) || 'unknown';
  } catch {
    return 'unknown';
  }
}

// Extract alt text from an img tag string
function extractAlt(imgTag: string): string | undefined {
  const match = imgTag.match(/alt=["']([^"']*)["']/i);
  return match ? match[1].trim() || undefined : undefined;
}

// Get text near a position in HTML (surrounding headings, figcaptions)
function extractNearbyText(html: string, position: number): string | undefined {
  // Look within 500 chars before the tag for context
  const before = html.slice(Math.max(0, position - 500), position);

  // Check for nearby headings
  const headingMatch = before.match(/<h[1-6][^>]*>([^<]*)<\/h[1-6]>/gi);
  if (headingMatch) {
    const last = headingMatch[headingMatch.length - 1];
    const text = last.replace(/<[^>]+>/g, '').trim();
    if (text) return text;
  }

  // Check for figcaption
  const figMatch = before.match(/<figcaption[^>]*>([^<]*)<\/figcaption>/gi);
  if (figMatch) {
    const last = figMatch[figMatch.length - 1];
    const text = last.replace(/<[^>]+>/g, '').trim();
    if (text) return text;
  }

  return undefined;
}

export function parsePageForCandidates(html: string, baseUrl: URL): PageCandidate[] {
  const seen = new Set<string>();
  const candidates: PageCandidate[] = [];

  const addCandidate = (url: string, altText?: string, contextText?: string) => {
    if (seen.has(url)) return;
    if (!IMAGE_EXTENSIONS.test(url)) return;
    seen.add(url);
    candidates.push({
      url,
      filename: extractFilename(url),
      altText,
      contextText,
    });
  };

  // 1. <img src="..." /> and <img data-src="..." />
  const imgRegex = /<img\s[^>]*>/gi;
  let match;
  while ((match = imgRegex.exec(html)) !== null) {
    const tag = match[0];
    const srcMatch = tag.match(/(?:data-src|src)=["']([^"']+)["']/i);
    if (srcMatch) {
      const resolved = resolveUrl(srcMatch[1], baseUrl);
      if (resolved) {
        addCandidate(resolved, extractAlt(tag), extractNearbyText(html, match.index));
      }
    }

    // Also check srcset
    const srcsetMatch = tag.match(/srcset=["']([^"']+)["']/i);
    if (srcsetMatch) {
      const entries = srcsetMatch[1].split(',');
      for (const entry of entries) {
        const entryUrl = entry.trim().split(/\s+/)[0];
        const resolved = resolveUrl(entryUrl, baseUrl);
        if (resolved) {
          addCandidate(resolved, extractAlt(tag), extractNearbyText(html, match.index));
        }
      }
    }
  }

  // 2. <source src="..." type="image/gif">
  const sourceRegex = /<source\s[^>]*>/gi;
  while ((match = sourceRegex.exec(html)) !== null) {
    const tag = match[0];
    if (/type=["']image\/(gif|png|webp)["']/i.test(tag)) {
      const srcMatch = tag.match(/src=["']([^"']+)["']/i);
      if (srcMatch) {
        const resolved = resolveUrl(srcMatch[1], baseUrl);
        if (resolved) addCandidate(resolved, undefined, extractNearbyText(html, match.index));
      }
    }
  }

  // 3. <a href="...gif"> direct links
  const linkRegex = /<a\s[^>]*href=["']([^"']+\.gif(?:\?[^"']*)?)["'][^>]*>/gi;
  while ((match = linkRegex.exec(html)) !== null) {
    const resolved = resolveUrl(match[1], baseUrl);
    if (resolved) addCandidate(resolved, undefined, extractNearbyText(html, match.index));
  }

  // 4. <meta property="og:image">
  const ogMatch = html.match(/<meta\s[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i);
  if (ogMatch) {
    const resolved = resolveUrl(ogMatch[1], baseUrl);
    if (resolved) addCandidate(resolved);
  }

  // Sort: GIFs first, then by order found
  candidates.sort((a, b) => {
    const aGif = GIF_EXTENSION.test(a.url) ? 0 : 1;
    const bGif = GIF_EXTENSION.test(b.url) ? 0 : 1;
    return aGif - bGif;
  });

  return candidates.slice(0, 30);
}

export { extractPageTitle };
