import { create } from 'zustand';
import { ClassificationResult } from '../services/aiService';

interface ClassificationState {
  image: string | null;
  result: ClassificationResult | null;
  setImage: (image: string | null) => void;
  setResult: (result: ClassificationResult | null) => void;
  clear: () => void;
}

export const useClassificationStore = create<ClassificationState>((set) => ({
  image: null,
  result: null,
  setImage: (image) => set({ image }),
  setResult: (result) => set({ result }),
  clear: () => set({ image: null, result: null }),
}));
