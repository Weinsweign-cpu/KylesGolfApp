import 'server-only';
import type { GolferPerformance } from './scoring';
import type { KvtMatchup } from './db';

const BASE = 'https://feeds.datagolf.com';

type LiveEntry = {
  dg_id: number;
  player_name: string;
  total: number | null;
  round: number | null;
  thru: number | null;
  position: string | null;
};

async function fetchRound(round: number | 'event_avg', key: string): Promise<{
  event_name: string;
  stats: LiveEntry[];
}> {
  const url = `${BASE}/preds/live-tournament-stats?stats=sg_total&round=${round}&display=value&file_format=json&key=${key}`;
  const res = await fetch(url, { next: { revalidate: 300 } });
  if (!res.ok) throw new Error(`live-tournament-stats returned ${res.status}`);
  const data = await res.json();
  const stats: LiveEntry[] = (data.live_stats ?? []).map((e: Record<string, unknown>) => ({
    dg_id: Number(e.dg_id),
    player_name: String(e.player_name ?? ''),
    total: e.total != null ? Number(e.total) : null,
    round: e.round != null ? Number(e.round) : null,
    thru: e.thru != null ? Number(e.thru) : null,
    position: e.position != null ? String(e.position) : null,
  }));
  return { event_name: String(data.event_name ?? ''), stats };
}

export async function getGolferPerformances(
  _dgEventId: number,
  _year: number,
  matchups: KvtMatchup[]
): Promise<{
  event_name: string;
  performances: Map<number, GolferPerformance>;
  cut_line: number | null;
  tournament_complete: boolean;
  actual_winner_name: string | null;
  actual_winner_dg_id: number | null;
}> {
  const key = process.env.DATAGOLF_API_KEY;
  if (!key) throw new Error('DATAGOLF_API_KEY not set');

  const trackedIds = new Set<number>();
  for (const m of matchups) {
    trackedIds.add(m.kyle_dg_id);
    trackedIds.add(m.tommy_dg_id);
  }

  // Fetch all 4 rounds + overall in parallel
  const [r1, r2, r3, r4, rAll] = await Promise.all([
    fetchRound(1, key),
    fetchRound(2, key),
    fetchRound(3, key),
    fetchRound(4, key),
    fetchRound('event_avg', key),
  ]);

  const event_name = rAll.event_name;

  // Build lookup maps: dg_id → score for each round
  function buildMap(stats: LiveEntry[]): Map<number, LiveEntry> {
    const m = new Map<number, LiveEntry>();
    for (const e of stats) m.set(e.dg_id, e);
    return m;
  }
  const maps = [buildMap(r1.stats), buildMap(r2.stats), buildMap(r3.stats), buildMap(r4.stats)];
  const allMap = buildMap(rAll.stats);

  const performances = new Map<number, GolferPerformance>();

  for (const id of trackedIds) {
    const overall = allMap.get(id);
    const pos = overall?.position ?? '';
    const missedCut = /^(MC|CUT|WD|DQ)$/i.test(pos.trim());

    // Get per-round scores. A round score is valid when thru > 0 (player played holes).
    const rounds: [number | null, number | null, number | null, number | null] = [
      null, null, null, null,
    ];
    for (let i = 0; i < 4; i++) {
      const entry = maps[i].get(id);
      // thru > 0 means the player played at least one hole in this round
      if (entry && entry.thru != null && entry.thru > 0 && entry.round != null) {
        rounds[i] = entry.round;
      }
    }

    const made_cut = !missedCut && (rounds[2] != null || rounds[3] != null);
    const all4 = rounds.every(r => r != null);
    const total_score = made_cut && all4
      ? (rounds as number[]).reduce((a, b) => a + b, 0)
      : null;

    const mEntry = matchups.find(m => m.kyle_dg_id === id || m.tommy_dg_id === id);
    const name = overall?.player_name
      ?? (mEntry ? (mEntry.kyle_dg_id === id ? mEntry.kyle_player_name : mEntry.tommy_player_name) : 'Unknown');

    performances.set(id, {
      dg_id: id,
      player_name: name,
      rounds,
      made_cut,
      total_score,
    });
  }

  // Ensure every tracked id has a fallback
  for (const id of trackedIds) {
    if (!performances.has(id)) {
      const m = matchups.find(mm => mm.kyle_dg_id === id || mm.tommy_dg_id === id);
      const name = m?.kyle_dg_id === id ? m.kyle_player_name : (m?.tommy_player_name ?? 'Unknown');
      performances.set(id, {
        dg_id: id,
        player_name: name,
        rounds: [null, null, null, null],
        made_cut: false,
        total_score: null,
      });
    }
  }

  // Find actual winner from the overall stats (position === '1')
  let actual_winner_name: string | null = null;
  let actual_winner_dg_id: number | null = null;
  for (const e of rAll.stats) {
    if (String(e.position ?? '').trim() === '1') {
      actual_winner_name = e.player_name;
      actual_winner_dg_id = e.dg_id;
      break;
    }
  }

  return {
    event_name,
    performances,
    cut_line: null,
    tournament_complete: actual_winner_name !== null && (rAll.stats[0]?.thru ?? 0) >= 18,
    actual_winner_name,
    actual_winner_dg_id,
  };
}
