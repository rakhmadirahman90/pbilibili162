import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { 
  Layout, Save, Image as ImageIcon, MousePointer2, Info, Loader2, 
  CheckCircle2, Columns, Plus, Trash2, ArrowUp, ArrowDown, Upload, RefreshCw,
  Type, AlertCircle, RotateCcw
} from 'lucide-react';

const DEFAULT_SLIDES = [
  {
    id: 1,
    title: 'Pusat Pelatihan PB US 162 Bilibili',
    subtitle: 'Fasilitas lapangan berkualitas internasional dengan standar karpet BWF.',
    image: '/whatsapp_image_2026-02-02_at_08.39.03.jpeg',
    titleSize: 24,
    subtitleSize: 10,
    fontFamily: 'font-sans'
  },
  {
    id: 2,
    title: 'Keluarga Besar Atlet Kami',
    subtitle: 'Membangun komunitas solid dengan dedikasi tinggi terhadap bulutangkis.',
    image: '/whatsapp_image_2026-02-02_at_09.53.05_(1).jpeg',
    titleSize: 24,
    subtitleSize: 10,
    fontFamily: 'font-sans'
  },
  {
    id: 3,
    title: 'Talenta Muda Terpadu',
    subtitle: 'Program pembinaan terstruktur untuk mencetak juara masa depan.',
    image: '/whatsapp_image_2026-02-02_at_09.53.05_(2).jpeg',
    titleSize: 24,
    subtitleSize: 10,
    fontFamily: 'font-sans'
  },
  {
    id: 4,
    title: 'Semangat Juara Bersama',
    subtitle: 'Komitmen menciptakan ekosistem olahraga yang kompetitif dan kekeluargaan.',
    image: '/whatsapp_image_2026-02-02_at_09.53.05_(3).jpeg',
    titleSize: 24,
    subtitleSize: 10,
    fontFamily: 'font-sans'
  },
];

interface HeroSlide {
  id: number | string;
  title: string;
  subtitle: string;
  image: string;
  titleSize?: number;
  subtitleSize?: number;
  fontFamily?: string;
}

export default function AdminTampilan() {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'hero' | 'footer'>('hero');
  const [message, setMessage] = useState('');
  const [isOnline, setIsOnline] = useState<boolean | null>(null);

  const [slides, setSlides] = useState<HeroSlide[]>([]);
  const [heroSettings, setHeroSettings] = useState({ duration: 7 });
  const [footerData, setFooterData] = useState({
    description: 'PB US 162 adalah klub bulutangkis profesional yang berfokus pada pembinaan atlet muda berbakat.',
    copyright: '© 2026 PB US 162. All Rights Reserved.',
    address: 'Bilibili, Kabupaten Gowa, Sulawesi Selatan'
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('site_settings').select('*');
      if (error) throw error;

      setIsOnline(true);
      const heroRes = data.find(item => item.key === 'hero_config');
      const footerRes = data.find(item => item.key === 'footer_config');

      if (heroRes?.value) {
        const val = typeof heroRes.value === 'string' ? JSON.parse(heroRes.value) : heroRes.value;
        setSlides(val.slides && val.slides.length > 0 ? val.slides : DEFAULT_SLIDES);
        setHeroSettings(val.settings || { duration: 7 });
      } else {
        setSlides(DEFAULT_SLIDES);
      }
      
      if (footerRes?.value) {
        const fVal = typeof footerRes.value === 'string' ? JSON.parse(footerRes.value) : footerRes.value;
        setFooterData(fVal);
      }
    } catch (err) {
      console.error("Fetch Error:", err);
      setIsOnline(false);
      setSlides(DEFAULT_SLIDES);
    } finally {
      setLoading(false);
    }
  };

  // LOGIKA RESET BARU
  const handleResetToDefault = async () => {
    if (confirm("Kembalikan semua slide ke pengaturan awal (Default)? Ini akan menghapus slide kustom Anda.")) {
      setSlides(DEFAULT_SLIDES);
      setMessage("Slide telah di-reset ke default. Klik 'Publish Changes' untuk menyimpan permanen.");
      setTimeout(() => setMessage(''), 5000);
    }
  };

  const handleImageUpload = async (id: number | string, file: File) => {
    try {
      setLoading(true);
      const oldSlide = slides.find(s => s.id === id);
      const oldImagePath = oldSlide?.image?.split('/assets/').pop();

      const fileExt = file.name.split('.').pop();
      const fileName = `hero-${id}-${Date.now()}.${fileExt}`;
      const filePath = `hero/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('assets')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('assets')
        .getPublicUrl(filePath);

      setSlides(prev => prev.map(s => s.id === id ? { ...s, image: publicUrl } : s));

      if (oldImagePath && oldImagePath.startsWith('hero/') && !oldImagePath.includes('whatsapp_image')) {
        await supabase.storage.from('assets').remove([oldImagePath]);
      }

      setMessage('Gambar terunggah! Tekan "Publish" untuk mengunci.');
      setTimeout(() => setMessage(''), 4000);
    } catch (err: any) {
      alert("Gagal upload: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const addNewSlide = () => {
    setSlides([...slides, { 
      id: Date.now(), 
      title: 'Judul Baru', 
      subtitle: 'Deskripsi...', 
      image: '',
      titleSize: 24,
      subtitleSize: 10,
      fontFamily: 'font-sans'
    }]);
  };

  const removeSlide = async (id: number | string) => {
    if (confirm("Hapus slide ini?")) {
      const slideToRemove = slides.find(s => s.id === id);
      const imagePath = slideToRemove?.image?.split('/assets/').pop();
      
      if (imagePath && imagePath.startsWith('hero/')) {
        await supabase.storage.from('assets').remove([imagePath]);
      }
      
      setSlides(slides.filter(s => s.id !== id));
    }
  };

  const moveSlide = (index: number, direction: 'up' | 'down') => {
    const newSlides = [...slides];
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= newSlides.length) return;
    [newSlides[index], newSlides[target]] = [newSlides[target], newSlides[index]];
    setSlides(newSlides);
  };

  const updateSlideContent = (id: number | string, field: keyof HeroSlide, value: any) => {
    setSlides(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const handleSave = async () => {
    setLoading(true);
    setMessage('Menyimpan ke database...');
    try {
      const now = new Date().toISOString();

      const { error: heroErr } = await supabase.from('site_settings').upsert({ 
        key: 'hero_config', 
        value: { settings: heroSettings, slides: slides },
        updated_at: now 
      });
      if (heroErr) throw heroErr;

      const { error: footerErr } = await supabase.from('site_settings').upsert({ 
        key: 'footer_config', 
        value: footerData,
        updated_at: now 
      });
      if (footerErr) throw footerErr;

      setMessage('BERHASIL! Data telah disinkronkan.');
      await fetchData(); 
      setTimeout(() => setMessage(''), 3000);
    } catch (err: any) {
      alert("Simpan gagal: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 bg-[#050505] min-h-screen text-white font-sans">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
        <div>
          <h1 className="text-4xl font-black italic uppercase tracking-tighter text-white">
            DESIGN <span className="text-blue-600">CENTER</span>
          </h1>
          <div className="flex items-center gap-3 mt-2">
            <p className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.3em] flex items-center gap-2">
              <Layout size={12} className="text-blue-500" /> Web Configuration System v2.3
            </p>
            <div className={`h-2 w-2 rounded-full animate-pulse ${isOnline ? 'bg-emerald-500' : 'bg-red-500'}`} />
          </div>
        </div>

        <div className="flex gap-4">
          <button 
            onClick={handleResetToDefault}
            className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl hover:bg-red-500/20 text-red-500 transition-all active:scale-95 flex items-center gap-2 text-[9px] font-black uppercase tracking-widest"
            title="Reset to Default"
          >
            <RotateCcw size={16} /> Reset
          </button>
          <button onClick={fetchData} className="p-4 bg-zinc-900 rounded-2xl border border-white/5 hover:bg-zinc-800 transition-all active:scale-95 shadow-xl">
            <RefreshCw size={18} className={loading ? "animate-spin text-blue-500" : ""} />
          </button>
          <button 
            onClick={handleSave} 
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-500 text-white px-10 py-4 rounded-2xl transition-all flex items-center gap-3 text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-600/20 active:scale-95 disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
            Publish Changes
          </button>
        </div>
      </div>

      {message && (
        <div className={`mb-6 p-4 rounded-2xl flex items-center gap-3 text-[10px] font-black uppercase tracking-widest animate-in fade-in slide-in-from-top-4 duration-300 ${message.includes('BERHASIL') ? 'bg-emerald-500/10 border border-emerald-500/50 text-emerald-500' : 'bg-blue-500/10 border border-blue-500/50 text-blue-500'}`}>
          {message.includes('BERHASIL') ? <CheckCircle2 size={16} /> : <Loader2 size={16} className="animate-spin" />}
          {message}
        </div>
      )}

      {/* TABS */}
      <div className="flex gap-2 mb-10 bg-zinc-900/50 p-1.5 rounded-full w-fit border border-white/5">
        {(['hero', 'footer'] as const).map((tab) => (
          <button 
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-8 py-3 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-blue-600 text-white shadow-lg' : 'text-zinc-500 hover:text-white'}`}
          >
            {tab === 'hero' ? 'Hero Sliders' : 'Footer Details'}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-7 space-y-6">
          {activeTab === 'hero' ? (
            <div className="space-y-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-2 text-zinc-400">
                  <Columns size={16} className="text-blue-500" /> Slider Management
                </h3>
                <button onClick={addNewSlide} className="bg-white/5 hover:bg-white/10 text-white px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border border-white/10 flex items-center gap-2 transition-all">
                  <Plus size={14} /> Tambah Slide
                </button>
              </div>

              {slides.map((slide, index) => (
                <div key={slide.id} className="bg-zinc-900/80 border border-white/5 p-6 rounded-[2rem] relative group transition-all hover:bg-zinc-900">
                  <div className="absolute -left-3 top-8 flex flex-col gap-1 z-20">
                    <div className="bg-blue-600 text-[10px] font-black px-2 py-1 rounded-md shadow-lg mb-1">0{index + 1}</div>
                    <button onClick={() => moveSlide(index, 'up')} className="p-1 bg-zinc-800 rounded hover:text-blue-500 transition-colors border border-white/5"><ArrowUp size={12}/></button>
                    <button onClick={() => moveSlide(index, 'down')} className="p-1 bg-zinc-800 rounded hover:text-blue-500 transition-colors border border-white/5"><ArrowDown size={12}/></button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 ml-4">
                    <div className="space-y-4">
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-zinc-500 uppercase ml-1 tracking-widest">Title Content</label>
                        <input type="text" value={slide.title} onChange={(e) => updateSlideContent(slide.id, 'title', e.target.value)} className="w-full bg-black border border-zinc-800 rounded-xl p-3 text-xs font-bold focus:border-blue-600 outline-none transition-all text-white" />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[9px] font-black text-zinc-500 uppercase ml-1 tracking-widest flex items-center gap-2"><Type size={10}/> Title Size</label>
                          <input type="number" value={slide.titleSize || 24} onChange={(e) => updateSlideContent(slide.id, 'titleSize', parseInt(e.target.value))} className="w-full bg-black border border-zinc-800 rounded-xl p-3 text-xs font-bold focus:border-blue-600 outline-none text-white" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-black text-zinc-500 uppercase ml-1 tracking-widest flex items-center gap-2"><Type size={10}/> Sub Size</label>
                          <input type="number" value={slide.subtitleSize || 10} onChange={(e) => updateSlideContent(slide.id, 'subtitleSize', parseInt(e.target.value))} className="w-full bg-black border border-zinc-800 rounded-xl p-3 text-xs font-bold focus:border-blue-600 outline-none text-white" />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-zinc-500 uppercase ml-1 tracking-widest">Font Family</label>
                        <select 
                          value={slide.fontFamily || 'font-sans'} 
                          onChange={(e) => updateSlideContent(slide.id, 'fontFamily', e.target.value)}
                          className="w-full bg-black border border-zinc-800 rounded-xl p-3 text-xs font-bold focus:border-blue-600 outline-none cursor-pointer text-white appearance-none"
                        >
                          <option value="font-sans">Default Sans</option>
                          <option value="font-serif">Elegant Serif</option>
                          <option value="font-mono">Modern Mono</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-zinc-500 uppercase ml-1 tracking-widest">Subtitle Content</label>
                        <textarea value={slide.subtitle} onChange={(e) => updateSlideContent(slide.id, 'subtitle', e.target.value)} className="w-full bg-black border border-zinc-800 rounded-xl p-3 text-xs font-bold focus:border-blue-600 outline-none h-20 resize-none leading-relaxed text-white" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-zinc-500 uppercase ml-1 tracking-widest">Slide Image</label>
                        <label className="flex w-full bg-black border border-zinc-800 rounded-xl p-3 text-[10px] font-bold text-zinc-400 cursor-pointer hover:border-blue-600 transition-all flex items-center gap-3">
                          <Upload size={14} className="text-blue-500" />
                          <span className="truncate">{slide.image ? "Change Image" : "Upload Image"}</span>
                          <input type="file" className="hidden" accept="image/*" onChange={(e) => e.target.files && handleImageUpload(slide.id, e.target.files[0])} />
                        </label>
                      </div>
                      <div className="relative h-20 w-full bg-black rounded-xl overflow-hidden border border-zinc-800 shadow-inner group">
                        {slide.image ? (
                          <img src={slide.image} key={slide.image} className="w-full h-full object-cover object-center opacity-80" alt="Preview" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-zinc-800 text-[10px] font-black uppercase italic">No Image</div>
                        )}
                        <button onClick={() => removeSlide(slide.id)} className="absolute top-2 right-2 p-2 bg-red-600/20 hover:bg-red-600 text-red-500 hover:text-white rounded-xl transition-all opacity-0 group-hover:opacity-100"><Trash2 size={14} /></button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-zinc-900/50 border border-white/5 p-8 rounded-[2.5rem] space-y-6">
              <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-2 text-zinc-400">
                <Info size={16} className="text-blue-500" /> Footer Config
              </h3>
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-zinc-500 uppercase ml-2 tracking-widest">Description</label>
                  <textarea value={footerData.description} onChange={(e) => setFooterData({...footerData, description: e.target.value})} className="w-full bg-black border border-zinc-800 rounded-2xl p-5 text-sm font-bold focus:border-blue-600 outline-none min-h-[140px] leading-relaxed text-white" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-zinc-500 uppercase ml-2 tracking-widest">Address</label>
                    <input type="text" value={footerData.address} onChange={(e) => setFooterData({...footerData, address: e.target.value})} className="w-full bg-black border border-zinc-800 rounded-2xl p-4 text-xs font-bold outline-none text-white" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-zinc-500 uppercase ml-2 tracking-widest">Copyright</label>
                    <input type="text" value={footerData.copyright} onChange={(e) => setFooterData({...footerData, copyright: e.target.value})} className="w-full bg-black border border-zinc-800 rounded-2xl p-4 text-xs font-bold outline-none text-white" />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* LIVE PREVIEW */}
        <div className="lg:col-span-5">
          <div className="sticky top-8 bg-zinc-900/20 border border-dashed border-zinc-800 rounded-[2.5rem] p-5 shadow-inner">
            <p className="text-[9px] font-black text-zinc-700 uppercase tracking-widest mb-5 ml-4 flex items-center gap-2">
              <MousePointer2 size={10} /> Dynamic Live UI Preview
            </p>
            
            {activeTab === 'hero' ? (
              <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
                {slides.map((s, i) => (
                  <div key={s.id} className="relative h-[320px] w-full bg-black rounded-[2.5rem] overflow-hidden flex items-center p-8 border border-white/5 shadow-2xl transition-all duration-500">
                    {s.image ? (
                      <img src={s.image} key={s.image} className="absolute inset-0 w-full h-full object-cover object-[center_15%] opacity-50" alt={`Slide ${i+1}`} />
                    ) : (
                       <div className="absolute inset-0 bg-zinc-950 flex items-center justify-center text-zinc-900 font-black italic text-4xl">NO IMAGE</div>
                    )}
                    
                    <div className="absolute inset-0 bg-gradient-to-r from-black via-black/40 to-transparent z-0" />
                    
                    <div className="relative z-10 w-full">
                      <div className="text-blue-500 text-[8px] font-black uppercase mb-2 tracking-[0.4em]">Slide 0{i+1}</div>
                      <h2 
                        className={`font-black italic tracking-tighter mb-2 text-white leading-[1.1] transition-all drop-shadow-xl ${s.fontFamily || 'font-sans'}`}
                        style={{ fontSize: `${s.titleSize || 24}px` }}
                      >
                        {s.title || 'Judul Slide'}
                      </h2>
                      <p 
                        className={`text-zinc-200 font-medium mb-5 max-w-[260px] line-clamp-3 leading-relaxed drop-shadow-md ${s.fontFamily || 'font-sans'}`}
                        style={{ fontSize: `${s.subtitleSize || 10}px` }}
                      >
                        {s.subtitle || 'Deskripsi slide...'}
                      </p>
                      <div className="inline-flex px-6 py-2.5 bg-blue-600 rounded-full items-center justify-center text-[9px] font-black tracking-widest uppercase shadow-lg shadow-blue-600/40 cursor-default">
                        DAFTAR SEKARANG
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-zinc-900/50 rounded-[2.5rem] p-8 border border-white/5 shadow-2xl">
                 <div className="border-l-4 border-blue-600 pl-6 space-y-3">
                  <h4 className="font-black italic text-xl text-white tracking-tight">PB US 162 BILIBILI</h4>
                  <p className="text-zinc-400 text-[11px] leading-relaxed italic">{footerData.description}</p>
                </div>
              </div>
            )}
            
            <div className="mt-6 p-4 bg-blue-600/5 rounded-2xl border border-blue-600/10 flex gap-3">
              <AlertCircle size={14} className="text-blue-500 shrink-0 mt-0.5" />
              <p className="text-[8px] text-zinc-500 leading-relaxed italic">
                * <span className="text-blue-400 font-bold uppercase tracking-tighter">Sistem Sinkronisasi:</span> Setiap perubahan yang Anda buat di sini disimpan dalam format <span className="text-blue-400">JSONB</span> di Supabase untuk fleksibilitas desain tanpa batas. Pastikan wajah subjek berada di area <span className="text-blue-400">Top-Center</span>.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}