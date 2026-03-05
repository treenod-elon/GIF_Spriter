'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Grid3x3, RotateCcw } from 'lucide-react';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';

interface ManualGridEditorProps {
  open: boolean;
  onClose: () => void;
  imageUrl: string;
  imageWidth: number;
  imageHeight: number;
  onConfirm: (rows: number, cols: number, padding: number) => void;
}

export default function ManualGridEditor({
  open,
  onClose,
  imageUrl,
  imageWidth,
  imageHeight,
  onConfirm,
}: ManualGridEditorProps) {
  const [rows, setRows] = useState(4);
  const [cols, setCols] = useState(4);
  const [padding, setPadding] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const drawGrid = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Scale to fit canvas
    const maxW = 480;
    const maxH = 360;
    const scale = Math.min(maxW / imageWidth, maxH / imageHeight);
    const dispW = Math.round(imageWidth * scale);
    const dispH = Math.round(imageHeight * scale);

    canvas.width = dispW;
    canvas.height = dispH;

    ctx.clearRect(0, 0, dispW, dispH);
    ctx.drawImage(img, 0, 0, dispW, dispH);

    // Draw grid lines
    ctx.strokeStyle = 'rgba(110, 86, 255, 0.7)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);

    const cellW = (dispW - padding * scale * (cols - 1)) / cols;
    const cellH = (dispH - padding * scale * (rows - 1)) / rows;

    // Vertical lines
    for (let c = 1; c < cols; c++) {
      const x = c * (cellW + padding * scale);
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, dispH);
      ctx.stroke();
    }

    // Horizontal lines
    for (let r = 1; r < rows; r++) {
      const y = r * (cellH + padding * scale);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(dispW, y);
      ctx.stroke();
    }

    ctx.setLineDash([]);

    // Draw cell labels
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = c * (cellW + padding * scale) + cellW / 2;
        const y = r * (cellH + padding * scale) + cellH / 2;
        ctx.fillText(`${r * cols + c + 1}`, x, y);
      }
    }
  }, [rows, cols, padding, imageWidth, imageHeight]);

  useEffect(() => {
    if (!open) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imgRef.current = img;
      drawGrid();
    };
    img.src = imageUrl;
  }, [open, imageUrl, drawGrid]);

  useEffect(() => {
    drawGrid();
  }, [drawGrid]);

  const cellW = Math.floor((imageWidth - padding * (cols - 1)) / cols);
  const cellH = Math.floor((imageHeight - padding * (rows - 1)) / rows);

  return (
    <Modal open={open} onClose={onClose} title="Manual Grid Slicer">
      <div className="flex flex-col items-center">
        {/* Canvas Preview */}
        <div className="mb-6 rounded-xl border border-[var(--glass-border)] bg-[#0A0A0F] p-2">
          <canvas ref={canvasRef} className="block" />
        </div>

        {/* Controls */}
        <div className="grid w-full grid-cols-3 gap-4 mb-4">
          <div>
            <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-text-tertiary">
              Rows
            </label>
            <input
              type="number"
              min={1}
              max={64}
              value={rows}
              onChange={(e) => setRows(Math.max(1, parseInt(e.target.value) || 1))}
              className="h-9 w-full rounded-lg border border-[var(--glass-border)] bg-bg-elevated px-3 text-sm text-text-primary text-center focus:border-accent-primary focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-text-tertiary">
              Columns
            </label>
            <input
              type="number"
              min={1}
              max={64}
              value={cols}
              onChange={(e) => setCols(Math.max(1, parseInt(e.target.value) || 1))}
              className="h-9 w-full rounded-lg border border-[var(--glass-border)] bg-bg-elevated px-3 text-sm text-text-primary text-center focus:border-accent-primary focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-text-tertiary">
              Padding
            </label>
            <input
              type="number"
              min={0}
              max={32}
              value={padding}
              onChange={(e) => setPadding(Math.max(0, parseInt(e.target.value) || 0))}
              className="h-9 w-full rounded-lg border border-[var(--glass-border)] bg-bg-elevated px-3 text-sm text-text-primary text-center focus:border-accent-primary focus:outline-none"
            />
          </div>
        </div>

        {/* Cell size info */}
        <p className="mb-6 font-mono text-xs text-text-tertiary">
          Cell size: {cellW} x {cellH}px &middot; {rows * cols} frames total
        </p>

        {/* Actions */}
        <div className="flex w-full gap-3">
          <Button
            variant="ghost"
            className="flex-1"
            onClick={() => { setRows(4); setCols(4); setPadding(0); }}
          >
            <RotateCcw className="h-4 w-4" />
            Reset
          </Button>
          <Button
            variant="primary"
            className="flex-1"
            onClick={() => onConfirm(rows, cols, padding)}
          >
            <Grid3x3 className="h-4 w-4" />
            Slice ({rows * cols} frames)
          </Button>
        </div>
      </div>
    </Modal>
  );
}
