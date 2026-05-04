import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../supabase';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Trophy,
  Search,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
  RefreshCw,
  History,
  Calendar,
  Info,
  ShieldCheck,
  Activity,
  Flame,
  Award,
  ArrowUpRight,
  ArrowDownRight,
  User,
  Clock,
  Hash,
  Filter,
} from 'lucide-react';

// --- Interfaces ---
interface PlayerRanking {
  id: string;
  player_name: string;
  category: string;
  seed: string;
  total_points: number;
  bonus?: number;
  photo_url?: string; // Tambahkan photo_url agar sinkron dengan Admin
  updated_at?: string;
}

interface PointHistory {
  id: string;
  created_at: string;
  perubahan: number;
  poin_sebelum: number;
  poin_sesudah: number;
  admin_email: string;
  tipe_kegiatan: string;
}

interface WeeklyTop {
  atlet_nama: string;
  total_gain: number;
  total_aktivitas: number;
}

// --- Komponen: Weekly Spotlight ---
const WeeklySpotlight: React.FC = () => {
  const [topGainer, setTopGainer] = useState<WeeklyTop | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWeeklyTop = async () => {
      try {
        const { data, error } = await supabase
          .from('weekly_top_performers')
          .select('*')
          .limit(1)
          .maybeSingle();

        if (error) throw error;
        if (data) setTopGainer(data);
      } catch (err) {
        console.error('Weekly Spotlight Error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchWeeklyTop();
  }, []);

  if (loading || !topGainer) return null;

  return (
    <div className="relative group overflow-hidden bg-gradient-to-br from-orange-600/20 via-slate-900 to-slate-900 border border-orange-500/30 p-6 rounded-[2.5rem] mb-10 shadow-[0_0_50px_-12px_rgba(249,115,22,0.15)] animate-in fade-in zoom-in duration-700">
      <Flame className="absolute -right-4 -bottom-4 w-32 h-32 text-orange-600/10 -rotate-12 group-hover:scale-110 transition-transform duration-700" />
      <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className="relative">
            <div className="absolute inset-0 bg-orange-500 blur-xl opacity-20 animate-pulse" />
            <div className="w-16 h-16 bg-orange-500 rounded-2xl flex items-center justify-center rotate-3 border-2 border-orange-400 shadow-lg shadow-orange-500/20">
              <Award className="text-white w-8 h-8" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-orange-500">
                Weekly Performance Hero
              </span>
              <div className="h-[1px] w-8 bg-orange-500/30 rounded-full" />
            </div>
            <h2 className="text-3xl font-black italic uppercase tracking-tighter text-white">
              {topGainer.atlet_nama}
            </h2>
          </div>
        </div>
        <div className="flex gap-4">
          <div className="bg-white/5 backdrop-blur-md border border-white/10 p-4 rounded-2xl min-w-[120px] text-center transition-transform hover:scale-105">
            <p className="text-[9px] font-bold text-slate-500 uppercase mb-1 tracking-widest">
              Poin Didapat
            </p>
            <div className="flex items-center justify-center gap-2 text-emerald-400 font-black text-xl">
              <TrendingUp size={16} />+{topGainer.total_gain}
            </div>
          </div>
          <div className="bg-white/5 backdrop-blur-md border border-white/10 p-4 rounded-2xl min-w-[120px] text-center transition-transform hover:scale-105">
            <p className="text-[9px] font-bold text-slate-500 uppercase mb-1 tracking-widest">
              Aktivitas
            </p>
            <div className="text-orange-400 font-black text-xl flex flex-items-center justify-center gap-2">
              <Flame size={16} />
              {topGainer.total_aktivitas}x
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Komponen Utama: Rankings ---
const Rankings: React.FC = () => {
  const [dbRankings, setDbRankings] = useState<PlayerRanking[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [expandedPlayer, setExpandedPlayer] = useState<string | null>(null);
  const [playerHistory, setPlayerHistory] = useState<PointHistory[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // --- FUNGSI FETCH UTAMA: Diperbaiki untuk Sinkronisasi Penuh ---
  const fetchRankings = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      // 1. Ambil data mentah dari tabel rankings (untuk mendapatkan struktur dasar)
      const { data: rankingsData, error: rankingsError } = await supabase
        .from('rankings')
        .select('*');
  
      if (rankingsError) throw rankingsError;
  
      // 2. Ambil data sumber kebenaran (atlet_stats) seperti pada kode Admin
      // Admin menggunakan atlet_stats sebagai sumber poin dasar dan bonus
      const { data: statsData, error: statsError } = await supabase
        .from('atlet_stats')
        .select('pendaftaran_id, points, total_points, seed');
  
      if (statsError) throw statsError;
  
      // 3. Ambil data pendaftaran untuk memastikan nama & foto sinkron
      const { data: pendaftaranData, error: pendaftaranError } = await supabase
        .from('pendaftaran')
        .select('id, nama, foto_url, kategori_atlet');
  
      if (pendaftaranError) throw pendaftaranError;
  
      // 4. Proses penggabungan data (Logic Sinkronisasi Lengkap)
      const syncedData = (rankingsData || []).map((rankItem) => {
        // Cari data statistik berdasarkan pendaftaran_id
        const stats = (statsData || []).find((s) => s.pendaftaran_id === rankItem.pendaftaran_id);
        // Cari data profil untuk memastikan nama terbaru
        const profile = (pendaftaranData || []).find((p) => p.id === rankItem.pendaftaran_id);
  
        // Logika Kalkulasi sesuai AdminRanking.tsx baris 90-91
        const basePoints = stats ? (Number(stats.points) || 0) : (Number(rankItem.poin) || 0);
        const addedPoints = stats ? (Number(stats.total_points) || 0) : (Number(rankItem.bonus) || 0);
        
        // Total akhir yang tampil di kolom "Total Ranking" di Admin
        const finalTotal = basePoints + addedPoints;
  
        // Normalisasi Seed sesuai logic Admin baris 93-96
        let currentSeed = stats?.seed || rankItem.seed || 'Non-Seed';
        if (!currentSeed.includes('Seed') && currentSeed !== 'Non-Seed') {
          currentSeed = `Seed ${currentSeed}`;
        }
  
        return {
          ...rankItem,
          player_name: profile?.nama || rankItem.player_name,
          photo_url: profile?.foto_url || rankItem.photo_url,
          poin: basePoints,       // Base Points
          bonus: addedPoints,     // Added Points (Stats)
          total_points: finalTotal, // Hasil Akhir
          seed: currentSeed,
          category: profile?.kategori_atlet || rankItem.category
        };
      });
  
      // 5. Urutkan berdasarkan total poin tertinggi (Rank #01)
      const sortedData = syncedData.sort((a, b) => b.total_points - a.total_points);
  
      setDbRankings(sortedData);
    } catch (error: any) {
      console.error('Sync Error:', error);
      setFetchError(error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRankings();

    // Perbaikan Real-time Channel untuk menangkap Update dari Admin secara instan
    const channel = supabase
      .channel('rankings_realtime_sync_v2')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'rankings' },
        () => {
          fetchRankings();
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'audit_poin' },
        () => {
          fetchRankings();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchRankings]);

  const fetchHistoryForPlayer = async (playerName: string) => {
    setLoadingHistory(true);
    setPlayerHistory([]);
    try {
      const { data, error } = await supabase
        .from('audit_poin')
        .select('id, created_at, perubahan, poin_sebelum, poin_sesudah, admin_email, tipe_kegiatan')
        .ilike('atlet_nama', playerName.trim())
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setPlayerHistory(data || []);
    } catch (err) {
      console.error('History fetch error:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const toggleExpand = (player: PlayerRanking) => {
    if (expandedPlayer === player.id) {
      setExpandedPlayer(null);
    } else {
      setExpandedPlayer(player.id);
      fetchHistoryForPlayer(player.player_name);
    }
  };

  const getCategoryStyles = (seed: string) => {
    const s = seed?.toUpperCase() || '';
    if (s.includes('A')) return { bg: 'bg-amber-500/10', text: 'text-amber-500', border: 'border-amber-500/20' };
    if (s.includes('B+')) return { bg: 'bg-blue-500/10', text: 'text-blue-500', border: 'border-blue-500/20' };
    if (s.includes('B-') || s === 'B') return { bg: 'bg-indigo-500/10', text: 'text-indigo-500', border: 'border-indigo-500/20' };
    if (s.includes('C')) return { bg: 'bg-emerald-500/10', text: 'text-emerald-500', border: 'border-emerald-500/20' };
    return { bg: 'bg-slate-500/10', text: 'text-slate-500', border: 'border-slate-500/20' };
  };

  const filteredData = useMemo(() => {
    return dbRankings.filter((p) => {
      const name = p.player_name?.toLowerCase() || '';
      const seedRaw = p.seed?.toUpperCase() || '';
      const matchesSearch = name.includes(searchTerm.toLowerCase());
      const matchesCategory = activeCategory === 'All' || seedRaw.includes(activeCategory.toUpperCase());
      return matchesSearch && matchesCategory;
    });
  }, [searchTerm, activeCategory, dbRankings]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const currentPlayers = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <section id="rankings" className="min-h-screen py-20 bg-slate-950 text-white font-sans relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-[radial-gradient(circle_at_50%_-20%,#1e3a8a33,transparent_50%)] pointer-events-none" />
      <div className="max-w-5xl mx-auto px-4 relative z-10">
        <div className="mb-12 grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
          <div className="animate-in slide-in-from-left duration-700">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full mb-4">
              <Trophy className="text-blue-400" size={14} />
              <span className="text-blue-400 text-[10px] font-black uppercase tracking-widest">Official Points System</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-black mb-3 italic tracking-tighter uppercase">
              PB US 162 <span className="text-blue-500">RANKINGS</span>
            </h1>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest italic">Transparansi Perolehan Poin Atlet</p>
          </div>
          <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-[2rem] backdrop-blur-sm animate-in slide-in-from-right duration-700">
            <div className="flex items-center gap-2 mb-4 border-b border-slate-800 pb-2">
              <Activity size={16} className="text-blue-500" />
              <span className="text-xs font-black uppercase tracking-widest text-slate-300">Matrix Poin</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'Latihan Harian', val: '20/10/5' },
                { label: 'Sparing Partner', val: '100/50/25' },
                { label: 'Turnamen Internal', val: '300/--/50' },
                { label: 'Turnamen Eksternal', val: '500/--/100' },
              ].map((item, idx) => (
                <div key={idx} className="flex flex-col">
                  <span className="text-[9px] text-slate-500 font-bold uppercase">{item.label}</span>
                  <span className="text-xs font-mono font-black text-blue-400">{item.val}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <WeeklySpotlight />

        {/* Filter Bar */}
        <div className="flex flex-col md:flex-row gap-4 mb-8 sticky top-4 z-50">
          <div className="relative flex-1 group">
            <div className="absolute inset-0 bg-blue-500/10 blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity" />
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={18} />
            <input
              type="text"
              placeholder="Cari nama atlet..."
              className="w-full bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-2xl py-4 pl-12 pr-4 focus:border-blue-500 outline-none font-bold text-sm transition-all shadow-xl"
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar bg-slate-950/50 p-2 rounded-2xl border border-slate-800/50">
            <div className="flex items-center px-2 text-slate-600 border-r border-slate-800 mr-2">
                <Filter size={14} />
            </div>
            {['All', 'A', 'B+', 'B-', 'C'].map((cat) => (
              <button
                key={cat}
                onClick={() => { setActiveCategory(cat); setCurrentPage(1); }}
                className={`px-5 py-2 rounded-xl text-[10px] font-black border whitespace-nowrap transition-all ${activeCategory === cat ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-600/20' : 'bg-slate-900 text-slate-500 border-slate-800 hover:border-slate-600'}`}
              >
                {cat === 'All' ? 'SEMUA' : `SEED ${cat}`}
              </button>
            ))}
          </div>
        </div>

        {fetchError && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-500 animate-bounce">
            <AlertCircle size={18} />
            <span className="text-xs font-bold uppercase">{fetchError}</span>
          </div>
        )}

        <div className="bg-slate-900 border border-slate-800 rounded-[2rem] overflow-hidden shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-1000">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="bg-slate-800/30 text-slate-500 text-[10px] font-black uppercase tracking-widest border-b border-slate-800">
                  <th className="px-8 py-6 text-center w-24">Rank</th>
                  <th className="px-6 py-6">Atlet</th>
                  <th className="px-6 py-6 w-40 text-center">Kategori / Seed</th>
                  <th className="px-6 py-6 text-right w-40">Total Poin</th>
                  <th className="px-8 py-6 text-center w-32">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="py-24 text-center">
                      <Loader2 className="animate-spin mx-auto text-blue-500 mb-4" size={40} />
                      <p className="text-slate-500 font-black text-[10px] uppercase tracking-widest">Sinkronisasi Database...</p>
                    </td>
                  </tr>
                ) : currentPlayers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-24 text-center">
                      <div className="flex flex-col items-center gap-2 opacity-20">
                        <Search size={40} />
                        <p className="font-black text-xs uppercase tracking-widest">Atlet tidak ditemukan</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  currentPlayers.map((player) => {
                    const globalRank = dbRankings.findIndex((p) => p.id === player.id) + 1;
                    const style = getCategoryStyles(player.seed);
                    const isExpanded = expandedPlayer === player.id;

                    return (
                      <React.Fragment key={player.id}>
                        <tr 
                          onClick={() => toggleExpand(player)} 
                          className={`cursor-pointer transition-all group ${isExpanded ? 'bg-blue-600/10' : 'hover:bg-white/[0.02]'}`}
                        >
                          <td className="px-8 py-6 text-center">
                            <span className={`text-xl font-black italic ${globalRank <= 3 ? 'text-blue-400 underline decoration-blue-500/30' : 'text-slate-700'}`}>
                              #{String(globalRank).padStart(2, '0')}
                            </span>
                          </td>
                          <td className="px-6 py-6">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 overflow-hidden ring-2 ring-blue-500/0 group-hover:ring-blue-500/30 transition-all">
                                    {player.photo_url ? (
                                        <img src={player.photo_url} className="w-full h-full object-cover" alt="" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-slate-600"><User size={20} /></div>
                                    )}
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-black italic uppercase text-base group-hover:text-blue-400 transition-colors">{player.player_name}</span>
                                        {globalRank === 1 && <Trophy size={16} className="text-amber-400 animate-bounce" />}
                                    </div>
                                    <div className="flex items-center gap-1 mt-1 opacity-60 group-hover:opacity-100 transition-opacity">
                                        <Clock size={10} className="text-blue-500" />
                                        <span className="text-[8px] text-blue-500 font-black uppercase tracking-widest">Klik untuk Detail History</span>
                                    </div>
                                </div>
                            </div>
                          </td>
                          <td className="px-6 py-6">
                            <div className="flex flex-col gap-1 items-center">
                              <span className={`text-[9px] font-black px-3 py-1 rounded-full border text-center uppercase ${style.bg} ${style.text} ${style.border}`}>
                                {player.seed || 'UNSEEDED'}
                              </span>
                              <span className="text-[8px] text-slate-600 font-bold text-center uppercase tracking-tighter">
                                {player.category}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-6 text-right font-mono font-black text-white text-xl">
                            {Number(player.total_points || 0).toLocaleString()}
                          </td>
                          <td className="px-8 py-6 text-center">
                            {player.bonus !== undefined && player.bonus !== 0 ? (
                              <div className={`inline-flex items-center px-2 py-1 rounded-md text-[10px] font-bold shadow-lg ${player.bonus > 0 ? 'text-emerald-500 bg-emerald-500/10 shadow-emerald-500/5' : 'text-red-500 bg-red-500/10 shadow-red-500/5'}`}>
                                {player.bonus > 0 ? <TrendingUp size={12} className="mr-1" /> : <TrendingDown size={12} className="mr-1" />}
                                {player.bonus > 0 ? `+${player.bonus}` : player.bonus}
                              </div>
                            ) : <Minus size={14} className="mx-auto text-slate-800" />}
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr>
                            <td colSpan={5} className="px-8 py-0 border-none bg-blue-500/[0.02]">
                              <div className="border-x border-b border-blue-500/20 rounded-b-[2.5rem] p-6 mb-6 animate-in slide-in-from-top-4 duration-500 bg-slate-900/50 backdrop-blur-sm">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                                  <div className="bg-slate-950/80 p-5 rounded-2xl border border-slate-800 flex items-center gap-4 shadow-xl">
                                    <div className="p-3 bg-blue-500/10 rounded-xl text-blue-400"><User size={22} /></div>
                                    <div>
                                      <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Atlet Profile</p>
                                      <p className="text-sm font-black italic text-white uppercase">{player.player_name}</p>
                                    </div>
                                  </div>
                                  <div className="bg-slate-950/80 p-5 rounded-2xl border border-slate-800 flex items-center gap-4 shadow-xl">
                                    <div className="p-3 bg-amber-500/10 rounded-xl text-amber-500"><Hash size={22} /></div>
                                    <div>
                                      <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Global Rank</p>
                                      <p className="text-sm font-black italic text-white uppercase">Peringkat #{globalRank}</p>
                                    </div>
                                  </div>
                                  <div className="bg-slate-950/80 p-5 rounded-2xl border border-slate-800 flex items-center gap-4 shadow-xl">
                                    <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-500"><Clock size={22} /></div>
                                    <div>
                                      <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Status Data</p>
                                      <p className="text-sm font-black italic text-emerald-500 uppercase flex items-center gap-1"><ShieldCheck size={14} /> Live Sync</p>
                                    </div>
                                  </div>
                                </div>
                                
                                <div className="flex items-center justify-between mb-6">
                                  <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                                        <History size={16} className="text-blue-500" />
                                    </div>
                                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-300">Log Aktivitas Terbaru</span>
                                  </div>
                                  <div className="h-[1px] flex-1 mx-6 bg-gradient-to-r from-slate-800 to-transparent" />
                                  <div className="flex items-center gap-1 px-3 py-1.5 bg-blue-500/10 border border-blue-500/30 rounded-xl">
                                    <ShieldCheck size={12} className="text-blue-500" />
                                    <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest">Verified Update</span>
                                  </div>
                                </div>

                                {loadingHistory ? (
                                  <div className="flex flex-col items-center justify-center py-16 gap-4">
                                    <div className="relative">
                                        <Loader2 className="animate-spin text-blue-500" size={32} />
                                        <div className="absolute inset-0 bg-blue-500 blur-2xl opacity-20" />
                                    </div>
                                    <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.4em] animate-pulse">Synchronizing Logs...</p>
                                  </div>
                                ) : playerHistory.length > 0 ? (
                                  <div className="space-y-4">
                                    {playerHistory.map((log) => {
                                      const isGain = log.perubahan > 0;
                                      return (
                                        <div key={log.id} className={`group/item flex items-center justify-between p-5 rounded-2xl border transition-all duration-300 ${isGain ? 'bg-emerald-500/[0.03] border-emerald-500/10 hover:border-emerald-500/40' : 'bg-red-500/[0.03] border-red-500/10 hover:border-red-500/40'}`}>
                                          <div className="flex items-center gap-5">
                                            <div className={`p-3 rounded-2xl shadow-inner transition-transform group-hover/item:scale-110 ${isGain ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                                              {isGain ? <ArrowUpRight size={16} strokeWidth={3} /> : <ArrowDownRight size={16} strokeWidth={3} />}
                                            </div>
                                            <div>
                                              <div className="flex items-center gap-2 text-[10px] font-mono text-slate-500 mb-1">
                                                <Calendar size={10} />
                                                {new Date(log.created_at).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                              </div>
                                              <div className="flex items-center gap-2">
                                                <span className={`text-[12px] font-black uppercase tracking-tight ${isGain ? 'text-emerald-400' : 'text-red-400'}`}>{isGain ? 'PENAMBAHAN POIN' : 'PENGURANGAN POIN'}</span>
                                                <span className="text-slate-800 text-[10px]">|</span>
                                                <span className="text-[11px] font-bold text-slate-400 uppercase italic group-hover/item:text-slate-200 transition-colors">{log.tipe_kegiatan || 'Aktivitas Rutin'}</span>
                                              </div>
                                            </div>
                                          </div>
                                          <div className="text-right">
                                            <div className={`text-2xl font-black font-mono transition-transform group-hover/item:translate-x-[-4px] ${isGain ? 'text-emerald-400' : 'text-red-400'}`}>{isGain ? '+' : ''}{log.perubahan}</div>
                                            <div className="text-[9px] text-slate-500 font-bold uppercase tracking-tighter flex items-center justify-end gap-2 bg-slate-950/50 px-2 py-1 rounded-lg mt-1">
                                              <span>Prev: {log.poin_sebelum}</span>
                                              <ChevronRight size={8} className="text-blue-500" />
                                              <span className="text-blue-400">New: {log.poin_sesudah}</span>
                                            </div>
                                          </div>
                                        </div>
                                      );
                                    })}
                                    <div className="text-center pt-6"><p className="text-[9px] font-black text-slate-700 uppercase tracking-widest italic flex items-center justify-center gap-2"><Clock size={10} /> Menampilkan 10 riwayat aktivitas terbaru atlet</p></div>
                                  </div>
                                ) : (
                                  <div className="text-center py-20 border-2 border-dashed border-slate-800 rounded-[2rem] bg-slate-900/30">
                                    <div className="relative inline-block mb-4">
                                        <Calendar className="mx-auto opacity-10" size={60} />
                                        <div className="absolute inset-0 bg-slate-500 blur-3xl opacity-5" />
                                    </div>
                                    <p className="text-slate-600 font-black text-sm uppercase tracking-widest">Riwayat Belum Tersedia di Server</p>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          
          {/* Footer Controls */}
          <div className="p-6 flex flex-col md:flex-row items-center justify-between border-t border-slate-800 bg-slate-900/80 backdrop-blur-xl gap-4">
            <button 
                onClick={() => { fetchRankings(); }} 
                disabled={loading} 
                className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-400 hover:text-white transition-all text-[10px] font-black uppercase tracking-widest border border-slate-700"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              {loading ? 'Syncing...' : 'Refresh Database'}
            </button>
            <div className="flex items-center gap-6">
              <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">
                Showing {currentPlayers.length} of {filteredData.length} Athletes <span className="mx-2 opacity-30">|</span> Page {currentPage} / {totalPages || 1}
              </span>
              <div className="flex gap-2">
                <button 
                    disabled={currentPage === 1 || loading} 
                    onClick={() => { setCurrentPage((c) => c - 1); window.scrollTo({ top: document.getElementById('rankings')?.offsetTop, behavior: 'smooth' }); }} 
                    className="p-3 bg-slate-800 hover:bg-blue-600 rounded-xl disabled:opacity-10 transition-all border border-slate-700 hover:border-blue-500"
                >
                    <ChevronLeft size={20} />
                </button>
                <button 
                    disabled={currentPage === totalPages || totalPages === 0 || loading} 
                    onClick={() => { setCurrentPage((c) => c + 1); window.scrollTo({ top: document.getElementById('rankings')?.offsetTop, behavior: 'smooth' }); }} 
                    className="p-3 bg-slate-800 hover:bg-blue-600 rounded-xl disabled:opacity-10 transition-all border border-slate-700 hover:border-blue-500"
                >
                    <ChevronRight size={20} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <style>{` 
        .no-scrollbar::-webkit-scrollbar { display: none; } 
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; } 
        table { border-spacing: 0; }
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
      `}</style>
    </section>
  );
};

export default Rankings;