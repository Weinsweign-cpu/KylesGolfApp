import { NextResponse } from 'next/server';
import { createTournament, updateMatchups, deleteTournament } from '@/lib/kvt/db';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { dg_event_id, year, event_name, course, start_date, matchups } = body;

    if (!dg_event_id || !year || !event_name || !Array.isArray(matchups) || matchups.length !== 6) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    const id = await createTournament({ dg_event_id, year, event_name, course, start_date, matchups });
    return NextResponse.json({ id });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes('UNIQUE constraint failed')) {
      return NextResponse.json({ error: 'A bet already exists for this tournament' }, { status: 409 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const id = Number(new URL(req.url).searchParams.get('id'));
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
    await deleteTournament(id);
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id, matchups } = body;
    if (!id || !Array.isArray(matchups) || matchups.length !== 6) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }
    await updateMatchups(Number(id), matchups);
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
