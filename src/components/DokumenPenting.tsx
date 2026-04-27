import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { FileDown, Search, Eye, FileText, Clock, DownloadCloud, X, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function DokumenPenting() {
  const [docs, setDocs] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  
  // State untuk Modal Pratinjau
  const [selectedDocUrl, setSelectedDocUrl] = useState<string | null>(null);

  useEffect(() => {
    const getDocs = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (!error) setDocs(data || []);
      setLoading(false);
    };
    getDocs();
  }, []);

  // Helper untuk memformat ukuran file
  const formatFileSize = (bytes: number) => {
    if (!bytes) return '0 KB';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const filteredDocs = docs.filter(d => 
    d.title.toLowerCase().includes(search.toLowerCase()) ||
    d.description?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div id="dokumen-section" className="max-w-7xl mx-auto px-6 py-24 min-h-screen text-white relative">
      
      {/* --- MODAL PRATINJAU INTEGRASI --- */}
      <AnimatePresence>
        {selectedDocUrl && (
          <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 md:p-12">
            {/* Overlay Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedDocUrl(null)}
              className="absolute inset-0 bg-black/90 backdrop-blur-md"
            />
            
            {/* Content Container */}
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-5xl h-[85vh] bg-zinc-900 border border-zinc-800 rounded-[2rem] overflow-hidden flex flex-col shadow-2xl"
            >
              {/* Header Modal */}
              <div className="flex items-center justify-between p-5 border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-xl">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                    <FileText size={16} />
                  </div>
                  <h3 className="text-[10px] font-black uppercase italic tracking-[0.2em] text-blue-500">Pratinjau Dokumen</h3>
                </div>
                <button 
                  onClick={() => setSelectedDocUrl(null)}
                  className="p-2 hover:bg-red-500/10 text-red-500 rounded-full transition-all active:scale-90"
                >
                  <X size={24} />
                </button>
              </div>

              {/* Iframe View */}
              <div className="flex-1 bg-zinc-950">
                <iframe 
                  src={`${selectedDocUrl}#toolbar=0`} 
                  className="w-full h-full border-none"
                  title="Document Preview"
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- HEADER SECTION --- */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-center mb-20"
      >
        <h2 className="text-6xl font-black italic uppercase tracking-tighter mb-4">
          Dokumen <span className="text-blue-600">Penting</span>
        </h2>
        <div className="flex items-center justify-center gap-3">
          <div className="h-px w-12 bg-blue-600/50"></div>
          <p className="text-zinc-500 uppercase text-[10px] font-bold tracking-[0.4em]">Arsip Resmi PB Bilibili 162</p>
          <div className="h-px w-12 bg-blue-600/50"></div>
        </div>
      </motion.div>

      {/* --- SEARCH BAR --- */}
      <div className="relative max-w-2xl mx-auto mb-16">
        <div className="absolute inset-0 bg-blue-600/5 blur-3xl -z-10"></div>
        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-500" size={20} />
        <input 
          type="text" 
          placeholder="Cari judul dokumen atau deskripsi..." 
          className="w-full bg-zinc-900/40 border border-zinc-800/50 rounded-2xl py-5 pl-14 pr-6 outline-none focus:border-blue-600/50 focus:ring-4 focus:ring-blue-600/5 transition-all backdrop-blur-xl text-sm"
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* --- GRID LIST --- */}
      {loading ? (
        <div className="grid md:grid-cols-2 gap-6 animate-pulse">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-48 bg-zinc-900/50 rounded-[2rem] border border-zinc-800"></div>
          ))}
        </div>
      ) : (
        <>
          <div className="grid md:grid-cols-2 gap-8">
            <AnimatePresence mode='popLayout'>
              {filteredDocs.map((doc, index) => (
                <motion.div
                  key={doc.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: index * 0.05 }}
                  className="group relative bg-zinc-900/20 border border-zinc-800/50 p-8 rounded-[2.5rem] hover:border-blue-600/30 hover:bg-zinc-900/40 transition-all duration-500 shadow-xl overflow-hidden"
                >
                  {/* Dekorasi Background */}
                  <div className="absolute top-0 right-0 p-8 opacity-[0.02] group-hover:opacity-[0.05] transition-opacity">
                    <FileText size={120} />
                  </div>

                  <div className="relative flex flex-col h-full">
                    <div className="flex justify-between items-start mb-6">
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-zinc-800/50 border border-zinc-700/30 rounded-2xl flex items-center justify-center text-zinc-400 group-hover:bg-blue-600 group-hover:text-white transition-all duration-500 shadow-lg">
                          <FileText size={30} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="px-2 py-0.5 rounded-md bg-zinc-800 text-[9px] font-black text-zinc-500 uppercase tracking-widest group-hover:text-blue-400 transition-colors">
                              {doc.file_type || 'PDF'}
                            </span>
                            <span className="flex items-center gap-1 text-[9px] text-zinc-600 font-bold uppercase tracking-tighter">
                              <Clock size={10} className="text-blue-600/50" /> {new Date(doc.created_at).toLocaleDateString('id-ID')}
                            </span>
                          </div>
                          <h3 className="text-lg font-black uppercase italic leading-tight tracking-tight group-hover:text-white transition-colors">
                            {doc.title}
                          </h3>
                        </div>
                      </div>
                    </div>

                    <p className="text-zinc-500 text-xs leading-relaxed mb-8 line-clamp-2 pr-10">
                      {doc.description || "Tidak ada keterangan deskripsi untuk dokumen arsip ini."}
                    </p>

                    <div className="mt-auto flex flex-wrap items-center justify-between gap-4 pt-6 border-t border-zinc-800/50">
                      <div className="flex gap-2">
                        {/* Tombol Preview - Update URL state untuk memicu modal */}
                        <button 
                          onClick={() => setSelectedDocUrl(doc.file_url)}
                          className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest bg-zinc-800/50 hover:bg-zinc-700 px-5 py-3 rounded-xl transition-all active:scale-95 border border-zinc-700/30"
                        >
                          <Eye size={14} className="text-blue-500" /> View
                        </button>
                        
                        {/* Tombol Download */}
                        <a 
                          href={doc.file_url} 
                          download 
                          className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest bg-blue-600 hover:bg-blue-500 px-5 py-3 rounded-xl transition-all active:scale-95 shadow-lg shadow-blue-600/20"
                        >
                          <DownloadCloud size={14} /> Download
                        </a>
                      </div>
                      <span className="text-[10px] font-mono text-zinc-700 font-bold uppercase">
                        {formatFileSize(doc.file_size)}
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* --- EMPTY STATE --- */}
          {filteredDocs.length === 0 && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-32 bg-zinc-900/10 rounded-[3rem] border border-dashed border-zinc-800"
            >
              <div className="w-20 h-20 bg-zinc-800/50 rounded-full flex items-center justify-center mx-auto mb-6 text-zinc-700">
                <Search size={40} />
              </div>
              <h3 className="text-xl font-bold text-zinc-600 uppercase italic">Arsip Kosong</h3>
              <p className="text-zinc-700 text-xs mt-2 font-medium">Tidak ada dokumen yang sesuai dengan kata kunci Anda.</p>
            </motion.div>
          )}
        </>
      )}

      {/* --- FOOTER INFO --- */}
      <div className="mt-20 p-10 rounded-[3rem] bg-gradient-to-br from-blue-600/5 via-zinc-900/50 to-transparent border border-zinc-800/50 flex flex-col md:flex-row items-center justify-between gap-8">
        <div className="flex items-center gap-5">
          <div className="w-14 h-14 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center shadow-2xl">
            <DownloadCloud size={24} className="text-blue-600" />
          </div>
          <div>
            <h4 className="font-black italic uppercase text-sm leading-none mb-2">Pusat Bantuan Arsip</h4>
            <p className="text-[11px] text-zinc-500 max-w-sm">
              Seluruh dokumen di atas merupakan properti resmi **PB Bilibili 162**. Hubungi admin jika terdapat kendala akses file.
            </p>
          </div>
        </div>
        <button 
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="px-8 py-4 bg-zinc-900 border border-zinc-800 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-white hover:text-black hover:border-white transition-all duration-500 shadow-xl"
        >
          Kembali Ke Atas
        </button>
      </div>
    </div>
  );
}