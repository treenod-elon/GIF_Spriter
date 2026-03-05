'use client';

import { useState, useCallback, useEffect } from 'react';
import DropZone from '@/components/upload/DropZone';
import UploadModal from '@/components/upload/UploadModal';
import UrlImportModal from '@/components/upload/UrlImportModal';
import FilterBar from '@/components/gallery/FilterBar';
import GalleryGrid from '@/components/gallery/GalleryGrid';
import Pagination from '@/components/ui/Pagination';
import { useGalleryStore } from '@/stores/gallery-store';
import { useProcessingStore } from '@/stores/processing-store';
import { useToast } from '@/components/ui/Toast';
import type { SpriteListItem } from '@/lib/types/sprite';

export default function Home() {
  const [sprites, setSprites] = useState<SpriteListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const {
    searchQuery, selectedTags, sortBy,
    currentPage, totalPages, totalSprites, pageSize,
    setSearchQuery, toggleTag, clearTags, setSortBy,
    setCurrentPage, setPaginationInfo,
  } = useGalleryStore();
  const { status, progress, currentStep, error, reset } = useProcessingStore();
  const { showToast } = useToast();

  const fetchSprites = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      params.set('page', String(currentPage));
      params.set('limit', String(pageSize));
      if (searchQuery) params.set('search', searchQuery);
      if (selectedTags.length > 0) params.set('tags', selectedTags.join(','));
      if (sortBy !== 'newest') params.set('sort', sortBy);

      const res = await fetch(`/api/sprites?${params}`);
      if (res.ok) {
        const data = await res.json();
        setSprites(data.sprites || []);
        setPaginationInfo(data.total ?? 0, data.page ?? 1, data.limit ?? pageSize);
      }
    } catch {
      // API not ready yet
    } finally {
      setLoading(false);
    }
  }, [searchQuery, selectedTags, sortBy, currentPage, pageSize, setPaginationInfo]);

  useEffect(() => {
    fetchSprites();
  }, [fetchSprites]);

  // Step 1: File selected from DropZone → open UploadModal
  const handleFileAccepted = useCallback((file: File) => {
    reset();
    setPendingFile(file);
  }, [reset]);

  // Step 2: Upload from modal with tags and grid settings (SSE-based)
  const handleUpload = useCallback(
    async (file: File, tags: string[], gridCols?: number, gridRows?: number) => {
      const { setInputFile, setStatus, setProgress, setError } =
        useProcessingStore.getState();

      setUploading(true);
      setInputFile(file);
      setStatus('uploading');
      setProgress(10, 'Uploading file...');

      try {
        const formData = new FormData();
        formData.append('file', file);
        if (tags.length > 0) formData.append('tags', JSON.stringify(tags));
        if (gridCols) formData.append('gridCols', String(gridCols));
        if (gridRows) formData.append('gridRows', String(gridRows));

        const res = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Upload failed');
        }

        const { jobId } = await res.json();

        // Connect to SSE progress stream
        setStatus('processing');
        setPendingFile(null);

        await new Promise<void>((resolve, reject) => {
          const es = new EventSource(`/api/upload/${jobId}/progress`);

          es.addEventListener('progress', (event) => {
            const update = JSON.parse(event.data);
            setProgress(update.progress, update.detail || update.stage);
          });

          es.addEventListener('complete', () => {
            es.close();
            setProgress(100, 'Complete!');
            setStatus('complete');
            showToast('Sprite uploaded successfully!', 'success');
            resolve();
          });

          es.addEventListener('error', (event) => {
            es.close();
            try {
              const data = JSON.parse((event as MessageEvent).data);
              reject(new Error(data.error || 'Processing failed'));
            } catch {
              reject(new Error('Connection lost during processing'));
            }
          });

          es.onerror = () => {
            es.close();
            reject(new Error('Connection lost during processing'));
          };
        });

        setTimeout(() => {
          fetchSprites();
          reset();
        }, 2000);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Upload failed';
        useProcessingStore.getState().setError(message);
        showToast(message, 'error');
      } finally {
        setUploading(false);
      }
    },
    [fetchSprites, reset, showToast]
  );

  // Bulk upload: process multiple files sequentially without the modal
  const handleBulkUpload = useCallback(
    async (files: File[]) => {
      const { setStatus, setProgress } = useProcessingStore.getState();

      setUploading(true);
      setStatus('processing');

      let success = 0;
      let failed = 0;

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setProgress(
          Math.round((i / files.length) * 100),
          `Processing ${i + 1}/${files.length}: ${file.name}`
        );

        try {
          const formData = new FormData();
          formData.append('file', file);

          const res = await fetch('/api/upload', {
            method: 'POST',
            body: formData,
          });

          if (!res.ok) {
            failed++;
            continue;
          }

          const { jobId } = await res.json();

          // Wait for each file to complete via SSE
          await new Promise<void>((resolve) => {
            const es = new EventSource(`/api/upload/${jobId}/progress`);
            es.addEventListener('complete', () => { es.close(); resolve(); });
            es.addEventListener('error', () => { es.close(); resolve(); });
            es.onerror = () => { es.close(); resolve(); };
          });

          success++;
        } catch {
          failed++;
        }
      }

      setProgress(100, 'Complete!');
      setStatus('complete');

      const msg = failed > 0
        ? `Uploaded ${success}/${files.length} files (${failed} failed)`
        : `All ${success} files uploaded successfully!`;
      showToast(msg, failed > 0 ? 'error' : 'success');

      setTimeout(() => {
        fetchSprites();
        reset();
        setUploading(false);
      }, 2000);
    },
    [fetchSprites, reset, showToast]
  );

  const handleDelete = useCallback(
    async (id: string) => {
      try {
        const res = await fetch(`/api/sprites/${id}`, { method: 'DELETE' });
        if (res.ok) {
          showToast('Sprite deleted', 'success');
          fetchSprites();
        } else {
          showToast('Failed to delete sprite', 'error');
        }
      } catch {
        showToast('Failed to delete sprite', 'error');
      }
    },
    [fetchSprites, showToast]
  );

  return (
    <div>
      {/* Hero / Upload Section */}
      <section id="upload-section" className="relative px-4 py-16 md:px-8 md:py-20">
        <div className="mx-auto grid max-w-[1200px] items-center gap-12 lg:grid-cols-2 lg:gap-16">
          {/* Left - Text */}
          <div>
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.12em] text-accent-primary">
              GIF Sprite Resource Library
            </p>
            <h1 className="font-display text-4xl font-bold leading-tight text-text-primary md:text-5xl">
              Browse, Upload &amp; Download{' '}
              <span className="text-gradient">Game-Ready</span> Sprite Effects
            </h1>
            <p className="mt-5 max-w-lg text-base text-text-secondary">
              Free VFX sprite sheets for mobile game developers. Upload your own
              or browse community resources &mdash; no login required.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              {['Sprite Sheets', 'Auto Detection', 'PNG & WebP', '100% Free'].map((label) => (
                <span
                  key={label}
                  className="rounded-full border border-[var(--glass-border)] px-3.5 py-1.5 text-xs font-medium text-text-secondary"
                  style={{ background: 'var(--glass-bg)' }}
                >
                  {label}
                </span>
              ))}
            </div>
          </div>

          {/* Right - Upload Zone */}
          <DropZone
            onFileAccepted={handleFileAccepted}
            onFilesAccepted={handleBulkUpload}
            progress={progress}
            progressLabel={currentStep}
            processingState={
              status === 'idle' ? 'idle'
              : status === 'complete' ? 'complete'
              : status === 'error' ? 'error'
              : 'processing'
            }
            errorMessage={error || undefined}
          />
        </div>
      </section>

      {/* Upload Modal */}
      <UploadModal
        file={pendingFile}
        open={pendingFile !== null && !uploading && status === 'idle'}
        onClose={() => setPendingFile(null)}
        onUpload={handleUpload}
        uploading={uploading}
      />

      {/* URL Import Modal */}
      <UrlImportModal onImportComplete={fetchSprites} />

      {/* Filter Bar */}
      <FilterBar
        selectedTags={selectedTags}
        onTagToggle={toggleTag}
        onClearTags={clearTags}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        sortBy={sortBy}
        onSortChange={setSortBy}
      />

      {/* Gallery */}
      <section className="px-4 py-10 md:px-8">
        <div className="mx-auto max-w-[1440px]">
          {loading ? (
            <div className="grid gap-6" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="overflow-hidden rounded-2xl border border-[var(--glass-border)]">
                  <div className="aspect-square bg-white/[0.03] animate-pulse" />
                  <div className="p-4 space-y-3">
                    <div className="h-4 w-3/4 rounded bg-white/[0.04] animate-pulse" />
                    <div className="h-3 w-1/2 rounded bg-white/[0.03] animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <>
              <GalleryGrid sprites={sprites} onDelete={handleDelete} onRefresh={fetchSprites} />
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={totalSprites}
                onPageChange={setCurrentPage}
              />
            </>
          )}
        </div>
      </section>
    </div>
  );
}
