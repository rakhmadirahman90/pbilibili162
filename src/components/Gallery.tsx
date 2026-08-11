import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Camera, ChevronDown, ChevronUp, Image as ImageIcon, Info, Loader2, PlayCircle, X } from 'lucide-react';
import { supabase } from '../supabase';

export default function Gallery() {
  const [galleryItems, setGalleryItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [activeTab, setActiveTab] = useState<'image' | 'video'>('image');

  useEffect(() => {
    let cancelled = false;
    const fetchGallery = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.from('gallery').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        if (!cancelled) setGalleryItems(data || []);
      } catch (error) { console.error('Error fetching gallery:', error); }
      finally { if (!cancelled) setLoading(false); }
    };
    fetchGallery();
    return () => { cancelled = true; };
  }, []);

  const getYouTubeID = (url: string) => {
    if (!url) return null;
    const match = url.match(/^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|shorts\/)([^#&?]*).*/);
    return match?.[2]?.length === 11 ? match[2] : null;
  };
  const getEmbedUrl = (url: string) => {
    if (url.includes('youtube.com/embed/')) return url;
    const id = getYouTubeID(url);
    return id ? `https://www.youtube.com/embed/${id}?autoplay=1&rel=0` : url;
  };
  const getThumbnail = (item: any) => {
    if (!item.url) return '/placeholder-image.jpg';
    if (item.type === 'image') return item.url;
    const id = getYouTubeID(item.url);
    if (id) return `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
    return item.thumbnail_url || `${item.url}#t=0.1`;
  };

  const filteredMedia = useMemo(() => {
    const list = galleryItems.filter(item => item.type === activeTab);
    return showAll ? list : list.slice(0, 6);
  }, [activeTab, showAll, galleryItems]);
  const activeMedia = galleryItems.find(item => item.id === selectedId);

  useEffect(() => {
    if (!activeMedia) return;
    document.body.classList.add('modal-open');
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && setSelectedId(null);
    window.addEventListener('keydown', onKey);
    return () => { document.body.classList.remove('modal-open'); window.removeEventListener('keydown', onKey); };
  }, [activeMedia]);

  return (
    <section id="gallery" className="py-12 sm:py-20 lg:py-24 bg-[#0b0e14] text-white min-h-[100dvh] relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <header className="text-center mb-10 sm:mb-14 lg:mb-16"><div className="flex justify-center mb-5 sm:mb-6"><div className="bg-blue-600/10 p-3 sm:p-4 rounded-3xl text-blue-500 border border-blue-600/20"><Camera size={28} /></div></div><h2 className="text-3xl sm:text-4xl md:text-5xl font-black mb-4 tracking-tighter uppercase italic">Lensa <span className="text-blue-600">PB 162</span></h2><p className="text-sm sm:text-lg text-slate-400 max-w-2xl mx-auto font-medium">Aktivitas dan prestasi kami dalam format visual berkualitas tinggi.</p></header>
        <div className="flex justify-center mb-10 sm:mb-14"><div className="inline-flex w-full sm:w-auto bg-[#1a1d26] p-1 rounded-[1.5rem] sm:rounded-[2rem] border border-white/5 shadow-2xl"><button onClick={() => { setActiveTab('image'); setShowAll(false); }} className={`flex-1 sm:flex-none flex items-center justify-center gap-2 sm:gap-3 px-5 sm:px-10 py-3.5 sm:py-4 rounded-2xl sm:rounded-[1.5rem] font-black text-[10px] sm:text-xs tracking-widest transition-all ${activeTab === 'image' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}><ImageIcon size={17} /> FOTO</button><button onClick={() => { setActiveTab('video'); setShowAll(false); }} className={`flex-1 sm:flex-none flex items-center justify-center gap-2 sm:gap-3 px-5 sm:px-10 py-3.5 sm:py-4 rounded-2xl sm:rounded-[1.5rem] font-black text-[10px] sm:text-xs tracking-widest transition-all ${activeTab === 'video' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}><PlayCircle size={17} /> VIDEO</button></div></div>
        {loading ? <div className="flex flex-col items-center justify-center py-24 sm:py-32 text-slate-500"><Loader2 className="animate-spin mb-6 text-blue-600" size={42} /><p className="font-black uppercase tracking-[0.25em] text-[10px]">Sinkronisasi Galeri...</p></div> : <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6 lg:gap-8">{filteredMedia.length ? filteredMedia.map((item, index) => <motion.button type="button" layout key={item.id} initial={{ opacity: 0, scale: .96 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: index * .04 }} onClick={() => setSelectedId(item.id)} className="group relative text-left cursor-pointer overflow-hidden rounded-[2rem] sm:rounded-[2.5rem] bg-[#1a1d26] border border-white/5 hover:border-blue-600/50 shadow-2xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/40"><div className="aspect-[4/3] relative overflow-hidden">{item.type === 'video' && !getYouTubeID(item.url) ? <video src={`${item.url}#t=0.5`} className="w-full h-full object-cover" preload="metadata" muted playsInline /> : <img src={getThumbnail(item)} alt={item.title || 'Galeri PB 162'} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" onError={e => { const id = getYouTubeID(item.url); if (id) e.currentTarget.src = `https://img.youtube.com/vi/${id}/mqdefault.jpg`; }} />}{item.type === 'video' && <span className="absolute inset-0 flex items-center justify-center bg-black/20"><span className="w-14 h-14 bg-white/10 backdrop-blur-md border border-white/20 rounded-full flex items-center justify-center text-white"><PlayCircle size={30} /></span></span>}<span className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#0b0e14] to-transparent" /></div><div className="absolute inset-x-0 bottom-0 p-5 sm:p-7"><span className="text-blue-400 text-[9px] font-black uppercase tracking-[0.2em]">{item.category || 'PB 162'}</span><h3 className="text-white text-base sm:text-xl font-black leading-tight uppercase italic mt-1 break-words">{item.title}</h3></div></motion.button>) : <div className="col-span-full py-24 text-center text-slate-600 font-black uppercase tracking-[0.3em] text-xs border-2 border-dashed border-white/5 rounded-[2.5rem]">Belum ada {activeTab === 'image' ? 'foto' : 'video'}</div>}</div>}
        {!loading && galleryItems.filter(item => item.type === activeTab).length > 6 && <div className="text-center mt-10 sm:mt-16"><button onClick={() => setShowAll(v => !v)} className="inline-flex items-center gap-3 bg-white text-black hover:bg-blue-600 hover:text-white px-7 sm:px-12 py-4 sm:py-5 rounded-full font-black text-[10px] sm:text-xs uppercase tracking-[0.18em] transition-all">{showAll ? <>Sembunyikan <ChevronUp size={18} /></> : <>Lihat Selengkapnya <ChevronDown size={18} /></>}</button></div>}
      </div>

      <AnimatePresence>
        {activeMedia && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[99999] bg-[#050505]/95 backdrop-blur-2xl overflow-y-auto overscroll-contain p-3 sm:p-6 md:p-10" role="dialog" aria-modal="true" aria-label={activeMedia.title || 'Pratinjau media'} onClick={() => setSelectedId(null)}>
          <button onClick={() => setSelectedId(null)} aria-label="Tutup pratinjau" className="fixed top-3 right-3 sm:top-6 sm:right-6 md:top-10 md:right-10 z-[10001] text-white/70 hover:text-white bg-white/10 hover:bg-white/15 p-3 sm:p-4 rounded-full"><X size={24} /></button>
          <div className="min-h-[calc(100dvh-1.5rem)] sm:min-h-[calc(100dvh-3rem)] flex items-center justify-center py-12 sm:py-4" onClick={e => e.stopPropagation()}>
            <motion.div initial={{ scale: .96, y: 12 }} animate={{ scale: 1, y: 0 }} exit={{ scale: .96, y: 12 }} className="relative max-w-5xl w-full flex flex-col items-center">
              <div className="w-full aspect-video max-h-[65dvh] rounded-[1.5rem] sm:rounded-[2.5rem] overflow-hidden shadow-[0_0_100px_rgba(0,0,0,.5)] bg-black border border-white/10 flex items-center justify-center">{activeMedia.type === 'video' ? (!getYouTubeID(activeMedia.url) ? <video className="w-full h-full object-contain" controls autoPlay playsInline><source src={activeMedia.url} type="video/mp4" /></video> : <iframe className="w-full h-full border-0" src={getEmbedUrl(activeMedia.url)} title={activeMedia.title} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />) : <img src={activeMedia.url} alt={activeMedia.title} className="max-w-full max-h-full object-contain" />}</div>
              <div className="mt-5 sm:mt-8 bg-[#1a1d26] p-5 sm:p-8 rounded-[2rem] sm:rounded-[3rem] border border-white/5 max-w-3xl w-full text-center shadow-2xl"><span className="inline-flex bg-blue-600 text-white px-5 py-2 rounded-full text-[9px] font-black uppercase tracking-widest">{activeMedia.category || 'PB 162'}</span><h3 className="text-xl sm:text-3xl font-black mt-4 mb-3 uppercase italic tracking-tighter break-words">{activeMedia.title}</h3><p className="text-slate-400 leading-relaxed italic text-sm sm:text-lg font-medium break-words">{activeMedia.description || 'Dokumentasi aktivitas PB Bilibili 162.'}</p></div>
            </motion.div>
          </div>
        </motion.div>}
      </AnimatePresence>
    </section>
  );
}
