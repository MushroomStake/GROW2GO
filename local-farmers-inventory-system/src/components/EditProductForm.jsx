"use client";
import React, { useState, useEffect } from 'react';
import { toast } from "react-hot-toast";
import './EditProductForm.css';

function EditProductForm({ product, categories, onUpdateProduct, onDeleteProduct, onClose }) {
  const [formData, setFormData] = useState({
    name: '',
    quantity: '',
    unit: 'kg',
    categoryId: '',
    customCategory: ''
  });

  // Populate form with product data when component mounts
  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name || '',
        quantity: product.quantity || '',
        unit: product.unit || 'kg',
        categoryId: product.categoryId === 'custom' ? 'custom' : product.categoryId.toString(),
        customCategory: product.categoryId === 'custom' ? product.category : ''
      });
    }
  }, [product]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.quantity) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (!formData.categoryId) {
      toast.error('Please select a category');
      return;
    }

    if (formData.categoryId === 'custom' && !formData.customCategory.trim()) {
      toast.error('Please enter a custom category name');
      return;
    }

    try {
      // Prepare the product data
      const productData = {
        name: formData.name,
        categoryId: formData.categoryId,
        customCategory: formData.customCategory,
        quantity: parseInt(formData.quantity),
        unit: formData.unit,
        category: formData.categoryId === 'custom' ? formData.customCategory.trim() : 
                  categories.find(c => c.id === parseInt(formData.categoryId))?.name
      };

      await onUpdateProduct(product.id, productData);
      onClose();
    } catch (error) {
      onClose(); // Optionally close modal on error
    }
  };

  const handleDelete = async () => {
    if (window.confirm(`Are you sure you want to delete "${product.name}"? This action cannot be undone.`)) {
      try {
        await onDeleteProduct(product.id);
        onClose();
      } catch (error) {
        alert('Failed to delete product: ' + error.message);
      }
    }
  };

  if (!product) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <form onSubmit={handleSubmit} className="edit-product-form">
          <div className="form-header">
            <h2>Edit Product</h2>
            <p>Update the product information below</p>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="name">Product Name *</label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Enter product name"
                required
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="quantity">Quantity *</label>
              <input
                type="number"
                id="quantity"
                name="quantity"
                value={formData.quantity}
                onChange={handleChange}
                placeholder="0"
                min="0"
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="unit">Unit</label>
              <select
                id="unit"
                name="unit"
                value={formData.unit}
                onChange={handleChange}
              >
                <option value="kg">Kilograms (kg)</option>
                <option value="g">Grams (g)</option>
                <option value="lbs">Pounds (lbs)</option>
                <option value="pcs">Pieces (pcs)</option>
                <option value="boxes">Boxes</option>
                <option value="liters">Liters</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="categoryId">Category *</label>
              <select
                id="categoryId"
                name="categoryId"
                value={formData.categoryId}
                onChange={handleChange}
                required
              >
                <option value="">Select a category</option>
                {categories.map(category => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
                <option value="custom">+ Add Custom Category</option>
              </select>
            </div>
          </div>

          {formData.categoryId === 'custom' && (
            <div className="form-group">
              <label htmlFor="customCategory">Custom Category Name *</label>
              <input
                type="text"
                id="customCategory"
                name="customCategory"
                value={formData.customCategory}
                onChange={handleChange}
                placeholder="Enter category name"
                required
              />
            </div>
          )}

          {/* Description removed as per requirement */}

          <div className="form-actions">
            <button type="button" className="delete-btn" onClick={handleDelete}>
              Delete Product
            </button>
            <div className="action-group">
              <button type="button" className="cancel-btn" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="save-btn">
                Update Product
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export default EditProductForm;