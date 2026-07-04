'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace('/login');
        return;
      }

      // Ambil profile untuk menentukan role
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single();

      if (error || !profile) {
        // Jika profile gagal diload, logout dan kembali ke login
        await supabase.auth.signOut();
        router.replace('/login');
        return;
      }

      if (profile.role === 'admin') {
        router.replace('/admin');
      } else {
        router.replace('/dashboard');
      }
    };

    checkUser();
  }, [router]);

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      flexDirection: 'column',
      gap: '1rem',
      backgroundColor: '#0a0f1d'
    }}>
      <div style={{
        border: '3px solid rgba(255,255,255,0.05)',
        borderTop: '3px solid #6366f1',
        borderRadius: '50%',
        width: '36px',
        height: '36px',
        animation: 'spin 0.8s linear infinite'
      }}></div>
      <p style={{ color: '#94a3b8', fontSize: '0.9rem', letterSpacing: '0.05em' }}>
        Memeriksa Autentikasi...
      </p>
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
