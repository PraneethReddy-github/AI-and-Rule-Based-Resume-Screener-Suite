import React, { useMemo, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useAppStore } from '../store';
import { SkillPill, TierBadge, getScoreColor } from '../components/SkillPill';
import ScoreBar from '../components/ScoreBar';

function candidateName(fileName: string): string {
  return fileName.replace(/\.[^.]+$/, '').replace(/[_\-\.]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()).trim();
}

function highlightText(text: string, keywords: string[]): React.ReactNode {
  if (!keywords.length) return text;
  const pattern = keywords.map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  const regex = new RegExp(`(${pattern})`, 'gi');
  const parts = text.split(regex);
  return parts.map((part, i) => {
    if (regex.test(part)) return <mark key={i}>{part}</mark>;
    return part;
  });
}

export default function ResumeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const jdId = searchParams.get('jd');
  const { candidates, jobDescriptions } = useAppStore();
  const navigate = useNavigate();
  const [showRaw, setShowRaw] = useState(false);

  const candidate = useMemo(() => candidates.find((c) => c.id === id), [candidates, id]);
  const jd = useMemo(() => jdId ? jobDescriptions.find((j) => j.id === jdId) : undefined, [jobDescriptions, jdId]);

  if (!candidate) {
    return (
      <div className="page">
        <div className="empty-state">
          <div className="empty-icon">👤</div>
          <div className="empty-title">Candidate not found</div>
          <button className="btn btn-ghost" onClick={() => navigate(-1)}>← Go Back</button>
        </div>
      </div>
    );
  }

  const score = jdId ? candidate.scores[jdId] : Object.values(candidate.scores)[0];

  // Prev/Next navigation within same JD
  const jdCandidates = jdId
    ? candidates.filter((c) => c.scores[jdId]).sort((a, b) => b.scores[jdId].totalScore - a.scores[jdId].totalScore)
    : [];
  const currentIndex = jdCandidates.findIndex((c) => c.id === id);

  function navTo(index: number) {
    if (index < 0 || index >= jdCandidates.length) return;
    navigate(`/resume/${jdCandidates[index].id}${jdId ? `?jd=${jdId}` : ''}`);
  }

  const allKeywords = score
    ? [...score.matchedRequired, ...score.matchedNiceToHave]
    : [];

  const scoreColor = score ? getScoreColor(score.totalScore) : 'var(--text-secondary)';

  return (
    <div className="page">
      <button className="back-link" onClick={() => navigate(jdId ? `/results/${jdId}` : '/jobs')}>
        ← Back to Results
      </button>

      {/* Header */}
      <div className="detail-header">
        <div>
          <h1 className="detail-name">{candidateName(candidate.fileName)}</h1>
          <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 4, fontFamily: 'JetBrains Mono, monospace' }}>
            {candidate.fileName}
          </div>
          {jd && (
            <div style={{ marginTop: 10 }}>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Screened against: </span>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)' }}>{jd.title}</span>
            </div>
          )}
        </div>
        <div className="detail-score-badge">
          {score && (
            <>
              <div className="big-score" style={{ color: scoreColor }}>
                {Math.round(score.totalScore)}%
              </div>
              <TierBadge tier={score.tier} />
            </>
          )}
        </div>
      </div>

      {score ? (
        <>
          {/* Score Breakdown + Skill Match */}
          <div className="detail-grid">
            <div className="detail-section">
              <div className="detail-section-title">Score Breakdown</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {(
                  [
                    { label: 'Required Skills', value: score.requiredSkillScore },
                    { label: 'Experience', value: score.experienceScore },
                    { label: 'Education', value: score.educationScore },
                    { label: 'Nice-to-Have', value: score.niceToHaveScore },
                  ]
                ).map(({ label, value }) => (
                  <div key={label}>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>{label}</div>
                    <ScoreBar value={value} />
                  </div>
                ))}
              </div>
            </div>

            <div className="detail-section">
              <div className="detail-section-title">Skill Match</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {score.matchedRequired.map((s) => <SkillPill key={s} skill={s} variant="matched" />)}
                {score.missingRequired.map((s) => <SkillPill key={s} skill={s} variant="missing" />)}
              </div>
              {score.matchedNiceToHave.length > 0 && (
                <>
                  <div style={{ fontSize: 11, color: 'var(--text-tertiary)', margin: '12px 0 6px', textTransform: 'uppercase', letterSpacing: '0.4px', fontWeight: 700 }}>
                    Nice-to-Haves
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {score.matchedNiceToHave.map((s) => <SkillPill key={s} skill={s} variant="bonus" />)}
                    {score.missingNiceToHave.map((s) => <SkillPill key={s} skill={s} variant="extra" />)}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Highlights & Gaps */}
          <div className="detail-grid">
            <div className="detail-section">
              <div className="detail-section-title">✓ Highlights</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {score.matchedRequired.length > 0 && (
                  <div className="highlight-item">
                    <div className="highlight-dot" style={{ background: 'var(--green)' }} />
                    Matched {score.matchedRequired.length} of {score.matchedRequired.length + score.missingRequired.length} required skills
                  </div>
                )}
                {score.extractedYears != null && (
                  <div className="highlight-item">
                    <div className="highlight-dot" style={{ background: 'var(--green)' }} />
                    {score.extractedYears} years of experience detected
                  </div>
                )}
                {score.detectedEducation !== 'Not detected' && (
                  <div className="highlight-item">
                    <div className="highlight-dot" style={{ background: 'var(--green)' }} />
                    Education: {score.detectedEducation}
                  </div>
                )}
                {score.matchedNiceToHave.length > 0 && (
                  <div className="highlight-item">
                    <div className="highlight-dot" style={{ background: 'var(--blue)' }} />
                    {score.matchedNiceToHave.length} nice-to-have skill{score.matchedNiceToHave.length !== 1 ? 's' : ''} matched
                  </div>
                )}
                {score.matchedRequired.length === 0 && score.extractedYears == null && score.detectedEducation === 'Not detected' && (
                  <div style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>No significant highlights found.</div>
                )}
              </div>
            </div>

            <div className="detail-section">
              <div className="detail-section-title">✗ Gaps</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {score.missingRequired.map((s) => (
                  <div key={s} className="highlight-item">
                    <div className="highlight-dot" style={{ background: 'var(--red)' }} />
                    {s} not found in resume
                  </div>
                ))}
                {score.extractedYears == null && (
                  <div className="highlight-item">
                    <div className="highlight-dot" style={{ background: 'var(--amber)' }} />
                    Experience years could not be detected
                  </div>
                )}
                {score.detectedEducation === 'Not detected' && (
                  <div className="highlight-item">
                    <div className="highlight-dot" style={{ background: 'var(--amber)' }} />
                    No degree detected in resume
                  </div>
                )}
                {score.missingRequired.length === 0 && score.extractedYears != null && score.detectedEducation !== 'Not detected' && (
                  <div style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>No significant gaps — excellent match!</div>
                )}
              </div>
            </div>
          </div>

          {/* Extra Skills */}
          {score.extraSkills.length > 0 && (
            <div className="detail-section" style={{ marginBottom: 16 }}>
              <div className="detail-section-title">Extra Experience (beyond JD scope — informational)</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                {score.extraSkills.map((s) => <SkillPill key={s} skill={s} variant="extra" />)}
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="advisory">⚠ No score available for this candidate with the selected JD.</div>
      )}

      {/* Raw Text */}
      <div className="detail-section" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div className="detail-section-title">Extracted Resume Text</div>
          <button className="btn btn-ghost btn-sm" onClick={() => setShowRaw((v) => !v)}>
            {showRaw ? 'Hide' : 'View raw text'}
          </button>
        </div>
        {showRaw && (
          <div className="raw-text">
            {allKeywords.length > 0 ? highlightText(candidate.rawText, allKeywords) : candidate.rawText}
          </div>
        )}
      </div>

      {/* Prev / Next */}
      {jdCandidates.length > 1 && (
        <div className="nav-arrows">
          <button
            className="btn btn-ghost"
            disabled={currentIndex <= 0}
            onClick={() => navTo(currentIndex - 1)}
          >
            ◀ Previous
          </button>
          <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
            {currentIndex + 1} / {jdCandidates.length}
          </span>
          <button
            className="btn btn-ghost"
            disabled={currentIndex >= jdCandidates.length - 1}
            onClick={() => navTo(currentIndex + 1)}
          >
            Next ▶
          </button>
        </div>
      )}
    </div>
  );
}
