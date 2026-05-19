export const dynamic = 'force-dynamic';
import { getPickableEvents } from '@/lib/datagolf';
import NewTournamentForm from '@/components/kvt/NewTournamentForm';

export default async function Page() {
  const events = await getPickableEvents(2026);
  return <NewTournamentForm events={events} />;
}
