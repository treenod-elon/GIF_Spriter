'use client';

import { useState, useRef, useCallback, type DragEvent } from 'react';
import { Upload, CloudUpload, CheckCircle, AlertCircle } from 'lucide-react';
import Button from '@/components/ui/Button';
import ProgressBar from '@/components/ui/ProgressBar';
import {
  ALL_ACCEPTED_TYPES,
  ACCEPT_STRING,
  MAX_VIDEO_SIZE_MB,
  MAX_GIF_SIZE_MB,
  MAX_IMAGE_SIZE_MB,
  MAX_DURATION_SEC,
} from '@/lib/utils/constants';

type UploadState = 'idle' | 'dragover' | 'validating' | 'processing' | 'complete' | 'error';

interface DropZoneProps {
  onFileAccepted: (file: File) => void;
  onFilesAccepted?: (files: File[]) => void;
  progress?: number;
  progressLabel?: string;
  processingState?: 'idle' | 'processing' | 'complete' | 'error';
  errorMessage?: string;
}

export default function DropZone({
  onFileAccepted,
  onFilesAccepted,
  progress = 0,
  progressLabel,
  processingState = 'idle',
  errorMessage,
}: DropZoneProps) {
  const [state, setState] = useState<UploadState>('idle');
  const [localError, setLocalError] = useState<string>('');
  const inputRef = useRef<HTMLInputElement>(null);

  const displayState = processingState === 'processing' ? 'processing'
    : processingState === 'complete' ? 'complete'
    : processingState === 'error' ? 'error'
    : state;

  const displayError = errorMessage || localError;

  const validateFile = useCallback(async (file: File): Promise<string | null> => {
    if (!ALL_ACCEPTED_TYPES.includes(file.type)) {
      return 'Unsupported format. Use MP4, WebM, GIF, PNG, or JPG.';
    }

    const isVideo = file.type.startsWith('video/');
    const isGif = file.type === 'image/gif';
    const maxMB = isVideo ? MAX_VIDEO_SIZE_MB : isGif ? MAX_GIF_SIZE_MB : MAX_IMAGE_SIZE_MB;

    if (file.size > maxMB * 1024 * 1024) {
      return `File exceeds ${maxMB}MB limit.`;
    }

    if (isVideo) {
      const duration = await getVideoDuration(file);
      if (duration > MAX_DURATION_SEC) {
        return `Video is ${duration.toFixed(1)}s. Maximum is ${MAX_DURATION_SEC} seconds.`;
      }
    }

    return null;
  }, []);

  const handleFile = useCallback(async (file: File) => {
    setState('validating');
    setLocalError('');

    const error = await validateFile(file);
    if (error) {
      setState('error');
      setLocalError(error);
      return;
    }

    setState('idle');
    onFileAccepted(file);
  }, [validateFile, onFileAccepted]);

  const onDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      setState('idle');
      const files = Array.from(e.dataTransfer.files);
      if (files.length > 1 && onFilesAccepted) {
        onFilesAccepted(files);
      } else if (files.length > 0) {
        handleFile(files[0]);
      }
    },
    [handleFile, onFilesAccepted]
  );

  const onDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    setState('dragover');
  }, []);

  const onDragLeave = useCallback(() => setState('idle'), []);

  const onBrowse = () => inputRef.current?.click();

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (files.length > 1 && onFilesAccepted) {
      onFilesAccepted(files);
    } else if (files.length > 0) {
      handleFile(files[0]);
    }
    e.target.value = '';
  };

  const reset = () => {
    setState('idle');
    setLocalError('');
  };

  return (
    <div
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onClick={displayState === 'idle' || displayState === 'dragover' ? onBrowse : undefined}
      className={`
        relative flex h-[320px] w-full cursor-pointer flex-col items-center justify-center
        rounded-2xl border-2 border-dashed transition-all duration-300
        ${displayState === 'dragover'
          ? 'border-accent-primary/60 bg-accent-primary/10 shadow-[0_0_40px_rgba(110,86,255,0.15)] scale-[1.01]'
          : displayState === 'error'
          ? 'border-state-error/40 bg-state-error/5'
          : displayState === 'complete'
          ? 'border-state-success/40 bg-state-success/5'
          : 'border-accent-primary/25 bg-accent-primary/[0.04] hover:border-accent-primary/40 hover:bg-accent-primary/[0.06]'
        }
      `}
      style={{ backdropFilter: 'blur(8px)' }}
    >
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT_STRING}
        multiple
        onChange={onInputChange}
        className="hidden"
      />

      {displayState === 'idle' || displayState === 'dragover' ? (
        <>
          <CloudUpload
            className={`h-16 w-16 ${
              displayState === 'dragover'
                ? 'text-accent-primary animate-pulse-glow'
                : 'text-text-tertiary'
            }`}
          />
          <p className="mt-5 font-display text-lg font-semibold text-text-primary">
            Drag & drop your sprite files here
          </p>
          <p className="mt-1 text-sm text-text-secondary">or click to browse PNG, JPG, GIF</p>
          <p className="mt-2 text-xs text-text-tertiary">
            PNG, WebP, GIF, MP4 (max {MAX_DURATION_SEC}s)
          </p>
          <Button variant="upload" size="sm" className="mt-4" onClick={onBrowse}>
            <Upload className="h-4 w-4" />
            Browse files
          </Button>
        </>
      ) : displayState === 'validating' ? (
        <div className="flex flex-col items-center">
          <div className="h-12 w-12 animate-spin rounded-full border-2 border-accent-primary border-t-transparent" />
          <p className="mt-4 text-sm text-text-secondary">Validating file...</p>
        </div>
      ) : displayState === 'processing' ? (
        <div className="flex w-full max-w-xs flex-col items-center px-8">
          <div className="h-16 w-16 animate-spin rounded-full border-3 border-accent-primary border-t-transparent" />
          <ProgressBar progress={progress} label={progressLabel || 'Processing...'} className="mt-6 w-full" />
        </div>
      ) : displayState === 'complete' ? (
        <div className="flex flex-col items-center">
          <CheckCircle className="h-16 w-16 text-state-success" />
          <p className="mt-4 font-display text-lg font-semibold text-state-success">
            Upload successful!
          </p>
        </div>
      ) : (
        <div className="flex flex-col items-center">
          <AlertCircle className="h-16 w-16 text-state-error" />
          <p className="mt-4 text-sm text-state-error">{displayError}</p>
          <button
            onClick={(e) => { e.stopPropagation(); reset(); }}
            className="mt-3 text-sm text-accent-primary hover:underline"
          >
            Try again
          </button>
        </div>
      )}
    </div>
  );
}

function getVideoDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(video.src);
      resolve(isFinite(video.duration) ? video.duration : Infinity);
    };
    video.onerror = () => {
      URL.revokeObjectURL(video.src);
      reject(new Error('Failed to load video'));
    };
    video.src = URL.createObjectURL(file);
  });
}
