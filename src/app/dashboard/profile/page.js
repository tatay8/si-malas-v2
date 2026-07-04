'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { ShieldCheck, AlertCircle, RefreshCw, Upload } from 'lucide-react';

export default function EditProfile() {
  const [user, setUser] = useState(null);
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const fetchUserProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      setUser(session.user);

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();
      
      if (profile) {
        setFullName(profile.full_name || '');
        setUsername(profile.username || '');
        setAvatarUrl(profile.avatar_url || '');
      }
      setLoading(false);
    };

    fetchUserProfile();
  }, []);

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError('');
    setSuccess('');
    setUpdating(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `avatar/${fileName}`;

      // Upload file ke bucket 'avatars'
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { cacheControl: '3600', upsert: true });

      if (uploadError) {
        throw new Error('Gagal mengunggah foto. Pastikan bucket "avatars" di Supabase Anda sudah dikonfigurasi sebagai public.');
      }

      // Ambil Public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      setAvatarUrl(publicUrl);

      // Simpan URL ke profile di database
      const { error: dbError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);

      if (dbError) throw dbError;

      setSuccess('Foto profil berhasil diperbarui.');
    } catch (err) {
      setError(err.message);
    } finally {
      setUpdating(false);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    if (!fullName.trim() || !username.trim()) {
      setError('Nama lengkap dan username wajib diisi.');
      return;
    }

    setError('');
    setSuccess('');
    setUpdating(true);

    try {
      // 1. Update Tabel Profiles di Database
      const { error: dbError } = await supabase
        .from('profiles')
        .update({
          full_name: fullName.trim(),
          username: username.trim().toLowerCase()
        })
        .eq('id', user.id);

      if (dbError) {
        if (dbError.message.includes('unique constraint')) {
          throw new Error('Username sudah digunakan oleh pengguna lain.');
        }
        throw dbError;
      }

      // 2. Update Password jika diisi
      if (newPassword) {
        if (newPassword.length < 6) {
          throw new Error('Kata sandi baru minimal harus 6 karakter.');
        }

        const { error: passwordError } = await supabase.auth.updateUser({
          password: newPassword
        });

        if (passwordError) throw passwordError;
        setNewPassword('');
      }

      setSuccess('Profil dan informasi akun Anda berhasil diperbarui.');
    } catch (err) {
      setError(err.message);
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return <div style={{ color: 'var(--text-secondary)' }}>Memuat data profil...</div>;
  }

  return (
    <div className="animate-fade-in" style={{ maxWidth: '600px', margin: '0 auto' }}>
      
      {/* Alert Status */}
      {error && (
        <div className="glass-panel" style={{ background: 'var(--danger-bg)', borderColor: 'rgba(239, 68, 68, 0.3)', color: '#fca5a5', padding: '1rem', display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '1.5rem' }}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="glass-panel" style={{ background: 'var(--success-bg)', borderColor: 'rgba(16, 185, 129, 0.3)', color: '#a7f3d0', padding: '1rem', display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '1.5rem' }}>
          <ShieldCheck size={18} />
          <span>{success}</span>
        </div>
      )}

      <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        
        {/* Upload Foto Profil */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '1.5rem' }}>
          <div style={{ position: 'relative' }}>
            <img
              src={avatarUrl || 'https://via.placeholder.com/150'}
              alt="Avatar profil"
              style={{ width: '120px', height: '120px', borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--accent-primary)' }}
            />
            <label
              htmlFor="avatar-upload"
              style={{
                position: 'absolute',
                bottom: '0',
                right: '0',
                background: 'var(--accent-primary)',
                color: '#fff',
                padding: '0.5rem',
                borderRadius: '50%',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: 'var(--shadow-sm)'
              }}
              title="Unggah Foto Profil"
            >
              <Upload size={16} />
              <input
                id="avatar-upload"
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleAvatarUpload}
                disabled={updating}
              />
            </label>
          </div>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Tekan ikon kamera untuk mengubah foto profil (max 2MB)</span>
        </div>

        {/* Form Edit Data & Sandi */}
        <form onSubmit={handleUpdateProfile} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="form-group">
            <label className="form-label">Nama Lengkap</label>
            <input
              type="text"
              className="form-input"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Username Login</label>
            <input
              type="text"
              className="form-input"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s+/g, ''))}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Ganti Kata Sandi (Kosongkan jika tidak diubah)</label>
            <input
              type="password"
              placeholder="Minimal 6 karakter"
              className="form-input"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              minLength={6}
            />
          </div>

          <button type="submit" className="btn btn-primary" style={{ marginTop: '1rem' }} disabled={updating}>
            {updating ? (
              <>
                <RefreshCw size={16} className="pulse-glow" style={{ animation: 'spin 1s infinite linear' }} />
                <span>Menyimpan Perubahan...</span>
              </>
            ) : (
              <span>Simpan Profil</span>
            )}
          </button>
        </form>

      </div>
    </div>
  );
}
