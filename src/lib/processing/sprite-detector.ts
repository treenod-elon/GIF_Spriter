import type { DetectedSprite, DetectionResult } from '@/lib/types/processing';

const ALPHA_THRESHOLD = 10;
const MIN_SPRITE_SIZE = 4;

/**
 * Detect individual sprites in a sprite sheet image using Connected Component Analysis.
 * Works by analyzing the alpha channel to find separate regions.
 */
export function detectByAlpha(
  data: Uint8ClampedArray,
  width: number,
  height: number
): DetectionResult | null {
  // Build binary mask from alpha channel
  const totalPixels = width * height;
  const mask = new Uint8Array(totalPixels);

  for (let i = 0; i < totalPixels; i++) {
    mask[i] = data[i * 4 + 3] > ALPHA_THRESHOLD ? 1 : 0;
  }

  // Connected Component Analysis using Union-Find
  const labels = new Int32Array(totalPixels).fill(-1);
  const parent = new Int32Array(totalPixels);
  for (let i = 0; i < totalPixels; i++) parent[i] = i;
  let nextLabel = 0;

  function find(x: number): number {
    while (parent[x] !== x) {
      parent[x] = parent[parent[x]];
      x = parent[x];
    }
    return x;
  }

  function union(a: number, b: number): void {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent[ra] = rb;
  }

  // First pass
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      if (mask[idx] === 0) continue;

      const left = x > 0 ? labels[idx - 1] : -1;
      const up = y > 0 ? labels[idx - width] : -1;

      if (left === -1 && up === -1) {
        labels[idx] = nextLabel++;
      } else if (left !== -1 && up === -1) {
        labels[idx] = left;
      } else if (left === -1 && up !== -1) {
        labels[idx] = up;
      } else {
        labels[idx] = left;
        if (left !== up) union(left, up);
      }
    }
  }

  // Second pass - compute bounding boxes
  const bboxes = new Map<number, { minX: number; minY: number; maxX: number; maxY: number }>();

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      if (labels[idx] === -1) continue;

      const root = find(labels[idx]);
      const box = bboxes.get(root) ?? { minX: x, minY: y, maxX: x, maxY: y };
      box.minX = Math.min(box.minX, x);
      box.minY = Math.min(box.minY, y);
      box.maxX = Math.max(box.maxX, x);
      box.maxY = Math.max(box.maxY, y);
      bboxes.set(root, box);
    }
  }

  // Filter tiny artifacts and build sprites array
  const sprites: DetectedSprite[] = [];
  for (const box of bboxes.values()) {
    const w = box.maxX - box.minX + 1;
    const h = box.maxY - box.minY + 1;
    if (w >= MIN_SPRITE_SIZE && h >= MIN_SPRITE_SIZE) {
      sprites.push({ x: box.minX, y: box.minY, width: w, height: h });
    }
  }

  if (sprites.length <= 1) return null;

  // Sort top-left to bottom-right
  const avgH = sprites.reduce((s, sp) => s + sp.height, 0) / sprites.length;
  sprites.sort((a, b) => {
    const rowA = Math.floor(a.y / avgH);
    const rowB = Math.floor(b.y / avgH);
    if (rowA !== rowB) return rowA - rowB;
    return a.x - b.x;
  });

  return { method: 'alpha', sprites, confidence: 0.85 };
}

/**
 * Detect sprites arranged in a regular grid by finding separator lines.
 */
export function detectByGrid(
  data: Uint8ClampedArray,
  width: number,
  height: number
): DetectionResult | null {
  const VARIANCE_THRESHOLD = 50;

  function rowVariance(y: number): number {
    let sum = 0;
    let sumSq = 0;
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const lum = data[idx] * 0.299 + data[idx + 1] * 0.587 + data[idx + 2] * 0.114;
      sum += lum;
      sumSq += lum * lum;
    }
    const mean = sum / width;
    return sumSq / width - mean * mean;
  }

  function colVariance(x: number): number {
    let sum = 0;
    let sumSq = 0;
    for (let y = 0; y < height; y++) {
      const idx = (y * width + x) * 4;
      const lum = data[idx] * 0.299 + data[idx + 1] * 0.587 + data[idx + 2] * 0.114;
      sum += lum;
      sumSq += lum * lum;
    }
    const mean = sum / height;
    return sumSq / height - mean * mean;
  }

  const hSeps: number[] = [];
  const vSeps: number[] = [];

  for (let y = 0; y < height; y++) {
    if (rowVariance(y) < VARIANCE_THRESHOLD) hSeps.push(y);
  }
  for (let x = 0; x < width; x++) {
    if (colVariance(x) < VARIANCE_THRESHOLD) vSeps.push(x);
  }

  const hBounds = clusterConsecutive(hSeps);
  const vBounds = clusterConsecutive(vSeps);

  if (hBounds.length < 2 || vBounds.length < 2) return null;

  const sprites: DetectedSprite[] = [];
  for (let r = 0; r < hBounds.length - 1; r++) {
    for (let c = 0; c < vBounds.length - 1; c++) {
      sprites.push({
        x: vBounds[c],
        y: hBounds[r],
        width: vBounds[c + 1] - vBounds[c],
        height: hBounds[r + 1] - hBounds[r],
      });
    }
  }

  return {
    method: 'grid',
    sprites,
    gridCols: vBounds.length - 1,
    gridRows: hBounds.length - 1,
    confidence: 0.7,
  };
}

function clusterConsecutive(sorted: number[]): number[] {
  if (sorted.length === 0) return [];
  const clusters: number[] = [sorted[0]];
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] - sorted[i - 1] > 1) {
      clusters.push(sorted[i]);
    }
  }
  return clusters;
}

/**
 * Slice a sprite sheet by manual grid configuration.
 */
export function sliceByGrid(
  width: number,
  height: number,
  rows: number,
  cols: number,
  padding = 0
): DetectedSprite[] {
  const cellW = Math.floor((width - padding * (cols - 1)) / cols);
  const cellH = Math.floor((height - padding * (rows - 1)) / rows);

  const sprites: DetectedSprite[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      sprites.push({
        x: c * (cellW + padding),
        y: r * (cellH + padding),
        width: cellW,
        height: cellH,
      });
    }
  }
  return sprites;
}
