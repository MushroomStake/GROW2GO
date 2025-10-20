"use client";
import React from 'react';
import { createClient } from '@supabase/supabase-js';
import { toast } from 'react-hot-toast';
import '../../src/components/AuthModal.css';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export default function ResetPasswordPage() {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);
  const [newPassword, setNewPassword] = React.useState('');
  const [tokenInfo, setTokenInfo] = React.useState(null);

  React.useEffect(() => {
    const hash = window.location.hash.substring(1); // remove '#'
    const params = new URLSearchParams(hash);
    const err = params.get('error');
    const error_description = params.get('error_description');
    const type = params.get('type');
    const access_token = params.get('access_token');
    const refresh_token = params.get('refresh_token');

    if (err) {
      setError(`${err}: ${error_description || ''}`);
      return;
    }

    if (access_token && type === 'recovery') {
      setTokenInfo({ access_token, refresh_token, type });
    } else {
      setError('No recovery token found in the URL.');
    }
  }, []);

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    if (!tokenInfo) {
      toast.error('No recovery token available');
      return;
    }
    try {
      setLoading(true);
      const supabase = createClient(SUPABASE_URL!, SUPABASE_ANON!);
      const { error: sessionErr } = await supabase.auth.setSession({ access_token: tokenInfo.access_token, refresh_token: tokenInfo.refresh_token });
      if (sessionErr) throw sessionErr;
      const { data, error: updateErr } = await supabase.auth.updateUser({ password: newPassword });
      if (updateErr) throw updateErr;

      // Update the demo table so the app's demo login (which compares against users_demo.password_hash) will accept the new password
      try {
        const res = await fetch('/api/auth/update-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: data?.user?.email || '' , password: newPassword }) });
        const j = await res.json().catch(() => null);
        if (res.ok && !(j && j.warning)) {
          // Demo table updated successfully — log to console but avoid an extra user toast here
          console.log('Demo table updated');
        } else {
          const bodyMsg = j && (j.error || j.message || j.warning) ? (j.error || j.message || j.warning) : `status ${res.status}`;
          toast.error('Failed to update demo table: ' + bodyMsg);
        }
      } catch (e) {
        console.warn('update-password call failed', e);
        toast.error('Failed to update demo table');
      }

      toast.success('Password updated. You are now signed in.');
      window.location.href = '/';
    } catch (e: any) {
      console.error('Reset password error', e);
      toast.error(e?.message || 'Failed to set new password');
      setError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-overlay">
      <div className="auth-modal" role="dialog" aria-modal="true">
        <h2>Reset password</h2>
        <p className="auth-subtitle">Enter a new password for your account</p>
        {error && <div className="auth-error">{error}</div>}
        {tokenInfo ? (
          <form onSubmit={handleSetPassword}>
            <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="New password" />
            <div className="auth-actions" style={{ marginTop: 6 }}>
              <button type="button" className="cancel-btn" onClick={() => (window.location.href = '/')}>Cancel</button>
              <button type="submit" className="primary" disabled={loading}>{loading ? 'Please wait...' : 'Set new password'}</button>
            </div>
          </form>
        ) : (
          <div style={{ marginTop: 12 }}>Checking token...</div>
        )}
      </div>
    </div>
  );
}
