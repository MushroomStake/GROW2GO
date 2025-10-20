"use client";
import React from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../src/context/AuthContext';
import { toast } from 'react-hot-toast';

// Load the client InventoryDashboard component (it is a client component)
const InventoryDashboard = dynamic(() => import('../../src/components/InventoryDashboard.jsx'), { ssr: false });

export default function InventoryPage() {
  const { user } = useAuth();
  const router = useRouter();

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    // If user is undefined, AuthContext is still hydrating -> wait
    if (user === undefined) return;

    // Helper: coerce common truthy representations into boolean
    const toBool = (v: any): boolean => {
      if (v === true) return true;
      if (v === false) return false;
      if (v === 1) return true;
      if (v === '1') return true;
      if (typeof v === 'string') return v.toLowerCase() === 'true';
      return false;
    };

    // If user is null (not authenticated) or not admin, redirect to products
    const isAdminFlag = toBool(user?.isAdmin ?? user?.is_admin);
    if (!isAdminFlag) {
      try { toast.error('Not authorized — redirecting to products'); } catch (e) {}
      const t = setTimeout(() => router.push('/products'), 700);
      return () => clearTimeout(t);
    }
  }, [user, router]);

  // While waiting for auth, show nothing (client component will hydrate). The InventoryDashboard itself also checks
  // admin and will redirect if unauthorized. We render it so admins get the UI.
  return (
    <div style={{ padding: 12 }}>
      <InventoryDashboard products={[]} categories={[]} />
    </div>
  );
}
