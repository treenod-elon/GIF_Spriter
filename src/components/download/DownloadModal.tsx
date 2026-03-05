'use client';

import { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import type { SpriteListItem } from '@/lib/types/sprite';
import { displayTag } from '@/lib/utils/format';

interface DownloadModalProps {
  sprite: SpriteListItem | null;
  open: boolean;
  onClose: () => void;
}

type SizeOption = 'original' | 'half' | 'quarter';
type DownloadType = 'spritesheet' | 'sequence';

export default function DownloadModal({ sprite, open, onClose }: DownloadModalProps) {
  const [downloadType, setDownloadType] = useState<DownloadType>('spritesheet');
  const [sizeOption, setSizeOption] = useState<SizeOption>('original');
  const [transparency, setTransparency] = useState(false);
  const [downloading, setDownloading] = useState(false);

  if (!sprite) return null;

  const baseW = sprite.frameWidth;
  const baseH = sprite.frameHeight;

  const sizeLabel = (opt: SizeOption) => {
    const scale = opt === 'original' ? 1 : opt === 'half' ? 0.5 : 0.25;
    const w = Math.round(baseW * scale);
    const h = Math.round(baseH * scale);
    const label = opt === 'original' ? 'Original' : opt === 'half' ? 'Half' : 'Quarter';
    return `${label} (${w}x${h})`;
  };

  const getWidth = () => {
    switch (sizeOption) {
      case 'original': return undefined;
      case 'half': return Math.round(baseW / 2);
      case 'quarter': return Math.round(baseW / 4);
    }
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const width = getWidth();
      const params = new URLSearchParams();
      if (downloadType === 'spritesheet') params.set('format', 'sheet');
      if (width) params.set('width', String(width));
      if (transparency) params.set('transparency', 'true');

      const res = await fetch(`/api/sprites/${sprite.id}/download?${params}`);
      if (!res.ok) throw new Error('Download failed');

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = downloadType === 'spritesheet'
        ? `${sprite.title}_spritesheet.png`
        : `${sprite.title}_frames.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch {
      // Error handling
    } finally {
      setDownloading(false);
    }
  };

  const tagDisplay = sprite.tags && sprite.tags.length > 0
    ? sprite.tags.map((t) => `#${displayTag(t)}`).join(' ')
    : `#${sprite.category || 'Other'}`;

  return (
    <Modal open={open} onClose={onClose} title={tagDisplay}>
      {/* Preview */}
      <div className="mx-auto mb-6 flex h-40 w-40 items-center justify-center rounded-xl bg-[#0D0D14]">
        <img
          src={sprite.thumbnailUrl}
          alt="sprite"
          className="max-h-full max-w-full object-contain"
        />
      </div>

      {/* Meta */}
      <div className="mb-6 flex justify-center gap-2">
        <span className="rounded bg-white/[0.06] px-2 py-0.5 font-mono text-[11px] text-text-tertiary">
          {sprite.frameWidth}x{sprite.frameHeight}
        </span>
        <span className="rounded bg-white/[0.06] px-2 py-0.5 font-mono text-[11px] text-text-tertiary">
          {sprite.frameCount} frames
        </span>
        <span className="rounded bg-white/[0.06] px-2 py-0.5 font-mono text-[11px] text-text-tertiary">
          {sprite.inputType.toUpperCase()}
        </span>
      </div>

      {/* Download Type */}
      <div className="mb-4">
        <p className="mb-3 text-[11px] font-medium uppercase tracking-wider text-text-tertiary">
          Download Type
        </p>
        {([
          { value: 'spritesheet' as const, label: 'Spritesheet', desc: 'Single PNG with all frames packed' },
          { value: 'sequence' as const, label: 'Sequence', desc: 'ZIP of individual frame PNGs' },
        ]).map((opt) => (
          <label
            key={opt.value}
            className={`mb-1 flex cursor-pointer items-center gap-3 rounded-lg px-4 py-3 transition-colors ${
              downloadType === opt.value
                ? 'bg-accent-primary/10 border-l-2 border-accent-primary'
                : 'hover:bg-white/[0.03]'
            }`}
          >
            <input
              type="radio"
              name="downloadType"
              checked={downloadType === opt.value}
              onChange={() => setDownloadType(opt.value)}
              className="accent-accent-primary"
            />
            <div>
              <span className="text-sm text-text-primary">{opt.label}</span>
              <p className="text-[11px] text-text-tertiary">{opt.desc}</p>
            </div>
          </label>
        ))}
      </div>

      {/* Size options */}
      <div className="mb-4">
        <p className="mb-3 text-[11px] font-medium uppercase tracking-wider text-text-tertiary">
          Size
        </p>
        {(['original', 'half', 'quarter'] as const).map((opt) => (
          <label
            key={opt}
            className={`mb-1 flex cursor-pointer items-center gap-3 rounded-lg px-4 py-3 transition-colors ${
              sizeOption === opt ? 'bg-accent-primary/10 border-l-2 border-accent-primary' : 'hover:bg-white/[0.03]'
            }`}
          >
            <input
              type="radio"
              name="size"
              checked={sizeOption === opt}
              onChange={() => setSizeOption(opt)}
              className="accent-accent-primary"
            />
            <span className="text-sm text-text-primary">{sizeLabel(opt)}</span>
          </label>
        ))}
      </div>

      {/* Transparency option */}
      <div className="mb-6">
        <label className="flex cursor-pointer items-center gap-3 rounded-lg px-4 py-3 transition-colors hover:bg-white/[0.03]">
          <input
            type="checkbox"
            checked={transparency}
            onChange={(e) => setTransparency(e.target.checked)}
            className="h-4 w-4 rounded accent-accent-primary"
          />
          <div>
            <span className="text-sm text-text-primary">Remove Background (AI)</span>
            <p className="text-[11px] text-text-tertiary">
              Automatically detect and remove background color
            </p>
          </div>
        </label>
      </div>

      {/* Unified Download button */}
      <Button
        variant="secondary"
        size="lg"
        className="w-full"
        onClick={handleDownload}
        disabled={downloading}
      >
        {downloading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            {transparency ? 'Processing & Downloading...' : 'Downloading...'}
          </>
        ) : (
          <>
            <Download className="h-4 w-4" />
            Download {downloadType === 'spritesheet' ? 'Spritesheet' : 'Frames'}
          </>
        )}
      </Button>
    </Modal>
  );
}
