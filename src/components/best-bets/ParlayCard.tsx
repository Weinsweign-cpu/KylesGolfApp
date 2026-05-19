'use client';

import type { ParlaySuggestion, OutrightMarket } from '@/lib/datagolf';

function formatName(dgName: string): string {
  if (!dgName.includes(',')) return dgName;
  const [last, rest] = dgName.split(',', 2);
  return rest.trim() + ' ' + last.trim();
}

const MARKET_LABELS: Record<OutrightMarket, string> = {
  win: 'WIN',
  top_5: 'TOP 5',
  top_10: 'TOP 10',
  top_20: 'TOP 20',
  make_cut: 'MAKE CUT',
  frl: 'FRL',
};

type Props = {
  parlay: ParlaySuggestion | null;
  loading: boolean;
  onPlayerClick: (dgId: number) => void;
};

export default function ParlayCard({ parlay, loading, onPlayerClick }: Props) {
  const isHighVariance = parlay && parlay.combined_odds > 6.0;

  return (
    <div style={{
      background: 'var(--bg-secondary)',
      border: '1px solid var(--border)',
      borderTop: '3px solid var(--edge)',
      borderRadius: '12px',
      overflow: 'hidden',
    }}>
      {/* Card header */}
      <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid var(--border)' }}>
        <div className="font-mono" style={{
          fontSize: '10px',
          color: 'var(--text-tertiary)',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          marginBottom: '4px',
        }}>
          Recommended Parlay
        </div>
        <div className="font-mono" style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
          Best positive-EV multi-leg combo across finish markets
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: '20px' }}>
        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} style={{ height: '40px', background: 'var(--bg-tertiary)', borderRadius: '6px', opacity: 0.6 }} />
            ))}
          </div>
        )}

        {!loading && !parlay && (
          <div style={{ padding: '8px 0' }}>
            <div className="font-mono" style={{ color: 'var(--text-tertiary)', fontSize: '13px', marginBottom: '8px' }}>
              No positive-EV parlay available right now.
            </div>
            <div className="font-mono" style={{ color: 'var(--text-tertiary)', fontSize: '12px', lineHeight: 1.6 }}>
              Parlays compound the sportsbook hold across legs, so true combined edge is rare.
              Check back as lines move throughout the week.
            </div>
          </div>
        )}

        {!loading && parlay && (
          <>
            {/* Legs */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', marginBottom: '20px' }}>
              {parlay.legs.map((leg, i) => (
                <div
                  key={`${leg.dg_id}-${leg.market}-${i}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    background: 'var(--bg-tertiary)',
                    borderRadius: i === 0 ? '8px 8px 0 0' : i === parlay.legs.length - 1 ? '0 0 8px 8px' : '0',
                    gap: '12px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                    <button
                      onClick={() => onPlayerClick(leg.dg_id)}
                      style={{
                        background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                        color: 'var(--text-primary)', fontWeight: 500,
                        fontSize: '13px', fontFamily: 'inherit', textAlign: 'left',
                        whiteSpace: 'nowrap',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.color = 'var(--edge)')}
                      onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-primary)')}
                    >
                      {formatName(leg.player_name)}
                    </button>
                    <span className="font-mono" style={{
                      fontSize: '9px',
                      color: 'var(--edge)',
                      background: 'rgba(59,123,245,0.1)',
                      border: '1px solid rgba(59,123,245,0.25)',
                      borderRadius: '4px',
                      padding: '2px 6px',
                      letterSpacing: '0.08em',
                      whiteSpace: 'nowrap',
                    }}>
                      {MARKET_LABELS[leg.market]}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexShrink: 0 }}>
                    <span className="font-mono tabular" style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      {leg.book.charAt(0).toUpperCase() + leg.book.slice(1)}
                    </span>
                    <span className="font-mono tabular" style={{ fontSize: '13px', fontWeight: 500 }}>
                      {leg.decimal_odds.toFixed(2)}
                    </span>
                    <span className="font-mono tabular" style={{ fontSize: '12px', color: 'var(--positive)' }}>
                      +{(leg.individual_ev * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Divider + summary */}
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '24px', flexWrap: 'wrap' }}>
                {/* Big combined EV */}
                <div>
                  <div className="font-mono" style={{ fontSize: '10px', color: 'var(--text-tertiary)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '4px' }}>
                    Combined EV
                  </div>
                  <div className="font-mono tabular" style={{
                    fontSize: '32px',
                    fontWeight: 700,
                    color: 'var(--positive)',
                    letterSpacing: '-0.01em',
                    lineHeight: 1,
                  }}>
                    +{(parlay.combined_ev * 100).toFixed(1)}%
                  </div>
                </div>

                {/* Stats column */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', gap: '24px' }}>
                    <div>
                      <div className="font-mono" style={{ fontSize: '10px', color: 'var(--text-tertiary)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '2px' }}>
                        Combined Odds
                      </div>
                      <div className="font-mono tabular" style={{ fontSize: '16px', fontWeight: 600 }}>
                        {parlay.combined_odds.toFixed(2)}
                      </div>
                    </div>
                    <div>
                      <div className="font-mono" style={{ fontSize: '10px', color: 'var(--text-tertiary)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '2px' }}>
                        Model Prob
                      </div>
                      <div className="font-mono tabular" style={{ fontSize: '16px', fontWeight: 600 }}>
                        {(parlay.combined_model_prob * 100).toFixed(1)}%
                      </div>
                    </div>
                    <div>
                      <div className="font-mono" style={{ fontSize: '10px', color: 'var(--text-tertiary)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '2px' }}>
                        Implied Prob
                      </div>
                      <div className="font-mono tabular" style={{ fontSize: '16px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                        {(parlay.combined_implied_prob * 100).toFixed(1)}%
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* High-variance warning */}
              {isHighVariance && (
                <div className="font-mono" style={{
                  marginTop: '12px',
                  fontSize: '11px',
                  color: 'var(--negative)',
                  padding: '8px 12px',
                  background: 'rgba(239,68,68,0.08)',
                  border: '1px solid rgba(239,68,68,0.2)',
                  borderRadius: '6px',
                }}>
                  High-variance parlay — even at +EV, expect frequent losses.
                </div>
              )}

              {/* Independence note */}
              <div className="font-mono" style={{
                marginTop: '12px',
                fontSize: '11px',
                color: 'var(--text-tertiary)',
                fontStyle: 'italic',
                lineHeight: 1.5,
              }}>
                {parlay.independence_note}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
