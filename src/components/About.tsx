import React, { useState, useEffect, useMemo } from 'react'; 
import { 
  Target, Rocket, Shield, Award, 
  CheckCircle2, Users2, ArrowRight, User, ShieldCheck, 
  ChevronDown, Star, GraduationCap, History, Eye, Map,
  CheckCircle, Zap, Loader2
} from 'lucide-react'; 
import { supabase } from '../supabase'; 

// --- IMPORT FALLBACK DATA ---
import pageFallback from '../data/page_contents.json';
import orgFallback from '../data/org_fallback.json';
import siteFallback from '../data/site_fallback.json';

interface AboutProps {
  activeTab?: string;
  onTabChange?: (id: string) => void;
}

export default function About({ activeTab: propsActiveTab, onTabChange }: AboutProps) {
  const [internalTab, setInternalTab] = useState('sejarah');
  const [loading, setLoading] = useState(true);
  
  const [dynamicContent, setDynamicContent] = useState<Record<string, any>>({
    sejarah_title: "Jejak Langkah Kami",
    sejarah_accent: "",
    sejarah: `Didirikan dengan semangat dedikasi tinggi...`,
    sejarah_image: "https://images.unsplash.com/photo-1544033527-b192daee1f5b?q=80&w=2070",
    visi: "Menjadi organisasi terdepan dalam mencetak generasi berprestasi...",
    misi: [], 
    fasilitas_title: "Fasilitas Unggulan",
    fasilitas_main_image: "",
    fasilitas_img1: "",
    fasilitas_img2: "",
    fasilitas_list: [] 
  });
  
  const [orgData, setOrgData] = useState<any[]>([]);
  const activeTab = propsActiveTab || internalTab;

  const fetchOrgData = async () => {
    const { data: structData, error: orgError } = await supabase
      .from('organizational_structure')
      .select('*')
      .order('level', { ascending: true })
      .order('sort_order', { ascending: true });

    if (!orgError && structData) {
      setOrgData(structData);
    } else {
      setOrgData(orgFallback || []);
    }
  };

  useEffect(() => {
    fetchAllData();

    const channel = supabase
      .channel('public:organizational_structure')
      .on('postgres_changes', { 
        event: '*', 
        table: 'organizational_structure', 
        schema: 'public' 
      }, () => {
        fetchOrgData();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const { data: settingsData } = await supabase
        .from('site_settings')
        .select('value')
        .eq('key', 'about_content')
        .maybeSingle();

      let mappedSettings: any = {};
      if (settingsData?.value) {
        const val = typeof settingsData.value === 'string' ? JSON.parse(settingsData.value) : settingsData.value;
        mappedSettings = {
          sejarah_title: val.sejarah_title,
          sejarah_accent: val.sejarah_accent,
          sejarah: val.sejarah_desc,
          sejarah_image: val.sejarah_img,
          visi: val.vision || val.visi,
          misi: Array.isArray(val.missions || val.misi) ? (val.missions || val.misi) : [],
          fasilitas_title: val.fasilitas_title,
          fasilitas_main_image: val.fasilitas_img1,
          fasilitas_img1: val.fasilitas_img2,
          fasilitas_img2: val.fasilitas_img3,
          fasilitas_list: Array.isArray(val.fasilitas_list) ? val.fasilitas_list : [] // Mengembalikan data fasilitas
        };
      }

      setDynamicContent(prev => ({ ...prev, ...mappedSettings }));
      await fetchOrgData();

    } catch (err) {
      console.error("Error loading About data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (id: string) => {
    if (onTabChange) onTabChange(id);
    else setInternalTab(id);
  };

  const getLevelColor = (level: number) => {
    const colors: Record<number, string> = {
      1: 'bg-amber-500', 2: 'bg-emerald-600', 3: 'bg-indigo-600',
      4: 'bg-blue-600', 5: 'bg-rose-500', 6: 'bg-orange-500'
    };
    return colors[level] || 'bg-slate-500';
  };

  // --- RENDERING BIDANG (LEVEL 7) ---
  const renderDepartment = (title: string, roleKey: string) => {
    const members = orgData.filter(m => 
      m.level === 7 && (
        m.role.toLowerCase().includes(roleKey.toLowerCase()) ||
        (m.category && m.category.toLowerCase().includes(roleKey.toLowerCase()))
      )
    );

    if (members.length === 0) return null;

    const coordinator = members.find(m => m.role.toLowerCase().includes("koordinator"));
    const staffs = members.filter(m => !m.role.toLowerCase().includes("koordinator"));

    return (
      <div className="w-full mb-20 animate-in fade-in duration-1000">
        <div className="flex flex-col items-center mb-10">
           
           {/* HEADER BIDANG: Teks "Bidang XXX" di atas foto */}
           <div className="bg-white px-6 py-2 rounded-full border border-slate-200 shadow-sm mb-8">
              <h4 className="text-blue-600 font-black italic uppercase text-[10px] md:text-[12px] tracking-[0.2em]">
                {title}
              </h4>
           </div>
           
           {coordinator && (
             <div className="flex flex-col items-center mb-10">
                <div className="bg-white p-4 rounded-[2rem] border-2 border-blue-100 shadow-xl text-center w-56 hover:border-blue-400 transition-colors">
                  <div className="w-24 h-24 mx-auto mb-3">
                    <img 
                      src={coordinator.photo_url || `https://ui-avatars.com/api/?name=${coordinator.name}`} 
                      className="w-full h-full rounded-2xl object-cover border-4 border-slate-50" 
                      alt={coordinator.name}
                    />
                  </div>
                  <p className="font-black text-[11px] uppercase italic text-slate-900 leading-tight">{coordinator.name}</p>
                  <p className="text-[8px] text-blue-600 font-bold uppercase mt-1">{coordinator.role}</p>
                </div>
                {staffs.length > 0 && <div className="w-0.5 h-10 bg-gradient-to-b from-blue-200 to-transparent"></div>}
             </div>
           )}

           <div className="flex flex-wrap justify-center gap-4 md:gap-6 w-full max-w-5xl">
              {staffs.map(p => (
                <div key={p.id} className="bg-white p-3 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 w-64 md:w-72 hover:shadow-md transition-all">
                  <div className="w-14 h-14 shrink-0">
                    <img 
                      src={p.photo_url || `https://ui-avatars.com/api/?name=${p.name}`} 
                      className="w-full h-full rounded-xl object-cover" 
                      alt={p.name}
                    />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <p className="font-black text-[10px] md:text-[11px] uppercase italic text-slate-900 truncate leading-tight">{p.name}</p>
                    <p className="text-blue-500 font-bold text-[8px] uppercase mt-1">{p.role}</p>
                  </div>
                </div>
              ))}
           </div>
        </div>
      </div>
    );
  };

  return (
    <section id="tentang-kami" className="relative w-full h-screen bg-white flex flex-col items-center overflow-hidden font-sans">
      <div className="max-w-7xl mx-auto px-4 w-full h-full flex flex-col py-2 md:py-6">
        
        <div className="text-center mb-4 shrink-0">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-600 rounded-full mb-2">
            <Users2 size={12} className="animate-pulse" />
            <span className="text-[8px] font-black uppercase tracking-[0.2em]">Profil Organisasi</span>
          </div>
          <h2 className="text-2xl md:text-5xl font-black text-slate-900 tracking-tighter uppercase leading-none italic">
            Tentang <span className="text-blue-600">Kami</span>
          </h2>
        </div>

        <div className="flex flex-wrap justify-center gap-2 mb-6 shrink-0">
          {['sejarah', 'visi-misi', 'fasilitas'].map((id) => (
            <button
              key={id}
              onClick={() => handleTabChange(id)}
              className={`px-4 md:px-8 py-2 md:py-3 rounded-xl font-black text-[9px] md:text-[11px] uppercase border-2 transition-all active:scale-95 ${
                activeTab === id ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-200' : 'bg-white text-slate-400 border-slate-100 hover:border-blue-200'
              }`}
            >
              {id.replace('-', ' ')}
            </button>
          ))}
          <button
            onClick={() => handleTabChange('organisasi')}
            className={`px-4 md:px-8 py-2 md:py-3 rounded-xl font-black text-[9px] md:text-[11px] uppercase border-2 flex items-center gap-2 transition-all active:scale-95 ${
              activeTab === 'organisasi' ? 'bg-slate-900 text-white border-slate-900 shadow-lg shadow-slate-200' : 'bg-white text-slate-900 border-slate-900 hover:bg-slate-50'
            }`}
          >
            Struktur Organisasi <ArrowRight size={14} />
          </button>
        </div>

        <div className="flex-1 min-h-0 bg-slate-50/50 rounded-[2rem] md:rounded-[3.5rem] p-4 md:p-12 border border-slate-100 shadow-inner relative overflow-y-auto custom-scrollbar">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <Loader2 className="animate-spin text-blue-600" size={40} />
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Sinkronisasi Database...</p>
            </div>
          ) : (
            <>
              {activeTab === 'sejarah' && (
                <div className="max-w-4xl mx-auto py-4 animate-in fade-in slide-in-from-bottom-8 duration-700">
                  <div className="flex flex-col md:flex-row gap-12 items-center md:items-start">
                    <div className="w-full md:w-2/5 shrink-0">
                      <div className="relative aspect-square rounded-[3rem] overflow-hidden border-8 border-white shadow-2xl -rotate-2">
                        <img src={dynamicContent.sejarah_image} className="w-full h-full object-cover" alt="Sejarah" />
                      </div>
                    </div>
                    <div className="flex-1 text-center md:text-left">
                      <h3 className="text-3xl font-black text-slate-900 uppercase italic mb-6">
                        {dynamicContent.sejarah_title} <span className="text-blue-600">{dynamicContent.sejarah_accent}</span>
                      </h3>
                      <p className="text-slate-600 leading-relaxed text-sm md:text-lg font-medium whitespace-pre-line">
                        {dynamicContent.sejarah}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'visi-misi' && (
                <div className="max-w-5xl mx-auto py-4 animate-in fade-in slide-in-from-bottom-8 duration-700">
                  <div className="grid md:grid-cols-2 gap-12">
                    <div className="space-y-6">
                      <div className="inline-block px-4 py-1 bg-amber-100 text-amber-700 rounded-lg text-[10px] font-black uppercase">Visi</div>
                      <div className="bg-white p-10 rounded-[3rem] border-2 border-blue-50 shadow-xl shadow-blue-500/5 font-black italic text-xl md:text-2xl text-slate-800 leading-tight">
                        "{dynamicContent.visi}"
                      </div>
                    </div>
                    <div className="space-y-6">
                      <div className="inline-block px-4 py-1 bg-blue-100 text-blue-700 rounded-lg text-[10px] font-black uppercase">Misi</div>
                      <div className="space-y-4">
                        {dynamicContent.misi.map((item: any, i: number) => (
                          <div key={i} className="flex items-start gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                            <div className="bg-emerald-500 p-1 rounded-full shrink-0 mt-1"><CheckCircle2 size={14} className="text-white" /></div>
                            <p className="text-slate-700 text-[11px] md:text-[13px] font-black uppercase tracking-tight leading-snug">
                              {typeof item === 'string' ? item : item.text}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'fasilitas' && (
                <div className="max-w-6xl mx-auto py-4 animate-in fade-in slide-in-from-bottom-8 duration-700">
                  <div className="text-center mb-12">
                    <h3 className="text-3xl font-black text-slate-900 uppercase italic mb-2">{dynamicContent.fasilitas_title}</h3>
                    <div className="h-1.5 w-24 bg-blue-600 mx-auto rounded-full"></div>
                  </div>
                  
                  <div className="grid md:grid-cols-3 gap-6 mb-12">
                    {[dynamicContent.fasilitas_main_image, dynamicContent.fasilitas_img1, dynamicContent.fasilitas_img2].map((img, idx) => (
                      img && (
                        <div key={idx} className="group relative aspect-[4/3] rounded-[2rem] overflow-hidden border-4 border-white shadow-lg">
                          <img src={img} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt={`Fasilitas ${idx + 1}`} />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-6">
                            <span className="text-white font-black uppercase text-[10px] tracking-widest">Fasilitas Organisasi</span>
                          </div>
                        </div>
                      )
                    ))}
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {dynamicContent.fasilitas_list.map((item: any, i: number) => (
                      <div key={i} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col items-center text-center gap-3 hover:border-blue-200 transition-all group">
                        <div className="bg-blue-50 p-3 rounded-2xl text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                          <Zap size={20} />
                        </div>
                        <p className="font-black text-[10px] md:text-[11px] uppercase text-slate-800 tracking-tight leading-tight">
                          {typeof item === 'string' ? item : item.title || item.text}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'organisasi' && (
                <div className="w-full flex flex-col items-center py-10 animate-in slide-in-from-bottom-10 duration-1000 pb-40">
                  {[1, 2, 3, 4, 5, 6].map(lvl => {
                    const levelMembers = orgData.filter(m => m.level === lvl);
                    if (levelMembers.length === 0) return null;
                    
                    return (
                      <div key={lvl} className="flex flex-col items-center w-full mb-16 relative">
                        <div className="flex flex-wrap justify-center gap-6 md:gap-12 relative z-10">
                          {levelMembers.map(p => (
                            <div key={p.id} className="flex flex-col items-center">
                              <div className={`bg-white p-4 rounded-[2.5rem] border-2 shadow-2xl text-center transition-transform hover:scale-105 ${lvl === 4 ? 'w-64 md:w-72 border-blue-500 ring-8 ring-blue-50' : 'w-48 md:w-56 border-slate-100'}`}>
                                <div className={`${lvl === 4 ? 'w-32 h-32' : 'w-24 h-24'} mx-auto mb-4`}>
                                  <img src={p.photo_url || `https://ui-avatars.com/api/?name=${p.name}`} className="w-full h-full rounded-[2rem] object-cover border-4 border-slate-50 shadow-inner" alt={p.name} />
                                </div>
                                <p className="font-black text-[11px] md:text-[13px] uppercase italic text-slate-900 leading-tight mb-2 truncate">{p.name}</p>
                                <span className={`text-[8px] text-white px-4 py-1 rounded-full font-black uppercase tracking-widest ${getLevelColor(p.level)}`}>{p.role}</span>
                              </div>
                              <div className="w-0.5 h-16 bg-gradient-to-b from-slate-200 to-transparent"></div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}

                  <div className="w-full max-w-6xl mt-10">
                    <div className="text-center mb-20">
                      <div className="inline-block h-1 w-20 bg-blue-600 rounded-full mb-4"></div>
                      <h3 className="text-2xl font-black uppercase italic text-slate-900 tracking-widest">Koordinator & Anggota Bidang</h3>
                    </div>
                    
                    {renderDepartment("Bidang Pertandingan", "Pertandingan")}
                    {renderDepartment("Bidang Pembinaan Prestasi", "Prestasi")}
                    {renderDepartment("Bidang Humas", "Humas")}
                    {renderDepartment("Bidang Dana & Usaha", "Dana")}
                    {renderDepartment("Bidang Sarana & Prasarana", "Sarpras")}
                    {renderDepartment("Bidang Umum", "Umum")}
                    {renderDepartment("Bidang Rohani", "Rohani")}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 20px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #3b82f6; }
      `}</style>
    </section>
  );
}