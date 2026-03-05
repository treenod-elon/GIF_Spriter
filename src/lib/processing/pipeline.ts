import sharp from '@/lib/processing/sharp-config';
import { randomUUID } from 'crypto';
import * as repo from '@/lib/storage/sprites-repo';
import {
  saveSpritesheet,
  saveThumbnail,
  saveMetadata,
  saveOriginal,
  saveFrameAsync,
} from '@/lib/storage/file-storage';
import { extractGifFrames } from './gif-processor';
import { detectByAlpha, detectByGrid, sliceByGrid } from './sprite-detector';
import { normalizeFrameSizes, generateThumbnail, composeSpritesheet } from './frame-processor';
import { packFrames } from './sheet-packer';
import { analyzeSprite } from '@/lib/ai/gemini-client';
import { normalizeTags, normalizeTag } from '@/lib/utils/format';
import { processBatch } from '@/lib/utils/batch';
import { updateProgress } from './progress';
import {
  LARGE_GIF_THRESHOLD_MB,
  PRE_RESIZE_MAX_DIM,
  FRAME_SAVE_CONCURRENCY,
} from '@/lib/utils/constants';
import type { InputType } from '@/lib/types/processing';

export interface ProcessOptions {
  title?: string;
  category?: string;
  tags?: string[];
  gridRows?: number;
  gridCols?: number;
  gridPadding?: number;
}

export interface ProcessResult {
  id: string;
  title: string;
  frameCount: number;
  frameWidth: number;
  frameHeight: number;
  sheetWidth: number;
  sheetHeight: number;
  fps: number;
}

/**
 * Helper to report progress if a jobId is present.
 */
function report(
  jobId: string | undefined,
  stage: string,
  progress: number,
  detail?: string
): void {
  if (jobId) {
    updateProgress(jobId, { stage, progress, detail });
  }
}

/**
 * Main processing pipeline.
 * Detects input type and routes to the appropriate processor.
 */
export async function processUpload(
  file: File,
  options: ProcessOptions = {},
  jobId?: string
): Promise<ProcessResult> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const originalFilename = file.name;
  const id = jobId || randomUUID();

  const isGif = file.type === 'image/gif';
  const isVideo = file.type.startsWith('video/');
  const inputType: InputType = isGif ? 'gif' : isVideo ? 'video' : 'spritesheet';

  report(jobId, 'analyzing', 5, 'Starting AI analysis and frame extraction');

  // --- Run AI analysis and frame extraction/saving CONCURRENTLY ---
  const aiPromise = analyzeSprite(buffer, file.type, originalFilename);

  let extractionPromise: Promise<{
    frames: Buffer[];
    frameWidth: number;
    frameHeight: number;
    fps: number;
  }>;

  if (isGif) {
    // Large GIF pre-compression: resize before extraction
    let extractionBuffer: Buffer = buffer;
    if (buffer.length > LARGE_GIF_THRESHOLD_MB * 1024 * 1024) {
      report(jobId, 'compressing', 8, 'Pre-compressing large GIF');
      const meta = await sharp(buffer, { animated: true }).metadata();
      const w = meta.width || PRE_RESIZE_MAX_DIM;
      const h = meta.pageHeight || meta.height || PRE_RESIZE_MAX_DIM;
      if (w > PRE_RESIZE_MAX_DIM || h > PRE_RESIZE_MAX_DIM) {
        extractionBuffer = await sharp(buffer, { animated: true })
          .resize(PRE_RESIZE_MAX_DIM, PRE_RESIZE_MAX_DIM, { fit: 'inside' })
          .gif()
          .toBuffer();
      }
    }

    const gifBuffer = extractionBuffer;
    extractionPromise = extractGifFrames(
      gifBuffer,
      (completed, total) => {
        const pct = 10 + Math.round((completed / total) * 40);
        report(jobId, 'extracting', pct, `Extracted frame ${completed}/${total}`);
      }
    ).then((result) => ({
      frames: result.frames,
      frameWidth: result.width,
      frameHeight: result.height,
      fps: result.fps,
    }));
  } else if (isVideo) {
    extractionPromise = Promise.reject(
      new Error('Video processing not yet implemented. Please upload GIF or PNG.')
    );
  } else {
    // Image - try auto-detection for sprite sheets
    extractionPromise = processImage(buffer, options).then((result) => ({
      frames: result.frames,
      frameWidth: result.frameWidth,
      frameHeight: result.frameHeight,
      fps: 30,
    }));
  }

  // Save original file concurrently
  const saveOriginalPromise = (async () => {
    if (isGif) {
      saveOriginal(id, buffer, 'gif');
    } else if (isVideo) {
      const ext = file.type === 'video/webm' ? 'webm' : 'mp4';
      saveOriginal(id, buffer, ext);
    }
  })();

  const [aiResult, extraction] = await Promise.all([
    aiPromise,
    extractionPromise,
    saveOriginalPromise,
  ]).then(([ai, ext]) => [ai, ext] as const);

  let { frames } = extraction;
  let { frameWidth, frameHeight } = extraction;
  const { fps } = extraction;

  report(jobId, 'processing', 55, 'AI analysis complete, processing frames');

  let title = options.title || aiResult.title;

  // Merge user tags with AI tags (user tags first, deduplicated, case-insensitive)
  const userTags = options.tags || [];
  let mergedTags = normalizeTags([...userTags, ...aiResult.tags]);

  // Derive category: user-specified > user tag matching a category > AI category
  const CATEGORY_NAMES = ['Fire', 'Smoke', 'Electric', 'Magic', 'Explosion', 'Water', 'UI Effects', 'Other'];
  const categoryFromTags = userTags.find((t) =>
    CATEGORY_NAMES.some((c) => c.toLowerCase() === t.toLowerCase())
  );
  const category = options.category || categoryFromTags || aiResult.category;

  // Ensure at least 1 tag (use category as fallback)
  if (mergedTags.length === 0) {
    mergedTags = [normalizeTag(category)];
  }

  // Ensure unique title
  let uniqueTitle = title;
  let suffix = 1;
  while (repo.titleExists(uniqueTitle)) {
    uniqueTitle = `${title}_${String(suffix).padStart(2, '0')}`;
    suffix++;
  }
  title = uniqueTitle;

  if (frames.length === 0) {
    throw new Error('No frames extracted');
  }

  // Normalize frame sizes if they vary
  if (frames.length > 1) {
    report(jobId, 'normalizing', 60, 'Normalizing frame sizes');
    const normalized = await normalizeFrameSizes(frames);
    frames = normalized.frames;
    frameWidth = normalized.width;
    frameHeight = normalized.height;
  }

  // Save individual frames using batch processing
  report(jobId, 'saving-frames', 65, `Saving ${frames.length} frames`);
  await processBatch(
    frames,
    async (frameBuffer, index) => {
      await saveFrameAsync(id, index, frameBuffer);
    },
    {
      concurrency: FRAME_SAVE_CONCURRENCY,
      onProgress: (completed, total) => {
        const pct = 65 + Math.round((completed / total) * 10);
        report(jobId, 'saving-frames', pct, `Saved frame ${completed}/${total}`);
      },
    }
  );

  // Pack into spritesheet
  report(jobId, 'packing', 78, 'Packing spritesheet');
  const packInputs = frames.map((f, i) => ({
    index: i,
    width: frameWidth,
    height: frameHeight,
    data: f,
  }));

  const packResult = packFrames(packInputs, { layout: 'grid', padding: 0 });

  // Compose spritesheet image
  report(jobId, 'composing', 82, 'Composing spritesheet image');
  const sheetBuffer = await composeSpritesheet(
    frames,
    packResult.frames,
    packResult.width,
    packResult.height
  );
  saveSpritesheet(id, sheetBuffer);

  // Generate thumbnail
  report(jobId, 'thumbnail', 88, 'Generating thumbnail');
  const thumbBuffer = await generateThumbnail(buffer);
  saveThumbnail(id, thumbBuffer);

  // Build frame positions
  const framePositions = packResult.frames.map((pf) => ({
    index: pf.index,
    x: pf.x,
    y: pf.y,
    width: pf.width,
    height: pf.height,
  }));

  // Save metadata JSON
  report(jobId, 'metadata', 92, 'Saving metadata');
  const metadataJson = {
    format: 'gif-spriter-1.0',
    image: 'spritesheet.png',
    size: { w: packResult.width, h: packResult.height },
    frames: Object.fromEntries(
      framePositions.map((fp) => [
        `frame_${String(fp.index + 1).padStart(4, '0')}`,
        {
          frame: { x: fp.x, y: fp.y, w: fp.width, h: fp.height },
          rotated: false,
          trimmed: false,
          sourceSize: { w: frameWidth, h: frameHeight },
          duration: Math.round(1000 / fps),
        },
      ])
    ),
  };
  saveMetadata(id, metadataJson);

  // Save to database
  report(jobId, 'database', 96, 'Saving to database');
  repo.create({
    id,
    title,
    originalFilename,
    inputType,
    frameCount: frames.length,
    frameWidth,
    frameHeight,
    sheetWidth: packResult.width,
    sheetHeight: packResult.height,
    fps,
    framePositions,
    originalFileSize: file.size,
    category,
    tags: mergedTags,
  });

  report(jobId, 'complete', 100, 'Processing complete');

  return {
    id,
    title,
    frameCount: frames.length,
    frameWidth,
    frameHeight,
    sheetWidth: packResult.width,
    sheetHeight: packResult.height,
    fps,
  };
}

/**
 * Process a static image.
 * Attempts auto-detection of sprite regions, falls back to single frame.
 */
async function processImage(
  buffer: Buffer,
  options: ProcessOptions
): Promise<{ frames: Buffer[]; frameWidth: number; frameHeight: number }> {
  const img = sharp(buffer);
  const metadata = await img.metadata();
  const imgWidth = metadata.width || 128;
  const imgHeight = metadata.height || 128;

  // If manual grid is specified, use it directly
  if (options.gridRows && options.gridCols) {
    const regions = sliceByGrid(
      imgWidth,
      imgHeight,
      options.gridRows,
      options.gridCols,
      options.gridPadding || 0
    );

    const frames = await extractRegions(buffer, regions);
    const fw = regions[0]?.width || imgWidth;
    const fh = regions[0]?.height || imgHeight;
    return { frames, frameWidth: fw, frameHeight: fh };
  }

  // Try auto-detection using pixel data
  const rawBuffer = await sharp(buffer)
    .ensureAlpha()
    .raw()
    .toBuffer();

  const pixelData = new Uint8ClampedArray(rawBuffer.buffer, rawBuffer.byteOffset, rawBuffer.byteLength);

  // Try alpha-based detection first
  let detection = detectByAlpha(pixelData, imgWidth, imgHeight);

  // Fall back to grid detection
  if (!detection) {
    detection = detectByGrid(pixelData, imgWidth, imgHeight);
  }

  if (detection && detection.sprites.length > 1) {
    if (detection.method === 'alpha') {
      // Uniform frame slicing: use max bounding box size for all sprites
      const uniformRegions = computeUniformRegions(detection.sprites, imgWidth, imgHeight);
      const frames = await extractRegions(buffer, uniformRegions);
      return {
        frames,
        frameWidth: uniformRegions[0].width,
        frameHeight: uniformRegions[0].height,
      };
    }

    // Grid detection already produces uniform cells
    const frames = await extractRegions(buffer, detection.sprites);
    const fw = detection.sprites[0].width;
    const fh = detection.sprites[0].height;
    return { frames, frameWidth: fw, frameHeight: fh };
  }

  // Single image - return as-is
  const frameBuffer = await img.png().toBuffer();
  return { frames: [frameBuffer], frameWidth: imgWidth, frameHeight: imgHeight };
}

/**
 * Compute uniform extraction regions from alpha-detected sprites.
 * Instead of tight bounding boxes, all sprites get the same (maxW x maxH) size,
 * centered on each sprite's original center, clamped to image bounds.
 */
function computeUniformRegions(
  sprites: Array<{ x: number; y: number; width: number; height: number }>,
  imgWidth: number,
  imgHeight: number
): Array<{ x: number; y: number; width: number; height: number }> {
  // Find the maximum width and height across all detected sprites
  let maxW = 0;
  let maxH = 0;
  for (const sp of sprites) {
    if (sp.width > maxW) maxW = sp.width;
    if (sp.height > maxH) maxH = sp.height;
  }

  // Add a small margin (10% on each side) to avoid clipping edge effects
  const marginW = Math.round(maxW * 0.1);
  const marginH = Math.round(maxH * 0.1);
  const uniformW = Math.min(maxW + marginW * 2, imgWidth);
  const uniformH = Math.min(maxH + marginH * 2, imgHeight);

  return sprites.map((sp) => {
    // Center of the original bounding box
    const cx = sp.x + sp.width / 2;
    const cy = sp.y + sp.height / 2;

    // Place uniform rect centered on sprite center, clamped to image bounds
    let x = Math.round(cx - uniformW / 2);
    let y = Math.round(cy - uniformH / 2);
    x = Math.max(0, Math.min(x, imgWidth - uniformW));
    y = Math.max(0, Math.min(y, imgHeight - uniformH));

    return { x, y, width: uniformW, height: uniformH };
  });
}

/**
 * Extract rectangular regions from an image.
 */
async function extractRegions(
  imageBuffer: Buffer,
  regions: Array<{ x: number; y: number; width: number; height: number }>
): Promise<Buffer[]> {
  return Promise.all(
    regions.map((region) =>
      sharp(imageBuffer)
        .extract({
          left: region.x,
          top: region.y,
          width: region.width,
          height: region.height,
        })
        .png()
        .toBuffer()
    )
  );
}
