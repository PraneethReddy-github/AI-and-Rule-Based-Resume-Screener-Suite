import { create } from 'zustand';
import type { JobDescription, CandidateScore, ChatMessage } from './types';

interface AppState {
  jobDescriptions: JobDescription[];
  loading: boolean;
  currentResults: any[];
  selectedCandidate: any | null;
  chatHistory: ChatMessage[];
  sessionId: string | null;

  loadJDs: () => Promise<void>;
  refreshJDs: () => Promise<void>;
  addJD: (title: string, description: string) => Promise<void>;
  loadResults: (jdId: string) => Promise<void>;
  loadCandidate: (id: string) => Promise<void>;
  uploadResumes: (jdId: string, files: File[]) => Promise<void>;
  sendMessage: (jdId: string, message: string) => Promise<void>;
}

export const useAppStore = create<AppState>((set, get) => ({
  jobDescriptions: [],
  loading: false,
  currentResults: [],
  selectedCandidate: null,
  chatHistory: [],
  sessionId: null,

  loadJDs: async () => {
    const { jobDescriptions } = get();
    if (jobDescriptions.length > 0) return;
    
    set({ loading: true });
    try {
      const response = await fetch('/api/jd');
      if (!response.ok) throw new Error('Failed to fetch JDs');
      const data = await response.json();
      set({ jobDescriptions: data });
    } catch (error) {
      console.error('loadJDs failed:', error);
    } finally {
      set({ loading: false });
    }
  },

  refreshJDs: async () => {
    set({ loading: true });
    try {
      const response = await fetch('/api/jd');
      if (!response.ok) throw new Error('Failed to fetch JDs');
      const data = await response.json();
      set({ jobDescriptions: data });
    } catch (error) {
      console.error('refreshJDs failed:', error);
    } finally {
      set({ loading: false });
    }
  },

  addJD: async (title, description) => {
    set({ loading: true });
    try {
      const response = await fetch('/api/jd', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description }),
      });
      if (!response.ok) throw new Error('Failed to add JD');
      const newJd = await response.json();
      set((state) => ({ jobDescriptions: [newJd, ...state.jobDescriptions] }));
    } catch (error) {
      console.error('addJD failed:', error);
    } finally {
      set({ loading: false });
    }
  },

  loadResults: async (jdId) => {
    const { currentResults } = get();
    // If we already have results for this JD, don't re-fetch
    if (currentResults.length > 0 && currentResults[0].jd_id === jdId) return;

    set({ loading: true });
    try {
      const response = await fetch(`/api/results/${jdId}`);
      if (!response.ok) throw new Error('Failed to fetch results');
      const data = await response.json();
      set({ currentResults: data });
    } catch (error) {
      console.error('loadResults failed:', error);
    } finally {
      set({ loading: false });
    }
  },

  loadCandidate: async (id) => {
    set({ loading: true });
    try {
      const response = await fetch(`/api/candidate/${id}`);
      if (!response.ok) throw new Error('Failed to fetch candidate');
      const data = await response.json();
      set({ selectedCandidate: data });
    } catch (error) {
      console.error('loadCandidate failed:', error);
    } finally {
      set({ loading: false });
    }
  },

  uploadResumes: async (jdId, files) => {
    set({ loading: true });
    const formData = new FormData();
    formData.append('jdId', jdId);
    files.forEach((file) => formData.append('resumes', file));

    try {
      await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      // After upload, reload results
      const response = await fetch(`/api/results/${jdId}`);
      const data = await response.json();
      set({ currentResults: data });
    } finally {
      set({ loading: false });
    }
  },

  sendMessage: async (jdId, message) => {
    const { sessionId, chatHistory } = get();
    
    // Optimistically add user message to history
    const userMsg: ChatMessage = { role: 'user', parts: [{ text: message }] };
    set({ chatHistory: [...chatHistory, userMsg] });

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, jdId, message }),
      });
      if (!response.ok) throw new Error('Chat failed');
      const data = await response.json();
      set({ 
        sessionId: data.sessionId, 
        chatHistory: data.history 
      });
    } catch (error) {
      console.error('Chat failed:', error);
      // Optional: remove optimistic message or show error
    }
  },
}));
