import { GoogleGenerativeAI } from '@google/generative-ai';
import sharp from '@/lib/processing/sharp-config';

const COLOR_TOLERANCE = 30;

/**
 * Remove the background from a VFX sprite frame.
 * Uses Gemini to detect the background color, then makes it transparent with Sharp.
 * Falls back to corner-based detection if Gemini API is unavailable.
 */
export async function removeBackground(frameBuffer: Buffer): Promise<Buffer> {
  const bgColor = await detectBackgroundColor(frameBuffer);
  return makeColorTransparent(frameBuffer, bgColor, COLOR_TOLERANCE);
}

async function detectBackgroundColor(
  imageBuffer: Buffer
): Promise<{ r: number; g: number; b: number }> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (apiKey) {
    try {
      return await detectWithGemini(imageBuffer, apiKey);
    } catch {
      // Fall through to corner-based detection
    }
  }

  return detectFromCorners(imageBuffer);
}

async function detectWithGemini(
  imageBuffer: Buffer,
  apiKey: string
): Promise<{ r: number; g: number; b: number }> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  const resized = await sharp(imageBuffer)
    .resize(256, 256, { fit: 'inside', withoutEnlargement: true })
    .png()
    .toBuffer();
  const base64 = resized.toString('base64');

  const prompt = `Analyze this VFX sprite image and identify the background color. The background is the solid color behind the visual effect. Respond with ONLY the hex color code (e.g. #000000). No explanation, no markdown, just the hex code.`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  let result;
  try {
    result = await model.generateContent(
      [
        { text: prompt },
        { inlineData: { mimeType: 'image/png', data: base64 } },
      ],
      { signal: controller.signal }
    );
  } finally {
    clearTimeout(timeout);
  }

  const text = result.response.text().trim();
  const hexMatch = text.match(/#?([0-9a-fA-F]{6})/);
  if (!hexMatch) throw new Error('Invalid color response');

  const hex = hexMatch[1];
  return {
    r: parseInt(hex.substring(0, 2), 16),
    g: parseInt(hex.substring(2, 4), 16),
    b: parseInt(hex.substring(4, 6), 16),
  };
}

/**
 * Fallback: detect background color from the 4 corners of the image.
 * Decodes the image once as raw RGBA buffer and samples corners from memory.
 */
async function detectFromCorners(
  imageBuffer: Buffer
): Promise<{ r: number; g: number; b: number }> {
  const { data, info } = await sharp(imageBuffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const w = info.width;
  const h = info.height;
  const channels = 4;
  const stride = w * channels;

  const sampleSize = Math.max(2, Math.min(8, Math.floor(Math.min(w, h) / 10)));

  const corners = [
    { x: 0, y: 0 },
    { x: w - sampleSize, y: 0 },
    { x: 0, y: h - sampleSize },
    { x: w - sampleSize, y: h - sampleSize },
  ];

  const colorCounts = new Map<string, { r: number; g: number; b: number; count: number }>();

  for (const corner of corners) {
    for (let row = 0; row < sampleSize; row++) {
      for (let col = 0; col < sampleSize; col++) {
        const offset = (corner.y + row) * stride + (corner.x + col) * channels;
        const r = Math.round(data[offset] / 8) * 8;
        const g = Math.round(data[offset + 1] / 8) * 8;
        const b = Math.round(data[offset + 2] / 8) * 8;
        const key = `${r},${g},${b}`;
        const entry = colorCounts.get(key);
        if (entry) {
          entry.count++;
        } else {
          colorCounts.set(key, { r, g, b, count: 1 });
        }
      }
    }
  }

  let dominant = { r: 0, g: 0, b: 0, count: 0 };
  for (const entry of colorCounts.values()) {
    if (entry.count > dominant.count) {
      dominant = entry;
    }
  }

  return { r: dominant.r, g: dominant.g, b: dominant.b };
}

/**
 * Replace pixels matching the target color (within tolerance) with transparent.
 */
async function makeColorTransparent(
  imageBuffer: Buffer,
  color: { r: number; g: number; b: number },
  tolerance: number
): Promise<Buffer> {
  const { data, info } = await sharp(imageBuffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const pixels = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);

  for (let i = 0; i < pixels.length; i += 4) {
    const dr = pixels[i] - color.r;
    const dg = pixels[i + 1] - color.g;
    const db = pixels[i + 2] - color.b;
    const distance = Math.sqrt(dr * dr + dg * dg + db * db);

    if (distance <= tolerance) {
      pixels[i + 3] = 0; // Set alpha to 0
    }
  }

  return sharp(Buffer.from(pixels.buffer), {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .png()
    .toBuffer();
}
