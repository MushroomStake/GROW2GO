"use client";
import React from 'react';
import Link from 'next/link';
import './NavBar.css';

export default function NavBar() {
  return (
    <nav className="gf-nav">
      <div className="gf-nav-inner">
        <div className="gf-brand">
          <Link href="/">GROW2GO</Link>
        </div>
        <div className="gf-links">
          <Link href="/">Inventory Dashboard</Link>
          <Link href="/view-products">View Products</Link>
        </div>
      </div>
    </nav>
  );
}
