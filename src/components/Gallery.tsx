import { useState, useMemo, useEffect } from 'react';
import { supabase } from "../supabase"; 
import { X, Camera, Info, ChevronDown, ChevronUp, PlayCircle, Image as ImageIcon, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Gallery() {
  const [galleryItems, setGalleryItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [activeTab, setActiveTab] = useState<'image' | 'video'>('image');

  // 1. Ambil data dari Supabase
  useEffect(() => {
    async function fetchGallery() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('gallery')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        setGalleryItems(data || []);
      } catch (err: any) {
        console.error("Error fetching gallery:", err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchGallery();
  }, []);

  // Tutup modal dengan tombol ESC
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedId(null);
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  // --- HELPER UNTUK EKSTRAK ID YOUTUBE ---
  const getYouTubeID = (url: string) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|shorts\/)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const getEmbedUrl = (url: string) => {
    if (url.includes('youtube.com/embed/')) return url;
    const videoId = getYouTubeID(url);
    if (videoId) {
      return `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`;
    }
    return url;
  };

  const getThumbnail = (item: any) => {
    if (!item.url) return '/placeholder-image.jpg'; 
    if (item.type === 'image') return item.url;
    
    const videoId = getYouTubeID(item.url);
    if (videoId) {
      return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
    }
    if (item.thumbnail_url) return item.thumbnail_url;
    return `${item.url}#t=0.1`; 
  };

  const filteredMedia = useMemo(() => {
    const filtered = galleryItems.filter(item => item.type === activeTab);
    return showAll ? filtered : filtered.slice(0, 6);
  }, [activeTab, showAll, galleryItems]);

  const activeMedia = useMemo(() => 
    galleryItems.find((item) => item.id === selectedId),
  [selectedId, galleryItems]);

  return (
    <section id="gallery" className="py-24 bg-[#0b0e14] text-white min-h-screen relative overflow-hidden">
      {/* Ornamen Latar Belakang */}
      <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-blue-600/5 blur-[120px] rounded-full -z-0" />
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-indigo-600/5 blur-[120px] rounded-full -z-0" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Header Section */}
        <div className="text-center mb-16">
          <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            whileInView={{ opacity: 1, y: 0 }}
            className="flex justify-center mb-6"
          >
            <div className="bg-blue-600/10 p-4 rounded-3xl text-blue-500 border border-blue-600/20 shadow-lg shadow-blue-600/5">
              <Camera size={32} />
            </div>
          </motion.div>
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-5xl font-black mb-4 tracking-tighter uppercase italic"
          >
            Lensa <span className="text-blue-600">PB 162</span>
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-lg text-slate-400 max-w-2xl mx-auto font-medium"
          >
            Aktivitas dan prestasi kami dalam format visual berkualitas tinggi.
          </motion.p>
        </div>

        {/* Tab Switcher - Styled for Dark Mode */}
        <div className="flex justify-center mb-16">
          <div className="inline-flex bg-[#1a1d26] p-1.5 rounded-[2rem] border border-white/5 shadow-2xl backdrop-blur-md">
            <button
              onClick={() => { setActiveTab('image'); setShowAll(false); }}
              className={`flex items-center gap-3 px-10 py-4 rounded-[1.5rem] font-black text-xs tracking-widest transition-all duration-300 ${
                activeTab === 'image' 
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' 
                : 'text-slate-500 hover:text-white'
              }`}
            >
              <ImageIcon size={18} /> FOTO
            </button>
            <button
              onClick={() => { setActiveTab('video'); setShowAll(false); }}
              className={`flex items-center gap-3 px-10 py-4 rounded-[1.5rem] font-black text-xs tracking-widest transition-all duration-300 ${
                activeTab === 'video' 
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' 
                : 'text-slate-500 hover:text-white'
              }`}
            >
              <PlayCircle size={18} /> VIDEO
            </button>
          </div>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 text-slate-500">
            <Loader2 className="animate-spin mb-6 text-blue-600" size={48} />
            <p className="font-black uppercase tracking-[0.3em] text-[10px]">Sinkronisasi Galeri...</p>
          </div>
        ) : (
          /* Media Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <AnimatePresence mode="popLayout">
              {filteredMedia.length > 0 ? filteredMedia.map((item, index) => (
                <motion.div
                  layout
                  key={item.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.4, delay: index * 0.05 }}
                  onClick={() => setSelectedId(item.id)}
                  className="group relative cursor-pointer overflow-hidden rounded-[2.5rem] bg-[#1a1d26] border border-white/5 hover:border-blue-600/50 transition-all duration-500 shadow-2xl"
                >
                  <div className="aspect-[4/3] relative overflow-hidden">
                    {item.type === 'video' && !getYouTubeID(item.url) ? (
                      <video 
                        src={`${item.url}#t=0.5`} 
                        className="w-full h-full object-cover grayscale-[0.2] group-hover:grayscale-0 group-hover:scale-110 transition-all duration-700"
                        preload="metadata"
                      />
                    ) : (
                      <img
                        src={getThumbnail(item)}
                        alt={item.title}
                        className="w-full h-full object-cover grayscale-[0.2] group-hover:grayscale-0 group-hover:scale-110 transition-all duration-700"
                        onError={(e: any) => {
                          const videoId = getYouTubeID(item.url);
                          if (videoId) e.target.src = `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
                        }}
                      />
                    )}
                    
                    {/* Play Button Overlay for Videos */}
                    {item.type === 'video' && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition-all">
                        <div className="w-16 h-16 bg-white/10 backdrop-blur-md border border-white/20 rounded-full flex items-center justify-center text-white shadow-2xl group-hover:scale-110 transition-transform duration-500">
                          <PlayCircle size={32} fill="currentColor" fillOpacity={0.4} />
                        </div>
                      </div>
                    )}

                    {/* Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0b0e14] via-transparent to-transparent opacity-60 group-hover:opacity-90 transition-all duration-500" />
                  </div>
                  
                  {/* Content Overlay */}
                  <div className="absolute inset-0 flex flex-col justify-end p-8 translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
                    <span className="text-blue-500 text-[10px] font-black uppercase tracking-[0.2em] mb-2">{item.category}</span>
                    <h3 className="text-white text-xl font-black leading-tight uppercase italic">{item.title}</h3>
                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-4 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                      {item.type === 'video' ? <PlayCircle size={14} className="text-blue-500" /> : <Info size={14} className="text-blue-500" />} 
                      {item.type === 'video' ? 'Putar Video' : 'Lihat Detail'}
                    </p>
                  </div>
                </motion.div>
              )) : (
                <div className="col-span-full py-32 text-center text-slate-600 font-black uppercase tracking-[0.4em] border-2 border-dashed border-white/5 rounded-[3.5rem] bg-[#1a1d26]/30">
                  Belum ada {activeTab === 'image' ? 'foto' : 'video'}
                </div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Load More Button */}
        {!loading && galleryItems.filter(item => item.type === activeTab).length > 6 && (
          <div className="text-center mt-20">
            <button 
              onClick={() => setShowAll(!showAll)}
              className="inline-flex items-center gap-4 bg-white text-black hover:bg-blue-600 hover:text-white px-12 py-5 rounded-full font-black text-xs uppercase tracking-[0.2em] transition-all shadow-2xl active:scale-95"
            >
              {showAll ? <>Sembunyikan <ChevronUp size={20} /></> : <>Lihat Selengkapnya <ChevronDown size={20} /></>}
            </button>
          </div>
        )}

        {/* LIGHTBOX MODAL */}
        <AnimatePresence>
          {activeMedia && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-[#050505]/fb z-[9999] flex flex-col items-center justify-center p-4 backdrop-blur-2xl"
              onClick={() => setSelectedId(null)}
            >
              {/* Close Button */}
              <button 
                onClick={(e) => { e.stopPropagation(); setSelectedId(null); }}
                className="absolute top-6 right-6 md:top-10 md:right-10 text-white/50 hover:text-white bg-white/5 hover:bg-white/10 p-4 rounded-full transition-all hover:rotate-90 z-[10001]"
              >
                <X size={32} />
              </button>
              
              <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className="relative max-w-5xl w-full flex flex-col items-center z-[10000]"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="w-full aspect-video rounded-[2.5rem] overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.5)] bg-black border border-white/10 flex items-center justify-center">
                  {activeMedia.type === 'video' ? (
                    !getYouTubeID(activeMedia.url) ? (
                      <video className="w-full h-full" controls autoPlay>
                        <source src={activeMedia.url} type="video/mp4" />
                      </video>
                    ) : (
                      <iframe
                        className="w-full h-full border-0"
                        src={getEmbedUrl(activeMedia.url)}
                        title={activeMedia.title}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      ></iframe>
                    )
                  ) : (
                    <img
                      src={activeMedia.url}
                      alt={activeMedia.title}
                      className="max-w-full max-h-[75vh] object-contain"
                    />
                  )}
                </div>

                <div className="mt-10 bg-[#1a1d26] p-10 rounded-[3rem] border border-white/5 max-w-3xl w-full text-center shadow-3xl">
                  <div className="flex justify-center mb-6">
                    <span className="bg-blue-600 text-white px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-600/20">
                      {activeMedia.category}
                    </span>
                  </div>
                  <h3 className="text-white text-3xl font-black mb-4 uppercase italic tracking-tighter">{activeMedia.title}</h3>
                  <p className="text-slate-400 leading-relaxed italic text-lg font-medium">"{activeMedia.description}"</p>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}