'use client';

import { useProcessingStore } from '@/stores/processing-store';
import ProgressBar from '@/components/ui/ProgressBar';
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

const STEP_ICONS: Record<string, string> = {
  validating: 'Validating file...',
  extracting: 'Extracting frames...',
  packing: 'Building spritesheet...',
  uploading: 'Uploading to server...',
  complete: 'Complete!',
};

export default function ProcessingStatus() {
  const { status, progress, currentStep, error } = useProcessingStore();

  if (status === 'idle') return null;

  return (
    <div className="mt-4 rounded-xl border border-[var(--glass-border)] p-4"
         style={{ background: 'var(--glass-bg)', backdropFilter: 'var(--glass-blur)' }}>
      <div className="flex items-center gap-3">
        {status === 'complete' ? (
          <CheckCircle className="h-5 w-5 text-state-success shrink-0" />
        ) : status === 'error' ? (
          <AlertCircle className="h-5 w-5 text-state-error shrink-0" />
        ) : (
          <Loader2 className="h-5 w-5 text-accent-upload animate-spin shrink-0" />
        )}

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-text-primary truncate">
            {status === 'error' ? 'Processing failed' : (STEP_ICONS[status] || currentStep || 'Processing...')}
          </p>
          {error && (
            <p className="mt-1 text-xs text-state-error">{error}</p>
          )}
          {status !== 'error' && status !== 'complete' && (
            <ProgressBar progress={progress} className="mt-2" />
          )}
        </div>
      </div>
    </div>
  );
}
