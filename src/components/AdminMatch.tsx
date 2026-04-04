import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from "../supabase";
import { 
  Trophy, User, Activity, CheckCircle2, 
  Plus, Loader2, Trash2, Send, Clock, AlertCircle, Sparkles, RefreshCcw, Search, X, RotateCcw,
  ShieldCheck, ArrowRightLeft, ChevronDown, Database
} from 'lucide-react';

const AdminMatch: React.FC = () => {
  const [players, setPlayers] = useState<any[]>([]);
  const [recentMatches, setRecentMatches] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRecalculating, setIsRecalculating] = useState(false); 
  
  const [showSuccess, setShowSuccess] = useState(false);
  const [showRollbackSuccess, setShowRollbackSuccess] = useState(false); 
  const [searchTerm, setSearchTerm] = useState('');

  const [selectedPlayer, setSelectedPlayer] = useState('');
  const [kategori, setKategori] = useState('Harian');
  const [hasil, setHasil] = useState('Menang');

  const POINT_MAP: Record<string, Record<string, number>> = {
    'Harian': { 'Menang': 20, 'Seri': 10, 'Kalah': 5 },
    'Sparing': { 'Menang': 100, 'Seri': 50, 'Kalah': 25 },
    'Internal': { 'Menang': 300, 'Seri': 0, 'Kalah': 50 },
    'Eksternal': { 'Menang': 500, 'Seri': 0, 'Kalah': 100 },
  };

  const CATEGORIES = [
    { id: 'Harian', label: 'Latihan Harian', points: '20/10/5' },
    { id: 'Sparing', label: 'Sparing Partner', points: '100/50/25' },
    { id: 'Internal', label: 'Turnamen Internal', points: '300/--/50' },
    { id: 'Eksternal', label: 'Turnamen Eksternal', points: '500/--/100' },
  ];

  // --- PERBAIKAN 1: Fetch Data dengan Range Pasti & Tanpa Cache ---
  const fetchPlayers = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error, count } = await supabase
        .from('atlet_stats')
        .select(`
          pendaftaran_id,
          player_name,
          points,
          total_points,
          seed,
          pendaftaran ( kategori )
        `, { count: 'exact' }) // Meminta count asli dari DB
        .order('player_name', { ascending: true })
        .range(0, 999); // Memastikan mengambil hingga 1000 baris jika ada
      
      if (error) throw error;
      
      if (data) {
        const formattedPlayers = data.map(item => {
          const basePoints = item.points || 0;
          const additionalPoints = item.total_points || 0;
          return {
            id: item.pendaftaran_id,
            nama: item.player_name || 'Tanpa Nama',
            total_points: basePoints + additionalPoints,
            kategori: (item.pendaftaran as any)?.kategori || item.seed || 'Umum'
          };
        });
        setPlayers(formattedPlayers);
        // Console log untuk debugging jika jumlah masih tidak sesuai
        console.log("Fetched Players Count:", formattedPlayers.length, "DB Count:", count);
      }
    } catch (err: any) {
      console.error("Gagal mengambil data ranking:", err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchRecentMatches = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('pertandingan')
        .select(`
          id, 
          pendaftaran_id, 
          kategori_kegiatan, 
          hasil, 
          created_at, 
          pendaftaran ( nama )
        `)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      if (data) setRecentMatches(data);
    } catch (err: any) {
      console.error("Error fetching history:", err.message);
    }
  }, []);

  useEffect(() => {
    fetchPlayers();
    fetchRecentMatches();

    const channel = supabase
      .channel('admin_full_sync')
      .on('postgres_changes', { event: '*', table: 'pertandingan', schema: 'public' }, () => {
          fetchRecentMatches();
          fetchPlayers(); 
      })
      .on('postgres_changes', { event: '*', table: 'atlet_stats', schema: 'public' }, () => {
          fetchPlayers(); 
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchPlayers, fetchRecentMatches]);

  // --- PERBAIKAN 2: Recalculate dengan Refresh State Total ---
  const recalculateAllPoints = async () => {
    if (!window.confirm("Hitung ulang seluruh poin berdasarkan riwayat untuk SEMUA atlet?")) return;
    setIsRecalculating(true);
    try {
      const { data: allMatches } = await supabase.from('pertandingan').select('*');
      const { data: allStats, error: statsErr } = await supabase.from('atlet_stats').select('pendaftaran_id');
      if (statsErr) throw statsErr;

      const updatePromises = allStats.map(async (atlet) => {
        const matchPoints = (allMatches || [])
          .filter(m => m.pendaftaran_id === atlet.pendaftaran_id)
          .reduce((sum, m) => sum + (POINT_MAP[m.kategori_kegiatan]?.[m.hasil] || 0), 0);

        return supabase
          .from('atlet_stats')
          .update({ total_points: matchPoints })
          .eq('pendaftaran_id', atlet.pendaftaran_id);
      });

      await Promise.all(updatePromises);
      
      // Force refresh data ke state
      await fetchPlayers();
      alert(`Database ${allStats.length} Atlet Berhasil Disinkronkan!`);
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setIsRecalculating(false);
    }
  };

  const createAuditLog = async (atletId: string, atletNama: string, perubahan: number, sebelum: number, sesudah: number, kat: string, res: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from('audit_poin').insert([{
        atlet_id: atletId,
        atlet_nama: atletNama,
        perubahan: perubahan,
        poin_sebelum: sebelum,
        poin_sesudah: sesudah,
        admin_email: user?.email || 'System Admin',
        tipe_kegiatan: res === "Rollback" ? `Batal: ${kat}` : `${kat} (${res})`,
        created_at: new Date().toISOString()
      }]);
    } catch (err) { console.error(err); }
  };

  const syncPlayerPerformance = async (playerId: string, pointsToAdd: number, currentKategori: string, currentHasil: string) => {
    try {
      const { data: stats } = await supabase
        .from('atlet_stats')
        .select('total_points, points, player_name')
        .eq('pendaftaran_id', playerId)
        .maybeSingle();

      if (!stats) throw new Error("Data atlet tidak ditemukan di tabel stats.");

      const existingTotalPoints = stats.total_points || 0;
      const basePoints = stats.points || 0;
      const newTotalPoints = Math.max(0, existingTotalPoints + pointsToAdd);
      
      const { error: updateError } = await supabase
        .from('atlet_stats')
        .update({
          total_points: newTotalPoints,
          last_match_at: new Date().toISOString()
        })
        .eq('pendaftaran_id', playerId);

      if (updateError) throw updateError;

      await createAuditLog(playerId, stats.player_name, pointsToAdd, (basePoints + existingTotalPoints), (basePoints + newTotalPoints), currentKategori, currentHasil);
      return true;
    } catch (err: any) {
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlayer || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const pointsToAdd = POINT_MAP[kategori][hasil] || 0;
      const { error: matchErr } = await supabase
        .from('pertandingan')
        .insert([{ pendaftaran_id: selectedPlayer, kategori_kegiatan: kategori, hasil: hasil }]);

      if (matchErr) throw matchErr;

      const success = await syncPlayerPerformance(selectedPlayer, pointsToAdd, kategori, hasil);

      if (success) {
        setShowSuccess(true);
        setSelectedPlayer('');
        setSearchTerm('');
        await Promise.all([fetchRecentMatches(), fetchPlayers()]);
        setTimeout(() => setShowSuccess(false), 3000);
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteMatch = async (id: string) => {
    const matchToDelete = recentMatches.find(m => m.id === id);
    if (!matchToDelete) return;
    const pointsToSubtract = -(POINT_MAP[matchToDelete.kategori_kegiatan][matchToDelete.hasil] || 0);
    if (!window.confirm(`Rollback poin untuk ${matchToDelete.pendaftaran?.nama}?`)) return;
    
    setIsLoading(true);
    try {
      await syncPlayerPerformance(matchToDelete.pendaftaran_id, pointsToSubtract, matchToDelete.kategori_kegiatan, "Rollback");
      await supabase.from('pertandingan').delete().eq('id', id);
      setShowRollbackSuccess(true);
      await Promise.all([fetchRecentMatches(), fetchPlayers()]);
      setTimeout(() => setShowRollbackSuccess(false), 3000);
    } catch (err: any) { alert(err.message); } finally { setIsLoading(false); }
  };

  const filteredPlayers = players.filter(p => 
    p.nama.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#050505] text-white p-6 md:p-12 font-sans relative overflow-hidden">
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/10 blur-[120px] rounded-full -z-10" />
      
      <div className="max-w-5xl mx-auto relative z-10">
        <div className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
               <div className="p-2 bg-blue-600/20 rounded-lg">
                  <Sparkles size={20} className="text-blue-500" />
               </div>
               <p className="text-zinc-500 text-[10px] font-black tracking-[0.3em] uppercase">PB US 162 Admin Engine</p>
            </div>
            <h1 className="text-4xl md:text-5xl font-black italic tracking-tighter uppercase leading-none">
              MANAGE <span className="text-blue-600">POINTS</span>
            </h1>
          </div>
          
          <div className="flex gap-3">
             <div className="flex flex-col items-end mr-4">
                <span className="text-[9px] text-zinc-500 font-black uppercase tracking-widest">Total Database</span>
                {/* Menampilkan jumlah real-time dari state players */}
                <span className="text-xl font-black italic text-white">{players.length} <span className="text-[10px] text-blue-500">ATLET</span></span>
             </div>
             <button onClick={recalculateAllPoints} disabled={isRecalculating}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-900/30 border border-emerald-500/30 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-800/50 transition-all text-emerald-400">
                {isRecalculating ? <Loader2 size={14} className="animate-spin" /> : <Database size={14} />} 
                Recalculate
             </button>
             <button onClick={() => { fetchPlayers(); fetchRecentMatches(); }} 
                className="flex items-center gap-2 px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-zinc-800 transition-all active:scale-95 disabled:opacity-50"
                disabled={isLoading}>
                <RefreshCcw size={14} className={isLoading ? 'animate-spin' : ''} /> Sync
             </button>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <div className="md:col-span-2 space-y-8">
            <div className="bg-zinc-900/50 backdrop-blur-xl border border-white/10 p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden">
              <form onSubmit={handleSubmit} className="relative z-10 space-y-6">
                <div className="flex items-center gap-4 p-4 bg-blue-600/5 border border-blue-500/10 rounded-2xl">
                    <ShieldCheck className="text-blue-500" size={24} />
                    <div>
                        <p className="text-[9px] font-black text-blue-500 uppercase tracking-widest">Database Integrity Verified</p>
                        <p className="text-[10px] text-zinc-500 font-bold leading-tight">Menampilkan {players.length} atlet terdaftar dari database.</p>
                    </div>
                </div>

                <div className="space-y-3">
                  <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
                    <User size={14} /> Pilih Atlet ({players.length} Terdeteksi)
                  </label>
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" size={16} />
                    <input 
                      type="text" 
                      placeholder="Cari nama atlet..." 
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full bg-black/40 border border-zinc-800 rounded-2xl py-3 pl-12 pr-5 focus:border-blue-600 outline-none transition-all text-xs font-bold text-white placeholder:text-zinc-700"
                    />
                  </div>
                  <div className="relative">
                    <select 
                      value={selectedPlayer}
                      onChange={(e) => setSelectedPlayer(e.target.value)}
                      required
                      className="w-full bg-black/60 border border-zinc-800 rounded-2xl py-4 px-5 focus:border-blue-600 outline-none transition-all text-sm font-bold appearance-none cursor-pointer hover:border-zinc-700 text-white"
                    >
                      <option value="">-- {searchTerm ? `Hasil: ${filteredPlayers.length} Atlet` : 'Pilih Atlet'} --</option>
                      {filteredPlayers.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.nama} — {p.total_points.toLocaleString()} PTS ({p.kategori})
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 text-zinc-600 pointer-events-none" size={18} />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
                      <Activity size={14} /> Jenis Kegiatan
                    </label>
                    <select value={kategori} onChange={(e) => setKategori(e.target.value)}
                      className="w-full bg-black/60 border border-zinc-800 rounded-2xl py-4 px-5 focus:border-blue-600 outline-none transition-all text-sm font-bold text-white">
                      {CATEGORIES.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-3">
                    <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
                      <Trophy size={14} /> Hasil Akhir
                    </label>
                    <select value={hasil} onChange={(e) => setHasil(e.target.value)}
                      className="w-full bg-black/60 border border-zinc-800 rounded-2xl py-4 px-5 focus:border-blue-600 outline-none transition-all text-sm font-bold text-white">
                      <option value="Menang">MENANG</option>
                      <option value="Seri">SERI</option>
                      <option value="Kalah">KALAH</option>
                    </select>
                  </div>
                </div>

                <div className="p-5 bg-blue-600/5 border border-blue-600/20 rounded-2xl flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">Tambahan Poin:</span>
                    <span className="text-2xl font-black italic text-blue-500 drop-shadow-[0_0_10px_rgba(59,130,246,0.3)]">
                        +{POINT_MAP[kategori][hasil]} <span className="text-xs not-italic text-zinc-600">PTS</span>
                    </span>
                </div>

                <button type="submit" disabled={isSubmitting || !selectedPlayer}
                  className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-800 text-white font-black uppercase tracking-[0.2em] py-5 rounded-2xl flex items-center justify-center gap-3 transition-all active:scale-[0.98]">
                  {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
                  SINKRONISASI POIN
                </button>
              </form>
            </div>

            <div className="bg-zinc-900/30 border border-white/5 p-8 rounded-[2.5rem]">
              <h3 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 mb-6">
                <Clock size={14} /> Activity Log
              </h3>
              <div className="space-y-4">
                {recentMatches.map((match: any) => (
                  <div key={match.id} className="flex items-center justify-between bg-zinc-950/50 p-5 rounded-3xl border border-white/5 group hover:bg-black/60 transition-all">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-xs ${match.hasil === 'Menang' ? 'text-emerald-500 bg-emerald-500/10' : 'text-red-500 bg-red-500/10'}`}>
                        {match.hasil[0]}
                      </div>
                      <div>
                        <p className="text-sm font-black text-white uppercase italic">{match.pendaftaran?.nama}</p>
                        <p className="text-[9px] text-zinc-500 font-bold uppercase">{match.kategori_kegiatan} • {match.hasil}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-blue-500 font-black italic text-xs">+{POINT_MAP[match.kategori_kegiatan]?.[match.hasil]} PTS</span>
                      <button onClick={() => deleteMatch(match.id)} className="p-2 text-zinc-700 hover:text-red-500 transition-colors">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-zinc-900 border border-white/10 p-8 rounded-[2.5rem]">
              <h3 className="text-[10px] font-black uppercase text-blue-500 mb-6 flex items-center gap-2">
                <Activity size={14} /> Matrix Config
              </h3>
              <div className="space-y-4">
                {CATEGORIES.map(cat => (
                  <div key={cat.id} className="flex justify-between items-center border-b border-white/5 pb-2">
                    <span className="text-[10px] text-zinc-400 font-bold uppercase">{cat.label}</span>
                    <span className="text-[10px] font-mono text-white bg-white/5 px-2 py-1 rounded">{cat.points}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className={`fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] transition-all duration-700 ${showSuccess ? 'translate-y-0 opacity-100' : 'translate-y-24 opacity-0 pointer-events-none'}`}>
        <div className="bg-zinc-950 border border-emerald-500/50 px-10 py-6 rounded-[3rem] flex items-center gap-6 shadow-2xl">
          <div className="bg-emerald-600 p-3 rounded-xl"><CheckCircle2 size={24} className="text-white" /></div>
          <div>
            <h4 className="text-white font-black uppercase text-lg leading-none">Berhasil!</h4>
            <p className="text-emerald-500 text-[10px] font-black uppercase tracking-widest">Poin Atlet Terupdate</p>
          </div>
        </div>
      </div>

      {showRollbackSuccess && (
          <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/80 backdrop-blur-sm">
             <div className="bg-zinc-900 border border-red-500/30 p-12 rounded-[3.5rem] flex flex-col items-center gap-6">
                <RotateCcw size={60} className="text-red-500 animate-spin-slow" />
                <h2 className="text-white text-3xl font-black italic uppercase">Rollback Sukses</h2>
             </div>
          </div>
      )}

      <style>{`
        .animate-spin-slow { animation: spin 3s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(-360deg); } }
      `}</style>
    </div>
  );
};

export default AdminMatch;