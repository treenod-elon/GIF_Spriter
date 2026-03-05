export interface SpriteRecord {
  id: string;
  title: string;
  originalFilename: string;
  inputType: 'video' | 'gif' | 'spritesheet';
  frameCount: number;
  frameWidth: number;
  frameHeight: number;
  sheetWidth: number;
  sheetHeight: number;
  fps: number;
  framePositions: FramePosition[];
  originalFileSize: number;
  category: string;
  tags: string[];
  createdAt: string;
}

export interface FramePosition {
  index: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SpriteListItem {
  id: string;
  title: string;
  originalFilename: string;
  frameCount: number;
  frameWidth: number;
  frameHeight: number;
  fps: number;
  thumbnailUrl: string;
  inputType: string;
  category: string;
  tags: string[];
  createdAt: string;
  fileSize: number;
}

export interface SpriteMetadata {
  format: string;
  image: string;
  size: { w: number; h: number };
  frames: Record<string, FrameMeta>;
}

export interface FrameMeta {
  frame: { x: number; y: number; w: number; h: number };
  rotated: boolean;
  trimmed: boolean;
  sourceSize: { w: number; h: number };
  duration: number;
}
