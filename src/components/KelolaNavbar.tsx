import React, { useState, useEffect, useRef } from 'react';
import { supabase } from "../supabase";
import { 
  Menu, Plus, Trash2, MoveUp, MoveDown, 
  Link as LinkIcon, Layers, RefreshCcw, CheckCircle2,
  CornerDownRight, GripVertical, Settings, Globe, Image as ImageIcon,
  AlertCircle, Save
} from 'lucide-react';

const KelolaNavbar: React.FC = () => {
  const [navItems, setNavItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  
  // --- STATE UNTUK BRANDING & BAHASA ---
  const [brandSettings, setBrandSettings] = useState({
    logo_url: '',
    brand_name_main: 'US 162',
    brand_name_accent: 'BILIBILI',
    sub_text: 'Professional Badminton',
    default_lang: 'ID'
  });
  const [isSavingBrand, setIsSavingBrand] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- STATE UNTUK DRAG & DROP & EDITING ---
  const [draggedItemIndex, setDraggedItemIndex] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  // State Form Lengkap
  const [label, setLabel] = useState('');
  const [path, setPath] = useState('');
  const [type, setType] = useState('link');
  const [parentId, setParentId] = useState<string>('none');
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    fetchNavbar();
    fetchBrandSettings();
  }, []);

  const fetchNavbar = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('navbar_settings')
      .select('*')
      .order('order_index', { ascending: true });
    
    if (!error && data) setNavItems(data);
    setIsLoading(false);
  };

  const fetchBrandSettings = async () => {
    const { data, error } = await supabase
      .from('site_settings')
      .select('*')
      .eq('key', 'navbar_branding')
      .maybeSingle();
    
    if (!error && data && data.value) {
      try {
        const parsedValue = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
        setBrandSettings(parsedValue);
      } catch (e) {
        console.error("Gagal parse data branding:", e);
      }
    }
  };

  // --- PERBAIKAN LOGIKA SIMPAN (SOLUSI ERROR LABEL) ---
  const performBrandingUpsert = async (newSettings: any) => {
    // Mencoba melakukan update hanya pada kolom 'value' terlebih dahulu 
    // untuk menghindari error jika kolom 'label' tidak terdeteksi oleh cache schema Supabase
    const payload: any = { 
      key: 'navbar_branding', 
      value: newSettings 
    };

    // Kita tambahkan label secara opsional. Jika kolom label benar-benar hilang di DB, 
    // Supabase biasanya akan memberikan error spesifik.
    const { error } = await supabase
      .from('site_settings')
      .upsert({ ...payload, label: 'Pengaturan Header & Branding' }, { onConflict: 'key' });

    // Jika gagal karena kolom label, coba upsert tanpa kolom label
    if (error && error.message.includes('label')) {
      console.warn("Retrying without 'label' column due to schema cache issue...");
      return await supabase.from('site_settings').upsert(payload, { onConflict: 'key' });
    }

    return { error };
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `logo-${Date.now()}.${fileExt}`;
      const filePath = `branding/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('assets') 
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('assets').getPublicUrl(filePath);
      
      if (data?.publicUrl) {
        const newSettings = { ...brandSettings, logo_url: data.publicUrl };
        setBrandSettings(newSettings);
        
        const { error: upsertError } = await performBrandingUpsert(newSettings);
        if (upsertError) throw upsertError;
        
        triggerSuccess();
      }
    } catch (err: any) {
      alert("Gagal upload: " + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSaveBrand = async () => {
    setIsSavingBrand(true);
    try {
      const { error } = await performBrandingUpsert(brandSettings);
      if (error) throw error;
      triggerSuccess();
    } catch (err: any) {
      alert("Error simpan branding: " + err.message);
    } finally {
      setIsSavingBrand(false);
    }
  };

  const handleInlineUpdate = async (id: string, field: string, value: string) => {
    const { error } = await supabase
      .from('navbar_settings')
      .update({ [field]: value })
      .eq('id', id);

    if (!error) {
      setNavItems(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
      setEditingId(null);
      triggerSuccess();
    }
  };

  const handleDragStart = (index: number) => setDraggedItemIndex(index);
  const handleDragOver = (e: React.DragEvent) => e.preventDefault();

  const handleDrop = async (dropIndex: number) => {
    if (draggedItemIndex === null || draggedItemIndex === dropIndex) return;

    const mainMenusTemp = [...navItems.filter(item => !item.parent_id)];
    const draggedItem = mainMenusTemp[draggedItemIndex];
    
    mainMenusTemp.splice(draggedItemIndex, 1);
    mainMenusTemp.splice(dropIndex, 0, draggedItem);

    const finalUpdates = mainMenusTemp.map((item, idx) => ({
      ...item,
      order_index: idx
    }));

    const { error } = await supabase.from('navbar_settings').upsert(finalUpdates);
    if (!error) {
      triggerSuccess();
      fetchNavbar();
    }
    setDraggedItemIndex(null);
  };

  const handleAddMenu = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!label || !path) { setFormError("Label dan Path wajib diisi"); return; }

    const payload = {
      label,
      path: path.startsWith('/') ? path : `/${path}`,
      type,
      parent_id: parentId === 'none' ? null : parentId,
      order_index: navItems.length
    };

    const { error } = await supabase.from('navbar_settings').insert([payload]);
    if (!error) {
      setLabel(''); setPath(''); setParentId('none');
      fetchNavbar(); triggerSuccess();
    } else setFormError(error.message);
  };

  const updateOrder = async (id: string, currentIndex: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    const currentMainMenus = navItems.filter(item => !item.parent_id);
    if (targetIndex < 0 || targetIndex >= currentMainMenus.length) return;

    const targetItem = currentMainMenus[targetIndex];
    const currentItem = currentMainMenus[currentIndex];

    await supabase.from('navbar_settings').update({ order_index: targetIndex }).eq('id', currentItem.id);
    await supabase.from('navbar_settings').update({ order_index: currentIndex }).eq('id', targetItem.id);
    fetchNavbar();
  };

  const deleteMenu = async (id: string) => {
    if (!window.confirm("Hapus menu ini?")) return;
    await supabase.from('navbar_settings').delete().eq('id', id);
    fetchNavbar();
  };

  const triggerSuccess = () => {
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  const mainMenus = navItems.filter(item => !item.parent_id);
  const getSubMenus = (id: string) => navItems.filter(item => item.parent_id === id);

  return (
    <div className="min-h-screen bg-[#050505] text-white p-6 md:p-12 font-sans selection:bg-blue-500/30">
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div>
            <h1 className="text-5xl font-black italic tracking-tighter uppercase text-white leading-none">
              KELOLA <span className="text-blue-600">NAVBAR</span>
            </h1>
            <p className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.3em] mt-3">
              Visual Branding & Navigation Engine
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={fetchNavbar} 
              className="group flex items-center gap-2 px-6 py-4 bg-zinc-900 rounded-2xl hover:bg-zinc-800 transition-all border border-white/5 active:scale-95 shadow-2xl"
            >
              <RefreshCcw size={18} className={`${isLoading ? 'animate-spin text-blue-500' : 'text-zinc-400 group-hover:text-white'}`} />
              <span className="text-[10px] font-black uppercase tracking-widest">Resync System</span>
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-12 gap-8">
          
          <div className="md:col-span-4 space-y-6">
            
            {/* Branding Section */}
            <div className="bg-zinc-900/50 border border-white/10 p-8 rounded-[2.5rem] backdrop-blur-xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <Settings size={64} />
              </div>
              <h3 className="text-[10px] font-black uppercase tracking-widest mb-8 flex items-center gap-3 text-blue-500">
                <Layers size={16} /> Club Identity
              </h3>
              
              <div className="space-y-6">
                <div className="relative">
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full h-40 bg-black border-2 border-dashed border-zinc-800 rounded-3xl flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-blue-500/50 transition-all overflow-hidden relative group/logo"
                  >
                    {brandSettings.logo_url ? (
                      <img src={brandSettings.logo_url} alt="Logo" className="h-24 w-auto object-contain z-10" />
                    ) : (
                      <div className="text-zinc-600 flex flex-col items-center gap-2">
                        <ImageIcon size={32} />
                        <span className="text-[9px] font-black uppercase tracking-widest text-center">Upload Logo</span>
                      </div>
                    )}
                    {isUploading && <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-30"><RefreshCcw className="animate-spin text-blue-500" /></div>}
                  </div>
                  <input type="file" ref={fileInputRef} onChange={handleLogoUpload} className="hidden" accept="image/*" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label className="text-[8px] font-black uppercase text-zinc-500 ml-1">Main Brand</label>
                    <input type="text" value={brandSettings.brand_name_main} onChange={(e) => setBrandSettings({...brandSettings, brand_name_main: e.target.value})} className="w-full bg-black border border-white/5 rounded-xl px-4 py-3 text-xs font-bold focus:border-blue-600 transition-all outline-none" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[8px] font-black uppercase text-zinc-500 ml-1">Accent</label>
                    <input type="text" value={brandSettings.brand_name_accent} onChange={(e) => setBrandSettings({...brandSettings, brand_name_accent: e.target.value})} className="w-full bg-black border border-white/5 rounded-xl px-4 py-3 text-xs font-bold text-blue-500 focus:border-blue-600 transition-all outline-none" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[8px] font-black uppercase text-zinc-500 ml-1">System Language</label>
                  <div className="relative">
                    <Globe size={14} className="absolute left-4 top-3.5 text-zinc-600" />
                    <select value={brandSettings.default_lang} onChange={(e) => setBrandSettings({...brandSettings, default_lang: e.target.value})} className="w-full bg-black border border-white/5 rounded-xl px-10 py-3 text-xs font-bold appearance-none cursor-pointer focus:border-blue-600 outline-none">
                      <option value="ID">ID - Indonesia</option>
                      <option value="EN">EN - English</option>
                    </select>
                  </div>
                </div>

                <button onClick={handleSaveBrand} disabled={isSavingBrand} className="w-full bg-white text-black hover:bg-blue-600 hover:text-white py-4 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] transition-all shadow-xl active:scale-95 disabled:opacity-50">
                  {isSavingBrand ? 'Saving...' : 'Update Branding'}
                </button>
              </div>
            </div>

            {/* Menu Form */}
            <div className="bg-zinc-900/50 border border-white/10 p-8 rounded-[2.5rem] shadow-xl">
              <h3 className="text-[10px] font-black uppercase tracking-widest mb-8 flex items-center gap-3 text-blue-500">
                <Plus size={16} /> New Navigation
              </h3>
              <form onSubmit={handleAddMenu} className="space-y-4">
                {formError && <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-[9px] font-bold uppercase tracking-widest flex items-center gap-2"><AlertCircle size={14} /> {formError}</div>}
                <input type="text" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Menu Label" className="w-full bg-black border border-white/5 rounded-xl px-5 py-4 text-xs font-bold focus:border-blue-600 outline-none transition-all" />
                <input type="text" value={path} onChange={(e) => setPath(e.target.value)} placeholder="Path (e.g. /home)" className="w-full bg-black border border-white/5 rounded-xl px-5 py-4 text-xs font-bold focus:border-blue-600 outline-none font-mono transition-all" />
                <div className="grid grid-cols-2 gap-3">
                  <select value={type} onChange={(e) => setType(e.target.value)} className="bg-black border border-white/5 rounded-xl px-4 py-3 text-[10px] font-black uppercase outline-none cursor-pointer"><option value="link">Single</option><option value="dropdown">Dropdown</option></select>
                  <select value={parentId} onChange={(e) => setParentId(e.target.value)} className="bg-black border border-white/5 rounded-xl px-4 py-3 text-[10px] font-black uppercase outline-none text-blue-500 cursor-pointer"><option value="none">Main Menu</option>{mainMenus.filter(m => m.type === 'dropdown').map(p => <option key={p.id} value={p.id}>{p.label}</option>)}</select>
                </div>
                <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 py-5 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-blue-600/20 transition-all active:scale-95">Register Menu</button>
              </form>
            </div>
          </div>

          <div className="md:col-span-8 space-y-4">
            {mainMenus.length === 0 ? (
              <div className="text-center py-40 border-2 border-dashed border-zinc-900 rounded-[3rem] bg-zinc-900/10">
                <Menu size={64} className="mx-auto text-zinc-900 mb-6 opacity-20" />
                <p className="text-zinc-600 font-black uppercase text-[10px] tracking-[0.3em]">System Navigation Empty</p>
              </div>
            ) : (
              mainMenus.map((item, index) => (
                <div 
                  key={item.id} 
                  className={`space-y-4 transition-all duration-300 ${draggedItemIndex === index ? 'opacity-30 scale-95 blur-sm' : 'opacity-100'}`}
                  draggable onDragStart={() => handleDragStart(index)} onDragOver={handleDragOver} onDrop={() => handleDrop(index)}
                >
                  <div className="group flex items-center justify-between bg-zinc-900 border border-white/5 p-6 rounded-[2.2rem] hover:border-blue-600/50 transition-all shadow-2xl cursor-grab active:cursor-grabbing">
                    <div className="flex items-center gap-6">
                      <GripVertical size={20} className="text-zinc-800 group-hover:text-blue-500" />
                      <div className="w-12 h-12 bg-black rounded-2xl flex items-center justify-center text-blue-500 font-black text-sm border border-white/5">
                        {index + 1}
                      </div>
                      <div>
                        {editingId === item.id ? (
                          <input 
                            autoFocus
                            className="bg-black border border-blue-600 rounded-lg px-3 py-1 text-sm font-black uppercase italic outline-none"
                            defaultValue={item.label}
                            onBlur={(e) => handleInlineUpdate(item.id, 'label', e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleInlineUpdate(item.id, 'label', (e.target as any).value)}
                          />
                        ) : (
                          <div className="flex items-center gap-3">
                            <h4 onClick={() => setEditingId(item.id)} className="font-black uppercase italic text-lg tracking-tighter hover:text-blue-500 cursor-pointer">{item.label}</h4>
                            {item.type === 'dropdown' && <span className="px-3 py-1 bg-blue-600 text-white text-[7px] font-black rounded-full uppercase tracking-widest">Group</span>}
                          </div>
                        )}
                        <p className="text-[9px] text-zinc-600 font-black uppercase tracking-widest flex items-center gap-2 mt-1"><LinkIcon size={12}/> {item.path}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex bg-black/40 p-1 rounded-xl mr-2">
                        <button onClick={() => updateOrder(item.id, index, 'up')} className="p-2 text-zinc-600 hover:text-white"><MoveUp size={16}/></button>
                        <button onClick={() => updateOrder(item.id, index, 'down')} className="p-2 text-zinc-600 hover:text-white"><MoveDown size={16}/></button>
                      </div>
                      <button onClick={() => deleteMenu(item.id)} className="w-11 h-11 flex items-center justify-center bg-red-600/10 text-red-600 hover:bg-red-600 hover:text-white rounded-xl transition-all shadow-xl"><Trash2 size={18}/></button>
                    </div>
                  </div>

                  <div className="ml-16 space-y-3 border-l-2 border-zinc-900 pl-8 pb-4">
                    {getSubMenus(item.id).map((sub) => (
                      <div key={sub.id} className="flex items-center justify-between bg-zinc-900/40 border border-white/5 p-4 rounded-2xl hover:bg-zinc-800 transition-all group/sub">
                        <div className="flex items-center gap-4">
                          <CornerDownRight size={18} className="text-zinc-700 group-hover/sub:text-blue-500" />
                          <div>
                            {editingId === sub.id ? (
                               <input 
                               autoFocus
                               className="bg-black border border-blue-600 rounded px-3 py-1 text-[10px] font-black uppercase italic outline-none"
                               defaultValue={sub.label}
                               onBlur={(e) => handleInlineUpdate(sub.id, 'label', e.target.value)}
                             />
                            ) : (
                              <p onClick={() => setEditingId(sub.id)} className="text-[12px] font-black uppercase text-zinc-300 tracking-tight hover:text-white cursor-pointer">{sub.label}</p>
                            )}
                            <p className="text-[8px] text-zinc-600 font-bold uppercase tracking-widest mt-0.5">{sub.path}</p>
                          </div>
                        </div>
                        <button onClick={() => deleteMenu(sub.id)} className="p-2 text-zinc-800 hover:text-red-500 transition-colors"><Trash2 size={14}/></button>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Success Notification */}
      <div className={`fixed bottom-12 left-1/2 -translate-x-1/2 transition-all duration-1000 z-[100] ${showSuccess ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-20 pointer-events-none'}`}>
        <div className="bg-blue-600 px-10 py-5 rounded-full flex items-center gap-4 shadow-[0_30px_60px_rgba(37,99,235,0.4)] border border-white/20">
          <div className="bg-white/20 p-2 rounded-full text-white animate-pulse"><CheckCircle2 size={20} /></div>
          <span className="font-black uppercase text-[11px] tracking-[0.3em]">Cloud System Synced</span>
        </div>
      </div>
    </div>
  );
};

export default KelolaNavbar;