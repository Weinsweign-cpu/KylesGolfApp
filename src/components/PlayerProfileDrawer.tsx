'use client';

import { useEffect } from 'react';
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
} from 'recharts';
import type { PlayerProfile } from '@/lib/datagolf';

function formatName(dgName: string): string {
  if (!dgName.includes(',')) return dgName;
  const [last, rest] = dgName.split(',', 2);
  return rest.trim() + ' ' + last.trim();
}

function sg(n: number | undefined): string {
  if (n == null || isNaN(n)) return '—';
  return (n >= 0 ? '+' : '') + n.toFixed(3);
}

type Props = {
  profile: PlayerProfile;
  onClose: () => void;
};

export default function PlayerProfileDrawer({ profile, onClose }: Props) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const { skillRating, decomposition } = profile;
  const name = formatName(profile.player_name);

  const radarData = skillRating
    ? [
        { subject: 'OTT', value: (skillRating.sg_ott ?? 0) + 1 },
        { subject: 'APP', value: (skillRating.sg_app ?? 0) + 1 },
        { subject: 'ARG', value: (skillRating.sg_arg ?? 0) + 1 },
        { subject: 'PUTT', value: (skillRating.sg_putt ?? 0) + 1 },
      ]
    : null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.6)',
          zIndex: 40,
        }}
      />

      {/* Drawer panel */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          width: '480px',
          height: '100vh',
          background: 'var(--bg-secondary)',
          borderLeft: '1px solid var(--border)',
          zIndex: 50,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '24px 24px 20px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: '16px',
          }}
        >
          <div>
            <div
              className="font-mono"
              style={{
                fontSize: '10px',
                color: 'var(--text-tertiary)',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                marginBottom: '6px',
              }}
            >
              DataGolf Skill Profile
            </div>
            <div
              className="font-display"
              style={{ fontSize: '28px', fontWeight: 600, letterSpacing: '-0.02em', lineHeight: 1.1 }}
            >
              {name}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: '1px solid var(--border)',
              borderRadius: '6px',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              fontSize: '18px',
              lineHeight: 1,
              padding: '6px 10px',
              marginTop: '4px',
              flexShrink: 0,
            }}
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Card 1: SG Profile */}
          <div
            style={{
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border)',
              borderRadius: '10px',
              padding: '20px',
            }}
          >
            <div
              className="font-mono"
              style={{
                fontSize: '10px',
                color: 'var(--text-tertiary)',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                marginBottom: '16px',
              }}
            >
              Strokes Gained Profile
            </div>

            {radarData ? (
              <>
                <ResponsiveContainer width="100%" height={220}>
                  <RadarChart data={radarData} margin={{ top: 8, right: 24, bottom: 8, left: 24 }}>
                    <PolarGrid stroke="var(--border)" />
                    <PolarAngleAxis
                      dataKey="subject"
                      tick={{ fill: 'var(--text-secondary)', fontSize: 11, fontFamily: 'IBM Plex Mono' }}
                    />
                    <Radar
                      dataKey="value"
                      stroke="var(--edge)"
                      fill="var(--edge)"
                      fillOpacity={0.3}
                      dot={false}
                    />
                  </RadarChart>
                </ResponsiveContainer>

                {/* 4 stat boxes */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '12px' }}>
                  {[
                    { label: 'Off Tee', value: sg(skillRating?.sg_ott) },
                    { label: 'Approach', value: sg(skillRating?.sg_app) },
                    { label: 'Around Green', value: sg(skillRating?.sg_arg) },
                    { label: 'Putting', value: sg(skillRating?.sg_putt) },
                  ].map(({ label, value }) => (
                    <div
                      key={label}
                      style={{
                        background: 'var(--bg-secondary)',
                        border: '1px solid var(--border)',
                        borderRadius: '6px',
                        padding: '10px 12px',
                      }}
                    >
                      <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '4px' }}>
                        {label}
                      </div>
                      <div
                        className="font-mono tabular"
                        style={{
                          fontSize: '16px',
                          fontWeight: 500,
                          color: value.startsWith('+') ? 'var(--positive)' : value === '—' ? 'var(--text-secondary)' : 'var(--negative)',
                        }}
                      >
                        {value}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div style={{ color: 'var(--text-secondary)', fontSize: '13px', padding: '8px 0' }}>
                No skill ratings available for this player.
              </div>
            )}
          </div>

          {/* Card 2: This Week's Prediction */}
          {decomposition && (
            <div
              style={{
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--border)',
                borderRadius: '10px',
                padding: '20px',
              }}
            >
              <div
                className="font-mono"
                style={{
                  fontSize: '10px',
                  color: 'var(--text-tertiary)',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  marginBottom: '16px',
                }}
              >
                This Week&apos;s Prediction
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                {[
                  { label: 'Baseline Skill', value: sg(decomposition.baseline_pred) },
                  { label: 'Total Predicted SG', value: sg(decomposition.final_pred) },
                  { label: 'Course Fit Adjustment', value: sg(decomposition.total_fit_adjustment) },
                  { label: 'Course History Adjustment', value: sg(decomposition.total_course_history_adjustment ?? decomposition.course_history_adjustment) },
                ].map(({ label, value }, i, arr) => (
                  <div
                    key={label}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '10px 0',
                      borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none',
                    }}
                  >
                    <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{label}</span>
                    <span
                      className="font-mono tabular"
                      style={{
                        fontSize: '14px',
                        fontWeight: 500,
                        color: value.startsWith('+') ? 'var(--positive)' : value === '—' ? 'var(--text-secondary)' : 'var(--negative)',
                      }}
                    >
                      {value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Card 3: Course Fit Breakdown */}
          {decomposition && (
            <div
              style={{
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--border)',
                borderRadius: '10px',
                padding: '20px',
              }}
            >
              <div
                className="font-mono"
                style={{
                  fontSize: '10px', color: 'var(--text-tertiary)',
                  letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '16px',
                }}
              >
                Course Fit Breakdown
              </div>

              {[
                {
                  label: 'Course Fit',
                  value: decomposition.total_fit_adjustment,
                  hasData: decomposition.total_fit_adjustment != null,
                  noDataMsg: null,
                  interp: (v: number) =>
                    v > 0.15 ? "Strong fit — this course suits their game" :
                    v > 0.05 ? "Slight positive fit" :
                    v > -0.05 ? "Neutral fit" :
                    v > -0.15 ? "Slight negative fit" :
                    "Poor fit — this course doesn't reward their strengths",
                },
                {
                  label: 'Course History',
                  value: decomposition.course_history_adjustment,
                  hasData: decomposition.course_history_adjustment != null,
                  noDataMsg: "No prior rounds at this venue",
                  interp: (v: number) =>
                    v > 0.15 ? "Excellent record at this venue" :
                    v > 0.05 ? "Above average history" :
                    v > -0.05 ? "Average / limited history" :
                    v > -0.15 ? "Below average history" :
                    "Has struggled at this venue",
                },
              ].map(({ label, value, hasData, noDataMsg, interp }) => (
                <div key={label} style={{ marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{label}</span>
                    {hasData && (
                      <span
                        className="font-mono"
                        style={{
                          fontSize: '12px', fontWeight: 500,
                          color: value > 0 ? 'var(--positive)' : value < 0 ? 'var(--negative)' : 'var(--text-secondary)',
                        }}
                      >
                        {value >= 0 ? '+' : ''}{value.toFixed(3)}
                      </span>
                    )}
                  </div>
                  {!hasData ? (
                    <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{noDataMsg}</div>
                  ) : (
                    <>
                      <div style={{ height: '6px', background: 'var(--bg-secondary)', borderRadius: '3px', position: 'relative', marginBottom: '6px' }}>
                        <div style={{ position: 'absolute', left: '50%', top: 0, width: '1px', height: '100%', background: 'var(--border)' }} />
                        {value >= 0 ? (
                          <div style={{
                            position: 'absolute', left: '50%',
                            width: `${Math.min(50, (Math.abs(value) / 0.5) * 50)}%`,
                            height: '100%', background: 'var(--positive)', borderRadius: '0 3px 3px 0',
                          }} />
                        ) : (
                          <div style={{
                            position: 'absolute', right: '50%',
                            width: `${Math.min(50, (Math.abs(value) / 0.5) * 50)}%`,
                            height: '100%', background: 'var(--negative)', borderRadius: '3px 0 0 3px',
                          }} />
                        )}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontStyle: 'italic' }}>
                        {interp(value)}
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Footer: Overall SG Total */}
          {skillRating && (
            <div
              className="font-mono"
              style={{
                fontSize: '12px',
                color: 'var(--text-tertiary)',
                textAlign: 'center',
                padding: '4px 0 8px',
              }}
            >
              Overall SG Total: {sg(skillRating.sg_total)} strokes/round vs PGA Tour average
            </div>
          )}
        </div>
      </div>
    </>
  );
}
