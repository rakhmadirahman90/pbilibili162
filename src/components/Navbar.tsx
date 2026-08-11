import React, { useState, useEffect, useCallback } from 'react';
import { ChevronDown, Menu, X, MapPin, UserPlus, Wallet, FileText, Trophy, BrainCircuit } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { supabase } from '../supabase';

interface NavbarProps { onNavigate: (path: string, tabId?: string) => void; }

type NavItem = { id: string; parent_id?: string; label: string; path: string; type?: string; order_index?: number };

const FALLBACK_NAV: NavItem[] = [
  { id: '1', label: 'Home', path: 'home', type: 'link', order_index: 0 },
  { id: '2', label: 'Tentang Kami', path: 'tentang-kami', type: 'dropdown', order_index: 1 },
  { id: '3', label: 'Berita', path: 'berita', type: 'link', order_index: 2 },
  { id: '4', label: 'Peringkat', path: 'peringkat', type: 'dropdown', order_index: 3 },
  { id: '5', label: 'Kas', path: 'kas', type: 'link', order_index: 4 },
  { id: '2-1', parent_id: '2', label: 'Sejarah', path: 'sejarah', order_index: 0 },
  { id: '2-2', parent_id: '2', label: 'Visi Misi', path: 'visi-misi', order_index: 1 },
  { id: '2-3', parent_id: '2', label: 'Fasilitas', path: 'fasilitas', order_index: 2 },
  { id: '2-4', parent_id: '2', label: 'Dokumen Penting', path: 'dokumen-penting', order_index: 3 },
  { id: '4-1', parent_id: '4', label: 'Ranking Atlet', path: 'peringkat', order_index: 0 },
  { id: '4-2', parent_id: '4', label: 'Quiz Badminton', path: 'quiz', order_index: 1 },
];

export default function Navbar({ onNavigate }: NavbarProps) {
  const location = useLocation();
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [navData, setNavData] = useState<NavItem[]>(FALLBACK_NAV);
  const [branding, setBranding] = useState({ logo_url: '/photo_2026-02-03_00-32-07.jpg', brand_name_main: 'US 162', brand_name_accent: 'BILIBILI' });

  const fetchNavSettings = useCallback(async () => {
    try {
      const { data, error } = await supabase.from('navbar_settings').select('*').order('order_index', { ascending: true });
      if (error || !data?.length) { setNavData(FALLBACK_NAV); return; }
      const finalNav: NavItem[] = data.map((item: any) => ({ ...item }));
      if (!finalNav.some(item => item.path === 'kas')) finalNav.push({ id: 'kas-dynamic', label: 'Kas', path: 'kas', type: 'link', order_index: 98 });
      const parentTentang = finalNav.find(item => item.path === 'tentang-kami' || item.label?.toLowerCase().includes('tentang'));
      if (parentTentang && !finalNav.some(item => item.path === 'dokumen-penting')) finalNav.push({ id: 'docs-dynamic', parent_id: parentTentang.id, label: 'Dokumen Penting', path: 'dokumen-penting', order_index: 3 });
      const parentRanking = finalNav.find(item => item.path === 'peringkat' || item.path === 'ranking' || item.label?.toLowerCase().includes('peringkat'));
      if (parentRanking) {
        parentRanking.type = 'dropdown';
        if (!finalNav.some(item => item.path === 'quiz')) finalNav.push({ id: 'quiz-dynamic', parent_id: parentRanking.id, label: 'Quiz Badminton', path: 'quiz', order_index: 99 });
        if (!finalNav.some(item => item.parent_id === parentRanking.id && item.path === 'peringkat')) finalNav.push({ id: 'ranking-sub-dynamic', parent_id: parentRanking.id, label: 'Ranking Atlet', path: 'peringkat', order_index: 1 });
      }
      setNavData(finalNav);
    } catch { setNavData(FALLBACK_NAV); }
  }, []);

  useEffect(() => { fetchNavSettings(); }, [fetchNavSettings]);

  useEffect(() => {
    let cancelled = false;
    const loadBranding = async () => {
      try {
        const { data } = await supabase.from('site_settings').select('value').eq('key', 'navbar_branding').maybeSingle();
        if (cancelled || !data?.value) return;
        const val = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
        setBranding({ logo_url: val.logo_url || branding.logo_url, brand_name_main: val.brand_name_main || branding.brand_name_main, brand_name_accent: val.brand_name_accent || branding.brand_name_accent });
      } catch { /* keep fallback branding */ }
    };
    loadBranding();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    setIsMobileMenuOpen(false);
    setActiveDropdown(null);
  }, [location.pathname]);

  useEffect(() => {
    if (!isMobileMenuOpen) return;
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && setIsMobileMenuOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isMobileMenuOpen]);

  const getSubMenus = (parentId: string) => navData.filter(item => item.parent_id === parentId).sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
  const navigate = (path: string, tab?: string) => { setActiveDropdown(null); setIsMobileMenuOpen(false); onNavigate(path, tab); };
  const isActive = (path: string) => location.pathname === `/${path}` || (path === 'home' && location.pathname === '/');

  const rootItems = navData.filter(item => !item.parent_id).sort((a, b) => (a.order_index || 0) - (b.order_index || 0));

  return (
    <>
      <nav className="fixed top-0 inset-x-0 z-[100] h-20 bg-slate-900/95 backdrop-blur-md text-white border-b border-white/10 shadow-2xl" aria-label="Navigasi utama">
        <div className="max-w-7xl mx-auto h-full px-4 sm:px-6 flex items-center justify-between gap-4">
          <button onClick={() => navigate('home')} className="min-w-0 flex items-center gap-3 sm:gap-4 cursor-pointer group text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-2xl" aria-label="Kembali ke beranda">
            <span className="relative w-10 h-10 sm:w-12 sm:h-12 shrink-0 flex items-center justify-center">
              <span className="absolute inset-0 border border-white/30 rounded-full group-hover:border-blue-500/50 transition-colors" />
              <span className="w-9 h-9 sm:w-11 sm:h-11 rounded-full overflow-hidden bg-white flex items-center justify-center shadow-inner"><img src={branding.logo_url} alt="Logo PB Bilibili 162" className="w-full h-full object-cover" /></span>
            </span>
            <span className="min-w-0 flex flex-col justify-center">
              <span className="flex items-center gap-1 leading-none mb-1 truncate"><span className="font-black text-lg sm:text-xl lg:text-2xl tracking-tighter uppercase italic text-white truncate">{branding.brand_name_main}</span><span className="font-black text-lg sm:text-xl lg:text-2xl tracking-tighter uppercase italic text-blue-500">{branding.brand_name_accent}</span></span>
              <span className="hidden sm:block text-[7px] md:text-[8px] text-slate-400 font-bold tracking-[0.28em] uppercase leading-none">Professional Badminton Club</span>
            </span>
          </button>

          <div className="hidden lg:flex items-center gap-4 xl:gap-7 shrink-0">
            {rootItems.map(menu => (
              <div key={menu.id} className="relative h-20 flex items-center" onMouseEnter={() => menu.type === 'dropdown' && setActiveDropdown(menu.id)} onMouseLeave={() => setActiveDropdown(null)}>
                <button onClick={() => menu.type !== 'dropdown' ? navigate(menu.path) : setActiveDropdown(activeDropdown === menu.id ? null : menu.id)} className={`nav-link flex items-center gap-1.5 ${isActive(menu.path) ? 'text-blue-400' : ''}`} aria-expanded={menu.type === 'dropdown' ? activeDropdown === menu.id : undefined}>
                  {menu.path === 'kas' && <Wallet size={12} />}{menu.label}{menu.type === 'dropdown' && <ChevronDown size={10} className={`transition-transform ${activeDropdown === menu.id ? 'rotate-180' : ''}`} />}
                </button>
                {menu.type === 'dropdown' && activeDropdown === menu.id && <div className="dropdown-container" role="menu"><div className="dropdown-content">{getSubMenus(menu.id).map(sub => <button role="menuitem" key={sub.id} onClick={() => navigate(menu.path, sub.path)} className="dropdown-item flex items-center justify-between"><span className="flex items-center gap-2">{sub.path === 'quiz' && <BrainCircuit size={12} className="text-blue-400" />}{sub.label}</span>{sub.path === 'dokumen-penting' && <FileText size={12} className="text-blue-500" />}{sub.path === 'peringkat' && <Trophy size={12} className="text-yellow-500" />}</button>)}</div></div>}
              </div>
            ))}
            <div className="relative h-20 flex items-center" onMouseEnter={() => setActiveDropdown('contact-action')} onMouseLeave={() => setActiveDropdown(null)}>
              <button onClick={() => setActiveDropdown(activeDropdown === 'contact-action' ? null : 'contact-action')} className="px-4 xl:px-5 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-full text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 shadow-lg shadow-blue-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300" aria-expanded={activeDropdown === 'contact-action'}><MapPin size={12} /> Kontak <ChevronDown size={10} className={activeDropdown === 'contact-action' ? 'rotate-180' : ''} /></button>
              {activeDropdown === 'contact-action' && <div className="dropdown-container right-0" role="menu"><div className="dropdown-content"><button role="menuitem" onClick={() => navigate('contact')} className="dropdown-item flex items-center gap-3"><MapPin size={14} className="text-blue-400" /> Hubungi Kami</button><button role="menuitem" onClick={() => navigate('register')} className="dropdown-item flex items-center gap-3"><UserPlus size={14} className="text-blue-500" /> Pendaftaran</button></div></div>}
            </div>
          </div>

          <button className="lg:hidden shrink-0 p-2.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" onClick={() => setIsMobileMenuOpen(v => !v)} aria-label={isMobileMenuOpen ? 'Tutup menu' : 'Buka menu'} aria-expanded={isMobileMenuOpen}>{isMobileMenuOpen ? <X size={26} /> : <Menu size={26} />}</button>
        </div>

        {isMobileMenuOpen && <>
          <button aria-label="Tutup menu" className="fixed inset-0 top-20 bg-black/60 backdrop-blur-sm lg:hidden" onClick={() => setIsMobileMenuOpen(false)} />
          <div className="absolute top-20 left-0 w-full lg:hidden bg-slate-900 border-b border-white/10 shadow-2xl max-h-[calc(100dvh-5rem)] overflow-y-auto overscroll-contain p-4 sm:p-6">
            <div className="max-w-2xl mx-auto flex flex-col gap-2">
              {rootItems.map(menu => <React.Fragment key={menu.id}>
                <button onClick={() => menu.type !== 'dropdown' ? navigate(menu.path) : setActiveDropdown(activeDropdown === menu.id ? null : menu.id)} className={`mobile-nav-link flex justify-between items-center ${isActive(menu.path) ? 'text-blue-400 bg-blue-600/10' : ''}`}>
                  <span className="flex items-center gap-2">{menu.path === 'kas' && <Wallet size={16} />}{menu.label}</span>{menu.type === 'dropdown' && <ChevronDown size={16} className={activeDropdown === menu.id ? 'rotate-180' : ''} />}
                </button>
                {menu.type === 'dropdown' && activeDropdown === menu.id && <div className="flex flex-col gap-1 pl-3 border-l-2 border-blue-500/30 ml-2 mb-2">{getSubMenus(menu.id).map(sub => <button key={sub.id} onClick={() => navigate(menu.path, sub.path)} className="mobile-sub-link flex items-center justify-between"><span className="flex items-center gap-2">{sub.path === 'quiz' && <BrainCircuit size={14} className="text-blue-400" />}{sub.label}</span>{sub.path === 'peringkat' && <Trophy size={14} className="text-yellow-500" />}</button>)}</div>}
              </React.Fragment>)}
              <div className="mt-2 pt-3 border-t border-white/10 grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button onClick={() => navigate('contact')} className="mobile-action"><MapPin size={17} /> Hubungi Kami</button>
                <button onClick={() => navigate('register')} className="mobile-action primary"><UserPlus size={17} /> Pendaftaran Atlet</button>
              </div>
            </div>
          </div>
        </>}
      </nav>
      <style>{`
        .nav-link{font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.13em;color:#94a3b8;cursor:pointer;position:relative;transition:all .25s ease;white-space:nowrap}
        .nav-link:hover{color:#f8fafc}.nav-link::after{content:'';position:absolute;bottom:-5px;left:50%;width:0;height:2px;background:#3b82f6;transition:all .25s ease;transform:translateX(-50%)}.nav-link:hover::after,.nav-link.text-blue-400::after{width:100%}
        .dropdown-container{position:absolute;top:100%;width:15rem;padding-top:.5rem;z-index:110}.dropdown-content{background:#0f172a;border:1px solid rgba(255,255,255,.1);border-radius:1rem;overflow:hidden;box-shadow:0 20px 40px rgba(0,0,0,.5)}.dropdown-item{width:100%;text-align:left;padding:1rem 1.25rem;font-size:10px;font-weight:800;text-transform:uppercase;color:#94a3b8;background:none;border-bottom:1px solid rgba(255,255,255,.05);transition:.2s}.dropdown-item:hover,.dropdown-item:focus-visible{background:#2563eb;color:white;padding-left:1.5rem;outline:none}
        .mobile-nav-link{font-size:14px;font-weight:900;text-transform:uppercase;color:#f8fafc;font-style:italic;padding:.95rem 1rem;border-radius:1rem;text-align:left}.mobile-sub-link{font-size:12px;font-weight:700;color:#94a3b8;text-transform:uppercase;padding:.8rem .75rem;text-align:left;border-radius:.75rem}.mobile-sub-link:hover,.mobile-sub-link:focus-visible{background:rgba(37,99,235,.1);color:#fff;outline:none}.mobile-action{display:flex;align-items:center;justify-content:center;gap:.5rem;padding:.9rem 1rem;border:1px solid rgba(255,255,255,.08);border-radius:1rem;color:#cbd5e1;font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:.08em}.mobile-action.primary{background:#2563eb;border-color:#3b82f6;color:#fff}
      `}</style>
    </>
  );
}
