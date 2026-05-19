import { NextResponse } from 'next/server';
import { getRecommendedParlay } from '@/lib/datagolf';

export async function GET() {
  const data = await getRecommendedParlay();
  return NextResponse.json(data);
}
