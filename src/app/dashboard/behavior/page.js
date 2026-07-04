'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Plus, Trash2, ShieldCheck, AlertCircle } from 'lucide-react';

export default function StudentBehavior() {
  const [classId, setClassId] = useState(null);
  const [students, setStudents] = useState([]);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form states
  const [studentId, setStudentId] = useState('');
  const [type, setType] = useState('negatif');
  const [description, setDescription] = useState('');
  const [followUp, setFollowUp] = useState('');

  const fetchData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('class_id')
        .eq('id', session.user.id)
        .single();

      if (profile && profile.class_id) {
        setClassId(profile.class_id);

        // Ambil data siswa untuk dropdown
        const { data: studentsData } = await supabase
          .from('students')
          .select('id, name')
          .eq('class_id', profile.class_id)
          .order('name');
        setStudents(studentsData || []);

        const studentIds = (studentsData || []).map(s => s.id);
        if (studentIds.length > 0) {
          // Ambil catatan perilaku siswa kelas ini
          const { data: recordsData } = await supabase
            .from('behavior_records')
            .select('*, students(name)')
            .in('student_id', studentIds)
            .order('date', { ascending: false });
          setRecords(recordsData || []);
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddRecord = async (e) => {
    e.preventDefault();
    if (!studentId || !description.trim()) return;

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const { error: insertErr } = await supabase
        .from('behavior_records')
        .insert([{
          student_id: studentId,
          type,
          description: description.trim(),
          follow_up: followUp.trim() || null
        }]);

      if (insertErr) throw insertErr;

      setSuccess('Catatan perilaku berhasil ditambahkan.');
      setStudentId('');
      setDescription('');
      setFollowUp('');
      fetchData();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRecord = async (id) => {
    if (!confirm('Apakah Anda yakin ingin menghapus catatan perilaku ini?')) return;

    setError('');
    setSuccess('');

    try {
      const { error: deleteErr } = await supabase
        .from('behavior_records')
        .delete()
        .eq('id', id);

      if (deleteErr) throw deleteErr;

      setSuccess('Catatan perilaku berhasil dihapus.');
      fetchData();
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading && records.length === 0) {
    return <div style={{ color: 'var(--text-secondary)' }}>Memuat data perilaku...</div>;
  }

  if (!classId) {
    return <div className="glass-panel" style={{ color: 'var(--warning)', textAlign: 'center' }}>Anda belum diploting kelas. Silakan hubungi Admin.</div>;
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
        
        {/* Form Tambah Log Perilaku */}
        <div className="glass-panel" style={{ height: 'fit-content' }}>
          <h3 style={{ fontSize: '1.2rem', marginBottom: '1.25rem' }}>Input Perilaku Siswa</h3>
          <form onSubmit={handleAddRecord} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div className="form-group">
              <label className="form-label">Siswa</label>
              <select className="form-select" value={studentId} onChange={(e) => setStudentId(e.target.value)} required>
                <option value="">-- Pilih Siswa --</option>
                {students.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Tipe Perilaku</label>
              <select className="form-select" value={type} onChange={(e) => setType(e.target.value)} required>
                <option value="negatif">Negatif (Pelanggaran / Indisipliner)</option>
                <option value="positif">Positif (Prestasi / Budi Pekerti)</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Deskripsi Kejadian</label>
              <textarea
                rows="3"
                className="form-input"
                style={{ resize: 'none' }}
                placeholder="Tuliskan kejadian secara detail..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Tindak Lanjut (Follow Up)</label>
              <input
                type="text"
                className="form-input"
                placeholder="Contoh: Diberi teguran, Panggilan orang tua, dll"
                value={followUp}
                onChange={(e) => setFollowUp(e.target.value)}
              />
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={saving || students.length === 0}>
              <Plus size={16} />
              <span>Simpan Catatan</span>
            </button>
          </form>
        </div>

        {/* Tabel Log Catatan Perilaku */}
        <div className="glass-panel">
          <h3 style={{ fontSize: '1.2rem', marginBottom: '1.25rem' }}>Log Perilaku Siswa</h3>
          <div className="table-wrapper">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Tanggal</th>
                  <th>Nama Siswa</th>
                  <th>Tipe</th>
                  <th>Kejadian</th>
                  <th>Tindak Lanjut</th>
                  <th style={{ textAlign: 'right' }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {records.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Belum ada log perilaku dicatat.</td>
                  </tr>
                ) : (
                  records.map((r) => (
                    <tr key={r.id}>
                      <td style={{ fontSize: '0.8rem' }}>{r.date}</td>
                      <td style={{ fontWeight: 700, color: '#fff' }}>{r.students?.name}</td>
                      <td>
                        <span className={`badge ${r.type === 'positif' ? 'badge-success' : 'badge-danger'}`}>
                          {r.type}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{r.description}</td>
                      <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{r.follow_up || '-'}</td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          onClick={() => handleDeleteRecord(r.id)}
                          className="btn btn-danger"
                          style={{ padding: '0.4rem', borderRadius: 'var(--radius-sm)' }}
                        >
                          <Trash2 size={14} />
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
