import React, { useEffect } from 'react';
import { Slot, useRouter } from 'expo-router';
import { AuthProvider, useAuth } from '../context/AuthContext';

function RootSlot() {
  const { token, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!token) {
        // Defer navigation to avoid "Attempted to navigate before mounting" error
        const t = setTimeout(() => router.replace('/login'), 50);
        return () => clearTimeout(t);
      }
    }
  }, [token, loading]);

  return <Slot />;
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootSlot />
    </AuthProvider>
  );
}
