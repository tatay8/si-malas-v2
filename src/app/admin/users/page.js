'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Plus, Key, Trash2, ShieldCheck, AlertCircle, RefreshCw } from 'lucide-react';

export default function ManageWaliKelas() {
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form states untuk pembuatan akun baru
  const [newUsername, setNewUsername] = useState('');
  const [newFullName, setNewFullName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [creating, setCreating] = useState(false);

  // Form states untuk reset password
  const [resettingUser, setResettingUser] = useState(null);
  const [resetPasswordVal, setResetPasswordVal] = useState('');
  const [resetting, setResetting] = useState(false);

  const fetchTeachers = async () => {
    setLoading(true);
    try {
      const { data, error: err } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'teacher')
        .order('full_name');
      if (err) throw err;
      setTeachers(data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeachers();
  }, []);

  const handleCreateTeacher = async (e) => {
    e.preventDefault();
    if (!newUsername.trim() || !newFullName.trim() || !newPassword) return;

    setError('');
    setSuccess('');
    setCreating(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Sesi Anda telah kedaluwarsa. Silakan login kembali.');

      // Panggil serverless API endpoint kita
      const response = await fetch('/api/admin/create-teacher', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          username: newUsername.trim(),
          fullName: newFullName.trim(),
          password: newPassword
        })
      });

      const resData = await response.json();
      if (!response.ok) throw new Error(resData.error || 'Gagal membuat akun.');

      setSuccess(`Akun wali kelas ${newFullName} (${newUsername}) berhasil dibuat.`);
      setNewUsername('');
      setNewFullName('');
      setNewPassword('');
      fetchTeachers();
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!resettingUser || !resetPasswordVal) return;

    setError('');
    setSuccess('');
    setResetting(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Sesi Anda telah kedaluwarsa. Silakan login kembali.');

      const response = await fetch('/api/admin/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          userId: resettingUser.id,
          newPassword: resetPasswordVal
        })
      });

      const resData = await response.json();
      if (!response.ok) throw new Error(resData.error || 'Gagal mereset sandi.');

      setSuccess(`Kata sandi akun ${resettingUser.full_name} berhasil disetel ulang.`);
      setResettingUser(null);
      setResetPasswordVal('');
    } catch (err) {
      setError(err.message);
    } finally {
      setResetting(false);
    }
  };

  const handleDeleteTeacher = async (teacherId, fullName) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus wali kelas ${fullName}? Akun ini akan didelete permanen dari sistem auth.`)) return;

    setError('');
    setSuccess('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Sesi Anda telah kedaluwarsa. Silakan login kembali.');

      const response = await fetch('/api/admin/delete-teacher', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          userId: teacherId
        })
      });

      const resData = await response.json();
      if (!response.ok) throw new Error(resData.error || 'Gagal menghapus akun.');

      setSuccess(`Akun wali kelas ${fullName} berhasil dihapus.`);
      fetchTeachers();
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading && teachers.length === 0) {
    return <div style={{ color: 'var(--text-secondary)' }}>Memuat data wali kelas...</div>;
  }

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Alert Status */}
      {error && (
        <div className="glass-panel" style={{ background: 'var(--danger-bg)', borderColor: 'rgba(239, 68, 68, 0.3)', color: '#fca5a5', padding: '1rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="glass-panel" style={{ background: 'var(--success-bg)', borderColor: 'rgba(16, 185, 129, 0.3)', color: '#a7f3d0', padding: '1rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <ShieldCheck size={18} />
          <span>{success}</span>
        </div>
      )}

      {/* Modal / Inline form untuk Reset Password */}
      {resettingUser && (
        <div className="glass-panel" style={{ borderColor: 'var(--warning)', background: 'rgba(245, 158, 11, 0.05)' }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--warning)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Key size={18} />
            <span>Reset Kata Sandi: {resettingUser.full_name} ({resettingUser.username})</span>
          </h3>
          <form onSubmit={handleResetPassword} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div className="form-group" style={{ flexGrow: 1, margin: 0 }}>
              <label className="form-label">Password Baru</label>
              <input
                type="password"
                placeholder="Masukkan kata sandi baru"
                className="form-input"
                value={resetPasswordVal}
                onChange={(e) => setResetPasswordVal(e.target.value)}
                required
                minLength={6}
              />
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button type="submit" className="btn btn-primary" style={{ background: 'var(--warning)', color: '#000', boxShadow: 'none' }} disabled={resetting}>
                {resetting ? 'Menyimpan...' : 'Reset Password'}
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => { setResettingUser(null); setResetPasswordVal(''); }}>
                Batal
              </button>
            </div>
          </form>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem' }}>
        
        {/* Form Tambah Wali Kelas */}
        <div className="glass-panel" style={{ height: 'fit-content' }}>
          <h3 style={{ fontSize: '1.2rem', marginBottom: '1.25rem' }}>Buat Akun Wali Kelas</h3>
          <form onSubmit={handleCreateTeacher} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div className="form-group">
              <label className="form-label">Nama Lengkap Guru</label>
              <input
                type="text"
                placeholder="CONTOH: Budi Santoso, S.Pd."
                className="form-input"
                value={newFullName}
                onChange={(e) => setNewFullName(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Username Login</label>
              <input
                type="text"
                placeholder="CONTOH: budisantoso (tanpa spasi)"
                className="form-input"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value.toLowerCase().replace(/\s+/g, ''))}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Password Awal</label>
              <input
                type="password"
                placeholder="Minimal 6 karakter"
                className="form-input"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={creating}>
              {creating ? (
                <>
                  <RefreshCw size={16} className="pulse-glow" style={{ animation: 'spin 1s infinite linear' }} />
                  <span>Membuat Akun...</span>
                </>
              ) : (
                <>
                  <Plus size={16} />
                  <span>Simpan Wali Kelas</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Tabel Wali Kelas */}
        <div className="glass-panel">
          <h3 style={{ fontSize: '1.2rem', marginBottom: '1.25rem' }}>Daftar Wali Kelas</h3>
          <div className="table-wrapper">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Nama Lengkap</th>
                  <th>Username</th>
                  <th style={{ textAlign: 'right' }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {teachers.length === 0 ? (
                  <tr>
                    <td colSpan="3" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Belum ada akun wali kelas terdaftar.</td>
                  </tr>
                ) : (
                  teachers.map((t) => (
                    <tr key={t.id}>
                      <td style={{ fontWeight: 700, color: '#ffffff' }}>{t.full_name}</td>
                      <td><code>{t.username}</code></td>
                      <td style={{ textAlign: 'right', display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                        <button
                          onClick={() => setResettingUser(t)}
                          className="btn btn-secondary"
                          style={{ padding: '0.4rem', border: '1px solid rgba(245, 158, 11, 0.3)', color: 'var(--warning)', borderRadius: 'var(--radius-sm)' }}
                          title="Reset Password"
                        >
                          <Key size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteTeacher(t.id, t.full_name)}
                          className="btn btn-danger"
                          style={{ padding: '0.4rem', borderRadius: 'var(--radius-sm)' }}
                          title="Hapus Akun"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
