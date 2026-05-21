import { NextResponse } from 'next/server';
import { getTournamentById, getKvtMatchups, finalizeTournament } from '@/lib/kvt/db';
import { getGolferPerformances } from '@/lib/kvt/data';
import { computeTournament, type MatchupInput } from '@/lib/kvt/scoring';

export async function POST(req: Request) {
  const url = new URL(req.url);
  const id = Number(url.searchParams.get('id'));
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const tournament = getTournamentById(id);
  if (!tournament) return NextResponse.json({ error: 'not found' }, { status: 404 });

  // Allow manual net override (for historical tournaments where live data is wrong)
  const netOverride = url.searchParams.get('net');
  if (netOverride !== null) {
    const net = Number(netOverride);
    if (isNaN(net)) return NextResponse.json({ error: 'invalid net value' }, { status: 400 });
    finalizeTournament(id, net);
    return NextResponse.json({ net_to_kyle: net });
  }

  const matchups = getKvtMatchups(id);

  try {
    const { performances, actual_winner_name, actual_winner_dg_id } =
      await getGolferPerformances(tournament.dg_event_id, tournament.year, matchups);

    const inputs: MatchupInput[] = matchups.map(m => ({
      matchup_num: m.matchup_num,
      kyle: performances.get(m.kyle_dg_id)!,
      tommy: performances.get(m.tommy_dg_id)!,
    }));

    const result = computeTournament(inputs, actual_winner_name ?? 'TBD', actual_winner_dg_id);
    finalizeTournament(id, result.net_to_kyle);
    return NextResponse.json({ net_to_kyle: result.net_to_kyle });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
