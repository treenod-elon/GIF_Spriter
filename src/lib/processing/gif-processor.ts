import sharp from '@/lib/processing/sharp-config';
import { processBatch } from '@/lib/utils/batch';
import { FRAME_EXTRACT_CONCURRENCY } from '@/lib/utils/constants';

export interface GifExtractionResult {
  frames: Buffer[];
  width: number;
  height: number;
  fps: number;
  frameCount: number;
}

/**
 * Extract frames from an animated GIF using Sharp.
 * Handles multi-page GIF files by extracting each page as a separate frame.
 */
export async function extractGifFrames(
  buffer: Buffer,
  onProgress?: (completed: number, total: number) => void
): Promise<GifExtractionResult> {
  const metadata = await sharp(buffer, { animated: true }).metadata();
  const pageCount = metadata.pages || 1;
  const width = metadata.width || 128;
  const height = metadata.pageHeight || metadata.height || 128;

  // Calculate FPS from delay array
  let fps = 10;
  if (metadata.delay && metadata.delay.length > 0) {
    const avgDelay = metadata.delay.reduce((a, b) => a + b, 0) / metadata.delay.length;
    fps = avgDelay > 0 ? Math.round(1000 / avgDelay) : 10;
    fps = Math.max(1, Math.min(fps, 60));
  }

  const pageIndices = Array.from({ length: pageCount }, (_, i) => i);

  const frames = await processBatch(
    pageIndices,
    async (pageIndex) => {
      return sharp(buffer, { page: pageIndex, pages: 1 })
        .png()
        .toBuffer();
    },
    {
      concurrency: FRAME_EXTRACT_CONCURRENCY,
      onProgress,
    }
  );

  return {
    frames,
    width,
    height,
    fps,
    frameCount: frames.length,
  };
}
