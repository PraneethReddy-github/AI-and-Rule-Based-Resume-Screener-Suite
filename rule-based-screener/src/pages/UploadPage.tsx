import React, { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store';
import { extractText, scoreCandidate } from '../scoring';
import type { Candidate } from '../types';

function uuid() {
  return crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(name: string) {
  if (name.endsWith('.pdf')) return '📄';
  if (name.endsWith('.docx')) return '📝';
  return '📃';
}

interface QueuedFile {
  id: string;
  file: File;
  error?: string;
}

interface ProcessingState {
  total: number;
  done: number;
  current: string;
}

export default function UploadPage() {
  const { jobDescriptions, candidates, addCandidate, updateCandidate, updateJD } = useAppStore();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedJDs, setSelectedJDs] = useState<string[]>([]);
  const [queue, setQueue] = useState<QueuedFile[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [jdDropdownOpen, setJdDropdownOpen] = useState(false);
  const [processing, setProcessing] = useState<ProcessingState | null>(null);
  const [done, setDone] = useState(false);

  const addFiles = useCallback((files: FileList | File[]) => {
    const accepted = Array.from(files).filter(
      (f) => f.name.endsWith('.pdf') || f.name.endsWith('.docx') || f.name.endsWith('.txt')
    );
    const newItems: QueuedFile[] = accepted.map((f) => ({ id: uuid(), file: f }));
    setQueue((q) => [...q, ...newItems]);
    setDone(false);
  }, []);

  const removeFile = (id: string) => setQueue((q) => q.filter((f) => f.id !== id));

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    addFiles(e.dataTransfer.files);
  };

  const toggleJD = (id: string) => {
    setSelectedJDs((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  async function runScreening() {
    if (queue.length === 0 || selectedJDs.length === 0) return;
    const targetJDs = jobDescriptions.filter((j) => selectedJDs.includes(j.id));
    setProcessing({ total: queue.length, done: 0, current: '' });

    const updatedErrors: Record<string, string> = {};

    for (let i = 0; i < queue.length; i++) {
      const item = queue[i];
      setProcessing({ total: queue.length, done: i, current: item.file.name });

      try {
        const rawText = await extractText(item.file);

        // Find or create candidate
        const existing = candidates.find((c) => c.fileName === item.file.name);
        let candidate: Candidate = existing ?? {
          id: uuid(),
          fileName: item.file.name,
          rawText,
          parsedAt: new Date().toISOString(),
          scores: {},
        };

        // Score against each selected JD
        for (const jd of targetJDs) {
          const score = scoreCandidate(jd, rawText);
          candidate = { ...candidate, scores: { ...candidate.scores, [jd.id]: score } };
        }

        if (existing) {
          await updateCandidate(candidate);
        } else {
          await addCandidate(candidate);
        }

        // Update JD resume count
        for (const jd of targetJDs) {
          const currentCandidates = [...candidates, candidate];
          const countForJD = currentCandidates.filter((c) => c.scores[jd.id] !== undefined).length;
          await updateJD({ ...jd, resumeCount: countForJD });
        }
      } catch (err) {
        updatedErrors[item.id] = (err as Error).message;
      }
    }

    setQueue((q) => q.map((f) => updatedErrors[f.id] ? { ...f, error: updatedErrors[f.id] } : f));
    setProcessing(null);
    setDone(true);

    // Navigate to first JD results
    if (selectedJDs.length > 0) {
      setTimeout(() => navigate(`/results/${selectedJDs[0]}`), 600);
    }
  }

  const selectedJDNames = jobDescriptions.filter((j) => selectedJDs.includes(j.id)).map((j) => j.title);
  const canRun = queue.length > 0 && selectedJDs.length > 0 && !processing;

  return (
    <div className="page" style={{ maxWidth: 700 }}>
      <div className="page-header">
        <h1 className="page-title">Upload Resumes</h1>
        <p className="page-subtitle">Drop resumes and pick target job descriptions to start screening.</p>
      </div>

      {/* JD selector */}
      <div className="form-group">
        <label className="form-label">Target Job Description(s)</label>
        {jobDescriptions.length === 0 ? (
          <div style={{ fontSize: 13, color: 'var(--amber)', background: 'var(--amber-dim)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: 'var(--radius)', padding: '10px 14px' }}>
            ⚠ No job descriptions yet. <span style={{ textDecoration: 'underline', cursor: 'pointer' }} onClick={() => navigate('/jobs')}>Create one first.</span>
          </div>
        ) : (
          <div className="multi-select-wrap">
            <button
              className={`multi-select-trigger${jdDropdownOpen ? ' open' : ''}`}
              onClick={() => setJdDropdownOpen((o) => !o)}
            >
              {selectedJDs.length === 0
                ? <span style={{ color: 'var(--text-tertiary)' }}>Select job descriptions…</span>
                : <div className="tags">{selectedJDNames.map((n) => <span key={n} className="tag">{n}</span>)}</div>
              }
              <span style={{ color: 'var(--text-tertiary)', marginLeft: 8 }}>▾</span>
            </button>
            {jdDropdownOpen && (
              <div className="multi-select-dropdown">
                {jobDescriptions.map((jd) => {
                  const sel = selectedJDs.includes(jd.id);
                  return (
                    <div
                      key={jd.id}
                      className={`multi-select-item${sel ? ' selected' : ''}`}
                      onClick={() => { toggleJD(jd.id); }}
                    >
                      <span className="check-box">{sel ? '✓' : ''}</span>
                      {jd.title}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Drop zone */}
      <div
        className={`dropzone${dragOver ? ' drag-over' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <div className="dropzone-icon">⬆️</div>
        <div className="dropzone-title">Drag & drop resumes here</div>
        <div className="dropzone-sub">PDF, DOCX, TXT supported — or click to browse</div>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.docx,.txt"
          style={{ display: 'none' }}
          onChange={(e) => e.target.files && addFiles(e.target.files)}
        />
      </div>

      {/* File queue */}
      {queue.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <div className="file-queue">
            <div className="file-queue-header">
              <span>Queued Files ({queue.length})</span>
              <button className="btn btn-ghost btn-sm" onClick={() => setQueue([])}>Clear all</button>
            </div>
            <div className="file-list">
              {queue.map((item) => (
                <div key={item.id} className="file-item">
                  <span className="file-icon">{getFileIcon(item.file.name)}</span>
                  <span className="file-name" title={item.file.name}>{item.file.name}</span>
                  {item.error ? (
                    <span style={{ fontSize: 11, color: 'var(--red)', flexShrink: 0 }}>Error: {item.error}</span>
                  ) : (
                    <span className="file-size">{formatBytes(item.file.size)}</span>
                  )}
                  <button className="file-remove" onClick={() => removeFile(item.id)}>✕</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Run button */}
      <div style={{ marginTop: 20, display: 'flex', justifyContent: 'center' }}>
        <button className="btn btn-primary" style={{ padding: '12px 32px', fontSize: 15 }} disabled={!canRun} onClick={runScreening}>
          {processing ? <><span className="spinner" style={{ width: 16, height: 16 }} /> Processing…</> : '▶ Run Screening'}
        </button>
      </div>

      {/* Progress */}
      {processing && (
        <div className="progress-container" style={{ marginTop: 20 }}>
          <div className="progress-text">
            <span>Processing resumes…</span>
            <span>{processing.done} / {processing.total}</span>
          </div>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${(processing.done / processing.total) * 100}%` }} />
          </div>
          <div className="progress-file">{processing.current}</div>
        </div>
      )}

      {done && !processing && (
        <div style={{ marginTop: 16, background: 'var(--green-dim)', border: '1px solid rgba(52,211,153,0.2)', borderRadius: 'var(--radius)', padding: '12px 16px', fontSize: 13, color: 'var(--green-text)', display: 'flex', alignItems: 'center', gap: 8 }}>
          ✓ Screening complete! Redirecting to results…
        </div>
      )}
    </div>
  );
}
