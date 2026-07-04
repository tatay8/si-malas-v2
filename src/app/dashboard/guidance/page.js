'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Plus, Trash2, ShieldCheck, AlertCircle, Edit3 } from 'lucide-react';

export default function StudentGuidance() {
  const [classId, setClassId] = useState(null);
  const [students, setStudents] = useState([]);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form states
  const [studentId, setStudentId] = useState('');
  const [issue, setIssue] = useState('');
  const [solution, setSolution] = useState('');
  const [status, setStatus] = useState('proses');

  // Edit states
  const [editingRecord, setEditingRecord] = useState(null);
  const [editSolution, setEditSolution] = useState('');
  const [editStatus, setEditStatus] = useState('proses');

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

        const { data: studentsData } = await supabase
          .from('students')
          .select('id, name')
          .eq('class_id', profile.class_id)
          .order('name');
        setStudents(studentsData || []);

        const studentIds = (studentsData || []).map(s => s.id);
        if (studentIds.length > 0) {
          const { data: recordsData } = await supabase
            .from('guidance_records')
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
    if (!studentId || !issue.trim()) return;

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const { error: insertErr } = await supabase
        .from('guidance_records')
        .insert([{
          student_id: studentId,
          issue: issue.trim(),
          solution: solution.trim() || null,
          status
        }]);

      if (insertErr) throw insertErr;

      setSuccess('Proses bimbingan berhasil disimpan.');
      setStudentId('');
      setIssue('');
      setSolution('');
      setStatus('proses');
      fetchData();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateRecord = async (e) => {
    e.preventDefault();
    if (!editingRecord) return;

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const { error: updateErr } = await supabase
        .from('guidance_records')
        .update({
          solution: editSolution.trim() || null,
          status: editStatus
        })
        .eq('id', editingRecord.id);

      if (updateErr) throw updateErr;

      setSuccess('Bimbingan diperbarui.');
      setEditingRecord(null);
      setEditSolution('');
      fetchData();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRecord = async (id) => {
    if (!confirm('Apakah Anda yakin ingin menghapus catatan bimbingan ini?')) return;

    setError('');
    setSuccess('');

    try {
      const { error: deleteErr } = await supabase
        .from('guidance_records')
        .delete()
        .eq('id', id);

      if (deleteErr) throw deleteErr;

      setSuccess('Catatan bimbingan berhasil dihapus.');
      fetchData();
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading && records.length === 0) {
    return <div style={{ color: 'var(--text-secondary)' }}>Memuat data bimbingan...</div>;
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

      {/* Edit Form Popup */}
      {editingRecord && (
        <div className="glass-panel" style={{ borderColor: 'var(--accent-secondary)' }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--accent-secondary)' }}>
            Ubah Proses Bimbingan: {editingRecord.students?.name}
          </h3>
          <p style={{ fontSize: '0.9rem', marginBottom: '0.75rem' }}><strong>Masalah:</strong> {editingRecord.issue}</p>
          <form onSubmit={handleUpdateRecord} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Solusi / Rekomendasi</label>
              <textarea
                rows="2"
                className="form-input"
                value={editSolution}
                onChange={(e) => setEditSolution(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Status</label>
              <select className="form-select" value={editStatus} onChange={(e) => setEditStatus(e.target.value)}>
                <option value="proses">Masih dalam Proses</option>
                <option value="selesai">Selesai (Sudah Teratasi)</option>
              </select>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                Simpan
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => setEditingRecord(null)}>
                Batal
              </button>
            </div>
          </form>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem' }}>
        
        {/* Form Tambah Bimbingan */}
        <div className="glass-panel" style={{ height: 'fit-content' }}>
          <h3 style={{ fontSize: '1.2rem', marginBottom: '1.25rem' }}>Log Proses Bimbingan</h3>
          <form onSubmit={handleAddRecord} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div className="form-group">
              <label className="form-label">Siswa Bermasalah</label>
              <select className="form-select" value={studentId} onChange={(e) => setStudentId(e.target.value)} required>
                <option value="">-- Pilih Siswa --</option>
                {students.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Masalah / Kasus</label>
              <textarea
                rows="3"
                className="form-input"
                style={{ resize: 'none' }}
                placeholder="Tuliskan kendala atau masalah siswa..."
                value={issue}
                onChange={(e) => setIssue(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Solusi Sementara / Hasil Konseling</label>
              <textarea
                rows="2"
                className="form-input"
                style={{ resize: 'none' }}
                placeholder="Solusi yang disepakati..."
                value={solution}
                onChange={(e) => setSolution(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Status Awal</label>
              <select className="form-select" value={status} onChange={(e) => setStatus(e.target.value)} required>
                <option value="proses">Proses Bimbingan</option>
                <option value="selesai">Selesai / Tuntas</option>
              </select>
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={saving || students.length === 0}>
              <Plus size={16} />
              <span>Simpan Bimbingan</span>
            </button>
          </form>
        </div>

        {/* Tabel Log Bimbingan */}
        <div className="glass-panel">
          <h3 style={{ fontSize: '1.2rem', marginBottom: '1.25rem' }}>Daftar Kasus & Solusi Bimbingan</h3>
          <div className="table-wrapper">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Nama Siswa</th>
                  <th>Masalah</th>
                  <th>Solusi</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {records.length === 0 ? (
                  <tr>
                    <td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Belum ada log bimbingan.</td>
                  </tr>
                ) : (
                  records.map((r) => (
                    <tr key={r.id}>
                      <td style={{ fontWeight: 700, color: '#fff' }}>{r.students?.name}</td>
                      <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{r.issue}</td>
                      <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{r.solution || '-'}</td>
                      <td>
                        <span className={`badge ${r.status === 'selesai' ? 'badge-success' : 'badge-warning'}`}>
                          {r.status}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right', display: 'flex', gap: '0.25rem', justifyContent: 'flex-end' }}>
                        <button
                          onClick={() => {
                            setEditingRecord(r);
                            setEditSolution(r.solution || '');
                            setEditStatus(r.status);
                          }}
                          className="btn btn-secondary"
                          style={{ padding: '0.4rem', borderRadius: 'var(--radius-sm)' }}
                        >
                          <Edit3 size={14} />
                        </button>
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
