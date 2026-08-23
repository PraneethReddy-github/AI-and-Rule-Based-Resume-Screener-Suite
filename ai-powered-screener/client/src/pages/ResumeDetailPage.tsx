import React, { useMemo, useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useAppStore } from '../store';
import { SkillPill, getScoreColor } from '../components/SkillPill';
import { ChatPanel } from '../components/ChatPanel';
import { MessageSquare, ChevronLeft, Sparkles, Bot, FileText } from 'lucide-react';

export default function ResumeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const jdId = searchParams.get('jd');
  const { selectedCandidate, jobDescriptions, loadCandidate, loadJDs } = useAppStore();
  const navigate = useNavigate();
  const [showRaw, setShowRaw] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);

  useEffect(() => {
    loadJDs();
    if (id) loadCandidate(id);
  }, [id]);

  const candidate = selectedCandidate;
  const jd = useMemo(() => jdId ? jobDescriptions.find((j) => j.id === jdId) : undefined, [jobDescriptions, jdId]);

  // Only show the full-page spinner if we don't have the candidate data yet
  if (!candidate) {
    return (
      <div className="page">
        <div className="empty-state">
          <div className="spinner" />
          <p style={{ marginTop: 12 }}>Loading Candidate Analysis...</p>
        </div>
      </div>
    );
  }

  const scoreColor = getScoreColor(candidate.total_score);

  return (
    <div className="page">
      <button className="back-link" onClick={() => navigate(jdId ? `/results/${jdId}` : '/jobs')}>
        ← Back to Results
      </button>

      <div className="detail-header">
        <div>
          <h1 className="detail-name">{candidate.name}</h1>
          <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 4, fontFamily: 'JetBrains Mono, monospace' }}>
            AI-Analyzed Candidate Profile
          </div>
          {jd && (
            <div style={{ marginTop: 10 }}>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Screened against: </span>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)' }}>{jd.title}</span>
            </div>
          )}
        </div>
        <div className="detail-score-badge">
          <div className="big-score" style={{ color: scoreColor }}>
            {Math.round(candidate.total_score)}%
          </div>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: scoreColor }}>
            {candidate.tier} Tier
          </div>
        </div>
      </div>

      <div className="detail-section" style={{ marginBottom: 20, background: 'var(--accent-dim)', borderColor: 'var(--accent-glow)' }}>
        <div className="detail-section-title" style={{ color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: 6 }}>
          <Sparkles className="w-3 h-3" /> AI Placement Rationale
        </div>
        <p style={{ fontSize: 15, color: 'var(--text-primary)', fontStyle: 'italic', lineHeight: 1.5 }}>
          "{candidate.placement_rationale}"
        </p>
      </div>

      <div className="detail-grid">
        <div className="detail-section">
          <div className="detail-section-title">✓ High Points</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {candidate.high_points?.map((p: string, i: number) => (
              <div key={i} className="highlight-item">
                <div className="highlight-dot" style={{ background: 'var(--green)' }} />
                {p}
              </div>
            ))}
          </div>
        </div>
        <div className="detail-section">
          <div className="detail-section-title">✗ Gaps & Risks</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {candidate.low_points?.map((p: string, i: number) => (
              <div key={i} className="highlight-item">
                <div className="highlight-dot" style={{ background: 'var(--red)' }} />
                {p}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="detail-grid">
        <div className="detail-section">
          <div className="detail-section-title">Skill Match</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {candidate.matched_required?.map((s: string) => <SkillPill key={s} skill={s} variant="matched" />)}
            {candidate.missing_required?.map((s: string) => <SkillPill key={s} skill={s} variant="missing" />)}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-tertiary)', margin: '16px 0 6px', textTransform: 'uppercase', letterSpacing: '0.4px', fontWeight: 700 }}>
            Bonus Skills
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {candidate.matched_nice_to_have?.map((s: string) => <SkillPill key={s} skill={s} variant="bonus" />)}
            {candidate.extra_skills?.map((s: string) => <SkillPill key={s} skill={s} variant="extra" />)}
          </div>
        </div>
        <div className="detail-section">
          <div className="detail-section-title">Suggested Interview Questions</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {candidate.interview_questions?.map((q: string, i: number) => (
              <div key={i} style={{ fontSize: 12, color: 'var(--text-secondary)', background: 'var(--bg-3)', padding: '10px 12px', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                {q}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="detail-section" style={{ marginBottom: 40 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div className="detail-section-title">Extracted Resume Text</div>
          <button className="btn btn-ghost btn-sm" onClick={() => setShowRaw(!showRaw)}>
            {showRaw ? 'Hide' : 'View Raw Text'}
          </button>
        </div>
        {showRaw && (
          <div className="raw-text">
            {candidate.resume_text}
          </div>
        )}
      </div>

      <div style={{ position: 'fixed', bottom: 30, right: 30 }}>
        <button className="btn btn-primary" style={{ padding: '12px 20px', borderRadius: 999, boxShadow: '0 8px 32px var(--accent-glow)' }} onClick={() => setIsChatOpen(true)}>
          <MessageSquare className="w-5 h-5" />
          Ask Agent about {candidate.name.split(' ')[0]}
        </button>
      </div>

      <ChatPanel 
        isOpen={isChatOpen} 
        onClose={() => setIsChatOpen(false)} 
        jdId={jdId!} 
      />
    </div>
  );
}
