'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Plus, Trash2, ShieldCheck, AlertCircle, MessageSquare } from 'lucide-react';

export default function StudentInterviews() {
  const [classId, setClassId] = useState(null);
  const [students, setStudents] = useState([]);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form states
  const [studentId, setStudentId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [topic, setTopic] = useState('');
  const [notes, setNotes] = useState('');

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
            .from('interviews')
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
    if (!studentId || !topic.trim() || !notes.trim()) return;

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const { error: insertErr } = await supabase
        .from('interviews')
        .insert([{
          student_id: studentId,
          date,
          topic: topic.trim(),
          notes: notes.trim()
        }]);

      if (insertErr) throw insertErr;

      setSuccess('Log wawancara berhasil disimpan.');
      setStudentId('');
      setTopic('');
      setNotes('');
      setDate(new Date().toISOString().split('T')[0]);
      fetchData();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRecord = async (id) => {
    if (!confirm('Apakah Anda yakin ingin menghapus log wawancara ini?')) return;

    setError('');
    setSuccess('');

    try {
      const { error: deleteErr } = await supabase
        .from('interviews')
        .delete()
        .eq('id', id);

      if (deleteErr) throw deleteErr;

      setSuccess('Log wawancara berhasil dihapus.');
      fetchData();
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading && records.length === 0) {
    return <div style={{ color: 'var(--text-secondary)' }}>Memuat log wawancara...</div>;
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
        
        {/* Form Input Wawancara */}
        <div className="glass-panel" style={{ height: 'fit-content' }}>
          <h3 style={{ fontSize: '1.2rem', marginBottom: '1.25rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <MessageSquare size={18} />
            <span>Catat Wawancara Siswa</span>
          </h3>
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
              <label className="form-label">Tanggal Wawancara</label>
              <input
                type="date"
                className="form-input"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Topik Wawancara</label>
              <input
                type="text"
                placeholder="Contoh: Motivasi Belajar, Kondisi Keluarga..."
                className="form-input"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Hasil / Catatan Wawancara</label>
              <textarea
                rows="4"
                className="form-input"
                style={{ resize: 'none' }}
                placeholder="Tuliskan hasil percakapan dengan siswa..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={saving || students.length === 0}>
              <Plus size={16} />
              <span>Simpan Catatan</span>
            </button>
          </form>
        </div>

        {/* Tabel Log Wawancara */}
        <div className="glass-panel">
          <h3 style={{ fontSize: '1.2rem', marginBottom: '1.25rem' }}>Log Wawancara Berkala</h3>
          <div className="table-wrapper">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Tanggal</th>
                  <th>Nama Siswa</th>
                  <th>Topik</th>
                  <th>Catatan Hasil</th>
                  <th style={{ textAlign: 'right' }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {records.length === 0 ? (
                  <tr>
                    <td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Belum ada log wawancara.</td>
                  </tr>
                ) : (
                  records.map((r) => (
                    <tr key={r.id}>
                      <td style={{ fontSize: '0.8rem' }}>{r.date}</td>
                      <td style={{ fontWeight: 700, color: '#fff' }}>{r.students?.name}</td>
                      <td style={{ fontWeight: 600 }}>{r.topic}</td>
                      <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{r.notes}</td>
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
