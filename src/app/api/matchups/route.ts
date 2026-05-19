import { NextResponse } from 'next/server';
import { getMatchups, type MatchupMarket } from '@/lib/datagolf';

const VALID_MARKETS: MatchupMarket[] = ['tournament_matchups', '3_balls', 'round_matchups'];

export async function GET(req: Request) {
  const url = new URL(req.url);
  const marketParam = url.searchParams.get('market') ?? 'tournament_matchups';

  if (!VALID_MARKETS.includes(marketParam as MatchupMarket)) {
    return NextResponse.json({ error: 'invalid market' }, { status: 400 });
  }

  const data = await getMatchups(marketParam as MatchupMarket);
  return NextResponse.json(data);
}
