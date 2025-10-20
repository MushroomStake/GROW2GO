"use client";
import React from 'react';
import Link from 'next/link';
import './NavBar.css';
import AuthModal from './AuthModal';
import ConfirmModal from './ConfirmModal';
import Notifications from './Notifications';
import { useAuth } from '../context/AuthContext';

export default function NavBar() {
  const [showAuth, setShowAuth] = React.useState(false);
  const [showProfile, setShowProfile] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [notifOpen, setNotifOpen] = React.useState(false);
  const [notifAnchorRect, setNotifAnchorRect] = React.useState(null as any);
  const [imgError, setImgError] = React.useState(false);
  const profileRefDesktop = React.useRef(null);
  const profileRefMobile = React.useRef(null);
  // avoid generic type args to satisfy project TS settings; use `any` for the DOM ref
  const navRef = React.useRef(null as any);
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
    // close profile dropdown when clicking outside (works for both desktop and mobile profile nodes)
    const onDocClick = (e: MouseEvent) => {
      try {
        const target = e.target as Node;
        const desktopContains = profileRefDesktop.current && profileRefDesktop.current.contains(target);
        const mobileContains = profileRefMobile.current && profileRefMobile.current.contains(target);
        if (!desktopContains && !mobileContains) {
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

  // fetch low-stock count for badge (client only)
  const [lowCount, setLowCount] = React.useState(0);
  const prevLowRef = React.useRef(0);
  React.useEffect(() => {
    let mounted = true;
    const api = async () => {
      try {
        const p = await (await import('../services/api')).default.getProducts();
        if (!mounted) return;
        const low = (p || []).filter((x: any) => { const q = Number(x.quantity || 0); const th = Number(x.critical_threshold ?? 2); return q <= th; });
        setLowCount(low.length);
      } catch (e) { }
    };

    // initial fetch
    api();

    // poll every 10 seconds
    const interval = setInterval(api, 10000);

    // Listen for inventory changes dispatched by other parts of the app and refresh immediately
    const onInventoryChanged = (ev: any) => { api(); };
    window.addEventListener('inventory_changed', onInventoryChanged as EventListener);
    // Also listen to storage events so other tabs can notify us
    const onStorage = (ev: StorageEvent) => {
      if (ev.key === 'inventory_changed_at') {
        api();
      }
    };
    window.addEventListener('storage', onStorage as EventListener);

    return () => {
      mounted = false;
      clearInterval(interval);
      window.removeEventListener('inventory_changed', onInventoryChanged as EventListener);
      window.removeEventListener('storage', onStorage as EventListener);
    };
  }, []);

  // Pulse badge when count increases
  React.useEffect(() => {
    try {
      const prev = prevLowRef.current;
      if (lowCount > prev) {
        // find all badges inside this nav and pulse them
        const root = navRef.current;
        if (root) {
          const badges = Array.from(root.querySelectorAll('.notif-badge')) as HTMLElement[];
          badges.forEach((b) => {
            b.classList.remove('pulse');
            // force reflow to restart animation
            // eslint-disable-next-line @typescript-eslint/no-unused-expressions
            b.offsetWidth;
            b.classList.add('pulse');
            window.setTimeout(() => b.classList.remove('pulse'), 950);
          });
        }
      }
      prevLowRef.current = lowCount;
    } catch (e) {}
  }, [lowCount]);

  const [showConfirm, setShowConfirm] = React.useState(false);
  const doConfirmLogout = () => { (logout as any)(); setShowProfile(false); setShowConfirm(false); };

  return (
    <>
  <nav className={`gf-nav light`} ref={navRef}>
        <div className="gf-nav-inner">
          <div className="gf-brand">
            <Link href="/products">GROW2GO</Link>
          </div>

          {/* mobile controls: profile + hamburger */}
          <div className="nav-controls">
            {/* mobile controls: bell (mobile-only) + profile (mobile-only) */}
            {effectiveUser && (
              <>
                {isAdmin && (
                  <div className="nav-notif mobile-only" style={{marginRight:6}}>
                    <button className="notif-btn" onClick={(e:any) => { setNotifAnchorRect(e.currentTarget.getBoundingClientRect()); setNotifOpen((s:boolean)=>!s); }} aria-label="Open notifications">
                      <img src="/icons/notification.png" alt="Notifications" className="notif-icon" />
                      {lowCount > 0 && <span className="notif-badge">{lowCount}</span>}
                    </button>
                  </div>
                )}
                <div className="nav-profile mobile-only" ref={profileRefMobile as any}>
                  <button className="nav-btn profile-btn mobile-profile-btn" onClick={() => setShowProfile((s: boolean) => !s)}>
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
              </>
            )}
            <button className="mobile-toggle" aria-label="Toggle menu" onClick={() => setMobileOpen((s: boolean) => !s)}>
              <span className="hamburger" aria-hidden="true" />
            </button>
          </div>
          <div className={`gf-links ${mobileOpen ? 'open' : ''}`} role="navigation">
            {/* notification bell for admins (desktop-only is inside profile area; mobile-only is in nav-controls) */}
            <Link href="/products">Products</Link>
            {isAdmin && <Link href="/inventory">Inventory Dashboard</Link>}
            {effectiveUser ? (
              <>
                <div className="nav-profile desktop-only" ref={profileRefDesktop as any}>
                  {isAdmin && (
                    <div className="nav-notif desktop-only" style={{marginRight:8}}>
                      <button className="notif-btn" onClick={(e:any) => { setNotifAnchorRect(e.currentTarget.getBoundingClientRect()); setNotifOpen((s:boolean)=>!s); }} aria-label="Open notifications">
                        <img src="/icons/notification.png" alt="Notifications" className="notif-icon" />
                        {lowCount > 0 && <span className="notif-badge">{lowCount}</span>}
                      </button>
                    </div>
                  )}
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
                </>
            ) : (
              <button className="nav-btn" onClick={() => setShowAuth(true)}>Login</button>
            )}
          </div>
        </div>
      </nav>
  <AuthModal open={showAuth} onClose={() => setShowAuth(false)} />
  <Notifications open={notifOpen} onClose={() => setNotifOpen(false)} anchorRect={notifAnchorRect} />
      <ConfirmModal open={showConfirm} title="Log out" message="Are you sure you want to log out?" onConfirm={doConfirmLogout} onCancel={() => setShowConfirm(false)} />
    </>
  );
}
