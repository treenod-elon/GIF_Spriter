import { NextRequest, NextResponse } from 'next/server';
import sharp from '@/lib/processing/sharp-config';
import * as repo from '@/lib/storage/sprites-repo';
import { readFrame, readSpritesheet } from '@/lib/storage/file-storage';
import { removeBackground } from '@/lib/ai/background-remover';
import JSZip from 'jszip';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const targetWidth = searchParams.get('width') ? parseInt(searchParams.get('width')!) : null;
  const transparency = searchParams.get('transparency') === 'true';

  const sprite = repo.findById(id);
  if (!sprite) {
    return NextResponse.json({ error: 'Sprite not found' }, { status: 404 });
  }

  // Spritesheet download with optional bg removal + resize
  const format = searchParams.get('format');
  if (format === 'sheet') {
    const sheetBuffer = readSpritesheet(id);
    if (!sheetBuffer) {
      return NextResponse.json({ error: 'Spritesheet not found' }, { status: 404 });
    }

    let outputBuffer: Buffer | Uint8Array = sheetBuffer;

    if (transparency) {
      outputBuffer = await removeBackground(Buffer.from(outputBuffer));
    }

    const needsSheetResize = targetWidth && targetWidth !== sprite.frameWidth;
    if (needsSheetResize) {
      const sheetScale = targetWidth / sprite.frameWidth;
      const scaledWidth = Math.round(sprite.sheetWidth * sheetScale);
      const scaledHeight = Math.round(sprite.sheetHeight * sheetScale);
      outputBuffer = await sharp(outputBuffer)
        .resize(scaledWidth, scaledHeight, { fit: 'fill' })
        .png()
        .toBuffer();
    }

    return new NextResponse(new Uint8Array(outputBuffer), {
      headers: {
        'Content-Type': 'image/png',
        'Content-Disposition': `attachment; filename="${sprite.title}_spritesheet.png"`,
      },
    });
  }

  const zip = new JSZip();

  // Individual frames download
  const needsResize = targetWidth && targetWidth !== sprite.frameWidth;
  const scale = needsResize ? targetWidth / sprite.frameWidth : 1;
  const targetHeight = needsResize ? Math.round(sprite.frameHeight * scale) : sprite.frameHeight;

  for (let i = 0; i < sprite.frameCount; i++) {
    const buffer = readFrame(id, i);
    if (buffer) {
      let frameData: Buffer | Uint8Array = buffer;

      if (transparency) {
        frameData = await removeBackground(Buffer.from(frameData));
      }

      if (needsResize) {
        frameData = await sharp(frameData)
          .resize(targetWidth, targetHeight, { fit: 'fill' })
          .png()
          .toBuffer();
      }
      const filename = `${sprite.title}_frame_${String(i + 1).padStart(4, '0')}.png`;
      zip.file(filename, frameData);
    }
  }

  const zipBuffer = await zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });

  return new NextResponse(new Uint8Array(zipBuffer), {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${sprite.title}_frames.zip"`,
    },
  });
}
