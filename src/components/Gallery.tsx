import { useState, useMemo, useEffect } from 'react';
import { supabase } from "../supabase"; 
import { X, Camera, Info, ChevronDown, ChevronUp, PlayCircle, Image as ImageIcon, Loader2 } from 'lucide-react';

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

  // --- KODE BARU: HELPER UNTUK EKSTRAK ID YOUTUBE ---
  const getYouTubeID = (url: string) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|shorts\/)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  // Helper untuk format URL YouTube (Embed)
  const getEmbedUrl = (url: string) => {
    if (url.includes('youtube.com/embed/')) return url;
    const videoId = getYouTubeID(url);
    if (videoId) {
      return `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`;
    }
    return url;
  };

  // --- PERBAIKAN LOGIKA THUMBNAIL ---
  const getThumbnail = (item: any) => {
    if (!item.url) return '/placeholder-image.jpg'; // Jalur fallback jika URL kosong
    if (item.type === 'image') return item.url;
    
    // 1. Cek apakah video YouTube
    const videoId = getYouTubeID(item.url);
    if (videoId) {
      // Menggunakan hqdefault secara default karena selalu ada di setiap video YouTube
      return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
    }
    
    // 2. Jika video lokal (langsung upload), dan jika ada kolom thumbnail_url di DB
    if (item.thumbnail_url) return item.thumbnail_url;

    // 3. Fallback terakhir untuk video lokal (Menggunakan trik #t=0.1 agar browser merender frame pertama)
    // Catatan: Ini bekerja jika item.url langsung mengarah ke file video (.mp4 dll)
    return `${item.url}#t=0.1`; 
  };
  // ------------------------------------------------

  const filteredMedia = useMemo(() => {
    const filtered = galleryItems.filter(item => item.type === activeTab);
    return showAll ? filtered : filtered.slice(0, 6);
  }, [activeTab, showAll, galleryItems]);

  const activeMedia = useMemo(() => 
    galleryItems.find((item) => item.id === selectedId),
  [selectedId, galleryItems]);

  return (
    <section id="gallery" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-4">
            <div className="bg-blue-100 p-3 rounded-full text-blue-600">
              <Camera size={28} />
            </div>
          </div>
          <h2 className="text-4xl font-black text-slate-900 mb-4 tracking-tight uppercase">Lensa PB US 162</h2>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto">Aktivitas dan prestasi kami dalam format visual berkualitas.</p>
        </div>

        {/* Tab Switcher */}
        <div className="flex justify-center mb-12">
          <div className="inline-flex bg-slate-100 p-1.5 rounded-2xl shadow-inner border border-slate-200">
            <button
              onClick={() => { setActiveTab('image'); setShowAll(false); }}
              className={`flex items-center gap-2 px-8 py-3 rounded-xl font-bold text-sm transition-all duration-300 ${
                activeTab === 'image' 
                ? 'bg-white text-blue-600 shadow-md scale-105' 
                : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <ImageIcon size={18} /> FOTO
            </button>
            <button
              onClick={() => { setActiveTab('video'); setShowAll(false); }}
              className={`flex items-center gap-2 px-8 py-3 rounded-xl font-bold text-sm transition-all duration-300 ${
                activeTab === 'video' 
                ? 'bg-white text-blue-600 shadow-md scale-105' 
                : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <PlayCircle size={18} /> VIDEO
            </button>
          </div>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <Loader2 className="animate-spin mb-4 text-blue-600" size={40} />
            <p className="font-bold uppercase tracking-widest text-xs">Sinkronisasi Galeri...</p>
          </div>
        ) : (
          /* Grid Media */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredMedia.length > 0 ? filteredMedia.map((item) => (
              <div
                key={item.id}
                onClick={() => setSelectedId(item.id)}
                className="group relative cursor-pointer overflow-hidden rounded-[2.5rem] shadow-md hover:shadow-2xl border border-slate-100 transition-all duration-500 animate-in fade-in"
              >
                <div className="aspect-[4/3] relative bg-slate-200">
                  {/* PERBAIKAN: Gunakan Tag Video untuk video lokal agar Thumbnail muncul otomatis dari frame pertama */}
                  {item.type === 'video' && !getYouTubeID(item.url) ? (
                    <video 
                      src={`${item.url}#t=0.5`} 
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                      preload="metadata"
                    />
                  ) : (
                    <img
                      src={getThumbnail(item)}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                      onError={(e: any) => {
                        // Jika URL gambar error, gunakan placeholder atau gambar YouTube kualitas menengah
                        const videoId = getYouTubeID(item.url);
                        if (videoId) {
                          e.target.src = `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
                        }
                      }}
                    />
                  )}
                  
                  {item.type === 'video' && (
                    <div className="absolute inset-0 flex items-center justify-center bg-slate-900/30 group-hover:bg-slate-900/50 transition-all">
                      <div className="w-16 h-16 bg-white/90 rounded-full flex items-center justify-center text-blue-600 shadow-2xl group-hover:scale-110 transition-transform">
                        <PlayCircle size={32} fill="currentColor" fillOpacity={0.2} />
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col justify-end p-8">
                  <span className="text-blue-400 text-[10px] font-black uppercase tracking-[0.2em] mb-1">{item.category}</span>
                  <h3 className="text-white text-xl font-bold leading-tight">{item.title}</h3>
                  <p className="text-slate-300 text-xs mt-3 flex items-center gap-2 font-medium">
                    {item.type === 'video' ? <PlayCircle size={14} /> : <Info size={14} />} 
                    Klik untuk {item.type === 'video' ? 'Putar Video' : 'Lihat Detail'}
                  </p>
                </div>
              </div>
            )) : (
              <div className="col-span-full py-20 text-center text-slate-400 font-bold uppercase tracking-widest border-2 border-dashed border-slate-100 rounded-[3rem]">
                Belum ada {activeTab === 'image' ? 'foto' : 'video'} yang diunggah
              </div>
            )}
          </div>
        )}

        {/* Tombol Muat Lebih Banyak */}
        {!loading && galleryItems.filter(item => item.type === activeTab).length > 6 && (
          <div className="text-center mt-16">
            <button 
              onClick={() => setShowAll(!showAll)}
              className="inline-flex items-center gap-3 bg-slate-900 hover:bg-blue-600 text-white px-10 py-4 rounded-full font-black text-sm uppercase tracking-widest transition-all shadow-xl active:scale-95"
            >
              {showAll ? <>Sembunyikan <ChevronUp size={20} /></> : <>Lihat Selengkapnya <ChevronDown size={20} /></>}
            </button>
          </div>
        )}

        {/* MODAL LIGHTBOX */}
        {activeMedia && (
          <div 
            className="fixed inset-0 bg-slate-950/98 z-[999] flex flex-col items-center justify-center p-4 backdrop-blur-lg animate-in fade-in duration-300"
            onClick={() => setSelectedId(null)}
          >
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setSelectedId(null);
              }}
              className="absolute top-6 right-6 md:top-10 md:right-10 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 p-4 rounded-full transition-all hover:rotate-90 z-[1001] cursor-pointer active:scale-90"
            >
              <X size={36} strokeWidth={2.5} />
            </button>
            
            <div
              className="relative max-w-5xl w-full flex flex-col items-center z-[1000]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-full aspect-video rounded-3xl overflow-hidden shadow-2xl bg-black border border-white/10 flex items-center justify-center">
                {activeMedia.type === 'video' ? (
                  !getYouTubeID(activeMedia.url) ? (
                    <video className="w-full h-full" controls autoPlay>
                      <source src={activeMedia.url} type="video/mp4" />
                      Browser Anda tidak mendukung tag video.
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
                    className="max-w-full max-h-[70vh] object-contain"
                  />
                )}
              </div>

              <div className="mt-8 bg-slate-900 p-8 rounded-[2.5rem] border border-slate-800 max-w-3xl w-full text-center shadow-2xl">
                <div className="flex justify-center mb-4">
                  <span className="bg-blue-600 text-white px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                    {activeMedia.category}
                  </span>
                </div>
                <h3 className="text-white text-2xl md:text-3xl font-black mb-3">{activeMedia.title}</h3>
                <p className="text-slate-400 leading-relaxed italic text-base md:text-lg">"{activeMedia.description}"</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}