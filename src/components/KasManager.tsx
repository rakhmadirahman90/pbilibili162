import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase';
import { 
  Wallet, Plus, Search, FileText, Loader2, CheckCircle2, Filter, 
  Trash2, Edit3, X, ArrowUpCircle, ArrowDownCircle, Calendar,
  ChevronLeft, ChevronRight
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

interface Atlet {
  id: string;
  player_name: string;
}

interface KasEntry {
  id: string;
  created_at: string;
  tanggal_transaksi: string;
  nama_pembayar: string;
  kategori: string;
  jumlah_bayar: number;
  jumlah_bola: number;
  tipe_anggota: string; 
  jenis_transaksi: 'Masuk' | 'Keluar';
  keterangan?: string;
}

export default function KasManager() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [kasData, setKasData] = useState<KasEntry[]>([]);
  const [atlets, setAtlets] = useState<Atlet[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState(''); 
  
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const today = new Date().toISOString().split('T')[0];
  const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
  const [startDate, setStartDate] = useState(firstDayOfMonth);
  const [endDate, setEndDate] = useState(today);

  const initialForm = {
    nama_pembayar: '',
    kategori: 'Iuran Bulanan Tetap (10k)',
    jumlah_bayar: 10000, 
    jumlah_bola: 0,
    tipe_anggota: 'Anggota Tetap',
    jenis_transaksi: 'Masuk' as 'Masuk' | 'Keluar',
    tanggal_transaksi: today,
    keterangan: ''
  };

  const [formData, setFormData] = useState(initialForm);

  const normalizedData = kasData.map(item => ({
    ...item,
    jenis_transaksi: DAFTAR_PEMASUKAN.includes(item.kategori) ? ('Masuk' as const) : item.jenis_transaksi
  }));

  const filteredData = normalizedData.filter(item => {
    const matchDate = item.tanggal_transaksi >= startDate && item.tanggal_transaksi <= endDate;
    const matchSearch = 
      item.nama_pembayar.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.kategori.toLowerCase().includes(searchTerm.toLowerCase());
    return matchDate && matchSearch;
  });

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredData.slice(indexOfFirstItem, indexOfLastItem);

  useEffect(() => {
    setCurrentPage(1);
  }, [startDate, endDate, searchTerm]);

  const stats = filteredData.reduce((acc, curr) => {
    if (curr.jenis_transaksi === 'Masuk') acc.masuk += curr.jumlah_bayar;
    else acc.keluar += curr.jumlah_bayar;
    return acc;
  }, { masuk: 0, keluar: 0 });

  const totalSaldoGlobal = normalizedData.reduce((acc, curr) => {
    return curr.jenis_transaksi === 'Masuk' ? acc + curr.jumlah_bayar : acc - curr.jumlah_bayar;
  }, 0);

  // LOGIKA BARU: Menghitung saldo akhir tepat pada tanggal 'endDate'
  // Ini mengambil semua transaksi dari awal waktu sampai tanggal akhir yang dipilih user
  const saldoAkhirKumulatif = normalizedData
    .filter(item => item.tanggal_transaksi <= endDate)
    .reduce((acc, curr) => {
      return curr.jenis_transaksi === 'Masuk' ? acc + curr.jumlah_bayar : acc - curr.jumlah_bayar;
    }, 0);

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
        } else reject(new Error("Gagal mengambil context canvas"));
      };
      img.onerror = (e) => reject(e);
    });
  };

  const exportToPDF = async () => {
    try {
      const doc = new jsPDF('p', 'mm', 'a4');
      const fullDateStr = new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      const locationDate = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

      try {
        const transparentLogo = await getTransparentImageData(PB_LOGO_URL);
        doc.addImage(transparentLogo, 'PNG', 15, 12, 25, 25);
      } catch (e) { console.error("Logo gagal dimuat", e); }

      doc.setFont("helvetica", "bold").setFontSize(22).setTextColor(30, 64, 175);
      doc.text('PB. BILI BILI 162', 45, 20);
      doc.setFont("helvetica", "normal").setFontSize(10).setTextColor(80, 80, 80);
      doc.text('Sekretariat: Jl. Andi Makkasau No.171, Ujung Lare, Kec. Soreang, Parepare 91131', 45, 26);
      doc.text('Email: pbbilibili162@gmail.com | Mobile: +62 812 902 7234', 45, 31);
      doc.setDrawColor(30, 64, 175).setLineWidth(0.8).line(15, 40, 195, 40);
      doc.setDrawColor(150, 150, 150).setLineWidth(0.2).line(15, 41.5, 195, 41.5);

      doc.setFont("helvetica", "bold").setFontSize(14).setTextColor(0);
      doc.text('LAPORAN PERTANGGUNGJAWABAN KEUANGAN KAS', 105, 52, { align: 'center' });
      doc.setFont("helvetica", "normal").setFontSize(10).setTextColor(100);
      doc.text(`Periode: ${startDate} s/d ${endDate}`, 105, 58, { align: 'center' });

      const tableRows = filteredData.map(item => [
        new Date(item.tanggal_transaksi).toLocaleDateString('id-ID'),
        item.nama_pembayar || '-',
        item.jenis_transaksi,
        item.kategori,
        item.jumlah_bola > 0 ? `${item.jumlah_bola} Pcs` : '-',
        `Rp ${item.jumlah_bayar.toLocaleString()}`
      ]);

      autoTable(doc, {
        head: [["Tanggal", "Nama", "Jenis", "Kategori", "Ket/Bola", "Nominal"]],
        body: tableRows,
        startY: 65,
        theme: 'striped',
        headStyles: { fillColor: [30, 64, 175], textColor: 255, fontSize: 9, fontStyle: 'bold', halign: 'center' },
        bodyStyles: { fontSize: 8, textColor: 50 },
        columnStyles: { 0: { halign: 'center', cellWidth: 25 }, 2: { halign: 'center', cellWidth: 20 }, 4: { halign: 'center', cellWidth: 20 }, 5: { halign: 'right', fontStyle: 'bold' } },
        didParseCell: (data) => {
            if (data.section === 'body' && data.column.index === 2) {
                if (data.cell.raw === 'Masuk') data.cell.styles.textColor = [16, 185, 129];
                if (data.cell.raw === 'Keluar') data.cell.styles.textColor = [239, 68, 68];
            }
        }
      });

      const finalY = (doc as any).lastAutoTable.finalY + 10;
      doc.setDrawColor(230, 230, 230).setFillColor(248, 250, 252).roundedRect(110, finalY, 85, 30, 2, 2, 'FD');
      doc.setFontSize(9).setFont("helvetica", "bold").setTextColor(50);
      
      doc.text(`Total Pemasukan:`, 115, finalY + 7);
      doc.setTextColor(16, 185, 129).text(`Rp ${stats.masuk.toLocaleString()}`, 190, finalY + 7, { align: 'right' });
      
      doc.setTextColor(50).text(`Total Pengeluaran:`, 115, finalY + 14);
      doc.setTextColor(239, 68, 68).text(`Rp ${stats.keluar.toLocaleString()}`, 190, finalY + 14, { align: 'right' });
      
      doc.setDrawColor(200).line(115, finalY + 18, 190, finalY + 18);
      
      // PERBAIKAN: Menggunakan Saldo Kumulatif sampai tanggal endDate
      doc.setTextColor(30, 64, 175).text(`Saldo Akhir Kas:`, 115, finalY + 24);
      doc.text(`Rp ${saldoAkhirKumulatif.toLocaleString()}`, 190, finalY + 24, { align: 'right' });

      const signY = finalY + 50;
      doc.setFontSize(10).setFont("helvetica", "normal").setTextColor(0);
      doc.text(`Parepare, ${locationDate}`, 150, signY - 8); 
      doc.setFont("helvetica", "bold").text('Mengetahui,', 15, signY);
      doc.text('Ketua PB. Bili Bili 162', 15, signY + 6);
      doc.text('H. WAWAN', 15, signY + 32);
      doc.setDrawColor(0).setLineWidth(0.3).line(15, signY + 33, 60, signY + 33);
      doc.text('Bendahara Umum,', 150, signY + 6);
      doc.text('MUH. NUR', 150, signY + 32);
      doc.line(150, signY + 33, 195, signY + 33);
      doc.setFontSize(8).setFont("helvetica", "italic").setTextColor(150);
      doc.text(`* Dokumen ini digenerate secara otomatis melalui Treasury Master System pada ${fullDateStr}`, 15, 285);
      doc.save(`LPJ_KAS_PB162_${startDate}_TO_${endDate}.pdf`);
    } catch (error) { 
      console.error(error);
      alert("Terjadi kesalahan saat mengekspor PDF."); 
    }
  };

  useEffect(() => {
    if (formData.kategori === 'Pembayaran Shuttlecock' && formData.jenis_transaksi === 'Masuk') {
      const hargaPerBola = formData.tipe_anggota === 'Anggota Tetap' ? 4000 : 5000;
      const total = (formData.jumlah_bola || 0) * hargaPerBola;
      if (formData.jumlah_bayar !== total) {
        setFormData(prev => ({ ...prev, jumlah_bayar: total }));
      }
    }
    if (DAFTAR_PEMASUKAN.includes(formData.kategori) && formData.jenis_transaksi !== 'Masuk') {
      setFormData(prev => ({ ...prev, jenis_transaksi: 'Masuk' }));
    }
  }, [formData.jumlah_bola, formData.tipe_anggota, formData.kategori, formData.jenis_transaksi]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [kasRes, pendaftaranRes] = await Promise.all([
        supabase.from('kas_pb').select('*').order('tanggal_transaksi', { ascending: false }),
        supabase.from('pendaftaran').select(`id, nama, atlet_stats (player_name)`).order('nama', { ascending: true })
      ]);
      setKasData(kasRes.data || []);
      if (pendaftaranRes.data) {
        const formattedAtlets = pendaftaranRes.data.map(item => ({
          id: item.id,
          player_name: item.nama || (Array.isArray(item.atlet_stats) ? item.atlet_stats[0]?.player_name : (item.atlet_stats as any)?.player_name) || 'Unknown'
        }));
        setAtlets(formattedAtlets);
      }
    } catch (error) { console.error(error); } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const finalData = {
      ...formData,
      jenis_transaksi: DAFTAR_PEMASUKAN.includes(formData.kategori) ? 'Masuk' : formData.jenis_transaksi
    };
    try {
      if (editingId) { 
        await supabase.from('kas_pb').update(finalData).eq('id', editingId); 
      } else { 
        await supabase.from('kas_pb').insert([finalData]); 
      }
      setEditingId(null); 
      setFormData(initialForm); 
      fetchData(); 
      alert('Data Berhasil Disimpan!');
    } catch (error: any) { alert(error.message); } finally { setSaving(false); }
  };

  const handleEdit = (item: KasEntry) => {
    setEditingId(item.id);
    setFormData({
      nama_pembayar: item.nama_pembayar, 
      kategori: item.kategori, 
      jumlah_bayar: item.jumlah_bayar,
      jumlah_bola: item.jumlah_bola || 0, 
      tipe_anggota: item.tipe_anggota || 'Anggota Tetap',
      jenis_transaksi: item.jenis_transaksi, 
      tanggal_transaksi: item.tanggal_transaksi, 
      keterangan: item.keterangan || ''
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="p-6 lg:p-10 bg-[#050505] min-h-screen text-white font-sans">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-10">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-500/20 rounded-lg"><Wallet className="text-blue-400" size={28} /></div>
            <h1 className="text-4xl font-black italic tracking-tighter uppercase text-blue-400">Treasury <span className="text-white">Master</span></h1>
          </div>
          <p className="text-slate-500 text-[10px] font-bold tracking-[0.3em] uppercase ml-1">PB. BILI BILI 162 FINANCIAL HUB</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-3 bg-white/5 border border-white/10 px-4 py-2 rounded-xl focus-within:border-blue-500/50 transition-all w-full lg:w-64">
             <Search size={16} className="text-blue-400" />
             <input 
               type="text" 
               placeholder="Cari Atlet / Kategori..." 
               className="bg-transparent text-[11px] font-bold outline-none text-white w-full placeholder:text-zinc-600"
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
             />
             {searchTerm && <X size={14} className="text-zinc-500 cursor-pointer hover:text-white" onClick={() => setSearchTerm('')} />}
          </div>

          <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-4 py-2 rounded-xl">
             <Calendar size={14} className="text-blue-400" />
             <input type="date" className="bg-transparent text-[10px] font-bold outline-none text-white w-[100px]" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
             <span className="text-slate-500">-</span>
             <input type="date" className="bg-transparent text-[10px] font-bold outline-none text-white w-[100px]" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
          <button onClick={exportToPDF} className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-xl transition-all text-xs font-black uppercase tracking-widest hover:scale-105 active:scale-95">
            <FileText size={16} /> Export PDF
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
        <div className="bg-emerald-500/10 border border-emerald-500/20 p-6 rounded-[2rem]">
          <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500 mb-2 flex items-center gap-2"><ArrowUpCircle size={14}/> Total Masuk (Filtered)</p>
          <h2 className="text-2xl font-black italic text-emerald-400">Rp {stats.masuk.toLocaleString()}</h2>
        </div>
        <div className="bg-red-500/10 border border-red-500/20 p-6 rounded-[2rem]">
          <p className="text-[10px] font-black uppercase tracking-widest text-red-500 mb-2 flex items-center gap-2"><ArrowDownCircle size={14}/> Total Keluar (Filtered)</p>
          <h2 className="text-2xl font-black italic text-red-400">Rp {stats.keluar.toLocaleString()}</h2>
        </div>
        <div className="bg-blue-500/10 border border-blue-500/20 p-6 rounded-[2rem]">
          <p className="text-[10px] font-black uppercase tracking-widest text-blue-500 mb-2 flex items-center gap-2"><Wallet size={14}/> Saldo Kas Global</p>
          <h2 className="text-2xl font-black italic text-white">Rp {totalSaldoGlobal.toLocaleString()}</h2>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4">
          <div className="bg-white/[0.03] border border-white/5 p-8 rounded-[2.5rem] sticky top-10">
            <h3 className="text-blue-400 font-black italic uppercase tracking-tighter text-xl mb-6 flex items-center gap-2">
              {editingId ? <Edit3 size={20} /> : <Plus size={20} />} {editingId ? 'Edit Record' : 'Add Entry'}
            </h3>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="flex bg-black p-1 rounded-xl border border-white/10">
                <button type="button" onClick={() => setFormData({...formData, jenis_transaksi: 'Masuk'})} className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${formData.jenis_transaksi === 'Masuk' ? 'bg-emerald-600 text-white' : 'text-slate-500'}`}>Pemasukan</button>
                <button type="button" onClick={() => setFormData({...formData, jenis_transaksi: 'Keluar', kategori: 'Biaya Operasional'})} className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${formData.jenis_transaksi === 'Keluar' ? 'bg-red-600 text-white' : 'text-slate-500'}`}>Pengeluaran</button>
              </div>
              
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Kategori</label>
                {formData.jenis_transaksi === 'Masuk' ? (
                  <select className="w-full bg-black border border-white/10 rounded-xl p-4 text-sm outline-none" value={formData.kategori} 
                    onChange={(e) => {
                      let nominal = 10000;
                      if (e.target.value === 'Pendaftaran Atlet Baru') nominal = 50000;
                      if (e.target.value === 'Pembayaran Iuran Binaan') nominal = 25000;
                      setFormData({...formData, kategori: e.target.value, jumlah_bayar: nominal});
                    }}>
                    {DAFTAR_PEMASUKAN.map(kat => <option key={kat} value={kat}>{kat}</option>)}
                  </select>
                ) : (
                  <input type="text" className="w-full bg-black border border-white/10 rounded-xl p-4 text-sm outline-none" placeholder="Detail Pengeluaran" value={formData.kategori} onChange={(e) => setFormData({...formData, kategori: e.target.value})} />
                )}
              </div>

              {formData.kategori === 'Pembayaran Shuttlecock' && formData.jenis_transaksi === 'Masuk' && (
                <div className="grid grid-cols-2 gap-4 animate-in fade-in duration-300">
                  <div>
                    <label className="text-[9px] font-bold text-slate-500 uppercase mb-1 block">Tipe Member</label>
                    <select className="w-full bg-black border border-white/10 rounded-xl p-4 text-xs" value={formData.tipe_anggota} onChange={(e) => setFormData({...formData, tipe_anggota: e.target.value})}>
                      <option value="Anggota Tetap">Tetap (4k)</option>
                      <option value="Anggota Tidak Tetap">Tidak Tetap (5k)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-slate-500 uppercase mb-1 block">Jml Bola</label>
                    <input type="number" className="w-full bg-black border border-white/10 rounded-xl p-4 text-xs font-bold text-emerald-400" placeholder="0" value={formData.jumlah_bola || ''} onChange={(e) => setFormData({...formData, jumlah_bola: parseInt(e.target.value) || 0})} />
                  </div>
                </div>
              )}

              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Tanggal</label>
                <input type="date" required className="w-full bg-black border border-white/10 rounded-xl p-4 text-sm outline-none" value={formData.tanggal_transaksi} onChange={(e) => setFormData({...formData, tanggal_transaksi: e.target.value})} />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Nama / Keterangan</label>
                {formData.jenis_transaksi === 'Masuk' ? (
                  <select required className="w-full bg-black border border-white/10 rounded-xl p-4 text-sm outline-none" value={formData.nama_pembayar} onChange={(e) => setFormData({...formData, nama_pembayar: e.target.value})}>
                    <option value="">Pilih Atlet...</option>
                    {atlets.map(a => <option key={a.id} value={a.player_name}>{a.player_name}</option>)}
                  </select>
                ) : (
                  <input type="text" required className="w-full bg-black border border-white/10 rounded-xl p-4 text-sm outline-none" placeholder="Nama Penerima" value={formData.nama_pembayar} onChange={(e) => setFormData({...formData, nama_pembayar: e.target.value})} />
                )}
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Nominal (Rp)</label>
                <input type="number" className="w-full bg-black border border-white/10 rounded-xl p-4 text-sm outline-none font-bold text-blue-400" value={formData.jumlah_bayar} onChange={(e) => setFormData({...formData, jumlah_bayar: parseInt(e.target.value) || 0})} />
              </div>

              <div className="flex gap-2">
                {editingId && <button type="button" onClick={() => { setEditingId(null); setFormData(initialForm); }} className="flex-1 bg-white/10 text-white font-black uppercase text-xs py-5 rounded-2xl">Cancel</button>}
                <button type="submit" disabled={saving} className={`flex-[2] ${formData.jenis_transaksi === 'Masuk' ? 'bg-blue-600' : 'bg-red-600'} text-white font-black uppercase text-xs py-5 rounded-2xl flex items-center justify-center gap-2`}>
                  {saving ? <Loader2 className="animate-spin" size={18} /> : (editingId ? 'Update Record' : 'Submit Entry')}
                </button>
              </div>
            </form>
          </div>
        </div>

        <div className="lg:col-span-8">
          <div className="bg-white/[0.02] border border-white/5 rounded-[2.5rem] overflow-hidden flex flex-col h-full">
            <div className="p-6 border-b border-white/5 flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-[0.3em] text-slate-500">Transaction_Ledger.log</h3>
              <div className="flex items-center gap-2">
                 <span className="text-[10px] text-zinc-600 font-bold uppercase italic">Page {currentPage} of {totalPages || 1}</span>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[10px] font-black uppercase tracking-widest text-slate-500 border-b border-white/5">
                    <th className="p-6">Date & Name</th>
                    <th className="p-6">Category</th>
                    <th className="p-6 text-right">Amount</th>
                    <th className="p-6 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {loading ? (
                    <tr><td colSpan={4} className="p-20 text-center"><Loader2 className="animate-spin mx-auto text-blue-500" /></td></tr>
                  ) : currentItems.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-20 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <Search size={40} className="text-zinc-800" />
                          <p className="text-slate-500 text-xs uppercase tracking-widest font-bold">
                            {searchTerm ? `Tidak ditemukan hasil untuk "${searchTerm}"` : 'Belum Ada Data'}
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : currentItems.map((item) => {
                    const isMasuk = item.jenis_transaksi === 'Masuk';
                    return (
                      <tr key={item.id} className="hover:bg-white/[0.02] transition-colors group">
                        <td className="p-6">
                          <p className="font-bold text-sm text-white group-hover:text-blue-400 uppercase truncate max-w-[120px] md:max-w-none">{item.nama_pembayar}</p>
                          <p className="text-[9px] text-slate-500 uppercase flex items-center gap-1"><Calendar size={10}/> {item.tanggal_transaksi}</p>
                        </td>
                        <td className="p-6">
                          <span className={`px-2 py-1 rounded-full text-[8px] md:text-[9px] font-black uppercase border ${isMasuk ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'}`}>
                            {item.kategori}
                          </span>
                        </td>
                        <td className={`p-6 text-right font-black italic text-base md:text-lg ${isMasuk ? 'text-emerald-400' : 'text-red-400'}`}>
                          {isMasuk ? '+' : '-'} Rp {item.jumlah_bayar.toLocaleString()}
                        </td>
                        <td className="p-6">
                          <div className="flex justify-center gap-1 md:gap-2">
                            <button onClick={() => handleEdit(item)} className="p-2 bg-blue-500/10 text-blue-400 rounded-lg hover:bg-blue-500 hover:text-white transition-all"><Edit3 size={14}/></button>
                            <button onClick={async () => { if(confirm("Hapus data ini?")) { await supabase.from('kas_pb').delete().eq('id', item.id); fetchData(); } }} className="p-2 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500 hover:text-white transition-all"><Trash2 size={14}/></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="p-6 border-t border-white/5 flex items-center justify-between bg-black/20">
                <button 
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => prev - 1)}
                  className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-xl text-[10px] font-black uppercase tracking-widest disabled:opacity-20 hover:bg-white/10 transition-all"
                >
                  <ChevronLeft size={14} /> Prev
                </button>
                <div className="flex gap-1 overflow-x-auto max-w-[150px] md:max-w-none no-scrollbar">
                   {Array.from({ length: totalPages }, (_, i) => (
                     <button 
                        key={i + 1}
                        onClick={() => setCurrentPage(i + 1)}
                        className={`min-w-[32px] h-8 rounded-lg text-[10px] font-bold transition-all ${currentPage === i + 1 ? 'bg-blue-600 text-white' : 'bg-white/5 text-slate-500 hover:bg-white/10'}`}
                     >
                       {i + 1}
                     </button>
                   ))}
                </div>
                <button 
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(prev => prev + 1)}
                  className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-xl text-[10px] font-black uppercase tracking-widest disabled:opacity-20 hover:bg-white/10 transition-all"
                >
                  Next <ChevronRight size={14} />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}