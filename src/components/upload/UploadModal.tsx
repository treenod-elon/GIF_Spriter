'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Upload, X, Loader2, Hash } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { PRESET_TAGS, ACCEPTED_IMAGE_TYPES } from '@/lib/utils/constants';
import { formatFileSize, normalizeTag, tagsInclude, displayTag } from '@/lib/utils/format';

interface UploadModalProps {
  file: File | null;
  open: boolean;
  onClose: () => void;
  onUpload: (file: File, tags: string[], gridCols?: number, gridRows?: number) => void;
  uploading: boolean;
}

export default function UploadModal({ file, open, onClose, onUpload, uploading }: UploadModalProps) {
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [customTagInput, setCustomTagInput] = useState('');
  const [gridCols, setGridCols] = useState('');
  const [gridRows, setGridRows] = useState('');
  const [imageSize, setImageSize] = useState<{ w: number; h: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isImage = file ? ACCEPTED_IMAGE_TYPES.includes(file.type) : false;

  // Load image dimensions for slice preview
  useEffect(() => {
    if (!file || !isImage) {
      setImageSize(null);
      return;
    }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      setImageSize({ w: img.naturalWidth, h: img.naturalHeight });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => URL.revokeObjectURL(url);
    img.src = url;
  }, [file, isImage]);

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setSelectedTags([]);
      setCustomTagInput('');
      setGridCols('');
      setGridRows('');
    }
  }, [open]);

  const toggleTag = useCallback((tag: string) => {
    const normalized = normalizeTag(tag);
    setSelectedTags((prev) =>
      tagsInclude(prev, tag)
        ? prev.filter((t) => normalizeTag(t) !== normalized)
        : [...prev, normalized]
    );
  }, []);

  const addCustomTag = useCallback(() => {
    const raw = customTagInput.trim().replace(/^#/, '').trim();
    const tag = normalizeTag(raw);
    if (tag && !tagsInclude(selectedTags, tag)) {
      setSelectedTags((prev) => [...prev, tag]);
    }
    setCustomTagInput('');
  }, [customTagInput, selectedTags]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addCustomTag();
    }
  };

  const removeTag = useCallback((tag: string) => {
    const normalized = normalizeTag(tag);
    setSelectedTags((prev) => prev.filter((t) => normalizeTag(t) !== normalized));
  }, []);

  const handleUpload = () => {
    if (!file) return;
    const cols = parseInt(gridCols) || undefined;
    const rows = parseInt(gridRows) || undefined;
    onUpload(file, selectedTags, cols, rows);
  };

  const frameW = imageSize && gridCols ? Math.floor(imageSize.w / parseInt(gridCols)) : null;
  const frameH = imageSize && gridRows ? Math.floor(imageSize.h / parseInt(gridRows)) : null;

  if (!file) return null;

  return (
    <Modal open={open} onClose={onClose} title="Upload Settings">
      {/* File info */}
      <div className="mb-5 flex items-center gap-3 rounded-lg bg-white/[0.04] px-4 py-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-upload/15">
          <Upload className="h-5 w-5 text-accent-upload" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-text-primary">{file.name}</p>
          <p className="text-xs text-text-tertiary">
            {formatFileSize(file.size)} &middot; {file.type.split('/')[1]?.toUpperCase()}
          </p>
        </div>
      </div>

      {/* Hashtag section */}
      <div className="mb-5">
        <p className="mb-3 text-[11px] font-medium uppercase tracking-wider text-text-tertiary">
          <Hash className="mr-1 inline h-3 w-3" />
          Hashtags
        </p>

        {/* Preset tags */}
        <div className="mb-3 flex flex-wrap gap-1.5">
          {PRESET_TAGS.map((tag) => (
            <button
              key={tag}
              onClick={() => toggleTag(tag)}
              className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${
                tagsInclude(selectedTags, tag)
                  ? 'bg-accent-primary text-text-inverse'
                  : 'bg-white/[0.06] text-text-secondary hover:bg-white/[0.10]'
              }`}
            >
              #{tag}
            </button>
          ))}
        </div>

        {/* Custom tag input */}
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={customTagInput}
            onChange={(e) => setCustomTagInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Add custom tag..."
            className="h-9 flex-1 rounded-lg border border-[var(--border-default)] bg-bg-elevated px-3 text-sm text-text-primary placeholder:text-text-disabled focus:border-[var(--border-accent)] focus:outline-none"
          />
          <Button variant="ghost" size="sm" onClick={addCustomTag} disabled={!customTagInput.trim()}>
            Add
          </Button>
        </div>

        {/* Selected tags display */}
        {selectedTags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {selectedTags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 rounded-full bg-accent-primary/15 px-2 py-0.5 text-[11px] text-accent-primary"
              >
                #{displayTag(tag)}
                <button
                  onClick={() => removeTag(tag)}
                  className="ml-0.5 rounded-full p-0.5 hover:bg-accent-primary/20"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Sprite slice grid (images only) */}
      {isImage && (
        <div className="mb-6">
          <p className="mb-3 text-[11px] font-medium uppercase tracking-wider text-text-tertiary">
            Slice Grid (optional)
          </p>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="1"
              max="64"
              value={gridCols}
              onChange={(e) => setGridCols(e.target.value)}
              placeholder="Cols"
              className="h-9 w-full rounded-lg border border-[var(--border-default)] bg-bg-elevated px-3 text-sm text-text-primary placeholder:text-text-disabled focus:border-[var(--border-accent)] focus:outline-none"
            />
            <span className="text-text-tertiary">x</span>
            <input
              type="number"
              min="1"
              max="64"
              value={gridRows}
              onChange={(e) => setGridRows(e.target.value)}
              placeholder="Rows"
              className="h-9 w-full rounded-lg border border-[var(--border-default)] bg-bg-elevated px-3 text-sm text-text-primary placeholder:text-text-disabled focus:border-[var(--border-accent)] focus:outline-none"
            />
          </div>
          {frameW && frameH && frameW > 0 && frameH > 0 && (
            <p className="mt-2 text-xs text-text-secondary">
              Frame size: {frameW} x {frameH}px &middot; {parseInt(gridCols) * parseInt(gridRows)} frames
            </p>
          )}
          {!gridCols && !gridRows && (
            <p className="mt-2 text-xs text-text-tertiary">
              Leave empty for auto-detection
            </p>
          )}
        </div>
      )}

      {/* Upload button */}
      <Button
        variant="upload"
        size="lg"
        className="w-full"
        onClick={handleUpload}
        disabled={uploading}
      >
        {uploading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Processing...
          </>
        ) : (
          <>
            <Upload className="h-4 w-4" />
            Upload
          </>
        )}
      </Button>
    </Modal>
  );
}

