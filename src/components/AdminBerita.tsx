import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from "../supabase";
import { 
  Newspaper, Plus, Trash2, Edit3, Save, X, 
  Image as ImageIcon, Calendar, Tag, Loader2, Zap, Search, AlertCircle, 
  Filter, ArrowUpDown, Clock, Upload, Maximize, Check, MessageSquare, User, Trash, 
  Heart, Send, CornerDownRight 
} from 'lucide-react';
import * as XLSX from 'xlsx';
import Cropper from 'react-easy-crop';

interface Komentar {
  id: string;
  nama_user: string;
  isi_komentar: string;
  tanggal: string;
  berita_id: string;
}

interface Berita {
  id: string;
  judul: string;
  ringkasan: string;
  konten: string;
  kategori: string;
  gambar_url: string;
  tanggal: string;
  created_at?: string;
  comments_count?: number;
  likes?: number; // Menampilkan jumlah like
}

export default function AdminBerita() {
  const [news, setNews] = useState<Berita[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // --- STATE KOMENTAR & REPLY ---
  const [isCommentModalOpen, setIsCommentModalOpen] = useState(false);
  const [selectedNewsForComments, setSelectedNewsForComments] = useState<Berita | null>(null);
  const [comments, setComments] = useState<Komentar[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);

  // --- STATE UPLOAD & CROP ---
  const [isUploading, setIsUploading] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);

  const [selectedCategory, setSelectedCategory] = useState<string>('Semua');
  const [sortBy, setSortBy] = useState<'baru' | 'lama'>('baru');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Berita>>({
    judul: '',
    ringkasan: '',
    konten: '',
    kategori: 'Prestasi',
    gambar_url: '',
    tanggal: new Date().toISOString().split('T')[0]
  });

  const [showSuccess, setShowSuccess] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    fetchNews();
    const subscription = supabase
      .channel('public:berita')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'berita' }, () => {
        fetchNews();
      })
      .subscribe();
    return () => { supabase.removeChannel(subscription); };
  }, []);

  const fetchNews = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('berita')
      .select(`*, comments_count:komentar(count)`)
      .order('tanggal', { ascending: false });

    if (data) {
      const formattedData = data.map(item => ({
        ...item,
        comments_count: item.comments_count?.[0]?.count || 0,
        likes: item.likes || 0 // Memastikan field likes terambil
      }));
      setNews(formattedData);
    }
    setLoading(false);
  };

  // --- LOGIKA MODERASI & REPLY KOMENTAR ---
  const openCommentModal = async (item: Berita) => {
    setSelectedNewsForComments(item);
    setIsCommentModalOpen(true);
    setLoadingComments(true);
    
    const { data, error } = await supabase
      .from('komentar')
      .select('*')
      .eq('berita_id', item.id)
      .order('tanggal', { ascending: false });

    if (data) setComments(data);
    setLoadingComments(false);
  };

  const handleAdminReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedNewsForComments || !replyText.trim()) return;

    setIsSubmittingReply(true);
    try {
      const { data, error } = await supabase
        .from('komentar')
        .insert([{
          berita_id: selectedNewsForComments.id,
          nama_user: "ADMIN PB US 162", // Identitas Balasan Admin
          isi_komentar: replyText,
          tanggal: new Date().toISOString()
        }])
        .select();

      if (!error && data) {
        setComments([data[0], ...comments]);
        setReplyText('');
        // Update count di list utama
        setNews(news.map(n => n.id === selectedNewsForComments.id ? { ...n, comments_count: (n.comments_count || 0) + 1 } : n));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmittingReply(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (window.confirm("Hapus komentar ini secara permanen?")) {
      const { error } = await supabase.from('komentar').delete().eq('id', commentId);
      if (!error) {
        setComments(comments.filter(c => c.id !== commentId));
        setNews(news.map(n => n.id === selectedNewsForComments?.id ? { ...n, comments_count: (n.comments_count || 1) - 1 } : n));
      }
    }
  };

  // --- LOGIKA CROPPER ---
  const onCropComplete = useCallback((_: any, clippedPixels: any) => {
    setCroppedAreaPixels(clippedPixels);
  }, []);

  const createCroppedImage = async () => {
    try {
      const image = await createImage(imageToCrop!);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = croppedAreaPixels.width;
      canvas.height = croppedAreaPixels.height;
      ctx?.drawImage(image, croppedAreaPixels.x, croppedAreaPixels.y, croppedAreaPixels.width, croppedAreaPixels.height, 0, 0, croppedAreaPixels.width, croppedAreaPixels.height);
      return new Promise<Blob>((resolve) => {
        canvas.toBlob((blob) => { if (blob) resolve(blob); }, 'image/jpeg', 0.8);
      });
    } catch (e) { return null; }
  };

  const createImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const image = new Image();
      image.addEventListener('load', () => resolve(image));
      image.addEventListener('error', (error) => reject(error));
      image.setAttribute('crossOrigin', 'anonymous');
      image.src = url;
    });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.addEventListener('load', () => { setImageToCrop(reader.result as string); });
      reader.readAsDataURL(file);
    }
  };

  const uploadProcessedImage = async () => {
    const croppedBlob = await createCroppedImage();
    if (!croppedBlob) return;
    setIsUploading(true);
    try {
      const fileName = `${Math.random()}.jpg`;
      const filePath = `berita/${fileName}`;
      const { error: uploadError } = await supabase.storage.from('images').upload(filePath, croppedBlob);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('images').getPublicUrl(filePath);
      setFormData({ ...formData, gambar_url: publicUrl });
      setImageToCrop(null);
    } catch (err: any) { setFormError("Gagal: " + err.message); } finally { setIsUploading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.gambar_url) return setFormError("Wajib upload gambar.");
    setIsSaving(true);
    try {
      if (editingId) {
        await supabase.from('berita').update(formData).eq('id', editingId);
      } else {
        await supabase.from('berita').insert([formData]);
      }
      await fetchNews();
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
      closeModal();
    } catch (err) { setFormError("Database Error"); } finally { setIsSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Hapus Berita? Seluruh data terkait akan hilang.")) {
      await supabase.from('berita').delete().eq('id', id);
      fetchNews();
    }
  };

  const openModal = (item?: Berita) => {
    setFormData(item || { judul: '', ringkasan: '', konten: '', kategori: 'Prestasi', gambar_url: '', tanggal: new Date().toISOString().split('T')[0] });
    setEditingId(item?.id || null);
    setIsModalOpen(true);
  };

  const closeModal = () => { if (!isSaving) setIsModalOpen(false); };

  const filteredAndSortedNews = news
    .filter(n => n.judul.toLowerCase().includes(searchTerm.toLowerCase()) && (selectedCategory === 'Semua' || n.kategori === selectedCategory))
    .sort((a, b) => sortBy === 'baru' ? new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime() : new Date(a.tanggal).getTime() - new Date(b.tanggal).getTime());

  return (
    <div className="min-h-screen bg-[#050505] text-white p-6 md:p-12 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/10 blur-[120px] rounded-full -z-10" />
      
      <div className="max-w-7xl mx-auto relative z-10">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
          <div>
            <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-blue-600/20 rounded-lg text-blue-500"><Newspaper size={20} /></div>
                <p className="text-zinc-500 text-[10px] font-black tracking-[0.3em] uppercase">Content Management System</p>
            </div>
            <h1 className="text-4xl font-black italic tracking-tighter uppercase leading-none">
              MANAJEMEN <span className="text-blue-600">BERITA</span>
            </h1>
          </div>
          <button onClick={() => openModal()} className="flex items-center gap-3 bg-blue-600 hover:bg-blue-700 px-8 py-4 rounded-2xl font-black uppercase text-xs tracking-widest transition-all shadow-lg active:scale-95 group">
            <Plus size={18} className="group-hover:rotate-90 transition-transform" /> Buat Artikel Baru
          </button>
        </div>

        {/* Filter Section */}
        <div className="bg-zinc-900/30 border border-white/5 p-6 rounded-[2.5rem] mb-10 space-y-6">
          <div className="flex flex-col lg:flex-row gap-6 justify-between items-center">
            <div className="relative group w-full lg:max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
              <input type="text" placeholder="CARI JUDUL BERITA..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-black border border-white/5 rounded-2xl py-4 pl-12 pr-6 outline-none focus:border-blue-600 font-bold text-[10px] tracking-widest text-white" />
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex bg-black p-1 rounded-xl border border-white/5">
                {['Semua', 'Prestasi', 'Fasilitas', 'Program', 'Turnamen'].map((cat) => (
                  <button key={cat} onClick={() => setSelectedCategory(cat)}
                    className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${selectedCategory === cat ? 'bg-blue-600 text-white' : 'text-zinc-500'}`}>
                    {cat}
                  </button>
                ))}
              </div>
              <button onClick={() => setSortBy(sortBy === 'baru' ? 'lama' : 'baru')} className="flex items-center gap-2 bg-zinc-800/50 px-4 py-3 rounded-xl border border-white/5 text-[9px] font-black uppercase tracking-widest">
                <ArrowUpDown size={14} className="text-blue-500" /> {sortBy === 'baru' ? 'Terbaru' : 'Terlama'}
              </button>
            </div>
          </div>
        </div>

        {/* List Berita */}
        <div className="grid grid-cols-1 gap-4">
          {loading ? (
             <div className="py-32 text-center flex flex-col items-center gap-4">
                <Loader2 className="animate-spin text-blue-600" size={40} />
                <div className="text-zinc-600 font-black uppercase tracking-[0.3em] italic text-sm">Mensinkronisasi...</div>
             </div>
          ) : (
            filteredAndSortedNews.map((item) => (
              <div key={item.id} className="bg-zinc-900/40 backdrop-blur-md border border-white/5 p-6 rounded-[2rem] flex flex-col md:flex-row items-center gap-6 group hover:border-blue-600/30 transition-all shadow-xl">
                <div className="w-full md:w-48 h-32 rounded-2xl overflow-hidden bg-zinc-800 shrink-0 relative">
                  <img src={item.gambar_url} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                  <div className="absolute top-2 left-2 px-2 py-1 bg-black/60 rounded-lg text-[8px] font-black uppercase text-blue-400">{item.kategori}</div>
                </div>
                <div className="flex-grow space-y-2">
                  <div className="flex items-center gap-4 text-zinc-500 text-[10px] font-bold">
                    <div className="flex items-center gap-1.5"><Clock size={12} className="text-blue-600" /> {item.tanggal}</div>
                    
                    {/* STATISTIK LIKE & KOMENTAR */}
                    <div className="flex items-center gap-3 bg-white/5 px-3 py-1 rounded-full border border-white/5">
                      <div className="flex items-center gap-1 text-rose-500">
                        <Heart size={12} fill="currentColor" /> <span className="font-black text-white">{item.likes || 0}</span>
                      </div>
                      <div className="w-px h-3 bg-white/10" />
                      <button 
                        onClick={() => openCommentModal(item)}
                        className="flex items-center gap-1.5 text-blue-400 hover:text-white transition-colors"
                      >
                        <MessageSquare size={12} /> <span className="font-black text-white">{item.comments_count || 0}</span>
                      </button>
                    </div>
                  </div>
                  <h3 className="text-xl font-black italic uppercase tracking-tighter group-hover:text-blue-500 transition-colors">{item.judul}</h3>
                  <p className="text-zinc-400 text-sm line-clamp-1 italic font-medium opacity-70">{item.ringkasan}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => openModal(item)} className="p-4 bg-zinc-800/50 hover:bg-blue-600 text-zinc-400 hover:text-white rounded-xl transition-all"><Edit3 size={18} /></button>
                  <button onClick={() => handleDelete(item.id)} className="p-4 bg-zinc-800/50 hover:bg-red-600 text-zinc-400 hover:text-white rounded-xl transition-all"><Trash2 size={18} /></button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* MODAL BERITA */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md">
          <div className="bg-[#0c0c0c] w-full max-w-3xl rounded-[3rem] overflow-hidden border border-white/10 flex flex-col max-h-[90vh]">
            <div className="p-8 border-b border-white/5 flex justify-between items-center bg-zinc-900/50">
               <h3 className="text-2xl font-black italic uppercase tracking-tighter">{editingId ? 'Edit' : 'Tulis'} <span className="text-blue-600">Berita</span></h3>
               <button onClick={closeModal} className="p-3 hover:bg-red-500/10 hover:text-red-500 rounded-full text-zinc-500 transition-all"><X size={24}/></button>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-6 overflow-y-auto custom-scrollbar">
              {formError && <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl flex items-center gap-3 text-red-500 text-xs font-bold uppercase"><AlertCircle size={18} /> {formError}</div>}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-zinc-500 uppercase">Judul Berita</label>
                  <input required type="text" className="w-full px-6 py-4 bg-white/5 rounded-2xl border border-white/5 outline-none font-bold text-sm" value={formData.judul} onChange={e => setFormData({...formData, judul: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-zinc-500 uppercase">Kategori</label>
                  <select className="w-full px-6 py-4 bg-white/5 rounded-2xl border border-white/5 outline-none font-bold text-sm text-zinc-400" value={formData.kategori} onChange={e => setFormData({...formData, kategori: e.target.value})}>
                    <option value="Prestasi">Prestasi</option><option value="Fasilitas">Fasilitas</option><option value="Program">Program</option><option value="Turnamen">Turnamen</option>
                  </select>
                </div>
              </div>

              <div className="space-y-4">
                 <label className="text-[10px] font-black text-zinc-500 uppercase">Upload & Crop Gambar Utama</label>
                 {!imageToCrop ? (
                   <label className="flex flex-col items-center justify-center w-full h-48 bg-white/5 rounded-[2rem] border-2 border-dashed border-white/10 hover:border-blue-600 transition-all cursor-pointer group relative overflow-hidden">
                     {formData.gambar_url ? (
                        <>
                          <img src={formData.gambar_url} className="absolute inset-0 w-full h-full object-cover opacity-40" alt="" />
                          <div className="relative z-10 flex flex-col items-center gap-2">
                            <Upload className="text-blue-500" />
                            <span className="text-[10px] font-black uppercase">Ganti Gambar</span>
                          </div>
                        </>
                     ) : (
                       <div className="flex flex-col items-center gap-2">
                          <ImageIcon className="text-zinc-600 group-hover:text-blue-500" size={32} />
                          <span className="text-[10px] font-black uppercase text-zinc-500">Pilih Foto Berita</span>
                       </div>
                     )}
                     <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
                   </label>
                 ) : (
                   <div className="relative h-64 w-full bg-black rounded-[2rem] overflow-hidden border border-blue-600/50">
                      <Cropper image={imageToCrop} crop={crop} zoom={zoom} aspect={16 / 9} onCropChange={setCrop} onZoomChange={setZoom} onCropComplete={onCropComplete} />
                      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 z-20">
                         <button type="button" onClick={uploadProcessedImage} disabled={isUploading} className="bg-blue-600 px-6 py-2 rounded-full font-black text-[10px] uppercase flex items-center gap-2 shadow-xl">
                            {isUploading ? <Loader2 className="animate-spin" size={14}/> : <Check size={14}/>} {isUploading ? "Processing..." : "Terapkan & Upload"}
                         </button>
                         <button type="button" onClick={() => setImageToCrop(null)} className="bg-red-600 px-4 py-2 rounded-full font-black text-[10px] uppercase">Batal</button>
                      </div>
                      <div className="absolute top-4 right-4 z-20">
                         <input type="range" min="1" max="3" step="0.1" value={zoom} onChange={(e) => setZoom(Number(e.target.value))} className="w-24 accent-blue-600" />
                      </div>
                   </div>
                 )}
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-500 uppercase">Ringkasan</label>
                <input required type="text" className="w-full px-6 py-4 bg-white/5 rounded-2xl border border-white/5 outline-none font-bold text-sm" value={formData.ringkasan} onChange={e => setFormData({...formData, ringkasan: e.target.value})} />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-500 uppercase">Konten Berita</label>
                <textarea rows={8} className="w-full px-6 py-4 bg-white/5 rounded-2xl border border-white/5 outline-none font-medium text-sm leading-relaxed" value={formData.konten} onChange={e => setFormData({...formData, konten: e.target.value})} />
              </div>

              <button type="submit" disabled={isSaving || isUploading} className="w-full py-5 bg-blue-600 text-white rounded-[1.5rem] font-black uppercase text-xs tracking-widest flex items-center justify-center gap-3 hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50">
                {isSaving ? <Loader2 className="animate-spin" size={20}/> : <Save size={20}/>} {editingId ? 'Update Berita' : 'Publikasikan'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL MODERASI & REPLY KOMENTAR */}
      {isCommentModalOpen && selectedNewsForComments && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/98 backdrop-blur-xl">
          <div className="bg-[#0c0c0c] w-full max-w-2xl rounded-[3rem] overflow-hidden border border-white/10 flex flex-col max-h-[85vh]">
            <div className="p-8 border-b border-white/5 flex justify-between items-center bg-zinc-900/50">
              <div>
                <h3 className="text-xl font-black italic uppercase tracking-tighter">Moderasi & <span className="text-blue-600">Reply</span></h3>
                <p className="text-[9px] text-zinc-500 font-bold uppercase mt-1 truncate max-w-[300px]">{selectedNewsForComments.judul}</p>
              </div>
              <button onClick={() => setIsCommentModalOpen(false)} className="p-3 hover:bg-red-500/10 hover:text-red-500 rounded-full text-zinc-500 transition-all"><X size={24}/></button>
            </div>

            {/* FORM REPLY ADMIN */}
            <div className="px-8 pt-6 pb-2 border-b border-white/5">
              <form onSubmit={handleAdminReply} className="flex gap-2 mb-4">
                <div className="relative flex-grow">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-500"><CornerDownRight size={16}/></div>
                  <input 
                    type="text" 
                    placeholder="Tulis balasan resmi admin..." 
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-xs font-bold outline-none focus:border-blue-600 transition-all"
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                  />
                </div>
                <button 
                  disabled={isSubmittingReply || !replyText.trim()}
                  className="bg-blue-600 hover:bg-blue-700 px-4 rounded-xl transition-all disabled:opacity-50"
                >
                  {isSubmittingReply ? <Loader2 className="animate-spin" size={18}/> : <Send size={18}/>}
                </button>
              </form>
            </div>

            <div className="p-8 overflow-y-auto custom-scrollbar space-y-4">
              {loadingComments ? (
                <div className="py-20 text-center"><Loader2 className="animate-spin mx-auto text-blue-600" /></div>
              ) : comments.length > 0 ? (
                comments.map((c) => (
                  <div key={c.id} className={`p-6 rounded-2xl border flex justify-between items-start gap-4 group transition-all ${c.nama_user.includes("ADMIN") ? 'bg-blue-600/5 border-blue-600/20 ml-8' : 'bg-white/5 border-white/5'}`}>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black italic ${c.nama_user.includes("ADMIN") ? 'bg-blue-600 text-white' : 'bg-blue-600/20 text-blue-500'}`}><User size={12}/></div>
                        <span className={`text-xs font-black uppercase italic ${c.nama_user.includes("ADMIN") ? 'text-blue-400' : 'text-zinc-300'}`}>{c.nama_user}</span>
                        {c.nama_user.includes("ADMIN") && <span className="bg-blue-600 text-white text-[7px] px-1.5 py-0.5 rounded font-black">OFFICIAL</span>}
                        <span className="text-[9px] font-bold text-zinc-500">{new Date(c.tanggal).toLocaleDateString('id-ID')}</span>
                      </div>
                      <p className={`text-sm font-medium leading-relaxed ${c.nama_user.includes("ADMIN") ? 'text-white' : 'text-zinc-400'}`}>{c.isi_komentar}</p>
                    </div>
                    <button 
                      onClick={() => handleDeleteComment(c.id)}
                      className="p-3 bg-red-500/10 text-red-500 rounded-xl opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500 hover:text-white"
                    >
                      <Trash size={16} />
                    </button>
                  </div>
                ))
              ) : (
                <div className="py-20 text-center space-y-3">
                  <MessageSquare className="mx-auto text-zinc-800" size={48} />
                  <p className="text-zinc-600 font-black uppercase tracking-widest text-xs">Belum ada komentar.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Success Notification */}
      <div className={`fixed bottom-10 left-1/2 -translate-x-1/2 z-[200] transition-all duration-700 transform ${showSuccess ? 'translate-y-0 opacity-100' : 'translate-y-24 opacity-0'}`}>
        <div className="bg-zinc-900/95 border border-blue-500/50 px-10 py-6 rounded-[2.5rem] shadow-2xl flex items-center gap-6">
          <div className="bg-blue-600 p-4 rounded-2xl shadow-lg animate-pulse"><Zap size={24} /></div>
          <div>
            <h4 className="text-white font-black uppercase text-xl italic mb-1">DATA DISINKRONISASI!</h4>
            <p className="text-blue-400 text-[10px] font-black uppercase">Berhasil memperbarui database landing page</p>
          </div>
        </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #27272a; border-radius: 10px; }
        input[type="date"]::-webkit-calendar-picker-indicator { filter: invert(1); }
        select option { background: #0c0c0c; color: white; }
      `}</style>
    </div>
  );
}