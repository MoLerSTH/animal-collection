import { create } from 'zustand';

export interface AnalysisCooldownState {
  ownerId?: string;
  retryUntil: number;
  setCooldown: (retryAfterSeconds: number, ownerId?: string) => void;
  syncOwner: (ownerId?: string) => void;
  clearCooldown: () => void;
}

export const useAnalysisCooldownStore = create<AnalysisCooldownState>((set) => ({
  ownerId: undefined,
  retryUntil: 0,
  setCooldown: (retryAfterSeconds: number, ownerId?: string) => {
    if (!Number.isFinite(retryAfterSeconds) || retryAfterSeconds <= 0) {
      return;
    }
    set({
      retryUntil: Date.now() + Math.round(retryAfterSeconds * 1000),
      ownerId,
    });
  },
  syncOwner: (ownerId?: string) => {
    set((state) => {
      if (state.ownerId !== ownerId) {
        return { ownerId, retryUntil: 0 };
      }
      return state;
    });
  },
  clearCooldown: () => {
    set({ retryUntil: 0 });
  },
}));
