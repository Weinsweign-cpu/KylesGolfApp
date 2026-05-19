export type RoundScore = number | null;

export type GolferPerformance = {
  dg_id: number;
  player_name: string;
  rounds: [RoundScore, RoundScore, RoundScore, RoundScore];
  made_cut: boolean;
  total_score: number | null;
};

export type MatchupInput = {
  matchup_num: number;
  kyle: GolferPerformance;
  tommy: GolferPerformance;
};

export type DailyResult = {
  round: 1 | 2 | 3 | 4;
  winner: 'kyle' | 'tommy' | 'void';
  kyle_score: RoundScore;
  tommy_score: RoundScore;
  reason: string;
};

export type MatchupResult = {
  matchup_num: number;
  kyle: GolferPerformance;
  tommy: GolferPerformance;
  daily: DailyResult[];
  overall: { winner: 'kyle' | 'tommy' | 'void'; reason: string };
  daily_dollars_to_kyle: number;
  overall_dollars_to_kyle: number;
  total_dollars_to_kyle: number;
};

export type TournamentResult = {
  matchup_results: MatchupResult[];
  matchup_total_to_kyle: number;
  low_score: {
    player_name: string | null;
    score: number | null;
    owner: 'kyle' | 'tommy' | 'void';
    dollars_to_kyle: number;
  };
  tournament_winner: {
    player_name: string;
    was_drafted: boolean;
    owner: 'kyle' | 'tommy' | null;
    dollars_to_kyle: number;
  };
  net_to_kyle: number;
};

export function computeDaily(
  round: 1 | 2 | 3 | 4,
  kyleScore: RoundScore,
  tommyScore: RoundScore,
  kyleMadeCut: boolean,
  tommyMadeCut: boolean
): DailyResult {
  if (round <= 2) {
    if (kyleScore == null && tommyScore == null) {
      return { round, winner: 'void', kyle_score: null, tommy_score: null, reason: 'Neither played this round' };
    }
    if (kyleScore == null) {
      return { round, winner: 'tommy', kyle_score: null, tommy_score: tommyScore, reason: "Kyle's golfer did not post a score" };
    }
    if (tommyScore == null) {
      return { round, winner: 'kyle', kyle_score: kyleScore, tommy_score: null, reason: "Tommy's golfer did not post a score" };
    }
    if (kyleScore < tommyScore) {
      return { round, winner: 'kyle', kyle_score: kyleScore, tommy_score: tommyScore, reason: `Kyle's ${kyleScore} beats Tommy's ${tommyScore}` };
    }
    if (tommyScore < kyleScore) {
      return { round, winner: 'tommy', kyle_score: kyleScore, tommy_score: tommyScore, reason: `Tommy's ${tommyScore} beats Kyle's ${kyleScore}` };
    }
    return { round, winner: 'void', kyle_score: kyleScore, tommy_score: tommyScore, reason: `Tied at ${kyleScore}` };
  }

  // R3 and R4: cut rule applies
  if (!kyleMadeCut && !tommyMadeCut) {
    return { round, winner: 'void', kyle_score: null, tommy_score: null, reason: 'Neither golfer made the cut' };
  }
  if (kyleMadeCut && !tommyMadeCut) {
    return { round, winner: 'kyle', kyle_score: kyleScore, tommy_score: null, reason: "Tommy's golfer missed the cut" };
  }
  if (!kyleMadeCut && tommyMadeCut) {
    return { round, winner: 'tommy', kyle_score: null, tommy_score: tommyScore, reason: "Kyle's golfer missed the cut" };
  }
  // Both made cut
  if (kyleScore == null && tommyScore == null) {
    return { round, winner: 'void', kyle_score: null, tommy_score: null, reason: 'Round not yet played' };
  }
  if (kyleScore == null) {
    return { round, winner: 'tommy', kyle_score: null, tommy_score: tommyScore, reason: "Kyle's golfer did not post a score" };
  }
  if (tommyScore == null) {
    return { round, winner: 'kyle', kyle_score: kyleScore, tommy_score: null, reason: "Tommy's golfer did not post a score" };
  }
  if (kyleScore < tommyScore) {
    return { round, winner: 'kyle', kyle_score: kyleScore, tommy_score: tommyScore, reason: `Kyle's ${kyleScore} beats Tommy's ${tommyScore}` };
  }
  if (tommyScore < kyleScore) {
    return { round, winner: 'tommy', kyle_score: kyleScore, tommy_score: tommyScore, reason: `Tommy's ${tommyScore} beats Kyle's ${kyleScore}` };
  }
  return { round, winner: 'void', kyle_score: kyleScore, tommy_score: tommyScore, reason: `Tied at ${kyleScore}` };
}

export function computeOverall(
  kyle: GolferPerformance,
  tommy: GolferPerformance
): { winner: 'kyle' | 'tommy' | 'void'; reason: string } {
  if (!kyle.made_cut && !tommy.made_cut) {
    return { winner: 'void', reason: 'Neither golfer made the cut' };
  }
  if (kyle.made_cut && !tommy.made_cut) {
    return { winner: 'kyle', reason: "Tommy's golfer missed the cut" };
  }
  if (!kyle.made_cut && tommy.made_cut) {
    return { winner: 'tommy', reason: "Kyle's golfer missed the cut" };
  }
  if (kyle.total_score == null || tommy.total_score == null) {
    return { winner: 'void', reason: 'Tournament not yet complete' };
  }
  if (kyle.total_score < tommy.total_score) {
    return { winner: 'kyle', reason: `Kyle's ${kyle.total_score} beats Tommy's ${tommy.total_score}` };
  }
  if (tommy.total_score < kyle.total_score) {
    return { winner: 'tommy', reason: `Tommy's ${tommy.total_score} beats Kyle's ${kyle.total_score}` };
  }
  return { winner: 'void', reason: `Tied at ${kyle.total_score}` };
}

export function computeMatchup(input: MatchupInput): MatchupResult {
  const daily: DailyResult[] = [];
  for (const r of [1, 2, 3, 4] as const) {
    const idx = r - 1;
    daily.push(computeDaily(
      r,
      input.kyle.rounds[idx],
      input.tommy.rounds[idx],
      input.kyle.made_cut,
      input.tommy.made_cut
    ));
  }
  const overall = computeOverall(input.kyle, input.tommy);

  const daily_dollars_to_kyle = daily.reduce((sum, d) => {
    if (d.winner === 'kyle') return sum + 3;
    if (d.winner === 'tommy') return sum - 3;
    return sum;
  }, 0);

  const overall_dollars_to_kyle = overall.winner === 'kyle' ? 3 : overall.winner === 'tommy' ? -3 : 0;

  return {
    matchup_num: input.matchup_num,
    kyle: input.kyle,
    tommy: input.tommy,
    daily,
    overall,
    daily_dollars_to_kyle,
    overall_dollars_to_kyle,
    total_dollars_to_kyle: daily_dollars_to_kyle + overall_dollars_to_kyle,
  };
}

export function computeTournament(
  matchups: MatchupInput[],
  actualWinnerName: string,
  actualWinnerDgId: number | null
): TournamentResult {
  const matchup_results = matchups.map(computeMatchup);
  const matchup_total_to_kyle = matchup_results.reduce((s, m) => s + m.total_dollars_to_kyle, 0);

  const all_golfers = matchups.flatMap(m => [
    { ...m.kyle, owner: 'kyle' as const },
    { ...m.tommy, owner: 'tommy' as const },
  ]);
  const eligible = all_golfers.filter(g => g.made_cut && g.total_score != null);

  let low_score: TournamentResult['low_score'] = {
    player_name: null,
    score: null,
    owner: 'void',
    dollars_to_kyle: 0,
  };

  if (eligible.length > 0) {
    const minScore = Math.min(...eligible.map(g => g.total_score!));
    const lowGolfers = eligible.filter(g => g.total_score === minScore);
    const owners = new Set(lowGolfers.map(g => g.owner));

    if (owners.size === 1) {
      const owner = [...owners][0];
      low_score = {
        player_name: lowGolfers[0].player_name,
        score: minScore,
        owner,
        dollars_to_kyle: owner === 'kyle' ? 20 : -20,
      };
    } else {
      low_score = {
        player_name: lowGolfers.map(g => g.player_name).join(', '),
        score: minScore,
        owner: 'void',
        dollars_to_kyle: 0,
      };
    }
  }

  let owner: 'kyle' | 'tommy' | null = null;
  if (actualWinnerDgId != null) {
    const drafted = all_golfers.find(g => g.dg_id === actualWinnerDgId);
    if (drafted) owner = drafted.owner;
  }
  const tournament_winner: TournamentResult['tournament_winner'] = {
    player_name: actualWinnerName,
    was_drafted: owner !== null,
    owner,
    dollars_to_kyle: owner === 'kyle' ? 20 : owner === 'tommy' ? -20 : 0,
  };

  return {
    matchup_results,
    matchup_total_to_kyle,
    low_score,
    tournament_winner,
    net_to_kyle: matchup_total_to_kyle + low_score.dollars_to_kyle + tournament_winner.dollars_to_kyle,
  };
}
