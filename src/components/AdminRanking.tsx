import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../supabase';
import {
  Plus,
  Trash2,
  Edit3,
  Save,
  X,
  Search,
  Loader2,
  User,
  RefreshCw,
  AlertCircle,
  Camera,
  ChevronLeft,
  ChevronRight,
  Zap,
  Download,
  FileText,
  Table as TableIcon
} from 'lucide-react';
import { saveAs } from "file-saver";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import "jspdf-autotable";

interface Ranking {
  id: string;
  pendaftaran_id?: string;
  player_name: string;
  category: string;
  seed: string;
  total_points: number; // Final Result (poin + bonus)
  bonus: number;        // From atlet_stats.total_points
  poin: number;         // From atlet_stats.points
  photo_url?: string;
  updated_at?: string;
}

export default function AdminRanking() {
  const [rankings, setRankings] = useState<Ranking[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSeed, setSelectedSeed] = useState('Semua');
  const [selectedCategory, setSelectedCategory] = useState('Semua');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [formData, setFormData] = useState<Partial<Ranking>>({
    player_name: '',
    category: 'SENIOR',
    seed: 'Seed A',
    total_points: 0,
    bonus: 0,
    poin: 0,
    photo_url: '',
  });

  // --- LOGIKA SINKRONISASI DATA UTAMA (FIXED: Added Points = atlet_stats.total_points) ---
  const autoSyncData = useCallback(async () => {
    try {
      // 1. Tarik data stats terbaru
      const { data: statsData, error: statsError } = await supabase
        .from('atlet_stats')
        .select('pendaftaran_id, points, total_points, seed');

      if (statsError) throw statsError;

      // 2. Tarik data profil terbaru
      const { data: pendaftaranData, error: pendaftaranError } = await supabase
        .from('pendaftaran')
        .select('id, nama, foto_url, kategori_atlet');

      if (pendaftaranError) throw pendaftaranError;

      // 3. Mapping data: Memastikan bonus di tabel rankings mengambil nilai total_points dari atlet_stats
      const finalDataArray = (statsData || []).map((stat) => {
        const profile = (pendaftaranData || []).find((p) => p.id === stat.pendaftaran_id);
        if (profile) {
          const basePoints = Number(stat.points) || 0;
          const addedPointsFromStats = Number(stat.total_points) || 0; 

          let normalizedSeed = stat.seed || 'Non-Seed';
          if (!normalizedSeed.includes('Seed') && normalizedSeed !== 'Non-Seed') {
            normalizedSeed = `Seed ${normalizedSeed}`;
          }

          return {
            pendaftaran_id: profile.id,
            player_name: (profile.nama || '').trim().toUpperCase(),
            category: profile.kategori_atlet || 'SENIOR',
            seed: normalizedSeed,
            photo_url: profile.foto_url || null,
            poin: basePoints,
            bonus: addedPointsFromStats, // SINKRONISASI: bonus (UI) = atlet_stats.total_points
            total_points: basePoints + addedPointsFromStats,
            updated_at: new Date().toISOString(),
          };
        }
        return null;
      }).filter(Boolean);

      if (finalDataArray.length > 0) {
        // Upsert ke tabel rankings
        const { error: upsertError } = await supabase
          .from('rankings')
          .upsert(finalDataArray, { onConflict: 'player_name' });
        
        if (upsertError) throw upsertError;
        return true;
      }
      return false;
    } catch (err: any) {
      console.error('Sync Error:', err.message);
      return false;
    }
  }, []);

  const fetchRankings = useCallback(async () => {
    setLoading(true);
    try {
      await autoSyncData();
      const { data, error } = await supabase
        .from('rankings')
        .select('*')
        .order('total_points', { ascending: false });

      if (error) throw error;
      setRankings(data || []);
    } catch (err: any) {
      setFormError('Gagal memuat data: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [autoSyncData]);

  // --- SINKRONISASI REAL-TIME ---
  useEffect(() => {
    fetchRankings();

    const channel = supabase
      .channel('realtime_rankings_sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'atlet_stats' }, () => {
        autoSyncData().then(() => {
          supabase.from('rankings').select('*').order('total_points', { ascending: false })
            .then(({ data }) => data && setRankings(data));
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchRankings, autoSyncData]);

  // --- HANDLERS (SINKRONISASI DUA ARAH) ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsSaving(true);
    try {
      if (!formData.player_name) throw new Error('Nama atlet wajib diisi');
      
      const cleanName = formData.player_name.trim().toUpperCase();
      const base = Number(formData.poin) || 0;
      const bonus = Number(formData.bonus) || 0; 
      const calculatedTotal = base + bonus;
      
      const payload = {
        player_name: cleanName,
        category: formData.category,
        seed: formData.seed,
        poin: base,
        bonus: bonus,
        total_points: calculatedTotal,
        photo_url: formData.photo_url || null,
        updated_at: new Date().toISOString(),
        pendaftaran_id: formData.pendaftaran_id 
      };

      // 1. Update Tabel Rankings
      const { error: rankError } = editingId 
        ? await supabase.from('rankings').update(payload).eq('id', editingId)
        : await supabase.from('rankings').upsert([payload], { onConflict: 'player_name' });

      if (rankError) throw rankError;

      // 2. Sinkronisasi ke tabel atlet_stats berdasarkan pendaftaran_id
      // Cari pendaftaran_id jika belum ada (berguna untuk data manual)
      let targetPendaftaranId = formData.pendaftaran_id;
      if (!targetPendaftaranId) {
        const { data: pendaftaran } = await supabase
          .from('pendaftaran')
          .select('id')
          .ilike('nama', cleanName)
          .single();
        targetPendaftaranId = pendaftaran?.id;
      }

      if (targetPendaftaranId) {
        let dbSeed = formData.seed?.replace('Seed ', '') || 'Non-Seed';
        
        const { error: statsUpdateError } = await supabase
          .from('atlet_stats')
          .update({
            points: base,
            total_points: bonus, // Sync: Added Points (Ranking) -> total_points (atlet_stats)
            seed: dbSeed,
            updated_at: new Date().toISOString()
          })
          .eq('pendaftaran_id', targetPendaftaranId);

        if (statsUpdateError) throw statsUpdateError;
      }
      
      setIsModalOpen(false);
      setEditingId(null);
      setSuccessMsg('Data Berhasil Disinkronkan!');
      setTimeout(() => setSuccessMsg(null), 3000);
      await fetchRankings(); 
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const filteredRankings = rankings.filter((r) => {
    const matchSearch = (r.player_name || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchSeed = selectedSeed === 'Semua' || r.seed === selectedSeed;
    const matchCategory = selectedCategory === 'Semua' || r.category === selectedCategory;
    return matchSearch && matchSeed && matchCategory;
  });

  const exportToExcel = () => {
    const exportData = filteredRankings.map((r, idx) => ({
      Rank: idx + 1,
      Nama: r.player_name,
      Kategori: r.category,
      Seed: r.seed,
      "Base Points": r.poin,
      "Added Points (Stats)": r.bonus,
      "Total Ranking Points": r.total_points
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = { Sheets: { data: ws }, SheetNames: ["RankingData"] };
    const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    saveAs(new Blob([excelBuffer]), "Ranking_PB_Bilibili_162.xlsx");
  };

  const exportToPDF = () => {
    const doc = new jsPDF() as any;
    doc.text("RANKING PB BILIBILI 162", 14, 15);
    doc.autoTable({
      head: [["Rank", "Nama", "Kat", "Seed", "Base", "Added", "Total"]],
      body: filteredRankings.map((r, idx) => [idx + 1, r.player_name, r.category, r.seed, r.poin, r.bonus, r.total_points]),
      startY: 22,
      theme: 'grid'
    });
    doc.save("Ranking_PB_Bilibili_162.pdf");
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Hapus data atlet ini?')) return;
    try {
      await supabase.from('rankings').delete().eq('id', id);
      setSuccessMsg('Atlet dihapus');
      setTimeout(() => setSuccessMsg(null), 2000);
      fetchRankings();
    } catch (err: any) { alert(err.message); }
  };

  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedRankings = filteredRankings.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="min-h-screen bg-[#050505] text-white p-4 md:p-12 font-sans">
      <div className="max-w-7xl mx-auto">
        {successMsg && (
          <div className="fixed top-10 left-1/2 -translate-x-1/2 z-[150] bg-blue-600 text-white px-6 py-3 rounded-full font-bold text-xs uppercase flex items-center gap-3 shadow-2xl animate-bounce">
            <Zap size={16} fill="white" /> {successMsg}
          </div>
        )}

        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-12">
          <div>
            <h1 className="text-5xl font-black italic tracking-tighter uppercase leading-none">
              MANAJEMEN<span className="text-blue-600"> RANKING</span>
            </h1>
            <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mt-2">
              Sistem Sinkronisasi Added Points (Stats) & Base Points Terintegrasi
            </p>
          </div>

          <div className="flex flex-wrap gap-3 w-full md:w-auto">
            <button onClick={exportToExcel} className="flex-1 bg-emerald-600 hover:bg-emerald-500 px-4 py-3 rounded-xl font-bold uppercase text-[10px] flex items-center justify-center gap-2 transition-all">
              <TableIcon size={14} /> Excel
            </button>
            <button onClick={exportToPDF} className="flex-1 bg-red-600 hover:bg-red-500 px-4 py-3 rounded-xl font-bold uppercase text-[10px] flex items-center justify-center gap-2 transition-all">
              <FileText size={14} /> PDF
            </button>
            <button onClick={fetchRankings} disabled={loading} className="flex-1 bg-zinc-900 border border-white/10 px-4 py-3 rounded-xl font-bold uppercase text-[10px] flex items-center justify-center gap-2 hover:bg-zinc-800 transition-all">
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Sync
            </button>
            <button onClick={() => { setEditingId(null); setFormData({ player_name: '', category: 'SENIOR', seed: 'Seed A', poin: 0, bonus: 0 }); setIsModalOpen(true); }} className="flex-1 bg-blue-600 hover:bg-blue-500 px-6 py-3 rounded-xl font-bold uppercase text-[10px] flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-600/20">
              <Plus size={14} /> Tambah
            </button>
          </div>
        </div>

        {/* FILTER BAR */}
        <div className="bg-zinc-900/40 border border-white/5 p-3 rounded-2xl mb-8 flex flex-col md:flex-row gap-3 backdrop-blur-sm">
          <div className="relative flex-grow">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
            <input
              type="text"
              placeholder="CARI NAMA ATLET..."
              className="w-full bg-black/40 border border-white/5 rounded-xl py-3 pl-12 pr-4 outline-none text-xs font-bold uppercase"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select className="bg-black/40 border border-white/5 rounded-xl px-4 py-3 font-bold text-xs outline-none uppercase text-zinc-300" value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}>
            <option value="Semua">SEMUA KATEGORI</option>
            <option value="MUDA">MUDA</option>
            <option value="SENIOR">SENIOR</option>
          </select>
          <select className="bg-black/40 border border-white/5 rounded-xl px-4 py-3 font-bold text-xs outline-none uppercase text-zinc-300" value={selectedSeed} onChange={(e) => setSelectedSeed(e.target.value)}>
            <option value="Semua">SEMUA SEED</option>
            <option value="Seed A">Seed A</option>
            <option value="Seed B+">Seed B+</option>
            <option value="Seed B-">Seed B-</option>
            <option value="Seed C">Seed C</option>
            <option value="Non-Seed">Non-Seed</option>
          </select>
        </div>

        {/* TABLE */}
        <div className="bg-zinc-900/20 border border-white/5 rounded-3xl overflow-hidden shadow-2xl overflow-x-auto">
          <table className="w-full text-left min-w-[1000px]">
            <thead className="bg-white/[0.02] border-b border-white/5 text-zinc-500">
              <tr>
                <th className="p-5 text-[10px] font-black uppercase text-center w-20">Rank</th>
                <th className="p-5 text-[10px] font-black uppercase">Profil Atlet</th>
                <th className="p-5 text-[10px] font-black uppercase">Kategori</th>
                <th className="p-5 text-[10px] font-black uppercase">Seeded</th>
                <th className="p-5 text-[10px] font-black uppercase">Base Points</th>
                <th className="p-5 text-[10px] font-black uppercase text-emerald-500">Added Points (Stats)</th>
                <th className="p-5 text-[10px] font-black uppercase text-center">Total Ranking</th>
                <th className="p-5 text-[10px] font-black uppercase text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr><td colSpan={8} className="p-32 text-center text-xs font-bold uppercase text-zinc-500 animate-pulse">Syncing...</td></tr>
              ) : paginatedRankings.length > 0 ? (
                paginatedRankings.map((item, index) => (
                  <tr key={item.id} className="hover:bg-white/[0.02] transition-all group">
                    <td className="p-5 text-center font-black italic text-xl text-zinc-700 group-hover:text-blue-500">
                      {String(startIndex + index + 1).padStart(2, '0')}
                    </td>
                    <td className="p-5">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-zinc-800 rounded-full border border-white/10 overflow-hidden ring-2 ring-blue-600/20">
                          {item.photo_url ? <img src={item.photo_url} className="w-full h-full object-cover" alt="" /> : <User size={20} className="m-auto mt-3 text-zinc-600" />}
                        </div>
                        <p className="font-black uppercase italic text-sm text-white group-hover:text-blue-400">{item.player_name}</p>
                      </div>
                    </td>
                    <td className="p-5">
                      <span className={`px-3 py-1 rounded-full text-[9px] font-bold uppercase ${item.category === 'MUDA' ? 'bg-orange-500/10 text-orange-500' : 'bg-purple-500/10 text-purple-500'}`}>
                        {item.category}
                      </span>
                    </td>
                    <td className="p-5">
                      <span className="bg-blue-600/10 border border-blue-600/20 px-3 py-1 rounded-full text-[9px] font-bold text-blue-500 uppercase">{item.seed}</span>
                    </td>
                    <td className="p-5 font-bold text-zinc-400 text-xs">{(item.poin || 0).toLocaleString()}</td>
                    <td className="p-5 font-bold text-emerald-500 text-xs">+{ (item.bonus || 0).toLocaleString()}</td>
                    <td className="p-5 text-center">
                      <span className="text-xl font-black text-white group-hover:text-blue-500">
                        {(item.poin + item.bonus).toLocaleString()}
                      </span>
                    </td>
                    <td className="p-5 text-right flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                      <button onClick={() => { setEditingId(item.id); setFormData(item); setIsModalOpen(true); }} className="p-2.5 bg-zinc-900 hover:bg-blue-600 rounded-xl"><Edit3 size={16} /></button>
                      <button onClick={() => handleDelete(item.id)} className="p-2.5 bg-zinc-900 hover:bg-red-600 rounded-xl"><Trash2 size={16} /></button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={8} className="p-20 text-center text-zinc-500 uppercase font-bold text-xs italic">Data tidak ditemukan.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl">
          <div className="bg-zinc-950 w-full max-w-lg rounded-[2.5rem] border border-white/10 overflow-hidden shadow-2xl">
            <div className="p-8 border-b border-white/5 flex justify-between items-center">
              <h3 className="font-black uppercase italic text-2xl">{editingId ? 'EDIT' : 'TAMBAH'} DATA RANKING</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-3 bg-zinc-900 rounded-2xl hover:bg-red-600/20"><X size={24} /></button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div className="flex items-center gap-4 p-4 bg-white/[0.02] border border-white/5 rounded-3xl">
                <div className="w-20 h-20 bg-zinc-900 rounded-2xl overflow-hidden flex items-center justify-center">
                  {formData.photo_url ? <img src={formData.photo_url} className="w-full h-full object-cover" /> : <Camera className="text-zinc-700" />}
                </div>
                <div className="flex-grow">
                  <input type="file" ref={fileInputRef} onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setIsUploading(true);
                    const { data } = await supabase.storage.from('images').upload(`ranking-photos/${Date.now()}`, file);
                    if (data) {
                      const { data: { publicUrl } } = supabase.storage.from('images').getPublicUrl(data.path);
                      setFormData(prev => ({ ...prev, photo_url: publicUrl }));
                    }
                    setIsUploading(false);
                  }} className="hidden" />
                  <button type="button" onClick={() => fileInputRef.current?.click()} className="bg-zinc-800 px-4 py-2 rounded-xl text-[10px] font-bold uppercase">{isUploading ? 'Uploading...' : 'Ubah Foto'}</button>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-zinc-500 uppercase">Nama Lengkap</label>
                  <input required className="w-full bg-zinc-900 border border-white/5 rounded-2xl p-4 outline-none font-black uppercase text-sm" value={formData.player_name} onChange={(e) => setFormData({ ...formData, player_name: e.target.value })} />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-zinc-500 uppercase">Kategori</label>
                    <select className="w-full bg-zinc-900 border border-white/5 rounded-2xl p-4 font-bold text-xs uppercase" value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })}>
                      <option value="MUDA">MUDA</option>
                      <option value="SENIOR">SENIOR</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-zinc-500 uppercase">Seed</label>
                    <select className="w-full bg-zinc-900 border border-white/5 rounded-2xl p-4 font-bold text-xs uppercase" value={formData.seed} onChange={(e) => setFormData({ ...formData, seed: e.target.value })}>
                      <option value="Seed A">Seed A</option>
                      <option value="Seed B+">Seed B+</option>
                      <option value="Seed B-">Seed B-</option>
                      <option value="Seed C">Seed C</option>
                      <option value="Non-Seed">Non-Seed</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-zinc-500 uppercase">Base Points</label>
                    <input type="number" className="w-full bg-zinc-900 border border-white/5 rounded-2xl p-4 font-bold" value={formData.poin} onChange={(e) => setFormData({ ...formData, poin: Number(e.target.value) })} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-emerald-500 uppercase">Added (Stats)</label>
                    <input type="number" className="w-full bg-zinc-900 border border-emerald-500/20 rounded-2xl p-4 font-bold text-emerald-500" value={formData.bonus} onChange={(e) => setFormData({ ...formData, bonus: Number(e.target.value) })} />
                  </div>
                </div>

                <div className="bg-blue-600/10 p-4 rounded-2xl border border-blue-600/20 flex justify-between items-center">
                  <span className="text-[10px] font-black uppercase text-blue-400 italic">Total Poin Ranking</span>
                  <span className="text-3xl font-black">{(Number(formData.poin) + Number(formData.bonus)).toLocaleString()}</span>
                </div>
              </div>

              <button disabled={isSaving || isUploading} type="submit" className="w-full py-5 bg-blue-600 hover:bg-blue-500 rounded-2xl font-black uppercase text-xs flex items-center justify-center gap-3 transition-all">
                {isSaving ? <Loader2 className="animate-spin" /> : <Save />} {editingId ? 'UPDATE DATA' : 'SIMPAN DATA'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}