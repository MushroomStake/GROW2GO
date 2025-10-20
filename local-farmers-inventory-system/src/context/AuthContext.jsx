"use client";
import React, { createContext, useContext, useEffect, useState } from 'react';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // Initialize from localStorage synchronously (NavBar is client-only so this won't cause SSR mismatch)
  const [user, setUser] = useState(() => {
    try {
      if (typeof window === 'undefined') return null;
      const raw = localStorage.getItem('gf_user');
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  });

  // Helper: coerce various truthy representations into a boolean
  const toBool = (v) => {
    if (v === true) return true;
    if (v === false) return false;
    if (v === 1) return true;
    if (v === '1') return true;
    if (typeof v === 'string') return v.toLowerCase() === 'true';
    return false;
  };

  useEffect(() => {
    // Try to refresh from server-side cookie via /api/auth/me (still demo: returns 404)
    (async () => {
      try {
        const res = await fetch('/api/auth/me');
        const data = await res.json();
          if (res.ok && data.user) {
            const isAdminFlag = toBool(data.user.isAdmin ?? data.user.is_admin);
            setUser({ id: data.user.sub || data.user.id, name: data.user.name || '', email: data.user.email, contact: data.user.contact || null, isAdmin: isAdminFlag });
          return;
        }
      } catch (e) {}
      // If server didn't provide user, localStorage-derived user stays as initial value
    })();
  }, []);

  useEffect(() => {
    try {
      if (user) localStorage.setItem('gf_user', JSON.stringify(user));
      else localStorage.removeItem('gf_user');
    } catch (e) {}
  }, [user]);

  const register = async ({ name, email, contact, password }) => {
    // First, attempt to create an Auth user with Supabase using the anon key (client-side).
    try {
      const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      let signData = null;
      // Attempt client-side Supabase auth signUp (so the user exists in supabase.auth.users)
      if (!SUPABASE_URL || !ANON) {
        console.warn('Supabase client keys missing; falling back to server-only register');
      } else {
        const supabase = createSupabaseClient(SUPABASE_URL, ANON);
        try {
          // signUp will create an auth user; options: third param in v2 is { data }
          const { data: sdata, error: signErr } = await supabase.auth.signUp({ email, password }, { data: { name, contact } });
          signData = sdata;
          if (signErr) {
            console.warn('Supabase signUp returned an error', signErr);
          } else {
            console.log('Supabase signUp success', sdata);
          }
        } catch (e) {
          console.warn('Supabase client signUp failed, continuing to server register', e);
        }
      }

      // Now call the server endpoint which populates users_demo table
      const res = await fetch('/api/auth/register', { method: 'POST', body: JSON.stringify({ name, email, contact, password }), headers: { 'Content-Type': 'application/json' } });
      let data = null;
      try {
        data = await res.json();
      } catch (e) {
        const txt = await res.text().catch(() => null);
        throw new Error(txt || 'Register failed (non-JSON response)');
      }
      if (res.ok && data.user) {
        const isAdminFlag = toBool(data.user.isAdmin ?? data.user.is_admin);
          setUser({ id: data.user.id, name: data.user.name, email: data.user.email, contact: data.user.contact || null, isAdmin: isAdminFlag });
        return data.user;
      }

      // If server insert failed but signUp created an auth user, accept the signUp user and return a warning
      if (signData && signData.user) {
        const su = signData.user;
        const fallbackName = (su.user_metadata && (su.user_metadata.name || su.user_metadata.full_name)) || name || '';
          const fallbackContact = (su.user_metadata && (su.user_metadata.contact)) || contact || null;
          const fallbackUser = { id: su.id, name: fallbackName, email: su.email, contact: fallbackContact, isAdmin: false };
        setUser(fallbackUser);
        // surface a warning so developer knows the demo table insert failed
        try { console.warn('Server register failed but Supabase auth user exists; demo table may be out of sync', { serverBody: data, signData }); } catch (e) {}
        // Return a partial-success object so the UI can show a helpful message instead of an exception
        return { ...fallbackUser, warning: 'Registration partially succeeded: auth user created but demo table insert failed. You may need to sync demo users.' };
      }

      throw new Error(data.error || 'Register failed');
    } catch (e) {
      throw e;
    }
  };

  const login = async ({ email, password }) => {
    const res = await fetch('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }), headers: { 'Content-Type': 'application/json' } });
    let data = null;
    try {
      data = await res.json();
    } catch (e) {
      const txt = await res.text().catch(() => null);
      throw new Error(txt || 'Login failed (non-JSON response)');
    }
    if (res.ok && data.user) {
      // Normalize admin flag: server may return isAdmin or is_admin
      const isAdminFlag = !!(data.user && (data.user.isAdmin === true || data.user.is_admin === true));
        setUser({ id: data.user.id, name: data.user.name, email: data.user.email, contact: data.user.contact || null, isAdmin: isAdminFlag });
      return data.user;
    }
    throw new Error(data.error || 'Login failed');
  };

  const logout = () => {
    setUser(null);
    try { fetch('/api/auth/logout', { method: 'POST' }).catch(() => {}); } catch (e) {}
    try { localStorage.removeItem('gf_user'); } catch (e) {}
    try { window.dispatchEvent(new Event('gf_auth_changed')); } catch (e) {}
    try { toast.success('Logged out'); } catch (e) {}
  };

  const updateProfile = async ({ email, name, contact }) => {
    try {
      const res = await fetch('/api/auth/update-profile', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, name, contact }) });
      const data = await res.json();
      if (!res.ok && !data.ok) {
        throw new Error(data.error || 'Update failed');
      }
      const updated = data.user || {};
      const newUser = { ...(user || {}), name: updated.name || name || (user && user.name), contact: updated.contact || contact || (user && user.contact) };
      setUser(newUser);
      try { localStorage.setItem('gf_user', JSON.stringify(newUser)); } catch (e) {}
      return newUser;
    } catch (e) {
      throw e;
    }
  };

  const value = { user, register, login, logout, updateProfile, isAdmin: !!(user && user.isAdmin) };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

export default AuthContext;
