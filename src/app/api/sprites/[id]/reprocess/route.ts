import '@/lib/processing/sharp-config';

import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import * as repo from '@/lib/storage/sprites-repo';
import {
  readOriginal,
  getFramesDir,
  saveFrame,
  saveSpritesheet,
  saveThumbnail,
  saveMetadata,
} from '@/lib/storage/file-storage';
import { extractGifFrames } from '@/lib/processing/gif-processor';
import { normalizeFrameSizes, generateThumbnail, composeSpritesheet } from '@/lib/processing/frame-processor';
import { packFrames } from '@/lib/processing/sheet-packer';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Verify sprite exists
  const sprite = repo.findById(id);
  if (!sprite) {
    return NextResponse.json({ error: 'Sprite not found' }, { status: 404 });
  }

  // Read original file
  const original = readOriginal(id);
  if (!original) {
    return NextResponse.json({ error: 'Original file not found on disk' }, { status: 404 });
  }

  // Only support GIF for now
  if (original.ext !== 'gif') {
    return NextResponse.json(
      { error: 'Re-processing is currently only supported for GIF files' },
      { status: 400 }
    );
  }

  try {
    // Re-extract frames
    const result = await extractGifFrames(original.buffer);
    let frames = result.frames;
    let frameWidth = result.width;
    let frameHeight = result.height;
    const fps = result.fps;

    // Normalize frame sizes if they vary
    if (frames.length > 1) {
      const normalized = await normalizeFrameSizes(frames);
      frames = normalized.frames;
      frameWidth = normalized.width;
      frameHeight = normalized.height;
    }

    // Clear old frame files from disk
    const framesDir = getFramesDir(id);
    const existingFiles = fs.readdirSync(framesDir);
    for (const file of existingFiles) {
      fs.unlinkSync(`${framesDir}/${file}`);
    }

    // Save new frames
    for (let i = 0; i < frames.length; i++) {
      saveFrame(id, i, frames[i]);
    }

    // Re-pack spritesheet
    const packInputs = frames.map((f, i) => ({
      index: i,
      width: frameWidth,
      height: frameHeight,
      data: f,
    }));
    const packResult = packFrames(packInputs, { layout: 'grid', padding: 0 });

    // Compose spritesheet image
    const sheetBuffer = await composeSpritesheet(
      frames,
      packResult.frames,
      packResult.width,
      packResult.height
    );
    saveSpritesheet(id, sheetBuffer);

    // Re-generate thumbnail from first frame
    const thumbBuffer = await generateThumbnail(frames[0]);
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

    // Update DB
    repo.updateProcessingData(id, {
      frameCount: frames.length,
      frameWidth,
      frameHeight,
      sheetWidth: packResult.width,
      sheetHeight: packResult.height,
      fps,
      framePositions,
    });

    // Return updated sprite info
    const updated = repo.findById(id);
    return NextResponse.json(updated);
  } catch (err) {
    console.error('Re-processing failed:', err);
    return NextResponse.json(
      { error: 'Re-processing failed', details: String(err) },
      { status: 500 }
    );
  }
}
