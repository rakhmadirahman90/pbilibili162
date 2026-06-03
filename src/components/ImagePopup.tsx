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

  // --- PERBAIKAN LOGIKA TEXT RENDER ---
  const renderCleanDescription = (text: string) => {
    if (!text) return null;
    const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/g;

    return text.split('\n').map((line, i) => {
      if (line.trim() === "") return <div key={i} className="h-3" />;

      return (
        <p 
          key={i} 
          className="mb-2 last:mb-0 leading-[1.6] text-slate-700 text-left text-[14px]"
          style={{ 
            overflowWrap: 'break-word', // Perbaikan: Kata tidak akan terpotong di tengah
            wordWrap: 'break-word',
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
                  className="text-blue-600 hover:text-blue-800 underline decoration-blue-200 underline-offset-2 font-medium break-all"
                >
                  {part} 
                </a>
              );
            }
            return <span key={index}>{part}</span>;
          })}
        </p>
      );
    });
  };
  // ------------------------------------

  const closePopup = () => setIsOpen(false);

  if (promoImages.length === 0 || !isOpen) return null;
  const current = promoImages[currentIndex];

  return (
    <AnimatePresence mode="wait">
      <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
        <div className="absolute inset-0" onClick={closePopup} />
        
        <motion.div 
          key={current.id || `popup-${currentIndex}`}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-full max-w-[400px] max-h-[85vh] bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <button 
            onClick={closePopup} 
            className="absolute top-4 right-4 z-50 p-2 bg-black/10 hover:bg-black/20 text-white rounded-full transition-all active:scale-90"
          >
            <X size={18} />
          </button>

          <div ref={scrollRef} className="flex-1 overflow-y-auto hide-scrollbar scroll-smooth">
            <div className="relative w-full aspect-[4/3] bg-slate-100 shrink-0">
              <img src={current.url_gambar} className="w-full h-full object-cover" alt="Banner" />
              <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent" />
            </div>

            <div className="px-6 pt-2 pb-8 bg-white">
              <div className="flex justify-center mb-4">
                <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[10px] font-bold uppercase tracking-widest border border-blue-100">
                  Pengumuman
                </span>
              </div>
              
              <h3 className="text-xl font-bold text-slate-900 leading-snug text-center mb-5 px-2">
                {current.judul}
              </h3>

              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5 mb-6">
                {renderCleanDescription(current.deskripsi)}
              </div>
              
              <div className="space-y-3 px-1">
                {current.file_url && current.file_url.length > 5 && (
                  <motion.a 
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    href={current.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full py-3.5 bg-slate-900 text-white rounded-xl font-bold text-[12px] tracking-wider shadow-lg"
                  >
                    <Download size={14} /> LIHAT LAMPIRAN
                  </motion.a>
                )}

                <button 
                  onClick={closePopup} 
                  className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-[12px] tracking-wider transition-all shadow-md"
                >
                  MENGERTI
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}