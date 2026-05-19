import { NextResponse } from 'next/server';
import { getPlayerProfile } from '@/lib/datagolf';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ dgId: string }> }
) {
  const { dgId } = await params;
  const id = parseInt(dgId, 10);
  if (isNaN(id)) {
    return NextResponse.json({ error: 'Invalid dgId' }, { status: 400 });
  }
  const profile = await getPlayerProfile(id);
  return NextResponse.json(profile);
}
