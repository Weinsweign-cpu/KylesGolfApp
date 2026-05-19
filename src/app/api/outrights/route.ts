import { NextResponse } from 'next/server';
import { getOutrights, type OutrightMarket } from '@/lib/datagolf';

const VALID: OutrightMarket[] = ['win', 'top_5', 'top_10', 'top_20', 'make_cut', 'frl'];

export async function GET(req: Request) {
  const market = new URL(req.url).searchParams.get('market') ?? 'win';
  if (!VALID.includes(market as OutrightMarket)) {
    return NextResponse.json({ error: 'invalid market' }, { status: 400 });
  }
  const data = await getOutrights(market as OutrightMarket);
  return NextResponse.json(data);
}
