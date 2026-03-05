export const ACCEPTED_VIDEO_TYPES = ['video/mp4', 'video/webm'];
export const ACCEPTED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
export const ACCEPTED_GIF_TYPE = 'image/gif';
export const ALL_ACCEPTED_TYPES = [
  ...ACCEPTED_VIDEO_TYPES,
  ...ACCEPTED_IMAGE_TYPES,
  ACCEPTED_GIF_TYPE,
];
export const ACCEPT_STRING = ALL_ACCEPTED_TYPES.join(',');

export const MAX_VIDEO_SIZE_MB = 100;
export const MAX_GIF_SIZE_MB = 50;
export const MAX_IMAGE_SIZE_MB = 30;
export const MAX_DURATION_SEC = 10;
export const DEFAULT_FPS = 30;
export const MAX_FRAMES = 180;
export const SPRITESHEET_MAX_DIM = 4096;

export const CATEGORIES = [
  'All',
  'Fire',
  'Smoke',
  'Electric',
  'Magic',
  'Explosion',
  'Water',
  'UI Effects',
  'Other',
] as const;

export type Category = (typeof CATEGORIES)[number];

// Pipeline optimization constants
export const LARGE_GIF_THRESHOLD_MB = 20;
export const PRE_RESIZE_MAX_DIM = 512;
export const FRAME_EXTRACT_CONCURRENCY = 5;
export const FRAME_SAVE_CONCURRENCY = 20;

export const PRESET_TAGS = [
  'Fire', 'Smoke', 'Electric', 'Magic', 'Explosion', 'Water', 'UI Effects',
  'Loop', 'OneShot', 'Glow', 'Particle', 'Hit', 'Slash', 'Trail',
  'Shield', 'Heal', 'Buff', 'Debuff',
] as const;
