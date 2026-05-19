import { NextResponse } from 'next/server';
import { getEventResults } from '@/lib/datagolf';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const eventParam = url.searchParams.get('event') ?? 'current';
  const yearParam = url.searchParams.get('year');

  if (eventParam === 'current') {
    const data = await getEventResults('current');
    return NextResponse.json(data);
  }

  const eventId = parseInt(eventParam, 10);
  const year = yearParam ? parseInt(yearParam, 10) : new Date().getFullYear();

  if (isNaN(eventId) || isNaN(year)) {
    return NextResponse.json({ error: 'invalid event or year' }, { status: 400 });
  }

  const data = await getEventResults(eventId, year);
  return NextResponse.json(data);
}
