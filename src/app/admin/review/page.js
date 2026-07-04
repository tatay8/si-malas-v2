'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { School, Users, FileText, UserCheck, Calendar, Image as ImageIcon, HeartPulse, HeartHandshake } from 'lucide-react';

export default function ReviewClasses() {
  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [loadingData, setLoadingData] = useState(false);
  const [error, setError] = useState('');

  // Class data state
  const [classDetail, setClassDetail] = useState(null);
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [behaviors, setBehaviors] = useState([]);
  const [guidance, setGuidance] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [dutyRosters, setDutyRosters] = useState([]);
  const [gallery, setGallery] = useState([]);
  const [interviews, setInterviews] = useState([]);
  const [homeVisits, setHomeVisits] = useState([]);

  // Active Tab
  const [activeTab, setActiveTab] = useState('summary');

  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const { data, error: err } = await supabase
          .from('classes')
          .select('*')
          .order('name');
        if (err) throw err;
        setClasses(data || []);
        if (data && data.length > 0) {
          setSelectedClassId(data[0].id);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoadingClasses(false);
      }
    };
    fetchClasses();
  }, []);

  useEffect(() => {
    if (!selectedClassId) return;

    const fetchClassData = async () => {
      setLoadingData(true);
      setError('');
      try {
        // 1. Ambil detail kelas & wali kelas
        const { data: clsData } = await supabase
          .from('classes')
          .select(`
            *,
            profiles (
              full_name,
              username
            )
          `)
          .eq('id', selectedClassId)
          .single();
        setClassDetail(clsData);

        // 2. Ambil seluruh siswa di kelas ini
        const { data: studentsData } = await supabase
          .from('students')
          .select('*')
          .eq('class_id', selectedClassId)
          .order('name');
        const studentsList = studentsData || [];
        setStudents(studentsList);
        const studentIds = studentsList.map(s => s.id);

        if (studentIds.length > 0) {
          // 3. Ambil absensi
          const { data: attData } = await supabase
            .from('attendance')
            .select('*, students(name)')
            .in('student_id', studentIds)
            .order('date', { ascending: false });
          setAttendance(attData || []);

          // 4. Ambil catatan perilaku
          const { data: behData } = await supabase
            .from('behavior_records')
            .select('*, students(name)')
            .in('student_id', studentIds)
            .order('date', { ascending: false });
          setBehaviors(behData || []);

          // 5. Ambil bimbingan
          const { data: guidData } = await supabase
            .from('guidance_records')
            .select('*, students(name)')
            .in('student_id', studentIds)
            .order('date', { ascending: false });
          setGuidance(guidData || []);

          // 6. Ambil wawancara
          const { data: intData } = await supabase
            .from('interviews')
            .select('*, students(name)')
            .in('student_id', studentIds)
            .order('date', { ascending: false });
          setInterviews(intData || []);

          // 7. Ambil home visit
          const { data: visitData } = await supabase
            .from('home_visits')
            .select('*, students(name)')
            .in('student_id', studentIds)
            .order('date', { ascending: false });
          setHomeVisits(visitData || []);
        } else {
          setAttendance([]);
          setBehaviors([]);
          setGuidance([]);
          setInterviews([]);
          setHomeVisits([]);
        }

        // 8. Ambil jadwal pelajaran kelas ini
        const { data: schedData } = await supabase
          .from('schedules')
          .select('*')
          .eq('class_id', selectedClassId)
          .order('day');
        setSchedules(schedData || []);

        // 9. Ambil galeri kelas ini
        const { data: galData } = await supabase
          .from('class_gallery')
          .select('*')
          .eq('class_id', selectedClassId)
          .order('created_at', { ascending: false });
        setGallery(galData || []);

        // 10. Ambil jadwal piket
        const { data: piketData } = await supabase
          .from('duty_rosters')
          .select('*, students(name)')
          .eq('class_id', selectedClassId);
        setDutyRosters(piketData || []);

      } catch (err) {
        setError(err.message);
      } finally {
        setLoadingData(false);
      }
    };

    fetchClassData();
  }, [selectedClassId]);

  if (loadingClasses) {
    return <div style={{ color: 'var(--text-secondary)' }}>Memuat daftar kelas...</div>;
  }

  const teacherName = classDetail?.profiles 
    ? (Array.isArray(classDetail.profiles) ? classDetail.profiles[0]?.full_name : classDetail.profiles?.full_name) 
    : null;

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Pemilih Kelas */}
      <div className="glass-panel" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <School style={{ color: 'var(--accent-primary)' }} />
          <span style={{ fontSize: '1.1rem', fontWeight: 700 }}>Pilih Kelas yang Ingin Dipantau:</span>
          <select
            className="form-select"
            style={{ width: '220px', padding: '0.5rem 2rem 0.5rem 1rem' }}
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
          >
            {classes.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        {classDetail && (
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Wali Kelas:</span>
            <div style={{ fontWeight: 700, color: 'var(--accent-secondary)' }}>{teacherName || 'Belum ditunjuk'}</div>
          </div>
        )}
      </div>

      {loadingData ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
          <div style={{
            border: '3px solid rgba(255,255,255,0.05)',
            borderTop: '3px solid var(--accent-secondary)',
            borderRadius: '50%',
            width: '36px',
            height: '36px',
            animation: 'spin 0.8s linear infinite',
            margin: '0 auto 1rem auto'
          }}></div>
          <span>Sedang memuat data kelas...</span>
        </div>
      ) : (
        <>
          {/* Menu Tab */}
          <div style={{
            display: 'flex',
            gap: '0.5rem',
            borderBottom: '1px solid var(--glass-border)',
            paddingBottom: '0.5rem',
            overflowX: 'auto'
          }}>
            {[
              { id: 'summary', label: 'Ringkasan Kelas' },
              { id: 'students', label: 'Biodata Siswa' },
              { id: 'attendance', label: 'Absensi Harian' },
              { id: 'behavior', label: 'Perilaku & Bimbingan' },
              { id: 'visits', label: 'Wawancara & Home Visit' },
              { id: 'gallery', label: 'Galeri & Jadwal' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="btn"
                style={{
                  background: activeTab === tab.id ? 'var(--accent-primary)' : 'transparent',
                  border: 'none',
                  color: activeTab === tab.id ? '#fff' : 'var(--text-secondary)',
                  padding: '0.5rem 1rem',
                  fontSize: '0.9rem',
                  boxShadow: 'none',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* TAB CONTENT: RINGKASAN */}
          {activeTab === 'summary' && (
            <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '1.5rem'
              }}>
                <div className="glass-panel" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.25rem' }}>
                  <Users style={{ color: 'var(--accent-primary)' }} />
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Jumlah Siswa</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{students.length} Orang</div>
                  </div>
                </div>

                <div className="glass-panel" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.25rem' }}>
                  <UserCheck style={{ color: 'var(--success)' }} />
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Absensi (Sakit/Izin/Alfa)</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>
                      {attendance.filter(a => a.status !== 'hadir').length} Catatan
                    </div>
                  </div>
                </div>

                <div className="glass-panel" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.25rem' }}>
                  <FileText style={{ color: 'var(--warning)' }} />
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Log Kasus Perilaku</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>
                      {behaviors.filter(b => b.type === 'negatif').length} Kasus
                    </div>
                  </div>
                </div>

                <div className="glass-panel" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.25rem' }}>
                  <HeartPulse style={{ color: 'var(--accent-secondary)' }} />
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Home Visit & Wawancara</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>
                      {homeVisits.length + interviews.length} Kegiatan
                    </div>
                  </div>
                </div>
              </div>

              {/* Catatan Terakhir Kelas */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
                <div className="glass-panel">
                  <h4 style={{ fontSize: '1.1rem', marginBottom: '1rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem' }}>Kehadiran Bermasalah</h4>
                  <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {attendance.filter(a => a.status !== 'hadir').slice(0, 5).map(a => (
                      <li key={a.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                        <span><strong>{a.students?.name}</strong></span>
                        <span className={`badge ${a.status === 'alfa' ? 'badge-danger' : 'badge-warning'}`}>{a.status}</span>
                      </li>
                    ))}
                    {attendance.filter(a => a.status !== 'hadir').length === 0 && (
                      <li style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Tidak ada ketidakhadiran tercatat akhir-akhir ini.</li>
                    )}
                  </ul>
                </div>

                <div className="glass-panel">
                  <h4 style={{ fontSize: '1.1rem', marginBottom: '1rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem' }}>Log Perilaku Terbaru</h4>
                  <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {behaviors.slice(0, 5).map(b => (
                      <li key={b.id} style={{ display: 'flex', justifyContent: 'space-between', flexDirection: 'column', gap: '0.2rem', fontSize: '0.85rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span><strong>{b.students?.name}</strong></span>
                          <span className={`badge ${b.type === 'positif' ? 'badge-success' : 'badge-danger'}`}>{b.type}</span>
                        </div>
                        <span style={{ color: 'var(--text-secondary)' }}>{b.description}</span>
                      </li>
                    ))}
                    {behaviors.length === 0 && (
                      <li style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Belum ada log perilaku tercatat.</li>
                    )}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* TAB CONTENT: STUDENTS */}
          {activeTab === 'students' && (
            <div className="glass-panel animate-fade-in">
              <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>Daftar Biodata Siswa ({students.length})</h3>
              <div className="table-wrapper">
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Foto</th>
                      <th>Nama Siswa</th>
                      <th>Alamat</th>
                      <th>Uang Jajan</th>
                      <th>Transportasi</th>
                      <th>Ortu (Ayah/Ibu)</th>
                      <th>PIP/KIP</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.length === 0 ? (
                      <tr>
                        <td colSpan="7" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Belum ada siswa di kelas ini.</td>
                      </tr>
                    ) : (
                      students.map(s => (
                        <tr key={s.id}>
                          <td>
                            <img
                              src={s.photo_url || 'https://via.placeholder.com/150'}
                              alt={s.name}
                              style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--glass-border)' }}
                            />
                          </td>
                          <td style={{ fontWeight: 700, color: '#fff' }}>{s.name}</td>
                          <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{s.address || '-'}</td>
                          <td>{s.pocket_money || '-'}</td>
                          <td style={{ fontSize: '0.85rem' }}>{s.transport_to_school || '-'}</td>
                          <td style={{ fontSize: '0.85rem' }}>{s.parent_father || '-'}/{s.parent_mother || '-'}</td>
                          <td>
                            <span className={`badge ${s.pip_kip_status === 'Ya' ? 'badge-success' : 'badge-danger'}`}>
                              {s.pip_kip_status || 'Tidak'}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB CONTENT: ATTENDANCE */}
          {activeTab === 'attendance' && (
            <div className="glass-panel animate-fade-in">
              <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>Rekap Absensi Harian</h3>
              <div className="table-wrapper">
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Tanggal</th>
                      <th>Nama Siswa</th>
                      <th>Status Kehadiran</th>
                      <th>Catatan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendance.length === 0 ? (
                      <tr>
                        <td colSpan="4" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Tidak ada data absensi tercatat.</td>
                      </tr>
                    ) : (
                      attendance.map(a => (
                        <tr key={a.id}>
                          <td>{new Date(a.date).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</td>
                          <td style={{ fontWeight: 700 }}>{a.students?.name}</td>
                          <td>
                            <span className={`badge ${a.status === 'hadir' ? 'badge-success' : a.status === 'alfa' ? 'badge-danger' : 'badge-warning'}`}>
                              {a.status}
                            </span>
                          </td>
                          <td style={{ fontStyle: 'italic', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{a.notes || '-'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB CONTENT: BEHAVIOR */}
          {activeTab === 'behavior' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem' }}>
              <div className="glass-panel animate-fade-in">
                <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem', color: 'var(--accent-secondary)' }}>Catatan Perilaku Siswa</h3>
                <div className="table-wrapper">
                  <table className="custom-table">
                    <thead>
                      <tr>
                        <th>Siswa</th>
                        <th>Perilaku</th>
                        <th>Deskripsi</th>
                        <th>Follow Up</th>
                      </tr>
                    </thead>
                    <tbody>
                      {behaviors.length === 0 ? (
                        <tr>
                          <td colSpan="4" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Tidak ada catatan perilaku.</td>
                        </tr>
                      ) : (
                        behaviors.map(b => (
                          <tr key={b.id}>
                            <td style={{ fontWeight: 700 }}>{b.students?.name}</td>
                            <td>
                              <span className={`badge ${b.type === 'positif' ? 'badge-success' : 'badge-danger'}`}>
                                {b.type}
                              </span>
                            </td>
                            <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{b.description}</td>
                            <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{b.follow_up || '-'}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="glass-panel animate-fade-in">
                <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem', color: 'var(--warning)' }}>Proses Bimbingan & Konseling</h3>
                <div className="table-wrapper">
                  <table className="custom-table">
                    <thead>
                      <tr>
                        <th>Siswa</th>
                        <th>Masalah</th>
                        <th>Solusi</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {guidance.length === 0 ? (
                        <tr>
                          <td colSpan="4" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Tidak ada proses bimbingan.</td>
                        </tr>
                      ) : (
                        guidance.map(g => (
                          <tr key={g.id}>
                            <td style={{ fontWeight: 700 }}>{g.students?.name}</td>
                            <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{g.issue}</td>
                            <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{g.solution || '-'}</td>
                            <td>
                              <span className={`badge ${g.status === 'selesai' ? 'badge-success' : 'badge-warning'}`}>
                                {g.status}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB CONTENT: VISITS */}
          {activeTab === 'visits' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem' }}>
              <div className="glass-panel animate-fade-in">
                <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem', color: 'var(--accent-primary)', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <HeartHandshake size={18} />
                  <span>Log Wawancara Wali Kelas</span>
                </h3>
                <div className="table-wrapper">
                  <table className="custom-table">
                    <thead>
                      <tr>
                        <th>Siswa</th>
                        <th>Topik Wawancara</th>
                        <th>Catatan</th>
                      </tr>
                    </thead>
                    <tbody>
                      {interviews.length === 0 ? (
                        <tr>
                          <td colSpan="3" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Belum ada log wawancara.</td>
                        </tr>
                      ) : (
                        interviews.map(i => (
                          <tr key={i.id}>
                            <td style={{ fontWeight: 700 }}>{i.students?.name}</td>
                            <td style={{ fontWeight: 600 }}>{i.topic}</td>
                            <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{i.notes}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="glass-panel animate-fade-in">
                <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem', color: 'var(--success)', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <HeartPulse size={18} />
                  <span>Log Home Visit (Kunjungan Rumah)</span>
                </h3>
                <div className="table-wrapper">
                  <table className="custom-table">
                    <thead>
                      <tr>
                        <th>Siswa</th>
                        <th>Tujuan</th>
                        <th>Catatan Kejadian</th>
                      </tr>
                    </thead>
                    <tbody>
                      {homeVisits.length === 0 ? (
                        <tr>
                          <td colSpan="3" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Belum ada log home visit.</td>
                        </tr>
                      ) : (
                        homeVisits.map(h => (
                          <tr key={h.id}>
                            <td style={{ fontWeight: 700 }}>{h.students?.name}</td>
                            <td style={{ fontWeight: 600 }}>{h.purpose}</td>
                            <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{h.incidents}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB CONTENT: GALLERY & SCHEDULES */}
          {activeTab === 'gallery' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem' }}>
              
              {/* Jadwal Pelajaran & Regu Piket */}
              <div className="glass-panel animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div>
                  <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem', color: 'var(--accent-secondary)', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <Calendar size={18} />
                    <span>Jadwal Pelajaran</span>
                  </h3>
                  <div className="table-wrapper">
                    <table className="custom-table">
                      <thead>
                        <tr>
                          <th>Hari</th>
                          <th>Mata Pelajaran</th>
                          <th>Jam</th>
                        </tr>
                      </thead>
                      <tbody>
                        {schedules.length === 0 ? (
                          <tr>
                            <td colSpan="3" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Jadwal pelajaran belum dimasukkan.</td>
                          </tr>
                        ) : (
                          schedules.map(sc => (
                            <tr key={sc.id}>
                              <td><strong>{sc.day}</strong></td>
                              <td>{sc.subject}</td>
                              <td>{sc.start_time} - {sc.end_time}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div>
                  <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem', color: 'var(--warning)', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <Users size={18} />
                    <span>Regu Piket Kelas</span>
                  </h3>
                  <div className="table-wrapper">
                    <table className="custom-table">
                      <thead>
                        <tr>
                          <th>Hari</th>
                          <th>Anggota Piket</th>
                        </tr>
                      </thead>
                      <tbody>
                        {['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'].map(day => {
                          const members = dutyRosters.filter(d => d.day === day).map(d => d.students?.name).join(', ');
                          return (
                            <tr key={day}>
                              <td><strong>{day}</strong></td>
                              <td style={{ fontSize: '0.9rem', color: members ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                                {members || 'Belum diatur'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Galeri Kelas */}
              <div className="glass-panel animate-fade-in">
                <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem', color: 'var(--accent-primary)', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <ImageIcon size={18} />
                  <span>Galeri Dokumentasi Kelas</span>
                </h3>
                {gallery.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                    Belum ada foto kegiatan kelas yang diunggah.
                  </div>
                ) : (
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                    gap: '1rem'
                  }}>
                    {gallery.map(g => (
                      <div key={g.id} style={{
                        background: 'rgba(255,255,255,0.02)',
                        border: '1px solid var(--glass-border)',
                        borderRadius: 'var(--radius-md)',
                        overflow: 'hidden'
                      }}>
                        <img
                          src={g.image_url}
                          alt={g.caption}
                          style={{ width: '100%', height: '100px', objectFit: 'cover' }}
                        />
                        <div style={{ padding: '0.5rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          {g.caption || 'Foto kegiatan'}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          )}

        </>
      )}

    </div>
  );
}
