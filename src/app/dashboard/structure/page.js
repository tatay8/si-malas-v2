'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Award, ShieldCheck, AlertCircle } from 'lucide-react';

export default function ClassStructure() {
  const [classId, setClassId] = useState(null);
  const [students, setStudents] = useState([]);
  const [structure, setStructure] = useState({}); // role -> student_id
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const roles = [
    'Ketua Kelas',
    'Wakil Ketua Kelas',
    'Sekretaris 1',
    'Sekretaris 2',
    'Bendahara 1',
    'Bendahara 2',
    'Seksi Keamanan',
    'Seksi Kebersihan',
    'Seksi Keadilan'
  ];

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

        // Ambil struktur kelas yang sudah disimpan
        const { data: structData } = await supabase
          .from('class_structures')
          .select('*')
          .eq('class_id', profile.class_id);

        const structMap = {};
        roles.forEach(r => {
          structMap[r] = ''; // default kosong
        });
        (structData || []).forEach(item => {
          structMap[item.role] = item.student_id;
        });

        setStructure(structMap);
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

  const handleRoleChange = (role, studentId) => {
    setStructure(prev => ({
      ...prev,
      [role]: studentId
    }));
  };

  const handleSaveStructure = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const itemsToUpsert = [];
      const itemsToDelete = [];

      Object.keys(structure).forEach(role => {
        const studentId = structure[role];
        if (studentId) {
          itemsToUpsert.push({
            class_id: classId,
            role,
            student_id: studentId
          });
        } else {
          itemsToDelete.push(role);
        }
      });

      // 1. Simpan/Upsert yang diisi
      if (itemsToUpsert.length > 0) {
        const { error: upsertErr } = await supabase
          .from('class_structures')
          .upsert(itemsToUpsert, { onConflict: 'class_id,role' });
        if (upsertErr) throw upsertErr;
      }

      // 2. Hapus yang dikosongkan
      if (itemsToDelete.length > 0) {
        const { error: deleteErr } = await supabase
          .from('class_structures')
          .delete()
          .eq('class_id', classId)
          .in('role', itemsToDelete);
        if (deleteErr) throw deleteErr;
      }

      setSuccess('Struktur organisasi kelas berhasil diperbarui.');
      fetchData();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div style={{ color: 'var(--text-secondary)' }}>Memuat struktur organisasi...</div>;
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

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem' }}>
        
        {/* Form Set Pengurus */}
        <div className="glass-panel" style={{ height: 'fit-content' }}>
          <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>Tentukan Pengurus Kelas</h3>
          <form onSubmit={handleSaveStructure} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {roles.map(role => (
              <div key={role} className="form-group" style={{ marginBottom: '0.75rem' }}>
                <label className="form-label">{role}</label>
                <select
                  className="form-select"
                  value={structure[role] || ''}
                  onChange={(e) => handleRoleChange(role, e.target.value)}
                >
                  <option value="">-- Belum Ditentukan --</option>
                  {students.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            ))}

            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }} disabled={saving || students.length === 0}>
              <Award size={16} />
              <span>{saving ? 'Menyimpan...' : 'Simpan Pengurus'}</span>
            </button>
          </form>
        </div>

        {/* Struktur Visual (Representasi Bagan Pengurus) */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1.5rem', minHeight: '400px' }}>
          <h3 style={{ fontSize: '1.2rem', alignSelf: 'flex-start' }}>Bagan Organisasi Kelas</h3>
          
          {/* Layout Bagan Sederhana */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem', width: '100%' }}>
            
            {/* Ketua Kelas */}
            <div style={{
              background: 'rgba(99, 102, 241, 0.1)',
              border: '2px solid var(--accent-primary)',
              borderRadius: 'var(--radius-md)',
              padding: '1rem 2rem',
              textAlign: 'center',
              width: '220px'
            }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 700 }}>KETUA KELAS</div>
              <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#fff', marginTop: '0.25rem' }}>
                {students.find(s => s.id === structure['Ketua Kelas'])?.name || <span style={{ color: 'var(--text-muted)' }}>Belum Ditunjuk</span>}
              </div>
            </div>

            {/* Wakil Ketua */}
            <div style={{
              background: 'rgba(6, 182, 212, 0.1)',
              border: '1px solid var(--accent-secondary)',
              borderRadius: 'var(--radius-md)',
              padding: '0.75rem 1.5rem',
              textAlign: 'center',
              width: '200px'
            }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 700 }}>WAKIL KETUA KELAS</div>
              <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#fff', marginTop: '0.25rem' }}>
                {students.find(s => s.id === structure['Wakil Ketua Kelas'])?.name || <span style={{ color: 'var(--text-muted)' }}>Belum Ditunjuk</span>}
              </div>
            </div>

            {/* Baris Sekretaris & Bendahara */}
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center', width: '100%' }}>
              
              {/* Sekretaris */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid var(--glass-border)',
                borderRadius: 'var(--radius-md)',
                padding: '0.75rem',
                textAlign: 'center',
                minWidth: '150px'
              }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 700 }}>SEKRETARIS</div>
                <div style={{ fontSize: '0.85rem', color: '#fff', marginTop: '0.25rem' }}>
                  1. {students.find(s => s.id === structure['Sekretaris 1'])?.name || 'Belum ditunjuk'} <br/>
                  2. {students.find(s => s.id === structure['Sekretaris 2'])?.name || 'Belum ditunjuk'}
                </div>
              </div>

              {/* Bendahara */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid var(--glass-border)',
                borderRadius: 'var(--radius-md)',
                padding: '0.75rem',
                textAlign: 'center',
                minWidth: '150px'
              }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 700 }}>BENDAHARA</div>
                <div style={{ fontSize: '0.85rem', color: '#fff', marginTop: '0.25rem' }}>
                  1. {students.find(s => s.id === structure['Bendahara 1'])?.name || 'Belum ditunjuk'} <br/>
                  2. {students.find(s => s.id === structure['Bendahara 2'])?.name || 'Belum ditunjuk'}
                </div>
              </div>

            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
