import { getTournamentById, getKvtMatchups } from '@/lib/kvt/db';
import { getPickableEvents } from '@/lib/datagolf';
import NewTournamentForm from '@/components/kvt/NewTournamentForm';
import { notFound } from 'next/navigation';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tournament = getTournamentById(parseInt(id, 10));
  if (!tournament) notFound();
  const matchups = getKvtMatchups(tournament.id);
  const events = await getPickableEvents(tournament.year);
  return <NewTournamentForm events={events} editTournament={tournament} editMatchups={matchups} />;
}
