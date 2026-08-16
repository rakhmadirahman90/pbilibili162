import { useEffect, useState } from 'react';
import { Calendar, Eye, Heart, Trophy, Loader2 } from 'lucide-react';
import { supabase } from '../supabase';

interface PrestasiItem {
  id: string;
  judul: string;
  ringkasan: string | null;
  konten: string | null;
  gambar_url: string | null;
  tanggal: string | null;
  views: number | null;
  likes: number | null;
}

const getFirstImageUrl = (value: string | null) => {
  if (!value) return '';
  return value.split(/\s+/).find((url) => /^https?:\/\//i.test(url)) || value.trim().split(/\s+/)[0] || '';
};

export default function Prestasi() {
  const [items, setItems] = useState<PrestasiItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const fetchPrestasi = async () => {
      setLoading(true);
      setErrorMessage('');

      const { data, error } = await supabase
        .from('berita')
        .select('id, judul, ringkasan, konten, gambar_url, tanggal, views, likes')
        .eq('kategori', 'Prestasi')
        .order('tanggal', { ascending: false });

      if (error) {
        console.error('Gagal memuat data prestasi:', error);
        setErrorMessage('Data prestasi belum dapat dimuat. Silakan coba lagi.');
      } else {
        setItems((data || []) as PrestasiItem[]);
      }

      setLoading(false);
    };

    fetchPrestasi();
  }, []);

  return (
    <section className="w-full py-8 md:py-12">
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-600/10 border border-blue-500/20 text-blue-400 text-[10px] font-black uppercase tracking-[0.25em] mb-4">
          <Trophy size={14} /> Prestasi PB BILIBILI 162
        </div>
        <h1 className="text-3xl md:text-5xl font-black italic uppercase tracking-tight text-white">
          Daftar <span className="text-blue-500">Prestasi</span>
        </h1>
        <p className="mt-3 text-slate-400 max-w-2xl mx-auto">
          Kumpulan berita dan pencapaian atlet PB BILIBILI 162 yang tersimpan di database.
        </p>
      </div>

      {loading && (
        <div className="py-20 text-center text-slate-400">
          <Loader2 className="animate-spin mx-auto mb-4 text-blue-500" size={40} />
          <p className="text-xs font-black uppercase tracking-widest">Memuat data prestasi...</p>
        </div>
      )}

      {!loading && errorMessage && (
        <div className="max-w-xl mx-auto rounded-2xl border border-red-500/20 bg-red-500/10 p-6 text-center text-red-300 font-bold">
          {errorMessage}
        </div>
      )}

      {!loading && !errorMessage && items.length === 0 && (
        <div className="max-w-xl mx-auto rounded-2xl border border-white/10 bg-white/[0.03] p-10 text-center text-slate-400">
          Belum ada data dengan kategori <strong className="text-white">Prestasi</strong> di database.
        </div>
      )}

      {!loading && !errorMessage && items.length > 0 && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((item) => {
            const imageUrl = getFirstImageUrl(item.gambar_url);
            return (
              <article key={item.id} className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] shadow-xl hover:border-blue-500/40 transition-all">
                <div className="relative aspect-[16/10] bg-slate-900 overflow-hidden">
                  {imageUrl ? (
                    <img src={imageUrl} alt={item.judul} className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-600"><Trophy size={42} /></div>
                  )}
                  <div className="absolute top-4 left-4 px-3 py-1 rounded-full bg-blue-600 text-white text-[9px] font-black uppercase tracking-widest">
                    Prestasi
                  </div>
                </div>

                <div className="p-6">
                  <div className="flex items-center gap-2 text-slate-500 text-[10px] font-bold uppercase mb-3">
                    <Calendar size={13} />
                    {item.tanggal ? new Date(item.tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }) : '-'}
                  </div>
                  <h2 className="text-lg font-black uppercase italic text-white leading-tight mb-3">
                    {item.judul}
                  </h2>
                  <p className="text-sm text-slate-400 leading-relaxed line-clamp-4">
                    {item.ringkasan || item.konten || 'Informasi prestasi PB BILIBILI 162.'}
                  </p>
                  <div className="mt-5 pt-4 border-t border-white/10 flex items-center gap-5 text-slate-500 text-[10px] font-bold">
                    <span className="inline-flex items-center gap-1"><Eye size={13} /> {Number(item.views) || 0}</span>
                    <span className="inline-flex items-center gap-1"><Heart size={13} /> {Number(item.likes) || 0}</span>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
