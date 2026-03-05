import { create } from 'zustand';
import { normalizeTag } from '@/lib/utils/format';

interface GalleryState {
  searchQuery: string;
  selectedTags: string[];
  sortBy: 'newest' | 'name' | 'frames';
  currentPage: number;
  totalPages: number;
  totalSprites: number;
  pageSize: number;
  setSearchQuery: (q: string) => void;
  toggleTag: (tag: string) => void;
  clearTags: () => void;
  setSortBy: (sort: GalleryState['sortBy']) => void;
  setCurrentPage: (page: number) => void;
  setPaginationInfo: (total: number, page: number, limit: number) => void;
}

export const useGalleryStore = create<GalleryState>((set) => ({
  searchQuery: '',
  selectedTags: [],
  sortBy: 'newest',
  currentPage: 1,
  totalPages: 1,
  totalSprites: 0,
  pageSize: 20,
  setSearchQuery: (searchQuery) => set({ searchQuery, currentPage: 1 }),
  toggleTag: (tag) =>
    set((state) => {
      const normalized = normalizeTag(tag);
      const exists = state.selectedTags.some((t) => normalizeTag(t) === normalized);
      return {
        selectedTags: exists
          ? state.selectedTags.filter((t) => normalizeTag(t) !== normalized)
          : [...state.selectedTags, normalized],
        currentPage: 1,
      };
    }),
  clearTags: () => set({ selectedTags: [], currentPage: 1 }),
  setSortBy: (sortBy) => set({ sortBy }),
  setCurrentPage: (currentPage) => set({ currentPage }),
  setPaginationInfo: (total, page, limit) =>
    set({
      totalSprites: total,
      currentPage: page,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    }),
}));
