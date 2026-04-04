import React, { useEffect, useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { supabase } from './supabase';
import {
  Search,
  User,
  X,
  Award,
  TrendingUp,
  Users,
  MapPin,
  Phone,
  ShieldCheck,
  Star,
  Trophy,
  Save,
  Loader2,
  Edit3,
  ChevronLeft,
  ChevronRight,
  Zap,
  Sparkles,
  RefreshCcw,
  Camera,
  Scissors,
  Plus,
  Upload,
} from 'lucide-react';

interface Registrant {
  id: string;
  nama: string;
  whatsapp: string;
  kategori: string;
  domisili: string;
  foto_url: string;
  jenis_kelamin: string;
  rank: number;
  points: number;
  seed: string;
  bio: string;
  prestasi: string;
  status?: string;
}

const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.setAttribute('crossOrigin', 'anonymous');
    image.src = url;
  });

export default function ManajemenAtlet() {
  const [atlets, setAtlets] = useState<Registrant[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAtlet, setSelectedAtlet] = useState<Registrant | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingStats, setEditingStats] = useState<Partial<Registrant> | null>(
    null
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newAtlet, setNewAtlet] = useState({
    nama: '',
    whatsapp: '',
    kategori: 'SENIOR',
    domisili: '',
    seed: 'UNSEEDED',
    points: 0,
    bio: 'Atlet PB US 162',
    prestasi: 'Regular Player',
    foto_url: '',
  });

  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [isCropping, setIsCropping] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const [showSuccess, setShowSuccess] = useState(false);
  const [notifMessage, setNotifMessage] = useState('');

  const BUCKET_NAME = 'atlet_photos';

  useEffect(() => {
    fetchAtlets();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const fetchAtlets = async () => {
    setLoading(true);
    try {
      // 1. Ambil data profil dasar dari pendaftaran
      const { data: pendaftaran, error: pError } = await supabase
        .from('pendaftaran')
        .select('*')
        .order('nama', { ascending: true });

      if (pError) throw pError;

      // 2. Ambil data rankings untuk posisi rank
      const { data: rankings, error: rError } = await supabase
        .from('rankings')
        .select('*')
        .order('total_points', { ascending: false });

      if (rError) throw rError;

      // 3. AMBIL DATA BARU: statistik untuk kalkulasi poin (Base + Added)
      const { data: stats, error: sError } = await supabase
        .from('atlet_stats')
        .select('pendaftaran_id, points, total_points, seed');

      if (sError) throw sError;

      // Buat Map untuk mempercepat pencarian statistik berdasarkan ID
      const statsMap = new Map(stats?.map((s) => [s.pendaftaran_id, s]));

      if (pendaftaran) {
        const formatted = pendaftaran.map((atlet) => {
          // Cari posisi di tabel rankings (berdasarkan nama)
          const rankPosisi = rankings?.findIndex(
            (r) =>
              (r.player_name || r.nama)?.trim().toLowerCase() ===
              atlet.nama?.trim().toLowerCase()
          );

          const rankingMatch = rankPosisi !== -1 ? rankings![rankPosisi] : null;

          // Ambil data dari atlet_stats berdasarkan ID
          const stat = statsMap.get(atlet.id);

          // LOGIKA PERHITUNGAN TOTAL POIN AKHIR
          // Base Points (dari seed) + Total Points (poin tambahan/manual)
          const basePoints = Number(stat?.points || 0);
          const addedPoints = Number(stat?.total_points || 0);
          const calculatedTotal = basePoints + addedPoints;

          return {
            ...atlet,
            // Perbaikan: Gunakan hasil penjumlahan atau fallback ke rankings jika stat kosong
            points: stat ? calculatedTotal : rankingMatch?.total_points || 0,

            // Simpan raw data untuk keperluan update nantinya
            raw_base_points: basePoints,
            raw_added_points: addedPoints,

            rank: rankPosisi !== -1 ? rankPosisi + 1 : 0,
            seed: stat?.seed || rankingMatch?.seed || 'UNSEEDED',
            foto_url: atlet.foto_url || rankingMatch?.photo_url || '',
            bio: rankingMatch?.bio || 'No biography available.',
            prestasi: rankingMatch?.achievement || 'Regular Player',
          };
        });

        setAtlets(formatted);
      }
    } catch (err: any) {
      console.error('Sync Error:', err.message);
    } finally {
      setLoading(false);
    }
  };

  // --- UPDATE LOGIKA SEED SESUAI INSTRUKSI BARU ---
  const handleSeedChange = (seed: string, isEditing: boolean = false) => {
    const seedConfig: Record<string, { base: number; age: string }> = {
      A: { base: 10000, age: 'SENIOR' },
      'B+': { base: 8500, age: 'SENIOR' },
      'B-': { base: 7000, age: 'SENIOR' },
      C: { base: 5500, age: 'MUDA' },
      UNSEEDED: { base: 0, age: 'SENIOR' },
    };

    const config = seedConfig[seed] || seedConfig['UNSEEDED'];

    if (isEditing) {
      setEditingStats((prev) => ({
        ...prev,
        seed,
        points: config.base,
        kategori: config.age,
      }));
    } else {
      setNewAtlet((prev) => ({
        ...prev,
        seed,
        points: config.base,
        kategori: config.age,
      }));
    }
  };

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        setImageToCrop(reader.result as string);
        setIsCropping(true);
      };
    }
  };

  const onCropComplete = useCallback((_area: any, areaPixels: any) => {
    setCroppedAreaPixels(areaPixels);
  }, []);

  const handleUploadCroppedImage = async () => {
    if (!imageToCrop || !croppedAreaPixels) return;
    setUploadingImage(true);
    try {
      const image = await createImage(imageToCrop);
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
        0,
        0,
        croppedAreaPixels.width,
        croppedAreaPixels.height
      );

      const blob = await new Promise<Blob>((resolve) =>
        canvas.toBlob((b) => resolve(b!), 'image/jpeg', 0.8)
      );
      const fileName = `atlet-${Date.now()}-${(newAtlet.nama || 'temp')
        .replace(/\s+/g, '-')
        .toLowerCase()}.jpg`;

      const { error } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(fileName, blob);

      if (error) throw error;

      const {
        data: { publicUrl },
      } = supabase.storage.from(BUCKET_NAME).getPublicUrl(fileName);

      setNewAtlet((prev) => ({ ...prev, foto_url: publicUrl }));
      setIsCropping(false);
      setImageToCrop(null);

      setNotifMessage('Foto Berhasil Diunggah!');
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (err: any) {
      alert(
        "Upload Gagal! Pastikan Bucket '" +
          BUCKET_NAME +
          "' sudah dibuat di Supabase Storage."
      );
    } finally {
      setUploadingImage(false);
    }
  };

  const handleAddNewAtlet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setIsSaving(true);
    setIsSubmitting(true);

    try {
      const cleanName = newAtlet.nama.trim();

      // 1. Simpan ke pendaftaran
      const { error: pError } = await supabase.from('pendaftaran').upsert(
        {
          nama: cleanName,
          whatsapp: newAtlet.whatsapp,
          kategori: newAtlet.kategori,
          domisili: newAtlet.domisili,
          foto_url: newAtlet.foto_url,
          status: 'verified',
        },
        { onConflict: 'nama' }
      );

      if (pError) throw pError;

      // 2. Simpan ke rankings
      const { error: rError } = await supabase.from('rankings').upsert(
        {
          player_name: cleanName,
          category: newAtlet.kategori,
          seed: newAtlet.seed,
          total_points: newAtlet.points,
          photo_url: newAtlet.foto_url,
          bio: newAtlet.bio,
          achievement: newAtlet.prestasi,
        },
        { onConflict: 'player_name' }
      );

      if (rError) throw rError;

      setNotifMessage('Atlet Berhasil Ditambahkan!');
      setShowSuccess(true);
      setIsAddModalOpen(false);

      setNewAtlet({
        nama: '',
        whatsapp: '',
        kategori: 'SENIOR',
        domisili: '',
        seed: 'UNSEEDED',
        points: 0,
        bio: 'Atlet PB US 162',
        prestasi: 'Regular Player',
        foto_url: '',
      });

      await fetchAtlets();
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setIsSaving(false);
      setIsSubmitting(false);
    }
  };

  const handleUpdateStats = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStats || !editingStats.nama || isSubmitting) return;

    setIsSaving(true);
    setIsSubmitting(true);
    try {
      // Update pendaftaran (kategori mungkin berubah berdasarkan seed)
      await supabase
        .from('pendaftaran')
        .update({ kategori: editingStats.kategori })
        .eq('nama', editingStats.nama);

      // Update rankings
      const { error: rankError } = await supabase.from('rankings').upsert(
        {
          player_name: editingStats.nama,
          category: editingStats.kategori,
          seed: editingStats.seed,
          total_points: editingStats.points,
        },
        { onConflict: 'player_name' }
      );

      if (rankError) throw rankError;

      await fetchAtlets();
      setNotifMessage('Data Performa Diperbarui!');
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
      setIsEditModalOpen(false);
      setSelectedAtlet(null);
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setIsSaving(false);
      setIsSubmitting(false);
    }
  };

  const filteredAtlets = atlets.filter((a) =>
    a.nama?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredAtlets.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredAtlets.length / itemsPerPage);

  return (
    <div className="h-screen flex flex-col bg-[#f8fafc] font-sans relative overflow-hidden">
      {/* HEADER SECTION */}
      <div className="flex-shrink-0 p-4 md:p-8 pb-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-end gap-4 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Sparkles size={18} className="text-blue-600 animate-pulse" />
                <p className="text-slate-400 text-[10px] font-black tracking-[0.3em] uppercase">
                  Pro Database System
                </p>
              </div>
              <h1 className="text-4xl font-black text-slate-900 italic uppercase tracking-tighter">
                Manajemen <span className="text-blue-600">Atlet</span>
              </h1>
            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-[1.5rem] shadow-xl shadow-blue-200 flex items-center gap-3 transition-all active:scale-95 group"
              >
                <Plus
                  size={20}
                  className="group-hover:rotate-90 transition-transform"
                />
                <span className="font-black uppercase text-xs tracking-widest">
                  Tambah Atlet
                </span>
              </button>

              <div className="bg-white px-8 py-4 rounded-[2rem] shadow-xl shadow-blue-900/5 border border-slate-100 flex items-center gap-6">
                <div className="text-center">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                    Total
                  </p>
                  <p className="text-2xl font-black text-slate-900 leading-none">
                    {atlets.length}
                  </p>
                </div>
                <div className="w-[1px] h-10 bg-slate-100"></div>
                <div className="text-center">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                    Top Tier
                  </p>
                  <p className="text-2xl font-black text-blue-600 leading-none">
                    {atlets.filter((a) => a.rank <= 10 && a.rank > 0).length}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="relative group">
            <Search
              className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-600 transition-colors"
              size={22}
            />
            <input
              type="text"
              placeholder="CARI NAMA ATLET..."
              className="w-full pl-14 pr-8 py-5 bg-white rounded-[2rem] border-none shadow-sm focus:ring-4 focus:ring-blue-100 transition-all font-black uppercase text-sm tracking-widest placeholder:text-slate-300"
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* MAIN LIST SECTION */}
      <div className="flex-1 overflow-y-auto px-4 md:px-8 pb-32">
        <div className="max-w-7xl mx-auto pt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {loading ? (
              <div className="col-span-full py-32 text-center">
                <Loader2
                  className="animate-spin m-auto text-blue-600 mb-4"
                  size={40}
                />
                <p className="font-black text-slate-300 uppercase italic tracking-[0.3em]">
                  Mengakses Server...
                </p>
              </div>
            ) : currentItems.length > 0 ? (
              currentItems.map((atlet) => (
                <div
                  key={atlet.id}
                  onClick={() => setSelectedAtlet(atlet)}
                  className="bg-white p-4 rounded-[2.5rem] shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all cursor-pointer group border border-slate-100 relative overflow-hidden"
                >
                  <div className="relative aspect-[4/5] rounded-[2rem] overflow-hidden mb-5 bg-slate-100 shadow-inner">
                    {atlet.foto_url ? (
                      <img
                        src={atlet.foto_url}
                        className="w-full h-full object-cover object-[center_25%] group-hover:scale-110 transition-transform duration-700"
                        alt={atlet.nama}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-slate-200">
                        <User className="text-slate-400" size={60} />
                      </div>
                    )}
                    <div className="absolute top-4 left-4 bg-black/70 backdrop-blur-xl text-white text-[9px] font-black px-4 py-1.5 rounded-full border border-white/20 uppercase">
                      #{atlet.rank > 0 ? atlet.rank : '??'} GLOBAL
                    </div>
                  </div>
                  <div className="px-2">
                    <p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] mb-1">
                      {atlet.kategori}
                    </p>
                    <h3 className="text-lg font-black text-slate-900 uppercase italic truncate mb-4">
                      {atlet.nama}
                    </h3>
                    <div className="flex justify-between items-center bg-slate-50 p-3 rounded-2xl">
                      <div>
                        <p className="text-[8px] font-black text-slate-400 uppercase">
                          Points
                        </p>
                        <p className="text-sm font-black text-slate-900">
                          {atlet.points.toLocaleString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[8px] font-black text-slate-400 uppercase">
                          Seed
                        </p>
                        <p className="text-[10px] font-black text-emerald-600 italic uppercase">
                          {atlet.seed}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full py-32 text-center text-slate-400 font-bold uppercase tracking-widest">
                Data Tidak Ditemukan
              </div>
            )}
          </div>
        </div>
      </div>

      {/* FOOTER PAGINATION */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-lg border-t border-slate-100 p-4 z-50">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest hidden md:block">
            Halaman {currentPage} dari {totalPages}
          </p>

          <div className="flex items-center gap-2 m-auto md:m-0">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="p-3 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-blue-600 hover:text-white disabled:opacity-30 transition-all shadow-sm"
            >
              <ChevronLeft size={20} />
            </button>

            <div className="flex gap-1">
              {[...Array(totalPages)].map((_, i) => (
                <button
                  key={i + 1}
                  onClick={() => setCurrentPage(i + 1)}
                  className={`w-10 h-10 rounded-xl font-black text-[10px] transition-all border ${
                    currentPage === i + 1
                      ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-200'
                      : 'bg-white text-slate-400 border-slate-200 hover:border-blue-300'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
            </div>

            <button
              onClick={() =>
                setCurrentPage((prev) => Math.min(prev + 1, totalPages))
              }
              disabled={currentPage === totalPages}
              className="p-3 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-blue-600 hover:text-white disabled:opacity-30 transition-all shadow-sm"
            >
              <ChevronRight size={20} />
            </button>
          </div>

          <div className="hidden md:block">
            <button
              onClick={() => fetchAtlets()}
              className="flex items-center gap-2 text-[10px] font-black text-blue-600 uppercase tracking-widest hover:opacity-70 transition-opacity"
            >
              <RefreshCcw size={14} /> Refresh Data
            </button>
          </div>
        </div>
      </div>

      {/* MODAL TAMBAH ATLET BARU */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/95 backdrop-blur-xl overflow-y-auto">
          <div className="bg-white w-full max-w-4xl rounded-[3rem] shadow-2xl relative flex flex-col md:flex-row overflow-hidden">
            <button
              onClick={() => setIsAddModalOpen(false)}
              className="absolute top-6 right-6 z-10 p-3 bg-slate-100 rounded-full hover:bg-red-500 hover:text-white transition-all"
            >
              <X size={20} />
            </button>

            <div className="w-full md:w-[40%] bg-slate-50 p-10 border-r border-slate-100 flex flex-col items-center justify-center">
              <div className="w-48 h-48 rounded-[2rem] overflow-hidden bg-slate-200 shadow-inner mb-6 relative group border-4 border-white">
                {newAtlet.foto_url ? (
                  <img
                    src={newAtlet.foto_url}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-full h-full p-10 text-slate-300" />
                )}
                <label className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-white">
                  <Camera size={30} />
                  <span className="text-[10px] font-black uppercase mt-2">
                    Upload Photo
                  </span>
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={onFileChange}
                  />
                </label>
              </div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">
                Rekomendasi: Portrait (4:5)
                <br />
                Maksimal 2MB
              </p>
            </div>

            <form
              onSubmit={handleAddNewAtlet}
              className="w-full md:w-[60%] p-10 md:p-14 space-y-6"
            >
              <h3 className="text-3xl font-black italic uppercase">
                Register <span className="text-blue-600">New Player</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                    Nama Lengkap
                  </label>
                  <input
                    required
                    className="w-full px-5 py-4 bg-slate-100 rounded-2xl font-black text-sm uppercase"
                    value={newAtlet.nama}
                    onChange={(e) =>
                      setNewAtlet({ ...newAtlet, nama: e.target.value })
                    }
                    placeholder="Input Name..."
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                    WhatsApp
                  </label>
                  <input
                    required
                    className="w-full px-5 py-4 bg-slate-100 rounded-2xl font-black text-sm"
                    value={newAtlet.whatsapp}
                    onChange={(e) =>
                      setNewAtlet({ ...newAtlet, whatsapp: e.target.value })
                    }
                    placeholder="08..."
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                    Domisili
                  </label>
                  <input
                    className="w-full px-5 py-4 bg-slate-100 rounded-2xl font-black text-sm"
                    value={newAtlet.domisili}
                    onChange={(e) =>
                      setNewAtlet({ ...newAtlet, domisili: e.target.value })
                    }
                    placeholder="City..."
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                    Kategori
                  </label>
                  <select
                    disabled
                    className="w-full px-5 py-4 bg-slate-200 rounded-2xl font-black text-sm opacity-70"
                    value={newAtlet.kategori}
                  >
                    <option value="SENIOR">SENIOR</option>
                    <option value="MUDA">MUDA</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 bg-blue-50 p-5 rounded-3xl border border-blue-100">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-blue-400 uppercase tracking-widest">
                    Skill Seed
                  </label>
                  <select
                    className="w-full px-4 py-3 bg-white border border-blue-200 rounded-xl font-black text-xs"
                    value={newAtlet.seed}
                    onChange={(e) => handleSeedChange(e.target.value)}
                  >
                    <option value="UNSEEDED">PILIH SEED</option>
                    <option value="C">SEED C (MUDA)</option>
                    <option value="B-">SEED B- (SR)</option>
                    <option value="B+">SEED B+ (SR)</option>
                    <option value="A">SEED A (SR)</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-blue-400 uppercase tracking-widest">
                    Auto-Points
                  </label>
                  <div className="w-full px-4 py-3 bg-blue-600 text-white rounded-xl font-black text-sm flex items-center justify-between">
                    <Zap size={14} /> {newAtlet.points.toLocaleString()} PTS
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSaving || isSubmitting}
                className="w-full py-5 bg-slate-900 text-white rounded-[2rem] font-black uppercase text-xs tracking-[0.3em] flex items-center justify-center gap-3 shadow-2xl hover:bg-blue-600 transition-all disabled:opacity-50"
              >
                {isSaving || isSubmitting ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <ShieldCheck />
                )}{' '}
                Confirm Registration
              </button>
            </form>
          </div>
        </div>
      )}

      {/* CROPPER MODAL */}
      {isCropping && imageToCrop && (
        <div className="fixed inset-0 z-[300] bg-black flex flex-col items-center justify-center p-4">
          <div className="relative w-full max-w-lg aspect-[4/5] bg-zinc-900 rounded-3xl overflow-hidden">
            <Cropper
              image={imageToCrop}
              crop={crop}
              zoom={zoom}
              aspect={4 / 5}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
            />
          </div>
          <div className="mt-8 flex gap-4 w-full max-w-lg">
            <button
              onClick={() => setIsCropping(false)}
              className="flex-1 py-4 bg-white/10 text-white rounded-2xl font-black uppercase text-xs"
            >
              Batal
            </button>
            <button
              onClick={handleUploadCroppedImage}
              disabled={uploadingImage}
              className="flex-[2] py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-xs flex items-center justify-center gap-2"
            >
              {uploadingImage ? (
                <Loader2 className="animate-spin" />
              ) : (
                <Scissors size={18} />
              )}{' '}
              Terapkan Foto
            </button>
          </div>
        </div>
      )}

      {/* MODAL DETAIL */}
      {selectedAtlet && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-xl animate-in fade-in duration-500">
          <div className="relative w-full max-w-5xl bg-[#0a0a0a] rounded-[3rem] overflow-hidden flex flex-col md:flex-row shadow-2xl border border-white/5">
            <button
              onClick={() => setSelectedAtlet(null)}
              className="absolute top-8 right-8 z-50 p-3 bg-white/5 hover:bg-red-500 text-white rounded-full transition-all"
            >
              <X size={24} />
            </button>
            <div className="w-full md:w-[45%] h-[400px] md:h-auto relative bg-zinc-900 overflow-hidden">
              {selectedAtlet.foto_url ? (
                <img
                  src={selectedAtlet.foto_url}
                  className="w-full h-full object-cover"
                  alt={selectedAtlet.nama}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-zinc-800">
                  <User size={150} className="text-white/5" />
                </div>
              )}
              <div className="absolute bottom-10 left-10 z-20">
                <div className="bg-amber-400 text-black font-black text-[11px] px-5 py-2 rounded-xl flex items-center gap-3 italic uppercase tracking-tighter">
                  <Trophy size={16} /> {selectedAtlet.prestasi}
                </div>
              </div>
            </div>
            <div className="w-full md:w-[55%] p-10 md:p-16 flex flex-col justify-center">
              <div className="flex justify-between items-center mb-8">
                <div className="flex gap-2">
                  <span className="bg-blue-600/20 text-blue-400 text-[10px] font-black px-4 py-1.5 rounded-lg border border-blue-600/30 uppercase italic">
                    {selectedAtlet.kategori}
                  </span>
                  <span className="bg-white/5 text-white/40 text-[10px] font-black px-4 py-1.5 rounded-lg border border-white/10 uppercase italic">
                    {selectedAtlet.seed}
                  </span>
                </div>
                <button
                  onClick={() => {
                    setEditingStats(selectedAtlet);
                    setIsEditModalOpen(true);
                  }}
                  className="flex items-center gap-2 text-white/30 hover:text-blue-400 text-[10px] font-black uppercase tracking-widest"
                >
                  <Edit3 size={14} /> UPDATE PERFORMANCE
                </button>
              </div>
              <h2 className="text-5xl md:text-7xl font-black text-white italic uppercase tracking-tighter mb-10 leading-[0.85]">
                {selectedAtlet.nama}
              </h2>
              <div className="grid grid-cols-2 gap-4 mb-10">
                <div className="bg-white/5 p-6 rounded-3xl border border-white/5 transition-colors">
                  <TrendingUp className="text-blue-500 mb-3" size={24} />
                  <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] mb-1">
                    Global Standing
                  </p>
                  <p className="text-3xl font-black text-white italic">
                    #{selectedAtlet.rank > 0 ? selectedAtlet.rank : '??'}
                  </p>
                </div>
                <div className="bg-white/5 p-6 rounded-3xl border border-white/5 transition-colors">
                  <Zap className="text-amber-500 mb-3" size={24} />
                  <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] mb-1">
                    Total Points
                  </p>
                  <p className="text-3xl font-black text-white italic">
                    {selectedAtlet.points.toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="bg-blue-600/5 p-8 rounded-3xl border border-blue-600/10 relative">
                <p className="text-slate-400 text-sm leading-relaxed italic font-medium">
                  "{selectedAtlet.bio}"
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL EDIT PERFORMANCE */}
      {isEditModalOpen && editingStats && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden relative">
            <button
              onClick={() => setIsEditModalOpen(false)}
              className="absolute top-6 right-6 p-2 bg-slate-100 rounded-full hover:bg-red-500 hover:text-white transition-all"
            >
              <X size={20} />
            </button>
            <div className="p-10">
              <h3 className="text-2xl font-black italic uppercase mb-8">
                Edit <span className="text-blue-600">Performance</span>
              </h3>
              <form onSubmit={handleUpdateStats} className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                      Points
                    </label>
                    <input
                      type="number"
                      className="w-full px-5 py-3 bg-slate-100 rounded-xl font-black"
                      value={editingStats.points || 0}
                      onChange={(e) =>
                        setEditingStats({
                          ...editingStats,
                          points: parseInt(e.target.value),
                        })
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                      Seed Level
                    </label>
                    <select
                      className="w-full px-5 py-3 bg-slate-100 rounded-xl font-black uppercase"
                      value={editingStats.seed || 'UNSEEDED'}
                      onChange={(e) => handleSeedChange(e.target.value, true)}
                    >
                      <option value="UNSEEDED">UNSEEDED</option>
                      <option value="C">SEED C (MUDA)</option>
                      <option value="B-">SEED B- (SR)</option>
                      <option value="B+">SEED B+ (SR)</option>
                      <option value="A">SEED A (SR)</option>
                    </select>
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={isSaving || isSubmitting}
                  className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-[0.3em] flex items-center justify-center gap-3"
                >
                  {isSaving || isSubmitting ? (
                    <Loader2 className="animate-spin" size={18} />
                  ) : (
                    <Save size={18} />
                  )}
                  Save Performance
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* NOTIFICATION */}
      <div
        className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-[200] transition-all duration-700 transform ${
          showSuccess
            ? 'translate-y-0 opacity-100'
            : 'translate-y-24 opacity-0 pointer-events-none'
        }`}
      >
        <div className="bg-slate-900/90 backdrop-blur-2xl border border-blue-500/50 px-10 py-6 rounded-[2.5rem] shadow-2xl flex items-center gap-6">
          <div className="bg-blue-600 p-4 rounded-2xl animate-bounce">
            <Zap size={24} className="text-white fill-white" />
          </div>
          <div>
            <h4 className="text-white font-black uppercase tracking-tighter text-xl italic leading-none mb-1">
              {notifMessage}
            </h4>
            <p className="text-blue-400 text-[10px] font-black uppercase tracking-[0.2em] opacity-80">
              Database Updated
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
