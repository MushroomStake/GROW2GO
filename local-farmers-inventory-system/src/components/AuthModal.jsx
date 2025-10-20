"use client";
import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  // checklist is always shown on step 2 now
  const [regStep, setRegStep] = useState(1); // 1: personal, 2: password, 3: review

  // Password strength rules
  const pwRules = useMemo(() => ({
    minLen: 8,
    requireUpper: true,
    requireNumber: true,
    requireSymbol: true,
  }), []);

  const analyzePassword = (pw) => {
    const hasUpper = /[A-Z]/.test(pw);
    const hasNumber = /[0-9]/.test(pw);
    const hasSymbol = /[!@#$%^&*(),.?"':{}|<>\[\]\\/~`_+=;-]/.test(pw);
    const minLen = pw.length >= pwRules.minLen;
    // simple scoring: +1 for each rule satisfied
    const score = [hasUpper, hasNumber, hasSymbol, minLen].reduce((s, ok) => s + (ok ? 1 : 0), 0);
    return { hasUpper, hasNumber, hasSymbol, minLen, score };
  };

  const strengthLabel = (score) => {
    if (score <= 1) return 'Weak';
    if (score === 2) return 'Fair';
    if (score === 3) return 'Good';
    return 'Strong';
  };

  const auth = useAuth();
  const modalRef = useRef(null);
  const firstInputRef = useRef(null);

  // reset modal to initial login state when opened
  useEffect(() => {
    if (open) {
      setMode('login');
      setForm({ name: '', email: '', contact: '', password: '', confirmPassword: '' });
      setErrors(null);
      setShowPassword(false);
      setLoading(false);
    }
  }, [open]);

  // auto-focus first input when step/mode changes
  useEffect(() => {
    try { firstInputRef.current && firstInputRef.current.focus(); } catch (e) {}
  }, [mode, regStep]);

  // focus trap and Enter-to-proceed
  useEffect(() => {
    if (!open) return;
    const el = modalRef.current;
    if (!el) return;

    const focusableSelector = 'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';
    const getFocusable = () => Array.from(el.querySelectorAll(focusableSelector)).filter((n) => n.offsetParent !== null);

    const onKeyDown = (ev) => {
      if (ev.key === 'Enter') {
        // ignore Enter when focused on a button that expects to be clicked differently
        const tag = document.activeElement && document.activeElement.tagName;
        if (tag === 'TEXTAREA') return;
        ev.preventDefault();
        submit();
      }
      if (ev.key === 'Tab') {
        const focusables = getFocusable();
        if (focusables.length === 0) return;
        const idx = focusables.indexOf(document.activeElement);
        if (ev.shiftKey) {
          // Shift+Tab
          const prev = (idx <= 0) ? focusables[focusables.length - 1] : focusables[idx - 1];
          ev.preventDefault(); prev.focus();
        } else {
          const next = (idx === -1 || idx === focusables.length - 1) ? focusables[0] : focusables[idx + 1];
          ev.preventDefault(); next.focus();
        }
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, regStep, mode, form]);

  if (!open) return null;

  const handleClose = () => {
    // reset transient state and call upstream onClose
    setMode('login');
    setForm({ name: '', email: '', contact: '', password: '', confirmPassword: '' });
    setErrors(null);
    setShowPassword(false);
    setLoading(false);
    try { onClose && onClose(); } catch (e) {}
  };

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
          // close and reset
          handleClose();
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
    if (mode === 'register') {
      // For multi-step flow, only validate the visible step on Next; full validation before final submit
      if (regStep === 1) {
        if (!form.email || !form.name || !form.contact) {
          setErrors('Please fill required personal fields');
          return;
        }
        // move to next step
        setErrors(null);
        setRegStep(2);
        return;
      }
      if (regStep === 2) {
        if (!form.password || !form.confirmPassword) {
          setErrors('Please enter and confirm your password');
          return;
        }
        if (form.password !== form.confirmPassword) {
          setErrors('Passwords do not match');
          return;
        }
        const analysis = analyzePassword(form.password || '');
        if (!(analysis.minLen && analysis.hasUpper && analysis.hasNumber && analysis.hasSymbol)) {
          setErrors('Password must be at least 8 characters and include an uppercase letter, a number, and a symbol (for example: !).');
          return;
        }
        // move to review
        setErrors(null);
        setRegStep(3);
        return;
      }
      // regStep === 3: final submit continues below
      if (!form.email || !form.password || !form.name) {
        setErrors('Please fill required fields');
        return;
      }
    } else {
      // login flow
      if (!form.email || !form.password) {
        setErrors('Please fill required fields');
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
        // reset reg step
        setRegStep(1);
        handleClose();
      } else {
        await login({ email: form.email, password: form.password });
        toast.success('Logged in');
        handleClose();
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
    <div className="auth-overlay" onMouseDown={handleClose}>
      <div ref={modalRef} className="auth-modal" onMouseDown={(e) => e.stopPropagation()}>
        {/* If logged in, show profile info */}
        {auth.user ? (
          <Profile onClose={handleClose} />
        ) : (
          <>
            <h2>{mode === 'register' ? 'Create account' : mode === 'recovery' ? 'Password recovery' : 'Login'}</h2>
            <p className="auth-subtitle">
              {mode === 'register' ? 'Create your account' : mode === 'recovery' ? 'Enter your email to receive recovery instructions' : 'Sign in to your account'}
            </p>
            {errors && (
              <div className={errors === 'Please fill required personal fields' ? 'auth-errors important' : 'auth-errors'}>{errors}</div>
            )}
            <div className="auth-fields">
              {mode === 'register' && regStep === 1 && (
                  <div className="field-row">
                    <label className="field-label">Full name</label>
                    <input ref={regStep === 1 ? firstInputRef : null} name="name" placeholder="Full name" value={form.name} onChange={onChange} />
                  </div>
                )}
                {(mode === 'register' ? regStep === 1 : true) && (
                  <div className="field-row">
                    <label className="field-label">Email</label>
                    <input ref={(mode === 'register' ? regStep === 1 : true) ? firstInputRef : null} name="email" placeholder="Email" value={form.email} onChange={onChange} />
                  </div>
                )}
              {mode === 'register' && (
                <div className="field-row">
                    {/* For multi-step register we render step-specific fields below */}
                    {regStep === 1 && (
                      <>
                        <label className="field-label">Contact number</label>
                        <input name="contact" placeholder="Contact number" value={form.contact} onChange={onChange} />
                      </>
                    )}
                </div>
              )}
              {mode !== 'recovery' && (
                <>
                  {/* Password field (shown for login, or during register steps 2-3) */}
                  {(mode !== 'register' || regStep === 2) && (
                    <div className="field-row">
                      <label className="field-label">Password</label>
                      <div style={{ position: 'relative' }}>
                        <input
                          className="password-input"
                          name="password"
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Password"
                          value={form.password}
                          onChange={onChange}
                          ref={(mode !== 'register' || regStep === 2) ? firstInputRef : null}
                        />
                        <button
                          type="button"
                          className="password-toggle"
                          onClick={() => setShowPassword(!showPassword)}
                          aria-label={showPassword ? 'Hide password' : 'Show password'}
                        >
                          {showPassword ? (
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                              <path d="M3 3L21 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                              <path d="M10.58 10.58A3 3 0 0 0 13.42 13.42" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                              <path d="M8.53 5.56C9.59 5.2 10.78 5 12 5c5 0 9 4 9 7 0 1.1-.68 2.69-1.34 3.7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                              <path d="M4.71 4.71C3.45 6.11 2.5 7.82 2 9c2.42 4.86 7.04 7 10 7 1.29 0 2.5-.26 3.59-.71" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          ) : (
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                              <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {mode === 'register' && regStep === 2 && (
                    <div className="pw-meter">
                      <div className="pw-bar" aria-hidden>
                        <div
                          className="pw-fill"
                          style={{ width: `${(analyzePassword(form.password || '').score / 4) * 100}%` }}
                        />
                      </div>
                      <div className="pw-label">{strengthLabel(analyzePassword(form.password || '').score)}</div>
                      <div className={`pw-small`} style={{ clear: 'both' }}>Use at least {pwRules.minLen} characters, and include an uppercase letter, a number, and a symbol like <code>!</code>.</div>
                      <div className={`pw-checklist`}>
                        {(() => {
                          const a = analyzePassword(form.password || '');
                          return (
                            <>
                              <div className={`pw-check ${a.minLen ? 'ok' : ''}`}><span className="dot" /> Minimum {pwRules.minLen} characters</div>
                              <div className={`pw-check ${a.hasUpper ? 'ok' : ''}`}><span className="dot" /> At least one uppercase letter (A-Z)</div>
                              <div className={`pw-check ${a.hasNumber ? 'ok' : ''}`}><span className="dot" /> At least one number (0-9)</div>
                              <div className={`pw-check ${a.hasSymbol ? 'ok' : ''}`}><span className="dot" /> At least one symbol (e.g. !@#$%)</div>
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  )}

                  {mode === 'register' && regStep === 2 && (
                    <div className="field-row">
                      <label className="field-label">Confirm password</label>
                      <div style={{ position: 'relative' }}>
                        <input className="password-input" name="confirmPassword" type={showPassword ? 'text' : 'password'} placeholder="Confirm password" value={form.confirmPassword} onChange={onChange} />
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Review step summary */}
              {mode === 'register' && regStep === 3 && (
                <div className="field-row">
                  <h4>Review your details</h4>
                  <div className="review-box">
                    <div className="review-row"><div><strong>Full name</strong><div className="review-val">{form.name}</div></div></div>
                    <div className="review-row"><div><strong>Email</strong><div className="review-val">{form.email}</div></div></div>
                    <div className="review-row"><div><strong>Contact</strong><div className="review-val">{form.contact}</div></div></div>
                    <div className="review-row"><div><strong>Password strength</strong><div className="review-val">{strengthLabel(analyzePassword(form.password || '').score)}</div></div></div>
                  </div>
                </div>
              )}
            </div>
            <div className="auth-actions">
              <button className="link" onClick={() => {
                // If in register flow, navigate back a step if possible
                if (mode === 'register' && regStep > 1) { setRegStep(r => r - 1); setErrors(null); return; }
                handleClose();
              }}>Cancel</button>
              {mode === 'register' ? (
                <>
                  {regStep > 1 && <button className="link" onClick={() => { setRegStep(r => r - 1); setErrors(null); }}>Back</button>}
                  <button className="primary" onClick={submit} disabled={loading}>
                    {loading ? 'Please wait...' : (regStep === 3 ? 'Create account' : 'Next')}
                  </button>
                </>
              ) : (
                <button className="primary" onClick={submit} disabled={loading}>
                  {loading ? 'Please wait...' : (mode === 'recovery' ? 'Send recovery email' : 'Sign in')}
                </button>
              )}
            </div>
            <div className="auth-switch">
              {mode === 'register' ? (
                <p>Already have an account? <a href="#" onClick={(e) => { e.preventDefault(); setMode('login'); setRegStep(1); }}>Sign in</a></p>
              ) : mode === 'recovery' ? (
                <p>Remembered your password? <a href="#" onClick={(e) => { e.preventDefault(); setMode('login'); }}>Sign in</a></p>
              ) : (
                <p>
                  Don't have an account? <a href="#" onClick={(e) => { e.preventDefault(); setMode('register'); setRegStep(1); }}>Create one</a>
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
