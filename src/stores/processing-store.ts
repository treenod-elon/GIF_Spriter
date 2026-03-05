import { create } from 'zustand';
import type { ProcessingStatus, InputType } from '@/lib/types/processing';

interface ProcessingState {
  status: ProcessingStatus;
  inputFile: File | null;
  inputType: InputType | null;
  progress: number;
  currentStep: string;
  error: string | null;

  setInputFile: (file: File) => void;
  setStatus: (status: ProcessingStatus) => void;
  setProgress: (progress: number, step: string) => void;
  setError: (error: string) => void;
  reset: () => void;
}

export const useProcessingStore = create<ProcessingState>((set) => ({
  status: 'idle',
  inputFile: null,
  inputType: null,
  progress: 0,
  currentStep: '',
  error: null,

  setInputFile: (file) =>
    set({
      inputFile: file,
      status: 'validating',
      error: null,
    }),

  setStatus: (status) => set({ status }),

  setProgress: (progress, currentStep) => set({ progress, currentStep }),

  setError: (error) => set({ status: 'error', error }),

  reset: () =>
    set({
      status: 'idle',
      inputFile: null,
      inputType: null,
      progress: 0,
      currentStep: '',
      error: null,
    }),
}));
