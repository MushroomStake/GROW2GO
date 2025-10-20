"use client";
import React from 'react';

export default function RecoveryRedirect() {
  React.useEffect(() => {
    try {
      const hash = window.location.hash || '';
      if (!hash) return;
      const params = new URLSearchParams(hash.substring(1));
      const type = params.get('type');
      // If this looks like a Supabase recovery link, forward to reset-password page preserving the hash
      if (type === 'recovery' || params.get('access_token') || params.get('error')) {
        const target = '/reset-password' + hash;
        // Use replace so user won't have to click back through the landing page
        window.location.replace(target);
      }
    } catch (e) {
      console.warn('RecoveryRedirect error', e);
    }
  }, []);
  return null;
}
