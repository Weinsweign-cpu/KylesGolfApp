'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import type { EventResults, PlayerProfile } from '@/lib/datagolf';

const PlayerProfileDrawer = dynamic(() => import('./PlayerProfileDrawer'), { ssr: false });

function formatName(dgName: string): string {
  if (!dgName.includes(',')) return dgName;
  const [last, rest] = dgName.split(',', 2);
  return rest.trim() + ' ' + last.trim();
}

function pct(n: number | undefined): string {
  if (n == null || isNaN(n)) return '—';
  return (n * 100).toFixed(1) + '%';
}

function sgFmt(n: number | undefined): string {
  if (n == null) return '—';
  return (n >= 0 ? '+' : '') + n.toFixed(2);
}

function scoreFmt(n: number | undefined): string {
  if (n == null) return '—';
  if (n === 0) return 'E';
  return (n > 0 ? '+' : '') + n;
}

function posColor(pos: string): string {
  const u = pos.toUpperCase();
  if (u === '1' || u === 'T1') return 'var(--positive)';
  if (u === 'MC' || u === 'CUT' || u === 'WD' || u === 'DQ') return 'var(--text-tertiary)';
  return 'var(--text-primary)';
}

function sgColor(n: number | undefined): string {
  if (n == null) return 'var(--text-secondary)';
  return n >= 0 ? 'var(--positive)' : 'var(--negative)';
}

type Props = {
  results: EventResults | null;
  loading: boolean;
};

export default function ResultsTable({ results, loading }: Props) {
  const [showSg, setShowSg] = useState(false);
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [loadingId, setLoadingId] = useState<number | null>(null);

  async function handleRowClick(dgId: number) {
    if (loadingId !== null) return;
    setLoadingId(dgId);
    try {
      const res = await fetch(`/api/player/${dgId}`);
      const data: PlayerProfile = await res.json();
      setProfile(data);
    } finally {
      setLoadingId(null);
    }
  }

  const thStyle: React.CSSProperties = {
    padding: '12px 16px',
    textAlign: 'right',
    fontSize: '11px',
    fontWeight: 500,
    color: 'var(--text-tertiary)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  };
  const thLeft: React.CSSProperties = { ...thStyle, textAlign: 'left' };

  if (loading && !results) {
    return (
      <div style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border)',
        borderRadius: '12px',
        padding: '40px',
        textAlign: 'center',
        color: 'var(--text-tertiary)',
        fontSize: '13px',
      }}>
        Loading results...
      </div>
    );
  }

  if (!results || !('players' in results) || results.players.length === 0) {
    return (
      <div style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border)',
        borderRadius: '12px',
        padding: '40px',
        textAlign: 'center',
        color: 'var(--text-tertiary)',
        fontSize: '13px',
      }}>
        No results available for this event.
      </div>
    );
  }

  const isLive = results.type === 'live';

  return (
    <>
      {loadingId !== null && (
        <div className="font-mono" style={{
          position: 'fixed', top: '16px', right: '16px',
          background: 'var(--bg-tertiary)', border: '1px solid var(--border)',
          borderRadius: '6px', padding: '8px 14px', fontSize: '12px',
          color: 'var(--text-secondary)', zIndex: 60,
        }}>
          Loading profile...
        </div>
      )}

      {profile && <PlayerProfileDrawer profile={profile} onClose={() => setProfile(null)} />}

      <div style={{ opacity: loading ? 0.5 : 1, transition: 'opacity 0.2s' }}>
        {/* SG toggle — only show when relevant */}
        {(isLive && results.has_sg_data) || !isLive ? (
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '10px' }}>
            <label style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              cursor: 'pointer', userSelect: 'none',
            }}>
              <span className="font-mono" style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                {isLive ? 'Show Strokes Gained' : 'Show Pre-Tournament Odds'}
              </span>
              <div
                onClick={() => setShowSg(s => !s)}
                style={{
                  width: '32px', height: '18px',
                  background: showSg ? 'var(--edge)' : 'var(--bg-tertiary)',
                  border: '1px solid var(--border)',
                  borderRadius: '9px', position: 'relative', cursor: 'pointer',
                  transition: 'background 0.15s',
                }}
              >
                <div style={{
                  position: 'absolute', top: '2px',
                  left: showSg ? '14px' : '2px',
                  width: '12px', height: '12px',
                  background: 'var(--text-primary)',
                  borderRadius: '50%',
                  transition: 'left 0.15s',
                }} />
              </div>
            </label>
          </div>
        ) : null}

        <div style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          overflow: 'hidden',
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
            <thead style={{ background: 'var(--bg-tertiary)' }}>
              <tr>
                <th style={{ ...thLeft, width: '60px' }}>Pos</th>
                <th style={thLeft}>Player</th>

                {isLive ? (
                  <>
                    <th style={thStyle}>Total</th>
                    <th style={thStyle}>Thru</th>
                    <th style={thStyle}>Round</th>
                    {showSg && (
                      <>
                        <th style={thStyle}>SG Tot</th>
                        <th style={thStyle}>OTT</th>
                        <th style={thStyle}>APP</th>
                        <th style={thStyle}>ARG</th>
                        <th style={thStyle}>PUTT</th>
                      </>
                    )}
                  </>
                ) : (
                  <>
                    <th style={thLeft}>Result</th>
                    {showSg && (
                      <>
                        <th style={thStyle}>Win%</th>
                        <th style={thStyle}>Top 5%</th>
                        <th style={thStyle}>Top 10%</th>
                        <th style={thStyle}>Cut%</th>
                      </>
                    )}
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {results.players.map((p) => (
                <tr
                  key={p.dg_id}
                  onClick={() => handleRowClick(p.dg_id)}
                  style={{
                    borderTop: '1px solid var(--border)',
                    cursor: 'pointer',
                    transition: 'background 0.1s',
                    background: loadingId === p.dg_id ? 'var(--bg-hover)' : undefined,
                  }}
                  onMouseEnter={e => {
                    if (loadingId !== p.dg_id) (e.currentTarget as HTMLTableRowElement).style.background = 'var(--bg-hover)';
                  }}
                  onMouseLeave={e => {
                    if (loadingId !== p.dg_id) (e.currentTarget as HTMLTableRowElement).style.background = '';
                  }}
                >
                  <td className="font-mono tabular" style={{ padding: '12px 16px', color: posColor(p.position), fontWeight: (p.position === '1' || p.position === 'T1') ? 600 : 400 }}>
                    {p.position}
                  </td>
                  <td style={{ padding: '12px 16px' }}>{formatName(p.player_name)}</td>

                  {isLive ? (
                    <>
                      <td className="font-mono tabular" style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 500 }}>
                        {scoreFmt(p.total)}
                      </td>
                      <td className="font-mono tabular" style={{ padding: '12px 16px', textAlign: 'right', color: 'var(--text-secondary)' }}>
                        {p.thru === 18 ? 'F' : (p.thru ?? '—')}
                      </td>
                      <td className="font-mono tabular" style={{ padding: '12px 16px', textAlign: 'right', color: 'var(--text-secondary)' }}>
                        {scoreFmt(p.round_score)}
                      </td>
                      {showSg && (
                        <>
                          <td className="font-mono tabular" style={{ padding: '12px 16px', textAlign: 'right', color: sgColor(p.sg_total) }}>{sgFmt(p.sg_total)}</td>
                          <td className="font-mono tabular" style={{ padding: '12px 16px', textAlign: 'right', color: sgColor(p.sg_ott) }}>{sgFmt(p.sg_ott)}</td>
                          <td className="font-mono tabular" style={{ padding: '12px 16px', textAlign: 'right', color: sgColor(p.sg_app) }}>{sgFmt(p.sg_app)}</td>
                          <td className="font-mono tabular" style={{ padding: '12px 16px', textAlign: 'right', color: sgColor(p.sg_arg) }}>{sgFmt(p.sg_arg)}</td>
                          <td className="font-mono tabular" style={{ padding: '12px 16px', textAlign: 'right', color: sgColor(p.sg_putt) }}>{sgFmt(p.sg_putt)}</td>
                        </>
                      )}
                    </>
                  ) : (
                    <>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{
                            width: '6px', height: '6px', borderRadius: '50%', flexShrink: 0,
                            background: p.made_cut ? 'var(--positive)' : 'var(--negative)',
                          }} />
                          <span className="font-mono tabular" style={{ color: posColor(p.position) }}>
                            {p.position || '—'}
                          </span>
                        </div>
                      </td>
                      {showSg && (
                        <>
                          <td className="font-mono tabular" style={{ padding: '12px 16px', textAlign: 'right', color: 'var(--text-secondary)' }}>{pct(p.win_pred)}</td>
                          <td className="font-mono tabular" style={{ padding: '12px 16px', textAlign: 'right', color: 'var(--text-secondary)' }}>{pct(p.top5_pred)}</td>
                          <td className="font-mono tabular" style={{ padding: '12px 16px', textAlign: 'right', color: 'var(--text-secondary)' }}>{pct(p.top10_pred)}</td>
                          <td className="font-mono tabular" style={{ padding: '12px 16px', textAlign: 'right', color: 'var(--text-secondary)' }}>{pct(p.make_cut_pred)}</td>
                        </>
                      )}
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
