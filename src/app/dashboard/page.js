'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Users, FileText, CalendarCheck, ShieldAlert, HeartPulse } from 'lucide-react';
import Link from 'next/link';

export default function TeacherDashboard() {
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState({
    studentCount: 0,
    attendanceToday: { hadir: 0, sakit: 0, izin: 0, alfa: 0 },
    positiveBehaviorCount: 0,
    negativeBehaviorCount: 0,
    visitCount: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        // 1. Ambil profile guru
        const { data: userProfile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
        
        if (!userProfile) return;
        setProfile(userProfile);

        if (!userProfile.class_id) {
          setLoading(false);
          return;
        }

        const classId = userProfile.class_id;

        // 2. Jumlah siswa
        const { count: studentCount } = await supabase
          .from('students')
          .select('*', { count: 'exact', head: true })
          .eq('class_id', classId);

        // 3. Absensi hari ini
        const todayStr = new Date().toISOString().split('T')[0];
        
        // Dapatkan semua ID siswa di kelas
        const { data: studentsData } = await supabase
          .from('students')
          .select('id')
          .eq('class_id', classId);
        
        const studentIds = (studentsData || []).map(s => s.id);

        let attStats = { hadir: 0, sakit: 0, izin: 0, alfa: 0 };
        if (studentIds.length > 0) {
          const { data: attData } = await supabase
            .from('attendance')
            .select('status')
            .in('student_id', studentIds)
            .eq('date', todayStr);

          (attData || []).forEach(att => {
            if (attStats[att.status] !== undefined) {
              attStats[att.status]++;
            }
          });
        }

        // 4. Catatan perilaku
        let posCount = 0;
        let negCount = 0;
        if (studentIds.length > 0) {
          const { count: positive } = await supabase
            .from('behavior_records')
            .select('*', { count: 'exact', head: true })
            .in('student_id', studentIds)
            .eq('type', 'positif');

          const { count: negative } = await supabase
            .from('behavior_records')
            .select('*', { count: 'exact', head: true })
            .in('student_id', studentIds)
            .eq('type', 'negatif');

          posCount = positive || 0;
          negCount = negative || 0;
        }

        // 5. Jumlah Home Visit
        let visitCount = 0;
        if (studentIds.length > 0) {
          const { count: visits } = await supabase
            .from('home_visits')
            .select('*', { count: 'exact', head: true })
            .in('student_id', studentIds);
          visitCount = visits || 0;
        }

        setStats({
          studentCount: studentCount || 0,
          attendanceToday: attStats,
          positiveBehaviorCount: posCount,
          negativeBehaviorCount: negCount,
          visitCount: visitCount,
        });

      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return <div style={{ color: 'var(--text-secondary)' }}>Memuat ringkasan kelas...</div>;
  }

  if (profile && !profile.class_id) {
    return (
      <div className="glass-panel" style={{ textAlign: 'center', padding: '3rem' }}>
        <ShieldAlert size={48} style={{ color: 'var(--warning)', marginBottom: '1rem' }} />
        <h2>Anda Belum Diploting Kelas</h2>
        <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem', maxWidth: '500px', margin: '0.5rem auto' }}>
          Akun Anda terdaftar, namun Admin IT belum menetapkan kelas yang harus Anda ampu. Silakan hubungi Admin Sekolah untuk memetakan kelas Anda.
        </p>
      </div>
    );
  }

  const { studentCount, attendanceToday, positiveBehaviorCount, negativeBehaviorCount, visitCount } = stats;

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Sambutan */}
      <div>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>Selamat Datang, {profile?.full_name}!</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Berikut rekapitulasi data kelas Anda untuk hari ini.</p>
      </div>

      {/* Grid Informasi Utama */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '1.5rem'
      }}>
        
        {/* Siswa */}
        <div className="glass-panel" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{ background: 'rgba(99, 102, 241, 0.15)', color: 'var(--accent-primary)', padding: '0.75rem', borderRadius: 'var(--radius-md)' }}>
            <Users size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>JUMLAH SISWA</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{studentCount} Anak</div>
          </div>
        </div>

        {/* Absen Hari Ini */}
        <div className="glass-panel" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{ background: 'rgba(16, 185, 129, 0.15)', color: 'var(--success)', padding: '0.75rem', borderRadius: 'var(--radius-md)' }}>
            <CalendarCheck size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>HADIR HARI INI</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{attendanceToday.hadir} / {studentCount}</div>
          </div>
        </div>

        {/* Perilaku Positif / Negatif */}
        <div className="glass-panel" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{ background: 'rgba(245, 158, 11, 0.15)', color: 'var(--warning)', padding: '0.75rem', borderRadius: 'var(--radius-md)' }}>
            <FileText size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>CATATAN PERILAKU</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800 }}>
              <span style={{ color: 'var(--success)' }}>+{positiveBehaviorCount} Pos</span> | <span style={{ color: 'var(--danger)' }}>-{negativeBehaviorCount} Neg</span>
            </div>
          </div>
        </div>

        {/* Home Visit */}
        <div className="glass-panel" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{ background: 'rgba(6, 182, 212, 0.15)', color: 'var(--accent-secondary)', padding: '0.75rem', borderRadius: 'var(--radius-md)' }}>
            <HeartPulse size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>KUNJUNGAN RUMAH</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{visitCount} Kegiatan</div>
          </div>
        </div>

      </div>

      {/* Rincian Tambahan */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
        
        {/* Box 1: Absensi Hari ini */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h3 style={{ fontSize: '1.1rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem' }}>Rincian Kehadiran Hari Ini</h3>
          <div style={{ display: 'flex', justifyContent: 'space-around', padding: '1rem 0' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--success)' }}>{attendanceToday.hadir}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Hadir</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--warning)' }}>{attendanceToday.sakit}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Sakit</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--accent-secondary)' }}>{attendanceToday.izin}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Izin</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--danger)' }}>{attendanceToday.alfa}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Alfa</div>
            </div>
          </div>
          <Link href="/dashboard/attendance" className="btn btn-secondary" style={{ textAlign: 'center', fontSize: '0.85rem' }}>
            Input Absensi Harian
          </Link>
        </div>

        {/* Box 2: Quick Links */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h3 style={{ fontSize: '1.1rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem' }}>Akses Cepat Administrasi</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <Link href="/dashboard/students" className="btn btn-secondary" style={{ fontSize: '0.85rem', padding: '0.6rem' }}>
              Kelola Siswa
            </Link>
            <Link href="/dashboard/behavior" className="btn btn-secondary" style={{ fontSize: '0.85rem', padding: '0.6rem' }}>
              Catat Kasus
            </Link>
            <Link href="/dashboard/structure" className="btn btn-secondary" style={{ fontSize: '0.85rem', padding: '0.6rem' }}>
              Struktur Organisasi
            </Link>
            <Link href="/dashboard/seating" className="btn btn-secondary" style={{ fontSize: '0.85rem', padding: '0.6rem' }}>
              Denah Duduk
            </Link>
          </div>
        </div>

      </div>

    </div>
  );
}
