import React, { useState, useEffect, useRef, useMemo } from 'react';
import { supabase } from "../supabase";
import { 
  Plus, Trash2, Image as ImageIcon, Video, 
  Upload, X, Loader2, CheckCircle2,
  Film, Camera, ChevronLeft, ChevronRight,
  Edit3, AlignLeft, Tag, Link as LinkIcon,
  PlayCircle, AlertCircle
} from 'lucide-react';

interface GalleryItem {
  id: string;
  title: string;
  type: 'image' | 'video';
  url: string;
  category: string;
  description: string;
  created_at: string;
  is_local?: boolean;
}

export default function AdminGallery() {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'image' | 'video'>('image');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  const [videoInputMethod, setVideoInputMethod] = useState<'link' | 'file'>('file');
  const [dragActive, setDragActive] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    type: 'image' as 'image' | 'video',
    url: '',
    category: 'Pertandingan',
    description: '',
    is_local: true 
  });

  const categories = ['Pertandingan', 'Latihan', 'Prestasi', 'Fasilitas', 'Latihan Rutin'];

  useEffect(() => {
    fetchGallery();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab]);

  async function fetchGallery() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('gallery')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setItems(data || []);
    } catch (err: any) {
      console.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  const getYouTubeID = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|shorts\/)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const processVideoUrl = (url: string) => {
    const id = getYouTubeID(url);
    if (id) return `https://www.youtube.com/embed/${id}`;
    return url;
  };

  const handleEdit = (item: GalleryItem) => {
    setEditingId(item.id);
    setFormData({
      title: item.title,
      type: item.type,
      url: item.url,
      category: item.category || 'Pertandingan',
      description: item.description || '',
      is_local: item.is_local ?? (!item.url.includes('youtube.com') && !item.url.includes('youtu.be'))
    });
    if (item.type === 'video') {
        setVideoInputMethod(item.url.includes('http') && !item.url.includes('supabase') ? 'link' : 'file');
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setVideoInputMethod('file');
    setFormData({ 
      title: '', 
      type: 'image', 
      url: '', 
      category: 'Pertandingan', 
      description: '',
      is_local: true
    });
  };

  const filteredItems = useMemo(() => {
    return items.filter(item => item.type === activeTab);
  }, [items, activeTab]);

  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
  
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredItems.slice(start, start + itemsPerPage);
  }, [filteredItems, currentPage]);

  // BARU: Validasi File dan Handle Upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement> | React.DragEvent) => {
    let file: File | undefined;
    
    if ('files' in e.target && e.target.files) {
      file = e.target.files[0];
    } else if ('dataTransfer' in e && e.dataTransfer.files) {
      file = e.dataTransfer.files[0];
    }

    if (!file) return;

    // Validasi Ukuran (Max 15MB untuk Video, 5MB untuk Foto)
    const maxSize = formData.type === 'video' ? 15 * 1024 * 1024 : 5 * 1024 * 1024;
    if (file.size > maxSize) {
      alert(`Ukuran file terlalu besar! Maksimal ${formData.type === 'video' ? '15MB' : '5MB'}`);
      return;
    }

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
      const filePath = `uploads/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('gallery')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('gallery')
        .getPublicUrl(filePath);

      setFormData({ ...formData, url: publicUrl, is_local: true });
      showToast("Media berhasil diunggah ke cloud!");
    } catch (err: any) {
      alert("Gagal upload: " + err.message);
    } finally {
      setIsUploading(false);
      setDragActive(false);
    }
  };

  const showToast = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.url) return alert("Pilih file atau masukkan link terlebih dahulu!");

    let finalUrl = formData.url;
    if (formData.type === 'video' && videoInputMethod === 'link') {
        const ytId = getYouTubeID(formData.url);
        if (!ytId) return alert("Link YouTube tidak valid!");
        finalUrl = processVideoUrl(formData.url);
    }

    const payload = {
        title: formData.title,
        type: formData.type,
        url: finalUrl,
        category: formData.category,
        description: formData.description,
        is_local: formData.type === 'image' ? true : (videoInputMethod === 'file')
    };

    try {
      if (editingId) {
        const { error } = await supabase.from('gallery').update(payload).eq('id', editingId);
        if (error) throw error;
        showToast("Data galeri diperbarui!");
      } else {
        const { error } = await supabase.from('gallery').insert([payload]);
        if (error) throw error;
        showToast("Momen baru berhasil dipublikasi!");
      }
      handleCloseModal();
      fetchGallery();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDelete = async (id: string, url: string) => {
    if (!window.confirm("Hapus media ini selamanya?")) return;
    try {
      await supabase.from('gallery').delete().eq('id', id);
      if (url.includes('supabase.co')) {
        const pathParts = url.split('/');
        const fileName = pathParts[pathParts.length - 1];
        await supabase.storage.from('gallery').remove([`uploads/${fileName}`]);
      }
      showToast("Momen dihapus dari galeri");
      fetchGallery();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white p-4 md:p-12 font-sans selection:bg-blue-600/30">
      <div className="max-w-6xl mx-auto">
        
        {successMsg && (
          <div className="fixed top-10 left-1/2 -translate-x-1/2 z-[200] bg-blue-600 text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase flex items-center gap-3 shadow-[0_20px_50px_rgba(37,99,235,0.3)] animate-in fade-in slide-in-from-top-4">
            <CheckCircle2 size={18} /> {successMsg}
          </div>
        )}

        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-12">
          <div className="animate-in slide-in-from-left duration-700">
            <h1 className="text-6xl font-black italic tracking-tighter uppercase leading-none">
              MANAGE<span className="text-blue-600"> GALLERY</span>
            </h1>
            <div className="flex items-center gap-3 mt-4">
               <span className="h-px w-8 bg-blue-600"></span>
               <p className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.3em]">Cloud Media Management v2.0</p>
            </div>
          </div>
          
          <button 
            onClick={() => {
                setFormData({...formData, type: activeTab});
                setIsModalOpen(true);
            }}
            className="group relative flex items-center gap-3 bg-white text-black hover:bg-blue-600 hover:text-white px-10 py-5 rounded-2xl font-black uppercase text-[10px] transition-all active:scale-95 overflow-hidden"
          >
            <Plus size={18} className="transition-transform group-hover:rotate-90" /> Tambah {activeTab === 'image' ? 'Foto' : 'Video'}
          </button>
        </div>

        <div className="flex gap-2 mb-10 bg-zinc-900/50 p-2 rounded-2xl w-fit border border-white/5">
          <button 
            onClick={() => setActiveTab('image')}
            className={`flex items-center gap-3 px-8 py-4 rounded-xl font-black text-[10px] uppercase transition-all ${activeTab === 'image' ? 'bg-blue-600 text-white shadow-[0_10px_20px_rgba(37,99,235,0.2)]' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            <ImageIcon size={16} /> Photography
          </button>
          <button 
            onClick={() => setActiveTab('video')}
            className={`flex items-center gap-3 px-8 py-4 rounded-xl font-black text-[10px] uppercase transition-all ${activeTab === 'video' ? 'bg-blue-600 text-white shadow-[0_10px_20px_rgba(37,99,235,0.2)]' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            <Video size={16} /> Videography
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 min-h-[400px]">
          {loading ? (
            <div className="col-span-full flex flex-col items-center justify-center py-32 text-zinc-700">
                <Loader2 className="animate-spin mb-6 text-blue-600" size={50} />
                <span className="font-black uppercase tracking-[0.5em] text-[10px]">Accessing Database...</span>
            </div>
          ) : paginatedItems.length === 0 ? (
            <div className="col-span-full py-32 text-center border-4 border-dashed border-white/5 rounded-[3rem] group">
                <ImageIcon size={48} className="mx-auto text-zinc-800 mb-6 group-hover:text-blue-600/20 transition-colors" />
                <p className="text-zinc-600 font-black uppercase italic tracking-widest">No assets found in this category</p>
            </div>
          ) : paginatedItems.map((item, idx) => (
            <div 
              key={item.id} 
              style={{ animationDelay: `${idx * 100}ms` }}
              className="group relative bg-zinc-900/30 border border-white/5 rounded-[2.5rem] overflow-hidden aspect-[4/3] transition-all hover:border-blue-600/50 animate-in fade-in zoom-in duration-500"
            >
              {item.type === 'image' ? (
                <img src={item.url} className="w-full h-full object-cover grayscale-[50%] group-hover:grayscale-0 transition-all duration-700 group-hover:scale-110" alt={item.title} />
              ) : (
                <div className="relative w-full h-full bg-black">
                    {item.url.includes('youtube.com') || item.url.includes('youtu.be') ? (
                        <div className="w-full h-full relative">
                            <img 
                                src={`https://img.youtube.com/vi/${getYouTubeID(item.url)}/maxresdefault.jpg`} 
                                className="w-full h-full object-cover opacity-40 group-hover:opacity-80 transition-opacity"
                                alt="Thumbnail"
                                onError={(e: any) => { e.target.src = `https://img.youtube.com/vi/${getYouTubeID(item.url)}/mqdefault.jpg`; }}
                            />
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center group-hover:bg-red-600 group-hover:scale-110 transition-all duration-500">
                                  <PlayCircle size={32} className="text-white" />
                                </div>
                            </div>
                            <span className="absolute top-6 left-6 bg-red-600 text-[7px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest shadow-lg shadow-red-600/20">YouTube</span>
                        </div>
                    ) : (
                        <video src={item.url} className="w-full h-full object-cover opacity-60" />
                    )}
                </div>
              )}
              
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500 p-8 flex flex-col justify-end">
                <div className="space-y-4 translate-y-8 group-hover:translate-y-0 transition-transform duration-500">
                  <div>
                    <span className="bg-blue-600 text-white text-[7px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-full inline-block mb-3">{item.category}</span>
                    <h3 className="font-black text-xl uppercase italic leading-none truncate mb-2">{item.title}</h3>
                    <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider line-clamp-2 leading-relaxed">{item.description}</p>
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button onClick={() => handleEdit(item)} className="flex-1 bg-white/10 backdrop-blur-md hover:bg-blue-600 py-4 rounded-2xl transition-all flex items-center justify-center">
                      <Edit3 size={18} />
                    </button>
                    <button onClick={() => handleDelete(item.id, item.url)} className="flex-1 bg-red-600/20 backdrop-blur-md hover:bg-red-600 py-4 rounded-2xl transition-all flex items-center justify-center text-red-500 hover:text-white">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {totalPages > 1 && (
          <div className="mt-16 flex justify-center items-center gap-6 animate-in fade-in duration-1000">
            <button 
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => prev - 1)}
              className="w-14 h-14 flex items-center justify-center bg-zinc-900 border border-white/5 rounded-2xl disabled:opacity-10 hover:bg-blue-600 transition-all shadow-xl"
            >
              <ChevronLeft size={24} />
            </button>
            <div className="flex gap-3">
              {[...Array(totalPages)].map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentPage(i + 1)}
                  className={`w-14 h-14 rounded-2xl font-black text-xs transition-all ${currentPage === i + 1 ? 'bg-blue-600 text-white scale-110 shadow-lg shadow-blue-600/30' : 'bg-zinc-900 text-zinc-600 hover:text-white border border-white/5'}`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
            <button 
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(prev => prev + 1)}
              className="w-14 h-14 flex items-center justify-center bg-zinc-900 border border-white/5 rounded-2xl disabled:opacity-10 hover:bg-blue-600 transition-all shadow-xl"
            >
              <ChevronRight size={24} />
            </button>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/90 backdrop-blur-2xl animate-in fade-in duration-300">
          <div className="bg-[#0c0c0c] w-full max-w-xl max-h-[92vh] overflow-y-auto rounded-[3rem] border border-white/10 shadow-[0_50px_100px_rgba(0,0,0,0.8)] scale-in-center scrollbar-hide">
            <div className="sticky top-0 bg-[#0c0c0c]/90 backdrop-blur-xl p-10 border-b border-white/5 flex justify-between items-center z-20">
              <div>
                <h3 className="font-black uppercase italic text-3xl leading-none">
                  {editingId ? 'REVISE' : 'CREATE'} <span className="text-blue-600">{formData.type}</span>
                </h3>
                <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest mt-2">Update information for public gallery</p>
              </div>
              <button onClick={handleCloseModal} className="w-12 h-12 flex items-center justify-center bg-zinc-900 rounded-2xl text-zinc-500 hover:text-white hover:bg-red-600 transition-all"><X size={24}/></button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-10 space-y-8">
              <div className="space-y-4">
                <label className="text-[10px] font-black text-zinc-500 uppercase flex items-center gap-2 tracking-widest">
                   <PlayCircle size={14}/> Asset Type
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <button 
                    type="button"
                    onClick={() => setFormData({...formData, type: 'image'})}
                    className={`group py-5 rounded-[1.5rem] border-2 flex flex-col items-center gap-3 transition-all ${formData.type === 'image' ? 'bg-blue-600 border-blue-600' : 'bg-zinc-900/50 border-white/5 text-zinc-600'}`}
                  >
                    <Camera size={24} className={formData.type === 'image' ? 'text-white' : 'group-hover:text-white'} /> 
                    <span className="font-black text-[10px] tracking-widest uppercase">Photography</span>
                  </button>
                  <button 
                    type="button"
                    onClick={() => setFormData({...formData, type: 'video'})}
                    className={`group py-5 rounded-[1.5rem] border-2 flex flex-col items-center gap-3 transition-all ${formData.type === 'video' ? 'bg-blue-600 border-blue-600' : 'bg-zinc-900/50 border-white/5 text-zinc-600'}`}
                  >
                    <Film size={24} className={formData.type === 'video' ? 'text-white' : 'group-hover:text-white'} /> 
                    <span className="font-black text-[10px] tracking-widest uppercase">Videography</span>
                  </button>
                </div>
              </div>

              {formData.type === 'video' && (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-4">
                  <label className="text-[10px] font-black text-zinc-500 uppercase flex items-center gap-2 tracking-widest">
                    <Video size={14}/> Video Source
                  </label>
                  <div className="grid grid-cols-2 gap-3 bg-zinc-900/80 p-2 rounded-2xl border border-white/5">
                    <button 
                        type="button"
                        onClick={() => setVideoInputMethod('file')}
                        className={`py-3 rounded-xl flex items-center justify-center gap-2 font-black text-[9px] uppercase tracking-widest transition-all ${videoInputMethod === 'file' ? 'bg-zinc-800 text-blue-500 shadow-xl' : 'text-zinc-600 hover:text-zinc-400'}`}
                    >
                        Local File
                    </button>
                    <button 
                        type="button"
                        onClick={() => setVideoInputMethod('link')}
                        className={`py-3 rounded-xl flex items-center justify-center gap-2 font-black text-[9px] uppercase tracking-widest transition-all ${videoInputMethod === 'link' ? 'bg-zinc-800 text-blue-500 shadow-xl' : 'text-zinc-600 hover:text-zinc-400'}`}
                    >
                        YouTube URL
                    </button>
                  </div>
                </div>
              )}

              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] flex items-center gap-2">
                     <Edit3 size={14}/> Asset Title
                  </label>
                  <input 
                    required
                    className="w-full bg-zinc-900/50 border border-white/10 rounded-2xl p-5 outline-none focus:border-blue-600 font-bold uppercase transition-all placeholder:text-zinc-800"
                    placeholder="E.g. Training Session..."
                    value={formData.title}
                    onChange={e => setFormData({...formData, title: e.target.value})}
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] flex items-center gap-2">
                    <Tag size={14}/> Category
                  </label>
                  <select 
                    className="w-full bg-zinc-900/50 border border-white/10 rounded-2xl p-5 outline-none focus:border-blue-600 font-bold uppercase transition-all appearance-none cursor-pointer text-blue-500"
                    value={formData.category}
                    onChange={e => setFormData({...formData, category: e.target.value})}
                  >
                    {categories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] flex items-center gap-2">
                   <AlignLeft size={14}/> Description
                </label>
                <textarea 
                  required
                  rows={3}
                  className="w-full bg-zinc-900/50 border border-white/10 rounded-3xl p-6 outline-none focus:border-blue-600 font-medium transition-all placeholder:text-zinc-800 resize-none"
                  placeholder="Tell the story about this moment..."
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                />
              </div>

              <div className="space-y-4">
                <label className="text-[10px] font-black text-zinc-500 uppercase flex items-center gap-2 tracking-widest">
                   {formData.type === 'image' || videoInputMethod === 'file' ? <Upload size={14}/> : <LinkIcon size={14}/>} 
                   Media Payload
                </label>

                {(formData.type === 'image' || videoInputMethod === 'file') ? (
                    <div 
                        onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                        onDragLeave={() => setDragActive(false)}
                        onDrop={(e) => { e.preventDefault(); handleFileUpload(e); }}
                        onClick={() => !isUploading && fileInputRef.current?.click()}
                        className={`group relative h-56 rounded-[2.5rem] border-4 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all overflow-hidden ${dragActive ? 'bg-blue-600/10 border-blue-600 scale-[0.98]' : 'bg-zinc-900/30 border-white/5 hover:border-blue-600/40'}`}
                    >
                        {formData.url && formData.is_local ? (
                            formData.type === 'image' ? (
                                <img src={formData.url} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                            ) : (
                                <div className="flex flex-col items-center text-blue-500 text-center px-10">
                                    <div className="w-16 h-16 bg-blue-600/10 rounded-full flex items-center justify-center mb-4">
                                       <Video size={32} />
                                    </div>
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em]">Video Securely Stored</span>
                                    <p className="text-[8px] text-zinc-600 mt-2 font-bold uppercase truncate max-w-full italic">{formData.url.split('/').pop()}</p>
                                </div>
                            )
                        ) : (
                            <>
                                <div className={`p-6 bg-zinc-900 rounded-3xl mb-4 text-zinc-700 group-hover:text-blue-600 group-hover:scale-110 transition-all duration-500 shadow-2xl`}>
                                   <Upload size={32} />
                                </div>
                                <div className="text-center">
                                    <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.1em]">
                                        {dragActive ? 'Drop file now' : `Drop or click to upload ${formData.type}`}
                                    </p>
                                    <p className="text-[8px] text-zinc-700 font-black uppercase mt-2 tracking-widest">Limits: {formData.type === 'image' ? '5MB' : '15MB'}</p>
                                </div>
                            </>
                        )}
                        
                        {isUploading && (
                        <div className="absolute inset-0 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center animate-in fade-in duration-300">
                            <div className="relative">
                                <Loader2 className="animate-spin text-blue-600 mb-4" size={48} />
                                <div className="absolute inset-0 animate-pulse bg-blue-600/20 rounded-full blur-2xl"></div>
                            </div>
                            <p className="text-[10px] font-black uppercase tracking-[0.4em] animate-pulse">Syncing to Cloud...</p>
                        </div>
                        )}
                    </div>
                ) : (
                    <div className="space-y-4 animate-in zoom-in duration-500">
                        <div className="relative">
                            <input 
                                className="w-full bg-zinc-900/80 border border-white/10 rounded-[1.5rem] p-6 outline-none focus:border-red-600 font-bold text-xs transition-all pr-16"
                                placeholder="Paste Link YouTube / Shorts..."
                                value={formData.is_local ? '' : formData.url}
                                onChange={e => setFormData({...formData, url: e.target.value, is_local: false})}
                            />
                            <div className="absolute right-6 top-1/2 -translate-y-1/2 text-red-600">
                                <Film size={20} />
                            </div>
                        </div>
                        {formData.url && getYouTubeID(formData.url) && (
                            <div className="bg-red-600/5 border border-red-600/20 p-4 rounded-2xl flex items-center gap-4 animate-in slide-in-from-top-2">
                                <div className="w-20 aspect-video rounded-lg overflow-hidden bg-black shrink-0">
                                    <img src={`https://img.youtube.com/vi/${getYouTubeID(formData.url)}/default.jpg`} className="w-full h-full object-cover" />
                                </div>
                                <div>
                                    <p className="text-[9px] font-black uppercase text-red-500 tracking-widest">Valid Link Detected</p>
                                    <p className="text-[8px] text-zinc-500 font-bold truncate max-w-[200px]">{formData.url}</p>
                                </div>
                            </div>
                        )}
                        <div className="flex items-start gap-3 px-2">
                            <AlertCircle size={14} className="text-zinc-700 shrink-0 mt-0.5" />
                            <p className="text-[9px] text-zinc-600 font-bold uppercase leading-relaxed tracking-wider">Paste the full browser URL. We'll automatically generate the embed code and high-res thumbnail.</p>
                        </div>
                    </div>
                )}

                <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileUpload} 
                    className="hidden" 
                    accept={formData.type === 'image' ? 'image/jpeg,image/png,image/webp' : 'video/mp4,video/webm'} 
                />
              </div>

              <button 
                type="submit"
                disabled={isUploading || !formData.url}
                className="group relative w-full py-6 bg-blue-600 hover:bg-blue-500 disabled:opacity-20 disabled:grayscale rounded-[1.5rem] font-black uppercase text-[11px] tracking-[0.3em] shadow-[0_20px_40px_rgba(37,99,235,0.25)] transition-all active:scale-95 overflow-hidden"
              >
                <span className="relative z-10">{editingId ? 'Push Changes to Cloud' : 'Launch to Live Gallery'}</span>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
              </button>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scale-in-center { animation: scale-in-center 0.4s cubic-bezier(0.250, 0.460, 0.450, 0.940) both; }
        @keyframes scale-in-center {
          0% { transform: scale(0.9); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
        ::selection { background: #2563eb; color: white; }
      `}</style>
    </div>
  );
}