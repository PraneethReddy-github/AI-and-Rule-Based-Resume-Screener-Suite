import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store';

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function UploadPage() {
  const { jobDescriptions, loadJDs, uploadResumes, loading } = useAppStore();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedJD, setSelectedJD] = useState<string>('');
  const [files, setFiles] = useState<File[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    loadJDs();
  }, []);

  const addFiles = useCallback((incomingFiles: FileList | File[]) => {
    const accepted = Array.from(incomingFiles).filter(
      (f) => f.name.endsWith('.pdf') || f.name.endsWith('.docx') || f.name.endsWith('.txt')
    );
    setFiles((prev) => [...prev, ...accepted]);
    setDone(false);
  }, []);

  const removeFile = (index: number) => setFiles((f) => f.filter((_, i) => i !== index));

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    addFiles(e.dataTransfer.files);
  };

  async function handleUpload() {
    if (files.length === 0 || !selectedJD) return;
    await uploadResumes(selectedJD, files);
    setDone(true);
    setTimeout(() => navigate(`/results/${selectedJD}`), 1000);
  }

  const canUpload = files.length > 0 && selectedJD && !loading;

  if (loading && jobDescriptions.length === 0) {
    return (
      <div className="page">
        <div className="empty-state">
          <div className="spinner" />
          <p style={{ marginTop: 12 }}>Loading Job Descriptions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page" style={{ maxWidth: 800 }}>
      <div className="page-header">
        <h1 className="page-title">Upload Resumes</h1>
        <p className="page-subtitle">Batch process resumes against an AI-generated role profile.</p>
      </div>

      <div className="form-group">
        <label className="form-label">Target Job Description</label>
        <select 
          className="form-select"
          value={selectedJD}
          onChange={(e) => setSelectedJD(e.target.value)}
        >
          <option value="">Select a JD...</option>
          {jobDescriptions.map(jd => (
            <option key={jd.id} value={jd.id}>{jd.title}</option>
          ))}
        </select>
        {jobDescriptions.length === 0 && !loading && (
          <div className="advisory">
            ⚠ No JDs found. You need to create a JD before screening.
          </div>
        )}
      </div>

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

      {files.length > 0 && (
        <div className="file-queue" style={{ marginTop: 20 }}>
          <div className="file-queue-header">
            <span>Queued Files ({files.length})</span>
            <button className="btn btn-ghost btn-sm" onClick={() => setFiles([])}>Clear all</button>
          </div>
          <div className="file-list">
            {files.map((file, i) => (
              <div key={i} className="file-item">
                <span className="file-icon">📄</span>
                <span className="file-name">{file.name}</span>
                <span className="file-size">{formatBytes(file.size)}</span>
                <button className="file-remove" onClick={() => removeFile(i)}>✕</button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ marginTop: 24, display: 'flex', justifyContent: 'center' }}>
        <button 
          className="btn btn-primary" 
          style={{ padding: '12px 32px', fontSize: 15 }} 
          disabled={!canUpload} 
          onClick={handleUpload}
        >
          {loading ? (
            <><div className="spinner" style={{ width: 14, height: 14 }} /> Analyzing...</>
          ) : (
            '▶ Run AI Screening'
          )}
        </button>
      </div>

      {done && (
        <div className="advisory" style={{ marginTop: 20, background: 'var(--green-dim)', borderColor: 'rgba(52,211,153,0.2)', color: 'var(--green-text)' }}>
          ✓ Screening complete! Redirecting to results…
        </div>
      )}
    </div>
  );
}
