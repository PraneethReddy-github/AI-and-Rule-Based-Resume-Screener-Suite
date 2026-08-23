import { openDB } from 'idb';
import type { DBSchema, IDBPDatabase } from 'idb';
import type { JobDescription, Candidate } from './types';

interface ResumeScreenerDB extends DBSchema {
  jobDescriptions: {
    key: string;
    value: JobDescription;
  };
  candidates: {
    key: string;
    value: Candidate;
  };
}

let db: IDBPDatabase<ResumeScreenerDB> | null = null;

export async function getDB(): Promise<IDBPDatabase<ResumeScreenerDB>> {
  if (!db) {
    db = await openDB<ResumeScreenerDB>('resume-screener', 1, {
      upgrade(db) {
        db.createObjectStore('jobDescriptions', { keyPath: 'id' });
        db.createObjectStore('candidates', { keyPath: 'id' });
      },
    });
  }
  return db;
}

export async function saveJD(jd: JobDescription): Promise<void> {
  const db = await getDB();
  await db.put('jobDescriptions', jd);
}

export async function getAllJDs(): Promise<JobDescription[]> {
  const db = await getDB();
  return db.getAll('jobDescriptions');
}

export async function deleteJD(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('jobDescriptions', id);
}

export async function saveCandidate(candidate: Candidate): Promise<void> {
  const db = await getDB();
  await db.put('candidates', candidate);
}

export async function getAllCandidates(): Promise<Candidate[]> {
  const db = await getDB();
  return db.getAll('candidates');
}

export async function getCandidate(id: string): Promise<Candidate | undefined> {
  const db = await getDB();
  return db.get('candidates', id);
}

export async function deleteCandidate(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('candidates', id);
}
