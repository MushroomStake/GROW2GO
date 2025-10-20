"use client";
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';
import './AuthModal.css';
import Profile from './Profile';

export default function AuthModal({ open, onClose }) {
  const { login, register } = useAuth();
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', contact: '', password: '', confirmPassword: '' });
  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const [errors, setErrors] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const auth = useAuth();

  if (!open) return null;

  const submit = async () => {
    setErrors(null);
    // Password recovery flow
    if (mode === 'recovery') {
      if (!form.email) {
        setErrors('Please provide your email');
        return;
      }
      try {
        setLoading(true);
        const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        const res = await fetch(`${SUPABASE_URL}/auth/v1/recover`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'apikey': ANON, 'Authorization': `Bearer ${ANON}` },
          body: JSON.stringify({ email: form.email })
        });

        // Try to parse response body (JSON or text) for better debugging
        const ct = res.headers.get('content-type') || '';
        let body = null;
        try {
          if (ct.includes('application/json')) {
            body = await res.json();
          } else {
            body = await res.text();
          }
        } catch (parseErr) {
          console.warn('Failed to parse recover response body', parseErr);
        }

        console.log('Supabase recover response', { status: res.status, ok: res.ok, body });

        if (res.ok) {
          // Supabase may return an empty body on success; if body contains an error/msg surface it
          const maybeMsg = body && (body.error || body.msg || body.message || body.error_description);
          if (maybeMsg) {
            toast.error(String(maybeMsg));
          } else {
            toast.success('If that email exists, a recovery link has been sent.');
          }
          setMode('login');
          onClose();
        } else {
          const errText = body && (body.error || body.msg || body.message) ? (body.error || body.msg || body.message) : (typeof body === 'string' ? body : null);
          throw new Error(errText || `Recovery failed (${res.status})`);
        }
      } catch (e) {
        console.error('Recovery error', e);
        toast.error(e?.message || 'Recovery failed');
      } finally {
        setLoading(false);
      }
      return;
    }

    // Register / Login
    if (!form.email || !form.password || (mode === 'register' && !form.name)) {
      setErrors('Please fill required fields');
      return;
    }

    if (mode === 'register') {
      if (!form.contact) {
        setErrors('Please provide a contact number');
        return;
      }
      if (!form.confirmPassword) {
        setErrors('Please confirm your password');
        return;
      }
      if (form.password !== form.confirmPassword) {
        setErrors('Passwords do not match');
        return;
      }
    }
    setLoading(true);
    try {
      if (mode === 'register') {
        const res = await register({ name: form.name, email: form.email, contact: form.contact, password: form.password });
        // If server returned a warning (partial success), treat as success client-side
        // but don't show an additional warning toast to the user here.
        toast.success('Account created');
        onClose();
      } else {
        await login({ email: form.email, password: form.password });
        toast.success('Logged in');
        onClose();
      }
    } catch (e) {
      const msg = e?.message || 'Auth failed';
      setErrors(msg);
      // Don't show an error toast when registering (to avoid alarming the user
      // when registration partially succeeded or was intentionally skipped in dev).
      if (mode !== 'register') {
        toast.error(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-overlay" onMouseDown={onClose}>
      <div className="auth-modal" onMouseDown={(e) => e.stopPropagation()}>
        {/* If logged in, show profile info */}
        {auth.user ? (
          <Profile onClose={onClose} />
        ) : (
          <>
            <h2>{mode === 'register' ? 'Create account' : mode === 'recovery' ? 'Password recovery' : 'Login'}</h2>
            <p className="auth-subtitle">
              {mode === 'register' ? 'Create your account' : mode === 'recovery' ? 'Enter your email to receive recovery instructions' : 'Sign in to your account'}
            </p>
            {errors && <div className="auth-errors">{errors}</div>}
            <div className="auth-fields">
              {mode === 'register' && (
                <div className="field-row">
                  <label className="field-label">Full name</label>
                  <input name="name" placeholder="Full name" value={form.name} onChange={onChange} />
                </div>
              )}
              <div className="field-row">
                <label className="field-label">Email</label>
                <input name="email" placeholder="Email" value={form.email} onChange={onChange} />
              </div>
              {mode === 'register' && (
                <div className="field-row">
                  <label className="field-label">Contact number</label>
                  <input name="contact" placeholder="Contact number" value={form.contact} onChange={onChange} />
                </div>
              )}
              {mode !== 'recovery' && (
                <>
                  <div className="field-row">
                    <label className="field-label">Password</label>
                    <div style={{ position: 'relative' }}>
                      <input className="password-input" name="password" type={showPassword ? 'text' : 'password'} placeholder="Password" value={form.password} onChange={onChange} />
                      <button
                        type="button"
                        className="password-toggle"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? (
                          // eye-off / closed eye
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                            <path d="M3 3L21 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M10.58 10.58A3 3 0 0 0 13.42 13.42" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M8.53 5.56C9.59 5.2 10.78 5 12 5c5 0 9 4 9 7 0 1.1-.68 2.69-1.34 3.7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M4.71 4.71C3.45 6.11 2.5 7.82 2 9c2.42 4.86 7.04 7 10 7 1.29 0 2.5-.26 3.59-.71" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        ) : (
                          // eye / open eye
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>

                  {mode === 'register' && (
                    <div className="field-row">
                      <label className="field-label">Confirm password</label>
                      <div style={{ position: 'relative' }}>
                        <input className="password-input" name="confirmPassword" type={showPassword ? 'text' : 'password'} placeholder="Confirm password" value={form.confirmPassword} onChange={onChange} />
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
            <div className="auth-actions">
              <button className="link" onClick={onClose}>Cancel</button>
              <button className="primary" onClick={submit} disabled={loading}>
                {loading ? 'Please wait...' : (mode === 'register' ? 'Create account' : mode === 'recovery' ? 'Send recovery email' : 'Sign in')}
              </button>
            </div>
            <div className="auth-switch">
              {mode === 'register' ? (
                <p>Already have an account? <a href="#" onClick={(e) => { e.preventDefault(); setMode('login'); }}>Sign in</a></p>
              ) : mode === 'recovery' ? (
                <p>Remembered your password? <a href="#" onClick={(e) => { e.preventDefault(); setMode('login'); }}>Sign in</a></p>
              ) : (
                <p>
                  Don't have an account? <a href="#" onClick={(e) => { e.preventDefault(); setMode('register'); }}>Create one</a>
                  <br />
                  <a href="#" onClick={(e) => { e.preventDefault(); setMode('recovery'); }} style={{ marginTop: 8, display: 'inline-block' }}>Forgot password?</a>
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
