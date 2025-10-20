import { NextResponse } from 'next/server';

export async function POST() {
  // Demo: no server cookie used; return ok so client can call this safely.
  return NextResponse.json({ ok: true });
}
