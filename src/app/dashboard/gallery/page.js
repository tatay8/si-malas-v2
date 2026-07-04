'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Plus, Trash2, ShieldCheck, AlertCircle, Image as ImageIcon, Upload } from 'lucide-react';

export default function ClassGallery() {
  const [classId, setClassId] = useState(null);
  const [gallery, setGallery] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form states
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [caption, setCaption] = useState('');

  const fetchGallery = async () => {
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

        const { data: galleryData, error: fetchErr } = await supabase
          .from('class_gallery')
          .select('*')
          .eq('class_id', profile.class_id)
          .order('created_at', { ascending: false });

        if (fetchErr) throw fetchErr;
        setGallery(galleryData || []);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGallery();
  }, []);

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

  const handleUploadGallery = async (e) => {
    e.preventDefault();
    if (!photoFile) return;

    setUploading(true);
    setError('');
    setSuccess('');

    try {
      const fileExt = photoFile.name.split('.').pop();
      const fileName = `${classId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
      const filePath = `gallery/${fileName}`;

      // 1. Upload ke Supabase Storage bucket 'class-gallery'
      const { error: uploadError } = await supabase.storage
        .from('class-gallery')
        .upload(filePath, photoFile, { cacheControl: '3600', upsert: true });

      if (uploadError) {
        throw new Error('Gagal mengunggah foto. Pastikan bucket "class-gallery" di Supabase Anda sudah dikonfigurasi sebagai public.');
      }

      // 2. Dapatkan public url
      const { data: { publicUrl } } = supabase.storage
        .from('class-gallery')
        .getPublicUrl(filePath);

      // 3. Simpan record di database
      const { error: dbError } = await supabase
        .from('class_gallery')
        .insert([{
          class_id: classId,
          image_url: publicUrl,
          caption: caption.trim() || null
        }]);

      if (dbError) throw dbError;

      setSuccess('Foto berhasil ditambahkan ke galeri kelas.');
      setPhotoFile(null);
      setPhotoPreview('');
      setCaption('');
      fetchGallery();
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDeletePhoto = async (id) => {
    if (!confirm('Apakah Anda yakin ingin menghapus foto ini dari galeri?')) return;

    setError('');
    setSuccess('');

    try {
      const { error: deleteErr } = await supabase
        .from('class_gallery')
        .delete()
        .eq('id', id);

      if (deleteErr) throw deleteErr;

      setSuccess('Foto berhasil dihapus dari galeri.');
      fetchGallery();
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading && gallery.length === 0) {
    return <div style={{ color: 'var(--text-secondary)' }}>Memuat galeri kelas...</div>;
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
        
        {/* Form Unggah Foto Kegiatan */}
        <div className="glass-panel" style={{ height: 'fit-content' }}>
          <h3 style={{ fontSize: '1.2rem', marginBottom: '1.25rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <ImageIcon size={18} />
            <span>Upload Dokumentasi</span>
          </h3>
          <form onSubmit={handleUploadGallery} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            
            {/* Box Preview */}
            <div style={{
              width: '100%',
              height: '180px',
              background: 'rgba(0,0,0,0.2)',
              borderRadius: 'var(--radius-md)',
              border: '1px dashed var(--glass-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              position: 'relative'
            }}>
              {photoPreview ? (
                <img src={photoPreview} alt="Preview Unggah" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', cursor: 'pointer' }}>
                  <Upload size={24} />
                  <span style={{ fontSize: '0.85rem' }}>Pilih foto untuk diunggah</span>
                  <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoChange} required />
                </label>
              )}
            </div>

            {photoPreview && (
              <button
                type="button"
                className="btn btn-secondary"
                style={{ fontSize: '0.8rem', padding: '0.4rem' }}
                onClick={() => { setPhotoFile(null); setPhotoPreview(''); }}
              >
                Ganti Foto
              </button>
            )}

            <div className="form-group">
              <label className="form-label">Keterangan Foto (Caption)</label>
              <input
                type="text"
                placeholder="Contoh: Kerja bakti hari Jumat, Belajar kelompok..."
                className="form-input"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
              />
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={uploading || !photoFile}>
              <span>{uploading ? 'Mengunggah...' : 'Upload Galeri'}</span>
            </button>
          </form>
        </div>

        {/* Grid Gambar Galeri */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h3 style={{ fontSize: '1.2rem' }}>Dokumentasi Kegiatan Kelas</h3>
          
          {gallery.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              Belum ada foto kegiatan kelas yang diunggah.
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
              gap: '1rem',
              maxHeight: '500px',
              overflowY: 'auto',
              paddingRight: '0.5rem'
            }}>
              {gallery.map(img => (
                <div key={img.id} style={{
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid var(--glass-border)',
                  borderRadius: 'var(--radius-md)',
                  overflow: 'hidden',
                  position: 'relative'
                }}>
                  <img
                    src={img.image_url}
                    alt={img.caption || 'Foto kegiatan'}
                    style={{ width: '100%', height: '110px', objectFit: 'cover' }}
                  />
                  <div style={{ padding: '0.5rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    {img.caption || 'Foto kegiatan'}
                  </div>
                  
                  {/* Tombol Hapus */}
                  <button
                    onClick={() => handleDeletePhoto(img.id)}
                    style={{
                      position: 'absolute',
                      top: '0.25rem',
                      right: '0.25rem',
                      background: 'rgba(239, 68, 68, 0.8)',
                      border: 'none',
                      color: 'white',
                      cursor: 'pointer',
                      borderRadius: '50%',
                      width: '24px',
                      height: '24px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                    title="Hapus Foto"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
