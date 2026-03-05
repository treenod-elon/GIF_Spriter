export type InputType = 'video' | 'gif' | 'spritesheet' | 'single-image';

export type ProcessingStatus =
  | 'idle'
  | 'validating'
  | 'extracting'
  | 'packing'
  | 'uploading'
  | 'processing'
  | 'complete'
  | 'error';

export interface PipelineOptions {
  fps?: number;
  targetSize?: { width: number; height: number };
  trimAlpha?: boolean;
  padding?: number;
  powerOfTwo?: boolean;
  layout?: 'packed' | 'grid';
}

export interface PipelineResult {
  inputType: InputType;
  frames: Blob[];
  spritesheet: Blob;
  thumbnail: Blob;
  metadata: ProcessedMetadata;
}

export interface ProcessedMetadata {
  frameCount: number;
  frameWidth: number;
  frameHeight: number;
  sheetWidth: number;
  sheetHeight: number;
  framePositions: Array<{
    index: number;
    x: number;
    y: number;
    width: number;
    height: number;
  }>;
  fps: number;
  originalFilename: string;
  originalFileSize: number;
}

export interface DetectedSprite {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DetectionResult {
  method: 'alpha' | 'grid' | 'manual';
  sprites: DetectedSprite[];
  gridCols?: number;
  gridRows?: number;
  confidence: number;
}

export interface PackingOptions {
  padding?: number;
  powerOfTwo?: boolean;
  maxWidth?: number;
  maxHeight?: number;
  allowRotation?: boolean;
  layout?: 'packed' | 'grid';
  cols?: number;
}

export interface FrameData {
  index: number;
  timestamp: number;
  imageData: ImageData;
  width: number;
  height: number;
  delay?: number;
}

export interface ValidationResult {
  valid: boolean;
  type: InputType | null;
  error?: string;
  duration?: number;
  frameCount?: number;
}
