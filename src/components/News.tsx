import { Calendar, ArrowRight, X, ChevronDown, ChevronUp, Loader2, User, Eye, Heart, MessageCircle, Send, Share2, Link2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from "../supabase";
import { motion, AnimatePresence } from 'framer-motion';

interface Komentar { id: string; nama_user: string; isi_komentar: string; tanggal: string; }
interface Berita {
  id: string; judul: string; ringkasan: string; konten: string; kategori: string; gambar_url: string;
  tanggal: string; penulis?: string; views: number; likes: number; comments_count?: number;
}

interface NewsProps {
  kategori?: string;
}

export default function News({ kategori }: NewsProps) {
  const [beritaList, setBeritaList] = useState<Berita[]>([]);
  const [selectedNews, setSelectedNews] = useState<Berita | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [loading, setLoading] = useState(true);
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [comments, setComments] = useState<Komentar[]>([]);
  const [newComment, setNewComment] = useState({ nama: '', pesan: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copySuccess, setCopySuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchNews();
    const savedLikes = localStorage.getItem('pb_us_liked_posts');
    if (savedLikes) setLikedPosts(new Set(JSON.parse(savedLikes)));
  }, [kategori]);

  useEffect(() => {
    localStorage.setItem('pb_us_liked_posts', JSON.stringify(Array.from(likedPosts)));
  }, [likedPosts]);

  const fetchNews = async () => {
    try {
      setLoading(true);
      let query = supabase.from('berita').select(`*, komentar(count)`).order('tanggal', { ascending: false });
      if (kategori) query = query.ilike('kategori', kategori);
      const { data, error } = await query;
      if (error) throw error;
      if (data) {
        const formattedData = data.map(item => ({
          ...item,
          comments_count: item.komentar?.[0]?.count || 0,
          likes: Number(item.likes) || 0,
          views: Number(item.views) || 0
        }));
        setBeritaList(formattedData as Berita[]);
      }
    } catch (err) {
      console.error("Gagal memuat berita:", err);
      setBeritaList([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchComments = async (beritaId: string) => {
    try {
      const { data, error } = await supabase.from('komentar').select('*').eq('berita_id', beritaId).order('tanggal', { ascending: false });
      if (!error && data) setComments(data);
    } catch (err) { console.error("Gagal memuat komentar:", err); }
  };

  const handleOpenNews = async (news: Berita) => {
    setSelectedNews({ ...news, views: Number(news.views) || 0 });
    fetchComments(news.id);
    const updatedViewCount = (Number(news.views) || 0) + 1;
    setBeritaList(prev => prev.map(item => item.id === news.id ? { ...item, views: updatedViewCount } : item));
    setSelectedNews(prev => prev ? { ...prev, views: updatedViewCount } : prev);
    try {
      const { error } = await supabase.from('berita').update({ views: updatedViewCount }).eq('id', news.id);
      if (error) throw error;
    } catch (err) { console.error("Gagal menyimpan views ke database:", err); }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedNews || !newComment.nama || !newComment.pesan) return;
    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.from('komentar').insert([{ berita_id: selectedNews.id, nama_user: newComment.nama, isi_komentar: newComment.pesan }]).select();
      if (!error && data) {
        setComments(prev => [data[0], ...prev]);
        setNewComment({ nama: '', pesan: '' });
        setBeritaList(prev => prev.map(item => item.id === selectedNews.id ? { ...item, comments_count: (item.comments_count || 0) + 1 } : item));
      } else if (error) throw error;
    } catch (err) { alert("Gagal mengirim komentar"); }
    finally { setIsSubmitting(false); }
  };

  const handleLike = async (e: React.MouseEvent, newsId: string) => {
    e.stopPropagation();
    const isLiked = likedPosts.has(newsId);
    const newLikedPosts = new Set(likedPosts);
    if (isLiked) newLikedPosts.delete(newsId); else newLikedPosts.add(newsId);
    setLikedPosts(newLikedPosts);
    const newsItem = beritaList.find(n => n.id === newsId);
    const currentLikes = Number(newsItem?.likes) || 0;
    const finalLikeCount = isLiked ? Math.max(0, currentLikes - 1) : currentLikes + 1;
    setBeritaList(prev => prev.map(item => item.id === newsId ? { ...item, likes: finalLikeCount } : item));
    if (selectedNews?.id === newsId) setSelectedNews(prev => prev ? { ...prev, likes: finalLikeCount } : null);
    try {
      const { error } = await supabase.from('berita').update({ likes: finalLikeCount }).eq('id', newsId);
      if (error) throw error;
    } catch (err) { console.error("Gagal update likes di database:", err); fetchNews(); }
  };

  const handleShare = async (news: Berita, platform: 'wa' | 'fb' | 'x' | 'copy') => {
    const shareUrl = `${window.location.origin}${window.location.pathname}?newsId=${news.id}`;
    const shareText = `Cek berita terbaru dari PB Bilibili 162: "${news.judul}"`;
    if (platform === 'wa') window.open(`https://wa.me/?text=${encodeURIComponent(shareText + ' ' + shareUrl)}`, '_blank');
    if (platform === 'fb') window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`, '_blank');
    if (platform === 'x') window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`, '_blank');
    if (platform === 'copy') {
      try { await navigator.clipboard.writeText(shareUrl); setCopySuccess(news.id); setTimeout(() => setCopySuccess(null), 2000); }
      catch (err) { console.error("Gagal menyalin tautan", err); }
    }
  };

  const visibleNews = showAll ? beritaList : beritaList.slice(0, 4);

  if (loading) return <div className="py-20 text-center bg-gray-50"><Loader2 className="animate-spin m-auto text-blue-600 mb-4" size={40} /><p className="text-gray-500 font-bold uppercase tracking-widest">Memuat {kategori ? kategori : 'Berita'}...</p></div>;

  return (
    <section id={kategori ? `berita-${kategori.toLowerCase()}` : 'news'} className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-extrabold text-gray-900 mb-4 italic uppercase tracking-tighter">
            {kategori ? <>{kategori} <span className="text-blue-600">PB BILIBILI 162</span></> : <>Berita <span className="text-blue-600">Terkini</span></>}
          </h2>
          <p className="text-xl text-gray-600">{kategori ? `Seluruh informasi dan berita kategori ${kategori} PB Bilibili 162` : 'Update terbaru tentang prestasi dan kegiatan klub PB Bilibili 162'}</p>
        </div>

        {beritaList.length === 0 ? (
          <div className="py-16 text-center bg-white rounded-2xl border border-gray-100 shadow-sm">
            <TrophyEmpty />
            <p className="text-gray-500 font-bold uppercase tracking-widest text-sm">Belum ada data {kategori || 'berita'}</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {visibleNews.map((news) => (
              <div key={news.id} className="bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-2xl transition-all group flex flex-col border border-gray-100">
                <div className="relative h-48 overflow-hidden bg-gray-100">
                  <img src={news.gambar_url?.split(/\s+/)[0]} alt={news.judul} className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute top-4 left-4 bg-blue-600 text-white px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-widest">{news.kategori}</div>
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <button onClick={() => handleShare(news, 'wa')} className="p-2 bg-green-500 text-white rounded-full hover:scale-110 transition-transform"><Share2 size={16} /></button>
                    <button onClick={() => handleShare(news, 'copy')} className="p-2 bg-white text-gray-900 rounded-full hover:scale-110 transition-transform">{copySuccess === news.id ? <span className="text-[8px] font-bold px-1 text-blue-600">COPIED</span> : <Link2 size={16} />}</button>
                  </div>
                  <button onClick={(e) => handleLike(e, news.id)} className={`absolute bottom-4 right-4 w-9 h-9 rounded-full flex items-center justify-center shadow-lg transition-all active:scale-90 z-10 ${likedPosts.has(news.id) ? 'bg-rose-500 text-white' : 'bg-white text-gray-400 hover:text-rose-500'}`}><Heart size={18} fill={likedPosts.has(news.id) ? "currentColor" : "none"} /></button>
                </div>
                <div className="p-5 flex flex-col flex-grow">
                  <div className="text-gray-400 text-[10px] mb-2 font-bold uppercase tracking-tight">{news.tanggal}</div>
                  <h3 onClick={() => handleOpenNews(news)} className="text-md font-black text-gray-900 mb-3 line-clamp-2 italic uppercase leading-tight group-hover:text-blue-600 transition-colors cursor-pointer">{news.judul}</h3>
                  <div className="mt-auto pt-4 border-t border-gray-50 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-gray-400"><div className="w-5 h-5 bg-gray-100 rounded-full flex items-center justify-center"><User size={10} /></div><span className="text-[9px] font-black uppercase tracking-tighter truncate max-w-[60px]">{news.penulis || 'ADMIN'}</span></div>
                    <div className="flex items-center gap-3 text-gray-400"><div className="flex items-center gap-1"><Eye size={12} /><span className="text-[10px] font-bold">{news.views || 0}</span></div><div className="flex items-center gap-1"><Heart size={12} className={likedPosts.has(news.id) ? 'text-rose-500' : ''} fill={likedPosts.has(news.id) ? "currentColor" : "none"} /><span className="text-[10px] font-bold">{news.likes || 0}</span></div><div className="flex items-center gap-1"><MessageCircle size={12} /><span className="text-[10px] font-bold">{news.comments_count || 0}</span></div></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {beritaList.length > 4 && <div className="text-center mt-12"><button onClick={() => setShowAll(!showAll)} className="inline-flex items-center gap-2 bg-gray-900 hover:bg-blue-600 text-white px-8 py-3 rounded-xl font-bold transition-all shadow-lg active:scale-95 uppercase text-xs tracking-widest">{showAll ? <><ChevronUp size={18} /> Sembunyikan</> : <>Lihat Semua {kategori || 'Berita'} <ChevronDown size={18} /></>}</button></div>}
      </div>

      <AnimatePresence>
        {selectedNews && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="bg-white rounded-[2rem] max-w-4xl w-full max-h-[92vh] overflow-hidden shadow-2xl relative flex flex-col">
              <button onClick={() => setSelectedNews(null)} className="absolute top-5 right-5 p-2 bg-black/20 hover:bg-red-600 text-white rounded-full transition-all z-[120] backdrop-blur-md border border-white/20"><X size={24} /></button>
              <div className="overflow-y-auto hide-scrollbar flex-grow scroll-smooth">
                <div className="relative w-full bg-slate-900">
                  <img src={selectedNews.gambar_url?.split(/\s+/)[0]} alt={selectedNews.judul} className="w-full h-auto block max-h-[70vh] object-contain object-top" />
                  <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-white to-transparent"></div>
                  <button onClick={(e) => handleLike(e, selectedNews.id)} className={`absolute bottom-8 right-8 w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-all active:scale-90 z-[130] ${likedPosts.has(selectedNews.id) ? 'bg-rose-500 text-white' : 'bg-white text-gray-400 hover:text-rose-500'}`}><Heart size={28} fill={likedPosts.has(selectedNews.id) ? "currentColor" : "none"} /></button>
                </div>
                <div className="p-8 md:p-14 bg-white relative -mt-6 rounded-t-[2.5rem]">
                  <div className="flex flex-wrap items-center justify-between gap-6 mb-8 p-6 bg-gray-50 rounded-3xl border border-gray-100">
                    <div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-2">Bagikan Informasi Ini</p><div className="flex gap-3"><button onClick={() => handleShare(selectedNews, 'wa')} className="w-10 h-10 bg-[#25D366] text-white rounded-full flex items-center justify-center"><Share2 size={16} /></button><button onClick={() => handleShare(selectedNews, 'copy')} className="w-10 h-10 bg-slate-900 text-white rounded-full flex items-center justify-center"><Link2 size={16} /></button></div></div>
                    <div className="flex items-center gap-4 text-gray-500 text-xs font-bold"><span>{selectedNews.views} views</span><span>{selectedNews.likes} likes</span><span>{selectedNews.comments_count || 0} komentar</span></div>
                  </div>
                  <div className="mb-10"><div className="text-blue-600 text-xs font-black uppercase tracking-widest mb-3">{selectedNews.kategori} • {selectedNews.tanggal}</div><h1 className="text-3xl md:text-5xl font-black uppercase italic leading-tight text-gray-900 mb-6">{selectedNews.judul}</h1>{selectedNews.ringkasan && <p className="text-lg text-gray-500 font-medium leading-relaxed mb-8">{selectedNews.ringkasan}</p>}<div className="prose max-w-none text-gray-700 leading-relaxed whitespace-pre-line">{selectedNews.konten}</div></div>
                  <div className="border-t border-gray-100 pt-8"><h3 className="text-xl font-black uppercase mb-5">Komentar</h3>{comments.length > 0 && <div className="space-y-4 mb-8">{comments.map(comment => <div key={comment.id} className="bg-gray-50 rounded-2xl p-4"><div className="font-black text-sm">{comment.nama_user}</div><div className="text-gray-600 text-sm mt-1 whitespace-pre-line">{comment.isi_komentar}</div><div className="text-[10px] text-gray-400 mt-2">{comment.tanggal}</div></div>)}</div>}<form onSubmit={handleSubmitComment} className="space-y-3"><input value={newComment.nama} onChange={e => setNewComment({ ...newComment, nama: e.target.value })} placeholder="Nama" className="w-full border rounded-xl px-4 py-3" /><textarea value={newComment.pesan} onChange={e => setNewComment({ ...newComment, pesan: e.target.value })} placeholder="Tulis komentar..." className="w-full border rounded-xl px-4 py-3 min-h-24" /><button disabled={isSubmitting} className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold disabled:opacity-50">{isSubmitting ? 'Mengirim...' : 'Kirim Komentar'} <Send size={14} className="inline ml-1" /></button></form></div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  );
}

function TrophyEmpty() {
  return <div className="mx-auto mb-4 w-14 h-14 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center"><TrophyIcon /></div>;
}

function TrophyIcon() {
  return <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 21h8M12 17v4M7 4h10v6a5 5 0 0 1-10 0V4Z"/><path d="M7 7H4a3 3 0 0 0 3 3M17 7h3a3 3 0 0 1-3 3"/></svg>;
}
