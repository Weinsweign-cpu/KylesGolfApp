import { NextResponse } from 'next/server';
import { getCourseProfile } from '@/lib/datagolf';

export async function GET() {
  const data = await getCourseProfile();
  return NextResponse.json(data);
}
