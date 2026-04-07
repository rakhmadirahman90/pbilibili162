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
} from 'lucide-center'; // Pastikan lucide-react, saya asumsikan penulisan standar lucide-react
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
  total_points: number;
  bonus: number;
  poin: number;
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

  // --- FUNGSI EXPORT ---
  const exportToExcel = () => {
    const fileType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8";
    const fileExtension = ".xlsx";
    const exportData = filteredRankings.map((r, idx) => ({
      Rank: idx + 1,
      Nama: r.player_name,
      Kategori: r.category,
      Seed: r.seed,
      "Base Points": r.poin,
      "Added Points": r.bonus,
      "Total Points": r.total_points
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = { Sheets: { data: ws }, SheetNames: ["RankingData"] };
    const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const data = new Blob([excelBuffer], { type: fileType });
    saveAs(data, "Ranking_PB_Bilibili_162" + fileExtension);
  };

  const exportToPDF = () => {
    const doc = new jsPDF() as any;
    doc.setFontSize(16);
    doc.text("DATA RANKING ATLET PB BILIBILI 162", 14, 15);
    
    const tableColumn = ["Rank", "Nama Atlet", "Kategori", "Seed", "Base", "Bonus", "Total"];
    const tableRows = filteredRankings.map((r, idx) => [
      idx + 1,
      r.player_name,
      r.category,
      r.seed,
      r.poin,
      r.bonus,
      r.total_points
    ]);

    doc.autoTable({
      head: [tableColumn],
      body: tableRows,
      startY: 22,
      theme: 'grid',
      headStyles: { fillColor: [37, 99, 235], fontSize: 10, halign: 'center' },
      styles: { fontSize: 9 },
      columnStyles: { 0: { halign: 'center' }, 4: { halign: 'right' }, 5: { halign: 'right' }, 6: { halign: 'center' } }
    });
    doc.save("Ranking_PB_Bilibili_162.pdf");
  };

  // --- LOGIKA SINKRONISASI DATA (SINKRON DENGAN KATEGORI SEED BARU) ---
  const autoSyncData = useCallback(async () => {
    try {
      const { data: statsData, error: statsError } = await supabase
        .from('atlet_stats')
        .select('pendaftaran_id, points, total_points, seed');

      if (statsError) throw statsError;

      const { data: pendaftaranData, error: pendaftaranError } = await supabase
        .from('pendaftaran')
        .select('id, nama, foto_url, kategori_atlet');

      if (pendaftaranError) throw pendaftaranError;

      const finalDataArray = (statsData || [])
        .map((stat) => {
          const profile = (pendaftaranData || []).find((p) => p.id === stat.pendaftaran_id);
          if (profile) {
            const base = Number(stat.points) || 0;
            const added = Number(stat.total_points) || 0;

            // Normalisasi Seed agar sinkron antara 'A' dan 'Seed A' dsb.
            let normalizedSeed = stat.seed || 'Non-Seed';
            if (normalizedSeed === 'A') normalizedSeed = 'Seed A';
            if (normalizedSeed === 'B+') normalizedSeed = 'Seed B+';
            if (normalizedSeed === 'B' || normalizedSeed === 'B-') normalizedSeed = 'Seed B-';
            if (normalizedSeed === 'C') normalizedSeed = 'Seed C';

            return {
              pendaftaran_id: profile.id,
              player_name: (profile.nama || '').trim().toUpperCase(),
              category: profile.kategori_atlet || 'SENIOR',
              seed: normalizedSeed,
              photo_url: profile.foto_url || null,
              poin: base,
              bonus: added,
              total_points: base + added,
              updated_at: new Date().toISOString(),
            };
          }
          return null;
        })
        .filter(Boolean);

      if (finalDataArray.length > 0) {
        await supabase.from('rankings').upsert(finalDataArray, { onConflict: 'player_name' });
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
      setFormError('Gagal mengambil data: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [autoSyncData]);

  useEffect(() => {
    fetchRankings();
  }, [fetchRankings]);

  useEffect(() => {
    if (successMsg) {
      const timer = setTimeout(() => setSuccessMsg(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMsg]);

  // --- HANDLERS ---
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `ranking-photos/${fileName}`;
      const { error: uploadError } = await supabase.storage.from('images').upload(filePath, file);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('images').getPublicUrl(filePath);
      setFormData((prev) => ({ ...prev, photo_url: publicUrl }));
      setSuccessMsg('Foto berhasil diunggah!');
    } catch (err: any) {
      alert('Gagal upload: ' + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsSaving(true);
    try {
      if (!formData.player_name) throw new Error('Nama atlet wajib diisi');
      const cleanName = formData.player_name.trim().toUpperCase();
      const base = Number(formData.poin) || 0;
      const added = Number(formData.bonus) || 0;
      
      const payload = {
        player_name: cleanName,
        category: formData.category,
        seed: formData.seed,
        poin: base,
        bonus: added,
        total_points: base + added,
        photo_url: formData.photo_url || null,
        updated_at: new Date().toISOString()
      };

      let error;
      if (editingId) {
        const { error: updateError } = await supabase.from('rankings').update(payload).eq('id', editingId);
        error = updateError;
      } else {
        const { error: upsertError } = await supabase.from('rankings').upsert([payload], { onConflict: 'player_name' });
        error = upsertError;
      }
      
      if (error) throw error;
      
      setIsModalOpen(false);
      setEditingId(null);
      setSuccessMsg('Data ranking berhasil diperbarui!');
      fetchRankings();
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Hapus atlet ini dari tabel ranking?')) return;
    try {
      const { error } = await supabase.from('rankings').delete().eq('id', id);
      if (error) throw error;
      setSuccessMsg('Data atlet berhasil dihapus');
      fetchRankings();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // --- LOGIKA FILTER & PAGINATION ---
  const filteredRankings = rankings.filter((r) => {
    const matchSearch = (r.player_name || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchSeed = selectedSeed === 'Semua' || r.seed === selectedSeed;
    const matchCategory = selectedCategory === 'Semua' || r.category === selectedCategory;
    return matchSearch && matchSeed && matchCategory;
  });

  const totalPages = Math.ceil(filteredRankings.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedRankings = filteredRankings.slice(startIndex, startIndex + itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedSeed, selectedCategory]);

  return (
    <div className="min-h-screen bg-[#050505] text-white p-4 md:p-12 font-sans selection:bg-blue-500/30">
      <div className="max-w-7xl mx-auto">
        {successMsg && (
          <div className="fixed top-10 left-1/2 -translate-x-1/2 z-[150] bg-blue-600 text-white px-6 py-3 rounded-full font-bold text-xs uppercase flex items-center gap-3 shadow-2xl animate-in fade-in slide-in-from-top-4 duration-300">
            <Zap size={16} className="fill-white" /> {successMsg}
          </div>
        )}

        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-12">
          <div>
            <h1 className="text-5xl font-black italic tracking-tighter uppercase leading-none">
              MANAJEMEN<span className="text-blue-600"> RANKING</span>
            </h1>
            <div className="flex items-center gap-2 mt-2">
              <span className="w-2 h-2 bg-blue-600 animate-pulse rounded-full"></span>
              <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-[0.2em]">
                PB BILIBILI 162 • Sistem Manajemen Poin & Seed
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 w-full md:w-auto">
            <button onClick={exportToExcel} className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 px-4 py-3 rounded-xl font-bold uppercase text-[10px] transition-all shadow-lg shadow-emerald-600/20">
              <TableIcon size={14} /> Excel
            </button>
            <button onClick={exportToPDF} className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-red-600 hover:bg-red-500 px-4 py-3 rounded-xl font-bold uppercase text-[10px] transition-all shadow-lg shadow-red-600/20">
              <FileText size={14} /> PDF
            </button>
            <button onClick={fetchRankings} disabled={loading} className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-zinc-900 border border-white/10 px-4 py-3 rounded-xl font-bold uppercase text-[10px] hover:bg-zinc-800 transition-all text-zinc-300 disabled:opacity-50">
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Sync Data
            </button>
            <button onClick={() => { setEditingId(null); setFormData({ player_name: '', category: 'SENIOR', seed: 'Seed A', poin: 0, bonus: 0, photo_url: '' }); setIsModalOpen(true); }} className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 px-6 py-4 rounded-xl font-bold uppercase text-[10px] transition-all shadow-lg shadow-blue-600/20">
              <Plus size={14} /> Tambah Atlet
            </button>
          </div>
        </div>

        {/* Filter Section - FIXED & SYNCED */}
        <div className="bg-zinc-900/40 border border-white/5 p-3 rounded-2xl mb-8 flex flex-col md:flex-row gap-3 backdrop-blur-sm">
          <div className="relative flex-grow">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
            <input
              type="text"
              placeholder="CARI NAMA ATLET..."
              className="w-full bg-black/40 border border-white/5 rounded-xl py-3 pl-12 pr-4 outline-none text-xs font-bold uppercase focus:border-blue-600/50"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select
            className="bg-black/40 border border-white/5 rounded-xl px-4 py-3 font-bold text-xs outline-none cursor-pointer uppercase text-zinc-300"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option value="Semua">SEMUA KATEGORI</option>
            <option value="MUDA">MUDA</option>
            <option value="SENIOR">SENIOR</option>
          </select>
          <select
            className="bg-black/40 border border-white/5 rounded-xl px-4 py-3 font-bold text-xs outline-none cursor-pointer uppercase text-zinc-300"
            value={selectedSeed}
            onChange={(e) => setSelectedSeed(e.target.value)}
          >
            <option value="Semua">SEMUA SEED</option>
            <option value="Seed A">Seed A</option>
            <option value="Seed B+">Seed B+</option>
            <option value="Seed B-">Seed B-</option>
            <option value="Seed C">Seed C</option>
            <option value="Non-Seed">Non-Seed</option>
          </select>
        </div>

        {/* Table Content */}
        <div className="bg-zinc-900/20 border border-white/5 rounded-3xl overflow-hidden shadow-2xl overflow-x-auto">
          <table className="w-full text-left min-w-[1000px]">
            <thead className="bg-white/[0.02] border-b border-white/5 text-zinc-500">
              <tr>
                <th className="p-5 text-[10px] font-black uppercase tracking-widest text-center w-20">Rank</th>
                <th className="p-5 text-[10px] font-black uppercase tracking-widest">Profil Atlet</th>
                <th className="p-5 text-[10px] font-black uppercase tracking-widest">Kategori</th>
                <th className="p-5 text-[10px] font-black uppercase tracking-widest">Seeded</th>
                <th className="p-5 text-[10px] font-black uppercase tracking-widest">Base Points</th>
                <th className="p-5 text-[10px] font-black uppercase tracking-widest">Added Points</th>
                <th className="p-5 text-[10px] font-black uppercase tracking-widest text-center">Total Ranking</th>
                <th className="p-5 text-[10px] font-black uppercase tracking-widest text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-32 text-center text-xs font-bold uppercase text-zinc-500 animate-pulse">
                    Mengambil Data Ranking Atlet...
                  </td>
                </tr>
              ) : paginatedRankings.length > 0 ? (
                paginatedRankings.map((item, index) => (
                  <tr key={item.id} className="hover:bg-white/[0.02] transition-all group">
                    <td className="p-5 text-center font-black italic text-xl text-zinc-700 group-hover:text-blue-500">
                      {String(startIndex + index + 1).padStart(2, '0')}
                    </td>
                    <td className="p-5">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-zinc-800 rounded-full border border-white/10 overflow-hidden ring-2 ring-blue-600/20 shadow-lg shadow-blue-600/10">
                          {item.photo_url ? (
                            <img src={item.photo_url} className="w-full h-full object-cover" alt="" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <User size={20} className="text-zinc-600" />
                            </div>
                          )}
                        </div>
                        <p className="font-black uppercase italic text-sm text-white group-hover:text-blue-400 leading-none">
                          {item.player_name}
                        </p>
                      </div>
                    </td>
                    <td className="p-5">
                      <span className={`px-3 py-1 rounded-full text-[9px] font-bold uppercase ${item.category === 'MUDA' ? 'bg-orange-500/10 text-orange-500' : 'bg-purple-500/10 text-purple-500'}`}>
                        {item.category}
                      </span>
                    </td>
                    <td className="p-5">
                      <span className="bg-blue-600/10 border border-blue-600/20 px-3 py-1 rounded-full text-[9px] font-bold text-blue-500 uppercase">
                        {item.seed}
                      </span>
                    </td>
                    <td className="p-5">
                      <span className="text-zinc-400 font-bold text-xs">{(item.poin || 0).toLocaleString()}</span>
                    </td>
                    <td className="p-5">
                      <span className="text-emerald-500 font-bold text-xs">+{ (item.bonus || 0).toLocaleString()}</span>
                    </td>
                    <td className="p-5 text-center">
                      <span className="text-xl font-black text-white group-hover:text-blue-500 transition-colors">
                        {(item.total_points || 0).toLocaleString()}
                      </span>
                    </td>
                    <td className="p-5 text-right flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                      <button
                        onClick={() => { setEditingId(item.id); setFormData(item); setIsModalOpen(true); }}
                        className="p-2.5 bg-zinc-900 hover:bg-blue-600 rounded-xl border border-white/5"
                      >
                        <Edit3 size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="p-2.5 bg-zinc-900 hover:bg-red-600 rounded-xl border border-white/5"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="p-20 text-center text-zinc-500 uppercase font-bold text-xs italic tracking-widest">
                    Tidak ada data atlet ditemukan.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-between items-center mt-8 px-2">
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
              Halaman {currentPage} dari {totalPages}
            </p>
            <div className="flex gap-2">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((prev) => prev - 1)}
                className="p-3 bg-zinc-900 border border-white/5 rounded-xl hover:bg-zinc-800 disabled:opacity-30 transition-all text-white"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((prev) => prev + 1)}
                className="p-3 bg-zinc-900 border border-white/5 rounded-xl hover:bg-zinc-800 disabled:opacity-30 transition-all text-white"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* MODAL FORM - FIXED SINKRONISASI SEED */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl">
          <div className="bg-zinc-950 w-full max-w-lg rounded-[2.5rem] border border-white/10 overflow-hidden shadow-2xl">
            <div className="p-8 border-b border-white/5 flex justify-between items-center">
              <h3 className="font-black uppercase italic text-2xl">
                {editingId ? 'EDIT' : 'TAMBAH'} DATA ATLET
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-3 bg-zinc-900 rounded-2xl hover:bg-red-600/20 transition-all">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div className="flex items-center gap-4 p-4 bg-white/[0.02] border border-white/5 rounded-3xl">
                <div className="w-20 h-20 bg-zinc-900 rounded-2xl overflow-hidden border border-white/10 flex items-center justify-center shadow-inner">
                  {formData.photo_url ? (
                    <img src={formData.photo_url} className="w-full h-full object-cover" alt="Preview" />
                  ) : (
                    <Camera size={24} className="text-zinc-700" />
                  )}
                </div>
                <div className="flex-grow">
                  <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="image/*" />
                  <button type="button" onClick={() => fileInputRef.current?.click()} className="bg-zinc-800 px-4 py-2 rounded-xl text-[10px] font-bold uppercase hover:bg-zinc-700 transition-colors">
                    {isUploading ? 'Uploading...' : 'Ganti Foto Profil'}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 col-span-2">
                  <label className="text-[10px] font-black text-zinc-500 uppercase">Nama Lengkap Atlet</label>
                  <input
                    required
                    placeholder="CONTOH: AHMAD SUBARDJO"
                    className="w-full bg-zinc-900 border border-white/5 rounded-2xl p-4 outline-none focus:border-blue-600 font-black uppercase text-sm text-white"
                    value={formData.player_name}
                    onChange={(e) => setFormData({ ...formData, player_name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-zinc-500 uppercase">Kategori Atlet</label>
                  <select
                    className="w-full bg-zinc-900 border border-white/5 rounded-2xl p-4 outline-none font-bold text-xs uppercase text-white"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  >
                    <option value="MUDA">MUDA</option>
                    <option value="SENIOR">SENIOR</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-zinc-500 uppercase">Status Seed</label>
                  <select
                    className="w-full bg-zinc-900 border border-white/5 rounded-2xl p-4 outline-none font-bold text-xs uppercase text-white"
                    value={formData.seed}
                    onChange={(e) => setFormData({ ...formData, seed: e.target.value })}
                  >
                    <option value="Seed A">Seed A</option>
                    <option value="Seed B+">Seed B+</option>
                    <option value="Seed B-">Seed B-</option>
                    <option value="Seed C">Seed C</option>
                    <option value="Non-Seed">Non-Seed</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-zinc-500 uppercase">Base Points</label>
                  <input
                    type="number"
                    className="w-full bg-zinc-900 border border-white/5 rounded-2xl p-4 outline-none text-white font-bold"
                    value={formData.poin}
                    onChange={(e) => setFormData({ ...formData, poin: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-emerald-500 uppercase">Added Points (Bonus)</label>
                  <input
                    type="number"
                    className="w-full bg-zinc-900 border border-emerald-500/20 rounded-2xl p-4 outline-none font-bold text-emerald-500"
                    value={formData.bonus}
                    onChange={(e) => setFormData({ ...formData, bonus: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div className="bg-blue-600/10 p-4 rounded-2xl border border-blue-600/20 flex justify-between items-center shadow-lg shadow-blue-600/5">
                <div className="flex flex-col">
                  <span className="text-[10px] font-black uppercase text-blue-400 italic leading-none">Total Poin Akumulasi</span>
                  <span className="text-[9px] text-zinc-500 uppercase mt-1">Otomatis Terkalkulasi</span>
                </div>
                <span className="text-3xl font-black text-white">
                  {((Number(formData.poin) || 0) + (Number(formData.bonus) || 0)).toLocaleString()}
                </span>
              </div>

              {formError && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-500 text-[10px] font-bold uppercase">
                  <AlertCircle size={16} /> {formError}
                </div>
              )}

              <button
                disabled={isSaving || isUploading}
                type="submit"
                className="w-full py-5 bg-blue-600 hover:bg-blue-500 rounded-2xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-3 transition-all shadow-xl shadow-blue-600/20 disabled:opacity-50"
              >
                {isSaving ? <Loader2 className="animate-spin" /> : <Save />}
                {editingId ? 'PERBARUI DATA ATLET' : 'SIMPAN DATA ATLET'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}