import { create } from 'zustand';

export type ImportPhase = 'idle' | 'input' | 'analyzing' | 'importing' | 'complete' | 'error';

export interface ImportJob {
  url: string;
  filename: string;
  jobId?: string;
  status: 'pending' | 'downloading' | 'processing' | 'complete' | 'error' | 'skipped';
  progress: number;
  detail?: string;
  aiScore?: number;
  aiReason?: string;
}

interface UrlImportState {
  isOpen: boolean;
  phase: ImportPhase;
  inputUrl: string;
  pageTitle: string;
  jobs: ImportJob[];
  error: string | null;
  openModal: () => void;
  closeModal: () => void;
  setInputUrl: (url: string) => void;
  setPhase: (phase: ImportPhase) => void;
  setPageTitle: (title: string) => void;
  addJobs: (jobs: ImportJob[]) => void;
  updateJob: (url: string, patch: Partial<ImportJob>) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

export const useUrlImportStore = create<UrlImportState>((set) => ({
  isOpen: false,
  phase: 'idle',
  inputUrl: '',
  pageTitle: '',
  jobs: [],
  error: null,

  openModal: () => set({ isOpen: true }),
  closeModal: () => set({ isOpen: false }),
  setInputUrl: (url) => set({ inputUrl: url }),
  setPhase: (phase) => set({ phase }),
  setPageTitle: (title) => set({ pageTitle: title }),
  addJobs: (jobs) => set({ jobs }),
  updateJob: (url, patch) =>
    set((state) => ({
      jobs: state.jobs.map((j) =>
        j.url === url ? { ...j, ...patch } : j
      ),
    })),
  setError: (error) => set({ error }),
  reset: () =>
    set({
      isOpen: false,
      phase: 'idle',
      inputUrl: '',
      pageTitle: '',
      jobs: [],
      error: null,
    }),
}));
