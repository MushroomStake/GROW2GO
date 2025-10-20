import { NextResponse } from 'next/server';

// For demo: we don't use server-side tokens. The client persists user locally.
export async function GET() {
  // Demo mode: don't assert a server-side session. Return 200 with no user so
  // client can safely call this endpoint without producing 404 noise in the console.
  return NextResponse.json({ user: null }, { status: 200 });
}
