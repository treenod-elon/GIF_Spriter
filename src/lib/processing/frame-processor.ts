import sharp from '@/lib/processing/sharp-config';

/**
 * Trim transparent pixels around a frame.
 */
export async function trimFrame(buffer: Buffer): Promise<{
  buffer: Buffer;
  info: { width: number; height: number; offsetX: number; offsetY: number };
}> {
  const trimmed = sharp(buffer).trim();
  const result = await trimmed.toBuffer({ resolveWithObject: true });

  return {
    buffer: result.data,
    info: {
      width: result.info.width,
      height: result.info.height,
      offsetX: result.info.trimOffsetLeft ?? 0,
      offsetY: result.info.trimOffsetTop ?? 0,
    },
  };
}

/**
 * Resize a frame to the target dimensions.
 */
export async function resizeFrame(
  buffer: Buffer,
  width: number,
  height: number,
  fit: 'contain' | 'cover' | 'fill' = 'contain'
): Promise<Buffer> {
  return sharp(buffer)
    .resize(width, height, {
      fit,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
      kernel: sharp.kernel.lanczos3,
    })
    .png()
    .toBuffer();
}

/**
 * Normalize all frames to the same dimensions (max width/height among all).
 */
export async function normalizeFrameSizes(
  frames: Buffer[]
): Promise<{ frames: Buffer[]; width: number; height: number }> {
  const metadataList = await Promise.all(
    frames.map((f) => sharp(f).metadata())
  );

  const maxW = Math.max(...metadataList.map((m) => m.width || 0));
  const maxH = Math.max(...metadataList.map((m) => m.height || 0));

  const normalized = await Promise.all(
    frames.map(async (f, i) => {
      const m = metadataList[i];
      if (m.width === maxW && m.height === maxH) return f;

      return sharp({
        create: {
          width: maxW,
          height: maxH,
          channels: 4,
          background: { r: 0, g: 0, b: 0, alpha: 0 },
        },
      })
        .composite([{
          input: f,
          left: Math.floor((maxW - (m.width || 0)) / 2),
          top: Math.floor((maxH - (m.height || 0)) / 2),
        }])
        .png()
        .toBuffer();
    })
  );

  return { frames: normalized, width: maxW, height: maxH };
}

/**
 * Generate an animated preview thumbnail (first frame scaled to 280x280).
 */
export async function generateThumbnail(
  firstFrame: Buffer,
  size = 280
): Promise<Buffer> {
  return sharp(firstFrame)
    .resize(size, size, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();
}

/**
 * Compose a spritesheet from frames using pack positions.
 */
export async function composeSpritesheet(
  frames: Buffer[],
  positions: Array<{ index: number; x: number; y: number; width: number; height: number }>,
  sheetWidth: number,
  sheetHeight: number
): Promise<Buffer> {
  const composites = [];
  for (const pos of positions) {
    const frame = frames[pos.index];
    const meta = await sharp(frame).metadata();
    // Skip resize if frame already matches target dimensions
    if (meta.width === pos.width && meta.height === pos.height) {
      composites.push({ input: frame, left: pos.x, top: pos.y });
    } else {
      const resized = await sharp(frame)
        .resize(pos.width, pos.height, {
          fit: 'fill',
          background: { r: 0, g: 0, b: 0, alpha: 0 },
        })
        .png()
        .toBuffer();
      composites.push({ input: resized, left: pos.x, top: pos.y });
    }
  }

  return sharp({
    create: {
      width: sheetWidth,
      height: sheetHeight,
      channels: 4 as const,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite(composites)
    .png()
    .toBuffer();
}
