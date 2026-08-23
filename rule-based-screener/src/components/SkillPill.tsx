import React from 'react';
import type { Tier } from '../types';

interface SkillPillProps {
  skill: string;
  variant: 'matched' | 'missing' | 'bonus' | 'extra';
}

const icons = {
  matched: '✓',
  missing: '✗',
  bonus: '✚',
  extra: '·',
};

const classes = {
  matched: 'pill pill-green',
  missing: 'pill pill-red',
  bonus: 'pill pill-blue',
  extra: 'pill pill-gray',
};

export function SkillPill({ skill, variant }: SkillPillProps) {
  return (
    <span className={classes[variant]}>
      {icons[variant]} {skill}
    </span>
  );
}

interface TierBadgeProps {
  tier: Tier;
}

const TIER_META: Record<Tier, { label: string; icon: string; cls: string }> = {
  top: { label: 'Top Candidate', icon: '⭐', cls: 'tier-top' },
  good: { label: 'Good Candidate', icon: '👍', cls: 'tier-good' },
  borderline: { label: 'Borderline', icon: '🔍', cls: 'tier-borderline' },
  rejected: { label: 'Not a Fit', icon: '✗', cls: 'tier-rejected' },
};

export function TierBadge({ tier }: TierBadgeProps) {
  const meta = TIER_META[tier];
  return (
    <span className={`tier-badge ${meta.cls}`}>
      {meta.icon} {meta.label}
    </span>
  );
}

export function getScoreColor(score: number): string {
  if (score >= 80) return 'var(--green)';
  if (score >= 60) return 'var(--blue)';
  if (score >= 40) return 'var(--amber)';
  return 'var(--red)';
}
