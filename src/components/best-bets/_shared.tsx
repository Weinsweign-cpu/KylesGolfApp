'use client';
import Link from 'next/link';
import type { CSSProperties, ReactNode } from 'react';

export function formatName(dgName: string): string {
  if (!dgName.includes(',')) return dgName;
  const [last, rest] = dgName.split(',', 2);
  return rest.trim() + ' ' + last.trim();
}

export function Card({
  title,
  subtitle,
  href,
  loading,
  empty,
  children,
}: {
  title: string;
  subtitle?: string;
  href: string;
  loading: boolean;
  empty: string | null;
  children: ReactNode;
}) {
  return (
    <section style={{
      background: 'var(--bg-secondary)',
      border: '1px solid var(--border)',
      borderRadius: '12px',
      padding: '20px',
      marginBottom: '20px',
    }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
        <div>
          <div className="font-mono" style={{
            fontSize: '10px',
            color: 'var(--text-tertiary)',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            marginBottom: '4px',
          }}>
            {title}
          </div>
          {subtitle && (
            <div className="font-mono" style={{
              fontSize: '12px',
              color: 'var(--text-secondary)',
            }}>
              {subtitle}
            </div>
          )}
        </div>
        <Link
          href={href}
          className="font-mono"
          style={{
            fontSize: '11px',
            color: 'var(--edge)',
            textDecoration: 'none',
            fontFamily: 'var(--font-mono, monospace)',
            flexShrink: 0,
          }}
        >
          VIEW ALL →
        </Link>
      </header>

      {loading && (
        <div className="font-mono" style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '13px' }}>
          Loading...
        </div>
      )}

      {!loading && empty && (
        <div className="font-mono" style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '13px' }}>
          {empty}
        </div>
      )}

      {!loading && !empty && children}
    </section>
  );
}

export function Row({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <tr
      onClick={onClick}
      style={{
        borderTop: '1px solid var(--border)',
        cursor: 'pointer',
        transition: 'background 120ms',
      }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = 'rgba(255,255,255,0.03)'; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = ''; }}
    >
      {children}
    </tr>
  );
}

export const tableStyle: CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  fontSize: '13px',
};

export const thStyle: CSSProperties = {
  padding: '8px 12px',
  fontSize: '10px',
  fontWeight: 500,
  color: 'var(--text-tertiary)',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  textAlign: 'left',
  borderBottom: '1px solid var(--border)',
};

export const tdStyle: CSSProperties = {
  padding: '10px 12px',
  color: 'var(--text-primary)',
  fontSize: '13px',
};

export function evColor(ev: number): string {
  if (ev > 0.05) return 'var(--positive)';
  if (ev > 0) return '#6ee7b7';
  if (ev > -0.03) return 'var(--text-tertiary)';
  return 'var(--negative)';
}

export function evFmt(ev: number): string {
  const pct = ev * 100;
  return (pct >= 0 ? '+' : '') + pct.toFixed(1) + '%';
}

export function bookLabel(book: string): string {
  const map: Record<string, string> = {
    draftkings: 'DraftKings', fanduel: 'FanDuel', betmgm: 'BetMGM',
    caesars: 'Caesars', bet365: 'Bet365', pinnacle: 'Pinnacle',
    betonline: 'BetOnline', bovada: 'Bovada', pointsbet: 'PointsBet',
    unibet: 'Unibet', betcris: 'BetCris',
  };
  return map[book] ?? book;
}
