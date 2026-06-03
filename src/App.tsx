import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { supabase } from './supabase'; 

// --- IMPORT FALLBACK DATA ---
import popupFallback from './data/konfigurasi_popup.json';

// Import Komponen Landing Page
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import About from './components/About';
import News from './components/News';
import Athletes from './components/Players'; 
import Ranking from './components/Rankings'; 
import BadmintonQuiz from './components/BadmintonQuiz'; 
import Gallery from './components/Gallery';
import RegistrationForm from './components/RegistrationForm'; 
import Contact from './components/Contact'; 
// import Footer from './components/Footer'; // Footer lama dinonaktifkan
import PublicKasView from './components/PublicKasView';
import DokumenPenting from './components/DokumenPenting'; 
import StrukturOrganisasi from './components/StrukturOrganisasi'; 

// Import Komponen Admin
import Login from './components/Login';
import Sidebar from './components/Sidebar';
import ManajemenPendaftaran from './ManajemenPendaftaran';
import ManajemenAtlet from './ManajemenAtlet';
import AdminBerita from './components/AdminBerita';
import AdminMatch from './components/AdminMatch'; 
import AdminRanking from './components/AdminRanking'; 
import AdminGallery from './components/AdminGallery'; 
import AdminContact from './components/AdminContact'; 
import KelolaNavbar from './components/KelolaNavbar'; 
import ManajemenPoin from './components/ManajemenPoin';
import AuditLogPoin from './components/AuditLogPoin';
import AdminLaporan from './components/AdminLaporan'; 
import AdminLogs from './components/AdminLogs'; 
import AdminTampilan from './components/AdminTampilan'; 
import KelolaHero from './components/KelolaHero'; 
import AdminPopup from './components/AdminPopup'; 
import AdminFooter from './components/AdminFooter'; 
import AdminAbout from './components/AdminAbout';
import AdminStructure from './components/AdminStructure'; 
import ManajemenDokumen from './components/ManajemenDokumen'; 
import { KelolaSurat } from './components/KelolaSurat'; 
import KasManager from './components/KasManager'; 

import { X, ChevronLeft, ChevronRight, Menu, Zap, Download, ExternalLink, Volume2, VolumeX, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// --- KONSTANTA AUDIO ---
const MARS_URL = "https://missjyvqfehamtpyodjr.supabase.co/storage/v1/object/public/assets/Mars%20US162.mp3";

// HELPER: Auto Scroll ke atas setiap pindah route
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

/**
 * FIXED POPUP COMPONENT WITH FALLBACK
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
        } else {
          const activeFallbacks = (popupFallback as any[]).filter(p => p.is_active);
          if (activeFallbacks.length > 0) {
            setPromoImages(activeFallbacks);
            setTimeout(() => setIsOpen(true), 1000);
          }
        }
      } catch (err) {
        console.error("Gagal memuat pop-up:", err);
      }
    };
    fetchActivePopups();
  }, []);

  const closePopup = () => setIsOpen(false);
  if (promoImages.length === 0 || !isOpen) return null;
  const current = promoImages[currentIndex];

  return (
    <AnimatePresence mode="wait">
      <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
        <div className="absolute inset-0" onClick={closePopup} />
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative w-full max-w-[420px] max-h-[85vh] bg-white rounded-[2rem] shadow-2xl flex flex-col overflow-hidden border border-white/20" onClick={(e) => e.stopPropagation()}>
          <button onClick={closePopup} className="absolute top-4 right-4 z-50 p-2 bg-white/90 hover:bg-rose-500 hover:text-white text-slate-900 rounded-full shadow-lg transition-all"><X size={18} /></button>
          <div ref={scrollRef} className="flex-1 overflow-y-auto hide-scrollbar">
             <img src={current.url_gambar} className="w-full h-auto object-cover" alt={current.judul} />
             <div className="p-8">
                <h3 className="text-xl font-black uppercase mb-4">{current.judul}</h3>
                <p className="text-slate-600 text-sm leading-relaxed mb-6">{current.deskripsi}</p>
                <button onClick={closePopup} className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold uppercase tracking-widest text-[10px]">Tutup</button>
             </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeAboutTab, setActiveAboutTab] = useState('sejarah');
  const [activeAthleteFilter, setActiveAthleteFilter] = useState('all');

  // STATE UNTUK DEDICATED FULL-PAGE VIEWS
  const [activeView, setActiveView] = useState<string | null>(null);

  // AUDIO LOGIC
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isMarsPlaying, setIsMarsPlaying] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleNavigate = (sectionId: string, subPath?: string) => {
    const fullPageMenus = ['kas', 'quiz', 'contact', 'kontak', 'struktur', 'dokumen-penting', 'register', 'pendaftaran', 'peringkat', 'rankings', 'atlet', 'players', 'tentang-kami', 'about', 'galeri', 'gallery'];

    if (fullPageMenus.includes(sectionId)) {
        if (sectionId === 'tentang-kami' || sectionId === 'about') {
            if (subPath) setActiveAboutTab(subPath);
        }
        if (sectionId === 'atlet' || sectionId === 'players') {
            if (subPath) setActiveAthleteFilter(subPath.toLowerCase());
        }
        
        setActiveView(sectionId);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
        setActiveView(null);
        setTimeout(() => {
            const element = document.getElementById(sectionId);
            if (element) {
                const offset = 100;
                window.scrollTo({ top: element.getBoundingClientRect().top + window.pageYOffset - offset, behavior: 'smooth' });
            }
        }, 100);
    }
  };

  const BackToHomeButton = () => (
    <motion.button 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.05, backgroundColor: '#2563eb' }}
      whileTap={{ scale: 0.95 }}
      onClick={() => { setActiveView(null); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
      className="fixed bottom-10 left-1/2 -translate-x-1/2 px-8 py-4 bg-blue-600 text-white rounded-full font-black text-[11px] tracking-[0.3em] shadow-[0_20px_50px_rgba(37,99,235,0.4)] z-[9999] uppercase flex items-center gap-3 border border-white/20 backdrop-blur-md"
    >
      <ArrowLeft size={16} /> Kembali ke Beranda
    </motion.button>
  );

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#0b0e14]">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  return (
    <Router>
      <ScrollToTop />
      <audio ref={audioRef} src={MARS_URL} loop />
      
      <Routes>
        <Route path="/" element={
          <div className="min-h-screen bg-[#0b0e14] w-full overflow-x-hidden">
            <ImagePopup />
            <Navbar onNavigate={handleNavigate} />
            
            {/* MUSIC CONTROLLER */}
            <div className="fixed bottom-6 right-6 z-[99999] flex flex-col items-end gap-3 pointer-events-none">
                <AnimatePresence>
                  {isMarsPlaying && (
                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="bg-slate-900/90 backdrop-blur-md border border-white/10 px-4 py-2 rounded-2xl shadow-xl flex items-center gap-3">
                        <div className="flex gap-0.5">
                           {[1,2,3,4].map(i => <motion.div key={i} animate={{ height: [4, 12, 4] }} transition={{ repeat: Infinity, duration: 0.6, delay: i * 0.1 }} className="w-1 bg-blue-500 rounded-full" />)}
                        </div>
                        <p className="text-[9px] font-black uppercase tracking-widest text-white italic">Mars PB 162</p>
                    </motion.div>
                  )}
                </AnimatePresence>
                <motion.button 
                  whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                  onClick={() => {
                    if (audioRef.current) {
                      isMarsPlaying ? audioRef.current.pause() : audioRef.current.play();
                      setIsMarsPlaying(!isMarsPlaying);
                    }
                  }}
                  className="pointer-events-auto w-14 h-14 bg-blue-600 text-white rounded-full shadow-2xl flex items-center justify-center border border-white/20 group overflow-hidden"
                >
                  {isMarsPlaying ? <Volume2 size={20} /> : <VolumeX size={20} className="text-white/60" />}
                </motion.button>
            </div>

            <AnimatePresence mode="wait">
              {!activeView ? (
                <motion.div key="landing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="w-full">
                  <Hero />
                  <section id="berita-section"><News /></section>
                </motion.div>
              ) : (
                /* DEDICATED FULL-PAGE VIEW DENGAN DARK MODE KONSISTEN */
                <motion.div 
                  key="dedicated-view"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.4 }}
                  className="min-h-screen w-full flex flex-col items-center bg-[#0b0e14] pt-24 pb-32"
                >
                  <div className="w-full h-full max-w-7xl px-4 md:px-8 mx-auto">
                    {/* Render Komponen dengan Props masing-masing */}
                    {activeView === 'kas' && <PublicKasView />}
                    {(activeView === 'quiz') && <BadmintonQuiz />}
                    {(activeView === 'contact' || activeView === 'kontak') && <Contact />}
                    {activeView === 'struktur' && <StrukturOrganisasi />}
                    {activeView === 'dokumen-penting' && <DokumenPenting />}
                    {(activeView === 'register' || activeView === 'pendaftaran') && <RegistrationForm />}
                    {(activeView === 'peringkat' || activeView === 'rankings') && <Ranking />}
                    {(activeView === 'atlet' || activeView === 'players') && <Athletes initialFilter={activeAthleteFilter} />}
                    {(activeView === 'tentang-kami' || activeView === 'about') && <About activeTab={activeAboutTab} onTabChange={setActiveAboutTab} />}
                    {(activeView === 'galeri' || activeView === 'gallery') && <Gallery />}
                  </div>
                  
                  <BackToHomeButton />
                </motion.div>
              )}
            </AnimatePresence>
            
            {/* Footer Custom */}
            <footer className="w-full py-8 text-center text-slate-500 text-sm border-t border-white/5 bg-[#0b0e14]">
              <p>© 2026 PB BILIBILI 162</p>
            </footer>
          </div>
        } />

        <Route path="/login" element={!session ? <Login /> : <Navigate to="/admin/dashboard" replace />} />
        <Route path="/admin/*" element={session ? <AdminLayout session={session} /> : <Navigate to="/login" replace />} />
      </Routes>
      <style>{`
        /* Menghilangkan scrollbar tapi fungsi scroll tetap ada */
        .hide-scrollbar::-webkit-scrollbar { display: none !important; }
        .hide-scrollbar { -ms-overflow-style: none !important; scrollbar-width: none !important; }
        
        /* Custom scrollbar untuk panel admin */
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #050505; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 10px; }
        
        /* Global Background Smoothness */
        body { background-color: #0b0e14; }
      `}</style>
    </Router>
  );
}

function AdminLayout({ session }: { session: any }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  return (
    <div className="flex h-screen w-full bg-[#050505] overflow-hidden">
      <aside className={`h-full flex-shrink-0 z-[101] transition-transform duration-300 md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} absolute md:relative`}>
        <Sidebar email={session.user.email} isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      </aside>
      <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <div className="md:hidden flex items-center justify-between bg-[#0F172A] p-4 border-b border-white/5">
          <button onClick={() => setIsSidebarOpen(true)} className="text-white p-2 hover:bg-white/10 rounded-lg"><Menu /></button>
          <div className="text-white font-black italic tracking-tighter text-sm uppercase">Admin Console</div>
          <div className="w-8"></div>
        </div>
        <div className="flex-1 overflow-y-auto bg-[#050505] custom-scrollbar">
          <Routes>
            <Route path="dashboard" element={<ManajemenPendaftaran />} />
            <Route path="atlet" element={<ManajemenAtlet />} />
            <Route path="surat" element={<KelolaSurat />} />
            <Route path="kas" element={<KasManager />} />
            <Route path="dokumen" element={<ManajemenDokumen />} /> 
            <Route path="poin" element={<ManajemenPoin />} />
            <Route path="audit-poin" element={<AuditLogPoin />} />
            <Route path="skor" element={<AdminMatch />} />
            <Route path="berita" element={<AdminBerita />} />
            <Route path="ranking" element={<AdminRanking />} />
            <Route path="galeri" element={<AdminGallery />} />
            <Route path="kontak" element={<AdminContact />} />
            <Route path="navbar" element={<KelolaNavbar />} />
            <Route path="laporan" element={<AdminLaporan />} />
            <Route path="logs" element={<AdminLogs />} />
            <Route path="tampilan" element={<AdminTampilan />} />
            <Route path="hero" element={<KelolaHero />} />
            <Route path="popup" element={<AdminPopup />} /> 
            <Route path="footer" element={<AdminFooter />} />
            <Route path="about" element={<AdminAbout />} />
            <Route path="struktur" element={<AdminStructure />} /> 
            <Route path="*" element={<Navigate to="dashboard" replace />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}