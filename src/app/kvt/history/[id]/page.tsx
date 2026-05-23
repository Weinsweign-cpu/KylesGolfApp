export const dynamic = 'force-dynamic';
import { getTournamentById, getKvtMatchups } from '@/lib/kvt/db';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import ActiveBetView from '@/components/kvt/ActiveBetView';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tournament = await getTournamentById(parseInt(id, 10));
  if (!tournament) notFound();
  const matchups = await getKvtMatchups(tournament.id);

  return (
    <div>
      <div style={{ padding: '24px 40px 0' }}>
        <Link href="/kvt/history" style={{
          fontFamily: 'IBM Plex Mono, monospace', fontSize: '11px', color: 'var(--text-tertiary)',
          letterSpacing: '0.08em', textDecoration: 'none', textTransform: 'uppercase',
        }}>
          ← History
        </Link>
      </div>
      <ActiveBetView tournament={tournament} matchups={matchups} readOnly />
    </div>
  );
}
