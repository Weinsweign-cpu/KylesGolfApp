export type SkillRating = {
  dg_id: number;
  player_name: string;
  sg_putt: number;
  sg_arg: number;
  sg_app: number;
  sg_ott: number;
  sg_total: number;
  driving_acc: number;
  driving_dist: number;
};

export type SkillDecomposition = {
  dg_id: number;
  player_name: string;
  baseline_pred: number;
  final_pred: number;
  course_history_adjustment: number;
  course_experience_adjustment: number;
  driving_accuracy_adjustment: number;
  driving_distance_adjustment: number;
  cf_approach_comp: number;
  cf_short_comp: number;
  age_adjustment: number;
  total_fit_adjustment: number;
  total_course_history_adjustment: number;
  am: number;
  age: number;
  country: string;
};

export type PlayerProfile = {
  dg_id: number;
  player_name: string;
  skillRating: SkillRating | null;
  decomposition: SkillDecomposition | null;
};

export type DGPlayer = {
  dg_id: number;
  player_name: string;
  win: number;
  top_5: number;
  top_10: number;
  top_20: number;
  make_cut: number;
};

export type DGResponse = {
  event_name?: string;
  course?: string | null;
  last_updated?: string;
  baseline?: DGPlayer[];
  baseline_history_fit?: DGPlayer[];
};

export type ScheduleEvent = {
  event_id: number;
  event_name: string;
  course: string;
  start_date: string;
  status: string;
  winner?: string;
  location?: string;
};

export type HistoricalEvent = {
  event_id: number;
  event_name: string;
  year: number;
  tour: string;
  sg_categories?: string;
};

export type PlayerResult = {
  dg_id: number;
  player_name: string;
  position: string;
  made_cut: boolean;
  // archive fields
  win_pred?: number;
  top5_pred?: number;
  top10_pred?: number;
  make_cut_pred?: number;
  // live fields
  total?: number;
  thru?: number;
  round_score?: number;
  sg_total?: number;
  sg_ott?: number;
  sg_app?: number;
  sg_arg?: number;
  sg_putt?: number;
};

export type EventResults = {
  event_name: string;
  type: 'archive' | 'live';
  has_sg_data: boolean;
  players: PlayerResult[];
};

export type MatchupMarket = 'tournament_matchups' | 'round_matchups' | '3_balls';

export type MatchupPlayer = {
  dg_id: number;
  player_name: string;
  model_prob: number;
};

export type Matchup = {
  matchup_id: string;
  players: MatchupPlayer[];
  best_ev: number;
  best_ev_slot: number;
  best_ev_book: string;
  best_ev_decimal: number;
  best_ev_implied: number;
  tie_rule: string;
};

export type MatchupResponse = {
  event_name: string;
  market: MatchupMarket;
  last_updated: string;
  round_num: number | null;
  matchups: Matchup[];
};

const BASE = 'https://feeds.datagolf.com';

function apiKey(): string {
  const key = process.env.DATAGOLF_API_KEY;
  if (!key) throw new Error('DATAGOLF_API_KEY not set');
  return key;
}

export async function getSkillRatings(): Promise<SkillRating[]> {
  const res = await fetch(
    `${BASE}/preds/skill-ratings?display=value&file_format=json&key=${apiKey()}`,
    { next: { revalidate: 900 } }
  );
  if (!res.ok) throw new Error(`skill-ratings returned ${res.status}`);
  const data = await res.json();
  return (data.players ?? data) as SkillRating[];
}

export async function getSkillDecompositions(): Promise<SkillDecomposition[]> {
  const res = await fetch(
    `${BASE}/preds/player-decompositions?tour=pga&file_format=json&key=${apiKey()}`,
    { next: { revalidate: 900 } }
  );
  if (!res.ok) throw new Error(`player-decompositions returned ${res.status}`);
  const data = await res.json();
  return (data.players ?? data) as SkillDecomposition[];
}

export async function getPgaSchedule(): Promise<ScheduleEvent[]> {
  const res = await fetch(
    `${BASE}/get-schedule?tour=pga&file_format=json&key=${apiKey()}`,
    { next: { revalidate: 21600 } }
  );
  if (!res.ok) throw new Error(`get-schedule returned ${res.status}`);
  const data = await res.json();
  const raw: Record<string, unknown>[] = data.schedule ?? data;
  return raw.map((e) => ({
    event_id: parseInt(String(e.event_id), 10),
    event_name: String(e.event_name ?? ''),
    course: String(e.course ?? ''),
    start_date: String(e.start_date ?? ''),
    status: String(e.status ?? ''),
    winner: e.winner ? String(e.winner) : undefined,
    location: e.location ? String(e.location) : undefined,
  }));
}

// ─── Event Picker ─────────────────────────────────────────────────────────────

export type EventOption = {
  dg_event_id: number;
  year: number;
  event_name: string;
  course: string | null;
  start_date: string | null;
  category: 'major' | 'pga_upcoming' | 'pga_past' | 'pga_current';
  is_major: boolean;
  status: 'upcoming' | 'in_progress' | 'completed';
};

const MAJOR_NAME_PATTERNS = [
  /^(the )?masters( tournament)?$/i,
  /^pga championship$/i,
  /^u\.?s\.? open$/i,
  /^(the )?open championship$/i,
];

function isMajorName(name: string): boolean {
  return MAJOR_NAME_PATTERNS.some(p => p.test(name.trim()));
}

export async function getPickableEvents(year: number = new Date().getFullYear()): Promise<EventOption[]> {
  const schedule = await getPgaSchedule();

  return schedule
    .filter(e => {
      const y = e.start_date ? parseInt(e.start_date.slice(0, 4), 10) : 0;
      return y === year;
    })
    .map(e => {
      const is_major = isMajorName(e.event_name);
      const s = String(e.status).toLowerCase();
      const status: EventOption['status'] =
        s === 'completed' ? 'completed' :
        (s === 'active' || s === 'current' || s === 'in_progress') ? 'in_progress' :
        'upcoming';
      const category: EventOption['category'] =
        is_major ? 'major' :
        status === 'upcoming' ? 'pga_upcoming' :
        status === 'in_progress' ? 'pga_current' :
        'pga_past';
      return {
        dg_event_id: e.event_id,
        year: e.start_date ? parseInt(e.start_date.slice(0, 4), 10) : year,
        event_name: e.event_name,
        course: e.course || null,
        start_date: e.start_date || null,
        category,
        is_major,
        status,
      } as EventOption;
    })
    .sort((a, b) => {
      const ord = { in_progress: 0, upcoming: 1, completed: 2 };
      if (ord[a.status] !== ord[b.status]) return ord[a.status] - ord[b.status];
      const aT = a.start_date ? new Date(a.start_date).getTime() : 0;
      const bT = b.start_date ? new Date(b.start_date).getTime() : 0;
      return a.status === 'completed' ? bT - aT : aT - bT;
    });
}

export async function getArchivedPredictions(eventId: number, year: number): Promise<DGResponse> {
  const res = await fetch(
    `${BASE}/preds/pre-tournament-archive?event_id=${eventId}&year=${year}&odds_format=percent&file_format=json&key=${apiKey()}`,
    { next: { revalidate: 3600 } }
  );
  if (!res.ok) throw new Error(`pre-tournament-archive returned ${res.status}`);
  return res.json();
}

export async function getPredictionsForEvent(eventId: number | 'current'): Promise<DGResponse | { error: string }> {
  if (eventId === 'current') {
    const key = process.env.DATAGOLF_API_KEY;
    if (!key) return { error: 'DATAGOLF_API_KEY not set' };
    try {
      const res = await fetch(
        `${BASE}/preds/pre-tournament?tour=pga&odds_format=percent&file_format=json&key=${key}`,
        { cache: 'no-store' }
      );
      if (!res.ok) return { error: `DataGolf API returned ${res.status}` };
      return res.json();
    } catch (e) {
      return { error: 'Fetch failed: ' + (e instanceof Error ? e.message : 'unknown') };
    }
  }
  try {
    return await getArchivedPredictions(eventId, new Date().getFullYear());
  } catch (e) {
    return { error: 'Archive fetch failed: ' + (e instanceof Error ? e.message : 'unknown') };
  }
}

export async function getHistoricalEventList(): Promise<HistoricalEvent[]> {
  const res = await fetch(
    `${BASE}/historical-raw-data/event-list?tour=pga&file_format=json&key=${apiKey()}`,
    { next: { revalidate: 86400 } }
  );
  if (!res.ok) throw new Error(`event-list returned ${res.status}`);
  const data = await res.json();
  const raw: Record<string, unknown>[] = Array.isArray(data) ? data : (data.events ?? []);
  return raw.map((e) => ({
    event_id: Number(e.event_id),
    event_name: String(e.event_name ?? ''),
    year: Number(e.calendar_year ?? e.year ?? 0),
    tour: String(e.tour ?? 'pga'),
    sg_categories: e.sg_categories ? String(e.sg_categories) : undefined,
  }));
}

function parsePosition(fin: string): number {
  if (!fin) return 9999;
  const upper = fin.toUpperCase();
  if (upper === 'MC' || upper === 'CUT') return 9999;
  if (upper === 'WD') return 9998;
  if (upper === 'DQ') return 9997;
  const n = parseInt(fin.replace(/^T/, ''), 10);
  return isNaN(n) ? 9990 : n;
}

export async function getArchiveResults(eventId: number, year: number): Promise<EventResults | { error: string }> {
  try {
    const res = await fetch(
      `${BASE}/preds/pre-tournament-archive?event_id=${eventId}&year=${year}&odds_format=percent&file_format=json&key=${apiKey()}`,
      { next: { revalidate: 3600 } }
    );
    if (!res.ok) return { error: `archive returned ${res.status}` };
    const data = await res.json();
    const raw: Record<string, unknown>[] = data.baseline_history_fit ?? data.baseline ?? [];
    const players: PlayerResult[] = raw
      .map((p) => {
        const fin = String(p.fin_text ?? '');
        const upper = fin.toUpperCase();
        const made_cut = upper !== 'MC' && upper !== 'CUT' && upper !== 'WD' && upper !== 'DQ' && fin !== '';
        return {
          dg_id: Number(p.dg_id),
          player_name: String(p.player_name ?? ''),
          position: fin,
          made_cut,
          win_pred: Number(p.win) || 0,
          top5_pred: Number(p.top_5) || 0,
          top10_pred: Number(p.top_10) || 0,
          make_cut_pred: Number(p.make_cut) || 0,
        };
      })
      .sort((a, b) => parsePosition(a.position) - parsePosition(b.position));
    return {
      event_name: String(data.event_name ?? ''),
      type: 'archive',
      has_sg_data: false,
      players,
    };
  } catch (e) {
    return { error: 'Archive fetch failed: ' + (e instanceof Error ? e.message : 'unknown') };
  }
}

export async function getLiveResults(): Promise<EventResults | { error: string }> {
  try {
    const res = await fetch(
      `${BASE}/preds/live-tournament-stats?stats=sg_total,sg_ott,sg_app,sg_arg,sg_putt&round=event_avg&display=value&file_format=json&key=${apiKey()}`,
      { next: { revalidate: 60 } }
    );
    if (!res.ok) return { error: `live-tournament-stats returned ${res.status}` };
    const data = await res.json();
    const raw: Record<string, unknown>[] = (data.live_stats ?? []) as Record<string, unknown>[];
    const players: PlayerResult[] = raw
      .map((p) => ({
        dg_id: Number(p.dg_id),
        player_name: String(p.player_name ?? ''),
        position: String(p.position ?? ''),
        made_cut: true,
        total: Number(p.total) || 0,
        thru: Number(p.thru) || 0,
        round_score: Number(p.round) || 0,
        sg_total: typeof p.sg_total === 'number' ? p.sg_total : undefined,
        sg_ott: typeof p.sg_ott === 'number' ? p.sg_ott : undefined,
        sg_app: typeof p.sg_app === 'number' ? p.sg_app : undefined,
        sg_arg: typeof p.sg_arg === 'number' ? p.sg_arg : undefined,
        sg_putt: typeof p.sg_putt === 'number' ? p.sg_putt : undefined,
      }))
      .sort((a, b) => parsePosition(a.position) - parsePosition(b.position));
    const hasSg = players.filter(p => p.sg_total != null).length > players.length * 0.5;
    return {
      event_name: String(data.event_name ?? ''),
      type: 'live',
      has_sg_data: hasSg,
      players,
    };
  } catch (e) {
    return { error: 'Live fetch failed: ' + (e instanceof Error ? e.message : 'unknown') };
  }
}

export async function getEventResults(eventId: number | 'current', year?: number): Promise<EventResults | { error: string }> {
  if (eventId === 'current') return getLiveResults();
  return getArchiveResults(eventId, year ?? new Date().getFullYear());
}

export async function getMatchups(market: MatchupMarket): Promise<MatchupResponse | { error: string }> {
  try {
    const res = await fetch(
      `${BASE}/betting-tools/matchups?tour=pga&market=${market}&odds_format=decimal&file_format=json&key=${apiKey()}`,
      { next: { revalidate: 600 } }
    );
    if (!res.ok) return { error: `matchups returned ${res.status}` };
    const data = await res.json();

    const rawList = data.match_list;
    if (!Array.isArray(rawList)) {
      return {
        event_name: String(data.event_name ?? ''),
        market,
        last_updated: String(data.last_updated ?? ''),
        round_num: data.round_num != null ? Number(data.round_num) : null,
        matchups: [],
      };
    }

    const matchups: Matchup[] = rawList.map((entry: Record<string, unknown>) => {
      const odds = (entry.odds ?? {}) as Record<string, Record<string, number>>;
      const dgOdds = odds.datagolf ?? {};

      // Determine player slots: p1/p2 always, p3 for 3-balls
      const slotKeys = ['p1', 'p2', 'p3'].filter(k => entry[`${k}_dg_id`] != null);

      const players: MatchupPlayer[] = slotKeys.map(k => {
        const dgDecimal = dgOdds[k];
        return {
          dg_id: Number(entry[`${k}_dg_id`]),
          player_name: String(entry[`${k}_player_name`] ?? ''),
          model_prob: dgDecimal && dgDecimal > 0 ? 1 / dgDecimal : 0,
        };
      });

      // Find best EV across all slot × sportsbook combos
      let best_ev = -Infinity;
      let best_ev_slot = 0;
      let best_ev_book = '';
      let best_ev_decimal = 1;

      for (const [book, bookOdds] of Object.entries(odds)) {
        if (book === 'datagolf') continue;
        slotKeys.forEach((k, slotIdx) => {
          const decimal = bookOdds[k];
          if (!decimal || decimal <= 1) return;
          const model_prob = players[slotIdx]?.model_prob ?? 0;
          const ev = model_prob * decimal - 1;
          if (ev > best_ev) {
            best_ev = ev;
            best_ev_slot = slotIdx;
            best_ev_book = book;
            best_ev_decimal = decimal;
          }
        });
      }

      if (best_ev === -Infinity) best_ev = -1;

      return {
        matchup_id: players.map(p => p.dg_id).join('-'),
        players,
        best_ev,
        best_ev_slot,
        best_ev_book,
        best_ev_decimal,
        best_ev_implied: best_ev_decimal > 0 ? 1 / best_ev_decimal : 0,
        tie_rule: String(entry.ties ?? 'void'),
      };
    });

    return {
      event_name: String(data.event_name ?? ''),
      market,
      last_updated: String(data.last_updated ?? ''),
      round_num: data.round_num != null ? Number(data.round_num) : null,
      matchups,
    };
  } catch (e) {
    return { error: 'matchups fetch failed: ' + (e instanceof Error ? e.message : 'unknown') };
  }
}

export type CourseProfile = {
  event_name: string;
  skill_weights: {
    ott: number;
    app: number;
    arg: number;
    putt: number;
  };
  best_fits: { dg_id: number; player_name: string; fit: number; reasons: string }[];
  worst_fits: { dg_id: number; player_name: string; fit: number; reasons: string }[];
  best_history: { dg_id: number; player_name: string; history: number }[];
};

function pearson(xs: number[], ys: number[]): number {
  const n = xs.length;
  if (n < 2) return 0;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0, dx2 = 0, dy2 = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - mx, dy = ys[i] - my;
    num += dx * dy; dx2 += dx * dx; dy2 += dy * dy;
  }
  const denom = Math.sqrt(dx2 * dy2);
  return denom === 0 ? 0 : num / denom;
}

export async function getCourseProfile(): Promise<CourseProfile | { error: string }> {
  try {
    const key = process.env.DATAGOLF_API_KEY;
    if (!key) return { error: 'DATAGOLF_API_KEY not set' };

    const [ratings, decompsRaw] = await Promise.all([
      getSkillRatings(),
      fetch(
        `${BASE}/preds/player-decompositions?tour=pga&file_format=json&key=${key}`,
        { next: { revalidate: 3600 } }
      ).then(r => { if (!r.ok) throw new Error(`player-decompositions returned ${r.status}`); return r.json(); }),
    ]);

    const event_name = String(decompsRaw.event_name ?? 'Current Event');
    const decomps: SkillDecomposition[] = decompsRaw.players ?? decompsRaw;

    const ratingMap = new Map(ratings.map(r => [r.dg_id, r]));

    type PD = { dg_id: number; player_name: string; sg_ott: number; sg_app: number; sg_arg: number; sg_putt: number; fit: number; history: number };
    const players: PD[] = decomps.reduce<PD[]>((acc, d) => {
      const r = ratingMap.get(d.dg_id);
      if (!r) return acc;
      acc.push({
        dg_id: d.dg_id, player_name: d.player_name,
        sg_ott: r.sg_ott ?? 0, sg_app: r.sg_app ?? 0,
        sg_arg: r.sg_arg ?? 0, sg_putt: r.sg_putt ?? 0,
        fit: d.total_fit_adjustment ?? 0,
        history: d.course_history_adjustment ?? 0,
      });
      return acc;
    }, []);

    const fits = players.map(p => p.fit);
    const raw = {
      ott: pearson(players.map(p => p.sg_ott), fits),
      app: pearson(players.map(p => p.sg_app), fits),
      arg: pearson(players.map(p => p.sg_arg), fits),
      putt: pearson(players.map(p => p.sg_putt), fits),
    };
    const clamped = { ott: Math.max(0, raw.ott), app: Math.max(0, raw.app), arg: Math.max(0, raw.arg), putt: Math.max(0, raw.putt) };
    const total = clamped.ott + clamped.app + clamped.arg + clamped.putt;
    const skill_weights = total > 0
      ? { ott: clamped.ott / total, app: clamped.app / total, arg: clamped.arg / total, putt: clamped.putt / total }
      : { ott: 0.25, app: 0.25, arg: 0.25, putt: 0.25 };

    function buildReasons(p: PD): string {
      const cats = [
        { label: 'off-the-tee game', sg: p.sg_ott, w: skill_weights.ott, code: 'SG:OTT' },
        { label: 'approach play', sg: p.sg_app, w: skill_weights.app, code: 'SG:APP' },
        { label: 'short game', sg: p.sg_arg, w: skill_weights.arg, code: 'SG:ARG' },
        { label: 'putting', sg: p.sg_putt, w: skill_weights.putt, code: 'SG:PUTT' },
      ];
      const top = cats.reduce((a, b) => (b.sg * b.w > a.sg * a.w ? b : a));
      const tier = top.sg > 1.0 ? 'Elite' : top.sg > 0.5 ? 'Strong' : top.sg > 0.1 ? 'Good' : 'Average';
      return `${tier} ${top.label} (${top.sg >= 0 ? '+' : ''}${top.sg.toFixed(2)} ${top.code})`;
    }

    const best_fits = [...players].sort((a, b) => b.fit - a.fit).slice(0, 5)
      .map(p => ({ dg_id: p.dg_id, player_name: p.player_name, fit: p.fit, reasons: buildReasons(p) }));
    const worst_fits = [...players].sort((a, b) => a.fit - b.fit).slice(0, 5)
      .map(p => ({ dg_id: p.dg_id, player_name: p.player_name, fit: p.fit, reasons: buildReasons(p) }));
    const best_history = [...players].filter(p => p.history > 0).sort((a, b) => b.history - a.history).slice(0, 5)
      .map(p => ({ dg_id: p.dg_id, player_name: p.player_name, history: p.history }));

    return { event_name, skill_weights, best_fits, worst_fits, best_history };
  } catch (e) {
    return { error: 'getCourseProfile failed: ' + (e instanceof Error ? e.message : 'unknown') };
  }
}

export async function getPlayerProfile(dgId: number): Promise<PlayerProfile> {
  const [ratings, decomps] = await Promise.all([
    getSkillRatings(),
    getSkillDecompositions(),
  ]);

  const skillRating = ratings.find((p) => p.dg_id === dgId) ?? null;
  const decomposition = decomps.find((p) => p.dg_id === dgId) ?? null;

  const player_name =
    skillRating?.player_name ?? decomposition?.player_name ?? String(dgId);

  return { dg_id: dgId, player_name, skillRating, decomposition };
}

// ─── Outrights ────────────────────────────────────────────────────────────────

export type OutrightMarket = 'win' | 'top_5' | 'top_10' | 'top_20' | 'make_cut' | 'frl';

export type OutrightOdds = {
  book: string;
  decimal_odds: number;
  implied_prob: number;
  ev: number;
};

export type OutrightPick = {
  dg_id: number;
  player_name: string;
  model_prob: number;
  odds_by_book: OutrightOdds[];
  best_book: string;
  best_odds: number;
  best_implied: number;
  best_ev: number;
};

export type OutrightMarketData = {
  event_name: string;
  market: OutrightMarket;
  last_updated: string;
  picks: OutrightPick[];
  positive_ev_count: number;
};

export async function getOutrights(market: OutrightMarket): Promise<OutrightMarketData | { error: string }> {
  try {
    const res = await fetch(
      `${BASE}/betting-tools/outrights?tour=pga&market=${market}&odds_format=decimal&file_format=json&key=${apiKey()}`,
      { next: { revalidate: 600 } }
    );
    if (!res.ok) return { error: `outrights/${market} returned ${res.status}` };
    const data = await res.json();

    const NON_BOOK_KEYS = new Set(['dg_id', 'player_name', 'datagolf']);
    const rawOdds: Record<string, unknown>[] = data.odds ?? [];

    const picks: OutrightPick[] = [];

    for (const entry of rawOdds) {
      const dg = entry.datagolf as { baseline?: number; baseline_history_fit?: number } | undefined;
      if (!dg) continue;
      const dgDecimal = dg.baseline_history_fit ?? dg.baseline;
      if (!dgDecimal || dgDecimal <= 0) continue;
      const model_prob = 1 / dgDecimal;

      const odds_by_book: OutrightOdds[] = [];
      for (const [key, val] of Object.entries(entry)) {
        if (NON_BOOK_KEYS.has(key)) continue;
        const decimal_odds = typeof val === 'number' ? val : 0;
        if (decimal_odds <= 1) continue;
        const implied_prob = 1 / decimal_odds;
        const ev = model_prob * decimal_odds - 1;
        odds_by_book.push({ book: key, decimal_odds, implied_prob, ev });
      }

      if (odds_by_book.length === 0) continue;
      odds_by_book.sort((a, b) => b.ev - a.ev);

      const best = odds_by_book[0];
      // Skip longshots over +1000 American (11.0 decimal)
      if (best.decimal_odds > 11.0) continue;
      picks.push({
        dg_id: Number(entry.dg_id),
        player_name: String(entry.player_name ?? ''),
        model_prob,
        odds_by_book,
        best_book: best.book,
        best_odds: best.decimal_odds,
        best_implied: best.implied_prob,
        best_ev: best.ev,
      });
    }

    picks.sort((a, b) => b.best_ev - a.best_ev);

    return {
      event_name: String(data.event_name ?? ''),
      market,
      last_updated: String(data.last_updated ?? ''),
      picks,
      positive_ev_count: picks.filter(p => p.best_ev > 0).length,
    };
  } catch (e) {
    return { error: 'getOutrights failed: ' + (e instanceof Error ? e.message : 'unknown') };
  }
}

// ─── Parlay ───────────────────────────────────────────────────────────────────

export type ParlayLeg = {
  dg_id: number;
  player_name: string;
  market: OutrightMarket;
  model_prob: number;
  book: string;
  decimal_odds: number;
  individual_ev: number;
};

export type ParlaySuggestion = {
  legs: ParlayLeg[];
  combined_odds: number;
  combined_model_prob: number;
  combined_implied_prob: number;
  combined_ev: number;
  independence_note: string;
};

export async function getRecommendedParlay(): Promise<ParlaySuggestion | null> {
  const PARLAY_MARKETS: OutrightMarket[] = ['top_5', 'top_10', 'top_20', 'make_cut'];

  const results = await Promise.all(PARLAY_MARKETS.map(m => getOutrights(m)));

  type Candidate = ParlayLeg;
  const candidates: Candidate[] = [];

  for (let i = 0; i < PARLAY_MARKETS.length; i++) {
    const result = results[i];
    if ('error' in result) continue;
    for (const pick of result.picks) {
      if (pick.best_ev <= 0.02) continue;
      if (pick.best_odds > 5.0) continue;
      if (pick.model_prob < 0.15) continue;
      candidates.push({
        dg_id: pick.dg_id,
        player_name: pick.player_name,
        market: PARLAY_MARKETS[i],
        model_prob: pick.model_prob,
        book: pick.best_book,
        decimal_odds: pick.best_odds,
        individual_ev: pick.best_ev,
      });
    }
  }

  let best: ParlaySuggestion | null = null;

  // 2-leg combos
  for (let i = 0; i < candidates.length; i++) {
    for (let j = i + 1; j < candidates.length; j++) {
      if (candidates[i].dg_id === candidates[j].dg_id) continue;
      const legs = [candidates[i], candidates[j]];
      const combined_odds = legs.reduce((p, l) => p * l.decimal_odds, 1);
      const combined_model_prob = legs.reduce((p, l) => p * l.model_prob, 1);
      const combined_ev = combined_model_prob * combined_odds - 1;
      if (combined_ev <= 0.05) continue;
      if (!best || combined_ev > best.combined_ev + 0.02) {
        best = {
          legs,
          combined_odds,
          combined_model_prob,
          combined_implied_prob: 1 / combined_odds,
          combined_ev,
          independence_note: 'Combined EV assumes independent outcomes. In reality, golfer finishes are slightly negatively correlated (only one can win), so actual EV may be marginally lower.',
        };
      }
    }
  }

  // 3-leg combos — only if they beat best 2-leg by more than 2%
  for (let i = 0; i < candidates.length; i++) {
    for (let j = i + 1; j < candidates.length; j++) {
      for (let k = j + 1; k < candidates.length; k++) {
        const legs = [candidates[i], candidates[j], candidates[k]];
        const dgIds = new Set(legs.map(l => l.dg_id));
        if (dgIds.size < legs.length) continue;
        const combined_odds = legs.reduce((p, l) => p * l.decimal_odds, 1);
        const combined_model_prob = legs.reduce((p, l) => p * l.model_prob, 1);
        const combined_ev = combined_model_prob * combined_odds - 1;
        if (combined_ev <= 0.05) continue;
        if (!best || combined_ev > best.combined_ev + 0.02) {
          best = {
            legs,
            combined_odds,
            combined_model_prob,
            combined_implied_prob: 1 / combined_odds,
            combined_ev,
            independence_note: 'Combined EV assumes independent outcomes. In reality, golfer finishes are slightly negatively correlated (only one can win), so actual EV may be marginally lower.',
          };
        }
      }
    }
  }

  return best;
}
