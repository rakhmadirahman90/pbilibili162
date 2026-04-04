import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { 
  Wallet, FileText, Loader2, ArrowUpCircle, ArrowDownCircle, Calendar,
  ChevronLeft, ChevronRight, Search
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
    const type = isMasuk ? 'Masuk' : 'Keluar';
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
      const locationDate = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

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

      // Table
      autoTable(doc, {
        startY: 45,
        head: [['Tanggal', 'Nama/Keterangan', 'Kategori', 'Jenis', 'Nominal']],
        body: filteredData.map(item => [
          item.tanggal_transaksi,
          item.nama_pembayar,
          item.kategori,
          item.jenis_transaksi,
          `Rp ${item.jumlah_bayar.toLocaleString()}`
        ]),
        headStyles: { fillColor: [30, 64, 175] },
        columnStyles: { 4: { halign: 'right' } }
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
    <div className="max-w-7xl mx-auto p-4 md:p-8 bg-white text-slate-900 rounded-3xl shadow-xl border border-slate-100">
      {/* Header Landing Page */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-lg text-white"><Wallet size={24}/></div>
            TRANSPARANSI KAS
          </h2>
          <p className="text-slate-500 mt-1 font-medium">Laporan keuangan real-time PB. Bili Bili 162</p>
        </div>
        
        <button 
          onClick={exportToPDF}
          className="flex items-center gap-2 px-5 py-3 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
        >
          <FileText size={18}/> Unduh Laporan (.PDF)
        </button>
      </div>

      {/* Filter Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 bg-slate-50 p-6 rounded-2xl border border-slate-100">
        <div>
          <label className="text-[10px] font-bold uppercase text-slate-400 mb-2 block">Cari Transaksi</label>
          <div className="relative">
            <Search className="absolute left-3 top-3 text-slate-400" size={18}/>
            <input 
              type="text" 
              placeholder="Nama atau kategori..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <div>
          <label className="text-[10px] font-bold uppercase text-slate-400 mb-2 block">Mulai Tanggal</label>
          <input 
            type="date" 
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>
        <div>
          <label className="text-[10px] font-bold uppercase text-slate-400 mb-2 block">Sampai Tanggal</label>
          <input 
            type="date" 
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
      </div>

      {/* Stats Summary Area */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-emerald-50 border-l-4 border-emerald-500 p-5 rounded-r-2xl">
          <p className="text-xs font-bold text-emerald-600 uppercase flex items-center gap-2"><ArrowUpCircle size={14}/> Pemasukan</p>
          <p className="text-2xl font-black text-emerald-700 mt-1">Rp {stats.masuk.toLocaleString()}</p>
        </div>
        <div className="bg-red-50 border-l-4 border-red-500 p-5 rounded-r-2xl">
          <p className="text-xs font-bold text-red-600 uppercase flex items-center gap-2"><ArrowDownCircle size={14}/> Pengeluaran</p>
          <p className="text-2xl font-black text-red-700 mt-1">Rp {stats.keluar.toLocaleString()}</p>
        </div>
        <div className="bg-blue-600 p-5 rounded-2xl shadow-lg shadow-blue-100">
          <p className="text-xs font-bold text-blue-100 uppercase">Saldo Periode Ini</p>
          <p className="text-2xl font-black text-white mt-1">Rp {(stats.masuk - stats.keluar).toLocaleString()}</p>
        </div>
      </div>

      {/* Table Area */}
      <div className="border border-slate-100 rounded-3xl overflow-hidden shadow-sm">
        <table className="w-full text-left">
          <thead className="bg-slate-800 text-white">
            <tr className="text-[11px] uppercase tracking-widest">
              <th className="p-5">Waktu</th>
              <th className="p-5">Keterangan</th>
              <th className="p-5">Kategori</th>
              <th className="p-5 text-right">Nominal</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={4} className="p-20 text-center"><Loader2 className="animate-spin mx-auto text-blue-600" /></td></tr>
            ) : currentItems.length === 0 ? (
              <tr><td colSpan={4} className="p-20 text-center text-slate-400 font-medium">Data tidak ditemukan pada periode ini.</td></tr>
            ) : currentItems.map((item) => (
              <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                <td className="p-5">
                  <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase">
                    <Calendar size={12}/> {item.tanggal_transaksi}
                  </div>
                </td>
                <td className="p-5">
                  <p className="font-bold text-slate-800 uppercase text-sm">{item.nama_pembayar}</p>
                </td>
                <td className="p-5">
                   <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${item.jenis_transaksi === 'Masuk' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                      {item.kategori}
                   </span>
                </td>
                <td className={`p-5 text-right font-black ${item.jenis_transaksi === 'Masuk' ? 'text-emerald-600' : 'text-red-600'}`}>
                  {item.jenis_transaksi === 'Masuk' ? '+' : '-'} Rp {item.jumlah_bayar.toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Public Pagination */}
        <div className="p-5 bg-slate-50 flex items-center justify-between">
           <p className="text-xs text-slate-400 font-bold">Menampilkan {currentItems.length} data</p>
           <div className="flex gap-2">
              <button 
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => prev - 1)}
                className="p-2 bg-white border border-slate-200 rounded-lg disabled:opacity-30"
              ><ChevronLeft size={18}/></button>
              <button 
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => prev + 1)}
                className="p-2 bg-white border border-slate-200 rounded-lg disabled:opacity-30"
              ><ChevronRight size={18}/></button>
           </div>
        </div>
      </div>
    </div>
  );
}