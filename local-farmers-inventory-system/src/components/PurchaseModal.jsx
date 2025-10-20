"use client";
import React, { useEffect, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import './PurchaseModal.css';

export default function PurchaseModal({ open, product, onClose, onConfirm }) {
  const [qty, setQty] = useState(1);
  const modalRef = useRef(null);

  useEffect(() => {
    if (open) {
      setQty(1);
      // simple focus management
      setTimeout(() => modalRef.current?.focus?.(), 0);
    }
  }, [open, product]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    if (open) window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open || !product) return null;

  const max = Number(product.quantity || 0);
  const price = Number(product.price || 0);
  const quantity = Math.max(0, Math.floor(Number(qty) || 0));
  const total = price * quantity;

  const setMax = () => setQty(String(max || 1));

  const change = (next) => {
    const v = Math.max(0, Math.min(max, Math.floor(Number(next) || 0)));
    setQty(String(v));
  };

  const submit = () => {
    const q = Math.max(1, Math.floor(Number(qty) || 0));
    if (q <= 0) {
      toast.error('Please choose at least 1 item');
      return;
    }
    if (q > max) {
      toast.error('Requested quantity exceeds available stock');
      return;
    }
    onConfirm(q);
  };

  const lowStock = max > 0 && max <= 5;

  return (
    <div className="purchase-overlay" onMouseDown={onClose} role="presentation">
      <div
        className="purchase-modal"
        role="dialog"
        aria-modal="true"
        aria-label={`Purchase ${product.name}`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="purchase-body single">
          <div className="purchase-header">
            <h3 ref={modalRef} tabIndex={-1}>{product.name}</h3>
            <div className="modal-category" style={{borderColor: product.categoryColor}}>{product.category}</div>
          </div>

          <div className="meta-row">
            <div>Price</div>
            <div className="price">{new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(price)}</div>
          </div>

          <div className="meta-row">
            <div>Available</div>
            <div className={`stock ${lowStock ? 'low' : ''}`}>{max}</div>
          </div>

          <div className="qty-row">
            <label htmlFor="purchase-qty">Quantity</label>
            <div className="qty-controls">
              <button aria-label="Decrease quantity" className="step" onClick={() => change(quantity - 1)}>-</button>
              <input id="purchase-qty" type="number" min="1" max={max} value={qty} onChange={(e) => setQty(e.target.value)} />
              <button aria-label="Increase quantity" className="step" onClick={() => change(quantity + 1)}>+</button>
              <button className="max-btn" onClick={setMax}>Max</button>
            </div>
          </div>

          <div className="meta-row total-row">
            <div>Total</div>
            <div className="total">{new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(total)}</div>
          </div>

          <div className="purchase-actions">
            <button className="btn" onClick={onClose}>Cancel</button>
            <button className="btn primary purchase-confirm" onClick={submit} disabled={quantity < 1 || quantity > max || max === 0}>
              Confirm Purchase
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
