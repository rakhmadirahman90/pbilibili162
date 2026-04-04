import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { 
  Calendar, Download, Filter, FileText, 
  TrendingUp, Users, Zap, Newspaper, Image as ImageIcon,
  ChevronDown, Search, Loader2, BarChart3,
  Printer, FileSpreadsheet, History, CheckCircle2,
  ArrowUpRight, ArrowDownRight, AlertCircle, X,
  Database
} from 'lucide-react';
import * as XLSX from 'xlsx';

export default function AdminLaporan() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // TAMBAHAN: State untuk filter mingguan
  const [filterType, setFilterType] = useState<'harian' | 'mingguan' | 'bulanan' | 'tahunan'>('harian');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [searchQuery, setSearchQuery] = useState('');

  const [stats, setStats] = useState({
    pendaftaran: 0,
    pertandingan: 0,
    poinTerdistribusi: 0,
    beritaBaru: 0,
    galeriBaru: 0
  });

  const [detailLogs, setDetailLogs] = useState<any[]>([]);

  useEffect(() => {
    fetchRekapData();
  }, [filterType, selectedDate]);

  const fetchRekapData = async () => {
    setLoading(true);
    setError(null);
    try {
      const date = new Date(selectedDate);
      let startDate, endDate;

      if (filterType === 'harian') {
        // PERBAIKAN: Mengambil rentang lebih luas untuk mengatasi selisih jam UTC/WIB
        const start = new Date(date);
        start.setHours(0, 0, 0, 0);
        const end = new Date(date);
        end.setHours(23, 59, 59, 999);
        startDate = start.toISOString();
        endDate = end.toISOString();
      } else if (filterType === 'mingguan') {
        // FITUR BARU: Ambil 7 hari ke belakang dari tanggal terpilih
        const start = new Date(date);
        start.setDate(date.getDate() - 7);
        startDate = start.toISOString();
        endDate = new Date(date.setHours(23,59,59)).toISOString();
      } else if (filterType === 'bulanan') {
        startDate = new Date(date.getFullYear(), date.getMonth(), 1).toISOString();
        endDate = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59).toISOString();
      } else {
        startDate = new Date(date.getFullYear(), 0, 1).toISOString();
        endDate = new Date(date.getFullYear(), 11, 31, 23, 59, 59).toISOString();
      }

      // Query dengan filter gte (Greater than or equal) dan lte (Less than or equal)
      const [reg, match, news, gallery, audit] = await Promise.all([
        supabase.from('pendaftaran').select('*', { count: 'exact', head: true }).gte('created_at', startDate).lte('created_at', endDate),
        supabase.from('pertandingan').select('*', { count: 'exact', head: true }).gte('created_at', startDate).lte('created_at', endDate),
        supabase.from('berita').select('*', { count: 'exact', head: true }).gte('created_at', startDate).lte('created_at', endDate),
        supabase.from('galeri').select('*', { count: 'exact', head: true }).gte('created_at', startDate).lte('created_at', endDate),
        supabase.from('audit_poin')
          .select('*')
          .gte('created_at', startDate)
          .lte('created_at', endDate)
          .order('created_at', { ascending: false })
      ]);

      if (audit.error) throw audit.error;

      // Logika Fallback: Jika filter waktu gagal, coba ambil data terbaru tanpa filter untuk memastikan tabel tidak kosong
      let auditData = audit.data || [];
      if (auditData.length === 0 && filterType === 'harian') {
        console.warn("Data harian kosong, mencoba fetch tanpa filter waktu...");
        const { data: fallback } = await supabase.from('audit_poin').select('*').limit(10).order('created_at', { ascending: false });
        if (fallback) auditData = fallback;
      }

      const totalPoin = auditData.reduce((acc, curr) => acc + Math.abs(curr.perubahan || 0), 0);
      
      setDetailLogs(auditData);
      setStats({
        pendaftaran: reg.count || 0,
        pertandingan: match.count || 0,
        poinTerdistribusi: totalPoin,
        beritaBaru: news.count || 0,
        galeriBaru: gallery.count || 0
      });

    } catch (err: any) {
      console.error("Fetch Error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = detailLogs.filter(log => 
    (log.atlet_nama?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
    (log.admin_email?.toLowerCase() || '').includes(searchQuery.toLowerCase())
  );

  const exportToExcel = () => {
    if (filteredLogs.length === 0) return alert("Tidak ada data");
    const ws = XLSX.utils.json_to_sheet(filteredLogs);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Laporan");
    XLSX.writeFile(wb, `Laporan_${filterType}_${selectedDate}.xlsx`);
  };

  return (
    <div className="p-6 md:p-12 bg-[#050505] min-h-screen text-white font-sans">
      
      {/* Header & Filter */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
        <div>
          <h1 className="text-4xl font-black italic uppercase tracking-tighter text-white">
            REKAPITULASI <span className="text-blue-600">SISTEM</span>
          </h1>
        </div>

        <div className="flex flex-wrap gap-3 bg-zinc-900/50 p-2 rounded-[2rem] border border-white/5 shadow-2xl">
          <select 
            value={filterType} 
            onChange={(e: any) => setFilterType(e.target.value)}
            className="bg-zinc-800 text-[10px] font-black uppercase px-4 py-2 rounded-full outline-none border border-transparent focus:border-blue-600"
          >
            <option value="harian">Harian</option>
            <option value="mingguan">Mingguan</option>
            <option value="bulanan">Bulanan</option>
            <option value="tahunan">Tahunan</option>
          </select>
          
          <input 
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-black/40 text-[10px] font-black uppercase px-4 py-2 rounded-full border border-zinc-800 outline-none"
          />

          <button onClick={exportToExcel} className="bg-emerald-600 p-2 px-4 rounded-full text-[10px] font-black uppercase flex items-center gap-2">
            <FileSpreadsheet size={14} /> Excel
          </button>
        </div>
      </div>

      {/* Stats Section */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
        <div className="bg-zinc-900/40 p-8 rounded-[2rem] border border-white/5">
            <p className="text-zinc-500 text-[9px] font-black uppercase">Poin Tersirkulasi</p>
            <h2 className="text-4xl font-black italic mt-1 text-emerald-500">{stats.poinTerdistribusi}</h2>
        </div>
        <div className="bg-zinc-900/40 p-8 rounded-[2rem] border border-white/5">
            <p className="text-zinc-500 text-[9px] font-black uppercase">Pendaftaran</p>
            <h2 className="text-4xl font-black italic mt-1 text-blue-500">{stats.pendaftaran}</h2>
        </div>
        <div className="bg-zinc-900/40 p-8 rounded-[2rem] border border-white/5">
            <p className="text-zinc-500 text-[9px] font-black uppercase">Update Konten</p>
            <h2 className="text-4xl font-black italic mt-1 text-purple-500">{stats.beritaBaru + stats.galeriBaru}</h2>
        </div>
        <div className="bg-zinc-900/40 p-8 rounded-[2rem] border border-white/5 text-center">
            <button onClick={() => window.print()} className="h-full w-full flex items-center justify-center gap-2 text-[10px] font-black uppercase bg-white text-black rounded-[1.5rem] hover:bg-zinc-200 transition-all">
               <Printer size={16} /> Cetak Laporan
            </button>
        </div>
      </div>

      {/* Log Activity Section */}
      <div className="bg-zinc-900/40 border border-white/5 rounded-[3rem] overflow-hidden">
        <div className="p-8 border-b border-white/5 flex justify-between items-center">
          <h3 className="text-[11px] font-black uppercase tracking-[0.2em] flex items-center gap-2">
            <History size={14} className="text-blue-500" /> Log Aktivitas Audit Poin
          </h3>
          
          <div className="relative w-72">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={14} />
            <input 
              type="text"
              placeholder="CARI NAMA ATLET..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-full py-2 pl-10 pr-10 text-[10px] font-black uppercase outline-none focus:border-blue-600"
            />
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-black/20 text-zinc-500 text-[9px] font-black uppercase tracking-widest">
                <th className="px-8 py-6">Waktu (WIB)</th>
                <th className="px-8 py-6">Admin</th>
                <th className="px-8 py-6">Atlet</th>
                <th className="px-8 py-6 text-right">Mutasi</th>
                <th className="px-8 py-6 text-right">Saldo Akhir</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr><td colSpan={5} className="py-20 text-center"><Loader2 className="animate-spin inline-block text-blue-600" /></td></tr>
              ) : filteredLogs.length > 0 ? (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-white/5 transition-all">
                    <td className="px-8 py-6 text-[10px] font-bold text-zinc-400">
                      {/* Mengutamakan kolom 'waktu' sesuai gambar database Anda */}
                      {log.waktu ? new Date(log.waktu).toLocaleString('id-ID') : new Date(log.created_at).toLocaleString('id-ID')}
                    </td>
                    <td className="px-8 py-6 text-[10px] font-black text-blue-500 uppercase">{log.admin_email?.split('@')[0]}</td>
                    <td className="px-8 py-6 text-[11px] font-black uppercase italic tracking-tighter">{log.atlet_nama}</td>
                    <td className={`px-8 py-6 text-right font-black ${log.perubahan > 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                      {log.perubahan > 0 ? `+${log.perubahan}` : log.perubahan}
                    </td>
                    <td className="px-8 py-6 text-right text-zinc-500 font-bold text-[10px]">{log.poin_sesudah}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-32 text-center">
                    <Database size={48} className="mx-auto mb-4 opacity-10" />
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-20">Tidak ada data ditemukan untuk periode ini</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}