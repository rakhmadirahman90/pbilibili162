import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase';
import { Trash2, Plus, Image as ImageIcon, Loader2, X, ZoomIn, ZoomOut, Check } from 'lucide-react';
import Cropper from 'react-easy-crop';
import imageCompression from 'browser-image-compression';

// --- JIKA TETAP TIDAK MUNCUL, TAMBAHKAN LINE INI DI CSS GLOBAL ANDA ---
// .react-easy-crop_Container { color: white; }

interface HeroSlide {
  id: number | string;
  title: string;
  subtitle: string;
  image: string;
}

export default function HeroAdmin() {
  const [slides, setSlides] = useState<HeroSlide[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const [newTitle, setNewTitle] = useState('');
  const [newSubtitle, setNewSubtitle] = useState('');
  
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [showCropper, setShowCropper] = useState(false);
  const [tempPreview, setTempPreview] = useState<string | null>(null);

  useEffect(() => {
    fetchHeroData();
  }, []);

  const fetchHeroData = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('site_settings')
        .select('value')
        .eq('key', 'hero_config')
        .maybeSingle();
      if (data && data.value) setSlides(data.value.slides || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setImageSrc(reader.result as string);
      setShowCropper(true);
      setZoom(1);
      setCrop({ x: 0, y: 0 });
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const onCropComplete = useCallback((_: any, clippedPixels: any) => {
    setCroppedAreaPixels(clippedPixels);
  }, []);

  const handleConfirmCrop = async () => {
    if (!imageSrc || !croppedAreaPixels) return;
    try {
      const image = new Image();
      image.src = imageSrc;
      await new Promise((res) => (image.onload = res));

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = croppedAreaPixels.width;
      canvas.height = croppedAreaPixels.height;

      ctx?.drawImage(
        image,
        croppedAreaPixels.x,
        croppedAreaPixels.y,
        croppedAreaPixels.width,
        croppedAreaPixels.height,
        0, 0,
        croppedAreaPixels.width,
        croppedAreaPixels.height
      );

      setTempPreview(canvas.toDataURL('image/jpeg'));
      setShowCropper(false);
    } catch (e) {
      console.error(e);
    }
  };

  const handlePublish = async () => {
    if (!tempPreview || !newTitle) return alert("Lengkapi data!");
    setUploading(true);
    try {
      const res = await fetch(tempPreview);
      const blob = await res.blob();
      const file = await imageCompression(new File([blob], "h.jpg"), { maxSizeMB: 0.8 });
      
      const fileName = `hero-${Date.now()}.jpg`;
      await supabase.storage.from('assets').upload(`hero/${fileName}`, file);
      const { data: { publicUrl } } = supabase.storage.from('assets').getPublicUrl(`hero/${fileName}`);

      const updated = [...slides, { id: Date.now(), title: newTitle, subtitle: newSubtitle, image: publicUrl }];
      await supabase.from('site_settings').upsert({
        key: 'hero_config',
        value: { settings: { duration: 7 }, slides: updated }
      });
      setSlides(updated);
      setTempPreview(null); setNewTitle(''); setNewSubtitle('');
    } catch (err) {
      alert("Gagal Publish");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6 bg-black text-white min-h-screen">
      
      {/* MODAL CROPPER DENGAN OVERLAY TERPISAH */}
      {showCropper && imageSrc && (
        <div className="fixed inset-0 z-[99999] bg-zinc-950 flex flex-col">
          <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-black">
            <h2 className="font-bold text-blue-500 uppercase italic">Crop Image 16:9</h2>
            <button onClick={() => setShowCropper(false)}><X size={28}/></button>
          </div>

          {/* BOX CROPPER - Di sinilah kuncinya */}
          <div className="relative flex-grow w-full bg-[#050505]">
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={16 / 9}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
              // Tambahkan class khusus atau inline style yang kuat
              classes={{
                containerClassName: "min-h-[300px] w-full h-full",
              }}
              style={{
                containerStyle: { width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 },
                cropAreaStyle: { border: '2px solid #3b82f6', boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.6)' }
              }}
            />
          </div>

          <div className="p-6 bg-black border-t border-zinc-800 flex flex-col items-center gap-6">
            <div className="flex items-center gap-4 w-full max-w-md">
              <ZoomOut size={20} />
              <input type="range" min={1} max={3} step={0.1} value={zoom} onChange={(e)=>setZoom(Number(e.target.value))} className="flex-grow accent-blue-600" />
              <ZoomIn size={20} />
            </div>
            <button onClick={handleConfirmCrop} className="bg-blue-600 px-10 py-3 rounded-full font-bold">TERAPKAN POTONGAN</button>
          </div>
        </div>
      )}

      {/* DASHBOARD */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-4 bg-zinc-900/50 p-6 rounded-[2rem] border border-white/5">
          <div 
            onClick={() => document.getElementById('file-input')?.click()}
            className="aspect-video bg-black rounded-3xl mb-6 flex items-center justify-center border-2 border-dashed border-zinc-800 overflow-hidden cursor-pointer"
          >
            {tempPreview ? <img src={tempPreview} className="w-full h-full object-cover" /> : <ImageIcon className="opacity-20" size={40}/>}
            <input id="file-input" type="file" hidden accept="image/*" onChange={onFileChange} />
          </div>
          <div className="space-y-4">
            <input placeholder="Judul" value={newTitle} onChange={(e)=>setNewTitle(e.target.value)} className="w-full bg-black p-4 rounded-xl border border-zinc-800 focus:border-blue-500 outline-none" />
            <textarea placeholder="Deskripsi" value={newSubtitle} onChange={(e)=>setNewSubtitle(e.target.value)} className="w-full bg-black p-4 rounded-xl border border-zinc-800 h-24 focus:border-blue-500 outline-none" />
            <button onClick={handlePublish} disabled={uploading} className="w-full bg-blue-600 py-4 rounded-xl font-bold uppercase tracking-widest">
              {uploading ? <Loader2 className="animate-spin mx-auto"/> : "PUBLISH SLIDE"}
            </button>
          </div>
        </div>

        <div className="lg:col-span-8 space-y-4">
          {slides.map(s => (
            <div key={s.id} className="bg-zinc-900/30 p-4 rounded-3xl border border-white/5 flex gap-4 items-center">
              <img src={s.image} className="w-32 aspect-video object-cover rounded-xl" />
              <div className="flex-grow"><h4 className="font-bold">{s.title}</h4></div>
              <button onClick={async () => {
                const filtered = slides.filter(x => x.id !== s.id);
                await supabase.from('site_settings').upsert({ key: 'hero_config', value: { slides: filtered } });
                setSlides(filtered);
              }} className="p-3 text-red-500"><Trash2/></button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}