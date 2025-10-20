import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    let supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl) return NextResponse.json({ error: 'Supabase not configured on server' }, { status: 500 });
    if (!supabaseKey && anonKey) {
      console.warn('SUPABASE_SERVICE_ROLE_KEY missing, falling back to anon key for demo (insecure)');
      supabaseKey = anonKey;
    }
    if (!supabaseKey) return NextResponse.json({ error: 'Supabase service key not configured on server' }, { status: 500 });

    const supabase = createClient(supabaseUrl, supabaseKey);
    const { email, password } = await req.json();
    if (!email || !password) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

    const { data, error } = await supabase.from('users_demo').update({ password_hash: password }).eq('email', email).select().limit(1).single();
    if (error) {
      console.error('users_demo update error', error);
      // If using anon fallback, return 200 with warning to avoid breaking client flow
      if (supabaseKey === anonKey) {
        return NextResponse.json({ warning: 'Update failed (insufficient permissions)', error: error.message }, { status: 200 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, user: data });
  } catch (e: any) {
    console.error('update-password error', e);
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 });
  }
}
