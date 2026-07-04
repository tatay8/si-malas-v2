'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Plus, Trash2, ShieldCheck, AlertCircle, Home, Upload } from 'lucide-react';

export default function HomeVisits() {
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
  const [purpose, setPurpose] = useState('');
  const [incidents, setIncidents] = useState('');
  
  // File upload state for documentation
  const [docFile, setDocFile] = useState(null);
  const [docPreview, setDocPreview] = useState('');

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
            .from('home_visits')
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

  const handleDocChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setDocFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setDocPreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleAddRecord = async (e) => {
    e.preventDefault();
    if (!studentId || !purpose.trim() || !incidents.trim()) return;

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      let finalDocUrl = '';

      // Upload file jika ada
      if (docFile) {
        const fileExt = docFile.name.split('.').pop();
        const fileName = `${classId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
        const filePath = `visit/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('home-visits')
          .upload(filePath, docFile, { cacheControl: '3600', upsert: true });

        if (uploadError) {
          throw new Error('Gagal mengunggah foto dokumentasi. Pastikan bucket "home-visits" di Supabase Anda dikonfigurasi sebagai public.');
        }

        const { data: { publicUrl } } = supabase.storage
          .from('home-visits')
          .getPublicUrl(filePath);

        finalDocUrl = publicUrl;
      }

      const { error: insertErr } = await supabase
        .from('home_visits')
        .insert([{
          student_id: studentId,
          date,
          purpose: purpose.trim(),
          incidents: incidents.trim(),
          documentation_url: finalDocUrl || null
        }]);

      if (insertErr) throw insertErr;

      setSuccess('Log home visit berhasil disimpan.');
      setStudentId('');
      setPurpose('');
      setIncidents('');
      setDocFile(null);
      setDocPreview('');
      setDate(new Date().toISOString().split('T')[0]);
      fetchData();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRecord = async (id) => {
    if (!confirm('Apakah Anda yakin ingin menghapus log home visit ini?')) return;

    setError('');
    setSuccess('');

    try {
      const { error: deleteErr } = await supabase
        .from('home_visits')
        .delete()
        .eq('id', id);

      if (deleteErr) throw deleteErr;

      setSuccess('Log home visit berhasil dihapus.');
      fetchData();
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading && records.length === 0) {
    return <div style={{ color: 'var(--text-secondary)' }}>Memuat log home visit...</div>;
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
        
        {/* Form Input Home Visit */}
        <div className="glass-panel" style={{ height: 'fit-content' }}>
          <h3 style={{ fontSize: '1.2rem', marginBottom: '1.25rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <Home size={18} />
            <span>Input Home Visit</span>
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
              <label className="form-label">Tanggal Kunjungan</label>
              <input
                type="date"
                className="form-input"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Tujuan Kunjungan</label>
              <input
                type="text"
                placeholder="Contoh: Klarifikasi ketidakhadiran, Anak sakit berat..."
                className="form-input"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Catatan Kejadian & Hasil</label>
              <textarea
                rows="3"
                className="form-input"
                style={{ resize: 'none' }}
                placeholder="Tuliskan catatan kejadian saat berada di rumah siswa..."
                value={incidents}
                onChange={(e) => setIncidents(e.target.value)}
                required
              />
            </div>

            {/* Unggah Dokumentasi */}
            <div className="form-group">
              <label className="form-label">Foto Dokumentasi (Opsional)</label>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <div style={{ width: '80px', height: '60px', background: '#0a0f1d', border: '1px dashed var(--glass-border)', borderRadius: 'var(--radius-sm)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {docPreview ? (
                    <img src={docPreview} alt="Doc Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>Belum ada</span>
                  )}
                </div>
                <label className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', cursor: 'pointer' }}>
                  <Upload size={12} />
                  <span>Pilih Foto</span>
                  <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleDocChange} />
                </label>
              </div>
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={saving || students.length === 0}>
              <Plus size={16} />
              <span>Simpan Catatan</span>
            </button>
          </form>
        </div>

        {/* Tabel Log Home Visit */}
        <div className="glass-panel">
          <h3 style={{ fontSize: '1.2rem', marginBottom: '1.25rem' }}>Log Kunjungan Rumah</h3>
          <div className="table-wrapper">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Tanggal</th>
                  <th>Nama Siswa</th>
                  <th>Tujuan</th>
                  <th>Catatan Kejadian</th>
                  <th>Dokumentasi</th>
                  <th style={{ textAlign: 'right' }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {records.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Belum ada log home visit.</td>
                  </tr>
                ) : (
                  records.map((r) => (
                    <tr key={r.id}>
                      <td style={{ fontSize: '0.8rem' }}>{r.date}</td>
                      <td style={{ fontWeight: 700, color: '#fff' }}>{r.students?.name}</td>
                      <td style={{ fontWeight: 600 }}>{r.purpose}</td>
                      <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{r.incidents}</td>
                      <td>
                        {r.documentation_url ? (
                          <a href={r.documentation_url} target="_blank" rel="noreferrer" style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--accent-secondary)' }}>
                            Lihat Foto
                          </a>
                        ) : (
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Tidak ada</span>
                        )}
                      </td>
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
