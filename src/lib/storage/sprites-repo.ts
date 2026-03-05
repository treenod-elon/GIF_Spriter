import { getDatabase } from './db';
import type { SpriteRecord, SpriteListItem } from '@/lib/types/sprite';

interface FindAllOptions {
  page?: number;
  limit?: number;
  search?: string;
  tags?: string[];
  sort?: 'newest' | 'name' | 'frames';
}

interface PaginatedResult {
  sprites: SpriteListItem[];
  total: number;
  page: number;
  limit: number;
}

export function findAll(options: FindAllOptions = {}): PaginatedResult {
  const db = getDatabase();
  const { page = 1, limit = 20, search, tags, sort = 'newest' } = options;
  const offset = (page - 1) * limit;

  let where = '1=1';
  const params: Record<string, unknown> = {};

  if (search) {
    where += ' AND (title LIKE @search OR tags LIKE @search)';
    params.search = `%${search}%`;
  }

  if (tags && tags.length > 0) {
    tags.forEach((tag, i) => {
      where += ` AND tags LIKE @tag${i}`;
      params[`tag${i}`] = `%"${tag}"%`;
    });
  }

  const orderBy =
    sort === 'name' ? 'title ASC'
    : sort === 'frames' ? 'frame_count DESC'
    : 'created_at DESC';

  const countStmt = db.prepare(`SELECT COUNT(*) as total FROM sprites WHERE ${where}`);
  const { total } = countStmt.get(params) as { total: number };

  const stmt = db.prepare(
    `SELECT id, title, original_filename, frame_count, frame_width, frame_height,
            fps, input_type, category, tags, created_at, original_file_size
     FROM sprites
     WHERE ${where}
     ORDER BY ${orderBy}
     LIMIT @limit OFFSET @offset`
  );

  const rows = stmt.all({ ...params, limit, offset }) as Array<Record<string, unknown>>;

  const sprites: SpriteListItem[] = rows.map((row) => ({
    id: row.id as string,
    title: row.title as string,
    originalFilename: row.original_filename as string,
    frameCount: row.frame_count as number,
    frameWidth: row.frame_width as number,
    frameHeight: row.frame_height as number,
    fps: row.fps as number,
    thumbnailUrl: `/api/sprites/${row.id}/thumbnail`,
    inputType: row.input_type as string,
    category: row.category as string,
    tags: JSON.parse((row.tags as string) || '[]'),
    createdAt: row.created_at as string,
    fileSize: row.original_file_size as number,
  }));

  return { sprites, total, page, limit };
}

export function findById(id: string): SpriteRecord | null {
  const db = getDatabase();
  const row = db
    .prepare('SELECT * FROM sprites WHERE id = ?')
    .get(id) as Record<string, unknown> | undefined;

  if (!row) return null;

  return {
    id: row.id as string,
    title: row.title as string,
    originalFilename: row.original_filename as string,
    inputType: row.input_type as 'video' | 'gif' | 'spritesheet',
    frameCount: row.frame_count as number,
    frameWidth: row.frame_width as number,
    frameHeight: row.frame_height as number,
    sheetWidth: row.sheet_width as number,
    sheetHeight: row.sheet_height as number,
    fps: row.fps as number,
    framePositions: JSON.parse(row.frame_positions as string),
    originalFileSize: row.original_file_size as number,
    category: row.category as string,
    tags: JSON.parse((row.tags as string) || '[]'),
    createdAt: row.created_at as string,
  };
}

interface CreateSpriteInput {
  id: string;
  title: string;
  originalFilename: string;
  inputType: string;
  frameCount: number;
  frameWidth: number;
  frameHeight: number;
  sheetWidth: number;
  sheetHeight: number;
  fps: number;
  framePositions: Array<{ index: number; x: number; y: number; width: number; height: number }>;
  originalFileSize: number;
  category?: string;
  tags?: string[];
}

export function create(input: CreateSpriteInput): SpriteRecord {
  const db = getDatabase();

  db.prepare(
    `INSERT INTO sprites (id, title, original_filename, input_type, frame_count,
       frame_width, frame_height, sheet_width, sheet_height, fps,
       frame_positions, original_file_size, category, tags)
     VALUES (@id, @title, @originalFilename, @inputType, @frameCount,
       @frameWidth, @frameHeight, @sheetWidth, @sheetHeight, @fps,
       @framePositions, @originalFileSize, @category, @tags)`
  ).run({
    ...input,
    framePositions: JSON.stringify(input.framePositions),
    category: input.category || 'Other',
    tags: JSON.stringify(input.tags || []),
  });

  return findById(input.id)!;
}

export function titleExists(title: string): boolean {
  const db = getDatabase();
  const row = db.prepare('SELECT 1 FROM sprites WHERE title = ? LIMIT 1').get(title);
  return !!row;
}

export function deleteSprite(id: string): boolean {
  const db = getDatabase();
  const result = db.prepare('DELETE FROM sprites WHERE id = ?').run(id);
  return result.changes > 0;
}

export function updateProcessingData(id: string, input: {
  frameCount: number;
  frameWidth: number;
  frameHeight: number;
  sheetWidth: number;
  sheetHeight: number;
  fps: number;
  framePositions: Array<{ index: number; x: number; y: number; width: number; height: number }>;
}): boolean {
  const db = getDatabase();
  const result = db.prepare(
    `UPDATE sprites SET frame_count=@frameCount, frame_width=@frameWidth, frame_height=@frameHeight,
     sheet_width=@sheetWidth, sheet_height=@sheetHeight, fps=@fps, frame_positions=@framePositions
     WHERE id=@id`
  ).run({ id, ...input, framePositions: JSON.stringify(input.framePositions) });
  return result.changes > 0;
}

export function updateSprite(id: string, input: { title?: string; category?: string; tags?: string[] }): SpriteRecord | null {
  const db = getDatabase();
  const sets: string[] = [];
  const params: Record<string, unknown> = { id };
  if (input.title !== undefined) { sets.push('title = @title'); params.title = input.title; }
  if (input.category !== undefined) { sets.push('category = @category'); params.category = input.category; }
  if (input.tags !== undefined) { sets.push('tags = @tags'); params.tags = JSON.stringify(input.tags); }
  if (sets.length === 0) return findById(id);
  const result = db.prepare(`UPDATE sprites SET ${sets.join(', ')} WHERE id = @id`).run(params);
  if (result.changes === 0) return null;
  return findById(id);
}
