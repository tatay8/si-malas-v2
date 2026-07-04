'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { User, Lock, AlertTriangle } from 'lucide-react';
import styles from './page.module.css';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Jika sudah login, redirect langsung
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single();
        
        if (profile) {
          if (profile.role === 'admin') {
            router.replace('/admin');
          } else {
            router.replace('/dashboard');
          }
        }
      }
    };
    checkSession();
  }, [router]);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError('Username dan password harus diisi.');
      return;
    }

    setLoading(true);
    setError('');

    // Gunakan username sebagai format email di balik layar
    const email = `${username.trim().toLowerCase()}@simalas.local`;

    try {
      const { data, error: loginError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (loginError) {
        // Cek jika ini pendaftaran admin pertama kali
        // Jika admin belum ada, izinkan pendaftaran langsung
        if (username.trim().toLowerCase() === 'admin' && loginError.message.includes('Invalid login credentials')) {
          const { data: checkProfiles } = await supabase.from('profiles').select('id').limit(1);
          if (!checkProfiles || checkProfiles.length === 0) {
            // Belum ada user sama sekali di database. Daftarkan username 'admin' sebagai admin pertama
            const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
              email,
              password,
              options: {
                data: {
                  username: 'admin',
                  full_name: 'Administrator IT',
                  role: 'admin'
                }
              }
            });

            if (signUpError) {
              throw new Error(signUpError.message);
            }

            // Berhasil mendaftar admin baru secara otomatis, login kembali
            const { error: reloginError } = await supabase.auth.signInWithPassword({
              email,
              password
            });
            if (reloginError) throw new Error(reloginError.message);

            router.replace('/admin');
            return;
          }
        }
        throw new Error('Username atau password salah.');
      }

      // Login berhasil, cek role
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .single();

      if (profileError || !profile) {
        // Jika profil tidak ditemukan, keluarkan sesi
        await supabase.auth.signOut();
        throw new Error('Profil pengguna tidak ditemukan.');
      }

      // Arahkan ke dashboard yang sesuai
      if (profile.role === 'admin') {
        router.replace('/admin');
      } else {
        router.replace('/dashboard');
      }
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.loginCard}>
        <div className={styles.logoWrapper}>
          {/* Menggunakan image lokal logo sekolah */}
          <img src="/logo.png" alt="Logo SMP Negeri 4 Rancah" className={styles.logo} />
        </div>
        <h1 className={styles.title}>SI-MaLas</h1>
        <p className={styles.subtitle}>Sistem Informasi Manajemen Kelas</p>

        {error && (
          <div className={styles.errorAlert}>
            <AlertTriangle size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className={styles.form}>
          <div className={styles.inputWrapper}>
            <User className={styles.inputIcon} />
            <input
              type="text"
              placeholder="Username"
              className={styles.input}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={loading}
              autoComplete="username"
            />
          </div>

          <div className={styles.inputWrapper}>
            <Lock className={styles.inputIcon} />
            <input
              type="password"
              placeholder="Password"
              className={styles.input}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              autoComplete="current-password"
            />
          </div>

          <button type="submit" className={styles.submitBtn} disabled={loading}>
            {loading ? (
              <>
                <div className={styles.loadingSpinner}></div>
                <span>Memproses...</span>
              </>
            ) : (
              <span>Masuk Aplikasi</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
