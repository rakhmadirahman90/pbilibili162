import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { FileDown, Search, Eye, FileText, Clock, DownloadCloud } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function DokumenPenting() {
  const [docs, setDocs] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

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
    <div id="dokumen-section" className="max-w-7xl mx-auto px-6 py-24 min-h-screen text-white">
      {/* Header Section */}
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

      {/* Search Bar */}
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

      {/* Grid List */}
      {loading ? (
        <div className="grid md:grid-cols-2 gap-6 animate-pulse">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-40 bg-zinc-900/50 rounded-[2rem] border border-zinc-800"></div>
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
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: index * 0.05 }}
                  className="group relative bg-zinc-900/30 border border-zinc-800/50 p-8 rounded-[2.5rem] hover:border-blue-500/40 hover:bg-zinc-900/50 transition-all duration-500 shadow-2xl overflow-hidden"
                >
                  {/* Dekorasi Background */}
                  <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
                    <FileText size={120} />
                  </div>

                  <div className="relative flex flex-col h-full">
                    <div className="flex justify-between items-start mb-6">
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-blue-600/10 rounded-2xl flex items-center justify-center text-blue-500 group-hover:bg-blue-600 group-hover:text-white transition-all duration-500 shadow-lg">
                          <FileText size={32} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="px-2 py-0.5 rounded-md bg-zinc-800 text-[9px] font-bold text-zinc-400 uppercase tracking-wider group-hover:bg-blue-500/20 group-hover:text-blue-300 transition-colors">
                              {doc.file_type || 'PDF'}
                            </span>
                            <span className="flex items-center gap-1 text-[9px] text-zinc-500 font-medium">
                              <Clock size={10} /> {new Date(doc.created_at).toLocaleDateString('id-ID')}
                            </span>
                          </div>
                          <h3 className="text-xl font-black uppercase italic leading-tight tracking-tight group-hover:text-blue-400 transition-colors">
                            {doc.title}
                          </h3>
                        </div>
                      </div>
                    </div>

                    <p className="text-zinc-500 text-sm leading-relaxed mb-8 line-clamp-2 pr-10">
                      {doc.description || "Tidak ada deskripsi tersedia untuk dokumen ini."}
                    </p>

                    <div className="mt-auto flex items-center justify-between">
                      <div className="flex gap-3">
                        <a 
                          href={doc.file_url} 
                          target="_blank" 
                          rel="noreferrer"
                          className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest bg-zinc-800/80 hover:bg-zinc-700 px-5 py-3 rounded-xl transition-all active:scale-95"
                        >
                          <Eye size={14} className="text-blue-500" /> Pratinjau
                        </a>
                        <a 
                          href={doc.file_url} 
                          download 
                          className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest bg-blue-600 hover:bg-blue-500 px-5 py-3 rounded-xl transition-all active:scale-95 shadow-lg shadow-blue-600/20"
                        >
                          <DownloadCloud size={14} /> Unduh
                        </a>
                      </div>
                      <span className="text-[10px] font-mono text-zinc-600 font-bold">
                        {formatFileSize(doc.file_size)}
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Empty State */}
          {filteredDocs.length === 0 && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-20 bg-zinc-900/20 rounded-[3rem] border border-dashed border-zinc-800"
            >
              <div className="w-20 h-20 bg-zinc-800/50 rounded-full flex items-center justify-center mx-auto mb-6 text-zinc-600">
                <Search size={40} />
              </div>
              <h3 className="text-xl font-bold text-zinc-400 uppercase italic">Dokumen tidak ditemukan</h3>
              <p className="text-zinc-600 text-sm mt-2">Coba gunakan kata kunci pencarian yang lain.</p>
            </motion.div>
          )}
        </>
      )}

      {/* Footer Info */}
      <div className="mt-20 p-8 rounded-[2rem] bg-gradient-to-r from-blue-600/10 to-transparent border border-blue-600/10 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center shadow-lg">
            <DownloadCloud size={20} />
          </div>
          <div>
            <h4 className="font-black italic uppercase text-sm leading-none mb-1">Butuh bantuan dokumen?</h4>
            <p className="text-xs text-zinc-500">Hubungi sekretariat klub jika dokumen yang Anda cari tidak tersedia.</p>
          </div>
        </div>
        <button 
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="px-6 py-3 border border-zinc-800 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-white hover:text-black transition-all"
        >
          Kembali ke Atas
        </button>
      </div>
    </div>
  );
}