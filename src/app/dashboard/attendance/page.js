'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { ClipboardCheck, ShieldCheck, AlertCircle, Calendar } from 'lucide-react';

export default function StudentAttendance() {
  const [classId, setClassId] = useState(null);
  const [students, setStudents] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendanceData, setAttendanceData] = useState({}); // studentId -> { status, notes }
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Ambil data siswa
  useEffect(() => {
    const fetchClassAndStudents = async () => {
      setLoading(true);
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
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchClassAndStudents();
  }, []);

  // Ambil data absensi saat tanggal berubah
  useEffect(() => {
    if (students.length === 0 || !selectedDate) return;

    const fetchAttendance = async () => {
      try {
        const studentIds = students.map(s => s.id);
        const { data, error: fetchErr } = await supabase
          .from('attendance')
          .select('*')
          .in('student_id', studentIds)
          .eq('date', selectedDate);

        if (fetchErr) throw fetchErr;

        // Map data absensi lama ke state
        const attMap = {};
        students.forEach(s => {
          attMap[s.id] = { status: 'hadir', notes: '' }; // default
        });

        (data || []).forEach(record => {
          attMap[record.student_id] = {
            status: record.status,
            notes: record.notes || ''
          };
        });

        setAttendanceData(attMap);
      } catch (err) {
        setError(err.message);
      }
    };

    fetchAttendance();
  }, [selectedDate, students]);

  const handleStatusChange = (studentId, status) => {
    setAttendanceData(prev => ({
      ...prev,
      [studentId]: { ...prev[studentId], status }
    }));
  };

  const handleNotesChange = (studentId, notes) => {
    setAttendanceData(prev => ({
      ...prev,
      [studentId]: { ...prev[studentId], notes }
    }));
  };

  const handleSaveAttendance = async () => {
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const recordsToUpsert = Object.keys(attendanceData).map(studentId => ({
        student_id: studentId,
        date: selectedDate,
        status: attendanceData[studentId].status,
        notes: attendanceData[studentId].notes
      }));

      const { error: upsertErr } = await supabase
        .from('attendance')
        .upsert(recordsToUpsert, { onConflict: 'student_id,date' });

      if (upsertErr) throw upsertErr;

      setSuccess(`Absensi untuk tanggal ${new Date(selectedDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })} berhasil disimpan.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div style={{ color: 'var(--text-secondary)' }}>Memuat data absensi...</div>;
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

      {/* Pemilih Tanggal */}
      <div className="glass-panel" style={{ display: 'flex', alignItems: 'center', gap: '1rem', justifyContent: 'space-between', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Calendar style={{ color: 'var(--accent-secondary)' }} size={20} />
          <span style={{ fontWeight: 700 }}>Pilih Tanggal Presensi:</span>
          <input
            type="date"
            className="form-input"
            style={{ width: '180px' }}
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
        </div>

        <button onClick={handleSaveAttendance} className="btn btn-primary" disabled={saving || students.length === 0}>
          <ClipboardCheck size={16} />
          <span>{saving ? 'Menyimpan...' : 'Simpan Absensi'}</span>
        </button>
      </div>

      {/* Tabel Absensi */}
      <div className="glass-panel">
        <div className="table-wrapper">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Nama Siswa</th>
                <th>Presensi (Hadir / Sakit / Izin / Alfa)</th>
                <th>Keterangan Tambahan</th>
              </tr>
            </thead>
            <tbody>
              {students.length === 0 ? (
                <tr>
                  <td colSpan="3" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Belum ada siswa terdaftar di kelas Anda.</td>
                </tr>
              ) : (
                students.map((s, index) => {
                  const val = attendanceData[s.id] || { status: 'hadir', notes: '' };
                  return (
                    <tr key={s.id}>
                      <td style={{ fontWeight: 700, color: '#fff' }}>
                        {index + 1}. {s.name}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer', fontSize: '0.9rem' }}>
                            <input
                              type="radio"
                              name={`status-${s.id}`}
                              checked={val.status === 'hadir'}
                              onChange={() => handleStatusChange(s.id, 'hadir')}
                              style={{ accentColor: 'var(--success)' }}
                            />
                            <span style={{ color: val.status === 'hadir' ? 'var(--success)' : 'var(--text-secondary)', fontWeight: val.status === 'hadir' ? 700 : 500 }}>Hadir</span>
                          </label>

                          <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer', fontSize: '0.9rem' }}>
                            <input
                              type="radio"
                              name={`status-${s.id}`}
                              checked={val.status === 'sakit'}
                              onChange={() => handleStatusChange(s.id, 'sakit')}
                              style={{ accentColor: 'var(--warning)' }}
                            />
                            <span style={{ color: val.status === 'sakit' ? 'var(--warning)' : 'var(--text-secondary)', fontWeight: val.status === 'sakit' ? 700 : 500 }}>Sakit</span>
                          </label>

                          <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer', fontSize: '0.9rem' }}>
                            <input
                              type="radio"
                              name={`status-${s.id}`}
                              checked={val.status === 'izin'}
                              onChange={() => handleStatusChange(s.id, 'izin')}
                              style={{ accentColor: 'var(--accent-secondary)' }}
                            />
                            <span style={{ color: val.status === 'izin' ? 'var(--accent-secondary)' : 'var(--text-secondary)', fontWeight: val.status === 'izin' ? 700 : 500 }}>Izin</span>
                          </label>

                          <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer', fontSize: '0.9rem' }}>
                            <input
                              type="radio"
                              name={`status-${s.id}`}
                              checked={val.status === 'alfa'}
                              onChange={() => handleStatusChange(s.id, 'alfa')}
                              style={{ accentColor: 'var(--danger)' }}
                            />
                            <span style={{ color: val.status === 'alfa' ? 'var(--danger)' : 'var(--text-secondary)', fontWeight: val.status === 'alfa' ? 700 : 500 }}>Alfa</span>
                          </label>
                        </div>
                      </td>
                      <td>
                        <input
                          type="text"
                          placeholder="contoh: Surat dokter, Dispen pramuka, dll"
                          className="form-input"
                          style={{ padding: '0.35rem 0.75rem', fontSize: '0.85rem' }}
                          value={val.notes}
                          onChange={(e) => handleNotesChange(s.id, e.target.value)}
                        />
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
  );
}
