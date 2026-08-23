import React from 'react';

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

export function getScoreColor(score: number): string {
  if (score >= 80) return 'var(--green)';
  if (score >= 60) return 'var(--blue)';
  if (score >= 40) return 'var(--amber)';
  return 'var(--red)';
}
