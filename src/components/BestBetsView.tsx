'use client';
import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import OutrightsTable from './best-bets/OutrightsTable';
import ParlayCard from './best-bets/ParlayCard';
import type { PlayerProfile, OutrightMarket, OutrightMarketData, ParlaySuggestion } from '@/lib/datagolf';

const PlayerProfileDrawer = dynamic(() => import('./PlayerProfileDrawer'), { ssr: false });

const MARKETS: { key: OutrightMarket; label: string }[] = [
  { key: 'win', label: 'WIN' },
  { key: 'top_5', label: 'TOP 5' },
  { key: 'top_10', label: 'TOP 10' },
  { key: 'top_20', label: 'TOP 20' },
  { key: 'make_cut', label: 'MAKE CUT' },
  { key: 'frl', label: 'FRL' },
];

export default function BestBetsView() {
  const [activeMarket, setActiveMarket] = useState<OutrightMarket>('win');
  const [data, setData] = useState<OutrightMarketData | null>(null);
  const [loading, setLoading] = useState(true);
  const [parlay, setParlay] = useState<ParlaySuggestion | null>(null);
  const [parlayLoading, setParlayLoading] = useState(true);
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [positiveOnly, setPositiveOnly] = useState(true);
  const [minEV, setMinEV] = useState(0);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/outrights?market=${activeMarket}`)
      .then(r => r.json())
      .then(d => { setData('error' in d ? null : d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [activeMarket]);

  useEffect(() => {
    fetch('/api/parlay')
      .then(r => r.json())
      .then(d => { setParlay(d ?? null); setParlayLoading(false); })
      .catch(() => setParlayLoading(false));
  }, []);

  async function openPlayer(dgId: number) {
    const res = await fetch(`/api/player/${dgId}`);
    if (res.ok) setProfile(await res.json());
  }

  const tabStyle = (key: OutrightMarket): React.CSSProperties => ({
    padding: '8px 14px',
    fontSize: '11px',
    letterSpacing: '0.08em',
    borderRadius: '6px',
    cursor: 'pointer',
    fontFamily: 'IBM Plex Mono, monospace',
    textTransform: 'uppercase' as const,
    background: activeMarket === key ? 'var(--bg-tertiary)' : 'var(--bg-secondary)',
    border: `1px solid ${activeMarket === key ? 'var(--edge)' : 'var(--border)'}`,
    color: activeMarket === key ? 'var(--text-primary)' : 'var(--text-secondary)',
  });

  return (
    <main style={{ padding: '40px', maxWidth: '1200px', margin: '0 auto' }}>
      {profile && <PlayerProfileDrawer profile={profile} onClose={() => setProfile(null)} />}

      {/* Header */}
      <header style={{ marginBottom: '24px' }}>
        <div className="font-mono" style={{
          fontSize: '11px', color: 'var(--text-tertiary)',
          letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '6px',
        }}>
          DataGolf · PGA Tour · Value Bets
        </div>
        <h1 className="font-display" style={{ fontSize: '40px', fontWeight: 600, letterSpacing: '-0.02em', margin: 0 }}>
          Best Bets
        </h1>
        <div className="font-mono" style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '6px' }}>
          {data
            ? `${data.event_name} · ${data.positive_ev_count} positive-EV picks in this market`
            : loading ? '—' : 'No data available'}
        </div>
      </header>

      {/* Market tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
        {MARKETS.map(m => (
          <button key={m.key} onClick={() => setActiveMarket(m.key)} style={tabStyle(m.key)}>
            {m.label}
          </button>
        ))}
      </div>

      {/* Filter row */}
      <div style={{ display: 'flex', gap: '20px', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', userSelect: 'none' }}>
          <div
            onClick={() => setPositiveOnly(v => !v)}
            style={{
              width: '32px', height: '18px',
              background: positiveOnly ? 'var(--edge)' : 'var(--bg-tertiary)',
              border: '1px solid var(--border)', borderRadius: '9px',
              position: 'relative', cursor: 'pointer', transition: 'background 0.15s',
            }}
          >
            <div style={{
              position: 'absolute', top: '2px', left: positiveOnly ? '14px' : '2px',
              width: '12px', height: '12px',
              background: 'var(--text-primary)', borderRadius: '50%', transition: 'left 0.15s',
            }} />
          </div>
          <span className="font-mono" style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>+EV ONLY</span>
        </label>

        <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="font-mono" style={{ fontSize: '10px', color: 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>
            MIN EV
          </span>
          <input
            type="range" min={-5} max={20} step={0.5} value={minEV}
            onChange={e => setMinEV(parseFloat(e.target.value))}
            style={{ width: '80px', accentColor: 'var(--edge)', cursor: 'pointer' }}
          />
          <span className="font-mono tabular" style={{ fontSize: '11px', color: 'var(--text-primary)', minWidth: '50px' }}>
            {minEV >= 0 ? '+' : ''}{minEV.toFixed(1)}%
          </span>
        </label>

        {loading && (
          <span className="font-mono" style={{
            fontSize: '11px', color: 'var(--text-secondary)',
            marginLeft: 'auto', padding: '4px 10px',
            background: 'var(--bg-tertiary)', border: '1px solid var(--border)', borderRadius: '5px',
          }}>
            Loading...
          </span>
        )}
      </div>

      {/* Outrights table */}
      <OutrightsTable
        data={data}
        loading={loading}
        positiveOnly={positiveOnly}
        minEV={minEV}
        onPlayerClick={openPlayer}
      />

      {/* Parlay card */}
      <div style={{ marginTop: '32px' }}>
        <ParlayCard parlay={parlay} loading={parlayLoading} onPlayerClick={openPlayer} />
      </div>
    </main>
  );
}
