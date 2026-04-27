import React, { useState, useEffect, useCallback } from 'react';
import { Globe, ChevronDown, Menu, X, MapPin, UserPlus, Wallet, FileText } from 'lucide-react';
import { supabase } from '../supabase'; 

interface NavbarProps {
  onNavigate: (sectionId: string, tabId?: string) => void;
}

export default function Navbar({ onNavigate }: NavbarProps) {
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [currentLang, setCurrentLang] = useState('ID');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const [navData, setNavData] = useState<any[]>([]);
  const [branding, setBranding] = useState({
    logo_url: '/photo_2026-02-03_00-32-07.jpg', 
    brand_name_main: 'US 162',
    brand_name_accent: 'BILIBILI',
    default_lang: 'ID'
  });

  // --- FETCH DATA NAVIGASI DENGAN PENAMBAHAN MENU KAS & DOKUMEN PENTING ---
  const fetchNavSettings = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('navbar_settings')
        .select('*')
        .order('order_index', { ascending: true });
      
      if (error) throw error;

      let finalNav = data || [];

      // Jika data kosong, gunakan fallback default
      if (finalNav.length === 0) {
        finalNav = [
          { id: '1', label: 'Home', path: 'home', type: 'link', order_index: 0 },
          { id: '2', label: 'Tentang Kami', path: 'tentang-kami', type: 'dropdown', order_index: 1 },
          { id: '3', label: 'Berita', path: 'berita', type: 'link', order_index: 2 },
          { id: '4', label: 'Kas', path: 'kas', type: 'link', order_index: 3 },
          { id: '2-1', parent_id: '2', label: 'Sejarah', path: 'sejarah' },
          { id: '2-2', parent_id: '2', label: 'Visi Misi', path: 'visi-misi' },
          { id: '2-3', parent_id: '2', label: 'Fasilitas', path: 'fasilitas' },
          { id: '2-4', parent_id: '2', label: 'Dokumen Penting', path: 'dokumen-penting' } // Fallback Dokumen
        ];
      } else {
        // Cek apakah menu 'kas' sudah ada
        const hasKas = finalNav.some((item: any) => item.path === 'kas');
        if (!hasKas) {
          finalNav.push({ id: 'kas-dynamic', label: 'Kas', path: 'kas', type: 'link', order_index: 98 });
        }
        
        // Cek apakah menu 'dokumen-penting' sudah ada di bawah 'Tentang Kami'
        const parentTentang = finalNav.find((item: any) => item.path === 'tentang-kami');
        const hasDocs = finalNav.some((item: any) => item.path === 'dokumen-penting');
        
        if (!hasDocs && parentTentang) {
          finalNav.push({ 
            id: 'docs-dynamic', 
            parent_id: parentTentang.id, 
            label: 'Dokumen Penting', 
            path: 'dokumen-penting' 
          });
        }
      }
      
      setNavData(finalNav);
    } catch (err) {
      console.error("Fetch Nav Error:", err);
    }
  }, []);

  const fetchBrandingSettings = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('site_settings')
        .select('value')
        .eq('key', 'navbar_branding')
        .maybeSingle(); 
      if (!error && data && data.value) {
        const val = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
        setBranding({
          logo_url: val.logo_url || '/photo_2026-02-03_00-32-07.jpg',
          brand_name_main: val.brand_name_main || 'US 162',
          brand_name_accent: val.brand_name_accent || 'BILIBILI',
          default_lang: val.default_lang || 'ID'
        });
        if (val.default_lang) setCurrentLang(val.default_lang);
      }
    } catch (err) {
      console.error("Error fetching branding:", err);
    }
  }, []);

  useEffect(() => {
    fetchNavSettings();
    fetchBrandingSettings();
  }, [fetchNavSettings, fetchBrandingSettings]);

  const getSubMenus = (parentId: string) => {
    return navData.filter(item => item.parent_id === parentId);
  };

  // --- LOGIKA NAVIGASI PERBAIKAN ---
  const handleNavClick = (path: string, subPath?: string) => {
    setActiveDropdown(null);
    setIsMobileMenuOpen(false);

    // 1. Penanganan Home
    if (path === 'home' || path === '/') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      onNavigate('home');
      return;
    }

    // 2. Penanganan Khusus Menu KAS
    if (path === 'kas') {
      onNavigate('kas');
      scrollToSection('kas-section');
      return;
    }

    // 3. Penanganan Khusus Dokumen Penting
    if (subPath === 'dokumen-penting' || path === 'dokumen-penting') {
      onNavigate('dokumen-penting');
      scrollToSection('dokumen-section');
      return;
    }

    // 4. Jika Path adalah 'tentang-kami'
    if (path === 'tentang-kami' || path === 'about') {
      onNavigate('tentang-kami', subPath);
      scrollToSection('tentang-kami');
      return;
    }

    // 5. Penanganan Section Lain
    onNavigate(path, subPath);
    scrollToSection(subPath || path);
  };

  // Helper Smooth Scroll
  const scrollToSection = (id: string) => {
    setTimeout(() => {
      const element = document.getElementById(id);
      if (element) {
        const offset = 100;
        const elementPosition = element.getBoundingClientRect().top + window.pageYOffset;
        window.scrollTo({ top: elementPosition - offset, behavior: 'smooth' });
      }
    }, 150);
  };

  return (
    <nav className="fixed top-0 w-full bg-slate-900/95 backdrop-blur-md text-white z-[100] h-20 border-b border-white/10 shadow-2xl">
      <div className="max-w-7xl mx-auto px-6 h-full flex justify-between items-center">
        
        {/* LOGO */}
        <div className="flex items-center gap-4 cursor-pointer group" onClick={() => handleNavClick('home')}>
          <div className="relative w-12 h-12 flex items-center justify-center">
            <div className="absolute inset-0 border border-white/30 rounded-full group-hover:border-blue-500/50 transition-colors duration-300"></div>
            <div className="w-11 h-11 rounded-full overflow-hidden bg-white flex items-center justify-center transition-transform duration-500 group-hover:scale-105 shadow-inner">
              <img src={branding.logo_url} alt="Logo" className="w-full h-full object-cover" />
            </div>
          </div>
          <div className="flex flex-col justify-center">
            <div className="flex items-center gap-1.5 leading-none mb-1">
              <span className="font-black text-xl md:text-2xl tracking-tighter uppercase italic text-white">{branding.brand_name_main}</span>
              <span className="font-black text-xl md:text-2xl tracking-tighter uppercase italic text-blue-500">{branding.brand_name_accent}</span>
            </div>
            <span className="text-[7px] md:text-[8px] text-slate-400 font-bold tracking-[0.35em] uppercase leading-none">Professional Badminton Club</span>
          </div>
        </div>

        {/* DESKTOP NAV */}
        <div className="hidden md:flex items-center gap-8">
          {navData.filter(item => !item.parent_id).map((menu) => (
            <div 
              key={menu.id} 
              className="relative h-20 flex items-center"
              onMouseEnter={() => menu.type === 'dropdown' && setActiveDropdown(menu.id)}
              onMouseLeave={() => setActiveDropdown(null)}
            >
              <button 
                onClick={() => handleNavClick(menu.path)}
                className={`nav-link flex items-center gap-1.5 ${activeDropdown === menu.id ? 'text-blue-400' : ''} ${menu.path === 'kas' ? 'text-blue-400 font-black' : ''}`}
              >
                {menu.path === 'kas' && <Wallet size={12} className="mr-1" />}
                {menu.label} 
                {menu.type === 'dropdown' && <ChevronDown size={10} className={`transition-transform duration-300 ${activeDropdown === menu.id ? 'rotate-180' : ''}`} />}
              </button>

              {menu.type === 'dropdown' && activeDropdown === menu.id && (
                <div className="dropdown-container animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="dropdown-content">
                    {getSubMenus(menu.id).map((sub) => (
                      <button 
                        key={sub.id} 
                        onClick={() => handleNavClick(menu.path, sub.path)} 
                        className="dropdown-item flex items-center justify-between"
                      >
                        {sub.label}
                        {sub.path === 'dokumen-penting' && <FileText size={10} className="text-blue-500 opacity-50" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* KONTAK */}
          <div className="relative h-20 flex items-center" onMouseEnter={() => setActiveDropdown('contact-action')} onMouseLeave={() => setActiveDropdown(null)}>
            <button className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-full text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 shadow-lg shadow-blue-500/20 active:scale-95">
              <MapPin size={12} /> Kontak <ChevronDown size={10} className={activeDropdown === 'contact-action' ? 'rotate-180' : ''} />
            </button>
            {activeDropdown === 'contact-action' && (
              <div className="dropdown-container right-0 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="dropdown-content">
                  <button onClick={() => handleNavClick('contact')} className="dropdown-item flex items-center gap-3">
                    <MapPin size={14} className="text-blue-400" /> Hubungi Kami
                  </button>
                  <button onClick={() => handleNavClick('register')} className="dropdown-item flex items-center gap-3 bg-blue-600/5 group">
                    <UserPlus size={14} className="text-blue-600 group-hover:text-white" /> 
                    <span className="text-blue-500 group-hover:text-white">Pendaftaran</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* MOBILE TRIGGER */}
        <button className="md:hidden p-2 text-slate-300 hover:text-white transition-colors" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
          {isMobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
        </button>
      </div>

      {/* MOBILE MENU */}
      {isMobileMenuOpen && (
        <div className="md:hidden absolute top-20 left-0 w-full bg-slate-900 border-b border-white/10 p-6 flex flex-col gap-4 shadow-2xl max-h-[calc(100vh-80px)] overflow-y-auto">
          {navData.filter(item => !item.parent_id).map((menu) => (
            <React.Fragment key={menu.id}>
              <button 
                onClick={() => menu.type !== 'dropdown' ? handleNavClick(menu.path) : (activeDropdown === menu.id ? setActiveDropdown(null) : setActiveDropdown(menu.id))}
                className={`mobile-nav-link flex justify-between items-center ${activeDropdown === menu.id ? 'text-blue-400' : ''} ${menu.path === 'kas' ? 'text-blue-400' : ''}`}
              >
                <span className="flex items-center gap-2">
                  {menu.path === 'kas' && <Wallet size={16} />}
                  {menu.label}
                </span>
                {menu.type === 'dropdown' && <ChevronDown size={16} className={activeDropdown === menu.id ? 'rotate-180' : ''} />}
              </button>
              {menu.type === 'dropdown' && activeDropdown === menu.id && (
                <div className="flex flex-col gap-4 pl-4 border-l-2 border-blue-500/30 ml-2 py-2 animate-in slide-in-from-left-2 duration-200">
                  {getSubMenus(menu.id).map((sub) => (
                    <button key={sub.id} onClick={() => handleNavClick(menu.path, sub.path)} className="mobile-sub-link hover:text-white transition-colors flex items-center justify-between">
                      {sub.label}
                      {sub.path === 'dokumen-penting' && <FileText size={14} className="text-blue-500" />}
                    </button>
                  ))}
                </div>
              )}
            </React.Fragment>
          ))}
          <div className="h-px bg-white/5 my-2"></div>
          <button onClick={() => handleNavClick('contact')} className="mobile-nav-link text-blue-400 flex items-center gap-3">
            <MapPin size={18} /> Hubungi Kami
          </button>
          <button onClick={() => handleNavClick('register')} className="bg-blue-600 hover:bg-blue-500 p-4 rounded-2xl font-black uppercase text-[11px] text-center transition-all active:scale-95 shadow-lg shadow-blue-600/20">
            Daftar Sekarang
          </button>
        </div>
      )}

      <style>{`
        .nav-link { font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.15em; color: #94a3b8; cursor: pointer; position: relative; transition: all 0.3s ease; }
        .nav-link:hover { color: #f8fafc; }
        .nav-link::after { content: ''; position: absolute; bottom: -4px; left: 50%; width: 0; height: 2px; background: #3b82f6; transition: all 0.3s ease; transform: translateX(-50%); }
        .nav-link:hover::after { width: 100%; }
        .dropdown-container { position: absolute; top: 100%; width: 15rem; padding-top: 0.5rem; z-index: 110; }
        .dropdown-content { background: #0f172a; border: 1px solid rgba(255,255,255,0.1); border-radius: 1rem; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.5); }
        .dropdown-item { width: 100%; text-align: left; padding: 1rem 1.5rem; font-size: 10px; font-weight: 800; text-transform: uppercase; color: #94a3b8; background: none; border-bottom: 1px solid rgba(255,255,255,0.05); transition: 0.2s; }
        .dropdown-item:hover { background: #2563eb; color: white; padding-left: 1.75rem; }
        .mobile-nav-link { font-size: 14px; font-weight: 900; text-transform: uppercase; color: #f8fafc; font-style: italic; transition: all 0.2s; }
        .mobile-sub-link { text-align: left; font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase; padding: 4px 0; }
        
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideInFromTop { from { transform: translateY(-10px); } to { transform: translateY(0); } }
        .animate-in { animation: fadeIn 0.2s ease-out, slideInFromTop 0.2s ease-out; }
      `}</style>
    </nav>
  );
}