'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Plus, Trash2, ShieldCheck, AlertCircle } from 'lucide-react';

export default function ManageClasses() {
  const [classes, setClasses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [newClassName, setNewClassName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      // Ambil semua kelas
      const { data: classesData, error: classesErr } = await supabase
        .from('classes')
        .select('*')
        .order('name');
      if (classesErr) throw classesErr;

      // Ambil semua guru/wali kelas
      const { data: teachersData, error: teachersErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'teacher')
        .order('full_name');
      if (teachersErr) throw teachersErr;

      setClasses(classesData || []);
      setTeachers(teachersData || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddClass = async (e) => {
    e.preventDefault();
    if (!newClassName.trim()) return;

    setError('');
    setSuccess('');

    try {
      const { error: insertErr } = await supabase
        .from('classes')
        .insert([{ name: newClassName.trim().toUpperCase() }]);

      if (insertErr) throw insertErr;

      setNewClassName('');
      setSuccess(`Kelas ${newClassName.trim().toUpperCase()} berhasil ditambahkan.`);
      fetchData();
    } catch (err) {
      setError(err.message.includes('duplicate key') ? 'Nama kelas sudah terdaftar.' : err.message);
    }
  };

  const handleDeleteClass = async (classId, className) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus kelas ${className}? Semua data siswa di dalamnya juga akan terhapus!`)) return;

    setError('');
    setSuccess('');

    try {
      const { error: deleteErr } = await supabase
        .from('classes')
        .delete()
        .eq('id', classId);

      if (deleteErr) throw deleteErr;

      setSuccess(`Kelas ${className} berhasil dihapus.`);
      fetchData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleAssignTeacher = async (classId, teacherId) => {
    setError('');
    setSuccess('');

    try {
      // 1. Reset class_id dari guru yang saat ini memegang kelas ini
      const { error: resetErr } = await supabase
        .from('profiles')
        .update({ class_id: null })
        .eq('class_id', classId);

      if (resetErr) throw resetErr;

      // 2. Jika ada guru baru yang dipilih, set class_id guru tersebut ke kelas ini
      if (teacherId && teacherId !== 'none') {
        // Cek jika guru tersebut sudah memegang kelas lain, reset dulu kelas lamanya
        const { error: assignErr } = await supabase
          .from('profiles')
          .update({ class_id: classId })
          .eq('id', teacherId);

        if (assignErr) throw assignErr;
      }

      setSuccess('Pemetaan wali kelas berhasil diperbarui.');
      fetchData();
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading && classes.length === 0) {
    return <div style={{ color: 'var(--text-secondary)' }}>Memuat data kelas...</div>;
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

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem' }}>
        
        {/* Form Tambah Kelas */}
        <div className="glass-panel" style={{ height: 'fit-content' }}>
          <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>Tambah Kelas Baru</h3>
          <form onSubmit={handleAddClass} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div className="form-group">
              <label className="form-label">Nama Kelas</label>
              <input
                type="text"
                placeholder="CONTOH: VII-A, VIII-C"
                className="form-input"
                value={newClassName}
                onChange={(e) => setNewClassName(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
              <Plus size={16} />
              <span>Simpan Kelas</span>
            </button>
          </form>
        </div>

        {/* Tabel Data Kelas */}
        <div className="glass-panel">
          <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>Daftar Kelas & Wali Kelas</h3>
          
          <div className="table-wrapper">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Nama Kelas</th>
                  <th>Wali Kelas</th>
                  <th style={{ textAlign: 'right' }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {classes.length === 0 ? (
                  <tr>
                    <td colSpan="3" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Belum ada kelas terdaftar.</td>
                  </tr>
                ) : (
                  classes.map((cls) => {
                    // Cari guru yang sedang memegang kelas ini
                    const assignedTeacher = teachers.find((t) => t.class_id === cls.id);

                    return (
                      <tr key={cls.id}>
                        <td style={{ fontWeight: 700, color: '#ffffff' }}>{cls.name}</td>
                        <td>
                          <select
                            className="form-select"
                            style={{ padding: '0.4rem 2rem 0.4rem 0.75rem', fontSize: '0.85rem', width: '200px' }}
                            value={assignedTeacher ? assignedTeacher.id : 'none'}
                            onChange={(e) => handleAssignTeacher(cls.id, e.target.value)}
                          >
                            <option value="none">-- Pilih Wali Kelas --</option>
                            {teachers.map((t) => {
                              // Tampilkan status jika guru ini sudah mengajar kelas lain
                              const isTeachingAnother = t.class_id && t.class_id !== cls.id;
                              const classInfo = isTeachingAnother 
                                ? ` (Mengajar ${classes.find(c => c.id === t.class_id)?.name || ''})`
                                : '';
                              return (
                                <option key={t.id} value={t.id}>
                                  {t.full_name}{classInfo}
                                </option>
                              );
                            })}
                          </select>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            onClick={() => handleDeleteClass(cls.id, cls.name)}
                            className="btn btn-danger"
                            style={{ padding: '0.4rem', borderRadius: 'var(--radius-sm)' }}
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
