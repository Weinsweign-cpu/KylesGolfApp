export const dynamic = 'force-dynamic';
import { getTournaments } from '@/lib/kvt/db';
import HistoryView from '@/components/kvt/HistoryView';

export default function Page() {
  const tournaments = getTournaments();
  const lifetimeNet = tournaments
    .filter(t => t.final_net_to_kyle != null)
    .reduce((s, t) => s + (t.final_net_to_kyle ?? 0), 0);
  return <HistoryView tournaments={tournaments} lifetimeNet={lifetimeNet} />;
}
