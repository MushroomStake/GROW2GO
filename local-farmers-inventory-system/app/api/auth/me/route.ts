import { NextResponse } from 'next/server';

// For demo: we don't use server-side tokens. The client persists user locally.
export async function GET() {
  return NextResponse.json({ error: 'Not implemented for demo' }, { status: 404 });
}
