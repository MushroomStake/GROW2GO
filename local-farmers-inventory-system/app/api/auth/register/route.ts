import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    let supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl) {
      console.error('Supabase URL missing', { supabaseUrl });
      return NextResponse.json({ error: 'Supabase not configured on server' }, { status: 500 });
    }
    if (!supabaseKey && anonKey) {
      console.warn('SUPABASE_SERVICE_ROLE_KEY missing, falling back to anon key for demo (insecure)');
      supabaseKey = anonKey;
    }
    if (!supabaseKey) {
      console.error('Supabase key missing', { supabaseKey, anonKey });
      return NextResponse.json({ error: 'Supabase service key not configured on server' }, { status: 500 });
    }

    const body = await req.json();
    const { name, email, contact, password } = body;
    // Safety: prevent accidental use of service role key in local dev unless explicitly allowed
    const isProd = (process.env.NODE_ENV === 'production') || (process.env.VERCEL_ENV === 'production');
    const allowLocal = String(process.env.ALLOW_LOCAL_SERVICE_ROLE || '').toLowerCase() === 'true';

    // If service role key is provided but we're running locally and not explicitly allowing it,
    // skip demo table writes to avoid affecting production/demo data from a developer laptop.
    if (process.env.SUPABASE_SERVICE_ROLE_KEY && !isProd && !allowLocal) {
      console.warn('SUPABASE_SERVICE_ROLE_KEY present but local environment detected and ALLOW_LOCAL_SERVICE_ROLE!=true. Skipping users_demo insert for safety.');
      // Return a clear skipped response so the client can surface this information
      return NextResponse.json({ skipped: true, reason: 'LOCAL_SERVICE_ROLE_DISABLED', message: 'Demo table insert skipped in local environment for safety. Set ALLOW_LOCAL_SERVICE_ROLE=true to allow.' }, { status: 200 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    if (!email || !password || !name) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    // Demo: store password in password_hash as plain text (not secure).
    const { data, error } = await supabase.from('users_demo').insert([{
      name, email, contact, password_hash: password, is_admin: false
    }]);
    if (error) {
      console.error('Supabase insert error:', error);
      // If we are using anon key fallback, insertion likely failed due to permissions (RLS).
      // Return a 200 with a warning so client-side signUp (if used) can still succeed without a 500.
      if (supabaseKey === anonKey) {
        return NextResponse.json({ warning: 'Demo table insert failed (insufficient permissions). Set SUPABASE_SERVICE_ROLE_KEY to enable server writes to users_demo.', error: error.message }, { status: 200 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    const user = (data?.[0] as any);
    if (!user) {
      console.error('Supabase returned no user data', { data });
      return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
    }
  // For demo: return created user object only (no token or cookie)
  return NextResponse.json({ user: { id: user.id, name: user.name, email: user.email, contact: user.contact || null, isAdmin: user.is_admin } });
  } catch (e: any) {
    console.error('Register error (unhandled):', e);
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 });
  }
}
