import { getActiveTournament, getKvtMatchups } from '@/lib/kvt/db';
import ActiveBetView from '@/components/kvt/ActiveBetView';
import Link from 'next/link';

export default function Page() {
  const tournament = getActiveTournament();
  if (!tournament) {
    return (
      <main style={{ padding: '40px', maxWidth: '900px', margin: '0 auto' }}>
        <div className="font-mono" style={{ fontSize: '11px', color: 'var(--text-tertiary)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '6px' }}>
          Kyle vs Tommy
        </div>
        <h1 className="font-display" style={{ fontSize: '40px', fontWeight: 600, letterSpacing: '-0.02em', margin: '0 0 16px' }}>
          Active Bet
        </h1>
        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '12px', padding: '40px', textAlign: 'center' }}>
          <div className="font-mono" style={{ color: 'var(--text-tertiary)', fontSize: '14px', marginBottom: '16px' }}>
            No active tournament.
          </div>
          <Link href="/kvt/new" style={{
            display: 'inline-block', padding: '10px 20px', background: 'var(--edge)',
            color: '#fff', borderRadius: '6px', textDecoration: 'none',
            fontFamily: 'IBM Plex Mono, monospace', fontSize: '12px', letterSpacing: '0.08em',
          }}>
            NEW TOURNAMENT →
          </Link>
        </div>
      </main>
    );
  }

  const matchups = getKvtMatchups(tournament.id);
  return <ActiveBetView tournament={tournament} matchups={matchups} />;
}
