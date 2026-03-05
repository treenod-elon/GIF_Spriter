import { NextRequest, NextResponse } from 'next/server';
import * as repo from '@/lib/storage/sprites-repo';
import { deleteSpriteFiles } from '@/lib/storage/file-storage';
import { normalizeTags } from '@/lib/utils/format';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const sprite = repo.findById(id);
  if (!sprite) {
    return NextResponse.json({ error: 'Sprite not found' }, { status: 404 });
  }
  return NextResponse.json(sprite);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const deleted = repo.deleteSprite(id);
  if (!deleted) {
    return NextResponse.json({ error: 'Sprite not found' }, { status: 404 });
  }
  deleteSpriteFiles(id);
  return NextResponse.json({ deleted: true });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const updates: { title?: string; category?: string; tags?: string[] } = {};

  if (body.title !== undefined) {
    if (typeof body.title !== 'string' || body.title.trim().length === 0) {
      return NextResponse.json({ error: 'Title must be a non-empty string' }, { status: 400 });
    }
    updates.title = body.title.trim();
  }

  if (body.category !== undefined) {
    if (typeof body.category !== 'string') {
      return NextResponse.json({ error: 'Category must be a string' }, { status: 400 });
    }
    updates.category = body.category;
  }

  if (body.tags !== undefined) {
    if (!Array.isArray(body.tags) || !body.tags.every((t: unknown) => typeof t === 'string')) {
      return NextResponse.json({ error: 'Tags must be an array of strings' }, { status: 400 });
    }
    updates.tags = normalizeTags(body.tags as string[]);
  }

  const updated = repo.updateSprite(id, updates);
  if (!updated) {
    return NextResponse.json({ error: 'Sprite not found' }, { status: 404 });
  }

  return NextResponse.json(updated);
}
