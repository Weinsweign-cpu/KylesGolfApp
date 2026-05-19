'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { KvtTournament } from '@/lib/kvt/db';

function dollars(n: number) {
  const abs = Math.abs(n).toFixed(2);
  return n >= 0 ? `+$${abs}` : `-$${abs}`;
}

function NetLabel({ n, large }: { n: number; large?: boolean }) {
  const color = n > 0 ? 'var(--positive)' : n < 0 ? 'var(--negative)' : 'var(--text-secondary)';
  const label = n > 0 ? `Kyle ${dollars(n)}` : n < 0 ? `Tommy +$${Math.abs(n).toFixed(2)}` : 'Even';
  return (
    <span
      className="font-mono tabular"
      style={{ fontSize: large ? '44px' : '14px', fontWeight: large ? 700 : 600, color, letterSpacing: large ? '-0.02em' : 0 }}
    >
      {label}
    </span>
  );
}

function TournamentRow({ t }: { t: KvtTournament }) {
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();
  const net = t.final_net_to_kyle;

  async function handleDelete(e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm(`Delete "${t.event_name}"? This cannot be undone.`)) return;
    setDeleting(true);
    await fetch(`/api/kvt/tournament?id=${t.id}`, { method: 'DELETE' });
    router.refresh();
  }

  return (
    <>
      <tr
        onClick={() => setOpen(o => !o)}
        style={{ cursor: 'pointer', borderBottom: '1px solid var(--border)' }}
        onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
        onMouseLeave={e => (e.currentTarget.style.background = '')}
      >
        <td style={{ padding: '12px 16px', fontSize: '12px', color: 'var(--text-tertiary)', fontFamily: 'IBM Plex Mono, monospace', whiteSpace: 'nowrap' }}>
          {t.start_date ?? t.created_at.slice(0, 10)}
        </td>
        <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: 500 }}>
          <Link
            href={`/kvt/history/${t.id}`}
            onClick={e => e.stopPropagation()}
            style={{ color: 'var(--text-primary)', textDecoration: 'none' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--edge)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-primary)')}
          >
            {t.event_name} →
          </Link>
        </td>
        <td style={{ padding: '12px 16px', fontSize: '12px', fontFamily: 'IBM Plex Mono, monospace' }}>
          {t.status === 'finalized' ? (
            <span style={{ color: 'var(--text-tertiary)' }}>
              Finalized {t.finalized_at ? t.finalized_at.slice(0, 10) : ''}
            </span>
          ) : (
            <span style={{ color: 'var(--positive)' }}>Active</span>
          )}
        </td>
        <td style={{ padding: '12px 16px', textAlign: 'right' }}>
          {net != null ? (
            <NetLabel n={net} />
          ) : (
            <span className="font-mono" style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>—</span>
          )}
        </td>
        <td style={{ padding: '12px 16px', textAlign: 'right', color: 'var(--text-tertiary)', fontSize: '13px' }}>
          {open ? '▲' : '▼'}
        </td>
        <td style={{ padding: '12px 8px 12px 0' }}>
          <button
            onClick={handleDelete}
            disabled={deleting}
            style={{
              background: 'none', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '4px',
              color: 'var(--negative)', cursor: 'pointer', padding: '4px 8px',
              fontFamily: 'IBM Plex Mono, monospace', fontSize: '11px', letterSpacing: '0.06em',
              opacity: deleting ? 0.5 : 1,
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.08)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'none')}
          >
            {deleting ? '…' : 'DEL'}
          </button>
        </td>
      </tr>
      {open && (
        <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-tertiary)' }}>
          <td colSpan={6} style={{ padding: '16px 24px' }}>
            <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', fontSize: '12px', fontFamily: 'IBM Plex Mono, monospace', color: 'var(--text-secondary)' }}>
              {t.course && <span>Course: {t.course}</span>}
              <span>Created: {t.created_at.slice(0, 10)}</span>
              {t.finalized_at && <span>Finalized: {t.finalized_at.slice(0, 10)}</span>}
              {net != null && (
                <span style={{ color: net > 0 ? 'var(--positive)' : net < 0 ? 'var(--negative)' : 'var(--text-secondary)' }}>
                  Net: {dollars(net)}
                </span>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export default function HistoryView({ tournaments, lifetimeNet }: { tournaments: KvtTournament[]; lifetimeNet: number }) {
  const finalized = tournaments.filter(t => t.status === 'finalized');
  const active = tournaments.filter(t => t.status === 'active');

  return (
    <main style={{ padding: '40px', maxWidth: '900px', margin: '0 auto' }}>
      <div className="font-mono" style={{ fontSize: '11px', color: 'var(--text-tertiary)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '6px' }}>
        Kyle vs Tommy
      </div>
      <h1 className="font-display" style={{ fontSize: '40px', fontWeight: 600, letterSpacing: '-0.02em', margin: '0 0 28px' }}>
        History
      </h1>

      {/* Lifetime summary card */}
      <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '12px', padding: '24px 28px', marginBottom: '28px' }}>
        <div className="font-mono" style={{ fontSize: '10px', color: 'var(--text-tertiary)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '8px' }}>
          Lifetime · {tournaments.length} tournament{tournaments.length !== 1 ? 's' : ''} · {finalized.length} finalized
        </div>
        <NetLabel n={lifetimeNet} large />
      </div>

      {/* Table */}
      {tournaments.length === 0 ? (
        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '12px', padding: '40px', textAlign: 'center' }}>
          <div className="font-mono" style={{ color: 'var(--text-tertiary)', fontSize: '14px' }}>
            No tournaments yet.
          </div>
        </div>
      ) : (
        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Date', 'Tournament', 'Status', 'Net to Kyle', 'expand', 'actions'].map(h => (
                  <th key={h} style={{
                    padding: '10px 16px', textAlign: h === 'Net to Kyle' ? 'right' : 'left',
                    fontFamily: 'IBM Plex Mono, monospace', fontSize: '9px',
                    color: 'var(--text-tertiary)', letterSpacing: '0.12em', textTransform: 'uppercase',
                    fontWeight: 400,
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {active.map(t => <TournamentRow key={t.id} t={t} />)}
              {finalized.map(t => <TournamentRow key={t.id} t={t} />)}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
