'use client';

import type { OutrightMarketData, OutrightPick } from '@/lib/datagolf';

function formatName(dgName: string): string {
  if (!dgName.includes(',')) return dgName;
  const [last, rest] = dgName.split(',', 2);
  return rest.trim() + ' ' + last.trim();
}

function evColor(ev: number): string {
  if (ev > 0.05) return 'var(--positive)';
  if (ev > 0) return '#6ee7b7';
  if (ev > -0.03) return 'var(--text-tertiary)';
  return 'var(--negative)';
}

function bookLabel(book: string): string {
  const map: Record<string, string> = {
    draftkings: 'DraftKings', fanduel: 'FanDuel', betmgm: 'BetMGM',
    caesars: 'Caesars', bet365: 'Bet365', pinnacle: 'Pinnacle',
    betonline: 'BetOnline', bovada: 'Bovada', pointsbet: 'PointsBet',
    unibet: 'Unibet', betcris: 'BetCris', skybet: 'SkyBet',
    williamhill: 'William Hill', betway: 'Betway',
  };
  return map[book] ?? book;
}

type Props = {
  data: OutrightMarketData | null;
  loading: boolean;
  positiveOnly: boolean;
  minEV: number;
  onPlayerClick: (dgId: number) => void;
};

const MAX_DISPLAYED = 50;
const EDGE_SCALE = 0.20;

export default function OutrightsTable({ data, loading, positiveOnly, minEV, onPlayerClick }: Props) {
  const thStyle: React.CSSProperties = {
    padding: '10px 14px',
    textAlign: 'right',
    fontSize: '11px',
    fontWeight: 500,
    color: 'var(--text-tertiary)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    whiteSpace: 'nowrap',
  };

  if (loading && !data) {
    return (
      <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead style={{ background: 'var(--bg-tertiary)' }}>
            <tr>
              <th style={{ ...thStyle, textAlign: 'left', width: '28%' }}>Player</th>
              <th style={thStyle}>DG Model %</th>
              <th style={thStyle}>Best Book</th>
              <th style={thStyle}>Decimal</th>
              <th style={thStyle}>Implied %</th>
              <th style={thStyle}>EV %</th>
              <th style={{ ...thStyle, width: '80px' }}>Edge</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 8 }).map((_, i) => (
              <tr key={i} style={{ borderTop: '1px solid var(--border)' }}>
                {Array.from({ length: 7 }).map((__, j) => (
                  <td key={j} style={{ padding: '10px 14px' }}>
                    <div style={{
                      height: '12px',
                      background: 'var(--bg-tertiary)',
                      borderRadius: '4px',
                      width: j === 0 ? '60%' : '40%',
                      opacity: 0.6,
                    }} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (!data || data.picks.length === 0) {
    return (
      <div style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border)',
        borderRadius: '12px',
        padding: '40px',
        textAlign: 'center',
      }}>
        <div className="font-mono" style={{ color: 'var(--text-tertiary)', fontSize: '13px' }}>
          No odds available for this market yet.
        </div>
        <div className="font-mono" style={{ color: 'var(--text-tertiary)', fontSize: '12px', marginTop: '8px' }}>
          Sportsbooks typically publish lines Monday–Tuesday of tournament weeks.
        </div>
      </div>
    );
  }

  let displayed: OutrightPick[] = [...data.picks];
  if (positiveOnly) displayed = displayed.filter(p => p.best_ev > 0);
  displayed = displayed.filter(p => p.best_ev * 100 >= minEV);
  displayed = displayed.slice(0, MAX_DISPLAYED);

  if (displayed.length === 0) {
    return (
      <div style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border)',
        borderRadius: '12px',
        padding: '40px',
        textAlign: 'center',
      }}>
        <div className="font-mono" style={{ color: 'var(--text-tertiary)', fontSize: '13px' }}>
          No bets match current filters.
        </div>
        <div className="font-mono" style={{ color: 'var(--text-tertiary)', fontSize: '12px', marginTop: '8px' }}>
          Lower the minimum EV threshold to see all picks.
        </div>
      </div>
    );
  }

  const maxAbsEV = Math.max(...data.picks.map(p => Math.abs(p.best_ev)), EDGE_SCALE);

  return (
    <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
        <thead style={{ background: 'var(--bg-tertiary)' }}>
          <tr>
            <th style={{ ...thStyle, textAlign: 'left', paddingLeft: '14px', width: '28%' }}>Player</th>
            <th style={thStyle}>DG Model %</th>
            <th style={thStyle}>Best Book</th>
            <th style={thStyle}>Decimal</th>
            <th style={thStyle}>Implied %</th>
            <th style={thStyle}>EV %</th>
            <th style={{ ...thStyle, width: '80px' }}>Edge</th>
          </tr>
        </thead>
        <tbody>
          {displayed.map((p, idx) => (
            <tr key={`${p.dg_id}-${idx}`} style={{ borderTop: '1px solid var(--border)', verticalAlign: 'middle' }}>
              <td style={{ padding: '10px 14px' }}>
                <button
                  onClick={() => onPlayerClick(p.dg_id)}
                  style={{
                    background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                    color: 'var(--text-primary)', fontWeight: 500,
                    fontSize: '13px', fontFamily: 'inherit', textAlign: 'left',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'var(--edge)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-primary)')}
                >
                  {formatName(p.player_name)}
                </button>
              </td>
              <td className="font-mono tabular" style={{ padding: '10px 14px', textAlign: 'right', color: 'var(--text-secondary)', fontSize: '12px' }}>
                {(p.model_prob * 100).toFixed(1)}%
              </td>
              <td className="font-mono" style={{ padding: '10px 14px', textAlign: 'right', fontSize: '11px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                {bookLabel(p.best_book)}
              </td>
              <td className="font-mono tabular" style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 500 }}>
                {p.best_odds.toFixed(2)}
              </td>
              <td className="font-mono tabular" style={{ padding: '10px 14px', textAlign: 'right', color: 'var(--text-secondary)', fontSize: '12px' }}>
                {(p.best_implied * 100).toFixed(1)}%
              </td>
              <td className="font-mono tabular" style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 600, color: evColor(p.best_ev), fontSize: '13px' }}>
                {p.best_ev >= 0 ? '+' : ''}{(p.best_ev * 100).toFixed(1)}%
              </td>
              <td style={{ padding: '10px 14px' }}>
                <div style={{ height: '6px', background: 'var(--bg-tertiary)', borderRadius: '3px', overflow: 'hidden', width: '60px' }}>
                  <div style={{
                    height: '100%',
                    borderRadius: '3px',
                    background: p.best_ev > 0 ? 'var(--positive)' : 'var(--negative)',
                    width: `${Math.min(100, (Math.abs(p.best_ev) / maxAbsEV) * 100)}%`,
                    transition: 'width 0.2s',
                  }} />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="font-mono" style={{ padding: '10px 14px', fontSize: '11px', color: 'var(--text-tertiary)', borderTop: '1px solid var(--border)', background: 'var(--bg-tertiary)' }}>
        {displayed.length} of {data.picks.length} players · {data.positive_ev_count} positive-EV
        {data.last_updated ? ' · Updated ' + new Date(data.last_updated).toLocaleString() : ''}
      </div>
    </div>
  );
}
