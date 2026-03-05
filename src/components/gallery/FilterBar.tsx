'use client';

import { Search, ArrowUpDown } from 'lucide-react';
import { PRESET_TAGS } from '@/lib/utils/constants';
import { normalizeTag, tagsInclude, displayTag } from '@/lib/utils/format';
import CustomSelect from '@/components/ui/CustomSelect';

type SortOption = 'newest' | 'name' | 'frames';

interface FilterBarProps {
  selectedTags: string[];
  onTagToggle: (tag: string) => void;
  onClearTags: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  sortBy?: SortOption;
  onSortChange?: (sort: SortOption) => void;
}

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'name', label: 'Name' },
  { value: 'frames', label: 'Frames' },
];

export default function FilterBar({
  selectedTags,
  onTagToggle,
  onClearTags,
  searchQuery,
  onSearchChange,
  sortBy = 'newest',
  onSortChange,
}: FilterBarProps) {
  const hasActiveTags = selectedTags.length > 0;

  return (
    <div
      className="sticky top-16 z-40 border-b border-[var(--border-subtle)] py-4"
      style={{
        background: 'rgba(10, 10, 15, 0.85)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
      }}
    >
      <div className="mx-auto flex max-w-[1440px] flex-col gap-3 px-4 md:px-8">
        {/* Row 1: Hashtag pills (multi-select) */}
        <div className="flex flex-wrap gap-2">
          {/* All button */}
          <button
            onClick={onClearTags}
            className={`
              flex-shrink-0 rounded-full px-4 py-1.5 text-xs font-semibold transition-all
              ${
                !hasActiveTags
                  ? 'bg-accent-primary text-text-inverse'
                  : 'bg-white/[0.06] text-text-secondary hover:bg-white/[0.12] hover:text-text-primary'
              }
            `}
          >
            All
          </button>

          {PRESET_TAGS.map((tag) => {
            const isActive = tagsInclude(selectedTags, tag);
            return (
              <button
                key={tag}
                onClick={() => onTagToggle(normalizeTag(tag))}
                className={`
                  flex-shrink-0 rounded-full px-4 py-1.5 text-xs font-semibold transition-all
                  ${
                    isActive
                      ? 'bg-accent-primary text-text-inverse'
                      : 'bg-white/[0.06] text-text-secondary hover:bg-white/[0.12] hover:text-text-primary'
                  }
                `}
              >
                #{displayTag(tag)}
              </button>
            );
          })}
        </div>

        {/* Row 2: Sort + Search (right-aligned) */}
        <div className="flex items-center gap-3 justify-end">
          {/* Sort */}
          {onSortChange && (
            <CustomSelect
              value={sortBy}
              onChange={(v) => onSortChange(v as SortOption)}
              options={SORT_OPTIONS}
              icon={<ArrowUpDown className="h-3.5 w-3.5 text-text-tertiary" />}
            />
          )}

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
            <input
              type="text"
              placeholder="Search sprites..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="h-9 w-full rounded-lg border border-[var(--border-default)] bg-bg-elevated pl-9 pr-3 text-sm text-text-primary placeholder:text-text-tertiary focus:border-[var(--border-accent)] focus:outline-none focus:ring-2 focus:ring-accent-primary/20 sm:w-60"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
