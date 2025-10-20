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

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { email, password } = await req.json();
    if (!email || !password) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

    const { data, error } = await supabase.from('users_demo').select('*').eq('email', email).limit(1).single();
    if (error || !data) {
      console.error('Supabase select error or no data', { error, data });
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const user = data as any;
    // Demo: compare plain-text password (not secure)
    if (user.password_hash !== password) return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });

  // For demo: return user JSON only (no token/cookie). Client will persist locally.
  return NextResponse.json({ user: { id: user.id, name: user.name, email: user.email, contact: user.contact || null, isAdmin: user.is_admin } });
  } catch (e: any) {
    console.error('Login error (unhandled):', e);
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 });
  }
}
