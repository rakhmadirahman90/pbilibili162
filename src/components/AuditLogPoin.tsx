import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabase';
import { 
  History, Shield, Clock, ArrowRight, Search, 
  Loader2, AlertCircle, RefreshCw, Filter, 
  User as UserIcon, Tag
} from 'lucide-react';

export default function AuditLogPoin() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);

  // --- Main Fetch Function ---
  const fetchLogs = async () => {
    try {
      setError(null);
      const { data, error: fetchError } = await supabase
        .from('audit_poin')
        .select('*')
        .order('waktu', { ascending: false }) // DISESUAIKAN: Kembali menggunakan 'waktu'
        .limit(100);

      if (fetchError) throw fetchError;
      if (data) setLogs(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  // --- Realtime & Initial Effect ---
  useEffect(() => {
    fetchLogs();

    const channel = supabase
      .channel('audit_realtime')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'audit_poin' }, 
        () => {
          fetchLogs(); 
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleManualRefresh = () => {
    setIsRefreshing(true);
    fetchLogs();
  };

  const filteredLogs = useMemo(() => {
    return logs.filter(log => 
      log.atlet_nama?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.admin_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.tipe_kegiatan?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm, logs]);

  return (
    <div className="p-4 md:p-8 bg-[#050505] min-h-screen text-white font-sans relative overflow-hidden">
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/5 blur-[120px] pointer-events-none" />
      
      <div className="max-w-6xl mx-auto relative z-10">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <div>
            <h1 className="text-3xl md:text-4xl font-black italic uppercase tracking-tighter flex items-center gap-3">
              <History className="text-blue-600" size={32} /> Audit <span className="text-blue-600">Log Poin</span>
            </h1>
            <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-[0.3em] mt-2 flex items-center gap-2">
              <Shield size={12} className="text-blue-900" /> Transparansi Perubahan Data Administrator
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              className="p-3 bg-zinc-900 border border-zinc-800 rounded-2xl hover:bg-zinc-800 transition-all disabled:opacity-50"
            >
              <RefreshCw size={18} className={`${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-blue-500 transition-colors" size={18} />
              <input 
                type="text"
                placeholder="Cari Atlet atau Admin..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-zinc-900/50 border border-zinc-800 rounded-2xl py-3 pl-12 pr-6 outline-none focus:border-blue-600/50 transition-all w-full md:w-64 text-sm font-bold"
              />
            </div>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-500 animate-in fade-in zoom-in duration-300">
            <AlertCircle size={20} />
            <span className="text-xs font-black uppercase tracking-widest">Error: {error}</span>
          </div>
        )}

        {/* Table Log */}
        <div className="bg-zinc-900/20 border border-zinc-800/50 rounded-[2.5rem] overflow-hidden backdrop-blur-sm shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-zinc-900/50 border-b border-zinc-800/50">
                  <th className="p-6 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Timeline</th>
                  <th className="p-6 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Verifikator</th>
                  <th className="p-6 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Target Atlet</th>
                  <th className="p-6 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Keterangan</th>
                  <th className="p-6 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 text-center">Mutasi Poin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/30">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="p-32 text-center">
                      <Loader2 className="animate-spin mx-auto text-blue-600 mb-4" size={40} />
                      <p className="text-zinc-600 text-[10px] font-black uppercase tracking-[0.2em]">Sinkronisasi Data...</p>
                    </td>
                  </tr>
                ) : filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-32 text-center">
                      <div className="opacity-20 flex flex-col items-center gap-2">
                        <Filter size={48} />
                        <p className="text-[10px] font-black uppercase tracking-[0.2em]">Tidak ada log yang sesuai</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-white/[0.02] transition-all group">
                      <td className="p-6">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-zinc-800 rounded-lg group-hover:bg-blue-600/10 transition-colors">
                            <Clock size={14} className="text-zinc-500 group-hover:text-blue-500" />
                          </div>
                          <div>
                            <p className="text-[11px] font-mono text-zinc-400">
                              {new Date(log.waktu).toLocaleDateString('id-ID')}
                            </p>
                            <p className="text-[10px] font-mono text-zinc-600">
                              {new Date(log.waktu).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="p-6">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-blue-600/20 flex items-center justify-center">
                            <Shield size={10} className="text-blue-500" />
                          </div>
                          <span className="text-xs font-bold text-zinc-300">{log.admin_email}</span>
                        </div>
                      </td>
                      <td className="p-6">
                        <div className="flex items-center gap-2">
                          <UserIcon size={12} className="text-zinc-700" />
                          <span className="text-sm font-black uppercase tracking-tight text-white">{log.atlet_nama}</span>
                        </div>
                      </td>
                      <td className="p-6">
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-zinc-800/50 border border-zinc-700/50 rounded-lg">
                          <Tag size={10} className="text-blue-500" />
                          <span className="text-[10px] font-black uppercase text-zinc-400">
                            {log.tipe_kegiatan || 'Manual Adjustment'}
                          </span>
                        </div>
                      </td>
                      <td className="p-6">
                        <div className="flex items-center justify-center gap-4">
                          <div className="text-right">
                            <p className="text-[9px] font-bold text-zinc-600 uppercase">Before</p>
                            <p className="text-xs font-mono text-zinc-400">{log.poin_sebelum}</p>
                          </div>
                          <ArrowRight size={16} className="text-zinc-800" />
                          <div className="bg-zinc-800/30 p-2 rounded-xl border border-white/[0.03] min-w-[100px] text-center">
                            <p className={`text-sm font-black ${log.perubahan > 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                              {log.poin_sesudah} 
                            </p>
                            <p className={`text-[9px] font-bold ${log.perubahan > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                              ({log.perubahan > 0 ? '+' : ''}{log.perubahan})
                            </p>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          <div className="p-6 bg-zinc-900/50 border-t border-zinc-800/50 flex justify-between items-center">
            <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">
              Menampilkan {filteredLogs.length} entri terakhir
            </p>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[9px] font-black text-emerald-500/50 uppercase tracking-widest">Live Monitoring Active</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}