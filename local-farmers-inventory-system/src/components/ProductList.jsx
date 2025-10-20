"use client";
import React, { useState } from "react";
import './ProductList.css';

function ProductList({ products, onEditProduct }) {
  if (products.length === 0) {
    return (
      <div className="product-list-empty">
        <p>No products in inventory. Add your first product to get started!</p>
      </div>
    );
  }

  // Sort products by category (A-Z), then by name (A-Z)
  const sortedProducts = [...products].sort((a, b) => {
    if (a.category < b.category) return -1;
    if (a.category > b.category) return 1;
    // If same category, sort by name
    if (a.name.toLowerCase() < b.name.toLowerCase()) return -1;
    if (a.name.toLowerCase() > b.name.toLowerCase()) return 1;
    return 0;
  });

  return (
    <div className="product-list">
      <div className="product-list-header">
        <h3>Product List</h3>
      </div>
      <div className="product-table">
        <div className="table-header">
          <div className="header-cell">Product Name</div>
          <div className="header-cell">Price</div>
          <div className="header-cell">Category</div>
          <div className="header-cell">Quantity</div>
          <div className="header-cell">Actions</div>
        </div>

        <div className="table-body">
          {sortedProducts.map((product) => (
            <div key={product.id} className="table-row" data-product-id={product.id}>
              <div className="table-cell product-name">
                {product.name}
              </div>

              <div className="table-cell price" data-label="Price">
                {product.price !== null && product.price !== undefined ? (
                  <span>{new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 2 }).format(product.price)} / {product.unit}</span>
                ) : (
                  <span className="no-price">—</span>
                )}
              </div>
              
              <div className="table-cell category">
                <span className="category-text">
                  {product.category}
                </span>
              </div>
              
              <div className="table-cell quantity">
                <span>{product.quantity}</span>
              </div>

              <div className="table-cell actions">
                <button 
                  className="action-btn update-btn"
                  onClick={() => onEditProduct(product)}
                  title="Update product"
                >
                  Update →
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default ProductList;