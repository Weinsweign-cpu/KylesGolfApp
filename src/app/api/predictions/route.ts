import { NextResponse } from 'next/server';
import { getPredictionsForEvent } from '@/lib/datagolf';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const eventParam = url.searchParams.get('event') ?? 'current';
  const eventId = eventParam === 'current' ? 'current' : parseInt(eventParam, 10);
  if (typeof eventId === 'number' && isNaN(eventId)) {
    return NextResponse.json({ error: 'invalid event id' }, { status: 400 });
  }
  const data = await getPredictionsForEvent(eventId as number | 'current');
  return NextResponse.json(data);
}
