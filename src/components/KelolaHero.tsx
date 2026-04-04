import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from "../supabase";
import { 
  Plus, Trash2, MoveUp, MoveDown, 
  Image as ImageIcon, RefreshCcw, 
  CheckCircle2, AlertCircle, Clock, Zap,
  Layers, Settings2, Edit3, X, ZoomIn, ZoomOut
} from 'lucide-react';
import Cropper from 'react-easy-crop';

const KelolaHero: React.FC = () => {
  const [slides, setSlides] = useState<any[]>([]);
  const [sliderSettings, setSliderSettings] = useState({
    duration: 6,
    effect: 'fade'
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- STATE BARU: IMAGE CROPPER ---
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [showCropModal, setShowCropModal] = useState(false);

  const HERO_CONFIG_ID = '6d9e09d9-acc2-46e9-9a73-87bc05444018';

  useEffect(() => {
    fetchHeroData();
  }, []);

  const fetchHeroData = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('site_settings')
        .select('value')
        .eq('key', 'hero_config')
        .maybeSingle();

      if (error) throw error;

      if (data?.value) {
        const val = data.value;
        setSlides(val.slides || []);
        setSliderSettings(val.settings || { duration: 6, effect: 'fade' });
      }
    } catch (err: any) {
      console.error("Error fetching hero data:", err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // --- LOGIKA CROP & KOMPRESI ---
  const onCropComplete = useCallback((_ : any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.addEventListener('load', () => {
        setImageToCrop(reader.result as string);
        setShowCropModal(true);
      });
      reader.readAsDataURL(file);
    }
  };

  const processAndUploadImage = async () => {
    if (!imageToCrop || !croppedAreaPixels) return;

    setIsUploading(true);
    setShowCropModal(false);

    try {
      // 1. Create Image Object
      const image = new Image();
      image.src = imageToCrop;
      await new Promise((resolve) => (image.onload = resolve));

      // 2. Create Canvas for Cropping & Compression
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      // Set output resolution (HD 16:9)
      const targetWidth = 1920;
      const targetHeight = 1080;
      canvas.width = targetWidth;
      canvas.height = targetHeight;

      if (ctx) {
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, targetWidth, targetHeight);
        ctx.drawImage(
          image,
          croppedAreaPixels.x, croppedAreaPixels.y,
          croppedAreaPixels.width, croppedAreaPixels.height,
          0, 0, targetWidth, targetHeight
        );
      }

      // 3. Convert to Blob (Compress to JPEG 0.8)
      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.8);
      });

      if (!blob) throw new Error("Gagal mengolah gambar.");

      // 4. Upload to Supabase
      const fileName = `hero-${Date.now()}.jpg`;
      const filePath = `hero-sliders/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('assets')
        .upload(filePath, blob, { contentType: 'image/jpeg' });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('assets').getPublicUrl(filePath);
      setImageUrl(data.publicUrl);

    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setIsUploading(false);
      setImageToCrop(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const saveToDatabase = async (updatedSlides: any[], updatedSettings = sliderSettings) => {
    const payload = {
      slides: updatedSlides,
      settings: updatedSettings,
      updated_at: new Date().toISOString()
    };

    const { error } = await supabase
      .from('site_settings')
      .upsert({ 
        id: HERO_CONFIG_ID,
        key: 'hero_config', 
        value: payload
      }, { onConflict: 'id' });

    if (!error) {
      setSlides(updatedSlides);
      setSliderSettings(updatedSettings);
      triggerSuccess();
    } else {
      alert("Database Error: " + error.message);
    }
  };

  const handleAddSlide = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageUrl || !title.trim()) {
      setFormError("Judul dan Gambar tidak boleh kosong");
      return;
    }

    let updatedSlides;
    if (editingId) {
      updatedSlides = slides.map(s => 
        s.id === editingId ? { ...s, title, subtitle, image: imageUrl } : s
      );
    } else {
      const newSlide = {
        id: Date.now(),
        title: title.trim(),
        subtitle: subtitle.trim(),
        image: imageUrl,
      };
      updatedSlides = [...slides, newSlide];
    }

    await saveToDatabase(updatedSlides);
    resetForm();
  };

  const deleteFromStorage = async (url: string) => {
    try {
      const path = url.split('/public/assets/')[1];
      if (path) {
        await supabase.storage.from('assets').remove([path]);
      }
    } catch (err) {
      console.error("Cleanup error:", err);
    }
  };

  const deleteSlide = async (id: number) => {
    const target = slides.find(s => s.id === id);
    if (!target || !window.confirm("Hapus slide ini secara permanen?")) return;
    await deleteFromStorage(target.image);
    const updatedSlides = slides.filter(s => s.id !== id);
    if (editingId === id) resetForm();
    await saveToDatabase(updatedSlides);
  };

  const startEdit = (slide: any) => {
    setEditingId(slide.id);
    setTitle(slide.title);
    setSubtitle(slide.subtitle);
    setImageUrl(slide.image);
    setFormError(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetForm = () => {
    setEditingId(null);
    setTitle('');
    setSubtitle('');
    setImageUrl('');
    setFormError(null);
  };

  const moveSlide = async (index: number, direction: 'up' | 'down') => {
    const newSlides = [...slides];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newSlides.length) return;
    [newSlides[index], newSlides[targetIndex]] = [newSlides[targetIndex], newSlides[index]];
    await saveToDatabase(newSlides);
  };

  const triggerSuccess = () => {
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white p-6 md:p-12 font-sans selection:bg-blue-500/30">
      
      {/* MODAL CROPPER - NEW FEATURE */}
      {showCropModal && imageToCrop && (
        <div className="fixed inset-0 z-[999] bg-black/95 flex flex-col items-center justify-center p-4 md:p-10 backdrop-blur-xl">
          <div className="w-full max-w-4xl bg-zinc-900 rounded-[2.5rem] overflow-hidden border border-white/10 shadow-2xl">
            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-zinc-900/50">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-500 flex items-center gap-3">
                <ImageIcon size={16} /> Precision Visual Cropping
              </h3>
              <button onClick={() => setShowCropModal(false)} className="text-zinc-500 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="relative h-[50vh] w-full bg-black">
              <Cropper
                image={imageToCrop}
                crop={crop}
                zoom={zoom}
                aspect={16 / 9}
                onCropChange={setCrop}
                onCropComplete={onCropComplete}
                onZoomChange={setZoom}
              />
            </div>

            <div className="p-8 space-y-6 bg-zinc-900">
              <div className="flex items-center gap-6">
                <ZoomOut size={16} className="text-zinc-500" />
                <input
                  type="range"
                  value={zoom}
                  min={1}
                  max={3}
                  step={0.1}
                  aria-labelledby="Zoom"
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="flex-grow h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
                <ZoomIn size={16} className="text-zinc-500" />
              </div>

              <div className="flex gap-4">
                <button 
                  onClick={() => setShowCropModal(false)}
                  className="flex-1 py-4 bg-zinc-800 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-zinc-700 transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={processAndUploadImage}
                  className="flex-[2] py-4 bg-blue-600 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-blue-500 transition-all shadow-[0_10px_30px_rgba(37,99,235,0.3)]"
                >
                  Apply Crop & Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div>
            <h1 className="text-5xl font-black italic tracking-tighter uppercase text-white leading-none">
              HERO <span className="text-blue-600">ENGINE</span>
            </h1>
            <p className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.3em] mt-3">
              Manajemen Visual & Kompresi Aset Otomatis
            </p>
          </div>
          <button 
            onClick={fetchHeroData}
            disabled={isLoading}
            className="flex items-center gap-3 px-8 py-4 bg-zinc-900 rounded-2xl border border-white/5 hover:bg-zinc-800 transition-all active:scale-95 shadow-2xl disabled:opacity-50"
          >
            <RefreshCcw size={18} className={isLoading ? 'animate-spin text-blue-500' : 'text-zinc-400'} />
            <span className="text-[10px] font-black uppercase tracking-widest">Resync Data</span>
          </button>
        </div>

        <div className="grid lg:grid-cols-12 gap-10">
          {/* SISI KIRI */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-blue-600 p-8 rounded-[2.5rem] shadow-[0_20px_50px_rgba(37,99,235,0.3)] relative overflow-hidden group">
               <Settings2 className="absolute -right-4 -bottom-4 text-white/10 w-32 h-32 rotate-12 group-hover:rotate-0 transition-transform duration-700" />
               <h3 className="text-[10px] font-black uppercase tracking-[0.2em] mb-6 flex items-center gap-2 text-white/90">
                 <Zap size={16} /> Slider Behavior
               </h3>
               <div className="space-y-6 relative z-10">
                 <div>
                   <label className="text-[9px] font-black uppercase text-blue-100 flex items-center gap-2 mb-3">
                     <Clock size={12} /> Auto-Slide Duration (Seconds)
                   </label>
                   <input 
                     type="range" min="3" max="15" step="1"
                     value={sliderSettings.duration}
                     onChange={(e) => setSliderSettings({...sliderSettings, duration: parseInt(e.target.value)})}
                     onMouseUp={() => saveToDatabase(slides, sliderSettings)}
                     className="w-full h-1.5 bg-blue-400 rounded-lg appearance-none cursor-pointer accent-white"
                   />
                   <div className="flex justify-between mt-2 text-[10px] font-black text-white">
                     <span>3s</span>
                     <span className="bg-white text-blue-600 px-3 py-0.5 rounded-full">{sliderSettings.duration} DETIK</span>
                     <span>15s</span>
                   </div>
                 </div>
               </div>
            </div>

            <div className={`bg-zinc-900/50 border ${editingId ? 'border-blue-600/50 shadow-[0_0_30px_rgba(37,99,235,0.1)]' : 'border-white/10'} p-8 rounded-[2.5rem] backdrop-blur-xl transition-all`}>
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2 text-blue-500">
                  {editingId ? <Edit3 size={16} /> : <Plus size={16} />} 
                  {editingId ? 'Modify Hero Slide' : 'Register New Slide'}
                </h3>
                {editingId && <button onClick={resetForm} className="text-zinc-500 hover:text-white"><X size={16}/></button>}
              </div>
              
              <form onSubmit={handleAddSlide} className="space-y-5">
                <div 
                  onClick={() => !isUploading && fileInputRef.current?.click()}
                  className={`group relative w-full h-44 bg-black border-2 border-dashed ${isUploading ? 'border-blue-600' : 'border-zinc-800'} rounded-[2rem] flex flex-col items-center justify-center cursor-pointer hover:border-blue-600/50 transition-all overflow-hidden`}
                >
                  {imageUrl ? (
                    <img src={imageUrl} alt="Preview" className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                  ) : (
                    <div className="text-center">
                      <ImageIcon size={32} className="mx-auto text-zinc-700 mb-3" />
                      <p className="text-[8px] font-black uppercase text-zinc-500 tracking-widest">Select Visual</p>
                    </div>
                  )}
                  {isUploading && (
                    <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center gap-2">
                      <RefreshCcw className="animate-spin text-blue-500" />
                      <span className="text-[8px] font-black uppercase tracking-tighter">Optimizing...</span>
                    </div>
                  )}
                </div>
                <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" accept="image/*" />

                <input 
                  type="text" placeholder="Title Line" 
                  value={title} onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-black border border-white/5 rounded-xl px-5 py-4 text-xs font-bold focus:border-blue-600 outline-none transition-colors"
                />
                <textarea 
                  placeholder="Subtitle detail description..." 
                  value={subtitle} onChange={(e) => setSubtitle(e.target.value)}
                  className="w-full bg-black border border-white/5 rounded-xl px-5 py-4 text-xs font-bold focus:border-blue-600 outline-none h-28 resize-none transition-colors"
                />

                {formError && (
                  <p className="text-red-500 text-[9px] font-black uppercase tracking-tighter flex items-center gap-2">
                    <AlertCircle size={14}/> {formError}
                  </p>
                )}

                <div className="flex gap-3">
                  {editingId && (
                    <button type="button" onClick={resetForm} className="flex-1 bg-zinc-800 hover:bg-zinc-700 py-5 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all">
                      Cancel
                    </button>
                  )}
                  <button 
                    type="submit" 
                    disabled={isUploading}
                    className={`flex-[2] ${editingId ? 'bg-green-600 hover:bg-green-500' : 'bg-blue-600 hover:bg-blue-500'} py-5 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all shadow-xl disabled:opacity-50`}
                  >
                    {editingId ? 'Save Changes' : 'Publish to Hero'}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* SISI KANAN */}
          <div className="lg:col-span-8 space-y-4">
            {slides.length === 0 ? (
              <div className="text-center py-40 border-2 border-dashed border-zinc-900 rounded-[3rem] opacity-30">
                <Layers size={64} className="mx-auto mb-6" />
                <p className="font-black uppercase text-[10px] tracking-[0.4em]">Empty Gallery</p>
              </div>
            ) : (
              slides.map((slide, index) => (
                <div key={slide.id} className={`group flex flex-col md:flex-row items-center gap-6 bg-zinc-900 border ${editingId === slide.id ? 'border-blue-600' : 'border-white/5'} p-6 rounded-[2.5rem] hover:border-blue-600/40 transition-all relative overflow-hidden`}>
                  <div className="relative w-full md:w-56 h-36 rounded-[1.5rem] overflow-hidden flex-shrink-0 shadow-2xl">
                    <img src={slide.image} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                    <div className="absolute top-4 left-4 bg-blue-600 text-white w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black">
                      {index + 1}
                    </div>
                  </div>
                  <div className="flex-grow">
                    <h4 className="font-black uppercase italic text-lg tracking-tighter text-white mb-2">{slide.title}</h4>
                    <p className="text-[10px] text-zinc-500 font-bold uppercase leading-relaxed line-clamp-2">{slide.subtitle}</p>
                  </div>
                  <div className="flex md:flex-col gap-2">
                    <div className="flex bg-black p-1.5 rounded-2xl border border-white/5">
                      <button onClick={() => moveSlide(index, 'up')} className="p-2 text-zinc-500 hover:text-white"><MoveUp size={18}/></button>
                      <button onClick={() => moveSlide(index, 'down')} className="p-2 text-zinc-500 hover:text-white"><MoveDown size={18}/></button>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => startEdit(slide)} className="flex-1 p-4 bg-blue-600/10 text-blue-500 hover:bg-blue-600 hover:text-white rounded-2xl transition-all"><Edit3 size={20} /></button>
                      <button onClick={() => deleteSlide(slide.id)} className="flex-1 p-4 bg-red-600/10 text-red-600 hover:bg-red-600 hover:text-white rounded-2xl transition-all"><Trash2 size={20} /></button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className={`fixed bottom-12 left-1/2 -translate-x-1/2 transition-all duration-1000 z-[100] ${showSuccess ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-20 pointer-events-none'}`}>
        <div className="bg-blue-600 px-10 py-5 rounded-full flex items-center gap-4 shadow-2xl border border-white/20">
          <div className="bg-white/20 p-2 rounded-full text-white"><CheckCircle2 size={20} /></div>
          <span className="font-black uppercase text-[11px] tracking-[0.3em]">System Synced & Optimized</span>
        </div>
      </div>
    </div>
  );
};

export default KelolaHero;