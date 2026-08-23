import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAppStore } from '../store';
import { Sparkles, Bot } from 'lucide-react';

const BriefcaseIcon = () => (
  <svg className="nav-item-icon" viewBox="0 0 20 20" fill="currentColor">
    <path d="M6 6V5a3 3 0 016 0v1h2a2 2 0 012 2v3.57A22.952 22.952 0 0110 13a22.95 22.95 0 01-8-1.43V8a2 2 0 012-2h2zm2-1a1 1 0 012 0v1H8V5zm-2 9a22.925 22.925 0 008 0V14a2 2 0 01-2 2H6a2 2 0 01-2-2v-1z"/>
  </svg>
);

const UploadIcon = () => (
  <svg className="nav-item-icon" viewBox="0 0 20 20" fill="currentColor">
    <path d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z"/>
  </svg>
);

const ChartIcon = () => (
  <svg className="nav-item-icon" viewBox="0 0 20 20" fill="currentColor">
    <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z"/>
  </svg>
);

export default function Sidebar() {
  const { jobDescriptions } = useAppStore();

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">
          <Sparkles className="w-4 h-4 text-white" />
        </div>
        <div>
          <div className="sidebar-logo-text">AI SCREENER</div>
          <div className="sidebar-logo-sub">Powered by Gemini</div>
        </div>
      </div>

      <nav className="sidebar-nav">
        <NavLink to="/jobs" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
          <BriefcaseIcon />
          Job Descriptions
          <span className="nav-badge">{jobDescriptions.length}</span>
        </NavLink>

        <NavLink to="/upload" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
          <UploadIcon />
          Upload Resumes
        </NavLink>

        {jobDescriptions.length > 0 && (
          <>
            <div style={{ height: 1, background: 'var(--border)', margin: '10px 4px' }} />
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-tertiary)', padding: '4px 12px 2px' }}>
              Results
            </div>
            {jobDescriptions.map((jd) => (
              <NavLink
                key={jd.id}
                to={`/results/${jd.id}`}
                className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
              >
                <ChartIcon />
                <span style={{ overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                  {jd.title}
                </span>
                {(jd.resumeCount ?? 0) > 0 && <span className="nav-badge">{jd.resumeCount}</span>}
              </NavLink>
            ))}
          </>
        )}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-status">
          <div className="sidebar-status-header">
            <Bot className="nav-item-icon" style={{ width: 14, height: 14, color: 'var(--accent)' }} />
            <span className="sidebar-status-title">Agent Active</span>
          </div>
          <p className="sidebar-status-text">
            Resumes are evaluated via Gemini 2.0 Flash for deep fit analysis.
          </p>
        </div>
      </div>
    </aside>
  );
}
