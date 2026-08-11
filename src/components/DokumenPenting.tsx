import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, Clock, DownloadCloud, Eye, FileText, Loader2, Search, X } from 'lucide-react';
import { supabase } from '../supabase';

export default function DokumenPenting() {
  const [docs, setDocs] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedDocUrl, setSelectedDocUrl] = useState<string | null>(null);
  const [selectedTitle, setSelectedTitle] = useState('Pratinjau Arsip');

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.from('documents').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        if (!cancelled) setDocs(data || []);
      } catch (error) { console.error('Error fetching documents:', error); }
      finally { if (!cancelled) setLoading(false); }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!selectedDocUrl) return;
    document.body.classList.add('modal-open');
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && setSelectedDocUrl(null);
    window.addEventListener('keydown', onKey);
    return () => { document.body.classList.remove('modal-open'); window.removeEventListener('keydown', onKey); };
  }, [selectedDocUrl]);

  const formatFileSize = (bytes: number) => {
    if (!bytes) return '0 KB';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), sizes.length - 1);
    return `${parseFloat((bytes / Math.pow(1024, i)).toFixed(1))} ${sizes[i]}`;
  };
  const filteredDocs = docs.filter(d => `${d.title || ''} ${d.description || ''}`.toLowerCase().includes(search.toLowerCase().trim()));

  return <section id="dokumen-section" className="w-full px-3 sm:px-4 lg:px-0 py-10 sm:py-16 lg:py-24 min-h-[100dvh] text-zinc-100 relative">
    <div className="max-w-7xl mx-auto">
      <header className="text-center mb-10 sm:mb-16"><h2 className="text-3xl sm:text-5xl md:text-7xl font-black italic uppercase tracking-tighter mb-5 break-words">DOKUMEN <span className="text-blue-600">PENTING</span></h2><div className="flex items-center justify-center gap-3 sm:gap-4"><div className="h-px w-8 sm:w-16 bg-blue-600" /><p className="text-zinc-400 uppercase text-[9px] sm:text-[11px] font-black tracking-[.22em] sm:tracking-[.4em]">Arsip Digital Authority Panel</p><div className="h-px w-8 sm:w-16 bg-blue-600" /></div></header>
      <div className="relative max-w-3xl mx-auto mb-8 sm:mb-16"><Search className="absolute left-5 top-1/2 -translate-y-1/2 text-blue-500" size={20} /><input value={search} onChange={e => setSearch(e.target.value)} type="search" placeholder="Cari judul dokumen atau deskripsi..." aria-label="Cari dokumen" className="w-full bg-zinc-900/80 border border-zinc-800 rounded-2xl sm:rounded-[2rem] py-4 sm:py-6 pl-14 pr-5 outline-none focus:border-blue-600/60 focus:ring-4 focus:ring-blue-600/10 text-zinc-100 placeholder:text-zinc-600 font-medium" /></div>
      {loading ? <div className="grid sm:grid-cols-2 gap-5 sm:gap-8">{[1,2,3,4].map(i => <div key={i} className="h-56 sm:h-60 bg-zinc-900/40 rounded-[2rem] sm:rounded-[3rem] border border-zinc-800/50 animate-pulse" />)}</div> : filteredDocs.length ? <div className="grid sm:grid-cols-2 gap-5 sm:gap-8">{filteredDocs.map((doc, index) => <motion.article key={doc.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * .04 }} className="group relative bg-zinc-900/50 border border-zinc-800/80 p-5 sm:p-8 lg:p-10 rounded-[2rem] sm:rounded-[3rem] hover:border-blue-600/50 transition-all shadow-2xl overflow-hidden"><div className="relative flex flex-col h-full min-w-0"><div className="flex gap-4 sm:gap-5 items-start mb-6"><div className="w-14 h-14 sm:w-20 sm:h-20 shrink-0 bg-zinc-800/50 border border-zinc-700/50 rounded-2xl sm:rounded-3xl flex items-center justify-center text-zinc-400 group-hover:bg-blue-600 group-hover:text-white transition-all"><FileText size={28} /></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2 mb-2"><span className="px-2.5 py-1 rounded-lg bg-zinc-800 text-[9px] font-black text-zinc-300 uppercase tracking-widest">{doc.file_type || 'PDF'}</span><span className="flex items-center gap-1 text-[9px] text-zinc-500 font-bold"><Clock size={11} className="text-blue-600" /> {new Date(doc.created_at).toLocaleDateString('id-ID')}</span></div><h3 className="text-lg sm:text-2xl font-black uppercase italic leading-tight tracking-tighter text-zinc-100 break-words">{doc.title}</h3></div></div><p className="text-zinc-400 text-sm leading-relaxed mb-7 line-clamp-3 break-words">{doc.description || 'Arsip resmi tersedia untuk kepentingan administratif dan dokumentasi klub.'}</p><div className="mt-auto flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pt-5 border-t border-zinc-800/50"><div className="grid grid-cols-2 gap-2"><button onClick={() => { setSelectedDocUrl(doc.file_url); setSelectedTitle(doc.title || 'Pratinjau Arsip'); }} className="flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest bg-zinc-800 hover:bg-zinc-700 text-zinc-100 px-4 py-3.5 rounded-xl border border-zinc-700/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"><Eye size={15} className="text-blue-500" /> View</button><a href={doc.file_url} download className="flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest bg-blue-600 hover:bg-blue-500 text-white px-4 py-3.5 rounded-xl shadow-lg"><DownloadCloud size={15} /> Download</a></div><div className="sm:text-right"><p className="text-[8px] text-zinc-500 font-black uppercase tracking-[.2em]">File Size</p><span className="text-xs font-mono text-zinc-300 font-bold">{formatFileSize(doc.file_size)}</span></div></div></div></motion.article>)}</div> : <div className="text-center py-24 sm:py-40 bg-zinc-900/10 rounded-[3rem] border border-dashed border-zinc-800"><div className="w-20 h-20 bg-zinc-800/30 rounded-full flex items-center justify-center mx-auto mb-6 text-zinc-700"><AlertCircle size={40} /></div><h3 className="text-xl sm:text-2xl font-black text-zinc-500 uppercase italic">Hasil Tidak Ditemukan</h3><p className="text-zinc-600 text-xs mt-3 font-bold uppercase tracking-widest">Coba gunakan kata kunci arsip yang lain</p></div>}
      <div className="mt-10 sm:mt-16 p-6 sm:p-10 rounded-[2rem] sm:rounded-[3rem] bg-gradient-to-br from-zinc-900 to-black border border-zinc-800/50 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-2xl"><div className="flex items-center gap-4 sm:gap-6 min-w-0"><div className="w-14 h-14 sm:w-16 sm:h-16 shrink-0 rounded-2xl bg-blue-600 flex items-center justify-center"><DownloadCloud size={25} /></div><div className="min-w-0"><h4 className="font-black italic uppercase text-base sm:text-lg mb-1">Pusat Informasi Dokumen</h4><p className="text-xs sm:text-sm text-zinc-500 max-w-sm font-medium leading-relaxed">Arsip dikelola oleh tim administrasi PB Bilibili 162.</p></div></div></div>
    </div>

    <AnimatePresence>{selectedDocUrl && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[99999] bg-black/95 backdrop-blur-md overflow-y-auto p-2 sm:p-6 md:p-10" role="dialog" aria-modal="true" aria-label={selectedTitle} onClick={() => setSelectedDocUrl(null)}><button onClick={() => setSelectedDocUrl(null)} aria-label="Tutup pratinjau dokumen" className="fixed top-3 right-3 sm:top-6 sm:right-6 z-[10001] p-3 text-zinc-300 hover:text-white bg-zinc-900 rounded-full border border-zinc-700"><X size={22} /></button><div className="min-h-[100dvh] py-12 sm:py-4 flex items-center justify-center" onClick={e => e.stopPropagation()}><motion.div initial={{ scale: .97, y: 12 }} animate={{ scale: 1, y: 0 }} className="relative w-full max-w-6xl h-[calc(100dvh-5rem)] sm:h-[90dvh] bg-zinc-900 border border-zinc-800 rounded-2xl sm:rounded-[2.5rem] overflow-hidden flex flex-col shadow-2xl"><div className="flex items-center justify-between gap-3 p-4 sm:p-6 border-b border-zinc-800"><div className="min-w-0"><h3 className="text-xs font-black uppercase italic tracking-[.2em] text-blue-500">Pratinjau Arsip</h3><p className="text-[10px] text-zinc-400 font-bold uppercase truncate">{selectedTitle}</p></div></div><div className="flex-1 bg-zinc-950 min-h-0"><iframe src={`${selectedDocUrl}#toolbar=0`} className="w-full h-full border-none" title={selectedTitle} /></div></motion.div></div></motion.div>}</AnimatePresence>
  </section>;
}
