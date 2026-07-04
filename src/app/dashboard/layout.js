'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { 
  LayoutDashboard, User, Users, ClipboardCheck, Frown, BookOpen, 
  Award, Calendar, LayoutGrid, Sparkles, Image as ImageIcon, 
  MessageSquare, Home, LogOut 
} from 'lucide-react';
import styles from './layout.module.css';

export default function DashboardLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [profile, setProfile] = useState(null);
  const [className, setClassName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkTeacher = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace('/login');
        return;
      }

      // Ambil profile wali kelas
      const { data: userProfile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (error || !userProfile || userProfile.role !== 'teacher') {
        // Hapus sesi jika terdeteksi bukan wali kelas (atau admin nyasar)
        if (userProfile?.role === 'admin') {
          router.replace('/admin');
          return;
        }
        await supabase.auth.signOut();
        router.replace('/login');
        return;
      }

      setProfile(userProfile);

      // Ambil nama kelas jika diampu
      if (userProfile.class_id) {
        const { data: clsData } = await supabase
          .from('classes')
          .select('name')
          .eq('id', userProfile.class_id)
          .single();
        if (clsData) {
          setClassName(clsData.name);
        }
      }

      setLoading(false);
    };

    checkTeacher();
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
        <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Memuat Aplikasi SI-MaLas...</p>
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
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Edit Profil', path: '/dashboard/profile', icon: User },
    { name: 'Daftar Siswa', path: '/dashboard/students', icon: Users },
    { name: 'Catatan Kehadiran', path: '/dashboard/attendance', icon: ClipboardCheck },
    { name: 'Catatan Perilaku', path: '/dashboard/behavior', icon: Frown },
    { name: 'Proses Bimbingan', path: '/dashboard/guidance', icon: BookOpen },
    { name: 'Struktur Kelas', path: '/dashboard/structure', icon: Award },
    { name: 'Jadwal Pelajaran', path: '/dashboard/schedule', icon: Calendar },
    { name: 'Denah Duduk', path: '/dashboard/seating', icon: LayoutGrid },
    { name: 'Daftar Piket', path: '/dashboard/piket', icon: Sparkles },
    { name: 'Galeri Kelas', path: '/dashboard/gallery', icon: ImageIcon },
    { name: 'Wawancara', path: '/dashboard/interviews', icon: MessageSquare },
    { name: 'Kunjungan Rumah', path: '/dashboard/visits', icon: Home },
  ];

  return (
    <div className={styles.layoutContainer}>
      {/* Sidebar Navigasi */}
      <aside className={styles.sidebar}>
        <div className={styles.logoArea}>
          <img src="/logo.png" alt="Logo Sekolah" className={styles.logo} />
          <div>
            <h2 className={styles.logoTitle}>SI-MaLas</h2>
            <p className={styles.logoSub}>WALI KELAS</p>
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
                <Icon size={16} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className={styles.profileArea}>
          <div className={styles.profileInfo}>
            <img 
              src={profile?.avatar_url || 'https://via.placeholder.com/150'} 
              alt="Avatar Guru" 
              className={styles.avatar} 
            />
            <div className={styles.profileDetails}>
              <span className={styles.profileName}>{profile?.full_name}</span>
              <span className={styles.profileRole}>NIP/Wali Kelas</span>
            </div>
          </div>
          <button onClick={handleLogout} className={styles.logoutBtn}>
            <LogOut size={14} />
            <span>Keluar Sesi</span>
          </button>
        </div>
      </aside>

      {/* Konten Utama */}
      <main className={styles.mainContent}>
        <header className={styles.header}>
          <h1 className={styles.headerTitle}>
            {pathname === '/dashboard' && 'Ringkasan Kelas'}
            {pathname === '/dashboard/profile' && 'Pengaturan Profil'}
            {pathname === '/dashboard/students' && 'Manajemen Biodata Siswa'}
            {pathname === '/dashboard/attendance' && 'Presensi Kehadiran Siswa'}
            {pathname === '/dashboard/behavior' && 'Catatan Perilaku Siswa'}
            {pathname === '/dashboard/guidance' && 'Proses Bimbingan Konseling'}
            {pathname === '/dashboard/structure' && 'Susunan Struktur Kelas'}
            {pathname === '/dashboard/schedule' && 'Jadwal Pelajaran Kelas'}
            {pathname === '/dashboard/seating' && 'Denah Tempat Duduk'}
            {pathname === '/dashboard/piket' && 'Jadwal Piket Kebersihan'}
            {pathname === '/dashboard/gallery' && 'Galeri Aktivitas Kelas'}
            {pathname === '/dashboard/interviews' && 'Log Wawancara Siswa'}
            {pathname === '/dashboard/visits' && 'Log Home Visit (Kunjungan)'}
          </h1>
          {className ? (
            <span className={styles.classBadge}>Wali Kelas: {className}</span>
          ) : (
            <span className={styles.noClassBadge}>Belum Ada Kelas</span>
          )}
        </header>

        <div className={styles.contentBody}>
          {children}
        </div>
      </main>
    </div>
  );
}
