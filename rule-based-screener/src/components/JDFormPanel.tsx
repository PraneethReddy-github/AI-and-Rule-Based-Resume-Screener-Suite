import React, { useState } from 'react';
import type { JobDescription } from '../types';
import { useAppStore } from '../store';

interface JDFormPanelProps {
  jd?: JobDescription;
  onClose: () => void;
}

const DEFAULT_WEIGHTS = { required: 0.8, niceToHave: 0.3, experience: 0.6, education: 0.4 };

function uuid() {
  return crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);
}

export default function JDFormPanel({ jd, onClose }: JDFormPanelProps) {
  const { addJD, updateJD } = useAppStore();
  const isEdit = !!jd;

  const [title, setTitle] = useState(jd?.title ?? '');
  const [department, setDepartment] = useState(jd?.department ?? '');
  const [requiredSkills, setRequiredSkills] = useState(jd?.requiredSkills.join(', ') ?? '');
  const [niceToHaveSkills, setNiceToHaveSkills] = useState(jd?.niceToHaveSkills.join(', ') ?? '');
  const [minExp, setMinExp] = useState(String(jd?.minExperience ?? 2));
  const [maxExp, setMaxExp] = useState(String(jd?.maxExperience ?? 6));
  const [reqEdu, setReqEdu] = useState<JobDescription['requiredEducation']>(jd?.requiredEducation ?? 'bachelor');
  const [fullText, setFullText] = useState(jd?.fullText ?? '');
  const [weights, setWeights] = useState(jd?.weights ?? DEFAULT_WEIGHTS);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function parseSkills(raw: string): string[] {
    return raw.split(',').map((s) => s.trim()).filter(Boolean);
  }

  async function handleSave() {
    if (!title.trim()) { setError('Job title is required.'); return; }
    if (parseSkills(requiredSkills).length === 0) { setError('At least one required skill is needed.'); return; }
    setSaving(true);
    const payload: JobDescription = {
      id: jd?.id ?? uuid(),
      title: title.trim(),
      department: department.trim() || undefined,
      requiredSkills: parseSkills(requiredSkills),
      niceToHaveSkills: parseSkills(niceToHaveSkills),
      minExperience: parseInt(minExp) || 0,
      maxExperience: parseInt(maxExp) || 10,
      requiredEducation: reqEdu,
      fullText: fullText.trim() || undefined,
      weights,
      createdAt: jd?.createdAt ?? new Date().toISOString(),
      resumeCount: jd?.resumeCount ?? 0,
    };
    if (isEdit) await updateJD(payload);
    else await addJD(payload);
    setSaving(false);
    onClose();
  }

  const eduOptions: Array<{ value: JobDescription['requiredEducation']; label: string }> = [
    { value: 'any', label: 'Any' },
    { value: 'bachelor', label: "Bachelor's" },
    { value: 'master', label: "Master's" },
    { value: 'phd', label: 'PhD' },
  ];

  return (
    <>
      <div className="overlay" onClick={onClose} />
      <div className="panel">
        <div className="panel-header">
          <h2 className="panel-title">{isEdit ? 'Edit Job Description' : 'New Job Description'}</h2>
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
            <label className="form-label">Department</label>
            <input className="form-input" placeholder="e.g. Engineering" value={department} onChange={(e) => setDepartment(e.target.value)} />
          </div>

          <div className="form-group">
            <label className="form-label">Required Skills * <span style={{ color: 'var(--text-tertiary)', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(comma-separated)</span></label>
            <input className="form-input" placeholder="React, TypeScript, REST API, Git" value={requiredSkills} onChange={(e) => setRequiredSkills(e.target.value)} />
          </div>

          <div className="form-group">
            <label className="form-label">Nice-to-Have Skills <span style={{ color: 'var(--text-tertiary)', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(comma-separated)</span></label>
            <input className="form-input" placeholder="Next.js, GraphQL, Figma" value={niceToHaveSkills} onChange={(e) => setNiceToHaveSkills(e.target.value)} />
          </div>

          <div className="form-group">
            <label className="form-label">Required Experience (years)</label>
            <div className="form-row">
              <div>
                <input className="form-input" type="number" min="0" placeholder="Min" value={minExp} onChange={(e) => setMinExp(e.target.value)} />
              </div>
              <div>
                <input className="form-input" type="number" min="0" placeholder="Max" value={maxExp} onChange={(e) => setMaxExp(e.target.value)} />
              </div>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Required Education</label>
            <div className="radio-group">
              {eduOptions.map((opt) => (
                <label key={opt.value} className={`radio-option${reqEdu === opt.value ? ' selected' : ''}`}>
                  <input type="radio" name="edu" value={opt.value} checked={reqEdu === opt.value} onChange={() => setReqEdu(opt.value)} />
                  {opt.label}
                </label>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Full Job Description <span style={{ color: 'var(--text-tertiary)', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional — for deeper keyword matching)</span></label>
            <textarea className="form-textarea" placeholder="Paste the full JD text here for deeper keyword matching..." value={fullText} onChange={(e) => setFullText(e.target.value)} style={{ minHeight: 100 }} />
          </div>

          <div className="divider" />

          <div className="form-group">
            <label className="form-label">Scoring Weights</label>
            {(
              [
                { key: 'required', label: 'Required Skills' },
                { key: 'experience', label: 'Experience' },
                { key: 'education', label: 'Education' },
                { key: 'niceToHave', label: 'Nice-to-Have' },
              ] as const
            ).map(({ key, label }) => (
              <div className="weight-row" key={key}>
                <span className="weight-label">{label}</span>
                <input
                  type="range"
                  className="weight-slider"
                  min={0}
                  max={1}
                  step={0.05}
                  value={weights[key]}
                  onChange={(e) => setWeights((w) => ({ ...w, [key]: parseFloat(e.target.value) }))}
                />
                <span className="weight-value">{Math.round(weights[key] * 100)}%</span>
              </div>
            ))}
          </div>
        </div>

        <div className="panel-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? <><span className="spinner" style={{ width: 14, height: 14 }} /> Saving…</> : isEdit ? 'Save Changes' : 'Create JD'}
          </button>
        </div>
      </div>
    </>
  );
}
