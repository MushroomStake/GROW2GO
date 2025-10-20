"use client";
import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import AuthModal from './AuthModal';
import PurchaseModal from './PurchaseModal';
import apiService from '../services/api';
import { toast } from 'react-hot-toast';
import './ProductOverview.css';

export default function ProductOverview() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAuth, setShowAuth] = useState(false);
  const [showPurchase, setShowPurchase] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const auth = useAuth();
  const currentUser = auth.user;

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const p = await apiService.getProducts();
        if (mounted) setProducts(p || []);
      } catch (e) {
        console.error('Failed to load products', e);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const handlePurchase = async (product) => {
    // If not logged in, show login modal first
    if (!currentUser) {
      setShowAuth(true);
      return;
    }

    // Show purchase modal for logged-in users
    setSelectedProduct(product);
    setShowPurchase(true);
  };

  const confirmPurchase = async (qty) => {
    if (!selectedProduct) return;
    try {
      const newQty = Math.max(0, (selectedProduct.quantity || 0) - qty);
      await apiService.updateProduct(selectedProduct.id, { ...selectedProduct, quantity: newQty });
      const fresh = await apiService.getProducts();
      setProducts(fresh || []);
      setShowPurchase(false);
      setSelectedProduct(null);
      toast.success(`Purchase recorded — ${qty} items purchased`);
    } catch (e) {
      console.error('Purchase failed', e);
      toast.error('Purchase failed');
    }
  };

  if (loading) return <div className="po-loading">Loading products…</div>;

  return (
    <div className="product-overview">
      <h2>Product Overview</h2>
      <div className="po-grid">
        {products.map(p => (
          <div key={p.id} className="po-card">
            <div className="po-header">
              <div className="po-name">{p.name}</div>
              <div className="po-price">{new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(p.price || 0)} / {p.unit}</div>
            </div>
            <div className="po-meta">Category: <span style={{color: p.categoryColor}}>{p.category}</span></div>
            <div className="po-qty">In stock: {p.quantity}</div>
            <div className="po-actions">
              <button onClick={() => handlePurchase(p)} disabled={!p.quantity}>Purchase</button>
            </div>
          </div>
        ))}
      </div>
      <AuthModal open={showAuth} onClose={() => setShowAuth(false)} />
      <PurchaseModal open={showPurchase} product={selectedProduct} onClose={() => { setShowPurchase(false); setSelectedProduct(null); }} onConfirm={confirmPurchase} />
    </div>
  );
}
