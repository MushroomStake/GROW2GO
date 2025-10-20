"use client";
import React, { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import ProductList from './ProductList.jsx';
import AddProductForm from './AddProductForm.jsx';
import EditProductForm from './EditProductForm.jsx';
import './InventoryDashboard.css';

// Use public directory paths for icons
const boxIcon = '/icons/box.png';
const inStockIcon = '/icons/in-stock.png';
const categoriesIcon = '/icons/categories.png';
const searchIcon = '/icons/search-interface-symbol.png';

import apiService from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';

function InventoryDashboard({ products: initialProducts, categories }) {
  const [products, setProducts] = useState(initialProducts || []);
  const [categoriesList, setCategoriesList] = useState(categories || []);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [categoriesError, setCategoriesError] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [apiStatus, setApiStatus] = useState({ status: 'unknown', message: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const showApiStatus = typeof process !== 'undefined' && process.env.NEXT_PUBLIC_SHOW_API_STATUS === 'true';

  // auth + router (client-side)
  const { user } = useAuth();
  const router = useRouter();

  // Fetch products from Supabase
  const fetchProducts = async () => {
    const freshProducts = await apiService.getProducts();
    setProducts(freshProducts || []);
  };

  const fetchCategories = async () => {
    setCategoriesLoading(true);
    setCategoriesError(null);
    try {
      const cats = await apiService.getCategories();
      setCategoriesList(cats || []);
    } catch (e) {
      console.error('Failed to fetch categories', e);
      setCategoriesError(e?.message || String(e));
    } finally {
      setCategoriesLoading(false);
    }
  };

  useEffect(() => {
    setProducts(initialProducts || []);
    // If parent didn't provide categories, fetch them client-side
    if (!categories || (Array.isArray(categories) && categories.length === 0)) {
      fetchCategories();
    } else {
      setCategoriesList(categories);
    }

    // Run a quick health check and then force a client-side refresh of products
    (async () => {
      try {
        const res = await apiService.healthCheck();
        setApiStatus({ status: 'ok', message: res.message });
      } catch (err) {
        setApiStatus({ status: 'error', message: err.message || String(err) });
      }

      // Force a client-side refresh of products to avoid showing stale SSR data
      try {
        await fetchProducts();
      } catch (e) {
        // ignore
      }
    })();

    // Optional debug: if ?debug=storage or ?debug=clearstorage is present, log or clear localStorage
    try {
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        if (params.get('debug') === 'storage') {
          console.info('localStorage contents:', { ...localStorage });
        }
        if (params.get('debug') === 'clearstorage') {
          localStorage.clear();
          console.info('localStorage cleared');
        }
      }
    } catch (e) {
      // ignore
    }
  }, [initialProducts]);

  // Redirect non-admin users away from the Inventory Dashboard to the product overview
  useEffect(() => {
    if (typeof window === 'undefined') return;
    // If user is not set yet, wait; the AuthContext initializes from localStorage or server
    if (user === null || user === undefined) return;
    const isAdminFlag = !!(user && (user.isAdmin === true || user.is_admin === true));
    if (!isAdminFlag) {
      // show a short not-authorized flash and then redirect so the user understands why
      try { toast.error('Not authorized — redirecting to product overview'); } catch (e) {}
      setTimeout(() => router.push('/'), 900);
    }
  }, [user, router]);

  // If a productId query param is present, scroll to and highlight that product row
  const searchParams = useSearchParams();
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const pid = searchParams ? searchParams.get('productId') : null;
    if (!pid) return;

    // Attempt to find the element after products are loaded. Try a few times with delays
    let attempts = 0;
    let cancelled = false;
    const tryScroll = () => {
      attempts += 1;
      const el = document.querySelector(`[data-product-id="${pid}"]`);
      if (el) {
        try {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.classList.add('highlight');
          setTimeout(() => el.classList.remove('highlight'), 2600);
        } catch (e) {
          // ignore
        }
        return;
      }
      if (attempts < 6 && !cancelled) {
        setTimeout(tryScroll, 350);
      }
    };
    // kick off after a tiny delay so rendering can start
    setTimeout(tryScroll, 150);
    return () => { cancelled = true; };
  }, [products, searchParams]);

  const handleAddProduct = async (product) => {
    toast.dismiss();
    try {
      await apiService.createProduct(product);
      // notify other parts of the app that inventory changed
  try { window.dispatchEvent(new Event('inventory_changed')); } catch (e) {}
  try { localStorage.setItem('inventory_changed_at', String(Date.now())); } catch (e) {}
      toast.success("Product added successfully!");
      await fetchProducts();
    } catch (error) {
      toast.error("Failed to add product");
    }
  };
  const handleUpdateProduct = async (id, product) => {
    toast.dismiss();
    try {
      await apiService.updateProduct(id, product);
  try { window.dispatchEvent(new Event('inventory_changed')); } catch (e) {}
  try { localStorage.setItem('inventory_changed_at', String(Date.now())); } catch (e) {}
      toast.success("Product updated successfully!");
      await fetchProducts();
    } catch (error) {
      toast.error("Failed to update product");
    }
  };
  const handleDeleteProduct = async (id) => {
    toast.dismiss();
    try {
      await apiService.deleteProduct(id);
  try { window.dispatchEvent(new Event('inventory_changed')); } catch (e) {}
  try { localStorage.setItem('inventory_changed_at', String(Date.now())); } catch (e) {}
      toast.success("Product deleted successfully!");
      await fetchProducts();
    } catch (error) {
      console.error('Delete failed:', error);
      setApiStatus({ status: 'error', message: error.message || String(error) });
      toast.error("Failed to delete product");
    }
  };

  // Calculate stats
  const safeProducts = products || [];
  const totalProducts = safeProducts.length;
  const totalQuantity = safeProducts.reduce((sum, product) => sum + (product.quantity || 0), 0);
  const categoriesCount = [...new Set(safeProducts.map(p => p.category || ''))].filter(Boolean).length;
  

  // Filter products based on search and category
  const filteredProducts = products.filter(product => {
    const q = searchTerm.toLowerCase();
    const matchesSearch = product.name.toLowerCase().includes(q) || (product.category || '').toLowerCase().includes(q);
    const matchesCategory = selectedCategory === '' || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleEditProduct = (product) => {
    setEditingProduct(product);
  };

  const handleCloseEditForm = () => {
    setEditingProduct(null);
  };

  return (
    <div className="inventory-dashboard">
      {showApiStatus && (
        <div className="api-status-bar">
          <span className={`status-dot ${apiStatus.status === 'ok' ? 'ok' : apiStatus.status === 'error' ? 'error' : 'unknown'}`} />
          <span className="status-text">API: {apiStatus.status}</span>
          {apiStatus.message && <span className="status-msg">{apiStatus.message}</span>}
          <button className="recheck-btn" onClick={fetchProducts}>Re-check</button>
        </div>
      )}
      <div className="dashboard-content">
        {/* Inventory Overview */}
        <section className="inventory-overview">
          <h2>Inventory Overview</h2>
          <div className="stats-grid">
            <div className="stat-card primary">
              <div className="stat-content">
                <div className="stat-number">{totalProducts}</div>
                <div className="stat-label">Total Products</div>
              </div>
              <div className="stat-icon">
                <img src={boxIcon} alt="Total Products" />
              </div>
            </div>
            <div className="stat-card secondary">
              <div className="stat-content">
                <div className="stat-number">{totalQuantity}</div>
                <div className="stat-label">Products in Stock</div>
              </div>
              <div className="stat-icon">
                <img src={inStockIcon} alt="Products in Stock" />
              </div>
            </div>
            <div className="stat-card tertiary">
              <div className="stat-content">
                <div className="stat-number">{categoriesCount}</div>
                <div className="stat-label">Product Categories</div>
              </div>
              <div className="stat-icon">
                <img src={categoriesIcon} alt="Product Categories" />
              </div>
            </div>
            
          </div>
        </section>

        {/* Search and Filter */}
        <section className="search-filter-section">
          <div className="search-box">
            <input
              type="text"
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input force-light-input"
            />
            <span className="search-icon">
              <img src={searchIcon} alt="Search" />
            </span>
          </div>
          
          <div className="filter-box">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="filter-select"
            >
              <option value="">Filter by Category</option>
              {categoriesList.map(category => (
                <option key={category.id} value={category.name}>{category.name}</option>
              ))}
            </select>
            {categoriesLoading && <div className="small muted">Loading categories…</div>}
            {!categoriesLoading && categoriesError && <div className="small error">Failed to load categories: {categoriesError}</div>}
            {!categoriesLoading && !categoriesError && categoriesList.length === 0 && <div className="small muted">No categories available</div>}
          </div>
          
          <button 
            className="add-product-btn-secondary"
            onClick={() => setShowAddForm(true)}
          >
            + Add New Product
          </button>
        </section>

        {/* Product List */}
        <section className="product-list-section">
          <ProductList 
            products={filteredProducts} 
            onEditProduct={handleEditProduct}
          />
        </section>
      </div>

      {showAddForm && (
        <div className="modal-overlay" onClick={() => setShowAddForm(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <AddProductForm 
              categories={categoriesList}
              onAddProduct={async (product) => {
                await handleAddProduct(product);
                setShowAddForm(false);
              }}
              onCancel={() => setShowAddForm(false)}
            />
          </div>
        </div>
      )}

      {editingProduct && (
        <EditProductForm 
          product={editingProduct}
          categories={categoriesList}
          onUpdateProduct={handleUpdateProduct}
          onDeleteProduct={handleDeleteProduct}
          onClose={handleCloseEditForm}
        />
      )}
    </div>
  );
}

export default InventoryDashboard;