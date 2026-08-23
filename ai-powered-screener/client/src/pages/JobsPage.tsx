import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store';
import type { JobDescription } from '../types';
import JDFormPanel from '../components/JDFormPanel';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function JobsPage() {
  const { jobDescriptions, loadJDs, loading } = useAppStore();
  const navigate = useNavigate();
  const [panelOpen, setPanelOpen] = useState(false);
  const [editingJD, setEditingJD] = useState<JobDescription | undefined>();

  useEffect(() => {
    loadJDs();
  }, []);

  const openAdd = () => { setEditingJD(undefined); setPanelOpen(true); };
  const openEdit = (jd: JobDescription) => { setEditingJD(jd); setPanelOpen(true); };
  const closePanel = () => setPanelOpen(false);

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
    <div className="page">
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1 className="page-title">Job Descriptions</h1>
          <p className="page-subtitle">Manage your roles and AI evaluation rubrics.</p>
        </div>
        <button className="btn btn-primary" onClick={openAdd}>
          <span style={{ fontSize: 16 }}>+</span> Add New JD
        </button>
      </div>

      {jobDescriptions.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📋</div>
          <div className="empty-title">No Job Descriptions yet</div>
          <div className="empty-sub" style={{ marginBottom: 20 }}>Create your first JD to start screening resumes with Gemini AI.</div>
          <button className="btn btn-primary" onClick={openAdd}>+ Create Job Description</button>
        </div>
      ) : (
        <div className="jd-grid">
          {jobDescriptions.map((jd) => (
            <div key={jd.id} className="jd-card" onClick={() => navigate(`/results/${jd.id}`)}>
              <div className="jd-card-icon">🗂</div>
              <div className="jd-card-title">{jd.title}</div>
              <div className="jd-card-meta">
                <span>Created {formatDate(jd.created_at)}</span>
                <span style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 6, height: 6, background: 'var(--green)', borderRadius: '50%' }} />
                  AI Powered Screening
                </span>
              </div>

              <div className="jd-card-actions" onClick={(e) => e.stopPropagation()}>
                <button className="btn btn-ghost btn-sm" style={{ flex: 1 }} onClick={() => navigate(`/results/${jd.id}`)}>
                  View Results
                </button>
                <button className="btn btn-ghost btn-sm" onClick={() => openEdit(jd)}>
                  Edit
                </button>
              </div>
            </div>
          ))}

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
