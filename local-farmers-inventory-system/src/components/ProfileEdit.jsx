"use client";
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';
import './Profile.css';

export default function ProfileEdit() {
  const { user, updateProfile } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [contact, setContact] = useState(user?.contact || '');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const updated = await updateProfile({ email: user.email, name, contact });
      toast.success('Profile updated');
    } catch (e) {
      console.error('Profile update failed', e);
      toast.error(e?.message || 'Profile update failed');
    } finally {
      setLoading(false);
    }
  };

  if (!user) return <div style={{ padding: 20 }}>Please sign in to edit your profile.</div>;

  return (
    <div className="profile-page">
      <form onSubmit={submit} className="profile-form">
        <h2>Your profile</h2>
        <div className="profile-row">
          <label>Full name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="profile-row">
          <label>Email</label>
          <input value={user.email} readOnly />
        </div>
        <div className="profile-row">
          <label>Contact</label>
          <input value={contact} onChange={(e) => setContact(e.target.value)} />
        </div>

        <div className="profile-actions">
          <button type="button" className="cancel-btn" onClick={() => window.history.back()}>Back</button>
          <button type="submit" className="edit-btn" disabled={loading}>{loading ? 'Saving...' : 'Save changes'}</button>
        </div>
      </form>
    </div>
  );
}
