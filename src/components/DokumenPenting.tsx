import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { FileDown, Search, Eye, FileText, Clock, DownloadCloud, X, Loader2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function DokumenPenting() {
  const [docs, setDocs] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  
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
    <div id="dokumen-section" className="max-w-7xl mx-auto px-6 py-24 min-h-screen text-zinc-100 relative font-sans">
      
      {/* --- MODAL PRATINJAU INTEGRASI --- */}
      <AnimatePresence>
        {selectedDocUrl && (
          <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 md:p-12">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setSelectedDocUrl(null)}
              className="absolute inset-0 bg-black/95 backdrop-blur-md"
            />
            
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-5xl h-[85vh] bg-zinc-900 border border-zinc-800 rounded-[2.5rem] overflow-hidden flex flex-col shadow-[0_0_50px_rgba(37,99,235,0.2)]"
            >
              <div className="flex items-center justify-between p-6 border-b border-zinc-800 bg-zinc-900/80 backdrop-blur-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(37,99,235,0.4)]">
                    <FileText size={20} className="text-white" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black uppercase italic tracking-[0.2em] text-blue-500">Document Vault</h3>
                    <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-tight">PB Bilibili 162 Official Archive</p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedDocUrl(null)}
                  className="p-3 hover:bg-red-500/10 text-red-500 rounded-full transition-all active:scale-90 border border-transparent hover:border-red-500/20"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="flex-1 bg-zinc-950">
                <iframe src={`${selectedDocUrl}#toolbar=0`} className="w-full h-full border-none" title="Preview" />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- HEADER SECTION --- */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
        className="text-center mb-24"
      >
        <h2 className="text-5xl md:text-7xl font-black italic uppercase tracking-tighter mb-6">
          DOKUMEN <span className="text-blue-600 drop-shadow-[0_0_20px_rgba(37,99,235,0.3)]">PENTING</span>
        </h2>
        <div className="flex items-center justify-center gap-4">
          <div className="h-[2px] w-16 bg-gradient-to-r from-transparent to-blue-600"></div>
          <p className="text-zinc-400 uppercase text-[11px] font-black tracking-[0.5em]">Arsip Resmi PB Bilibili 162</p>
          <div className="h-[2px] w-16 bg-gradient-to-l from-transparent to-blue-600"></div>
        </div>
      </motion.div>

      {/* --- SEARCH BAR --- */}
      <div className="relative max-w-3xl mx-auto mb-20 group">
        <div className="absolute inset-0 bg-blue-600/10 blur-[60px] group-hover:bg-blue-600/15 transition-all -z-10"></div>
        <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-blue-500" size={22} />
        <input 
          type="text" 
          placeholder="Cari judul dokumen atau deskripsi..." 
          className="w-full bg-zinc-900/60 border border-zinc-800 rounded-3xl py-6 pl-16 pr-8 outline-none focus:border-blue-600/50 focus:ring-4 focus:ring-blue-600/5 transition-all backdrop-blur-2xl text-base text-zinc-100 placeholder:text-zinc-600 font-medium"
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* --- GRID LIST --- */}
      {loading ? (
        <div className="grid md:grid-cols-2 gap-8">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-56 bg-zinc-900/40 rounded-[2.5rem] border border-zinc-800 animate-pulse"></div>
          ))}
        </div>
      ) : (
        <>
          <div className="grid md:grid-cols-2 gap-10">
            <AnimatePresence mode='popLayout'>
              {filteredDocs.map((doc, index) => (
                <motion.div
                  key={doc.id} layout
                  initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }}
                  transition={{ delay: index * 0.05 }}
                  className="group relative bg-zinc-900/30 border border-zinc-800/80 p-10 rounded-[3rem] hover:border-blue-600/50 hover:bg-zinc-900/60 transition-all duration-500 overflow-hidden"
                >
                  {/* Decorative Icon Background */}
                  <FileText className="absolute -bottom-10 -right-10 text-white/[0.03] group-hover:text-blue-600/[0.05] transition-all duration-700 rotate-12" size={240} />

                  <div className="relative flex flex-col h-full z-10">
                    <div className="flex justify-between items-start mb-8">
                      <div className="flex items-center gap-5">
                        <div className="w-20 h-20 bg-zinc-800 border border-zinc-700/50 rounded-3xl flex items-center justify-center text-zinc-400 group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-500 group-hover:shadow-[0_10px_30px_rgba(37,99,235,0.3)] transition-all duration-500">
                          <FileText size={36} />
                        </div>
                        <div>
                          <div className="flex items-center gap-3 mb-2">
                            <span className="px-3 py-1 rounded-lg bg-zinc-800 text-[10px] font-black text-zinc-200 uppercase tracking-widest border border-zinc-700 group-hover:bg-blue-500/20 group-hover:border-blue-500/30 group-hover:text-blue-300">
                              {doc.file_type || 'PDF'}
                            </span>
                            <span className="flex items-center gap-1.5 text-[10px] text-zinc-400 font-black uppercase tracking-tighter">
                              <Clock size={12} className="text-blue-500" /> {new Date(doc.created_at).toLocaleDateString('id-ID')}
                            </span>
                          </div>
                          <h3 className="text-2xl font-black uppercase italic leading-tight tracking-tighter text-zinc-100 group-hover:text-white transition-colors">
                            {doc.title}
                          </h3>
                        </div>
                      </div>
                    </div>

                    <p className="text-zinc-400 text-sm leading-relaxed mb-10 line-clamp-2 pr-12 group-hover:text-zinc-300 transition-colors">
                      {doc.description || "Arsip resmi dokumen kepengurusan dan kegiatan PB Bilibili 162."}
                    </p>

                    <div className="mt-auto flex flex-wrap items-center justify-between gap-6 pt-8 border-t border-zinc-800/80">
                      <div className="flex gap-3">
                        <button 
                          onClick={() => setSelectedDocUrl(doc.file_url)}
                          className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest bg-zinc-800/80 hover:bg-zinc-700 text-zinc-200 px-6 py-4 rounded-2xl transition-all active:scale-95 border border-zinc-700/50"
                        >
                          <Eye size={16} className="text-blue-500" /> Pratinjau
                        </button>
                        
                        <a 
                          href={doc.file_url} download
                          className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest bg-blue-600 hover:bg-blue-500 text-white px-6 py-4 rounded-2xl transition-all active:scale-95 shadow-[0_10px_20px_rgba(37,99,235,0.2)]"
                        >
                          <DownloadCloud size={16} /> Unduh
                        </a>
                      </div>
                      <div className="text-right">
                        <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest mb-1">Ukuran File</p>
                        <span className="text-xs font-mono text-zinc-300 font-bold bg-zinc-800 px-2 py-1 rounded">
                          {formatFileSize(doc.file_size)}
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* --- EMPTY STATE --- */}
          {filteredDocs.length === 0 && (
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="text-center py-32 bg-zinc-900/20 rounded-[4rem] border border-dashed border-zinc-800"
            >
              <div className="w-24 h-24 bg-zinc-800/50 rounded-full flex items-center justify-center mx-auto mb-8 text-zinc-700">
                <AlertCircle size={48} />
              </div>
              <h3 className="text-2xl font-black text-zinc-500 uppercase italic">Dokumen Tidak Ditemukan</h3>
              <p className="text-zinc-600 text-sm mt-3 font-bold uppercase tracking-widest">Gunakan kata kunci pencarian yang berbeda</p>
            </motion.div>
          )}
        </>
      )}

      {/* --- FOOTER INFO --- */}
      <div className="mt-32 p-12 rounded-[3.5rem] bg-gradient-to-br from-zinc-900 to-black border border-zinc-800 flex flex-col md:flex-row items-center justify-between gap-10 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/5 blur-[100px] -z-10"></div>
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 rounded-2xl bg-blue-600/10 border border-blue-600/20 flex items-center justify-center">
            <DownloadCloud size={30} className="text-blue-500" />
          </div>
          <div>
            <h4 className="font-black italic uppercase text-lg leading-none mb-2 text-white">Butuh Dokumen Lain?</h4>
            <p className="text-sm text-zinc-400 max-w-md font-medium leading-relaxed">
              Jika dokumen yang Anda cari tidak tersedia, silakan hubungi <span className="text-blue-500">Sekretariat PB Bilibili 162</span> untuk permintaan arsip.
            </p>
          </div>
        </div>
        <button 
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="group px-10 py-5 bg-zinc-100 text-black rounded-[1.5rem] text-xs font-black uppercase tracking-[0.2em] hover:bg-blue-600 hover:text-white transition-all duration-500 shadow-xl flex items-center gap-3"
        >
          Kembali Ke Atas
        </button>
      </div>
    </div>
  );
}