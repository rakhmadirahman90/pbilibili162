import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { 
  Wallet, FileText, Loader2, ArrowUpCircle, ArrowDownCircle, Calendar,
  ChevronLeft, ChevronRight, Search, Info, TrendingUp, TrendingDown,
  Package, Zap
} from 'lucide-react'; 
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const PB_LOGO_URL = "https://missjyvqfehamtpyodjr.supabase.co/storage/v1/object/public/assets/logo1.png";
const DAFTAR_PEMASUKAN = [
  'Iuran Bulanan Tetap (10k)',
  'Pembayaran Iuran Binaan',
  'Pembayaran Shuttlecock',
  'Pendaftaran Atlet Baru',
  'Sumbangan Sukarela'
];

interface KasEntry {
  id: string;
  tanggal_transaksi: string;
  nama_pembayar: string;
  kategori: string;
  jumlah_bayar: number;
  jumlah_bola: number;
  jenis_transaksi: 'Masuk' | 'Keluar';
}

export default function PublicKasView() {
  const [loading, setLoading] = useState(true);
  const [kasData, setKasData] = useState<KasEntry[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Filter Tanggal
  const today = new Date().toISOString().split('T')[0];
  const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
  const [startDate, setStartDate] = useState(firstDayOfMonth);
  const [endDate, setEndDate] = useState(today);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('kas_pb')
        .select('*')
        .order('tanggal_transaksi', { ascending: false });
      
      if (error) throw error;
      setKasData(data || []);
    } catch (error) {
      console.error("Error fetching kas:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // Logika Filter & Normalisasi
  const filteredData = kasData.filter(item => {
    const isMasuk = DAFTAR_PEMASUKAN.includes(item.kategori) || item.jenis_transaksi === 'Masuk';
    const matchDate = item.tanggal_transaksi >= startDate && item.tanggal_transaksi <= endDate;
    const matchSearch = item.nama_pembayar.toLowerCase().includes(searchTerm.toLowerCase()) || 
                        item.kategori.toLowerCase().includes(searchTerm.toLowerCase());
    return matchDate && matchSearch;
  }).map(item => ({
    ...item,
    jenis_transaksi: (DAFTAR_PEMASUKAN.includes(item.kategori) ? 'Masuk' : item.jenis_transaksi) as 'Masuk' | 'Keluar'
  }));

  // Stats
  const stats = filteredData.reduce((acc, curr) => {
    if (curr.jenis_transaksi === 'Masuk') acc.masuk += curr.jumlah_bayar;
    else acc.keluar += curr.jumlah_bayar;
    return acc;
  }, { masuk: 0, keluar: 0 });

  // Pagination Logic
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const currentItems = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const getTransparentImageData = (url: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous"; 
      img.src = url;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL('image/png'));
        } else reject(new Error("Gagal"));
      };
      img.onerror = (e) => reject(e);
    });
  };

  const exportToPDF = async () => {
    try {
      const doc = new jsPDF('p', 'mm', 'a4');

      // Kop Surat
      try {
        const logo = await getTransparentImageData(PB_LOGO_URL);
        doc.addImage(logo, 'PNG', 15, 12, 22, 22);
      } catch (e) {}

      doc.setFont("helvetica", "bold").setFontSize(20).setTextColor(30, 64, 175);
      doc.text('PB. BILI BILI 162', 42, 20);
      doc.setFontSize(9).setFont("helvetica", "normal").setTextColor(100);
      doc.text('Laporan Transaksi Kas Transparan - Kota Parepare', 42, 26);
      doc.text(`Periode: ${startDate} s/d ${endDate}`, 42, 31);
      doc.setDrawColor(30, 64, 175).setLineWidth(0.5).line(15, 38, 195, 38);

      // Table (Sesuai format admin export)
      autoTable(doc, {
        startY: 45,
        head: [['Tanggal', 'Nama/Keterangan', 'Ket/Bola', 'Kategori', 'Tipe', 'Nominal']],
        body: filteredData.map(item => [
          item.tanggal_transaksi,
          item.nama_pembayar.toUpperCase(),
          item.jumlah_bola > 0 ? `${item.jumlah_bola} Pcs` : '-',
          item.kategori,
          item.jenis_transaksi.toUpperCase(),
          `Rp ${item.jumlah_bayar.toLocaleString()}`
        ]),
        headStyles: { fillColor: [30, 64, 175], fontSize: 9, halign: 'center' },
        columnStyles: { 
          2: { halign: 'center' },
          4: { halign: 'center' },
          5: { halign: 'right' } 
        },
        styles: { fontSize: 8 }
      });

      // Footer Summary
      const finalY = (doc as any).lastAutoTable.finalY + 10;
      doc.setFont("helvetica", "bold").text(`Total Masuk: Rp ${stats.masuk.toLocaleString()}`, 195, finalY, { align: 'right' });
      doc.text(`Total Keluar: Rp ${stats.keluar.toLocaleString()}`, 195, finalY + 7, { align: 'right' });
      doc.setTextColor(30, 64, 175).text(`Saldo Akhir: Rp ${(stats.masuk - stats.keluar).toLocaleString()}`, 195, finalY + 14, { align: 'right' });

      doc.save(`Laporan_Kas_Publik_${startDate}.pdf`);
    } catch (e) { alert("Gagal export PDF"); }
  };

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 bg-white text-slate-900 rounded-[2.5rem] shadow-2xl border border-slate-100">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-blue-100 mb-3">
            <Zap size={12} fill="currentColor" /> Live Financial Report
          </div>
          <h2 className="text-4xl font-black text-slate-800 tracking-tighter flex items-center gap-3 italic">
            <div className="p-2 bg-blue-600 rounded-2xl text-white shadow-xl shadow-blue-200"><Wallet size={28}/></div>
            TRANSPARANSI KAS
          </h2>
          <p className="text-slate-500 mt-2 font-medium flex items-center gap-2">
            <Info size={16} className="text-blue-500" />
            Pemantauan saldo dan mutasi dana PB. Bili Bili 162 secara terbuka.
          </p>
        </div>
        
        <button 
          onClick={exportToPDF}
          className="group flex items-center gap-3 px-8 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-[11px] tracking-[0.2em] hover:bg-blue-600 transition-all shadow-2xl active:scale-95"
        >
          <FileText size={18} className="group-hover:rotate-12 transition-transform" /> UNDUH LAPORAN PDF
        </button>
      </div>

      {/* Filter Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10 bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100 shadow-inner">
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] px-1">Cari Mutasi</label>
          <div className="relative">
            <Search className="absolute left-4 top-3.5 text-slate-400" size={20}/>
            <input 
              type="text" 
              placeholder="Cari nama atau kategori..."
              className="w-full pl-12 pr-4 py-3.5 rounded-2xl border border-slate-200 focus:ring-4 focus:ring-blue-100 outline-none transition-all font-bold text-sm bg-white"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] px-1">Periode Awal</label>
          <input 
            type="date" 
            className="w-full px-5 py-3.5 rounded-2xl border border-slate-200 outline-none font-bold text-sm bg-white focus:ring-4 focus:ring-blue-100 transition-all"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] px-1">Periode Akhir</label>
          <input 
            type="date" 
            className="w-full px-5 py-3.5 rounded-2xl border border-slate-200 outline-none font-bold text-sm bg-white focus:ring-4 focus:ring-blue-100 transition-all"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <div className="bg-emerald-50 border border-emerald-100 p-8 rounded-[2rem] relative overflow-hidden group">
          <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform">
            <TrendingUp size={120} className="text-emerald-600" />
          </div>
          <p className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.3em] mb-2">Pemasukan Kas</p>
          <p className="text-3xl font-black text-emerald-700 tracking-tighter">Rp {stats.masuk.toLocaleString()}</p>
        </div>
        
        <div className="bg-rose-50 border border-rose-100 p-8 rounded-[2rem] relative overflow-hidden group">
          <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform">
            <TrendingDown size={120} className="text-rose-600" />
          </div>
          <p className="text-[10px] font-black text-rose-600 uppercase tracking-[0.3em] mb-2">Pengeluaran Kas</p>
          <p className="text-3xl font-black text-rose-700 tracking-tighter">Rp {stats.keluar.toLocaleString()}</p>
        </div>
        
        <div className="bg-blue-600 p-8 rounded-[2rem] shadow-[0_20px_50px_rgba(37,99,235,0.2)] relative overflow-hidden group">
          <div className="absolute -right-4 -bottom-4 opacity-20 group-hover:scale-110 transition-transform">
            <Wallet size={120} className="text-white" />
          </div>
          <p className="text-[10px] font-black text-blue-100 uppercase tracking-[0.3em] mb-2">Saldo Terkini</p>
          <p className="text-3xl font-black text-white tracking-tighter">Rp {(stats.masuk - stats.keluar).toLocaleString()}</p>
        </div>
      </div>

      {/* Main Table Area */}
      <div className="bg-white border border-slate-100 rounded-[2.5rem] overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900 text-white">
                <th className="p-6 text-[10px] font-black uppercase tracking-widest border-r border-white/5">Waktu</th>
                <th className="p-6 text-[10px] font-black uppercase tracking-widest border-r border-white/5">Nama / Keterangan</th>
                <th className="p-6 text-[10px] font-black uppercase tracking-widest text-center border-r border-white/5">Ket / Bola</th>
                <th className="p-6 text-[10px] font-black uppercase tracking-widest border-r border-white/5">Kategori Transaksi</th>
                <th className="p-6 text-[10px] font-black uppercase tracking-widest text-center border-r border-white/5">Tipe</th>
                <th className="p-6 text-[10px] font-black uppercase tracking-widest text-right">Nominal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-32 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <Loader2 className="animate-spin text-blue-600" size={48} />
                      <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">Menyinkronkan Database...</p>
                    </div>
                  </td>
                </tr>
              ) : currentItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-32 text-center">
                    <div className="max-w-xs mx-auto">
                      <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Search className="text-slate-300" size={32} />
                      </div>
                      <p className="text-slate-900 font-black uppercase text-xs tracking-widest">Data Kosong</p>
                      <p className="text-xs text-slate-400 mt-2">Tidak ditemukan transaksi pada filter ini.</p>
                    </div>
                  </td>
                </tr>
              ) : currentItems.map((item) => {
                const isIncome = item.jenis_transaksi === 'Masuk';
                return (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-all group">
                    <td className="p-6">
                      <div className="flex items-center gap-3 text-slate-400 text-[11px] font-black uppercase tracking-tighter">
                        <Calendar size={14} className="text-blue-500" /> 
                        {new Date(item.tanggal_transaksi).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </div>
                    </td>
                    <td className="p-6">
                      <p className="font-black text-slate-800 uppercase text-xs tracking-tight group-hover:text-blue-600 transition-colors">
                        {item.nama_pembayar}
                      </p>
                    </td>
                    {/* KOLOM KET / BOLA BARU */}
                    <td className="p-6 text-center">
                       {item.jumlah_bola > 0 ? (
                         <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-amber-50 text-amber-700 rounded-xl border border-amber-100 shadow-sm">
                            <Package size={12} className="text-amber-500" />
                            <span className="text-[10px] font-black uppercase tracking-tighter">{item.jumlah_bola} Pcs</span>
                         </div>
                       ) : (
                         <span className="text-slate-200 font-black">--</span>
                       )}
                    </td>
                    <td className="p-6">
                       <span className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-wider border border-slate-200">
                          {item.kategori}
                       </span>
                    </td>
                    <td className="p-6 text-center">
                       <div className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${isIncome ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-rose-100 text-rose-700 border border-rose-200'}`}>
                          {isIncome ? <ArrowUpCircle size={10}/> : <ArrowDownCircle size={10}/>}
                          {item.jenis_transaksi}
                       </div>
                    </td>
                    <td className={`p-6 text-right font-black text-sm tracking-tighter ${isIncome ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {isIncome ? '+' : '-'} Rp {item.jumlah_bayar.toLocaleString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Improved Pagination Section */}
        <div className="p-8 bg-slate-50 flex flex-col md:flex-row items-center justify-between gap-6 border-t border-slate-100">
           <div className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">
              Data Ke <span className="text-slate-900">{(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, filteredData.length)}</span> Dari <span className="text-slate-900">{filteredData.length}</span> Transaksi
           </div>
           <div className="flex items-center gap-3">
              <button 
                disabled={currentPage === 1}
                onClick={() => { setCurrentPage(prev => prev - 1); window.scrollTo({top: 0, behavior: 'smooth'}); }}
                className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 rounded-2xl font-black text-[10px] uppercase tracking-widest text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-100 transition-all shadow-sm"
              >
                <ChevronLeft size={16}/> Prev
              </button>
              <div className="flex gap-2">
                {[...Array(totalPages)].map((_, i) => (
                  <button 
                    key={i}
                    onClick={() => { setCurrentPage(i + 1); window.scrollTo({top: 0, behavior: 'smooth'}); }}
                    className={`w-10 h-10 rounded-xl font-black text-[11px] transition-all ${currentPage === i + 1 ? 'bg-blue-600 text-white shadow-xl shadow-blue-200' : 'bg-white text-slate-400 border border-slate-100 hover:bg-slate-200'}`}
                  >
                    {i + 1}
                  </button>
                )).slice(Math.max(0, currentPage - 3), Math.min(totalPages, currentPage + 2))}
              </div>
              <button 
                disabled={currentPage === totalPages}
                onClick={() => { setCurrentPage(prev => prev + 1); window.scrollTo({top: 0, behavior: 'smooth'}); }}
                className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 rounded-2xl font-black text-[10px] uppercase tracking-widest text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-100 transition-all shadow-sm"
              >
                Next <ChevronRight size={16}/>
              </button>
           </div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="mt-12 flex flex-col md:flex-row justify-between items-center gap-4 text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">
        <p>© 2026 PB. BILI BILI 162 • DIVISI KEUANGAN TRANSPARAN</p>
        <p className="flex items-center gap-2 italic">
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" /> 
          Verified by Supabase Engine
        </p>
      </div>
    </div>
  );
}