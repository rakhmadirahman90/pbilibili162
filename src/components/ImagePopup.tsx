/**
 * FIXED POPUP COMPONENT (V5 - FINAL PRECISION)
 * Fokus: Perbaikan spasi antar baris, link wrapping, dan margin kontainer.
 */
function ImagePopup() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [promoImages, setPromoImages] = useState<any[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchActivePopups = async () => {
      try {
        const { data, error } = await supabase
          .from('konfigurasi_popup')
          .select('*')
          .eq('is_active', true)
          .order('created_at', { ascending: false });
        
        if (!error && data && data.length > 0) {
          setPromoImages(data);
          setTimeout(() => setIsOpen(true), 1000);
        }
      } catch (err) {
        console.error("Gagal memuat pop-up:", err);
      }
    };
    fetchActivePopups();
  }, []);

  // Logika Autoscroll yang lebih halus
  useEffect(() => {
    let scrollInterval: any;
    if (isOpen && scrollRef.current) {
      const startTimeout = setTimeout(() => {
        scrollInterval = setInterval(() => {
          if (scrollRef.current) {
            const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
            if (scrollTop + clientHeight >= scrollHeight - 1) {
              clearInterval(scrollInterval);
            } else {
              scrollRef.current.scrollBy({ top: 0.5, behavior: 'auto' });
            }
          }
        }, 30);
      }, 4000);

      return () => {
        clearInterval(scrollInterval);
        clearTimeout(startTimeout);
      };
    }
  }, [isOpen, currentIndex]);

  const renderCleanDescription = (text: string) => {
    if (!text) return null;
    const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/g;

    return text.split('\n').map((line, i) => {
      // Perbaikan: Spasi kosong antar paragraf yang lebih proporsional
      if (line.trim() === "") return <div key={i} className="h-2" />;

      return (
        <p 
          key={i} 
          className="mb-2 last:mb-0 leading-relaxed text-slate-600 text-left text-[13px]"
          style={{ 
            wordBreak: 'break-all', 
            overflowWrap: 'anywhere', 
            whiteSpace: 'pre-wrap'
          }}
        >
          {line.split(urlRegex).map((part, index) => {
            if (part.match(urlRegex)) {
              const cleanUrl = part.startsWith('www.') ? `https://${part}` : part;
              return (
                <a
                  key={index}
                  href={cleanUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 underline decoration-blue-200 underline-offset-2 font-bold transition-all inline-flex items-center gap-0.5 break-all"
                >
                  {part} 
                  <ExternalLink size={11} className="shrink-0 mb-0.5" />
                </a>
              );
            }
            return <span key={index}>{part}</span>;
          })}
        </p>
      );
    });
  };

  const closePopup = () => setIsOpen(false);

  if (promoImages.length === 0 || !isOpen) return null;
  const current = promoImages[currentIndex];

  return (
    <AnimatePresence mode="wait">
      <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
        <div className="absolute inset-0" onClick={closePopup} />
        
        <motion.div 
          key={current.id || `popup-${currentIndex}`}
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="relative w-full max-w-[400px] max-h-[90vh] bg-white rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden border border-white/20"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close Button lebih kecil & clean */}
          <button 
            onClick={closePopup} 
            className="absolute top-5 right-5 z-50 p-2 bg-white/80 hover:bg-rose-500 hover:text-white text-slate-400 rounded-full shadow-sm transition-all active:scale-90 border border-slate-100"
          >
            <X size={16} strokeWidth={3} />
          </button>

          <div ref={scrollRef} className="flex-1 overflow-y-auto hide-scrollbar scroll-smooth">
            {/* Header Image */}
            <div className="relative w-full aspect-[4/3] bg-slate-100 shrink-0">
              <img src={current.url_gambar} className="w-full h-full object-cover" alt="Banner" />
              <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent" />
            </div>

            {/* Content Container */}
            <div className="px-7 pt-4 pb-8 bg-white">
              <div className="flex justify-center mb-4">
                <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[9px] font-bold uppercase tracking-[0.2em] flex items-center gap-1.5 border border-blue-100/50">
                  <Zap size={10} fill="currentColor" /> Pengumuman
                </span>
              </div>
              
              <h3 className="text-xl font-extrabold text-slate-900 leading-tight text-center mb-5 tracking-tight px-2">
                {current.judul}
              </h3>

              {/* Box Deskripsi dengan spasi internal yang lebih lega */}
              <div className="bg-slate-50/80 border border-slate-100 rounded-2xl p-5 mb-6 w-full min-w-0">
                <div className="w-full min-w-0">
                  {renderCleanDescription(current.deskripsi)}
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="space-y-2.5 px-2">
                {current.file_url && current.file_url.length > 5 && (
                  <motion.a 
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    href={current.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full py-3.5 bg-slate-900 text-white rounded-xl font-bold uppercase text-[10px] tracking-widest shadow-lg"
                  >
                    <Download size={14} /> Lampiran
                  </motion.a>
                )}

                <button 
                  onClick={closePopup} 
                  className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold uppercase text-[10px] tracking-widest transition-all shadow-md shadow-blue-100"
                >
                  Mengerti
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      <style>{`
        .hide-scrollbar::-webkit-scrollbar { display: none !important; }
        .hide-scrollbar { -ms-overflow-style: none !important; scrollbar-width: none !important; }
      `}</style>
    </AnimatePresence>
  );
}