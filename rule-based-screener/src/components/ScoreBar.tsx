import React from 'react';

interface ScoreBarProps {
  value: number; // 0-100
  label?: string;
}

function getColor(value: number): string {
  if (value >= 80) return 'var(--green)';
  if (value >= 60) return 'var(--blue)';
  if (value >= 40) return 'var(--amber)';
  return 'var(--red)';
}

export default function ScoreBar({ value, label }: ScoreBarProps) {
  const color = getColor(value);
  return (
    <div className="score-bar-container">
      <div className="score-bar-track">
        <div
          className="score-bar-fill"
          style={{ width: `${value}%`, background: color }}
        />
      </div>
      <span className="score-bar-label" style={{ color }}>
        {label ?? `${Math.round(value)}%`}
      </span>
    </div>
  );
}
