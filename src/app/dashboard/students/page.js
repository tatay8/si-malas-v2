'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Plus, Search, Edit3, Trash2, X, Eye, Upload, ShieldCheck, AlertCircle } from 'lucide-react';

export default function ManageStudents() {
  const [classId, setClassId] = useState(null);
  const [students, setStudents] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Modal control
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('add'); // 'add', 'edit', 'view'
  const [activeStudent, setActiveStudent] = useState(null);

  // Form states matching exactly all request fields
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    ttl: '',
    parent_father: '',
    parent_mother: '',
    parent_marital_status: 'Menikah', // default
    living_with: 'Orang Tua', // default
    pip_kip_status: 'Tidak', // default
    pocket_money: '',
    transport_to_school: 'Bawa Motor Sendiri', // default
    hobby: '',
    ambition: '',
    achievement_sd: '',
    achievement_madrasah: '',
    quran_level: '',
    talent_interest: '',
    health_history: '',
    problem_history: '',
    photo_url: ''
  });

  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchClassAndStudents = async () => {
      setLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        // Ambil class_id wali kelas
        const { data: profile } = await supabase
          .from('profiles')
          .select('class_id')
          .eq('id', session.user.id)
          .single();

        if (profile && profile.class_id) {
          setClassId(profile.class_id);
          const { data: studentsData } = await supabase
            .from('students')
            .select('*')
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

  const openAddModal = () => {
    setModalMode('add');
    setFormData({
      name: '',
      address: '',
      ttl: '',
      parent_father: '',
      parent_mother: '',
      parent_marital_status: 'Menikah',
      living_with: 'Orang Tua',
      pip_kip_status: 'Tidak',
      pocket_money: '',
      transport_to_school: 'Bawa Motor Sendiri',
      hobby: '',
      ambition: '',
      achievement_sd: '',
      achievement_madrasah: '',
      quran_level: '',
      talent_interest: '',
      health_history: '',
      problem_history: '',
      photo_url: ''
    });
    setPhotoFile(null);
    setPhotoPreview('');
    setShowModal(true);
  };

  const openEditModal = (student) => {
    setModalMode('edit');
    setActiveStudent(student);
    setFormData({ ...student });
    setPhotoFile(null);
    setPhotoPreview(student.photo_url || '');
    setShowModal(true);
  };

  const openViewModal = (student) => {
    setModalMode('view');
    setActiveStudent(student);
    setShowModal(true);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPhotoFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setPhotoPreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveStudent = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      let finalPhotoUrl = formData.photo_url;

      // 1. Jika ada file foto baru, upload terlebih dahulu
      if (photoFile) {
        const fileExt = photoFile.name.split('.').pop();
        const fileName = `${classId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
        const filePath = `student/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('student-photos')
          .upload(filePath, photoFile, { cacheControl: '3600', upsert: true });

        if (uploadError) {
          throw new Error('Gagal mengunggah foto siswa. Pastikan bucket "student-photos" di Supabase Anda dikonfigurasi sebagai public.');
        }

        const { data: { publicUrl } } = supabase.storage
          .from('student-photos')
          .getPublicUrl(filePath);

        finalPhotoUrl = publicUrl;
      }

      const payload = {
        ...formData,
        name: formData.name.trim(),
        class_id: classId,
        photo_url: finalPhotoUrl
      };

      if (modalMode === 'add') {
        // Simpan siswa baru
        const { data, error: insertError } = await supabase
          .from('students')
          .insert([payload])
          .select();

        if (insertError) throw insertError;
        setSuccess(`Siswa ${payload.name} berhasil ditambahkan.`);
      } else {
        // Edit siswa yang ada
        const { error: updateError } = await supabase
          .from('students')
          .update(payload)
          .eq('id', activeStudent.id);

        if (updateError) throw updateError;
        setSuccess(`Biodata siswa ${payload.name} berhasil diperbarui.`);
      }

      // Reload list siswa
      const { data: studentsData } = await supabase
        .from('students')
        .select('*')
        .eq('class_id', classId)
        .order('name');
      setStudents(studentsData || []);
      
      setShowModal(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteStudent = async (studentId, studentName) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus data siswa ${studentName}? Seluruh data riwayat absen, perilaku, dan bimbingannya juga akan terhapus!`)) return;

    setError('');
    setSuccess('');

    try {
      const { error: deleteErr } = await supabase
        .from('students')
        .delete()
        .eq('id', studentId);

      if (deleteErr) throw deleteErr;

      setSuccess(`Data siswa ${studentName} berhasil dihapus.`);
      
      // Reload list siswa
      const { data: studentsData } = await supabase
        .from('students')
        .select('*')
        .eq('class_id', classId)
        .order('name');
      setStudents(studentsData || []);
    } catch (err) {
      setError(err.message);
    }
  };

  // Filter siswa berdasarkan search input
  const filteredStudents = students.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.address && s.address.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading && students.length === 0) {
    return <div style={{ color: 'var(--text-secondary)' }}>Memuat data siswa...</div>;
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

      {/* Kontrol List Siswa */}
      <div className="glass-panel" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ position: 'relative', flexGrow: 1, maxWidth: '400px' }}>
          <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Cari nama atau alamat siswa..."
            className="form-input"
            style={{ paddingLeft: '2.5rem' }}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button onClick={openAddModal} className="btn btn-primary">
          <Plus size={16} />
          <span>Tambah Siswa</span>
        </button>
      </div>

      {/* Tabel Siswa */}
      <div className="glass-panel">
        <div className="table-wrapper">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Foto</th>
                <th>Nama Siswa</th>
                <th>TTL</th>
                <th>Alamat</th>
                <th>Uang Jajan</th>
                <th>Penerima PIP/KIP</th>
                <th style={{ textAlign: 'right' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Tidak ada data siswa ditemukan.</td>
                </tr>
              ) : (
                filteredStudents.map(s => (
                  <tr key={s.id}>
                    <td>
                      <img
                        src={s.photo_url || 'https://via.placeholder.com/150'}
                        alt={s.name}
                        style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--glass-border)' }}
                      />
                    </td>
                    <td style={{ fontWeight: 700, color: '#fff' }}>{s.name}</td>
                    <td style={{ fontSize: '0.85rem' }}>{s.ttl || '-'}</td>
                    <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{s.address || '-'}</td>
                    <td>{s.pocket_money || '-'}</td>
                    <td>
                      <span className={`badge ${s.pip_kip_status === 'Ya' ? 'badge-success' : 'badge-danger'}`}>
                        {s.pip_kip_status || 'Tidak'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right', display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                      <button onClick={() => openViewModal(s)} className="btn btn-secondary" style={{ padding: '0.4rem', borderRadius: 'var(--radius-sm)' }} title="Lihat Detail">
                        <Eye size={15} />
                      </button>
                      <button onClick={() => openEditModal(s)} className="btn btn-secondary" style={{ padding: '0.4rem', borderRadius: 'var(--radius-sm)', color: 'var(--accent-secondary)' }} title="Edit Biodata">
                        <Edit3 size={15} />
                      </button>
                      <button onClick={() => handleDeleteStudent(s.id, s.name)} className="btn btn-danger" style={{ padding: '0.4rem', borderRadius: 'var(--radius-sm)' }} title="Hapus Siswa">
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL EDIT / ADD / VIEW */}
      {showModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(5, 7, 16, 0.85)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: '2rem'
        }}>
          <div className="glass-panel animate-fade-in" style={{
            width: '100%',
            maxWidth: '850px',
            maxHeight: '90vh',
            overflowY: 'auto',
            position: 'relative',
            background: 'var(--bg-secondary)'
          }}>
            <button
              onClick={() => setShowModal(false)}
              style={{ position: 'absolute', right: '1.5rem', top: '1.5rem', background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
            >
              <X size={20} />
            </button>

            <h2 style={{ fontSize: '1.4rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.75rem' }}>
              {modalMode === 'add' && 'Tambah Siswa Baru'}
              {modalMode === 'edit' && `Ubah Biodata: ${activeStudent?.name}`}
              {modalMode === 'view' && `Detail Lengkap Siswa: ${activeStudent?.name}`}
            </h2>

            {modalMode === 'view' ? (
              // TAMPILAN DETAIL VIEW
              <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: '2rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                  <img
                    src={activeStudent?.photo_url || 'https://via.placeholder.com/150'}
                    alt={activeStudent?.name}
                    style={{ width: '130px', height: '160px', borderRadius: 'var(--radius-md)', objectFit: 'cover', border: '2px solid var(--accent-primary)' }}
                  />
                  <span className={`badge ${activeStudent?.pip_kip_status === 'Ya' ? 'badge-success' : 'badge-danger'}`}>
                    PIP/KIP: {activeStudent?.pip_kip_status || 'Tidak'}
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', fontSize: '0.9rem' }}>
                  <div>
                    <h4 style={{ color: 'var(--accent-secondary)', borderBottom: '1px dashed var(--glass-border)', paddingBottom: '0.25rem', marginBottom: '0.5rem' }}>Identitas Diri</h4>
                    <p style={{ marginBottom: '0.4rem' }}><strong>Nama:</strong> {activeStudent?.name}</p>
                    <p style={{ marginBottom: '0.4rem' }}><strong>TTL:</strong> {activeStudent?.ttl || '-'}</p>
                    <p style={{ marginBottom: '0.4rem' }}><strong>Alamat:</strong> {activeStudent?.address || '-'}</p>
                    <p style={{ marginBottom: '0.4rem' }}><strong>Hobi:</strong> {activeStudent?.hobby || '-'}</p>
                    <p style={{ marginBottom: '0.4rem' }}><strong>Cita-cita:</strong> {activeStudent?.ambition || '-'}</p>
                  </div>

                  <div>
                    <h4 style={{ color: 'var(--accent-secondary)', borderBottom: '1px dashed var(--glass-border)', paddingBottom: '0.25rem', marginBottom: '0.5rem' }}>Orang Tua & Tempat Tinggal</h4>
                    <p style={{ marginBottom: '0.4rem' }}><strong>Nama Ayah:</strong> {activeStudent?.parent_father || '-'}</p>
                    <p style={{ marginBottom: '0.4rem' }}><strong>Nama Ibu:</strong> {activeStudent?.parent_mother || '-'}</p>
                    <p style={{ marginBottom: '0.4rem' }}><strong>Pernikahan Ortu:</strong> {activeStudent?.parent_marital_status || '-'}</p>
                    <p style={{ marginBottom: '0.4rem' }}><strong>Tinggal Bersama:</strong> {activeStudent?.living_with || '-'}</p>
                  </div>

                  <div>
                    <h4 style={{ color: 'var(--accent-secondary)', borderBottom: '1px dashed var(--glass-border)', paddingBottom: '0.25rem', marginBottom: '0.5rem' }}>Ekonomi & Transportasi</h4>
                    <p style={{ marginBottom: '0.4rem' }}><strong>Uang Jajan:</strong> {activeStudent?.pocket_money || '-'}</p>
                    <p style={{ marginBottom: '0.4rem' }}><strong>Ke Sekolah:</strong> {activeStudent?.transport_to_school || '-'}</p>
                    <p style={{ marginBottom: '0.4rem' }}><strong>Penerima KIP/PIP:</strong> {activeStudent?.pip_kip_status || 'Tidak'}</p>
                  </div>

                  <div>
                    <h4 style={{ color: 'var(--accent-secondary)', borderBottom: '1px dashed var(--glass-border)', paddingBottom: '0.25rem', marginBottom: '0.5rem' }}>Keagamaan & Minat Bakat</h4>
                    <p style={{ marginBottom: '0.4rem' }}><strong>Mengaji Sampai:</strong> {activeStudent?.quran_level || '-'}</p>
                    <p style={{ marginBottom: '0.4rem' }}><strong>Bakat/Minat:</strong> {activeStudent?.talent_interest || '-'}</p>
                    <p style={{ marginBottom: '0.4rem' }}><strong>Prestasi SD:</strong> {activeStudent?.achievement_sd || '-'}</p>
                    <p style={{ marginBottom: '0.4rem' }}><strong>Prestasi Madrasah:</strong> {activeStudent?.achievement_madrasah || '-'}</p>
                  </div>

                  <div style={{ gridColumn: 'span 2' }}>
                    <h4 style={{ color: 'var(--danger)', borderBottom: '1px dashed var(--glass-border)', paddingBottom: '0.25rem', marginBottom: '0.5rem' }}>Riwayat Kesehatan & Masalah</h4>
                    <p style={{ marginBottom: '0.4rem' }}><strong>Riwayat Kesehatan:</strong> {activeStudent?.health_history || 'Tidak ada riwayat sakit berat.'}</p>
                    <p style={{ marginBottom: '0.4rem' }}><strong>Riwayat Masalah:</strong> {activeStudent?.problem_history || 'Tidak ada catatan masalah/pelanggaran.'}</p>
                  </div>
                </div>
              </div>
            ) : (
              // FORM ADD / EDIT
              <form onSubmit={handleSaveStudent} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem' }}>
                  
                  {/* FOTO SISWA */}
                  <div style={{ gridColumn: 'span 2', display: 'flex', gap: '1.5rem', alignItems: 'center', background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--glass-border)' }}>
                    <div style={{ position: 'relative', width: '100px', height: '120px', background: '#0a0f1d', borderRadius: 'var(--radius-sm)', border: '1px solid var(--glass-border)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {photoPreview ? (
                        <img src={photoPreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Tanpa Foto</span>
                      )}
                    </div>
                    <div>
                      <h4 style={{ fontSize: '0.9rem', marginBottom: '0.25rem' }}>Foto Siswa</h4>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Unggah pasfoto terbaru siswa (.jpg/.png, maks 2MB)</p>
                      <label className="btn btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.8rem', cursor: 'pointer' }}>
                        <Upload size={14} />
                        <span>Pilih Foto</span>
                        <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoChange} />
                      </label>
                    </div>
                  </div>

                  {/* IDENTITAS PRIBADI */}
                  <div className="form-group">
                    <label className="form-label">Nama Lengkap Siswa</label>
                    <input type="text" name="name" className="form-input" value={formData.name} onChange={handleInputChange} required />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Tempat, Tanggal Lahir (TTL)</label>
                    <input type="text" name="ttl" className="form-input" placeholder="Contoh: Ciamis, 12 April 2012" value={formData.ttl} onChange={handleInputChange} />
                  </div>

                  <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <label className="form-label">Alamat Rumah Lengkap</label>
                    <input type="text" name="address" className="form-input" placeholder="Dusun, RT/RW, Desa, Kecamatan" value={formData.address} onChange={handleInputChange} />
                  </div>

                  {/* KELUARGA */}
                  <div className="form-group">
                    <label className="form-label">Nama Lengkap Ayah</label>
                    <input type="text" name="parent_father" className="form-input" value={formData.parent_father} onChange={handleInputChange} />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Nama Lengkap Ibu</label>
                    <input type="text" name="parent_mother" className="form-input" value={formData.parent_mother} onChange={handleInputChange} />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Status Pernikahan Orang Tua</label>
                    <select name="parent_marital_status" className="form-select" value={formData.parent_marital_status} onChange={handleInputChange}>
                      <option value="Menikah">Menikah</option>
                      <option value="Cerai Hidup">Cerai Hidup</option>
                      <option value="Cerai Mati">Cerai Mati</option>
                      <option value="Lainnya">Lainnya</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Tinggal Bersama</label>
                    <select name="living_with" className="form-select" value={formData.living_with} onChange={handleInputChange}>
                      <option value="Orang Tua">Orang Tua</option>
                      <option value="Wali / Saudara">Wali / Saudara</option>
                      <option value="Kos / Sendiri">Kos / Sendiri</option>
                    </select>
                  </div>

                  {/* EKONOMI & TRANSPORTASI */}
                  <div className="form-group">
                    <label className="form-label">Penerima PIP / KIP</label>
                    <select name="pip_kip_status" className="form-select" value={formData.pip_kip_status} onChange={handleInputChange}>
                      <option value="Ya">Ya</option>
                      <option value="Tidak">Tidak</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Besar Uang Jajan Harian</label>
                    <input type="text" name="pocket_money" className="form-input" placeholder="Contoh: 10.000 / hari" value={formData.pocket_money} onChange={handleInputChange} />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Alat Transportasi Ke Sekolah</label>
                    <select name="transport_to_school" className="form-select" value={formData.transport_to_school} onChange={handleInputChange}>
                      <option value="Bawa Motor Sendiri">Bawa Motor Sendiri</option>
                      <option value="Diantar Orang Tua">Diantar Orang Tua</option>
                      <option value="Bersama Teman">Bersama Teman</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Mengaji Sampai</label>
                    <input type="text" name="quran_level" className="form-input" placeholder="Contoh: Iqra 6, Surah Yasin, Al-Baqarah" value={formData.quran_level} onChange={handleInputChange} />
                  </div>

                  {/* MINAT BAKAT & PRESTASI */}
                  <div className="form-group">
                    <label className="form-label">Hobi</label>
                    <input type="text" name="hobby" className="form-input" value={formData.hobby} onChange={handleInputChange} />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Cita-Cita</label>
                    <input type="text" name="ambition" className="form-input" value={formData.ambition} onChange={handleInputChange} />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Bakat / Minat Siswa</label>
                    <input type="text" name="talent_interest" className="form-input" placeholder="Contoh: Menggambar, Sepak Bola" value={formData.talent_interest} onChange={handleInputChange} />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Prestasi Di SD</label>
                    <input type="text" name="achievement_sd" className="form-input" placeholder="Juara 1 Lomba Menggambar, dll" value={formData.achievement_sd} onChange={handleInputChange} />
                  </div>

                  <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <label className="form-label">Prestasi Di Madrasah / Keagamaan</label>
                    <input type="text" name="achievement_madrasah" className="form-input" placeholder="Juara 2 MTQ tingkat desa, dll" value={formData.achievement_madrasah} onChange={handleInputChange} />
                  </div>

                  {/* KESEHATAN & RIWAYAT MASALAH */}
                  <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <label className="form-label">Riwayat Kesehatan (Alergi / Penyakit Bawaan)</label>
                    <input type="text" name="health_history" className="form-input" placeholder="Kosongkan jika tidak ada sakit bawaan" value={formData.health_history} onChange={handleInputChange} />
                  </div>

                  <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <label className="form-label">Riwayat Masalah (Masalah Perilaku di SD / Diri)</label>
                    <input type="text" name="problem_history" className="form-input" placeholder="Kosongkan jika anak berkelakuan baik" value={formData.problem_history} onChange={handleInputChange} />
                  </div>

                </div>

                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1.5rem', borderTop: '1px solid var(--glass-border)', paddingTop: '1.25rem' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)} disabled={saving}>
                    Batal
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? 'Menyimpan...' : 'Simpan Data Siswa'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
