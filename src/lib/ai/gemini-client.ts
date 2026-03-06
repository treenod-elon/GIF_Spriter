import { GoogleGenerativeAI } from '@google/generative-ai';
import sharp from '@/lib/processing/sharp-config';

const VALID_CATEGORIES = [
  'Fire', 'Smoke', 'Electric', 'Magic', 'Explosion', 'Water', 'UI Effects', 'Other',
] as const;

interface AnalysisResult {
  title: string;
  tags: string[];
  category: string;
}

export interface PageCandidate {
  url: string;
  filename: string;
  altText?: string;
  contextText?: string;
}

export interface RankedCandidate extends PageCandidate {
  aiScore: number;
  aiReason: string;
}

export async function analyzeSprite(
  imageBuffer: Buffer,
  mimeType: string,
  fallbackName: string
): Promise<AnalysisResult> {
  const apiKey = process.env.GEMINI_API_KEY;

  // Video buffers cannot be processed by Sharp — use fallback
  const isVideo = mimeType.startsWith('video/');
  if (!apiKey || isVideo) {
    return buildFallback(fallbackName);
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const resized = await sharp(imageBuffer)
      .resize(512, 512, { fit: 'inside', withoutEnlargement: true })
      .png()
      .toBuffer();
    const base64 = resized.toString('base64');

    const prompt = `You are a VFX sprite asset analyst. Analyze this game VFX sprite image and respond ONLY with a JSON object (no markdown, no code blocks, no explanation):

{
  "title": "a unique descriptive english snake_case name for this sprite (e.g. blue_fire_burst_01)",
  "tags": ["5 to 10 lowercase english search tags describing the visual effect"],
  "category": "one of: Fire, Smoke, Electric, Magic, Explosion, Water, UI Effects, Other"
}

Rules:
- title must be snake_case, lowercase, descriptive, 2-5 words
- tags must be lowercase single words, 5-10 tags
- category must be exactly one of the listed options`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    let result;
    try {
      result = await model.generateContent(
        [
          { text: prompt },
          {
            inlineData: {
              mimeType: 'image/png',
              data: base64,
            },
          },
        ],
        { signal: controller.signal }
      );
    } finally {
      clearTimeout(timeout);
    }

    const text = result.response.text();
    const parsed = extractJson(text);

    if (!parsed || !parsed.title || !Array.isArray(parsed.tags)) {
      return buildFallback(fallbackName);
    }

    // Validate and sanitize
    const title = String(parsed.title)
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');

    const tags = parsed.tags
      .map((t: unknown) => String(t).toLowerCase().replace(/[^a-z0-9 ]/g, '').trim())
      .filter((t: string) => t.length > 0)
      .slice(0, 10);

    const rawCategory = String(parsed.category || '');
    const category = VALID_CATEGORIES.includes(rawCategory as typeof VALID_CATEGORIES[number])
      ? rawCategory
      : 'Other';

    return { title: title || buildFallback(fallbackName).title, tags, category };
  } catch {
    return buildFallback(fallbackName);
  }
}

function extractJson(text: string): Record<string, unknown> | null {
  // Try parsing directly first
  try {
    return JSON.parse(text);
  } catch {
    // Try extracting from markdown code block
    const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      try {
        return JSON.parse(codeBlockMatch[1].trim());
      } catch {
        return null;
      }
    }

    // Try finding JSON object in text
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch {
        return null;
      }
    }

    return null;
  }
}

const VFX_TAG_WORDS = new Set([
  'fire', 'smoke', 'electric', 'magic', 'explosion', 'water',
  'loop', 'glow', 'particle', 'hit', 'slash', 'trail',
  'shield', 'heal', 'buff', 'debuff', 'burst', 'flame',
  'lightning', 'beam', 'impact', 'blast', 'spark', 'wave',
  'effect', 'anim', 'sprite', 'vfx',
]);

const WORD_TO_CATEGORY: Record<string, string> = {
  fire: 'Fire', flame: 'Fire',
  smoke: 'Smoke',
  electric: 'Electric', lightning: 'Electric', spark: 'Electric',
  magic: 'Magic', heal: 'Magic', buff: 'Magic', debuff: 'Magic', shield: 'Magic',
  explosion: 'Explosion', blast: 'Explosion', burst: 'Explosion', impact: 'Explosion',
  water: 'Water', wave: 'Water',
};

function buildFallback(filename: string): AnalysisResult {
  const title = filename
    .replace(/\.[^.]+$/, '')
    .replace(/[^a-zA-Z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .toLowerCase();

  // Extract tags from filename words matched against known VFX keywords
  const words = (title || 'untitled_sprite').split('_').filter((w) => w.length > 1);
  const tags = words.filter((w) => VFX_TAG_WORDS.has(w));

  // Derive category from matched words
  let category = 'Other';
  for (const w of words) {
    if (WORD_TO_CATEGORY[w]) {
      category = WORD_TO_CATEGORY[w];
      break;
    }
  }

  return { title: title || 'untitled_sprite', tags, category };
}

// --- Page analysis for URL import ---

const VFX_KEYWORDS = [
  'vfx', 'effect', 'sprite', 'anim', 'particle', 'explosion', 'fire', 'smoke',
  'magic', 'electric', 'lightning', 'slash', 'hit', 'impact', 'trail', 'glow',
  'burst', 'blast', 'flame', 'beam', 'shield', 'heal', 'buff',
];

function heuristicScore(candidate: PageCandidate): RankedCandidate {
  let score = 0;
  const lower = (candidate.filename + ' ' + (candidate.altText || '') + ' ' + (candidate.contextText || '')).toLowerCase();

  // GIF extension is a strong signal
  if (/\.gif/i.test(candidate.url)) score += 0.5;

  // VFX-related keywords
  let keywordBonus = 0;
  for (const kw of VFX_KEYWORDS) {
    if (lower.includes(kw)) keywordBonus += 0.1;
  }
  score += Math.min(keywordBonus, 0.4);

  // Penalize common non-sprite patterns
  if (/logo|icon|avatar|banner|favicon|thumb/i.test(candidate.filename)) score -= 0.3;

  return {
    ...candidate,
    aiScore: Math.max(0, Math.min(1, score)),
    aiReason: 'Scored by filename heuristic (no API key)',
  };
}

export async function analyzePageForGifs(
  candidates: PageCandidate[],
  pageTitle: string,
  pageUrl: string
): Promise<RankedCandidate[]> {
  if (candidates.length === 0) return [];

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return candidates.map(heuristicScore);
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const prompt = `You are a VFX sprite asset curator. Rank these image URLs by likelihood of being animated GIF or PNG sprite sheets for game visual effects (VFX).

Page title: "${pageTitle}"
Page URL: "${pageUrl}"

Candidates:
${JSON.stringify(candidates.map((c) => ({
  url: c.url,
  filename: c.filename,
  altText: c.altText,
  context: c.contextText,
})), null, 2)}

Respond ONLY with a JSON array (no markdown, no code blocks):
[{ "url": "<same url>", "score": <0.0-1.0>, "reason": "<one sentence>" }]

Score guidelines:
- 1.0: .gif file with VFX-related filename/context (fire, explosion, smoke, magic)
- 0.8: .gif file with game-related context
- 0.6: animated image format without clear VFX context
- 0.4: static image with sprite-sheet naming convention
- 0.2: generic image with no clear VFX connection
- 0.0: clearly irrelevant (logo, avatar, banner, favicon, thumbnail)`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    let result;
    try {
      result = await model.generateContent([{ text: prompt }], { signal: controller.signal });
    } finally {
      clearTimeout(timeout);
    }

    const text = result.response.text();
    const parsed = extractJsonArray(text);

    if (!parsed) {
      return candidates.map(heuristicScore);
    }

    // Map AI results back to candidates
    const scoreMap = new Map<string, { score: number; reason: string }>();
    for (const item of parsed as Array<{ url?: string; score?: number; reason?: string }>) {
      if (item.url && typeof item.score === 'number') {
        scoreMap.set(item.url, {
          score: Math.max(0, Math.min(1, item.score)),
          reason: String(item.reason || ''),
        });
      }
    }

    return candidates.map((c) => {
      const ai = scoreMap.get(c.url);
      if (ai) {
        return { ...c, aiScore: ai.score, aiReason: ai.reason };
      }
      return heuristicScore(c);
    });
  } catch {
    return candidates.map(heuristicScore);
  }
}

// Override extractJson to also handle arrays
function extractJsonArray(text: string): unknown[] | null {
  try {
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      try {
        const parsed = JSON.parse(codeBlockMatch[1].trim());
        return Array.isArray(parsed) ? parsed : null;
      } catch { /* fall through */ }
    }

    const arrayMatch = text.match(/\[[\s\S]*\]/);
    if (arrayMatch) {
      try {
        const parsed = JSON.parse(arrayMatch[0]);
        return Array.isArray(parsed) ? parsed : null;
      } catch { /* fall through */ }
    }

    return null;
  }
}
