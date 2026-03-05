'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { Link2, Loader2, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import ProgressBar from '@/components/ui/ProgressBar';
import { useUrlImportStore, type ImportJob } from '@/stores/url-import-store';

interface UrlImportModalProps {
  onImportComplete: () => void;
}

const MIN_AI_SCORE = 0.5;
const MAX_IMPORTS = 10;

export default function UrlImportModal({ onImportComplete }: UrlImportModalProps) {
  const {
    isOpen, phase, inputUrl, pageTitle, jobs, error,
    closeModal, setInputUrl, setPhase, setPageTitle, addJobs, updateJob, setError, reset,
  } = useUrlImportStore();

  const [localUrl, setLocalUrl] = useState('');
  const abortRef = useRef(false);

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setPhase('idle');
      setError(null);
      setLocalUrl('');
      abortRef.current = false;
    }
  }, [isOpen, setPhase, setError]);

  const handleClose = useCallback(() => {
    abortRef.current = true;
    closeModal();
  }, [closeModal]);

  // Step 1: Analyze URL
  const handleAnalyze = useCallback(async () => {
    const url = localUrl.trim();
    if (!url) return;

    setInputUrl(url);
    setPhase('analyzing');
    setError(null);

    try {
      const res = await fetch('/api/import/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Analysis failed');
      }

      const data = await res.json();

      if (data.mode === 'direct') {
        // Direct GIF URL — import immediately
        const candidate = data.candidate;
        addJobs([{
          url: candidate.url,
          filename: candidate.filename,
          status: 'pending',
          progress: 0,
          aiScore: 1.0,
          aiReason: 'Direct image URL',
        }]);
        setPhase('importing');
      } else if (data.mode === 'page') {
        setPageTitle(data.pageTitle || '');

        if (!data.candidates || data.candidates.length === 0) {
          setError('No images found on this page');
          setPhase('error');
          return;
        }

        // Filter by AI score and limit
        const qualifying = data.candidates
          .filter((c: ImportJob & { aiScore: number }) => c.aiScore >= MIN_AI_SCORE)
          .slice(0, MAX_IMPORTS);

        const skipped = data.candidates.filter(
          (c: ImportJob & { aiScore: number }) => c.aiScore < MIN_AI_SCORE
        );

        const allJobs: ImportJob[] = [
          ...qualifying.map((c: ImportJob & { aiScore: number; aiReason: string }) => ({
            url: c.url,
            filename: c.filename,
            status: 'pending' as const,
            progress: 0,
            aiScore: c.aiScore,
            aiReason: c.aiReason,
          })),
          ...skipped.map((c: ImportJob & { aiScore: number; aiReason: string }) => ({
            url: c.url,
            filename: c.filename,
            status: 'skipped' as const,
            progress: 0,
            aiScore: c.aiScore,
            aiReason: c.aiReason,
          })),
        ];

        if (qualifying.length === 0) {
          addJobs(allJobs);
          setError('No VFX-relevant images found (all scored below threshold)');
          setPhase('error');
          return;
        }

        addJobs(allJobs);
        setPhase('importing');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed');
      setPhase('error');
    }
  }, [localUrl, setInputUrl, setPhase, setError, setPageTitle, addJobs]);

  // Step 2: Auto-import qualifying jobs sequentially
  useEffect(() => {
    if (phase !== 'importing') return;

    const pendingJobs = useUrlImportStore.getState().jobs.filter((j) => j.status === 'pending');
    if (pendingJobs.length === 0) {
      setPhase('complete');
      return;
    }

    let cancelled = false;

    const importNext = async () => {
      for (const job of pendingJobs) {
        if (cancelled || abortRef.current) return;

        updateJob(job.url, { status: 'downloading', detail: 'Downloading...' });

        try {
          // Fetch (download + start pipeline)
          const res = await fetch('/api/import/fetch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: job.url }),
          });

          if (!res.ok) {
            const data = await res.json();
            updateJob(job.url, {
              status: 'error',
              detail: data.error || 'Download failed',
            });
            continue;
          }

          const { jobId } = await res.json();
          updateJob(job.url, { jobId, status: 'processing', detail: 'Processing...' });

          // Listen to SSE for progress
          await new Promise<void>((resolve) => {
            const es = new EventSource(`/api/upload/${jobId}/progress`);

            es.addEventListener('progress', (event) => {
              if (cancelled || abortRef.current) { es.close(); resolve(); return; }
              const update = JSON.parse(event.data);
              updateJob(job.url, {
                progress: update.progress,
                detail: update.detail || update.stage,
              });
            });

            es.addEventListener('complete', () => {
              es.close();
              updateJob(job.url, { status: 'complete', progress: 100, detail: 'Complete' });
              resolve();
            });

            es.addEventListener('error', (event) => {
              es.close();
              try {
                const data = JSON.parse((event as MessageEvent).data);
                updateJob(job.url, { status: 'error', detail: data.error || 'Failed' });
              } catch {
                updateJob(job.url, { status: 'error', detail: 'Processing failed' });
              }
              resolve();
            });

            es.onerror = () => {
              es.close();
              updateJob(job.url, { status: 'error', detail: 'Connection lost' });
              resolve();
            };
          });
        } catch {
          updateJob(job.url, { status: 'error', detail: 'Network error' });
        }
      }

      // All done
      if (!cancelled && !abortRef.current) {
        setPhase('complete');
      }
    };

    importNext();
    return () => { cancelled = true; };
  }, [phase, updateJob, setPhase]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAnalyze();
    }
  };

  const completedCount = jobs.filter((j) => j.status === 'complete').length;
  const skippedCount = jobs.filter((j) => j.status === 'skipped').length;
  const errorCount = jobs.filter((j) => j.status === 'error').length;
  const totalImportable = jobs.filter((j) => j.status !== 'skipped').length;

  const handleComplete = () => {
    if (completedCount > 0) {
      onImportComplete();
    }
    handleClose();
  };

  return (
    <Modal open={isOpen} onClose={handleClose} title="Import from URL">
      {/* Step 1: URL Input */}
      {(phase === 'idle' || phase === 'input') && (
        <>
          <div className="mb-4 flex items-center gap-2 text-text-secondary">
            <Link2 className="h-4 w-4 text-accent-primary" />
            <span className="text-sm">Enter a web page or direct GIF URL</span>
          </div>

          <div className="mb-4 flex gap-2">
            <input
              type="url"
              value={localUrl}
              onChange={(e) => setLocalUrl(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="https://example.com/vfx-sprites"
              className="h-10 flex-1 rounded-lg border border-[var(--border-default)] bg-bg-elevated px-3 text-sm text-text-primary placeholder:text-text-disabled focus:border-accent-primary focus:outline-none"
              autoFocus
            />
            <Button
              variant="secondary"
              size="md"
              onClick={handleAnalyze}
              disabled={!localUrl.trim()}
            >
              Analyze
            </Button>
          </div>

          <p className="text-[11px] text-text-tertiary">
            AI will analyze the page, find VFX sprite GIFs, and auto-import them with tags.
          </p>
        </>
      )}

      {/* Analyzing spinner */}
      {phase === 'analyzing' && (
        <div className="flex flex-col items-center gap-4 py-8">
          <Loader2 className="h-8 w-8 animate-spin text-accent-primary" />
          <p className="text-sm text-text-secondary">Analyzing page...</p>
          <p className="text-xs text-text-tertiary truncate max-w-full">{inputUrl}</p>
        </div>
      )}

      {/* Error state */}
      {phase === 'error' && (
        <>
          <div className="mb-4 flex items-center gap-3 rounded-lg bg-state-error/10 px-4 py-3">
            <AlertCircle className="h-5 w-5 text-state-error shrink-0" />
            <p className="text-sm text-state-error">{error}</p>
          </div>

          {/* Show skipped/low-score items if any */}
          {jobs.length > 0 && (
            <div className="mb-4">
              <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-text-tertiary">
                Found images (below threshold)
              </p>
              {jobs.slice(0, 5).map((job) => (
                <JobRow key={job.url} job={job} />
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <Button variant="ghost" size="md" className="flex-1" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              variant="secondary"
              size="md"
              className="flex-1"
              onClick={() => {
                setPhase('idle');
                setError(null);
              }}
            >
              Try Again
            </Button>
          </div>
        </>
      )}

      {/* Importing progress */}
      {phase === 'importing' && (
        <>
          {pageTitle && (
            <p className="mb-3 text-xs text-text-tertiary truncate">
              From: {pageTitle}
            </p>
          )}

          <div className="mb-4 space-y-1">
            {jobs.map((job) => (
              <JobRow key={job.url} job={job} />
            ))}
          </div>

          <div className="flex items-center justify-between text-xs text-text-tertiary">
            <span>Imported: {completedCount}/{totalImportable}</span>
            {skippedCount > 0 && <span>Skipped: {skippedCount}</span>}
          </div>
        </>
      )}

      {/* Complete */}
      {phase === 'complete' && (
        <>
          <div className="mb-6 flex flex-col items-center gap-3 py-4">
            <CheckCircle className="h-10 w-10 text-state-success" />
            <p className="text-lg font-semibold text-text-primary">Import Complete!</p>
            <p className="text-sm text-text-secondary">
              {completedCount > 0
                ? `${completedCount} sprite${completedCount > 1 ? 's' : ''} imported`
                : 'No sprites imported'}
              {skippedCount > 0 && ` · ${skippedCount} skipped`}
              {errorCount > 0 && ` · ${errorCount} failed`}
            </p>
          </div>

          {/* Show final job list */}
          <div className="mb-4 max-h-48 overflow-y-auto space-y-1">
            {jobs.map((job) => (
              <JobRow key={job.url} job={job} />
            ))}
          </div>

          <Button variant="secondary" size="lg" className="w-full" onClick={handleComplete}>
            {completedCount > 0 ? 'Close & Refresh Gallery' : 'Close'}
          </Button>
        </>
      )}
    </Modal>
  );
}

// Individual job progress row
function JobRow({ job }: { job: ImportJob }) {
  return (
    <div className="flex items-center gap-3 rounded-lg px-3 py-2 bg-white/[0.02]">
      <JobStatusIcon status={job.status} />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-text-primary truncate">{job.filename}</p>
        {job.status === 'processing' && (
          <ProgressBar progress={job.progress} className="mt-1" />
        )}
        {job.detail && job.status !== 'processing' && job.status !== 'complete' && (
          <p className="text-[11px] text-text-tertiary truncate">{job.detail}</p>
        )}
        {job.status === 'skipped' && job.aiReason && (
          <p className="text-[11px] text-text-tertiary truncate">{job.aiReason}</p>
        )}
      </div>
      {job.aiScore !== undefined && (
        <span className={`text-[10px] font-mono shrink-0 ${
          job.aiScore >= 0.7 ? 'text-state-success' :
          job.aiScore >= 0.4 ? 'text-accent-primary' :
          'text-text-disabled'
        }`}>
          {job.aiScore.toFixed(1)}
        </span>
      )}
    </div>
  );
}

function JobStatusIcon({ status }: { status: ImportJob['status'] }) {
  switch (status) {
    case 'complete':
      return <CheckCircle className="h-4 w-4 text-state-success shrink-0" />;
    case 'error':
      return <XCircle className="h-4 w-4 text-state-error shrink-0" />;
    case 'skipped':
      return <XCircle className="h-4 w-4 text-text-disabled shrink-0" />;
    case 'downloading':
    case 'processing':
      return <Loader2 className="h-4 w-4 text-accent-primary animate-spin shrink-0" />;
    case 'pending':
    default:
      return <Clock className="h-4 w-4 text-text-tertiary shrink-0" />;
  }
}
