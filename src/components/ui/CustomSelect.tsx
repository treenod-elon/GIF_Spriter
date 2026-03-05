'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronDown } from 'lucide-react';

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  className?: string;
  icon?: React.ReactNode;
}

export default function CustomSelect({ value, onChange, options, className = '', icon }: CustomSelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selectedLabel = options.find((o) => o.value === value)?.label ?? value;

  const handleSelect = useCallback((val: string) => {
    onChange(val);
    setOpen(false);
  }, [onChange]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Close on ESC
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className={`flex h-9 w-full items-center gap-1.5 rounded-lg border border-[var(--border-default)] bg-bg-elevated text-xs text-text-secondary transition-colors hover:border-[var(--border-accent)] focus:border-[var(--border-accent)] focus:outline-none cursor-pointer ${icon ? 'pl-8 pr-7' : 'pl-3 pr-7'}`}
      >
        {icon && (
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
            {icon}
          </span>
        )}
        <span className="truncate">{selectedLabel}</span>
        <ChevronDown className={`absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-tertiary transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 min-w-full overflow-hidden rounded-lg border border-[var(--border-default)] bg-[#1a1a24] shadow-xl">
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => handleSelect(opt.value)}
              className={`flex w-full items-center px-3 py-2 text-left text-xs transition-colors ${
                opt.value === value
                  ? 'bg-white/[0.08] text-text-primary'
                  : 'text-text-secondary hover:bg-white/[0.04] hover:text-text-primary'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
