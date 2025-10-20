"use client";
import React, { useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/navigation';
import './AuthModal.css';
import './Profile.css';

export default function Profile({ onClose }) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const closeBtnRef = useRef(null);
  if (!user) return null;

  const initials = (() => {
    const name = user.name || user.email || '';
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0].slice(0,2).toUpperCase();
    return (parts[0][0] + parts[parts.length-1][0]).toUpperCase();
  })();

  useEffect(() => {
    try { closeBtnRef.current && closeBtnRef.current.focus(); } catch (e) {}
  }, []);

  return (
    <div className="profile">
      <button
        ref={closeBtnRef}
        className="close-btn"
        aria-label="Close profile"
        onClick={() => onClose?.()}
      >
        ×
      </button>
      <div className="head">
        <div className="avatar">{initials}</div>
        <div>
          <h3>{user.name || 'Profile'}</h3>
          <div className="meta">{user.email}</div>
          <div className="meta">Contact: {user.contact || '—'}</div>
        </div>
      </div>
      <div className="role">ID: {user.id} • {user.isAdmin ? 'Admin' : 'User'}</div>
      <div className="confirm-footer">
        <button className="edit-btn" onClick={() => { onClose?.(); router.push('/profile'); }}>Edit profile</button>
        <button className="confirm-btn" onClick={() => { logout(); onClose?.(); }}>Logout</button>
      </div>
    </div>
  );
}

// autofocus the close button when this component mounts
Profile.displayName = 'Profile';
