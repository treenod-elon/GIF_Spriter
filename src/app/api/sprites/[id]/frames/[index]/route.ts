import { NextRequest, NextResponse } from 'next/server';
import { readFrame } from '@/lib/storage/file-storage';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; index: string }> }
) {
  const { id, index } = await params;
  const frameIndex = parseInt(index);

  if (isNaN(frameIndex) || frameIndex < 0) {
    return NextResponse.json({ error: 'Invalid frame index' }, { status: 400 });
  }

  const buffer = readFrame(id, frameIndex);
  if (!buffer) {
    return NextResponse.json({ error: 'Frame not found' }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
