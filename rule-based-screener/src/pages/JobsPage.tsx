import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store';
import type { JobDescription } from '../types';
import JDFormPanel from '../components/JDFormPanel';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function JobsPage() {
  const { jobDescriptions, removeJD, loading } = useAppStore();
  const navigate = useNavigate();
  const [panelOpen, setPanelOpen] = useState(false);
  const [editingJD, setEditingJD] = useState<JobDescription | undefined>();

  const openAdd = () => { setEditingJD(undefined); setPanelOpen(true); };
  const openEdit = (jd: JobDescription) => { setEditingJD(jd); setPanelOpen(true); };
  const closePanel = () => setPanelOpen(false);

  if (loading) return <div className="page"><div className="empty-state"><div className="spinner" /></div></div>;

  return (
    <div className="page">
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1 className="page-title">Job Descriptions</h1>
          <p className="page-subtitle">Create and manage JDs to screen candidates against.</p>
        </div>
        <button className="btn btn-primary" onClick={openAdd}>
          <span style={{ fontSize: 16 }}>+</span> Add New JD
        </button>
      </div>

      {jobDescriptions.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📋</div>
          <div className="empty-title">No Job Descriptions yet</div>
          <div className="empty-sub" style={{ marginBottom: 20 }}>Create your first JD to start screening resumes.</div>
          <button className="btn btn-primary" onClick={openAdd}>+ Create Job Description</button>
        </div>
      ) : (
        <div className="jd-grid">
          {jobDescriptions.map((jd) => (
            <div key={jd.id} className="jd-card">
              <div className="jd-card-icon">🗂</div>
              <div className="jd-card-title">{jd.title}</div>
              {jd.department && <div className="jd-card-dept">{jd.department}</div>}
              <div className="jd-card-meta">
                <span>Created {formatDate(jd.createdAt)}</span>
                <span>
                  {jd.resumeCount > 0
                    ? `${jd.resumeCount} resume${jd.resumeCount !== 1 ? 's' : ''} screened`
                    : 'No resumes screened yet'}
                </span>
                <span style={{ marginTop: 4 }}>
                  {jd.requiredSkills.slice(0, 3).map((s) => (
                    <span key={s} style={{ display: 'inline-block', background: 'var(--accent-dim)', color: 'var(--accent)', borderRadius: 999, padding: '1px 7px', fontSize: 11, marginRight: 4, marginTop: 4, fontWeight: 600 }}>
                      {s}
                    </span>
                  ))}
                  {jd.requiredSkills.length > 3 && (
                    <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>+{jd.requiredSkills.length - 3} more</span>
                  )}
                </span>
              </div>

              <div className="jd-card-actions">
                <button className="btn btn-ghost btn-sm" style={{ flex: 1 }} onClick={() => navigate(`/results/${jd.id}`)}>
                  View Results
                </button>
                <button className="btn btn-ghost btn-sm" onClick={() => openEdit(jd)}>
                  Edit
                </button>
                <button className="btn btn-danger btn-sm" onClick={async () => { if (confirm(`Delete "${jd.title}"?`)) await removeJD(jd.id); }}>
                  ✕
                </button>
              </div>
            </div>
          ))}

          {/* Add card */}
          <div className="jd-card jd-card-add" onClick={openAdd}>
            <div style={{ fontSize: 32, opacity: 0.4 }}>+</div>
            <span style={{ fontSize: 13, fontWeight: 600 }}>Add New JD</span>
          </div>
        </div>
      )}

      {panelOpen && <JDFormPanel jd={editingJD} onClose={closePanel} />}
    </div>
  );
}
