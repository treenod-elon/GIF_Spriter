import { NextRequest, NextResponse } from 'next/server';
import * as repo from '@/lib/storage/sprites-repo';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const result = repo.findAll({
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '20'),
      search: searchParams.get('search') || undefined,
      tags: searchParams.get('tags')
        ? searchParams.get('tags')!.split(',').filter(Boolean)
        : undefined,
      sort: (searchParams.get('sort') as 'newest' | 'name' | 'frames') || 'newest',
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('GET /api/sprites error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
