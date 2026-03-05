import { NextRequest, NextResponse } from 'next/server';
import { readThumbnail } from '@/lib/storage/file-storage';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const buffer = readThumbnail(id);

  if (!buffer) {
    return NextResponse.json({ error: 'Thumbnail not found' }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
