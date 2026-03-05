import { MaxRectsPacker } from 'maxrects-packer';
import type { PackingOptions } from '@/lib/types/processing';

interface PackInput {
  index: number;
  width: number;
  height: number;
  data: Buffer;
}

export interface PackedFrame {
  index: number;
  x: number;
  y: number;
  width: number;
  height: number;
  rotated: boolean;
}

export interface PackResult {
  width: number;
  height: number;
  frames: PackedFrame[];
}

function nextPowerOfTwo(n: number): number {
  let p = 1;
  while (p < n) p <<= 1;
  return p;
}

export function packFrames(
  inputs: PackInput[],
  options: PackingOptions = {}
): PackResult {
  const {
    padding = 0,
    maxWidth = 4096,
    maxHeight = 4096,
    allowRotation = false,
    layout = 'grid',
  } = options;

  if (layout === 'grid') {
    return packGrid(inputs, padding, options.cols);
  }

  // MaxRects bin packing
  const packer = new MaxRectsPacker(maxWidth, maxHeight, padding, {
    smart: true,
    pot: options.powerOfTwo ?? false,
    square: false,
    allowRotation,
  });

  // Use add() method for each rect
  for (const inp of inputs) {
    packer.add(inp.width, inp.height, { index: inp.index });
  }

  if (packer.bins.length === 0) {
    return packGrid(inputs, padding);
  }

  const bin = packer.bins[0];
  let sheetW = bin.width;
  let sheetH = bin.height;

  if (options.powerOfTwo) {
    sheetW = nextPowerOfTwo(sheetW);
    sheetH = nextPowerOfTwo(sheetH);
  }

  const frames: PackedFrame[] = bin.rects.map((rect) => ({
    index: (rect.data as { index: number }).index,
    x: rect.x,
    y: rect.y,
    width: rect.width,
    height: rect.height,
    rotated: rect.rot ?? false,
  }));

  // Sort by original index
  frames.sort((a, b) => a.index - b.index);

  return { width: sheetW, height: sheetH, frames };
}

export function packGrid(inputs: PackInput[], padding: number, cols?: number): PackResult {
  if (inputs.length === 0) {
    return { width: 0, height: 0, frames: [] };
  }

  const maxW = Math.max(...inputs.map((i) => i.width));
  const maxH = Math.max(...inputs.map((i) => i.height));

  const n = cols || Math.max(2, Math.ceil(Math.sqrt(inputs.length)));
  const rows = Math.ceil(inputs.length / n);

  const cellW = maxW + padding;
  const cellH = maxH + padding;

  const frames: PackedFrame[] = inputs.map((inp, idx) => ({
    index: inp.index,
    x: (idx % n) * cellW,
    y: Math.floor(idx / n) * cellH,
    width: inp.width,
    height: inp.height,
    rotated: false,
  }));

  return {
    width: n * cellW - padding,
    height: rows * cellH - padding,
    frames,
  };
}
