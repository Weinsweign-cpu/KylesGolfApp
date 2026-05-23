import { NextResponse } from 'next/server';
import { getTournamentById, getKvtMatchups } from '@/lib/kvt/db';
import { getGolferPerformances } from '@/lib/kvt/data';
import { computeTournament, type MatchupInput } from '@/lib/kvt/scoring';

export async function GET(req: Request) {
  const id = Number(new URL(req.url).searchParams.get('id'));
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const tournament = await getTournamentById(id);
  if (!tournament) return NextResponse.json({ error: 'not found' }, { status: 404 });

  const matchups = await getKvtMatchups(id);
  if (matchups.length === 0) return NextResponse.json({ error: 'no matchups' }, { status: 404 });

  try {
    const { performances, tournament_complete, actual_winner_name, actual_winner_dg_id, event_name } =
      await getGolferPerformances(tournament.dg_event_id, tournament.year, matchups);

    const inputs: MatchupInput[] = matchups.map(m => ({
      matchup_num: m.matchup_num,
      kyle: performances.get(m.kyle_dg_id)!,
      tommy: performances.get(m.tommy_dg_id)!,
    }));

    const result = computeTournament(
      inputs,
      actual_winner_name ?? 'TBD',
      actual_winner_dg_id
    );

    return NextResponse.json({
      ...result,
      tournament_complete,
      live_event_name: event_name,
      event_name_match: event_name === tournament.event_name,
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
