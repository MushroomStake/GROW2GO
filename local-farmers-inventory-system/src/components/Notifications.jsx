"use client";
    import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import './Notifications.css';
import apiService from '../services/api';
import Link from 'next/link';

const DEFAULT_CRITICAL = 2; // items <= this are considered critical

export default function Notifications({ open, onClose, anchorRect }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const modalRef = useRef(null);

  useEffect(() => {
    let mounted = true;
    if (!open) return;
    (async () => {
      setLoading(true);
      try {
        const products = await apiService.getProducts();
        if (!mounted) return;
        const low = (products || []).filter(p => {
          const q = Number(p.quantity || 0);
          const th = Number(p.critical_threshold ?? DEFAULT_CRITICAL);
          return q <= th;
        }).sort((a,b) => (Number(a.quantity||0) - Number(b.quantity||0)));
        setItems(low);
      } catch (e) {
        console.error('Failed to load notifications', e);
        setItems([]);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [open]);

  // compute inline style if anchorRect provided
  let modalStyle = {};
  if (anchorRect && typeof window !== 'undefined') {
    const viewportW = window.innerWidth;
    const maxW = Math.max(280, Math.min(520, viewportW - 24));
    // prefer a comfortable width but clamp to viewport
    const modalWidth = Math.min(440, maxW);
  // We'll position the modal using fixed coordinates so it won't be affected by page scroll.
  // Aim to have the caret tip sit at a fixed offset (desiredArrowOffset) from the modal's left edge
  // This mirrors Facebook's placement where the tip is near the left edge of the popover.
  const anchorCenter = Math.round(anchorRect.left + anchorRect.width / 2);
  // place caret near the right edge of the modal: desiredRightOffset px from the modal's right edge
  const desiredRightOffset = 36; // px from modal right edge to caret tip (tweakable)
  // compute left so that caret tip will be at modalWidth - desiredRightOffset
  const preferredLeft = Math.round(anchorCenter - (modalWidth - desiredRightOffset));
  let left = Math.max(8, Math.min(preferredLeft, viewportW - modalWidth - 8));
  // add a slightly larger gap beneath the anchor so the popover doesn't touch the icon
  const top = Math.round(anchorRect.bottom + 12);
  // arrowLeft is the x offset from modal left to the arrow tip
  let arrowLeft = anchorCenter - left;
    // clamp arrow inside modal content area with some breathing room
    arrowLeft = Math.max(10, Math.min(modalWidth - 10, arrowLeft));
    modalStyle = {
      position: 'fixed',
      left: left + 'px',
      top: top + 'px',
      width: modalWidth + 'px',
      zIndex: 2000,
      // CSS var for arrow position
      ['--arrow-left']: arrowLeft + 'px'
    };
  }

  // click-outside and ESC to close when anchored (portal) mode
  useEffect(() => {
    if (!open || !anchorRect) return;
    const onDocMouse = (ev) => {
      try {
        const target = ev.target;
        if (modalRef.current && !modalRef.current.contains(target)) {
          onClose && onClose();
        }
      } catch (e) {}
    };
    const onKey = (ev) => { if (ev.key === 'Escape') onClose && onClose(); };
    document.addEventListener('mousedown', onDocMouse);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDocMouse); document.removeEventListener('keydown', onKey); };
  }, [open, anchorRect, onClose]);

  // don't render content if closed; keep hooks above unconditional
  if (!open) return null;

  const modalContent = (
    <div
      className="auth-modal notifications-modal"
      style={modalStyle}
      ref={modalRef}
      role="dialog"
      aria-modal="true"
    >
  <h3>Notifications</h3>
  <p className="muted">Recent inventory notifications.</p>
        {loading ? (
          <div className="muted">Loading…</div>
        ) : (
          <div className="notif-list">
            {items.length === 0 ? (
              <div className="notif-empty">No critical stock items 🎉</div>
            ) : (
              items.map(p => {
                const q = Number(p.quantity || 0);
                const th = Number(p.critical_threshold ?? DEFAULT_CRITICAL);
                // severity: out of stock (critical) if q <= 0, medium if q <= th
                const severity = q <= 0 ? 'critical' : (q <= th ? 'medium' : 'medium');
                const title = severity === 'critical' ? 'Critical stock alert' : 'Low stock alert';
                const desc = severity === 'critical' ? `Out of stock or no remaining items for ${p.name}.` : `${p.name} is low (only ${q} left).`;
                return (
                  <Link href={`/inventory?productId=${encodeURIComponent(p.id)}`} key={p.id} className="notif-row-link">
                    <div className={`notif-row severity-${severity}`}>
                      <div style={{display:'flex', alignItems:'center'}}>
                        <div className="notif-severity-dot" aria-hidden />
                        <div>
                          <div className="notif-title">{title}</div>
                          <div className="notif-desc">{desc}</div>
                        </div>
                      </div>
                      <div className="notif-meta">In stock: <strong>{q}</strong></div>
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        )}
        {/* Footer actions removed: navigation is handled by clicking rows or clicking outside to dismiss */}
      </div>
  );

  // If anchorRect provided, render as portal (positioned popup). Otherwise keep previous overlay layout.
  if (anchorRect) {
    if (typeof window === 'undefined' || !document) return null;
    return createPortal(modalContent, document.body);
  }

  return (
    <div className="auth-overlay" onMouseDown={onClose}>
      <div onMouseDown={(e)=>e.stopPropagation()}>
        {modalContent}
      </div>
    </div>
  );
}
