"use client";
import React from 'react';
import './AuthModal.css';

export default function ConfirmModal({ open, title = 'Confirm', message = '', onConfirm, onCancel }) {
  if (!open) return null;
  return (
    <div className="auth-overlay" onClick={onCancel}>
      <div className="auth-modal confirm-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <h3 className="auth-title">{title}</h3>
        {message && <p className="auth-subtitle">{message}</p>}
        <div className="confirm-footer">
          <button className="cancel-btn" onClick={onCancel}>Cancel</button>
          <button className="confirm-btn" onClick={onConfirm}>Confirm</button>
        </div>
      </div>
    </div>
  );
}
