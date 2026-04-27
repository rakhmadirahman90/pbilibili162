import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { FileText, Plus, Trash2, Download, Search, Loader2, UploadCloud, Eye, X, AlertCircle, Edit3, Save } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import imageCompression from 'browser-image-compression'; // Library untuk kompresi

export default function ManajemenDokumen() {
  const [docs, setDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // State untuk Modal & Editing
  const [formData, setFormData] = useState({ title: '', description: '' });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => { 
    fetchDocs(); 
  }, []);

  const fetchDocs = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setDocs(data || []);
    } catch (error: any) {
      console.error("Error fetching docs:", error.message);
    } finally {
      setLoading(false);
    }
  };

  // --- FITUR KOMPRESI & UPLOAD ---
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    let file = e.target.files?.[0];
    if (!file) return;
    if (!formData.title) {
      alert("Silakan isi Judul Dokumen terlebih dahulu!");
      e.target.value = '';
      return;
    }

    setUploading(true);
    try {
      // Logika Kompresi jika file adalah Gambar
      if (file.type.startsWith('image/')) {
        const options = {
          maxSizeMB: 0.5, // Maksimal 500KB
          maxWidthOrHeight: 1920,
          useWebWorker: true
        };
        file = await imageCompression(file, options);
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `docs/${fileName}`;

      // 1. Upload ke Storage
      let { error: uploadError } = await supabase.storage
        .from('assets')
        .upload(filePath, file);
      
      if (uploadError) throw uploadError;

      // 2. Dapatkan Public URL
      const { data: { publicUrl } } = supabase.storage
        .from('assets')
        .getPublicUrl(filePath);

      // 3. Simpan Metadata
      const { error: dbError } = await supabase.from('documents').insert([{
        title: formData.title,
        description: formData.description,
        file_url: publicUrl,
        file_type: fileExt?.toUpperCase(),
        file_size: file.size
      }]);

      if (dbError) throw dbError;

      setFormData({ title: '', description: '' });
      e.target.value = ''; 
      fetchDocs();
      alert("Dokumen berhasil dikompres & diunggah!");
    } catch (error: any) {
      alert("Gagal mengunggah: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  // --- FITUR EDIT ---
  const handleUpdate = async () => {
    if (!editingId) return;
    try {
      const { error } = await supabase
        .from('documents')
        .update({
          title: formData.title,
          description: formData.description
        })
        .eq('id', editingId);

      if (error) throw error;
      
      setEditingId(null);
      setFormData({ title: '', description: '' });
      fetchDocs();
      alert("Dokumen berhasil diperbarui!");
    } catch (error: any) {
      alert(error.message);
    }
  };

  const startEdit = (doc: any) => {
    setEditingId(doc.id);
    setFormData({ title: doc.title, description: doc.description || '' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const deleteDoc = async (id: string, fileUrl: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus dokumen ini?")) return;
    try {
      const urlParts = fileUrl.split('/');
      const fileName = urlParts[urlParts.length - 1];
      await supabase.storage.from('assets').remove([`docs/${fileName}`]);
      await supabase.from('documents').delete().eq('id', id);
      fetchDocs();
    } catch (error: any) {
      alert(error.message);
    }
  };

  const filteredDocs = docs.filter(doc => 
    doc.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-4 md:p-8 bg-[#050505] min-h-screen text-white font-sans relative">
      
      {/* MODAL PRATINJAU (In-Page Preview) */}
      <AnimatePresence>
        {previewUrl && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 md:p-10">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setPreviewUrl(null)}
              className="absolute inset-0 bg-black/90 backdrop-blur-xl"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-5xl h-full bg-zinc-900 rounded-[2rem] overflow-hidden border border-zinc-800 flex flex-col shadow-2xl"
            >
              <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50">
                <h3 className="text-sm font-black uppercase italic tracking-widest text-blue-500">Pratinjau Dokumen</h3>
                <button onClick={() => setPreviewUrl(null)} className="p-2 hover:bg-red-500/20 text-red-500 rounded-full transition-all">
                  <X size={24} />
                </button>
              </div>
              <div className="flex-1 bg-zinc-800/20">
                <iframe src={previewUrl} className="w-full h-full border-none" title="Preview" />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="max-w-6xl mx-auto mb-10">
        <h1 className="text-4xl font-black italic uppercase tracking-tighter flex items-center gap-3">
          <FileText className="text-blue-600" size={32} />
          Manajemen <span className="text-blue-600">Dokumen</span>
        </h1>
        <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-[0.3em] mt-2">
          Pusat Kendali Arsip Digital PB BILIBILI 162
        </p>
      </div>

      <div className="max-w-6xl mx-auto grid lg:grid-cols-3 gap-8">
        
        {/* Kolom Kiri: Form Upload/Edit */}
        <div className="lg:col-span-1">
          <div className="sticky top-24 bg-zinc-900/50 p-6 rounded-[2rem] border border-zinc-800 backdrop-blur-md shadow-xl">
            <h2 className="text-lg font-black uppercase italic mb-6 flex items-center gap-2">
              {editingId ? <Edit3 size={18} className="text-yellow-500" /> : <Plus size={18} className="text-blue-500" />}
              {editingId ? 'Edit Dokumen' : 'Tambah Arsip'}
            </h2>
            
            <div className="space-y-4">
              <input 
                type="text" placeholder="Judul Dokumen" 
                className="w-full bg-black border border-zinc-800 p-4 rounded-xl outline-none focus:border-blue-600 transition-all text-sm"
                value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})}
              />
              <textarea 
                placeholder="Keterangan..." 
                className="w-full bg-black border border-zinc-800 p-4 rounded-xl outline-none focus:border-blue-600 transition-all text-sm h-24 resize-none"
                value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})}
              />

              {editingId ? (
                <div className="flex gap-2">
                  <button onClick={handleUpdate} className="flex-1 bg-blue-600 hover:bg-blue-700 p-4 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all">
                    <Save size={16} /> Simpan Perubahan
                  </button>
                  <button onClick={() => { setEditingId(null); setFormData({title:'', description:''}); }} className="bg-zinc-800 p-4 rounded-xl hover:bg-zinc-700 transition-all">
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <label className={`flex flex-col items-center justify-center gap-3 p-8 border-2 border-dashed rounded-[1.5rem] transition-all cursor-pointer ${uploading ? 'border-zinc-700 bg-zinc-800/20' : 'border-zinc-800 hover:border-blue-600/50 hover:bg-blue-600/5'}`}>
                  {uploading ? <Loader2 className="animate-spin text-blue-500" size={32} /> : <UploadCloud size={32} className="text-zinc-600" />}
                  <div className="text-center">
                    <p className="text-[10px] font-black uppercase tracking-widest">{uploading ? 'Proses Kompresi...' : 'Klik untuk Upload'}</p>
                    <input type="file" hidden onChange={handleUpload} disabled={uploading} accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" />
                  </div>
                </label>
              )}
            </div>
          </div>
        </div>

        {/* Kolom Kanan: List Dokumen */}
        <div className="lg:col-span-2">
          <div className="relative mb-6">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" size={18} />
            <input 
              type="text" placeholder="Cari arsip..." 
              className="w-full bg-zinc-900/30 border border-zinc-800 py-4 pl-12 pr-6 rounded-2xl outline-none focus:border-blue-900/50 transition-all"
              value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="space-y-4">
            {loading ? (
              <div className="text-center py-20"><Loader2 className="animate-spin mx-auto text-zinc-700" size={40} /></div>
            ) : filteredDocs.map(doc => (
              <motion.div layout key={doc.id} className="group flex flex-col md:flex-row items-center justify-between bg-zinc-900/20 border border-zinc-800/50 p-5 rounded-3xl hover:border-blue-600/30 transition-all duration-300">
                <div className="flex items-center gap-5 w-full md:w-auto">
                  <div className="w-14 h-14 bg-zinc-800 rounded-2xl flex items-center justify-center text-zinc-500 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-inner">
                    <FileText size={24} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="bg-zinc-800 text-[8px] font-black px-2 py-0.5 rounded text-zinc-400 uppercase">{doc.file_type}</span>
                      <span className="text-[9px] text-zinc-600 font-bold uppercase">{new Date(doc.created_at).toLocaleDateString('id-ID')}</span>
                    </div>
                    <h4 className="font-bold text-sm uppercase tracking-tight group-hover:text-blue-400">{doc.title}</h4>
                    <p className="text-[11px] text-zinc-500 line-clamp-1">{doc.description}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-4 md:mt-0 pt-4 md:pt-0 border-t md:border-t-0 border-zinc-800 w-full md:w-auto">
                  <button onClick={() => setPreviewUrl(doc.file_url)} className="flex-1 md:flex-none bg-zinc-800 hover:bg-blue-600/20 hover:text-blue-400 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2">
                    <Eye size={14} /> View
                  </button>
                  <button onClick={() => startEdit(doc)} className="bg-zinc-800 hover:bg-yellow-600/20 hover:text-yellow-500 p-2.5 rounded-xl transition-all">
                    <Edit3 size={16} />
                  </button>
                  <button onClick={() => deleteDoc(doc.id, doc.file_url)} className="bg-red-600/10 text-red-500 hover:bg-red-600 hover:text-white p-2.5 rounded-xl transition-all">
                    <Trash2 size={16} />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}