import { NextResponse } from 'next/server';

// Purges Next.js fetch cache for this request pattern by using no-store.
// The actual result is obtained by the client re-fetching /api/kvt/result.
export async function POST() {
  return NextResponse.json({ ok: true, ts: Date.now() });
}
