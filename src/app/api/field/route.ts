import { NextResponse } from 'next/server';

const BASE = 'https://feeds.datagolf.com';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const event = searchParams.get('event') ?? 'current';
  const year = parseInt(searchParams.get('year') ?? String(new Date().getFullYear()), 10);
  const status = searchParams.get('status') ?? 'upcoming';
  const key = process.env.DATAGOLF_API_KEY;
  if (!key) return NextResponse.json({ error: 'DATAGOLF_API_KEY not set' }, { status: 500 });

  try {
    if (status === 'completed' && event !== 'current') {
      // Use pre-tournament-archive to get the historical field for a completed event
      const url = `${BASE}/preds/pre-tournament-archive?event_id=${event}&year=${year}&odds_format=percent&file_format=json&key=${key}`;
      const res = await fetch(url, { next: { revalidate: 3600 } });
      if (!res.ok) return NextResponse.json({ error: `DataGolf returned ${res.status}` }, { status: 502 });
      const data = await res.json();
      const raw: { dg_id: number; player_name: string }[] = data.baseline_history_fit ?? data.baseline ?? [];
      const players = raw.map(p => ({ dg_id: Number(p.dg_id), player_name: String(p.player_name ?? '') }));
      return NextResponse.json({ players });
    }

    // Upcoming / in-progress: use current pre-tournament field
    const url = `${BASE}/preds/pre-tournament?tour=pga&odds_format=percent&file_format=json&key=${key}`;
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) return NextResponse.json({ error: `DataGolf returned ${res.status}` }, { status: 502 });
    const data = await res.json();
    const raw: { dg_id: number; player_name: string }[] = data.baseline_history_fit ?? data.baseline ?? [];
    const players = raw.map(p => ({ dg_id: p.dg_id, player_name: p.player_name }));
    return NextResponse.json({ players });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
