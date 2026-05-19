'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import type { PlayerProfile } from '@/lib/datagolf';

const PlayerProfileDrawer = dynamic(() => import('./PlayerProfileDrawer'), { ssr: false });

type DGPlayer = {
  dg_id: number;
  player_name: string;
  win: number;
  top_5: number;
  top_10: number;
  top_20: number;
  make_cut: number;
};

function formatName(dgName: string): string {
  if (!dgName.includes(',')) return dgName;
  const [last, rest] = dgName.split(',', 2);
  return rest.trim() + ' ' + last.trim();
}

function pct(n: number | undefined): string {
  if (n == null || isNaN(n)) return '—';
  return (n * 100).toFixed(1) + '%';
}

type Props = { players: DGPlayer[] };

export default function PredictionsTable({ players }: Props) {
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

  return (
    <>
      {/* Loading indicator */}
      {loadingId !== null && (
        <div
          className="font-mono"
          style={{
            position: 'fixed',
            top: '16px',
            right: '16px',
            background: 'var(--bg-tertiary)',
            border: '1px solid var(--border)',
            borderRadius: '6px',
            padding: '8px 14px',
            fontSize: '12px',
            color: 'var(--text-secondary)',
            zIndex: 60,
          }}
        >
          Loading profile...
        </div>
      )}

      {/* Drawer */}
      {profile && (
        <PlayerProfileDrawer profile={profile} onClose={() => setProfile(null)} />
      )}

      {/* Table */}
      <div style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border)',
        borderRadius: '12px',
        overflow: 'hidden',
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
          <thead style={{ background: 'var(--bg-tertiary)' }}>
            <tr>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 500, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', width: '50px' }}>#</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 500, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Player</th>
              <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '11px', fontWeight: 500, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Win</th>
              <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '11px', fontWeight: 500, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Top 5</th>
              <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '11px', fontWeight: 500, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Top 10</th>
              <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '11px', fontWeight: 500, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Top 20</th>
              <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '11px', fontWeight: 500, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Make Cut</th>
            </tr>
          </thead>
          <tbody>
            {players.map((p, i) => (
              <tr
                key={p.dg_id}
                onClick={() => handleRowClick(p.dg_id)}
                style={{
                  borderTop: '1px solid var(--border)',
                  cursor: 'pointer',
                  transition: 'background 0.1s',
                  background: loadingId === p.dg_id ? 'var(--bg-hover)' : undefined,
                }}
                onMouseEnter={(e) => {
                  if (loadingId !== p.dg_id) {
                    (e.currentTarget as HTMLTableRowElement).style.background = 'var(--bg-hover)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (loadingId !== p.dg_id) {
                    (e.currentTarget as HTMLTableRowElement).style.background = '';
                  }
                }}
              >
                <td className="font-mono tabular" style={{ padding: '12px 16px', color: 'var(--text-tertiary)' }}>{i + 1}</td>
                <td style={{ padding: '12px 16px' }}>{formatName(p.player_name)}</td>
                <td className="font-mono tabular" style={{ padding: '12px 16px', textAlign: 'right' }}>{pct(p.win)}</td>
                <td className="font-mono tabular" style={{ padding: '12px 16px', textAlign: 'right', color: 'var(--text-secondary)' }}>{pct(p.top_5)}</td>
                <td className="font-mono tabular" style={{ padding: '12px 16px', textAlign: 'right', color: 'var(--text-secondary)' }}>{pct(p.top_10)}</td>
                <td className="font-mono tabular" style={{ padding: '12px 16px', textAlign: 'right', color: 'var(--text-secondary)' }}>{pct(p.top_20)}</td>
                <td className="font-mono tabular" style={{ padding: '12px 16px', textAlign: 'right', color: 'var(--text-secondary)' }}>{pct(p.make_cut)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
