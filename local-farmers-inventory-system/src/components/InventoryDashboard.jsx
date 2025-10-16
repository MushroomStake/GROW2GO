"use client";
import React, { useState } from "react";
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

function InventoryDashboard({ products, categories }) {
  // Handler logic moved here
  const handleAddProduct = async (product) => {
    try {
      await apiService.createProduct(product);
      toast.success("Product added successfully!");
    } catch (error) {
      toast.error("Failed to add product");
    }
    // Optionally, refresh or update local state
  };
  const handleUpdateProduct = async (id, product) => {
    try {
      await apiService.updateProduct(id, product);
      toast.success("Product updated successfully!");
    } catch (error) {
      toast.error("Failed to update product");
    }
    // Optionally, refresh or update local state
  };
  const handleDeleteProduct = async (id) => {
    try {
      await apiService.deleteProduct(id);
      toast.success("Product deleted successfully!");
    } catch (error) {
      toast.error("Failed to delete product");
    }
    // Optionally, refresh or update local state
  };
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');

  // Calculate stats
  const totalProducts = products.length;
  const totalQuantity = products.reduce((sum, product) => sum + product.quantity, 0);
  const categoriesCount = [...new Set(products.map(p => p.category))].length;

  // Filter products based on search and category
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
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
              {categories.map(category => (
                <option key={category.id} value={category.name}>{category.name}</option>
              ))}
            </select>
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
              categories={categories}
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
          categories={categories}
          onUpdateProduct={handleUpdateProduct}
          onDeleteProduct={handleDeleteProduct}
          onClose={handleCloseEditForm}
        />
      )}
    </div>
  );
}

export default InventoryDashboard;