'use client';

import { useEffect, useState } from 'react';
import MatchupsTable from './MatchupsTable';
import type { MatchupMarket, MatchupResponse, PlayerResult } from '@/lib/datagolf';

const MARKETS: { key: MatchupMarket; label: string }[] = [
  { key: 'tournament_matchups', label: 'Tournament' },
  { key: '3_balls', label: '3-Balls' },
  { key: 'round_matchups', label: 'Round' },
];

export default function MatchupsView() {
  const [market, setMarket] = useState<MatchupMarket>('tournament_matchups');
  const [data, setData] = useState<MatchupResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [liveResults, setLiveResults] = useState<{ eventName: string; players: Map<number, PlayerResult> } | null>(null);

  useEffect(() => {
    fetch('/api/results?event=current')
      .then(r => r.json())
      .then(d => {
        if ('error' in d || d.type !== 'live') return;
        const map = new Map<number, PlayerResult>();
        (d.players as PlayerResult[]).forEach(p => map.set(p.dg_id, p));
        setLiveResults({ eventName: String(d.event_name ?? ''), players: map });
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/matchups?market=${market}`)
      .then(r => r.json())
      .then((d: MatchupResponse | { error: string }) => {
        setData('error' in d ? null : d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [market]);

  const tabStyle = (m: MatchupMarket): React.CSSProperties => ({
    padding: '6px 14px', borderRadius: '6px', cursor: 'pointer',
    border: market === m ? '1px solid var(--edge)' : '1px solid var(--border)',
    background: market === m ? 'var(--bg-tertiary)' : 'var(--bg-secondary)',
    color: market === m ? 'var(--text-primary)' : 'var(--text-secondary)',
    fontFamily: 'IBM Plex Mono, monospace', fontSize: '11px',
    letterSpacing: '0.08em', textTransform: 'uppercase' as const,
  });

  return (
    <main style={{ padding: '40px', maxWidth: '1200px', margin: '0 auto' }}>
      {loading && (
        <div className="font-mono" style={{
          position: 'fixed', top: '16px', right: '16px', background: 'var(--bg-tertiary)',
          border: '1px solid var(--border)', borderRadius: '6px', padding: '8px 14px',
          fontSize: '12px', color: 'var(--text-secondary)', zIndex: 60,
        }}>
          Loading...
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <div className="font-mono" style={{
          fontSize: '11px', color: 'var(--text-tertiary)',
          letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '6px',
        }}>
          DataGolf · PGA Tour · Matchup Odds
        </div>
        <h1 className="font-display" style={{
          fontSize: '40px', fontWeight: 600, letterSpacing: '-0.02em', margin: '0 0 6px',
        }}>
          Matchups
        </h1>
        {data && (
          <div className="font-mono" style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            {data.event_name}
            {data.round_num ? ` · Round ${data.round_num}` : ''}
            {data.last_updated ? ' · Updated ' + new Date(data.last_updated).toLocaleString() : ''}
          </div>
        )}
      </div>

      {/* Market tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        {MARKETS.map(({ key, label }) => (
          <button key={key} style={tabStyle(key)} onClick={() => setMarket(key)}>
            {label}
          </button>
        ))}
      </div>

      {/* Round badge */}
      {data?.round_num && market === 'round_matchups' && (
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '6px',
          background: 'var(--bg-tertiary)', border: '1px solid var(--edge)',
          borderRadius: '6px', padding: '4px 10px', marginBottom: '14px',
        }}>
          <span className="font-mono" style={{ fontSize: '11px', color: 'var(--edge)', letterSpacing: '0.1em' }}>
            ROUND {data.round_num}
          </span>
        </div>
      )}

      <MatchupsTable
        data={data}
        loading={loading}
        liveResults={
          data && liveResults && liveResults.eventName === data.event_name
            ? liveResults.players
            : null
        }
      />
    </main>
  );
}
