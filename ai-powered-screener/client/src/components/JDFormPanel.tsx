import React, { useState } from 'react';
import type { JobDescription } from '../types';
import { useAppStore } from '../store';

interface JDFormPanelProps {
  jd?: JobDescription;
  onClose: () => void;
}

export default function JDFormPanel({ jd, onClose }: JDFormPanelProps) {
  const { addJD, loading } = useAppStore();
  const isEdit = !!jd;

  const [title, setTitle] = useState(jd?.title ?? '');
  const [description, setDescription] = useState(jd?.description ?? '');
  const [error, setError] = useState('');

  async function handleSave() {
    if (!title.trim()) { setError('Job title is required.'); return; }
    if (!description.trim()) { setError('Job description is required.'); return; }
    
    await addJD(title.trim(), description.trim());
    onClose();
  }

  return (
    <>
      <div className="overlay" onClick={onClose} />
      <div className="panel">
        <div className="panel-header">
          <h2 className="panel-title">{isEdit ? 'Edit Job Description' : 'New AI-Powered JD'}</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose} style={{ padding: '4px 8px' }}>✕</button>
        </div>

        <div className="panel-body">
          {error && (
            <div style={{ background: 'var(--red-dim)', color: 'var(--red)', borderRadius: 'var(--radius)', padding: '10px 14px', marginBottom: 16, fontSize: 13, border: '1px solid rgba(248,113,113,0.2)' }}>
              {error}
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Job Title *</label>
            <input className="form-input" placeholder="e.g. Senior Frontend Developer" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>

          <div className="form-group">
            <label className="form-label">Full Job Description *</label>
            <p style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 8 }}>Paste the entire JD. Gemini will automatically extract required skills and create a semantic evaluation profile.</p>
            <textarea 
              className="form-textarea" 
              placeholder="Paste the full job requirements here..." 
              value={description} 
              onChange={(e) => setDescription(e.target.value)} 
              style={{ minHeight: 300 }}
            />
          </div>

          <div className="divider" />

          <div style={{ background: 'var(--accent-dim)', padding: '12px', borderRadius: 'var(--radius)', border: '1px solid var(--accent-glow)' }}>
            <p style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 600 }}>✨ Gemini AI Insight</p>
            <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>
              Upon saving, Gemini will generate an AI Role Profile used to evaluate resumes beyond simple keywords.
            </p>
          </div>
        </div>

        <div className="panel-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={loading}>
            {loading ? <><div className="spinner" style={{ width: 14, height: 14 }} /> Processing…</> : isEdit ? 'Save Changes' : 'Create JD'}
          </button>
        </div>
      </div>
    </>
  );
}
