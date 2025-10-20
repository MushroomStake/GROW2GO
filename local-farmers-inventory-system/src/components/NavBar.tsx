"use client";
import React from 'react';
import Link from 'next/link';
import './NavBar.css';
import AuthModal from './AuthModal';
import ConfirmModal from './ConfirmModal';
import { useAuth } from '../context/AuthContext';

export default function NavBar() {
  const [showAuth, setShowAuth] = React.useState(false);
  const [showProfile, setShowProfile] = React.useState(false);
  const [imgError, setImgError] = React.useState(false);
  const profileRef = React.useRef(null);
  const auth = useAuth();
  const user = (auth as any).user;
  const logout = (auth as any).logout;
  const [localUser, setLocalUser] = React.useState(() => {
    try {
      const raw = localStorage.getItem('gf_user');
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  });
  React.useEffect(() => {
    const onAuth = () => {
      try {
        const raw = localStorage.getItem('gf_user');
        setLocalUser(raw ? JSON.parse(raw) : null);
      } catch (e) { setLocalUser(null); }
    };
    const onStorage = (ev: StorageEvent) => {
      if (ev.key === 'gf_user') onAuth();
    };
    window.addEventListener('gf_auth_changed', onAuth);
    window.addEventListener('storage', onStorage);
    // close profile dropdown when clicking outside
    const onDocClick = (e: MouseEvent) => {
      try {
        const target = e.target as Node;
        if (profileRef.current && !profileRef.current.contains(target)) {
          setShowProfile(false);
        }
      } catch (e) {}
    };
    document.addEventListener('mousedown', onDocClick);
    return () => {
      window.removeEventListener('gf_auth_changed', onAuth);
      window.removeEventListener('storage', onStorage);
      document.removeEventListener('mousedown', onDocClick);
    };
  }, []);
  const effectiveUser = user || localUser;

  // Determine admin status from either the AuthContext or the localStorage-derived user.
  // Accept both `isAdmin` and `is_admin` and common truthy string/number forms.
  const ctxIsAdmin = !!(auth as any).isAdmin;
  const ls = effectiveUser;
  const lsIsAdmin = !!(ls && (ls.isAdmin === true || ls.is_admin === true || ls.isAdmin === 1 || ls.isAdmin === '1' || (typeof ls.isAdmin === 'string' && ls.isAdmin.toLowerCase() === 'true')));
  const isAdmin = ctxIsAdmin || lsIsAdmin;

  const handleLogout = () => {
    setShowConfirm(true);
  };

  const [showConfirm, setShowConfirm] = React.useState(false);
  const doConfirmLogout = () => { (logout as any)(); setShowProfile(false); setShowConfirm(false); };

  return (
    <>
      <nav className={`gf-nav light`}>
        <div className="gf-nav-inner">
          <div className="gf-brand">
            <Link href="/products">GROW2GO</Link>
          </div>
          <div className="gf-links">
            <Link href="/products">Products</Link>
            {isAdmin && <Link href="/inventory">Inventory Dashboard</Link>}
            {effectiveUser ? (
              <div className="nav-profile" ref={profileRef}>
                <button className="nav-btn profile-btn" onClick={() => setShowProfile((s: boolean) => !s)}>
                  {(!imgError) ? (
                    <img src="/icons/profile.png" alt="Profile" className="profile-icon" onError={() => setImgError(true)} />
                  ) : (
                    <div className="profile-initials">{(() => {
                      const name = (effectiveUser as any)?.name || (effectiveUser as any)?.email || '';
                      const parts = name.split(/\s+/).filter(Boolean);
                      if (parts.length === 0) return '?';
                      if (parts.length === 1) return parts[0].slice(0,2).toUpperCase();
                      return (parts[0][0] + parts[parts.length-1][0]).toUpperCase();
                    })()}</div>
                  )}
                </button>
                {showProfile && (
                  <div className="profile-menu">
                    <div className="profile-item">{(effectiveUser as any)?.name || (effectiveUser as any)?.email}</div>
                    <div className="profile-item small">{(effectiveUser as any)?.email}</div>
                    <div className="profile-item link" onClick={() => { setShowProfile(false); window.location.href = '/profile'; }}>Profile</div>
                    <div className="profile-actions">
                      <button onClick={handleLogout}>Logout</button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <button className="nav-btn" onClick={() => setShowAuth(true)}>Login</button>
            )}
          </div>
        </div>
      </nav>
      <AuthModal open={showAuth} onClose={() => setShowAuth(false)} />
      <ConfirmModal open={showConfirm} title="Log out" message="Are you sure you want to log out?" onConfirm={doConfirmLogout} onCancel={() => setShowConfirm(false)} />
    </>
  );
}
