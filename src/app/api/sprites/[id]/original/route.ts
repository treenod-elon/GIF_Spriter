import { NextRequest, NextResponse } from 'next/server';
import { readOriginal } from '@/lib/storage/file-storage';
import * as repo from '@/lib/storage/sprites-repo';

const MIME_TYPES: Record<string, string> = {
  gif: 'image/gif',
  mp4: 'video/mp4',
  webm: 'video/webm',
};

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const sprite = repo.findById(id);
  if (!sprite) {
    return NextResponse.json({ error: 'Sprite not found' }, { status: 404 });
  }

  const original = readOriginal(id);
  if (!original) {
    return NextResponse.json({ error: 'Original file not found' }, { status: 404 });
  }

  const contentType = MIME_TYPES[original.ext] || 'application/octet-stream';

  return new NextResponse(new Uint8Array(original.buffer), {
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
