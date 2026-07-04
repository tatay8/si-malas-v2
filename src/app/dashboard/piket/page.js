'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Sparkles, ShieldCheck, AlertCircle } from 'lucide-react';

export default function DutyRoster() {
  const [classId, setClassId] = useState(null);
  const [students, setStudents] = useState([]);
  const [roster, setRoster] = useState({}); // day -> array of studentIds
  const [selectedDay, setSelectedDay] = useState('Senin');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const days = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

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

        // Ambil data siswa
        const { data: studentsData } = await supabase
          .from('students')
          .select('id, name')
          .eq('class_id', profile.class_id)
          .order('name');
        setStudents(studentsData || []);

        // Ambil piket yang tersimpan
        const { data: rosterData } = await supabase
          .from('duty_rosters')
          .select('*')
          .eq('class_id', profile.class_id);

        const rosterMap = {};
        days.forEach(d => {
          rosterMap[d] = [];
        });

        (rosterData || []).forEach(item => {
          if (rosterMap[item.day]) {
            rosterMap[item.day].push(item.student_id);
          }
        });

        setRoster(rosterMap);
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

  const handleTogglePiket = (studentId) => {
    setRoster(prev => {
      const currentList = prev[selectedDay] || [];
      const updatedList = currentList.includes(studentId)
        ? currentList.filter(id => id !== studentId)
        : [...currentList, studentId];
      return {
        ...prev,
        [selectedDay]: updatedList
      };
    });
  };

  const handleSaveRoster = async () => {
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      // Dapatkan anggota piket hari ini
      const activeStudentIds = roster[selectedDay] || [];

      // 1. Hapus jadwal piket lama untuk hari terpilih
      const { error: deleteErr } = await supabase
        .from('duty_rosters')
        .delete()
        .eq('class_id', classId)
        .eq('day', selectedDay);

      if (deleteErr) throw deleteErr;

      // 2. Insert jadwal piket baru jika ada yang dipilih
      if (activeStudentIds.length > 0) {
        const rowsToInsert = activeStudentIds.map(sid => ({
          class_id: classId,
          day: selectedDay,
          student_id: sid
        }));

        const { error: insertErr } = await supabase
          .from('duty_rosters')
          .insert(rowsToInsert);

        if (insertErr) throw insertErr;
      }

      setSuccess(`Daftar Piket hari ${selectedDay} berhasil disimpan.`);
      fetchData();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div style={{ color: 'var(--text-secondary)' }}>Memuat regu piket...</div>;
  }

  if (!classId) {
    return <div className="glass-panel" style={{ color: 'var(--warning)', textAlign: 'center' }}>Anda belum diploting kelas. Silakan hubungi Admin.</div>;
  }

  const activePiketIds = roster[selectedDay] || [];

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

      {/* Pemilih Hari */}
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
        
        {/* Atur Petugas Piket */}
        <div className="glass-panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h3 style={{ fontSize: '1.2rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <Sparkles size={18} />
              <span>Petugas Piket - Hari {selectedDay}</span>
            </h3>
            <button onClick={handleSaveRoster} className="btn btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }} disabled={saving || students.length === 0}>
              <span>Simpan Piket</span>
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '450px', overflowY: 'auto', paddingRight: '0.5rem' }}>
            {students.length === 0 ? (
              <p style={{ color: 'var(--text-muted)' }}>Belum ada siswa di kelas ini.</p>
            ) : (
              students.map(s => {
                const isPiket = activePiketIds.includes(s.id);
                return (
                  <label
                    key={s.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: isPiket ? 'rgba(99, 102, 241, 0.05)' : 'rgba(255,255,255,0.01)',
                      border: isPiket ? '1px solid var(--accent-primary)' : '1px solid var(--glass-border)',
                      padding: '0.75rem 1rem',
                      borderRadius: 'var(--radius-md)',
                      cursor: 'pointer',
                      transition: 'var(--transition-fast)'
                    }}
                  >
                    <span style={{ fontWeight: 600, color: isPiket ? '#fff' : 'var(--text-secondary)' }}>{s.name}</span>
                    <input
                      type="checkbox"
                      checked={isPiket}
                      onChange={() => handleTogglePiket(s.id)}
                      style={{ width: '18px', height: '18px', accentColor: 'var(--accent-primary)' }}
                    />
                  </label>
                );
              })
            )}
          </div>
        </div>

        {/* Rekapitulasi Regu Piket Seluruh Hari */}
        <div className="glass-panel">
          <h3 style={{ fontSize: '1.2rem', marginBottom: '1.25rem' }}>Jadwal Piket Mingguan</h3>
          <div className="table-wrapper">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Hari</th>
                  <th>Petugas Piket</th>
                </tr>
              </thead>
              <tbody>
                {days.map(day => {
                  const members = roster[day] || [];
                  const names = students
                    .filter(s => members.includes(s.id))
                    .map(s => s.name)
                    .join(', ');

                  return (
                    <tr key={day} style={{ background: selectedDay === day ? 'rgba(255,255,255,0.03)' : 'transparent' }}>
                      <td style={{ fontWeight: 700, color: selectedDay === day ? 'var(--accent-primary)' : '#fff' }}>{day}</td>
                      <td style={{ fontSize: '0.88rem', color: names ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                        {names || 'Belum diatur petugas piket.'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
