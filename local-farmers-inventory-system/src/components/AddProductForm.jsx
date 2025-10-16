"use client";
import React, { useState } from "react";
import './AddProductForm.css';

function AddProductForm({ categories, onAddProduct, onCancel }) {
  const [formData, setFormData] = useState({
    name: '',
    categoryId: '',
    customCategory: '',
    quantity: '',
    unit: ''
  });
  const [showCustomCategory, setShowCustomCategory] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Show custom category input if "custom" is selected
    if (name === 'categoryId' && value === 'custom') {
      setShowCustomCategory(true);
    } else if (name === 'categoryId' && value !== 'custom') {
      setShowCustomCategory(false);
      setFormData(prev => ({ ...prev, customCategory: '' }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name || !formData.quantity || !formData.unit) {
      alert('Please fill in all required fields');
      return;
    }

    if (!formData.categoryId) {
      alert('Please select a category');
      return;
    }

    if (formData.categoryId === 'custom' && !formData.customCategory.trim()) {
      alert('Please enter a custom category name');
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
        // Use custom category name if provided, otherwise use selected category
        category: formData.categoryId === 'custom' ? formData.customCategory.trim() : 
                  categories.find(c => c.id === parseInt(formData.categoryId))?.name
      };

      await onAddProduct(productData);

      // Reset form only if successful
      setFormData({
        name: '',
        categoryId: '',
        customCategory: '',
        quantity: '',
        unit: ''
      });
      setShowCustomCategory(false);
      
      // Close the form after successful addition
      onCancel();
    } catch (error) {
      alert('Failed to add product: ' + error.message);
    }
  };

  const unitOptions = [
    'kg', 'pieces', 'liters', 'grams', 'bunches', 'jars', 'boxes', 'bags'
  ];

  return (
    <div className="add-product-form">
      <div className="form-header">
        <h2>Add New Product</h2>
        <p>Enter details to fill a new fresh product in your inventory.</p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="name">Product Name</label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="e.g., Tomatoes"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="categoryId">Category</label>
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

        {showCustomCategory && (
          <div className="form-group">
            <label htmlFor="customCategory">Custom Category Name</label>
            <input
              type="text"
              id="customCategory"
              name="customCategory"
              value={formData.customCategory}
              onChange={handleChange}
              placeholder="Enter custom category name"
              required
            />
          </div>
        )}

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="quantity">Quantity</label>
            <input
              type="number"
              id="quantity"
              name="quantity"
              value={formData.quantity}
              onChange={handleChange}
              placeholder="1"
              min="0"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="unit">Unit</label>
            <select
              id="unit"
              name="unit"
              value={formData.unit}
              onChange={handleChange}
              required
            >
              <option value="">Select unit</option>
              {unitOptions.map(unit => (
                <option key={unit} value={unit}>
                  {unit}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-actions">
          <button type="button" onClick={onCancel} className="cancel-btn">
            Cancel
          </button>
          <button type="submit" className="save-btn">
            Save Product
          </button>
        </div>
      </form>
    </div>
  );
}

export default AddProductForm;