'use client';

import { useEffect, useCallback, type ReactNode } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
}

export default function Modal({ open, onClose, children, title }: ModalProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (open) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [open, handleKeyDown]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className="relative z-10 w-full max-w-[480px] max-h-[calc(100vh-64px)] overflow-y-auto
          rounded-2xl border border-[var(--glass-border)]
          backdrop-blur-[24px] shadow-glass animate-slide-up"
        style={{ background: 'rgba(22, 22, 34, 0.90)' }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-lg
            text-text-tertiary transition-colors hover:bg-white/5 hover:text-text-primary"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Content */}
        <div className="p-8">
          {title && (
            <h3 className="mb-6 text-center font-display text-xl font-bold text-text-primary">
              {title}
            </h3>
          )}
          {children}
        </div>
      </div>
    </div>
  );
}
