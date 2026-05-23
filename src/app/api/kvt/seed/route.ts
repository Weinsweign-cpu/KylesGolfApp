import { NextResponse } from 'next/server';
import { upsertFinalizedTournament } from '@/lib/kvt/db';

const SEED_DATA = [
  {
    dg_event_id: 14,
    year: 2026,
    event_name: 'Masters Tournament',
    course: 'Augusta National Golf Club',
    start_date: '2026-04-09',
    final_net_to_kyle: 46,
    matchups: [
      { matchup_num: 1, kyle_dg_id: 19841, kyle_player_name: 'DeChambeau, Bryson', tommy_dg_id: 18417, tommy_player_name: 'Scheffler, Scottie' },
      { matchup_num: 2, kyle_dg_id: 10091, kyle_player_name: 'McIlroy, Rory',      tommy_dg_id: 19195, tommy_player_name: 'Rahm, Jon' },
      { matchup_num: 3, kyle_dg_id: 12294, kyle_player_name: 'Fleetwood, Tommy',   tommy_dg_id: 19895, tommy_player_name: 'Schauffele, Xander' },
      { matchup_num: 4, kyle_dg_id: 6093,  kyle_player_name: 'Rose, Justin',       tommy_dg_id: 23950, tommy_player_name: 'Aberg, Ludvig' },
      { matchup_num: 5, kyle_dg_id: 27774, kyle_player_name: 'Gotterup, Chris',    tommy_dg_id: 17646, tommy_player_name: 'Fitzpatrick, Matt' },
      { matchup_num: 6, kyle_dg_id: 26651, kyle_player_name: 'Young, Cameron',     tommy_dg_id: 23323, tommy_player_name: 'MacIntyre, Robert' },
    ],
  },
  {
    dg_event_id: 33,
    year: 2026,
    event_name: 'PGA Championship',
    course: 'Quail Hollow Club',
    start_date: '2026-05-14',
    final_net_to_kyle: -53,
    matchups: [
      { matchup_num: 1, kyle_dg_id: 18417, kyle_player_name: 'Scheffler, Scottie', tommy_dg_id: 10091, tommy_player_name: 'McIlroy, Rory' },
      { matchup_num: 2, kyle_dg_id: 19895, kyle_player_name: 'Schauffele, Xander', tommy_dg_id: 26651, tommy_player_name: 'Young, Cameron' },
      { matchup_num: 3, kyle_dg_id: 12294, kyle_player_name: 'Fleetwood, Tommy',   tommy_dg_id: 19195, tommy_player_name: 'Rahm, Jon' },
      { matchup_num: 4, kyle_dg_id: 19841, kyle_player_name: 'DeChambeau, Bryson', tommy_dg_id: 17646, tommy_player_name: 'Fitzpatrick, Matt' },
      { matchup_num: 5, kyle_dg_id: 16243, kyle_player_name: 'Koepka, Brooks',     tommy_dg_id: 23950, tommy_player_name: 'Aberg, Ludvig' },
      { matchup_num: 6, kyle_dg_id: 12965, kyle_player_name: 'Fowler, Rickie',     tommy_dg_id: 15466, tommy_player_name: 'Cantlay, Patrick' },
    ],
  },
];

export async function POST(req: Request) {
  const token = new URL(req.url).searchParams.get('token');
  if (!token || token !== process.env.DATAGOLF_API_KEY) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const results: string[] = [];

  for (const t of SEED_DATA) {
    const { id, replaced } = await upsertFinalizedTournament(t);
    if (replaced) results.push(`Replaced existing ${t.event_name} → id=${id}, net=${t.final_net_to_kyle}`);
    else results.push(`Created ${t.event_name} (id=${id}, net=${t.final_net_to_kyle})`);
  }

  return NextResponse.json({ ok: true, results });
}
