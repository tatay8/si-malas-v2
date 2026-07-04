'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Plus, Trash2, ShieldCheck, AlertCircle, Calendar } from 'lucide-react';

export default function ClassSchedule() {
  const [classId, setClassId] = useState(null);
  const [schedules, setSchedules] = useState([]);
  const [selectedDay, setSelectedDay] = useState('Senin');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form states
  const [subject, setSubject] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');

  const fetchSchedule = async () => {
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

        const { data, error: fetchErr } = await supabase
          .from('schedules')
          .select('*')
          .eq('class_id', profile.class_id)
          .order('start_time');

        if (fetchErr) throw fetchErr;
        setSchedules(data || []);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedule();
  }, []);

  const handleAddSchedule = async (e) => {
    e.preventDefault();
    if (!subject.trim() || !startTime || !endTime) return;

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const { error: insertErr } = await supabase
        .from('schedules')
        .insert([{
          class_id: classId,
          day: selectedDay,
          subject: subject.trim(),
          start_time: startTime,
          end_time: endTime
        }]);

      if (insertErr) throw insertErr;

      setSuccess(`Jadwal Pelajaran ${subject} berhasil ditambahkan.`);
      setSubject('');
      setStartTime('');
      setEndTime('');
      fetchSchedule();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSchedule = async (id, name) => {
    if (!confirm(`Hapus jadwal pelajaran ${name}?`)) return;

    setError('');
    setSuccess('');

    try {
      const { error: deleteErr } = await supabase
        .from('schedules')
        .delete()
        .eq('id', id);

      if (deleteErr) throw deleteErr;

      setSuccess(`Jadwal pelajaran berhasil dihapus.`);
      fetchSchedule();
    } catch (err) {
      setError(err.message);
    }
  };

  const days = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const filteredSchedules = schedules.filter(s => s.day === selectedDay);

  if (loading && schedules.length === 0) {
    return <div style={{ color: 'var(--text-secondary)' }}>Memuat jadwal...</div>;
  }

  if (!classId) {
    return <div className="glass-panel" style={{ color: 'var(--warning)', textAlign: 'center' }}>Anda belum diploting kelas. Silakan hubungi Admin.</div>;
  }

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
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

      {/* Selector Hari */}
      <div style={{
        display: 'flex',
        gap: '0.5rem',
        borderBottom: '1px solid var(--glass-border)',
        paddingBottom: '0.5rem',
        overflowX: 'auto'
      }}>
        {days.map(d => (
          <button
            key={d}
            onClick={() => setSelectedDay(d)}
            className="btn"
            style={{
              background: selectedDay === d ? 'var(--accent-primary)' : 'transparent',
              border: 'none',
              color: selectedDay === d ? '#fff' : 'var(--text-secondary)',
              padding: '0.5rem 1.25rem',
              fontSize: '0.95rem',
              boxShadow: 'none',
            }}
          >
            {d}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem' }}>
        
        {/* Form Tambah Mapel */}
        <div className="glass-panel" style={{ height: 'fit-content' }}>
          <h3 style={{ fontSize: '1.2rem', marginBottom: '1.25rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <Calendar size={18} />
            <span>Tambah Mapel - Hari {selectedDay}</span>
          </h3>
          <form onSubmit={handleAddSchedule} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div className="form-group">
              <label className="form-label">Nama Mata Pelajaran</label>
              <input
                type="text"
                placeholder="CONTOH: Matematika, Bahasa Indonesia"
                className="form-input"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Jam Mulai</label>
                <input
                  type="time"
                  className="form-input"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Jam Selesai</label>
                <input
                  type="time"
                  className="form-input"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  required
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={saving}>
              <Plus size={16} />
              <span>Simpan Jadwal</span>
            </button>
          </form>
        </div>

        {/* Tabel Mapel hari terpilih */}
        <div className="glass-panel">
          <h3 style={{ fontSize: '1.2rem', marginBottom: '1.25rem' }}>Daftar Pelajaran Hari {selectedDay}</h3>
          <div className="table-wrapper">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Jam</th>
                  <th>Mata Pelajaran</th>
                  <th style={{ textAlign: 'right' }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filteredSchedules.length === 0 ? (
                  <tr>
                    <td colSpan="3" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Belum ada jadwal pelajaran di hari {selectedDay}.</td>
                  </tr>
                ) : (
                  filteredSchedules.map((s) => (
                    <tr key={s.id}>
                      <td style={{ fontWeight: 700 }}>
                        {s.start_time} - {s.end_time}
                      </td>
                      <td style={{ color: '#fff', fontWeight: 600 }}>{s.subject}</td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          onClick={() => handleDeleteSchedule(s.id, s.subject)}
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
