import fs from 'fs';
import { promises as fsp } from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const SPRITES_DIR = path.join(DATA_DIR, 'sprites');

export function getSpriteDir(id: string): string {
  const dir = path.join(SPRITES_DIR, id);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function getFramesDir(id: string): string {
  const dir = path.join(getSpriteDir(id), 'frames');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function saveFrame(id: string, frameIndex: number, buffer: Buffer): void {
  const dir = getFramesDir(id);
  const filename = `frame_${String(frameIndex).padStart(4, '0')}.png`;
  fs.writeFileSync(path.join(dir, filename), buffer);
}

export function saveSpritesheet(id: string, buffer: Buffer): void {
  fs.writeFileSync(path.join(getSpriteDir(id), 'spritesheet.png'), buffer);
}

export function saveThumbnail(id: string, buffer: Buffer): void {
  fs.writeFileSync(path.join(getSpriteDir(id), 'thumbnail.png'), buffer);
}

export function saveMetadata(id: string, metadata: Record<string, unknown>): void {
  fs.writeFileSync(
    path.join(getSpriteDir(id), 'metadata.json'),
    JSON.stringify(metadata, null, 2)
  );
}

export function readFrame(id: string, frameIndex: number): Buffer | null {
  const framePath = path.join(
    getFramesDir(id),
    `frame_${String(frameIndex).padStart(4, '0')}.png`
  );
  if (!fs.existsSync(framePath)) return null;
  return fs.readFileSync(framePath);
}

export function readSpritesheet(id: string): Buffer | null {
  const p = path.join(getSpriteDir(id), 'spritesheet.png');
  if (!fs.existsSync(p)) return null;
  return fs.readFileSync(p);
}

export function readThumbnail(id: string): Buffer | null {
  const p = path.join(getSpriteDir(id), 'thumbnail.png');
  if (!fs.existsSync(p)) return null;
  return fs.readFileSync(p);
}

export function readMetadata(id: string): Record<string, unknown> | null {
  const p = path.join(getSpriteDir(id), 'metadata.json');
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, 'utf-8'));
}

export function getAllFramePaths(id: string): string[] {
  const dir = getFramesDir(id);
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.png'))
    .sort()
    .map((f) => path.join(dir, f));
}

export function saveOriginal(id: string, buffer: Buffer, ext: string): void {
  fs.writeFileSync(path.join(getSpriteDir(id), `original.${ext}`), buffer);
}

export function readOriginal(id: string): { buffer: Buffer; ext: string } | null {
  const dir = getSpriteDir(id);
  for (const ext of ['gif', 'mp4', 'webm']) {
    const p = path.join(dir, `original.${ext}`);
    if (fs.existsSync(p)) {
      return { buffer: fs.readFileSync(p), ext };
    }
  }
  return null;
}

export function deleteSpriteFiles(id: string): void {
  const dir = path.join(SPRITES_DIR, id);
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

export async function saveFrameAsync(id: string, frameIndex: number, buffer: Buffer): Promise<void> {
  const dir = getFramesDir(id);
  const filename = `frame_${String(frameIndex).padStart(4, '0')}.png`;
  await fsp.writeFile(path.join(dir, filename), buffer);
}
