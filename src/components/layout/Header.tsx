'use client';

import { Upload, Sparkles, Link2 } from 'lucide-react';
import { useUrlImportStore } from '@/stores/url-import-store';

export default function Header() {
  const openModal = useUrlImportStore((s) => s.openModal);

  const scrollToUpload = () => {
    document.getElementById('upload-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <header className="sticky top-0 z-50 h-16 border-b border-[var(--border-subtle)]"
      style={{
        background: 'rgba(10, 10, 15, 0.80)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
      }}
    >
      <div className="mx-auto flex h-full max-w-[1440px] items-center justify-between px-4 md:px-8">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-primary/20">
            <Sparkles className="h-5 w-5 text-accent-primary" />
          </div>
          <span className="font-display text-xl font-bold text-text-primary">
            VFX Spriter
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* URL Import */}
          <button
            onClick={openModal}
            className="flex items-center gap-2 rounded-lg border border-accent-primary/30 px-4 py-2 text-sm font-semibold text-accent-primary transition-all hover:bg-accent-primary/10 hover:border-accent-primary/50"
          >
            <Link2 className="h-4 w-4" />
            <span className="hidden sm:inline">URL Import</span>
          </button>

          {/* Upload CTA */}
          <button
            onClick={scrollToUpload}
            className="flex items-center gap-2 rounded-lg bg-accent-primary px-5 py-2 text-sm font-semibold text-text-inverse transition-all hover:bg-accent-primary-hover hover:shadow-glow active:bg-accent-primary-active"
          >
            <Upload className="h-4 w-4" />
            <span className="hidden sm:inline">Upload</span>
          </button>
        </div>
      </div>
    </header>
  );
}
