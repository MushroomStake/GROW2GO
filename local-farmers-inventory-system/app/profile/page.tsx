import dynamic from 'next/dynamic';
import React from 'react';

const ProfileEdit = dynamic(() => import('../../src/components/ProfileEdit'), { ssr: false });

export default function Page() {
  return (
    <div style={{ padding: 18 }}>
      <ProfileEdit />
    </div>
  );
}
