'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { KvtTournament, KvtMatchup } from '@/lib/kvt/db';
import type { TournamentResult, DailyResult } from '@/lib/kvt/scoring';

type ResultWithMeta = TournamentResult & {
  tournament_complete: boolean;
  live_event_name: string;
  event_name_match: boolean;
};

function dollars(n: number) {
  const abs = Math.abs(n).toFixed(2);
  return n >= 0 ? `+$${abs}` : `-$${abs}`;
}

function scoreStr(n: number | null) {
  if (n == null) return '—';
  return n > 0 ? `+${n}` : String(n);
}

function RoundCell({ d, side }: { d: DailyResult; side: 'kyle' | 'tommy' }) {
  const score = side === 'kyle' ? d.kyle_score : d.tommy_score;
  const won = d.winner === side;
  const lost = d.winner !== 'void' && d.winner !== side;
  return (
    <div style={{
      textAlign: 'center',
      padding: '6px 4px',
      borderRadius: '4px',
      background: won ? 'rgba(16,185,129,0.15)' : lost ? 'rgba(239,68,68,0.10)' : 'transparent',
      minWidth: '36px',
    }}>
      <div className="font-mono tabular" style={{
        fontSize: '13px', fontWeight: won ? 600 : 400,
        color: won ? 'var(--positive)' : lost ? 'var(--negative)' : 'var(--text-tertiary)',
      }}>
        {scoreStr(score)}
      </div>
    </div>
  );
}

function MatchupCard({ result }: { result: TournamentResult['matchup_results'][0] }) {
  const net = result.total_dollars_to_kyle;
  const netColor = net > 0 ? 'var(--positive)' : net < 0 ? 'var(--negative)' : 'var(--text-tertiary)';

  function formatN(n: string) {
    if (!n.includes(',')) return n;
    const [last, rest] = n.split(',', 2);
    return rest.trim() + ' ' + last.trim();
  }

  return (
    <div style={{
      background: 'var(--bg-secondary)', border: '1px solid var(--border)',
      borderRadius: '10px', padding: '16px',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <div className="font-mono" style={{ fontSize: '9px', color: 'var(--text-tertiary)', letterSpacing: '0.14em', textTransform: 'uppercase' }}>
          Matchup {result.matchup_num}
        </div>
        <div className="font-mono tabular" style={{ fontSize: '13px', fontWeight: 600, color: netColor }}>
          {dollars(net)}
        </div>
      </div>

      {/* Players + rounds */}
      {(['kyle', 'tommy'] as const).map(side => {
        const perf = result[side];
        const name = formatN(perf.player_name);
        return (
          <div key={side} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <div style={{ width: '130px', fontSize: '13px', color: side === 'kyle' ? 'var(--text-primary)' : 'var(--text-secondary)', fontWeight: side === 'kyle' ? 500 : 400 }}>
              {name}
            </div>
            <div style={{ display: 'flex', gap: '4px' }}>
              {result.daily.map(d => (
                <RoundCell key={d.round} d={d} side={side} />
              ))}
            </div>
            <div className="font-mono tabular" style={{
              fontSize: '11px', marginLeft: '4px',
              color: perf.made_cut ? 'var(--text-secondary)' : 'var(--negative)',
            }}>
              {perf.made_cut ? (perf.total_score != null ? scoreStr(perf.total_score) : '…') : 'MC'}
            </div>
          </div>
        );
      })}

      {/* Overall */}
      <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid var(--border)', fontSize: '11px', color: 'var(--text-tertiary)' }}>
        <span className="font-mono" style={{ fontStyle: 'italic' }}>Overall: {result.overall.reason}</span>
        {result.overall.winner !== 'void' && (
          <span className="font-mono" style={{
            marginLeft: '8px', fontWeight: 600,
            color: result.overall.winner === 'kyle' ? 'var(--positive)' : 'var(--negative)',
          }}>
            {result.overall.winner === 'kyle' ? 'Kyle +$3' : 'Tommy +$3'}
          </span>
        )}
      </div>
    </div>
  );
}

function FinalizedView({ tournament, matchups }: { tournament: KvtTournament; matchups: KvtMatchup[] }) {
  const net = tournament.final_net_to_kyle ?? 0;
  const netColor = net > 0 ? 'var(--positive)' : net < 0 ? 'var(--negative)' : 'var(--text-secondary)';
  const netLabel = net > 0 ? `Kyle +$${net.toFixed(2)}` : net < 0 ? `Tommy +$${Math.abs(net).toFixed(2)}` : 'Even';

  // Parse stored results if available — gives us full round-by-round detail
  let storedResult: TournamentResult | null = null;
  if (tournament.final_results_json) {
    try { storedResult = JSON.parse(tournament.final_results_json) as TournamentResult; } catch { /* bad json */ }
  }

  function formatN(n: string) {
    if (!n.includes(',')) return n;
    const [last, rest] = n.split(',', 2);
    return rest.trim() + ' ' + last.trim();
  }

  return (
    <main style={{ padding: '40px', maxWidth: '900px', margin: '0 auto' }}>
      <div style={{ marginBottom: '24px' }}>
        <div className="font-mono" style={{ fontSize: '11px', color: 'var(--text-tertiary)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '6px' }}>
          Kyle vs Tommy · Result
        </div>
        <h1 className="font-display" style={{ fontSize: '36px', fontWeight: 600, letterSpacing: '-0.02em', margin: '0 0 4px' }}>
          {tournament.event_name}
        </h1>
        {tournament.course && (
          <div className="font-mono" style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{tournament.course}</div>
        )}
      </div>

      {/* Net summary */}
      <div style={{ marginBottom: '24px', padding: '20px 24px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap' }}>
        <div>
          <div className="font-mono" style={{ fontSize: '10px', color: 'var(--text-tertiary)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '4px' }}>Final Result</div>
          <div className="font-display tabular" style={{ fontSize: '44px', fontWeight: 700, color: netColor, lineHeight: 1, letterSpacing: '-0.02em' }}>
            {netLabel}
          </div>
          {tournament.finalized_at && (
            <div className="font-mono" style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '8px' }}>
              Finalized {tournament.finalized_at.slice(0, 10)}
            </div>
          )}
        </div>
        {storedResult && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div className="font-mono" style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
              Matchups: <span style={{ color: 'var(--text-primary)' }}>{dollars(storedResult.matchup_total_to_kyle)}</span>
            </div>
            <div className="font-mono" style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
              Low Score: <span style={{ color: storedResult.low_score.dollars_to_kyle > 0 ? 'var(--positive)' : storedResult.low_score.dollars_to_kyle < 0 ? 'var(--negative)' : 'var(--text-tertiary)' }}>
                {storedResult.low_score.dollars_to_kyle !== 0 ? dollars(storedResult.low_score.dollars_to_kyle) : '—'}
              </span>
            </div>
            <div className="font-mono" style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
              Tournament Winner: <span style={{ color: storedResult.tournament_winner.dollars_to_kyle > 0 ? 'var(--positive)' : storedResult.tournament_winner.dollars_to_kyle < 0 ? 'var(--negative)' : 'var(--text-tertiary)' }}>
                {storedResult.tournament_winner.dollars_to_kyle !== 0 ? dollars(storedResult.tournament_winner.dollars_to_kyle) : '—'}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Full matchup detail if we have stored results */}
      {storedResult ? (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: '12px', marginBottom: '20px' }}>
            {storedResult.matchup_results.map(mr => (
              <MatchupCard key={mr.matchup_num} result={mr} />
            ))}
          </div>

          {/* Low score + tournament winner */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '10px', padding: '16px' }}>
              <div className="font-mono" style={{ fontSize: '9px', color: 'var(--text-tertiary)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: '8px' }}>Low Score ($20)</div>
              {storedResult.low_score.player_name ? (
                <>
                  <div style={{ fontSize: '14px', fontWeight: 500, marginBottom: '4px' }}>{formatN(storedResult.low_score.player_name)}</div>
                  <div className="font-mono" style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    {scoreStr(storedResult.low_score.score)} total · owned by {storedResult.low_score.owner === 'void' ? 'both' : storedResult.low_score.owner}
                  </div>
                  <div className="font-mono" style={{ fontSize: '13px', fontWeight: 600, color: storedResult.low_score.dollars_to_kyle > 0 ? 'var(--positive)' : storedResult.low_score.dollars_to_kyle < 0 ? 'var(--negative)' : 'var(--text-tertiary)' }}>
                    {storedResult.low_score.dollars_to_kyle !== 0 ? dollars(storedResult.low_score.dollars_to_kyle) : 'Tied — $0'}
                  </div>
                </>
              ) : (
                <div className="font-mono" style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>No data</div>
              )}
            </div>
            <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '10px', padding: '16px' }}>
              <div className="font-mono" style={{ fontSize: '9px', color: 'var(--text-tertiary)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: '8px' }}>Tournament Winner ($20)</div>
              <div style={{ fontSize: '14px', fontWeight: 500, marginBottom: '4px' }}>{formatN(storedResult.tournament_winner.player_name)}</div>
              <div className="font-mono" style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                {storedResult.tournament_winner.was_drafted ? `drafted by ${storedResult.tournament_winner.owner}` : 'not drafted'}
              </div>
              <div className="font-mono" style={{ fontSize: '13px', fontWeight: 600, color: storedResult.tournament_winner.dollars_to_kyle > 0 ? 'var(--positive)' : storedResult.tournament_winner.dollars_to_kyle < 0 ? 'var(--negative)' : 'var(--text-tertiary)' }}>
                {storedResult.tournament_winner.dollars_to_kyle !== 0 ? dollars(storedResult.tournament_winner.dollars_to_kyle) : 'No payout'}
              </div>
            </div>
          </div>
        </>
      ) : (
        /* Fallback: no stored results — show just the matchup pairs (names only) */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: '12px' }}>
          {matchups.map(m => (
            <div key={m.matchup_num} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '10px', padding: '16px' }}>
              <div className="font-mono" style={{ fontSize: '9px', color: 'var(--text-tertiary)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: '10px' }}>
                Matchup {m.matchup_num}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>{formatN(m.kyle_player_name)}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontFamily: 'IBM Plex Mono, monospace' }}>vs</div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{formatN(m.tommy_player_name)}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}

export default function ActiveBetView({ tournament, matchups, readOnly }: { tournament: KvtTournament; matchups: KvtMatchup[]; readOnly?: boolean }) {
  const router = useRouter();
  const [result, setResult] = useState<ResultWithMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);
  const [finalizing, setFinalizing] = useState(false);
  const [mismatchWarning, setMismatchWarning] = useState(false);

  const isFinalized = tournament.status === 'finalized';

  const fetchResult = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/kvt/result?id=${tournament.id}`, { cache: 'no-store' });
      if (res.ok) {
        const d = await res.json();
        setResult(d);
        setLastSynced(new Date());
        if (!d.event_name_match) setMismatchWarning(true);
      }
    } finally {
      setLoading(false);
    }
  }, [tournament.id]);

  useEffect(() => {
    if (readOnly && isFinalized) return;
    fetchResult();
  }, [fetchResult, readOnly, isFinalized]);

  if (readOnly && isFinalized) {
    return <FinalizedView tournament={tournament} matchups={matchups} />;
  }

  async function handleFinalize() {
    const computed = result?.net_to_kyle;
    const defaultVal = computed != null ? String(computed) : '0';
    const input = prompt(
      `Final net to Kyle (positive = Kyle wins, negative = Tommy wins).\nComputed from live data: ${computed != null ? '$' + computed.toFixed(2) : 'unavailable'}\n\nEnter the correct amount or leave as-is:`,
      defaultVal
    );
    if (input === null) return; // cancelled
    const net = Number(input);
    if (isNaN(net)) { alert('Invalid number'); return; }
    if (!confirm(`Finalize with Kyle net = $${net.toFixed(2)}? This moves it to history.`)) return;
    setFinalizing(true);
    try {
      await fetch(`/api/kvt/finalize?id=${tournament.id}&net=${net}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Pass the current live result so history stores the full matchup detail
        body: JSON.stringify({ results: result }),
      });
      router.push('/kvt/history');
    } finally {
      setFinalizing(false);
    }
  }

  const net = result?.net_to_kyle ?? 0;
  const netColor = net > 0 ? 'var(--positive)' : net < 0 ? 'var(--negative)' : 'var(--text-secondary)';
  const netLabel = net > 0 ? `Kyle +$${net.toFixed(2)}` : net < 0 ? `Tommy +$${Math.abs(net).toFixed(2)}` : 'Even';

  return (
    <main style={{ padding: '40px', maxWidth: '900px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div className="font-mono" style={{ fontSize: '11px', color: 'var(--text-tertiary)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '6px' }}>
            Kyle vs Tommy · {readOnly ? 'Result' : 'Active Bet'}
          </div>
          <h1 className="font-display" style={{ fontSize: '36px', fontWeight: 600, letterSpacing: '-0.02em', margin: '0 0 4px' }}>
            {tournament.event_name}
          </h1>
          {tournament.course && (
            <div className="font-mono" style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{tournament.course}</div>
          )}
        </div>
        {!readOnly && (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <Link
              href={`/kvt/edit/${tournament.id}`}
              style={{
                padding: '8px 14px', background: 'var(--bg-secondary)', border: '1px solid var(--border)',
                borderRadius: '6px', fontFamily: 'IBM Plex Mono, monospace',
                fontSize: '11px', color: 'var(--text-secondary)', letterSpacing: '0.06em',
                textDecoration: 'none', display: 'inline-block',
              }}
            >
              EDIT PICKS
            </Link>
            <button
              onClick={fetchResult}
              disabled={loading}
              style={{
                padding: '8px 14px', background: 'var(--bg-secondary)', border: '1px solid var(--border)',
                borderRadius: '6px', cursor: 'pointer', fontFamily: 'IBM Plex Mono, monospace',
                fontSize: '11px', color: 'var(--text-secondary)', letterSpacing: '0.06em',
              }}
            >
              {loading ? 'SYNCING…' : 'SYNC FROM DATAGOLF'}
            </button>
          </div>
        )}
      </div>

      {lastSynced && (
        <div className="font-mono" style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '8px' }}>
          Last synced: {lastSynced.toLocaleTimeString()}
        </div>
      )}

      {mismatchWarning && !readOnly && (
        <div className="font-mono" style={{ fontSize: '11px', color: 'var(--negative)', marginBottom: '12px', padding: '8px 12px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '6px' }}>
          ⚠ Live data is for a different tournament than this bet. Scores may not match.
          {result?.live_event_name && ` (DataGolf is showing: ${result.live_event_name})`}
        </div>
      )}

      {/* Net display */}
      <div style={{ marginBottom: '24px', padding: '20px 24px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap' }}>
        <div>
          <div className="font-mono" style={{ fontSize: '10px', color: 'var(--text-tertiary)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '4px' }}>Current Net</div>
          <div className="font-display tabular" style={{ fontSize: '44px', fontWeight: 700, color: netColor, lineHeight: 1, letterSpacing: '-0.02em' }}>
            {loading && !result ? '—' : netLabel}
          </div>
        </div>
        {result && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div className="font-mono" style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
              Matchups: <span style={{ color: 'var(--text-primary)' }}>{dollars(result.matchup_total_to_kyle)}</span>
            </div>
            <div className="font-mono" style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
              Low Score: <span style={{ color: result.low_score.dollars_to_kyle > 0 ? 'var(--positive)' : result.low_score.dollars_to_kyle < 0 ? 'var(--negative)' : 'var(--text-tertiary)' }}>
                {result.low_score.dollars_to_kyle !== 0 ? dollars(result.low_score.dollars_to_kyle) : '—'}
              </span>
            </div>
            <div className="font-mono" style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
              Tournament Winner: <span style={{ color: result.tournament_winner.dollars_to_kyle > 0 ? 'var(--positive)' : result.tournament_winner.dollars_to_kyle < 0 ? 'var(--negative)' : 'var(--text-tertiary)' }}>
                {result.tournament_winner.dollars_to_kyle !== 0 ? dollars(result.tournament_winner.dollars_to_kyle) : '—'}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Matchup cards */}
      {result && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: '12px', marginBottom: '20px' }}>
            {result.matchup_results.map(mr => (
              <MatchupCard key={mr.matchup_num} result={mr} />
            ))}
          </div>

          {/* Low score + tournament winner */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '24px' }}>
            <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '10px', padding: '16px' }}>
              <div className="font-mono" style={{ fontSize: '9px', color: 'var(--text-tertiary)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: '8px' }}>Low Score ($20)</div>
              {result.low_score.player_name ? (
                <>
                  <div style={{ fontSize: '14px', fontWeight: 500, marginBottom: '4px' }}>{result.low_score.player_name}</div>
                  <div className="font-mono" style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    {scoreStr(result.low_score.score)} total · owned by {result.low_score.owner === 'void' ? 'both' : result.low_score.owner}
                  </div>
                  <div className="font-mono" style={{ fontSize: '13px', fontWeight: 600, color: result.low_score.dollars_to_kyle > 0 ? 'var(--positive)' : result.low_score.dollars_to_kyle < 0 ? 'var(--negative)' : 'var(--text-tertiary)' }}>
                    {result.low_score.dollars_to_kyle !== 0 ? dollars(result.low_score.dollars_to_kyle) : 'Tied — $0'}
                  </div>
                </>
              ) : (
                <div className="font-mono" style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>Pending tournament data</div>
              )}
            </div>
            <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '10px', padding: '16px' }}>
              <div className="font-mono" style={{ fontSize: '9px', color: 'var(--text-tertiary)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: '8px' }}>Tournament Winner ($20)</div>
              <div style={{ fontSize: '14px', fontWeight: 500, marginBottom: '4px' }}>{result.tournament_winner.player_name}</div>
              <div className="font-mono" style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                {result.tournament_winner.was_drafted ? `drafted by ${result.tournament_winner.owner}` : 'not drafted'}
              </div>
              <div className="font-mono" style={{ fontSize: '13px', fontWeight: 600, color: result.tournament_winner.dollars_to_kyle > 0 ? 'var(--positive)' : result.tournament_winner.dollars_to_kyle < 0 ? 'var(--negative)' : 'var(--text-tertiary)' }}>
                {result.tournament_winner.dollars_to_kyle !== 0 ? dollars(result.tournament_winner.dollars_to_kyle) : 'No payout'}
              </div>
            </div>
          </div>

          {/* Finalize button */}
          {!readOnly && (
            <button
              onClick={handleFinalize}
              disabled={finalizing}
              style={{
                padding: '12px 28px', background: 'var(--edge)', color: '#fff', border: 'none',
                borderRadius: '6px', cursor: 'pointer', fontFamily: 'IBM Plex Mono, monospace',
                fontSize: '12px', letterSpacing: '0.1em', fontWeight: 500,
              }}
            >
              {finalizing ? 'FINALIZING…' : 'FINALIZE TOURNAMENT →'}
            </button>
          )}
        </>
      )}
    </main>
  );
}
