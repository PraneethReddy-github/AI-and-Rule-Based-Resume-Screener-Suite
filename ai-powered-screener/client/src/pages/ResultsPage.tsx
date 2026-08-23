import React, { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppStore } from '../store';
import type { Tier } from '../types';
import { SkillPill, getScoreColor } from '../components/SkillPill';
import { ChatPanel } from '../components/ChatPanel';
import { MessageSquare, Bot } from 'lucide-react';

const TIER_ORDER: Tier[] = ['top', 'good', 'borderline', 'rejected'];
const TIER_META: Record<Tier, { label: string; icon: string }> = {
  top: { label: 'Top Candidates', icon: '⭐' },
  good: { label: 'Good Candidates', icon: '👍' },
  borderline: { label: 'Borderline', icon: '🔍' },
  rejected: { label: 'Not a Fit', icon: '✗' },
};

interface TierSectionProps {
  tier: Tier;
  candidates: any[];
  jdId: string;
}

function TierSection({ tier, candidates, jdId }: TierSectionProps) {
  const [open, setOpen] = useState(tier === 'top' || candidates.length > 0);
  const navigate = useNavigate();
  const meta = TIER_META[tier];

  return (
    <div className={`accordion${open ? ' open' : ''}`}>
      <div className="accordion-header" onClick={() => setOpen(!open)}>
        <span style={{ fontSize: 18 }}>{meta.icon}</span>
        <span className="accordion-title">{meta.label}</span>
        <span className="accordion-count">({candidates.length})</span>
        <svg className="accordion-chevron" width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path d="M3.5 6l4.5 4.5L12.5 6" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
      <div className="accordion-body">
        {candidates.length === 0 ? (
          <div style={{ padding: '20px 18px', fontSize: 13, color: 'var(--text-tertiary)', textAlign: 'center' }}>
            No candidates in this tier.
          </div>
        ) : (
          candidates.map((c, i) => (
            <div key={c.id} className="candidate-card">
              <span className="candidate-rank">#{i + 1}</span>

              <div className="candidate-info">
                <div className="candidate-name">{c.name}</div>
                <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>
                  {c.detected_years != null ? `${c.detected_years} yrs exp` : 'Exp: N/A'}
                  {'  ·  '}
                  {c.detected_education}
                </div>
                {c.placement_rationale && (
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 6, fontStyle: 'italic', borderLeft: '2px solid var(--accent-dim)', paddingLeft: 10 }}>
                    "{c.placement_rationale}"
                  </div>
                )}
                <div className="candidate-skills" style={{ marginTop: 8 }}>
                  {c.matched_required?.slice(0, 4).map((s: string) => <SkillPill key={s} skill={s} variant="matched" />)}
                  {c.missing_required?.slice(0, 2).map((s: string) => <SkillPill key={s} skill={s} variant="missing" />)}
                </div>
              </div>

              <div className="candidate-meta">
                <div
                  className="score-circle"
                  style={{
                    border: `3px solid ${getScoreColor(c.total_score)}`,
                    color: getScoreColor(c.total_score),
                    background: `${getScoreColor(c.total_score)}15`,
                  }}
                >
                  {Math.round(c.total_score)}
                </div>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => navigate(`/resume/${c.id}?jd=${jdId}`)}
                >
                  Details →
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default function ResultsPage() {
  const { jdId } = useParams<{ jdId: string }>();
  const { jobDescriptions, currentResults, loadResults, loadJDs } = useAppStore();
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadJDs();
    if (jdId) loadResults(jdId);
  }, [jdId]);

  const jd = jdId ? jobDescriptions.find(j => j.id === jdId) : null;

  const filtered = useMemo(() => {
    if (!search.trim()) return currentResults;
    return currentResults.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));
  }, [currentResults, search]);

  const byTier = useMemo(() => {
    const map: Record<Tier, any[]> = { top: [], good: [], borderline: [], rejected: [] };
    filtered.forEach(c => {
      if (map[c.tier as Tier]) map[c.tier as Tier].push(c);
    });
    return map;
  }, [filtered]);

  if (!jd) return <div className="page"><div className="spinner" /></div>;

  return (
    <div className="page">
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1 className="page-title">Results: {jd.title}</h1>
          <p className="page-subtitle">
            <span style={{ color: 'var(--accent)', fontWeight: 600 }}>🤖 AI Screening Mode</span>
            {'  ·  '}
            {currentResults.length} resumes screened
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-primary" onClick={() => setIsChatOpen(true)}>
            <MessageSquare className="w-4 h-4" /> Ask Agent
          </button>
        </div>
      </div>

      <div className="toolbar">
        <div className="search-input-wrap">
          <span className="search-icon">🔍</span>
          <input 
            className="search-input" 
            placeholder="Search candidates…" 
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
          />
        </div>
      </div>

      <div className="results-content">
        {TIER_ORDER.map(tier => (
          <TierSection 
            key={tier} 
            tier={tier} 
            candidates={byTier[tier]} 
            jdId={jdId!} 
          />
        ))}
      </div>

      <ChatPanel 
        isOpen={isChatOpen} 
        onClose={() => setIsChatOpen(false)} 
        jdId={jdId!} 
      />
    </div>
  );
}
