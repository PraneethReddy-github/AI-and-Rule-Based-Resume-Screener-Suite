import React, { useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAppStore } from '../store';
import type { Candidate, CandidateScore, Tier } from '../types';
import { SkillPill, TierBadge, getScoreColor } from '../components/SkillPill';
import ScoreBar from '../components/ScoreBar';

const TIER_ORDER: Tier[] = ['top', 'good', 'borderline', 'rejected'];
const TIER_META: Record<Tier, { label: string; icon: string; advisory?: string }> = {
  top: { label: 'Top Candidates', icon: '⭐' },
  good: { label: 'Good Candidates', icon: '👍' },
  borderline: { label: 'Borderline', icon: '🔍' },
  rejected: { label: 'Not a Fit', icon: '✗' },
};

function candidateName(fileName: string): string {
  return fileName
    .replace(/\.[^.]+$/, '')           // remove extension
    .replace(/[_\-\.]/g, ' ')          // replace separators
    .replace(/\b\w/g, (c) => c.toUpperCase()) // title case
    .trim();
}

function exportCSV(candidates: Candidate[], jdId: string, jdTitle: string) {
  const rows = candidates
    .filter((c) => c.scores[jdId])
    .sort((a, b) => b.scores[jdId].totalScore - a.scores[jdId].totalScore)
    .map((c, i) => {
      const s = c.scores[jdId];
      return [
        i + 1,
        candidateName(c.fileName),
        s.totalScore.toFixed(1),
        s.tier,
        s.matchedRequired.join('; '),
        s.missingRequired.join('; '),
        s.extractedYears ?? 'N/A',
        s.detectedEducation,
      ].join(',');
    });
  const header = 'Rank,Name,Score,Tier,Matched Skills,Missing Skills,Experience (yrs),Education';
  const csv = [header, ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${jdTitle.replace(/\s+/g, '_')}_results.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

interface TierSectionProps {
  tier: Tier;
  candidates: Array<{ candidate: Candidate; score: CandidateScore; rank: number }>;
  jdId: string;
  startOpen?: boolean;
}

function TierSection({ tier, candidates, jdId, startOpen = false }: TierSectionProps) {
  const [open, setOpen] = useState(startOpen || tier === 'top');
  const navigate = useNavigate();
  const meta = TIER_META[tier];

  return (
    <div className={`accordion${open ? ' open' : ''}`}>
      <div className="accordion-header" onClick={() => setOpen((o) => !o)}>
        <span style={{ fontSize: 18 }}>{meta.icon}</span>
        <span className="accordion-title">{meta.label}</span>
        <span className="accordion-count">({candidates.length})</span>
        {candidates.length === 0 && tier === 'top' && (
          <span style={{ fontSize: 12, color: 'var(--amber)', marginLeft: 8 }}>— consider relaxing requirements</span>
        )}
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
          candidates.map(({ candidate, score, rank }) => (
            <div key={candidate.id} className="candidate-card">
              <span className="candidate-rank">#{rank}</span>

              <div className="candidate-info">
                <div className="candidate-name">{candidateName(candidate.fileName)}</div>
                <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>
                  {score.extractedYears != null ? `${score.extractedYears} yrs exp` : 'Exp: N/A'}
                  {'  ·  '}
                  {score.detectedEducation}
                </div>
                <div className="candidate-skills" style={{ marginTop: 6 }}>
                  {score.matchedRequired.slice(0, 4).map((s) => <SkillPill key={s} skill={s} variant="matched" />)}
                  {score.missingRequired.slice(0, 2).map((s) => <SkillPill key={s} skill={s} variant="missing" />)}
                  {score.matchedNiceToHave.slice(0, 2).map((s) => <SkillPill key={s} skill={s} variant="bonus" />)}
                </div>
              </div>

              <div className="candidate-meta">
                <div
                  className="score-circle"
                  style={{
                    border: `3px solid ${getScoreColor(score.totalScore)}`,
                    color: getScoreColor(score.totalScore),
                    background: `${getScoreColor(score.totalScore)}15`,
                  }}
                >
                  {Math.round(score.totalScore)}
                </div>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => navigate(`/resume/${candidate.id}?jd=${jdId}`)}
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
  const { jobDescriptions, candidates } = useAppStore();
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'score' | 'name'>('score');

  const jd = jdId ? jobDescriptions.find((j) => j.id === jdId) : undefined;

  const scored = useMemo(() => {
    if (!jdId) return [];
    return candidates
      .filter((c) => c.scores[jdId])
      .map((c) => ({ candidate: c, score: c.scores[jdId] }));
  }, [candidates, jdId]);

  const filtered = useMemo(() => {
    let list = scored;
    if (search.trim()) {
      list = list.filter((item) =>
        candidateName(item.candidate.fileName).toLowerCase().includes(search.toLowerCase())
      );
    }
    if (sortBy === 'score') list = [...list].sort((a, b) => b.score.totalScore - a.score.totalScore);
    else list = [...list].sort((a, b) => candidateName(a.candidate.fileName).localeCompare(candidateName(b.candidate.fileName)));
    return list;
  }, [scored, search, sortBy]);

  // Compute global rank (before filter)
  const rankedAll = useMemo(() => {
    return [...scored].sort((a, b) => b.score.totalScore - a.score.totalScore);
  }, [scored]);

  const byTier = useMemo(() => {
    const map: Record<Tier, Array<{ candidate: Candidate; score: CandidateScore; rank: number }>> = {
      top: [], good: [], borderline: [], rejected: [],
    };
    for (const item of filtered) {
      const rank = rankedAll.findIndex((r) => r.candidate.id === item.candidate.id) + 1;
      map[item.score.tier].push({ ...item, rank });
    }
    return map;
  }, [filtered, rankedAll]);

  if (!jd) {
    return (
      <div className="page">
        <div className="empty-state">
          <div className="empty-icon">🔍</div>
          <div className="empty-title">Job description not found</div>
          <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => navigate('/jobs')}>Go to Jobs</button>
        </div>
      </div>
    );
  }

  const screenedDate = scored.length > 0
    ? new Date(Math.max(...scored.map((s) => new Date(s.candidate.parsedAt).getTime()))).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
    : null;

  return (
    <div className="page">
      <button className="back-link" onClick={() => navigate('/jobs')}>← Jobs</button>

      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1 className="page-title">Results: {jd.title}</h1>
          <p className="page-subtitle">
            {screenedDate && `${screenedDate}  ·  `}
            {scored.length} resume{scored.length !== 1 ? 's' : ''} screened
          </p>
        </div>
        {scored.length > 0 && (
          <button className="btn btn-ghost btn-sm" onClick={() => exportCSV(candidates, jd.id, jd.title)}>
            ↓ Export CSV
          </button>
        )}
      </div>

      {scored.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📊</div>
          <div className="empty-title">No resumes screened yet</div>
          <div className="empty-sub" style={{ marginBottom: 20 }}>Upload resumes and select this JD to see results here.</div>
          <button className="btn btn-primary" onClick={() => navigate('/upload')}>Upload Resumes</button>
        </div>
      ) : (
        <>
          <div className="toolbar">
            <div className="search-input-wrap">
              <span className="search-icon">🔍</span>
              <input className="search-input" placeholder="Search candidates…" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <select
              className="form-select"
              style={{ width: 'auto', flexShrink: 0 }}
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'score' | 'name')}
            >
              <option value="score">Sort: Score</option>
              <option value="name">Sort: Name</option>
            </select>
          </div>

          {TIER_ORDER.map((tier) => (
            <TierSection
              key={tier}
              tier={tier}
              candidates={byTier[tier]}
              jdId={jd.id}
              startOpen={tier === 'top'}
            />
          ))}
        </>
      )}
    </div>
  );
}
