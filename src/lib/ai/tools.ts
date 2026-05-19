import 'server-only';
import { getPickableEvents } from '@/lib/datagolf';
import { getActiveTournament, getKvtMatchups, getTournaments } from '@/lib/kvt/db';
import { getGolferPerformances } from '@/lib/kvt/data';
import { computeTournament } from '@/lib/kvt/scoring';

export const TOOLS = [
  {
    name: 'get_current_event',
    description: "Get information about the current or upcoming PGA Tour event — name, course, dates, status (upcoming/in_progress/completed). Call this when the user asks 'what's this week' or anything event-related where the current event matters.",
    input_schema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'get_predictions',
    description: "Get DataGolf's pre-tournament win probabilities for the current event. Returns top players sorted by win probability with their Win%, Top 5%, Top 10%, Top 20%, and Make Cut%. Use this for questions about who's favored, who has best odds, etc.",
    input_schema: {
      type: 'object',
      properties: {
        limit: { type: 'integer', description: 'How many top players to return (default 15, max 50)' },
      },
      required: [],
    },
  },
  {
    name: 'get_best_bets',
    description: "Get the current top value bets across all outright markets (win, top 5, top 10, top 20, make cut). Each bet has model probability, best sportsbook offering, decimal odds, and EV%. Returns only +EV bets by default. Use this when the user asks 'what should I bet on', 'where's the edge', 'best value', etc.",
    input_schema: {
      type: 'object',
      properties: {
        market: {
          type: 'string',
          enum: ['win', 'top_5', 'top_10', 'top_20', 'make_cut', 'all'],
          description: "Which market to focus on. 'all' returns top picks across every market.",
        },
        min_ev: { type: 'number', description: 'Minimum EV% threshold (default 0)' },
      },
      required: ['market'],
    },
  },
  {
    name: 'get_matchups',
    description: "Get DataGolf's head-to-head matchups, 3-balls, or round-matchups with their EV%. Returns matchup_market data for the current event. Useful for 'who's the best head-to-head bet' type questions.",
    input_schema: {
      type: 'object',
      properties: {
        market: {
          type: 'string',
          enum: ['tournament_matchups', '3_balls', 'round_matchups'],
        },
        min_ev: { type: 'number', description: 'Minimum EV% threshold (default 5)' },
      },
      required: ['market'],
    },
  },
  {
    name: 'get_player_profile',
    description: "Get a specific player's DataGolf profile: SG breakdown (driving, approach, around-green, putting), course fit, course history, recent form. Use when the user asks about a specific player by name.",
    input_schema: {
      type: 'object',
      properties: {
        player_name: { type: 'string', description: 'Player name. Will fuzzy-match against the field (e.g. "Scheffler" or "Scottie Scheffler" both work).' },
      },
      required: ['player_name'],
    },
  },
  {
    name: 'get_kvt_state',
    description: "Get the current state of the Kyle vs Tommy bet — the active tournament, the 6 matchups, who's winning each, the current net dollars to Kyle. Returns null if no active K vs T bet. Use whenever the user asks 'how am I doing against Tommy' or anything about their personal bet.",
    input_schema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'get_leaderboard',
    description: "Get the live tournament leaderboard for the current event — positions, scores, current round. Only useful during or after a tournament.",
    input_schema: {
      type: 'object',
      properties: {
        limit: { type: 'integer', description: 'How many top players (default 20)' },
      },
      required: [],
    },
  },
] as const;

export async function executeTool(name: string, input: Record<string, unknown>): Promise<unknown> {
  const base = `http://localhost:${process.env.PORT ?? 3000}`;
  try {
    switch (name) {
      case 'get_current_event': {
        const events = await getPickableEvents(2026);
        const inProgress = events.find(e => e.status === 'in_progress');
        if (inProgress) return { ...inProgress, why: 'currently playing' };
        const upcoming = events
          .filter(e => e.status === 'upcoming')
          .sort((a, b) => new Date(a.start_date ?? '9999').getTime() - new Date(b.start_date ?? '9999').getTime())[0];
        if (upcoming) return { ...upcoming, why: 'next upcoming event' };
        const recent = events
          .filter(e => e.status === 'completed')
          .sort((a, b) => new Date(b.start_date ?? '0').getTime() - new Date(a.start_date ?? '0').getTime())[0];
        return recent ? { ...recent, why: 'most recent completed event' } : null;
      }

      case 'get_predictions': {
        const limit = Math.min((input.limit as number) ?? 15, 50);
        const res = await fetch(`${base}/api/predictions?event=current`, { cache: 'no-store' });
        const data = await res.json();
        if ('error' in data) return { error: data.error };
        const players = (data.baseline_history_fit ?? data.baseline ?? []) as Record<string, unknown>[];
        return {
          event_name: data.event_name,
          top_players: [...players]
            .sort((a, b) => (b.win as number) - (a.win as number))
            .slice(0, limit)
            .map(p => ({
              name: formatName(p.player_name as string),
              win_pct: round((p.win as number) * 100, 1),
              top5_pct: round((p.top_5 as number) * 100, 1),
              top10_pct: round((p.top_10 as number) * 100, 1),
              top20_pct: round((p.top_20 as number) * 100, 1),
              make_cut_pct: round((p.make_cut as number) * 100, 1),
            })),
        };
      }

      case 'get_best_bets': {
        const minEV = ((input.min_ev as number) ?? 0) / 100;
        const markets = input.market === 'all'
          ? ['win', 'top_5', 'top_10', 'top_20', 'make_cut']
          : [input.market as string];

        const results: unknown[] = [];
        for (const m of markets) {
          const res = await fetch(`${base}/api/outrights?market=${m}`, { cache: 'no-store' });
          const data = await res.json();
          if ('error' in data) continue;
          const top = ((data.picks ?? []) as Record<string, unknown>[])
            .filter(p => (p.best_ev as number) > minEV)
            .slice(0, 5)
            .map(p => ({
              player: formatName(p.player_name as string),
              market: m,
              model_pct: round((p.model_prob as number) * 100, 1),
              best_book: p.best_book,
              decimal_odds: round(p.best_odds as number, 2),
              ev_pct: round((p.best_ev as number) * 100, 2),
            }));
          results.push(...top);
        }
        const sorted = (results as { ev_pct: number }[]).sort((a, b) => b.ev_pct - a.ev_pct).slice(0, 10);
        return {
          picks: sorted,
          note: sorted.length === 0 ? 'No +EV bets meeting the threshold right now.' : undefined,
        };
      }

      case 'get_matchups': {
        const minEV = ((input.min_ev as number) ?? 5) / 100;
        const res = await fetch(`${base}/api/matchups?market=${input.market}`, { cache: 'no-store' });
        const data = await res.json();
        if ('error' in data) return { error: data.error };
        const top = ((data.matchups ?? []) as Record<string, unknown>[])
          .filter(m => (m.best_ev as number) > minEV)
          .slice(0, 8)
          .map(m => ({
            matchup: (m.players as Record<string, unknown>[]).map(p => formatName(p.player_name as string)).join(' vs '),
            best_slot: formatName(((m.players as Record<string, unknown>[])[m.best_ev_slot as number] as Record<string, unknown>)?.player_name as string ?? ''),
            ev_pct: round((m.best_ev as number) * 100, 2),
            book: m.best_ev_book,
          }));
        return {
          market: input.market,
          event_name: data.event_name,
          picks: top,
          note: top.length === 0 ? 'No +EV matchups in this market right now.' : undefined,
        };
      }

      case 'get_player_profile': {
        const predRes = await fetch(`${base}/api/predictions?event=current`, { cache: 'no-store' });
        const pred = await predRes.json();
        if ('error' in pred) return { error: 'No active event field available' };
        const field = (pred.baseline_history_fit ?? pred.baseline ?? []) as Record<string, unknown>[];
        const search = String(input.player_name).toLowerCase().trim();
        const player = field.find(p => {
          const name = String(p.player_name ?? '').toLowerCase();
          return name.includes(search) || normalizedMatch(name, search);
        });
        if (!player) return { error: `Player "${input.player_name}" not found in current field` };

        const res = await fetch(`${base}/api/player/${player.dg_id}`, { cache: 'no-store' });
        const profile = await res.json();
        if ('error' in profile) return { error: profile.error };

        const r = profile.skillRating;
        const d = profile.decomposition;
        return {
          player: formatName(profile.player_name as string),
          sg_off_tee: r?.sg_ott != null ? round(r.sg_ott, 2) : null,
          sg_approach: r?.sg_app != null ? round(r.sg_app, 2) : null,
          sg_around_green: r?.sg_arg != null ? round(r.sg_arg, 2) : null,
          sg_putting: r?.sg_putt != null ? round(r.sg_putt, 2) : null,
          sg_total: r?.sg_total != null ? round(r.sg_total, 2) : null,
          this_week: d ? {
            baseline_skill: d.baseline != null ? round(Number(d.baseline), 2) : null,
            total_predicted: d.total_pred != null ? round(Number(d.total_pred), 2) : null,
            course_fit: d.fit_adjustment != null ? round(Number(d.fit_adjustment), 3) : null,
            course_history: d.history_adjustment != null ? round(Number(d.history_adjustment), 3) : null,
          } : null,
        };
      }

      case 'get_kvt_state': {
        const tournament = getActiveTournament();
        if (!tournament) return { active_bet: false, message: 'No active Kyle vs Tommy bet' };

        const matchups = getKvtMatchups(tournament.id);
        const { performances, actual_winner_name, actual_winner_dg_id, tournament_complete } =
          await getGolferPerformances(tournament.dg_event_id, tournament.year, matchups);

        const matchupInputs = matchups.map(m => ({
          matchup_num: m.matchup_num,
          kyle: performances.get(m.kyle_dg_id)!,
          tommy: performances.get(m.tommy_dg_id)!,
        }));

        const result = computeTournament(matchupInputs, actual_winner_name ?? '', actual_winner_dg_id);

        return {
          active_bet: true,
          event_name: tournament.event_name,
          tournament_complete,
          net_to_kyle: result.net_to_kyle,
          who_is_winning: result.net_to_kyle > 0 ? 'kyle' : result.net_to_kyle < 0 ? 'tommy' : 'tied',
          matchups: result.matchup_results.map(m => ({
            matchup: m.matchup_num,
            kyle_player: formatName(m.kyle.player_name),
            tommy_player: formatName(m.tommy.player_name),
            dollars_to_kyle: m.total_dollars_to_kyle,
            kyle_total: m.kyle.total_score,
            tommy_total: m.tommy.total_score,
          })),
          low_score: result.low_score.player_name
            ? { player: formatName(result.low_score.player_name), score: result.low_score.score, owner: result.low_score.owner }
            : null,
          actual_winner: actual_winner_name ? formatName(actual_winner_name) : null,
        };
      }

      case 'get_leaderboard': {
        const limit = Math.min((input.limit as number) ?? 20, 50);
        const events = await getPickableEvents(2026);
        const current = events.find(e => e.status === 'in_progress')
          ?? events.find(e => e.status === 'completed' && new Date(e.start_date ?? '0').getTime() > Date.now() - 7 * 86400000);
        if (!current) return { error: 'No current or recent event to fetch leaderboard for' };

        const key = process.env.DATAGOLF_API_KEY;
        const url = `https://feeds.datagolf.com/historical-raw-data/rounds?tour=pga&event_id=${current.dg_event_id}&year=${current.year}&file_format=json&key=${key}`;
        const res = await fetch(url, { next: { revalidate: 300 } });
        if (!res.ok) return { error: `Leaderboard fetch failed: ${res.status}` };
        const data = await res.json();

        const byPlayer = new Map<number, { dg_id: number; name: string; fin_text: string; total: number; rounds: number }>();
        for (const entry of (data.scores ?? [])) {
          const existing = byPlayer.get(entry.dg_id);
          const rd = entry.round_num ?? 0;
          const score = entry.round_score;
          if (!existing || rd > existing.rounds) {
            byPlayer.set(entry.dg_id, {
              dg_id: entry.dg_id,
              name: formatName(entry.player_name),
              fin_text: entry.fin_text ?? '',
              total: (existing?.total ?? 0) + (typeof score === 'number' ? score : 0),
              rounds: rd,
            });
          } else if (typeof score === 'number') {
            existing.total = (existing.total ?? 0) + score;
            if (entry.fin_text) existing.fin_text = entry.fin_text;
          }
        }

        const board = [...byPlayer.values()]
          .filter(p => !/^(MC|CUT|WD|DQ)$/i.test(p.fin_text))
          .sort((a, b) => (a.total ?? 999) - (b.total ?? 999))
          .slice(0, limit)
          .map(p => ({
            position: p.fin_text || '—',
            player: p.name,
            total: p.total,
            rounds_played: p.rounds,
          }));

        return { event_name: current.event_name, leaderboard: board };
      }

      default:
        return { error: `Unknown tool: ${name}` };
    }
  } catch (err: unknown) {
    return { error: `Tool execution failed: ${err instanceof Error ? err.message : 'unknown'}` };
  }
}

function formatName(dgName: string): string {
  if (!dgName || !dgName.includes(',')) return dgName ?? '';
  const [last, rest] = dgName.split(',', 2);
  return rest.trim() + ' ' + last.trim();
}

function round(n: number, places: number): number {
  return Math.round(n * 10 ** places) / 10 ** places;
}

function normalizedMatch(name: string, search: string): boolean {
  const normalize = (s: string) => s.toLowerCase().replace(/[^a-z]/g, '');
  return normalize(name).includes(normalize(search));
}
