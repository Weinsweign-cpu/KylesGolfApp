import { NextResponse } from 'next/server';
import { upsertFinalizedTournament } from '@/lib/kvt/db';
import { computeTournament, type MatchupInput } from '@/lib/kvt/scoring';

// ─── Masters 2026 — Augusta National (par 72 per round) ────────────────────
// Scores are relative to par (e.g. -5, +2, 0). MC = missed cut.
const MASTERS_INPUTS: MatchupInput[] = [
  {
    matchup_num: 1,
    // Kyle: DeChambeau — missed cut (76=+4, 74=+2)
    kyle: { dg_id: 19841, player_name: 'DeChambeau, Bryson', rounds: [4, 2, null, null], made_cut: false, total_score: null },
    // Tommy: Scheffler — 70-74-65-68 → -2,+2,-7,-4 = -11
    tommy: { dg_id: 18417, player_name: 'Scheffler, Scottie', rounds: [-2, 2, -7, -4], made_cut: true, total_score: -11 },
  },
  {
    matchup_num: 2,
    // Kyle: McIlroy — 67-65-73-71 → -5,-7,+1,-1 = -12  ← LOW SCORE & TOURNAMENT WINNER
    kyle: { dg_id: 10091, player_name: 'McIlroy, Rory', rounds: [-5, -7, 1, -1], made_cut: true, total_score: -12 },
    // Tommy: Rahm — 78-70-73-68 → +6,-2,+1,-4 = +1
    tommy: { dg_id: 19195, player_name: 'Rahm, Jon', rounds: [6, -2, 1, -4], made_cut: true, total_score: 1 },
  },
  {
    matchup_num: 3,
    // Kyle: Fleetwood — 71-68-73-76 → -1,-4,+1,+4 = E
    kyle: { dg_id: 12294, player_name: 'Fleetwood, Tommy', rounds: [-1, -4, 1, 4], made_cut: true, total_score: 0 },
    // Tommy: Schauffele — 70-72-70-68 → -2,E,-2,-4 = -8
    tommy: { dg_id: 19895, player_name: 'Schauffele, Xander', rounds: [-2, 0, -2, -4], made_cut: true, total_score: -8 },
  },
  {
    matchup_num: 4,
    // Kyle: Rose — 70-69-69-70 → -2,-3,-3,-2 = -10
    kyle: { dg_id: 6093, player_name: 'Rose, Justin', rounds: [-2, -3, -3, -2], made_cut: true, total_score: -10 },
    // Tommy: Aberg — 74-70-69-72 → +2,-2,-3,E = -3
    tommy: { dg_id: 23950, player_name: 'Aberg, Ludvig', rounds: [2, -2, -3, 0], made_cut: true, total_score: -3 },
  },
  {
    matchup_num: 5,
    // Kyle: Gotterup — 72-69-72-73 → E,-3,E,+1 = -2
    kyle: { dg_id: 27774, player_name: 'Gotterup, Chris', rounds: [0, -3, 0, 1], made_cut: true, total_score: -2 },
    // Tommy: Fitzpatrick — 74-69-70-71 → +2,-3,-2,-1 = -4
    tommy: { dg_id: 17646, player_name: 'Fitzpatrick, Matt', rounds: [2, -3, -2, -1], made_cut: true, total_score: -4 },
  },
  {
    matchup_num: 6,
    // Kyle: Young — 73-67-65-73 → +1,-5,-7,+1 = -10
    kyle: { dg_id: 26651, player_name: 'Young, Cameron', rounds: [1, -5, -7, 1], made_cut: true, total_score: -10 },
    // Tommy: MacIntyre — missed cut (80=+8, 71=-1)
    tommy: { dg_id: 23323, player_name: 'MacIntyre, Robert', rounds: [8, -1, null, null], made_cut: false, total_score: null },
  },
];

// ─── PGA Championship 2026 — Aronimink Golf Club (par 70 per round) ────────
// Winner: Aaron Rai — not drafted by either player ($0 tournament winner pot)
const PGA_INPUTS: MatchupInput[] = [
  {
    matchup_num: 1,
    // Kyle: Scheffler — 67-71-71-69 → -3,+1,+1,-1 = -2
    kyle: { dg_id: 18417, player_name: 'Scheffler, Scottie', rounds: [-3, 1, 1, -1], made_cut: true, total_score: -2 },
    // Tommy: McIlroy — 74-67-66-69 → +4,-3,-4,-1 = -4
    tommy: { dg_id: 10091, player_name: 'McIlroy, Rory', rounds: [4, -3, -4, -1], made_cut: true, total_score: -4 },
  },
  {
    matchup_num: 2,
    // Kyle: Schauffele — 68-73-66-69 → -2,+3,-4,-1 = -4
    kyle: { dg_id: 19895, player_name: 'Schauffele, Xander', rounds: [-2, 3, -4, -1], made_cut: true, total_score: -4 },
    // Tommy: Young — 71-67-72-70 → +1,-3,+2,E = 0
    tommy: { dg_id: 26651, player_name: 'Young, Cameron', rounds: [1, -3, 2, 0], made_cut: true, total_score: 0 },
  },
  {
    matchup_num: 3,
    // Kyle: Fleetwood — missed cut (72=+2, 73=+3)
    kyle: { dg_id: 12294, player_name: 'Fleetwood, Tommy', rounds: [2, 3, null, null], made_cut: false, total_score: null },
    // Tommy: Rahm — 69-70-67-68 → -1,E,-3,-2 = -6  ← LOW SCORE
    tommy: { dg_id: 19195, player_name: 'Rahm, Jon', rounds: [-1, 0, -3, -2], made_cut: true, total_score: -6 },
  },
  {
    matchup_num: 4,
    // Kyle: DeChambeau — missed cut (76=+6, 71=+1)
    kyle: { dg_id: 19841, player_name: 'DeChambeau, Bryson', rounds: [6, 1, null, null], made_cut: false, total_score: null },
    // Tommy: Fitzpatrick — 70-72-71-65 → E,+2,+1,-5 = -2
    tommy: { dg_id: 17646, player_name: 'Fitzpatrick, Matt', rounds: [0, 2, 1, -5], made_cut: true, total_score: -2 },
  },
  {
    matchup_num: 5,
    // Kyle: Koepka — 69-72-68-74 → -1,+2,-2,+4 = +3
    kyle: { dg_id: 16243, player_name: 'Koepka, Brooks', rounds: [-1, 2, -2, 4], made_cut: true, total_score: 3 },
    // Tommy: Aberg — 72-66-68-69 → +2,-4,-2,-1 = -5
    tommy: { dg_id: 23950, player_name: 'Aberg, Ludvig', rounds: [2, -4, -2, -1], made_cut: true, total_score: -5 },
  },
  {
    matchup_num: 6,
    // Kyle: Fowler — 70-71-68-75 → E,+1,-2,+5 = +4
    kyle: { dg_id: 12965, player_name: 'Fowler, Rickie', rounds: [0, 1, -2, 5], made_cut: true, total_score: 4 },
    // Tommy: Cantlay — 70-69-74-68 → E,-1,+4,-2 = +1
    tommy: { dg_id: 15466, player_name: 'Cantlay, Patrick', rounds: [0, -1, 4, -2], made_cut: true, total_score: 1 },
  },
];

const SEED_DATA = [
  {
    dg_event_id: 14,
    year: 2026,
    event_name: 'Masters Tournament',
    course: 'Augusta National Golf Club',
    start_date: '2026-04-09',
    // Rory McIlroy won — Kyle's pick (dg_id 10091)
    actual_winner_name: 'McIlroy, Rory',
    actual_winner_dg_id: 10091,
    inputs: MASTERS_INPUTS,
  },
  {
    dg_event_id: 33,
    year: 2026,
    event_name: 'PGA Championship',
    course: 'Aronimink Golf Club',
    start_date: '2026-05-14',
    // Aaron Rai won — not drafted by either player
    actual_winner_name: 'Rai, Aaron',
    actual_winner_dg_id: null,
    inputs: PGA_INPUTS,
  },
];

export async function POST(req: Request) {
  const token = new URL(req.url).searchParams.get('token');
  if (!token || token !== process.env.DATAGOLF_API_KEY) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const results: string[] = [];

  for (const t of SEED_DATA) {
    // Compute full results from actual round-by-round scores
    const computed = computeTournament(t.inputs, t.actual_winner_name, t.actual_winner_dg_id);
    const final_results_json = JSON.stringify(computed);

    const matchups = t.inputs.map(m => ({
      matchup_num: m.matchup_num,
      kyle_dg_id: m.kyle.dg_id,
      kyle_player_name: m.kyle.player_name,
      tommy_dg_id: m.tommy.dg_id,
      tommy_player_name: m.tommy.player_name,
    }));

    const { id, replaced } = await upsertFinalizedTournament({
      dg_event_id: t.dg_event_id,
      year: t.year,
      event_name: t.event_name,
      course: t.course,
      start_date: t.start_date,
      final_net_to_kyle: computed.net_to_kyle,
      final_results_json,
      matchups,
    });

    const action = replaced ? 'Replaced' : 'Created';
    results.push(`${action} ${t.event_name} (id=${id}, net=${computed.net_to_kyle >= 0 ? '+' : ''}${computed.net_to_kyle})`);
  }

  return NextResponse.json({ ok: true, results });
}
