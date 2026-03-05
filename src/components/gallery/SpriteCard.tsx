'use client';

import { useRef, useCallback, useState, useEffect } from 'react';
import { Download, Pencil, Trash2 } from 'lucide-react';
import type { SpriteListItem } from '@/lib/types/sprite';
import { formatFileSize, displayTag } from '@/lib/utils/format';

interface SpriteCardProps {
  sprite: SpriteListItem;
  onDownloadClick: (sprite: SpriteListItem) => void;
  onDelete?: (id: string) => void;
  onEdit?: (sprite: SpriteListItem) => void;
}

export default function SpriteCard({ sprite, onDownloadClick, onDelete, onEdit }: SpriteCardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const framesRef = useRef<HTMLImageElement[]>([]);
  const frameIndexRef = useRef(0);
  const lastFrameTimeRef = useRef(0);
  const [isLoaded, setIsLoaded] = useState(false);

  const isGif = sprite.inputType === 'gif';
  const frameDuration = 1000 / (sprite.fps || 24);

  const loadFrames = useCallback(async () => {
    if (framesRef.current.length > 0) return;

    const frames: HTMLImageElement[] = [];
    for (let i = 0; i < sprite.frameCount; i++) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = `/api/sprites/${sprite.id}/frames/${i}`;
      await new Promise<void>((resolve) => {
        img.onload = () => resolve();
        img.onerror = () => resolve();
      });
      frames.push(img);
    }
    framesRef.current = frames;
    setIsLoaded(true);
  }, [sprite.id, sprite.frameCount]);

  const drawFrame = useCallback((index: number) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    const frame = framesRef.current[index];
    if (!canvas || !ctx || !frame) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(frame, 0, 0, canvas.width, canvas.height);
  }, []);

  const tick = useCallback(
    (now: number) => {
      const elapsed = now - lastFrameTimeRef.current;
      if (elapsed >= frameDuration) {
        frameIndexRef.current =
          (frameIndexRef.current + 1) % framesRef.current.length;
        drawFrame(frameIndexRef.current);
        lastFrameTimeRef.current = now - (elapsed % frameDuration);
      }
      animationRef.current = requestAnimationFrame(tick);
    },
    [frameDuration, drawFrame]
  );

  // Auto-loop: load frames and start animation on mount (spritesheet only)
  useEffect(() => {
    if (isGif) return;
    let cancelled = false;

    const start = async () => {
      await loadFrames();
      if (cancelled) return;
      frameIndexRef.current = 0;
      lastFrameTimeRef.current = performance.now();
      if (framesRef.current.length > 0) {
        drawFrame(0);
        animationRef.current = requestAnimationFrame(tick);
      }
    };

    start();
    return () => {
      cancelled = true;
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  }, [isGif, loadFrames, drawFrame, tick]);

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDownloadClick(sprite);
  };

  const displayTags = sprite.tags && sprite.tags.length > 0
    ? sprite.tags
    : [];

  const typeBadge = sprite.inputType === 'gif'
    ? 'GIF'
    : sprite.inputType === 'spritesheet'
    ? 'SPRITE'
    : 'VIDEO';

  return (
    <div className="glass-card overflow-hidden rounded-2xl">
      {/* Thumbnail / Animation area */}
      <div className="relative aspect-square overflow-hidden bg-[#0D0D14] flex items-center justify-center p-4">
        {/* File type badge */}
        <span className="absolute top-2 left-2 z-10 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-bold uppercase text-white backdrop-blur-sm">
          {typeBadge}
        </span>

        {isGif ? (
          <img
            src={`/api/sprites/${sprite.id}/original`}
            alt="sprite"
            className="max-h-full max-w-full object-contain"
          />
        ) : (
          <>
            <canvas
              ref={canvasRef}
              width={sprite.frameWidth || 280}
              height={sprite.frameHeight || 280}
              className="max-h-full max-w-full object-contain"
            />
            {!isLoaded && (
              <img
                src={sprite.thumbnailUrl}
                alt="sprite"
                className="absolute inset-4 object-contain"
                loading="lazy"
              />
            )}
          </>
        )}
      </div>

      {/* Card info */}
      <div className="p-4">
        {/* Tags (primary display) */}
        <div className="flex flex-wrap gap-1 overflow-hidden max-h-[1.5rem]">
          {displayTags.slice(0, 5).map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-accent-primary/10 px-2 py-0.5 text-[11px] font-medium text-accent-primary"
            >
              #{displayTag(tag)}
            </span>
          ))}
        </div>

        {/* Meta badges */}
        <div className="mt-2 flex flex-wrap gap-1.5">
          <span className="rounded bg-white/[0.06] px-2 py-0.5 font-mono text-[11px] text-text-tertiary">
            {sprite.frameWidth}x{sprite.frameHeight}
          </span>
          <span className="rounded bg-white/[0.06] px-2 py-0.5 font-mono text-[11px] text-text-tertiary">
            {sprite.frameCount}fr
          </span>
          <span className="rounded bg-white/[0.06] px-2 py-0.5 font-mono text-[11px] text-text-tertiary">
            {formatFileSize(sprite.fileSize)}
          </span>
        </div>

        {/* Actions row */}
        <div className="mt-3 flex items-center justify-end">
          <div className="flex gap-1.5">
            {onEdit && (
              <button
                onClick={(e) => { e.stopPropagation(); onEdit(sprite); }}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.06] text-text-tertiary transition-colors hover:bg-accent-primary/20 hover:text-accent-primary"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
            )}
            {onDelete && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (window.confirm('이 스프라이트를 삭제하시겠습니까?')) {
                    onDelete(sprite.id);
                  }
                }}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.06] text-text-tertiary transition-colors hover:bg-state-error/20 hover:text-state-error"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
            <button
              onClick={handleDownload}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-primary text-text-inverse transition-transform hover:scale-105"
            >
              <Download className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

