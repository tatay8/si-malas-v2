'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { LayoutGrid, ShieldCheck, AlertCircle, UserPlus, X } from 'lucide-react';

export default function SeatingPlan() {
  const [classId, setClassId] = useState(null);
  const [students, setStudents] = useState([]);
  const [seating, setSeating] = useState({}); // "row-col" -> studentId
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Grid dimensions: 5 Baris, 4 Kolom (20 Meja)
  const rows = [0, 1, 2, 3, 4];
  const cols = [0, 1, 2, 3];

  // Temp assign state
  const [assigningCell, setAssigningCell] = useState(null); // { row, col }

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
          .select('id, name, photo_url')
          .eq('class_id', profile.class_id)
          .order('name');
        setStudents(studentsData || []);

        // Ambil denah tempat duduk yang tersimpan
        const { data: seatingData } = await supabase
          .from('seating_plans')
          .select('*')
          .eq('class_id', profile.class_id);

        const seatMap = {};
        (seatingData || []).forEach(seat => {
          seatMap[`${seat.row_index}-${seat.col_index}`] = seat.student_id;
        });
        setSeating(seatMap);
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

  const handleSeatAssign = async (studentId) => {
    if (!assigningCell) return;
    const { row, col } = assigningCell;

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      if (studentId === '') {
        // Hapus penempatan duduk di sel ini
        const { error: deleteErr } = await supabase
          .from('seating_plans')
          .delete()
          .eq('class_id', classId)
          .eq('row_index', row)
          .eq('col_index', col);

        if (deleteErr) throw deleteErr;
        setSuccess('Kursi dikosongkan.');
      } else {
        // Cek jika siswa tersebut sudah duduk di kursi lain, hapus kursi lamanya
        const { error: resetErr } = await supabase
          .from('seating_plans')
          .delete()
          .eq('class_id', classId)
          .eq('student_id', studentId);

        if (resetErr) throw resetErr;

        // Pasang duduk baru (upsert)
        const { error: upsertErr } = await supabase
          .from('seating_plans')
          .upsert([{
            class_id: classId,
            row_index: row,
            col_index: col,
            student_id: studentId
          }], { onConflict: 'class_id,row_index,col_index' });

        if (upsertErr) throw upsertErr;
        setSuccess('Posisi duduk siswa berhasil diatur.');
      }

      setAssigningCell(null);
      fetchData();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleClearSeat = async (row, col) => {
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const { error: deleteErr } = await supabase
        .from('seating_plans')
        .delete()
        .eq('class_id', classId)
        .eq('row_index', row)
        .eq('col_index', col);

      if (deleteErr) throw deleteErr;
      setSuccess('Kursi dikosongkan.');
      fetchData();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // List ID siswa yang sudah memiliki tempat duduk
  const assignedStudentIds = Object.values(seating);

  if (loading) {
    return <div style={{ color: 'var(--text-secondary)' }}>Memuat denah tempat duduk...</div>;
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

      {/* Overlay Pilih Siswa */}
      {assigningCell && (
        <div className="glass-panel" style={{ borderColor: 'var(--accent-primary)', background: 'rgba(99, 102, 241, 0.05)' }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--accent-primary)', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <UserPlus size={18} />
            <span>Pilih Siswa untuk Baris {assigningCell.row + 1}, Kolom {assigningCell.col + 1}</span>
          </h3>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <select
              className="form-select"
              style={{ width: '250px' }}
              defaultValue=""
              onChange={(e) => handleSeatAssign(e.target.value)}
              disabled={saving}
            >
              <option value="">-- Pilih Siswa --</option>
              {students.map(s => {
                const isAlreadySeated = assignedStudentIds.includes(s.id);
                return (
                  <option key={s.id} value={s.id} disabled={isAlreadySeated}>
                    {s.name} {isAlreadySeated ? '(Sudah Duduk)' : ''}
                  </option>
                );
              })}
            </select>
            <button className="btn btn-secondary" onClick={() => setAssigningCell(null)}>
              Batal
            </button>
          </div>
        </div>
      )}

      {/* Papan Tulis / Layout Kelas */}
      <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2rem' }}>
        
        {/* Simbol Papan Tulis */}
        <div style={{
          width: '70%',
          maxWidth: '500px',
          background: 'rgba(255, 255, 255, 0.03)',
          border: '2px solid var(--text-muted)',
          borderRadius: 'var(--radius-sm)',
          textAlign: 'center',
          padding: '0.75rem',
          fontWeight: 700,
          color: 'var(--text-secondary)',
          fontSize: '0.9rem',
          letterSpacing: '0.2em',
          boxShadow: 'inset 0 0 10px rgba(255,255,255,0.02)'
        }}>
          PAPAN TULIS / MEJA GURU
        </div>

        {/* Grid Meja Siswa */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '1.5rem',
          width: '100%',
          maxWidth: '750px',
          padding: '1rem 0'
        }}>
          {rows.map(row => 
            cols.map(col => {
              const seatKey = `${row}-${col}`;
              const studentId = seating[seatKey];
              const student = students.find(s => s.id === studentId);

              return (
                <div
                  key={seatKey}
                  style={{
                    background: student ? 'var(--glass-bg)' : 'rgba(255, 255, 255, 0.02)',
                    border: student ? '1px solid var(--accent-primary)' : '1px dashed var(--glass-border)',
                    borderRadius: 'var(--radius-md)',
                    padding: '0.75rem',
                    minHeight: '120px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textAlign: 'center',
                    position: 'relative',
                    transition: 'var(--transition-fast)'
                  }}
                >
                  {/* Penunjuk Grid */}
                  <span style={{ position: 'absolute', top: '0.35rem', left: '0.5rem', fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                    B{row + 1}-K{col + 1}
                  </span>

                  {student ? (
                    <>
                      {/* Tombol Hapus Kursi */}
                      <button
                        onClick={() => handleClearSeat(row, col)}
                        style={{
                          position: 'absolute',
                          top: '0.25rem',
                          right: '0.25rem',
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--text-muted)',
                          cursor: 'pointer',
                          padding: '0.1rem'
                        }}
                        title="Kosongkan Kursi"
                      >
                        <X size={14} />
                      </button>

                      {/* Info Siswa */}
                      <img
                        src={student.photo_url || 'https://via.placeholder.com/150'}
                        alt={student.name}
                        style={{ width: '42px', height: '42px', borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--accent-primary)', marginBottom: '0.4rem' }}
                      />
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#fff', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {student.name}
                      </span>
                    </>
                  ) : (
                    <button
                      onClick={() => setAssigningCell({ row, col })}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-muted)',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '0.4rem',
                        width: '100%',
                        height: '100%',
                        justifyContent: 'center'
                      }}
                    >
                      <LayoutGrid size={20} />
                      <span style={{ fontSize: '0.75rem' }}>Kosong</span>
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>

      </div>

    </div>
  );
}
