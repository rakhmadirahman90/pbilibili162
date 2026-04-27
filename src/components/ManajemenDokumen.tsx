import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { FileText, Plus, Trash2, Download, Search, Loader2, UploadCloud, Eye, X, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function ManajemenDokumen() {
  const [docs, setDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({ title: '', description: '' });

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

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!formData.title) {
      alert("Silakan isi Judul Dokumen terlebih dahulu!");
      e.target.value = ''; // Reset input file
      return;
    }

    setUploading(true);
    try {
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

      // 3. Simpan Metadata ke Database
      const { error: dbError } = await supabase.from('documents').insert([{
        title: formData.title,
        description: formData.description,
        file_url: publicUrl,
        file_type: fileExt?.toUpperCase(),
        file_size: file.size
      }]);

      if (dbError) throw dbError;

      // 4. Reset & Refresh
      setFormData({ title: '', description: '' });
      e.target.value = ''; // Clear file input
      fetchDocs();
      alert("Dokumen berhasil diunggah!");
    } catch (error: any) {
      alert("Gagal mengunggah: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  const deleteDoc = async (id: string, fileUrl: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus dokumen ini? File di storage juga akan dihapus.")) return;
    
    try {
      // Ekstrak nama file dari URL untuk menghapus di storage
      const urlParts = fileUrl.split('/');
      const fileName = urlParts[urlParts.length - 1];
      const filePath = `docs/${fileName}`;

      // Hapus dari Storage
      await supabase.storage.from('assets').remove([filePath]);
      
      // Hapus dari Database
      const { error } = await supabase.from('documents').delete().eq('id', id);
      if (error) throw error;

      fetchDocs();
    } catch (error: any) {
      alert("Gagal menghapus: " + error.message);
    }
  };

  const filteredDocs = docs.filter(doc => 
    doc.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-4 md:p-8 bg-[#050505] min-h-screen text-white font-sans">
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
        
        {/* Kolom Kiri: Form Upload */}
        <div className="lg:col-span-1">
          <div className="sticky top-24 bg-zinc-900/50 p-6 rounded-[2rem] border border-zinc-800 backdrop-blur-md">
            <h2 className="text-lg font-black uppercase italic mb-6 flex items-center gap-2">
              <Plus size={18} className="text-blue-500" /> Tambah Arsip
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2 block">Judul Dokumen</label>
                <input 
                  type="text" placeholder="Contoh: SK Kepengurusan 2026" 
                  className="w-full bg-black border border-zinc-800 p-4 rounded-xl outline-none focus:border-blue-600 transition-all text-sm"
                  value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})}
                />
              </div>
              
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2 block">Keterangan</label>
                <textarea 
                  placeholder="Opsional..." 
                  className="w-full bg-black border border-zinc-800 p-4 rounded-xl outline-none focus:border-blue-600 transition-all text-sm h-24 resize-none"
                  value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})}
                />
              </div>

              <div className="pt-2">
                <label className={`flex flex-col items-center justify-center gap-3 p-8 border-2 border-dashed rounded-[1.5rem] transition-all cursor-pointer ${uploading ? 'border-zinc-700 bg-zinc-800/20' : 'border-zinc-800 hover:border-blue-600/50 hover:bg-blue-600/5'}`}>
                  {uploading ? (
                    <Loader2 className="animate-spin text-blue-500" size={32} />
                  ) : (
                    <UploadCloud size={32} className="text-zinc-600" />
                  )}
                  <div className="text-center">
                    <p className="text-[10px] font-black uppercase tracking-widest leading-none">
                      {uploading ? 'Sedang Mengunggah...' : 'Pilih File Dokumen'}
                    </p>
                    <p className="text-[9px] text-zinc-600 mt-2">PDF, DOCX, ATAU JPG (MAX 10MB)</p>
                  </div>
                  <input type="file" hidden onChange={handleUpload} disabled={uploading} accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" />
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Kolom Kanan: List Dokumen */}
        <div className="lg:col-span-2">
          {/* Search Bar List */}
          <div className="relative mb-6">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" size={18} />
            <input 
              type="text" 
              placeholder="Cari dari daftar dokumen..." 
              className="w-full bg-zinc-900/30 border border-zinc-800 py-4 pl-12 pr-6 rounded-2xl outline-none focus:border-blue-900/50 transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="space-y-4">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 text-zinc-700">
                <Loader2 className="animate-spin mb-4" size={40} />
                <p className="text-[10px] font-bold uppercase tracking-widest">Memuat Data Arsip...</p>
              </div>
            ) : filteredDocs.length > 0 ? (
              filteredDocs.map(doc => (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={doc.id} 
                  className="group flex flex-col md:flex-row items-start md:items-center justify-between bg-zinc-900/20 border border-zinc-800/50 p-5 rounded-3xl hover:bg-zinc-900/40 hover:border-blue-600/30 transition-all duration-300"
                >
                  <div className="flex items-center gap-5 mb-4 md:mb-0">
                    <div className="w-14 h-14 bg-zinc-800 rounded-2xl flex items-center justify-center text-zinc-500 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-inner">
                      <FileText size={24} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="bg-zinc-800 text-[8px] font-black px-2 py-0.5 rounded text-zinc-400 group-hover:text-blue-300">
                          {doc.file_type || 'FILE'}
                        </span>
                        <span className="text-[9px] text-zinc-600 font-bold uppercase">
                          {new Date(doc.created_at).toLocaleDateString('id-ID')}
                        </span>
                      </div>
                      <h4 className="font-bold text-sm uppercase tracking-tight group-hover:text-blue-400 transition-colors">
                        {doc.title}
                      </h4>
                      <p className="text-[11px] text-zinc-500 line-clamp-1">{doc.description || 'Tidak ada deskripsi arsip'}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 w-full md:w-auto border-t md:border-t-0 border-zinc-800 pt-4 md:pt-0">
                    <a 
                      href={doc.file_url} 
                      target="_blank" 
                      rel="noreferrer"
                      className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-zinc-800 hover:bg-zinc-700 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                    >
                      <Eye size={14} /> Pratinjau
                    </a>
                    <button 
                      onClick={() => deleteDoc(doc.id, doc.file_url)} 
                      className="w-11 h-11 flex items-center justify-center bg-red-600/10 text-red-500 hover:bg-red-600 hover:text-white rounded-xl transition-all"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="text-center py-20 bg-zinc-900/10 rounded-[2.5rem] border border-dashed border-zinc-800">
                <AlertCircle className="mx-auto text-zinc-800 mb-4" size={48} />
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600">
                  {searchTerm ? 'Dokumen tidak ditemukan' : 'Belum ada dokumen yang diarsip'}
                </p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}