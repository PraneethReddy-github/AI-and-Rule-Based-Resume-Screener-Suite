import { create } from 'zustand';
import type { JobDescription, Candidate } from './types';
import {
  saveJD,
  getAllJDs,
  deleteJD,
  saveCandidate,
  getAllCandidates,
  deleteCandidate,
} from './db';

interface AppState {
  jobDescriptions: JobDescription[];
  candidates: Candidate[];
  loading: boolean;

  loadData: () => Promise<void>;
  addJD: (jd: JobDescription) => Promise<void>;
  updateJD: (jd: JobDescription) => Promise<void>;
  removeJD: (id: string) => Promise<void>;
  addCandidate: (candidate: Candidate) => Promise<void>;
  updateCandidate: (candidate: Candidate) => Promise<void>;
  removeCandidate: (id: string) => Promise<void>;
  clearCandidatesForJD: (jdId: string) => Promise<void>;
}

export const useAppStore = create<AppState>((set, get) => ({
  jobDescriptions: [],
  candidates: [],
  loading: false,

  loadData: async () => {
    set({ loading: true });
    const [jobDescriptions, candidates] = await Promise.all([
      getAllJDs(),
      getAllCandidates(),
    ]);
    set({ jobDescriptions, candidates, loading: false });
  },

  addJD: async (jd) => {
    await saveJD(jd);
    set((state) => ({ jobDescriptions: [...state.jobDescriptions, jd] }));
  },

  updateJD: async (jd) => {
    await saveJD(jd);
    set((state) => ({
      jobDescriptions: state.jobDescriptions.map((j) => (j.id === jd.id ? jd : j)),
    }));
  },

  removeJD: async (id) => {
    await deleteJD(id);
    set((state) => ({
      jobDescriptions: state.jobDescriptions.filter((j) => j.id !== id),
    }));
  },

  addCandidate: async (candidate) => {
    await saveCandidate(candidate);
    set((state) => ({ candidates: [...state.candidates, candidate] }));
  },

  updateCandidate: async (candidate) => {
    await saveCandidate(candidate);
    set((state) => ({
      candidates: state.candidates.map((c) => (c.id === candidate.id ? candidate : c)),
    }));
  },

  removeCandidate: async (id) => {
    await deleteCandidate(id);
    set((state) => ({
      candidates: state.candidates.filter((c) => c.id !== id),
    }));
  },

  clearCandidatesForJD: async (jdId) => {
    const { candidates } = get();
    // Remove score entries for this JD from all candidates
    const updatedCandidates = candidates.map((c) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { [jdId]: _removed, ...rest } = c.scores;
      return { ...c, scores: rest };
    });
    for (const c of updatedCandidates) {
      await saveCandidate(c);
    }
    set({ candidates: updatedCandidates });
  },
}));
