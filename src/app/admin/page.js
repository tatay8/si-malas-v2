'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { School, Users, UserCheck, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    classesCount: 0,
    teachersCount: 0,
    studentsCount: 0,
  });
  const [classList, setClassList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Ambil data jumlah kelas
        const { count: classesCount } = await supabase
          .from('classes')
          .select('*', { count: 'exact', head: true });

        // Ambil data jumlah wali kelas
        const { count: teachersCount } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('role', 'teacher');

        // Ambil data jumlah siswa
        const { count: studentsCount } = await supabase
          .from('students')
          .select('*', { count: 'exact', head: true });

        setStats({
          classesCount: classesCount || 0,
          teachersCount: teachersCount || 0,
          studentsCount: studentsCount || 0,
        });

        // Ambil list kelas dengan nama wali kelas
        const { data: classesData } = await supabase
          .from('classes')
          .select(`
            id,
            name,
            profiles (
              id,
              full_name,
              username
            )
          `);

        // Untuk setiap kelas, hitung jumlah siswa
        const classListWithStudents = await Promise.all(
          (classesData || []).map(async (cls) => {
            const { count: studentCount } = await supabase
              .from('students')
              .select('*', { count: 'exact', head: true })
              .eq('class_id', cls.id);

            return {
              ...cls,
              studentCount: studentCount || 0,
            };
          })
        );

        setClassList(classListWithStudents);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return <div style={{ color: 'var(--text-secondary)' }}>Memuat ringkasan data...</div>;
  }

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Kolom Info Statis */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '1.5rem'
      }}>
        {/* Card 1 */}
        <div className="glass-panel" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <div style={{
            background: 'rgba(99, 102, 241, 0.15)',
            color: 'var(--accent-primary)',
            padding: '1rem',
            borderRadius: 'var(--radius-md)'
          }}>
            <School size={28} />
          </div>
          <div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Total Kelas</div>
            <div style={{ fontSize: '2rem', fontWeight: 800 }}>{stats.classesCount}</div>
          </div>
        </div>

        {/* Card 2 */}
        <div className="glass-panel" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <div style={{
            background: 'rgba(6, 182, 212, 0.15)',
            color: 'var(--accent-secondary)',
            padding: '1rem',
            borderRadius: 'var(--radius-md)'
          }}>
            <UserCheck size={28} />
          </div>
          <div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Wali Kelas Aktif</div>
            <div style={{ fontSize: '2rem', fontWeight: 800 }}>{stats.teachersCount}</div>
          </div>
        </div>

        {/* Card 3 */}
        <div className="glass-panel" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <div style={{
            background: 'rgba(16, 185, 129, 0.15)',
            color: 'var(--success)',
            padding: '1rem',
            borderRadius: 'var(--radius-md)'
          }}>
            <Users size={28} />
          </div>
          <div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Total Siswa Terdaftar</div>
            <div style={{ fontSize: '2rem', fontWeight: 800 }}>{stats.studentsCount}</div>
          </div>
        </div>
      </div>

      {/* Tabel Hubungan Kelas & Wali Kelas */}
      <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ fontSize: '1.2rem', marginBottom: '0.25rem' }}>Daftar Pemetaan Kelas</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Status pengisian kelas dan penanggung jawabnya saat ini.</p>
          </div>
          <Link href="/admin/classes" className="btn btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
            <span>Kelola Pemetaan</span>
            <ArrowRight size={14} />
          </Link>
        </div>

        <div className="table-wrapper">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Nama Kelas</th>
                <th>Wali Kelas</th>
                <th>Username Akun</th>
                <th>Jumlah Siswa</th>
                <th style={{ textAlign: 'right' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {classList.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Belum ada kelas terdaftar. Sila buat di menu Kelola Kelas.</td>
                </tr>
              ) : (
                classList.map((cls) => {
                  const teacher = Array.isArray(cls.profiles) ? cls.profiles[0] : cls.profiles;
                  return (
                    <tr key={cls.id}>
                      <td style={{ fontWeight: 700, color: '#ffffff' }}>{cls.name}</td>
                      <td>{teacher ? teacher.full_name : <span style={{ color: 'var(--warning)', fontStyle: 'italic' }}>Belum Ditunjuk</span>}</td>
                      <td>{teacher ? teacher.username : '-'}</td>
                      <td>{cls.studentCount} Siswa</td>
                      <td style={{ textAlign: 'right' }}>
                        <Link href="/admin/review" className="btn btn-secondary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}>
                          <span>Pantau Kelas</span>
                        </Link>
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
