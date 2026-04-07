import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase';
import {
  Trophy,
  Plus,
  Minus,
  Search,
  User,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Zap,
  CheckCircle2,
  Sparkles,
  RefreshCcw,
  AlertTriangle,
  History,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

// Logika Konfigurasi Seed sesuai permintaan
const SEED_CONFIG: any = {
  A: { base: 10000, age: 'SENIOR' },
  'B+': { base: 8500, age: 'SENIOR' },
  'B-': { base: 7000, age: 'SENIOR' },
  C: { base: 5500, age: 'MUDA' },
  UNSEEDED: { base: 0, age: 'SENIOR' },
};

export default function ManajemenPoin() {
  const [atlets, setAtlets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [histories, setHistories] = useState<any[]>([]);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // --- KODE BARU: FUNGSI SINKRONISASI ATLET BARU ---
  const syncNewAthletes = useCallback(async () => {
    try {
      // 1. Ambil semua ID dari pendaftaran
      const { data: pendaftaran } = await supabase.from('pendaftaran').select('id, nama');
      // 2. Ambil semua pendaftaran_id yang sudah ada di atlet_stats
      const { data: stats } = await supabase.from('atlet_stats').select('pendaftaran_id');

      if (!pendaftaran) return;

      const existingIds = new Set(stats?.map(s => s.pendaftaran_id) || []);
      const newAthletes = pendaftaran.filter(p => !existingIds.has(p.id));

      if (newAthletes.length > 0) {
        const insertData = newAthletes.map(a => ({
          pendaftaran_id: a.id,
          player_name: a.nama,
          seed: 'UNSEEDED',
          points: 0,
          total_points: 0,
          last_match_at: new Date().toISOString()
        }));

        await supabase.from('atlet_stats').insert(insertData);
        
        // Inisialisasi juga di tabel rankings untuk publik
        const rankingData = newAthletes.map(a => ({
          player_name: a.nama,
          total_points: 0,
          updated_at: new Date().toISOString()
        }));
        
        await supabase.from('rankings').upsert(rankingData, { onConflict: 'player_name' });
      }
    } catch (err) {
      console.error('Gagal sinkronisasi atlet baru:', err);
    }
  }, []);

  const fetchAtlets = async () => {
    setLoading(true);
    try {
      // Jalankan sinkronisasi atlet baru terlebih dahulu
      await syncNewAthletes();

      const { data: profiles, error: pError } = await supabase
        .from('pendaftaran')
        .select('id, nama')
        .order('nama', { ascending: true });

      if (pError) throw pError;

      const { data: stats, error: sError } = await supabase
        .from('atlet_stats')
        .select('pendaftaran_id, points, total_points, seed');

      if (sError) throw sError;

      const statsMap = new Map(stats?.map((s) => [s.pendaftaran_id, s]));

      const merged = (profiles || []).map((p) => {
        const stat = statsMap.get(p.id);
        const currentSeed = stat?.seed || 'UNSEEDED';

        const basePoints = Number(stat?.points || 0);
        const addedPoints = Number(stat?.total_points || 0);

        return {
          ...p,
          seed: currentSeed,
          age_group: SEED_CONFIG[currentSeed]?.age || 'SENIOR',
          display_points: basePoints + addedPoints,
          raw_points: basePoints, 
          raw_total_points: addedPoints, 
        };
      });

      setAtlets(merged);
    } catch (err) {
      console.error('Gagal fetch data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAtlets();

    // Perbaikan Real-time: Mendengarkan tabel pendaftaran juga untuk atlet baru
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        { event: '*', table: 'atlet_stats', schema: 'public' },
        () => fetchAtlets()
      )
      .on(
        'postgres_changes',
        { event: '*', table: 'rankings', schema: 'public' },
        () => fetchAtlets()
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', table: 'pendaftaran', schema: 'public' },
        () => fetchAtlets()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleUpdateSeed = async (atlet: any, newSeed: string) => {
    setUpdatingId(atlet.id);
    const newBasePoints = SEED_CONFIG[newSeed].base;
    const newTotalRanking = newBasePoints + atlet.raw_total_points;

    try {
      const { error: statsError } = await supabase
        .from('atlet_stats')
        .update({
          seed: newSeed,
          points: newBasePoints,
        })
        .eq('pendaftaran_id', atlet.id);

      if (statsError) throw statsError;

      const { error: rankingsError } = await supabase.from('rankings').upsert(
        {
          player_name: atlet.nama,
          total_points: newTotalRanking,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'player_name' }
      );

      if (rankingsError) throw rankingsError;

      setShowSuccess(true);
      fetchAtlets();
      setTimeout(() => setShowSuccess(false), 2000);
    } catch (err: any) {
      alert('Gagal update Seed: ' + err.message);
    } finally {
      setUpdatingId(null);
    }
  };

  const fetchHistory = async (nama: string) => {
    if (!nama) return;
    const { data } = await supabase
      .from('audit_poin')
      .select('*')
      .eq('atlet_nama', nama)
      .order('created_at', { ascending: false })
      .limit(5);
    setHistories(data || []);
  };

  const toggleExpand = (atlet: any) => {
    if (expandedId === atlet.id) {
      setExpandedId(null);
    } else {
      setExpandedId(atlet.id);
      fetchHistory(atlet.nama);
    }
  };

  const handleUpdatePoin = async (
    atlet: any,
    currentDisplayPoints: number,
    amount: number
  ) => {
    if (updatingId) return;
    setUpdatingId(atlet.id);

    const newAddedPoints = Math.max(0, atlet.raw_total_points + amount);
    const newDisplayPoints = atlet.raw_points + newAddedPoints;

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { error: statsError } = await supabase.from('atlet_stats').upsert(
        {
          pendaftaran_id: atlet.id,
          player_name: atlet.nama,
          points: atlet.raw_points,
          total_points: newAddedPoints,
          last_match_at: new Date().toISOString(),
        },
        { onConflict: 'pendaftaran_id' }
      );

      if (statsError) throw statsError;

      const { error: rankingsError } = await supabase.from('rankings').upsert(
        {
          player_name: atlet.nama,
          total_points: newDisplayPoints,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'player_name' }
      );

      if (rankingsError) throw rankingsError;

      await supabase.from('audit_poin').insert([
        {
          admin_email: user?.email || 'Admin',
          atlet_id: atlet.id,
          atlet_nama: atlet.nama,
          poin_sebelum: currentDisplayPoints,
          poin_sesudah: newDisplayPoints,
          perubahan: amount,
          tipe_kegiatan: amount > 0 ? 'Adjustment (+)' : 'Adjustment (-)',
        },
      ]);

      setShowSuccess(true);
      fetchAtlets(); 
      if (expandedId === atlet.id) fetchHistory(atlet.nama);
      setTimeout(() => setShowSuccess(false), 2000);
    } catch (err: any) {
      alert('Sinkronisasi Gagal: ' + err.message);
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredAtlets = atlets.filter((a) =>
    a.nama?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filteredAtlets.length / itemsPerPage);
  const currentItems = filteredAtlets.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="p-8 bg-[#050505] min-h-screen text-white font-sans relative overflow-hidden">
      {/* Visual Background */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-blue-600/5 blur-[120px] rounded-full -z-10" />

      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start gap-6 mb-12">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" />
            <span className="text-zinc-500 text-[10px] font-black tracking-widest uppercase italic">
              Point & Profile Sync Active
            </span>
          </div>
          <h1 className="text-4xl font-black italic uppercase tracking-tighter">
            Point <span className="text-blue-600">Control</span>
          </h1>
          <button
            onClick={fetchAtlets}
            disabled={loading}
            className="mt-4 flex items-center gap-2 text-[10px] bg-zinc-900 text-zinc-400 px-4 py-2 rounded-xl font-black border border-zinc-800 hover:text-white transition-all disabled:opacity-50"
          >
            <RefreshCcw size={12} className={loading ? 'animate-spin' : ''} />{' '}
            RE-FETCH DATA
          </button>
        </div>

        <div className="relative w-full md:w-80">
          <Search
            className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600"
            size={18}
          />
          <input
            type="text"
            placeholder="Cari nama atlet..."
            className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl py-4 pl-12 text-white font-bold outline-none focus:border-blue-600 transition-all"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>
      </div>

      {/* Main List */}
      <div className="grid gap-4 mb-8">
        {loading && atlets.length === 0 ? (
          <div className="py-24 flex flex-col items-center gap-4">
            <Loader2 className="animate-spin text-blue-600" size={40} />
            <p className="text-zinc-600 font-bold text-xs uppercase tracking-widest italic">
              Syncing Database...
            </p>
          </div>
        ) : (
          currentItems.map((atlet) => (
            <div key={atlet.id} className="flex flex-col">
              {/* Card Container */}
              <div
                className={`bg-zinc-900/40 border ${
                  expandedId === atlet.id
                    ? 'border-blue-600/50 bg-zinc-900/80'
                    : 'border-zinc-800/50'
                } p-6 rounded-t-[2.5rem] ${
                  expandedId !== atlet.id ? 'rounded-b-[2.5rem]' : ''
                } flex flex-col md:flex-row items-center justify-between group transition-all duration-300`}
              >
                <div className="flex items-center gap-5">
                  <div className="w-14 h-14 bg-zinc-800 rounded-2xl flex items-center justify-center text-zinc-500 border border-white/5 group-hover:text-blue-500">
                    <User size={28} />
                  </div>
                  <div>
                    <h3 className="font-black text-xl uppercase tracking-tighter group-hover:text-blue-400 transition-colors">
                      {atlet.nama || 'Unnamed'}
                    </h3>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => toggleExpand(atlet)}
                        className="flex items-center gap-1 text-[9px] text-blue-500 font-black uppercase tracking-widest hover:underline"
                      >
                        <History size={10} />{' '}
                        {expandedId === atlet.id
                          ? 'Hide History'
                          : 'View History'}
                      </button>
                      <span className="text-[9px] text-zinc-700 font-black tracking-widest uppercase italic">
                        | {atlet.age_group}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-10 mt-6 md:mt-0">
                  <div className="flex flex-col items-end">
                    <p className="text-[8px] text-zinc-600 font-black mb-1 italic tracking-widest uppercase">
                      Set Seed
                    </p>
                    <select
                      value={atlet.seed}
                      disabled={updatingId === atlet.id}
                      onChange={(e) => handleUpdateSeed(atlet, e.target.value)}
                      className="bg-zinc-800 border border-zinc-700 text-[10px] font-bold rounded-lg px-2 py-1 outline-none focus:border-blue-600 text-blue-400"
                    >
                      {Object.keys(SEED_CONFIG).map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="text-right">
                    <p className="text-[9px] text-zinc-600 font-black mb-1 italic tracking-widest uppercase">
                      RANKING TOTAL
                    </p>
                    <p className="text-4xl font-black text-white leading-none">
                      {(atlet.display_points || 0).toLocaleString()}{' '}
                      <span className="text-blue-600 text-sm italic">PTS</span>
                    </p>
                  </div>

                  <div className="flex gap-2 bg-black/40 p-2 rounded-2xl border border-white/5">
                    <button
                      disabled={updatingId === atlet.id}
                      onClick={() =>
                        handleUpdatePoin(atlet, atlet.display_points, -100)
                      }
                      className="w-12 h-12 rounded-xl bg-zinc-800 hover:bg-red-600 text-white flex items-center justify-center disabled:opacity-20 active:scale-95 transition-all"
                    >
                      {updatingId === atlet.id ? (
                        <Loader2 className="animate-spin" size={16} />
                      ) : (
                        <Minus size={20} />
                      )}
                    </button>
                    <button
                      disabled={updatingId === atlet.id}
                      onClick={() =>
                        handleUpdatePoin(atlet, atlet.display_points, 100)
                      }
                      className="w-12 h-12 rounded-xl bg-zinc-800 hover:bg-green-600 text-white flex items-center justify-center disabled:opacity-20 active:scale-95 transition-all"
                    >
                      {updatingId === atlet.id ? (
                        <Loader2 className="animate-spin" size={16} />
                      ) : (
                        <Plus size={20} />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Detail Expansion */}
              {expandedId === atlet.id && (
                <div className="bg-zinc-950 border-x border-b border-blue-600/30 rounded-b-[2.5rem] p-6 animate-in slide-in-from-top-4 duration-300">
                  <div className="grid md:grid-cols-3 gap-4 mb-4 border-b border-zinc-800 pb-4">
                    <div className="bg-zinc-900 p-3 rounded-xl border border-white/5">
                      <p className="text-[8px] text-zinc-500 font-black uppercase tracking-widest">
                        Kategori Seed
                      </p>
                      <p className="text-lg font-bold text-blue-500">
                        {atlet.seed}
                      </p>
                    </div>
                    <div className="bg-zinc-900 p-3 rounded-xl border border-white/5">
                      <p className="text-[8px] text-zinc-500 font-black uppercase tracking-widest">
                        Base Poin ({atlet.age_group})
                      </p>
                      <p className="text-lg font-bold">
                        {atlet.raw_points.toLocaleString()} PTS
                      </p>
                    </div>
                    <div className="bg-zinc-900 p-3 rounded-xl border border-white/5">
                      <p className="text-[8px] text-emerald-500 font-black uppercase tracking-widest">
                        Added Poin (Manual)
                      </p>
                      <p className="text-lg font-bold">
                        {atlet.raw_total_points.toLocaleString()} PTS
                      </p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <p className="text-[10px] text-zinc-600 font-black uppercase">
                      Recent Activity
                    </p>
                    {histories.length > 0 ? (
                      histories.map((log) => (
                        <div
                          key={log.id}
                          className="flex items-center justify-between text-[11px] bg-zinc-900/50 p-3 rounded-xl border border-white/5"
                        >
                          <span className="text-zinc-400 font-mono">
                            {new Date(log.created_at).toLocaleString('id-ID')}
                          </span>
                          <span
                            className={`font-bold ${
                              log.perubahan > 0
                                ? 'text-green-400'
                                : 'text-red-400'
                            }`}
                          >
                            {log.perubahan > 0 ? '+' : ''}
                            {log.perubahan} PTS
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="text-center text-zinc-600 text-[10px] py-4 italic uppercase">
                        No History Found.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 mt-8 pb-10">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 text-zinc-500 hover:text-white disabled:opacity-20 transition-all"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 text-zinc-500 hover:text-white disabled:opacity-20 transition-all"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      )}

      {/* Success Toast */}
      <div
        className={`fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] transition-all duration-700 transform ${
          showSuccess
            ? 'translate-y-0 opacity-100'
            : 'translate-y-24 opacity-0 pointer-events-none'
        }`}
      >
        <div className="bg-emerald-600 px-10 py-6 rounded-full shadow-2xl flex items-center gap-4 border border-white/20">
          <CheckCircle2 size={24} className="text-white" />
          <h4 className="text-white font-black uppercase text-lg italic tracking-widest">
            SYNC SUCCESSFUL!
          </h4>
        </div>
      </div>
    </div>
  );
}