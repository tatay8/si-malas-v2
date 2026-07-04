'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { LayoutDashboard, School, Users, Monitor, LogOut, Shield } from 'lucide-react';
import styles from './layout.module.css';

export default function AdminLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace('/login');
        return;
      }

      // Ambil profile admin
      const { data: userProfile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (error || !userProfile || userProfile.role !== 'admin') {
        router.replace('/login');
        return;
      }

      setProfile(userProfile);
      setLoading(false);
    };

    checkAdmin();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace('/login');
  };

  if (loading) {
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
        <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Memuat Panel Admin...</p>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  const menuItems = [
    { name: 'Dashboard', path: '/admin', icon: LayoutDashboard },
    { name: 'Kelola Kelas', path: '/admin/classes', icon: School },
    { name: 'Kelola Wali Kelas', path: '/admin/users', icon: Users },
    { name: 'Review Kelas', path: '/admin/review', icon: Monitor },
  ];

  return (
    <div className={styles.layoutContainer}>
      {/* Sidebar */}
      <aside className={styles.sidebar}>
        <div className={styles.logoArea}>
          <img src="/logo.png" alt="Logo Sekolah" className={styles.logo} />
          <div>
            <h2 className={styles.logoTitle}>SI-MaLas</h2>
            <p className={styles.logoSub}>PANEL ADMIN</p>
          </div>
        </div>

        <nav className={styles.menu}>
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.path;
            return (
              <Link
                key={item.path}
                href={item.path}
                className={`${styles.menuItem} ${isActive ? styles.menuItemActive : ''}`}
              >
                <Icon size={18} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className={styles.profileArea}>
          <div className={styles.profileInfo}>
            <div className={styles.avatar} style={{ display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'center' }}>
              <Shield size={20} style={{ color: 'var(--accent-primary)' }} />
            </div>
            <div className={styles.profileDetails}>
              <span className={styles.profileName}>{profile?.full_name}</span>
              <span className={styles.profileRole}>Administrator</span>
            </div>
          </div>
          <button onClick={handleLogout} className={styles.logoutBtn}>
            <LogOut size={16} />
            <span>Keluar Sesi</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className={styles.mainContent}>
        <header className={styles.header}>
          <h1 className={styles.headerTitle}>
            {pathname === '/admin' && 'Dashboard Utama'}
            {pathname === '/admin/classes' && 'Manajemen Kelas'}
            {pathname === '/admin/users' && 'Manajemen Wali Kelas'}
            {pathname === '/admin/review' && 'Review & Pemantauan Kelas'}
          </h1>
          <span className={styles.badge}>Mode IT Developer</span>
        </header>

        <div className={styles.contentBody}>
          {children}
        </div>
      </main>
    </div>
  );
}
