'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import type { Matchup, MatchupMarket, MatchupResponse, PlayerProfile, PlayerResult } from '@/lib/datagolf';

const PlayerProfileDrawer = dynamic(() => import('./PlayerProfileDrawer'), { ssr: false });

function formatName(dgName: string): string {
  if (!dgName.includes(',')) return dgName;
  const [last, rest] = dgName.split(',', 2);
  return rest.trim() + ' ' + last.trim();
}

function evColor(ev: number): string {
  if (ev > 0.05) return 'var(--positive)';
  if (ev > 0) return '#6ee7b7';
  if (ev > -0.05) return 'var(--text-tertiary)';
  return 'var(--negative)';
}

function evFmt(ev: number): string {
  const pct = ev * 100;
  return (pct >= 0 ? '+' : '') + pct.toFixed(1) + '%';
}

function impliedFmt(n: number): string {
  return (n * 100).toFixed(1) + '%';
}

function bookLabel(book: string): string {
  const map: Record<string, string> = {
    draftkings: 'DraftKings', fanduel: 'FanDuel', betmgm: 'BetMGM',
    caesars: 'Caesars', bet365: 'Bet365', pinnacle: 'Pinnacle',
    betonline: 'BetOnline', bovada: 'Bovada', pointsbet: 'PointsBet',
    unibet: 'Unibet', betcris: 'BetCris',
  };
  return map[book] ?? book;
}

type SortMode = 'ev_desc' | 'ev_asc' | 'alpha';

function getOutcome(
  m: Matchup,
  market: MatchupMarket,
  results: Map<number, PlayerResult>
): { margin: number } | null {
  const isTournament = market === 'tournament_matchups';
  const bestPlayer = m.players[m.best_ev_slot];
  if (!bestPlayer) return null;

  const bestRes = results.get(bestPlayer.dg_id);
  // require the player to have started
  if (!bestRes || !bestRes.thru) return null;

  const bestScore = isTournament ? bestRes.total : bestRes.round_score;
  if (bestScore == null) return null;

  const opponentScores = m.players
    .filter((_, i) => i !== m.best_ev_slot)
    .map(p => {
      const r = results.get(p.dg_id);
      if (!r || !r.thru) return null;
      return isTournament ? r.total : r.round_score;
    })
    .filter((s): s is number => s != null);

  if (opponentScores.length === 0) return null;

  // In golf lower = better. margin > 0 means our player is winning.
  const bestOpponent = Math.min(...opponentScores);
  return { margin: bestOpponent - bestScore };
}

type Props = {
  data: MatchupResponse | null;
  loading: boolean;
  liveResults?: Map<number, PlayerResult> | null;
};

export default function MatchupsTable({ data, loading, liveResults }: Props) {
  const [sort, setSort] = useState<SortMode>('ev_desc');
  const [posEVOnly, setPosEVOnly] = useState(false);
  const [minEV, setMinEV] = useState(-10);
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [loadingId, setLoadingId] = useState<number | null>(null);

  async function openProfile(dgId: number) {
    if (loadingId !== null) return;
    setLoadingId(dgId);
    try {
      const res = await fetch(`/api/player/${dgId}`);
      setProfile(await res.json());
    } finally {
      setLoadingId(null);
    }
  }

  if (loading && !data) {
    return (
      <div style={emptyBox}>Loading matchups...</div>
    );
  }

  if (!data || data.matchups.length === 0) {
    const marketLabel = data?.market === '3_balls' ? '3-ball' : data?.market === 'round_matchups' ? 'round matchup' : 'tournament matchup';
    return (
      <div style={emptyBox}>
        No {marketLabel} odds are currently offered.
        <div style={{ fontSize: '12px', marginTop: '8px', color: 'var(--text-tertiary)' }}>
          Sportsbooks typically post {marketLabel} odds Monday–Tuesday of tournament weeks.
        </div>
      </div>
    );
  }

  let displayed = [...data.matchups];
  if (posEVOnly) displayed = displayed.filter(m => m.best_ev > 0);
  displayed = displayed.filter(m => m.best_ev * 100 >= minEV);

  if (sort === 'ev_desc') displayed.sort((a, b) => b.best_ev - a.best_ev);
  else if (sort === 'ev_asc') displayed.sort((a, b) => a.best_ev - b.best_ev);
  else displayed.sort((a, b) => (a.players[0]?.player_name ?? '').localeCompare(b.players[0]?.player_name ?? ''));

  const maxAbsEV = Math.max(...data.matchups.map(m => Math.abs(m.best_ev)), 0.15);

  // $5/bet tracker — computed over ALL matchups (not just filtered view)
  const tracker = (() => {
    if (!liveResults) return null;
    let won = 0, lost = 0, tied = 0, pending = 0, totalReturn = 0;
    for (const m of data.matchups) {
      const outcome = getOutcome(m, data.market, liveResults);
      if (!outcome) { pending++; continue; }
      if (outcome.margin > 0) { won++; totalReturn += 5 * m.best_ev_decimal; }
      else if (outcome.margin < 0) { lost++; }
      else { tied++; totalReturn += 5; }
    }
    const settled = won + lost + tied;
    const wagered = settled * 5;
    const pnl = totalReturn - wagered;
    const roi = wagered > 0 ? (pnl / wagered) * 100 : 0;
    const hitRate = settled > 0 ? (won / settled) * 100 : 0;
    return { won, lost, tied, pending, settled, wagered, pnl, roi, hitRate };
  })();

  const thStyle: React.CSSProperties = {
    padding: '10px 14px', textAlign: 'right', fontSize: '11px', fontWeight: 500,
    color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap',
  };

  return (
    <>
      {loadingId !== null && (
        <div className="font-mono" style={{
          position: 'fixed', top: '16px', right: '16px', background: 'var(--bg-tertiary)',
          border: '1px solid var(--border)', borderRadius: '6px', padding: '8px 14px',
          fontSize: '12px', color: 'var(--text-secondary)', zIndex: 60,
        }}>
          Loading profile...
        </div>
      )}

      {profile && <PlayerProfileDrawer profile={profile} onClose={() => setProfile(null)} />}

      {/* $5/bet tracker */}
      {tracker && tracker.settled > 0 && (() => {
        const up = tracker.pnl >= 0;
        const accentColor = up ? 'var(--positive)' : 'var(--negative)';
        return (
          <div style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border)',
            borderLeft: `3px solid ${accentColor}`,
            borderRadius: '10px',
            padding: '16px 20px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '28px',
            flexWrap: 'wrap',
          }}>
            {/* Label */}
            <div>
              <div className="font-mono" style={{ fontSize: '9px', color: 'var(--text-tertiary)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: '3px' }}>
                If you bet $5
              </div>
              <div className="font-mono" style={{ fontSize: '9px', color: 'var(--text-tertiary)', letterSpacing: '0.14em', textTransform: 'uppercase' }}>
                on every pick
              </div>
            </div>

            {/* Big P&L */}
            <div style={{ flex: 1, minWidth: '120px' }}>
              <div className="font-display" style={{
                fontSize: '38px', fontWeight: 700, letterSpacing: '-0.02em',
                color: accentColor, lineHeight: 1,
              }}>
                {up ? '+' : '−'}${Math.abs(tracker.pnl).toFixed(2)}
              </div>
              <div className="font-mono" style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '4px' }}>
                {up ? '+' : ''}{tracker.roi.toFixed(1)}% ROI &nbsp;·&nbsp; ${tracker.wagered.toFixed(0)} wagered
              </div>
            </div>

            {/* Stats + bar */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: '180px' }}>
              <div style={{ display: 'flex', gap: '14px' }}>
                <span className="font-mono" style={{ fontSize: '12px', color: 'var(--positive)' }}>{tracker.won}W</span>
                <span className="font-mono" style={{ fontSize: '12px', color: 'var(--negative)' }}>{tracker.lost}L</span>
                {tracker.tied > 0 && <span className="font-mono" style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>{tracker.tied} push</span>}
                {tracker.pending > 0 && <span className="font-mono" style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>{tracker.pending} live</span>}
              </div>
              {/* win/loss bar */}
              <div style={{ height: '4px', background: 'var(--bg-tertiary)', borderRadius: '2px', overflow: 'hidden' }}>
                <div style={{ display: 'flex', height: '100%' }}>
                  <div style={{ width: `${(tracker.won / tracker.settled) * 100}%`, background: 'var(--positive)', transition: 'width 0.4s' }} />
                  <div style={{ width: `${(tracker.lost / tracker.settled) * 100}%`, background: 'var(--negative)', transition: 'width 0.4s' }} />
                  {tracker.tied > 0 && <div style={{ width: `${(tracker.tied / tracker.settled) * 100}%`, background: 'var(--text-tertiary)' }} />}
                </div>
              </div>
              <div className="font-mono" style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>
                {tracker.hitRate.toFixed(0)}% hit rate &nbsp;·&nbsp; {tracker.settled} settled
              </div>
            </div>
          </div>
        );
      })()}

      {/* Controls */}
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap' }}>
        {/* Sort */}
        <div style={{ display: 'flex', gap: '6px' }}>
          {(['ev_desc', 'ev_asc', 'alpha'] as SortMode[]).map(s => (
            <button
              key={s}
              onClick={() => setSort(s)}
              style={{
                padding: '5px 10px', borderRadius: '5px', cursor: 'pointer', fontFamily: 'IBM Plex Mono, monospace',
                fontSize: '10px', letterSpacing: '0.06em', textTransform: 'uppercase',
                background: sort === s ? 'var(--bg-tertiary)' : 'var(--bg-secondary)',
                border: sort === s ? '1px solid var(--edge)' : '1px solid var(--border)',
                color: sort === s ? 'var(--text-primary)' : 'var(--text-secondary)',
              }}
            >
              {s === 'ev_desc' ? 'EV ↓' : s === 'ev_asc' ? 'EV ↑' : 'A–Z'}
            </button>
          ))}
        </div>

        {/* Positive EV toggle */}
        <label style={{ display: 'flex', alignItems: 'center', gap: '7px', cursor: 'pointer', userSelect: 'none' }}>
          <div
            onClick={() => setPosEVOnly(v => !v)}
            style={{
              width: '32px', height: '18px', background: posEVOnly ? 'var(--edge)' : 'var(--bg-tertiary)',
              border: '1px solid var(--border)', borderRadius: '9px', position: 'relative', cursor: 'pointer', transition: 'background 0.15s',
            }}
          >
            <div style={{
              position: 'absolute', top: '2px', left: posEVOnly ? '14px' : '2px',
              width: '12px', height: '12px', background: 'var(--text-primary)', borderRadius: '50%', transition: 'left 0.15s',
            }} />
          </div>
          <span className="font-mono" style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>+EV only</span>
        </label>

        {/* Min EV slider */}
        <label style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
          <span className="font-mono" style={{ fontSize: '10px', color: 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>
            Min EV: {minEV >= 0 ? '+' : ''}{minEV}%
          </span>
          <input
            type="range" min={-10} max={20} step={1} value={minEV}
            onChange={e => setMinEV(Number(e.target.value))}
            style={{ width: '80px', accentColor: 'var(--edge)', cursor: 'pointer' }}
          />
        </label>

        <span className="font-mono" style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginLeft: 'auto' }}>
          {displayed.length} of {data.matchups.length}
        </span>
      </div>

      <div style={{ opacity: loading ? 0.5 : 1, transition: 'opacity 0.2s' }}>
        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead style={{ background: 'var(--bg-tertiary)' }}>
              <tr>
                <th style={{ ...thStyle, textAlign: 'left', width: '30%' }}>Matchup</th>
                <th style={{ ...thStyle, textAlign: 'left' }}>Model</th>
                <th style={thStyle}>Best Book</th>
                <th style={thStyle}>Decimal</th>
                <th style={thStyle}>Implied</th>
                <th style={thStyle}>EV</th>
                <th style={{ ...thStyle, width: '80px' }}>Edge</th>
                <th style={{ ...thStyle, width: '70px' }}>Result</th>
              </tr>
            </thead>
            <tbody>
              {displayed.map((m, idx) => {
                const bestPlayer = m.players[m.best_ev_slot];
                return (
                  <tr
                    key={`${m.matchup_id}-${idx}`}
                    style={{ borderTop: '1px solid var(--border)', verticalAlign: 'middle' }}
                  >
                    {/* Matchup names */}
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {m.players.map((p, i) => (
                          <div key={p.dg_id} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {i > 0 && i < m.players.length && (
                              <span className="font-mono" style={{ fontSize: '9px', color: 'var(--text-tertiary)', position: 'absolute', marginTop: '-2px', display: 'none' }} />
                            )}
                            <button
                              onClick={() => openProfile(p.dg_id)}
                              style={{
                                background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                                color: i === m.best_ev_slot ? 'var(--text-primary)' : 'var(--text-secondary)',
                                fontWeight: i === m.best_ev_slot ? 500 : 400,
                                fontSize: '13px', fontFamily: 'inherit', textAlign: 'left',
                                textDecoration: 'none',
                              }}
                              onMouseEnter={e => (e.currentTarget.style.color = 'var(--edge)')}
                              onMouseLeave={e => (e.currentTarget.style.color = i === m.best_ev_slot ? 'var(--text-primary)' : 'var(--text-secondary)')}
                            >
                              {formatName(p.player_name)}
                            </button>
                            {i < m.players.length - 1 && (
                              <span style={{ fontSize: '9px', color: 'var(--text-tertiary)', marginLeft: '2px' }}>vs</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </td>

                    {/* Model probs */}
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {m.players.map((p, i) => (
                          <div key={p.dg_id} className="font-mono tabular" style={{
                            fontSize: '12px',
                            color: i === m.best_ev_slot ? 'var(--text-primary)' : 'var(--text-secondary)',
                          }}>
                            {(p.model_prob * 100).toFixed(1)}%
                          </div>
                        ))}
                      </div>
                    </td>

                    {/* Best book */}
                    <td className="font-mono" style={{ padding: '10px 14px', textAlign: 'right', fontSize: '11px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                      {bookLabel(m.best_ev_book)}
                    </td>

                    {/* Decimal odds */}
                    <td className="font-mono tabular" style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 500 }}>
                      {m.best_ev_decimal.toFixed(3)}
                    </td>

                    {/* Implied prob */}
                    <td className="font-mono tabular" style={{ padding: '10px 14px', textAlign: 'right', color: 'var(--text-secondary)', fontSize: '12px' }}>
                      {impliedFmt(m.best_ev_implied)}
                    </td>

                    {/* EV */}
                    <td className="font-mono tabular" style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 600, color: evColor(m.best_ev), fontSize: '13px' }}>
                      {evFmt(m.best_ev)}
                    </td>

                    {/* Edge bar */}
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ height: '6px', background: 'var(--bg-tertiary)', borderRadius: '3px', overflow: 'hidden', width: '60px' }}>
                        <div style={{
                          height: '100%', borderRadius: '3px',
                          background: m.best_ev > 0 ? 'var(--positive)' : 'var(--negative)',
                          width: `${Math.min(100, (Math.abs(m.best_ev) / maxAbsEV) * 100)}%`,
                          transition: 'width 0.2s',
                        }} />
                      </div>
                    </td>

                    {/* Result */}
                    <td className="font-mono tabular" style={{ padding: '10px 14px', textAlign: 'right' }}>
                      {(() => {
                        const outcome = liveResults ? getOutcome(m, data.market, liveResults) : null;
                        if (!outcome) return <span style={{ color: 'var(--text-tertiary)' }}>—</span>;
                        if (outcome.margin === 0) return <span style={{ color: 'var(--text-tertiary)', fontSize: '11px' }}>TIED</span>;
                        const color = outcome.margin > 0 ? 'var(--positive)' : 'var(--negative)';
                        const label = outcome.margin > 0 ? `+${outcome.margin}` : `${outcome.margin}`;
                        return <span style={{ color, fontWeight: 600, fontSize: '13px' }}>{label}</span>;
                      })()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

const emptyBox: React.CSSProperties = {
  background: 'var(--bg-secondary)', border: '1px solid var(--border)',
  borderRadius: '12px', padding: '40px', textAlign: 'center',
  color: 'var(--text-secondary)', fontSize: '13px',
};
