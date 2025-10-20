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

  // Group products by category for rendering
  const grouped = products.reduce((acc, p) => {
    const key = p.category || 'Uncategorized';
    if (!acc[key]) acc[key] = [];
    acc[key].push(p);
    return acc;
  }, {});
  const categoryOrder = Object.keys(grouped);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');

  const categories = Array.from(new Set(products.map(p => p.category || 'Uncategorized'))).sort();
  // compute counts per category
  const counts = products.reduce((acc, p) => { const k = p.category || 'Uncategorized'; acc[k] = (acc[k] || 0) + 1; return acc; }, {});
  const [showAllChips, setShowAllChips] = useState(false);

  const matchesFilter = (p) => {
    const q = search.trim().toLowerCase();
    if (activeCategory !== 'All' && (p.category || 'Uncategorized') !== activeCategory) return false;
    if (!q) return true;
    return (p.name || '').toLowerCase().includes(q) || (p.category || '').toLowerCase().includes(q);
  };

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
  try { window.dispatchEvent(new Event('inventory_changed')); } catch (e) {}
  try { localStorage.setItem('inventory_changed_at', String(Date.now())); } catch (e) {}
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
      <div className="po-controls">
        <div className="po-search-box">
          <input className="po-search" placeholder="Search products or categories..." value={search} onChange={(e) => setSearch(e.target.value)} />
          <span className="search-icon"><img src="/icons/search-interface-symbol.png" alt="Search" /></span>
        </div>
        <div className={`po-filters ${showAllChips ? 'expanded' : 'collapsed'}` }>
          <button className={`chip ${activeCategory === 'All' ? 'active' : ''}`} onClick={() => setActiveCategory('All')}>All ({products.length})</button>
          {categories.slice(0, showAllChips ? categories.length : 8).map(cat => (
            <button key={cat} className={`chip ${activeCategory === cat ? 'active' : ''}`} onClick={() => setActiveCategory(cat)}>{cat} ({counts[cat] || 0})</button>
          ))}
          {categories.length > 8 && (
            <button className="chip toggle-chip" onClick={() => setShowAllChips(s => !s)} aria-expanded={showAllChips}>{showAllChips ? 'Less' : `More (${categories.length - 8})`}</button>
          )}
        </div>
      </div>

      {categoryOrder.map((cat) => {
        const items = grouped[cat].filter(matchesFilter);
        if (items.length === 0) return null;
        return (
          <section className="po-category" key={cat}>
            <h3 className="po-category-title"><span className="swatch" style={{background: grouped[cat][0]?.categoryColor || '#e5e7eb'}}></span>{cat}</h3>
            <div className="po-grid">
              {items.map(p => (
                <div key={p.id} className="po-card">
                  <div className="po-body">
                    <div className="po-header">
                      <div className="po-name">{p.name}</div>
                      <div className="po-price">{new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(p.price || 0)}</div>
                    </div>
                    <div className="po-meta">Category: <span style={{color: p.categoryColor}}>{p.category}</span></div>
                    <div className="po-bottom-row">
                      <div className={`po-qty ${!p.quantity ? 'out' : ''}`}>{p.quantity ? `In stock: ${p.quantity}` : 'Out of stock'}</div>
                      <div className="po-actions">
                        <button onClick={() => handlePurchase(p)} disabled={!p.quantity} aria-disabled={!p.quantity}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{marginRight:8}} aria-hidden>
                            <path d="M3 3h2l.4 2M7 13h10l4-8H5.4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                            <circle cx="10" cy="20" r="1" fill="currentColor" />
                            <circle cx="18" cy="20" r="1" fill="currentColor" />
                          </svg>
                          Purchase
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        );
      })}
      <AuthModal open={showAuth} onClose={() => setShowAuth(false)} />
      <PurchaseModal open={showPurchase} product={selectedProduct} onClose={() => { setShowPurchase(false); setSelectedProduct(null); }} onConfirm={confirmPurchase} />
    </div>
  );
}
