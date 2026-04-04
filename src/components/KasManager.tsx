import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase';
import { 
  Wallet, Plus, Search, FileText, Loader2, CheckCircle2, Filter, 
  Trash2, Edit3, X, ArrowUpCircle, ArrowDownCircle, Calendar,
  ChevronLeft, ChevronRight
} from 'lucide-react'; 
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// URL Logo PB BILI BILI 162
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
  
  // Pagination State
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
    return item.tanggal_transaksi >= startDate && item.tanggal_transaksi <= endDate;
  });

  // Logika Pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredData.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);

  const stats = filteredData.reduce((acc, curr) => {
    if (curr.jenis_transaksi === 'Masuk') acc.masuk += curr.jumlah_bayar;
    else acc.keluar += curr.jumlah_bayar;
    return acc;
  }, { masuk: 0, keluar: 0 });

  const totalSaldoGlobal = normalizedData.reduce((acc, curr) => {
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
        } else reject(new Error("Gagal"));
      };
      img.onerror = (e) => reject(e);
    });
  };

  const exportToPDF = async () => {
    try {
      const doc = new jsPDF();
      const fullDateStr = new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      const locationDate = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

      try {
        const transparentLogo = await getTransparentImageData(PB_LOGO_URL);
        doc.addImage(transparentLogo, 'PNG', 14, 10, 22, 22, undefined, 'FAST');
      } catch (e) { console.error("Logo error", e); }

      doc.setFontSize(20).setFont("helvetica", "bold").setTextColor(30, 64, 175).text('PB. BILI BILI 162', 42, 18);
      doc.setFontSize(9).setFont("helvetica", "normal").setTextColor(100).text('Jl. Bili-Bili No. 162, Parepare, Sulawesi Selatan', 42, 24);
      doc.text(`Periode Laporan: ${startDate} s/d ${endDate}`, 42, 29);
      doc.setDrawColor(30, 64, 175).setLineWidth(0.8).line(14, 38, 196, 38);

      doc.setFontSize(14).setFont("helvetica", "bold").setTextColor(0).text('LAPORAN PERTANGGUNGJAWABAN KAS', 14, 48);
      doc.setFontSize(9).setFont("helvetica", "italic").setTextColor(100).text(`Dicetak pada: ${fullDateStr}`, 14, 53);

      const tableRows = filteredData.map((item, index) => [
        index + 1,
        new Date(item.tanggal_transaksi).toLocaleDateString('id-ID'),
        item.nama_pembayar || '-',
        item.jenis_transaksi === 'Masuk' ? 'MASUK' : 'KELUAR',
        item.kategori,
        item.jumlah_bola || '-',
        `Rp ${item.jumlah_bayar.toLocaleString()}`
      ]);

      autoTable(doc, {
        head: [["No", "Tanggal", "Keterangan / Atlet", "Jenis", "Kategori", "Bola", "Nominal"]],
        body: tableRows,
        startY: 58,
        theme: 'grid',
        headStyles: { fillColor: [30, 64, 175], fontSize: 9, halign: 'center', fontStyle: 'bold' },
        bodyStyles: { fontSize: 8, valign: 'middle' },
        columnStyles: { 0: { halign: 'center' }, 3: { halign: 'center' }, 6: { halign: 'right' } },
        didParseCell: (data) => {
          if (data.column.index === 3 && data.cell.section === 'body') {
            if (data.cell.raw === 'MASUK') data.cell.styles.textColor = [16, 185, 129];
            if (data.cell.raw === 'KELUAR') data.cell.styles.textColor = [239, 68, 68];
          }
        }
      });

      const finalY = (doc as any).lastAutoTable.finalY + 10;
      doc.setFontSize(10).setFont("helvetica", "bold");
      doc.text(`TOTAL PEMASUKAN`, 130, finalY);
      doc.text(`: Rp ${stats.masuk.toLocaleString()}`, 196, finalY, { align: 'right' });
      doc.text(`TOTAL PENGELUARAN`, 130, finalY + 6);
      doc.text(`: Rp ${stats.keluar.toLocaleString()}`, 196, finalY + 6, { align: 'right' });
      doc.setTextColor(30, 64, 175).text(`SURPLUS / DEFISIT`, 130, finalY + 12);
      doc.text(`: Rp ${(stats.masuk - stats.keluar).toLocaleString()}`, 196, finalY + 12, { align: 'right' });

      const signY = finalY + 30;
      doc.setFontSize(10).setFont("helvetica", "normal").setTextColor(0);
      doc.text(`Parepare, ${locationDate}`, 150, signY - 7); 
      doc.text('Mengetahui, Ketua PB. Bili Bili 162,', 14, signY + 7);
      doc.text('H. WAWAN', 14, signY + 35);
      doc.text('Bendahara,', 150, signY + 7);
      doc.text('MUH. NUR', 150, signY + 35);

      doc.save(`Laporan_Kas_PB162_${startDate}_${endDate}.pdf`);
    } catch (error) { alert("Gagal membuat PDF"); }
  };

  useEffect(() => {
    if (formData.kategori === 'Pembayaran Shuttlecock' && formData.jenis_transaksi === 'Masuk') {
      const hargaPerBola = formData.tipe_anggota === 'Anggota Tetap' ? 4000 : 5000;
      const total = (formData.jumlah_bola || 0) * hargaPerBola;
      if (formData.jumlah_bayar !== total) setFormData(prev => ({ ...prev, jumlah_bayar: total }));
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
        setAtlets(pendaftaranRes.data.map(item => ({
          id: item.id,
          player_name: item.nama || (Array.isArray(item.atlet_stats) ? item.atlet_stats[0]?.player_name : (item.atlet_stats as any)?.player_name) || 'Unknown'
        })));
      }
    } catch (error) { console.error(error); } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const finalData = { ...formData, jenis_transaksi: DAFTAR_PEMASUKAN.includes(formData.kategori) ? 'Masuk' : formData.jenis_transaksi };
    try {
      if (editingId) { await supabase.from('kas_pb').update(finalData).eq('id', editingId); } 
      else { await supabase.from('kas_pb').insert([finalData]); }
      setEditingId(null); setFormData(initialForm); fetchData(); alert('Berhasil!');
    } catch (error: any) { alert(error.message); } finally { setSaving(false); }
  };

  const handleEdit = (item: KasEntry) => {
    setEditingId(item.id);
    setFormData({
      nama_pembayar: item.nama_pembayar, kategori: item.kategori, jumlah_bayar: item.jumlah_bayar,
      jumlah_bola: item.jumlah_bola || 0, tipe_anggota: item.tipe_anggota || 'Anggota Tetap',
      jenis_transaksi: item.jenis_transaksi, tanggal_transaksi: item.tanggal_transaksi, keterangan: item.keterangan || ''
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="p-6 lg:p-10 bg-[#050505] min-h-screen text-white font-sans">
      {/* Header & Stats */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-10">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-500/20 rounded-lg"><Wallet className="text-blue-400" size={28} /></div>
            <h1 className="text-4xl font-black italic tracking-tighter uppercase text-blue-400">Treasury <span className="text-white">Master</span></h1>
          </div>
          <p className="text-slate-500 text-[10px] font-bold tracking-[0.3em] uppercase ml-1">PB. BILI BILI 162 FINANCIAL HUB</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-4 py-2 rounded-xl">
             <Calendar size={14} className="text-blue-400" />
             <input type="date" className="bg-transparent text-[10px] font-bold outline-none text-white w-[100px]" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
             <span className="text-slate-500">-</span>
             <input type="date" className="bg-transparent text-[10px] font-bold outline-none text-white w-[100px]" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
          <button onClick={exportToPDF} className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-xl text-xs font-black uppercase tracking-widest transition-all hover:scale-105 active:scale-95">
            <FileText size={16} /> Export PDF
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
        <div className="bg-emerald-500/10 border border-emerald-500/20 p-6 rounded-[2rem]">
          <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500 mb-2 flex items-center gap-2"><ArrowUpCircle size={14}/> Pemasukan</p>
          <h2 className="text-2xl font-black italic text-emerald-400">Rp {stats.masuk.toLocaleString()}</h2>
        </div>
        <div className="bg-red-500/10 border border-red-500/20 p-6 rounded-[2rem]">
          <p className="text-[10px] font-black uppercase tracking-widest text-red-500 mb-2 flex items-center gap-2"><ArrowDownCircle size={14}/> Pengeluaran</p>
          <h2 className="text-2xl font-black italic text-red-400">Rp {stats.keluar.toLocaleString()}</h2>
        </div>
        <div className="bg-blue-500/10 border border-blue-500/20 p-6 rounded-[2rem]">
          <p className="text-[10px] font-black uppercase tracking-widest text-blue-500 mb-2 flex items-center gap-2"><Wallet size={14}/> Saldo Kas</p>
          <h2 className="text-2xl font-black italic text-white">Rp {totalSaldoGlobal.toLocaleString()}</h2>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Form Column */}
        <div className="lg:col-span-4">
          <div className="bg-white/[0.03] border border-white/5 p-8 rounded-[2.5rem] sticky top-10">
            <h3 className="text-blue-400 font-black italic uppercase tracking-tighter text-xl mb-6 flex items-center gap-2">
              {editingId ? <Edit3 size={20} /> : <Plus size={20} />} {editingId ? 'Edit Data' : 'Tambah Data'}
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
                    onChange={(e) => setFormData({...formData, kategori: e.target.value})}>
                    {DAFTAR_PEMASUKAN.map(kat => <option key={kat} value={kat}>{kat}</option>)}
                  </select>
                ) : (
                  <input type="text" className="w-full bg-black border border-white/10 rounded-xl p-4 text-sm outline-none" placeholder="Misal: Listrik/Sewa Lapangan" value={formData.kategori} onChange={(e) => setFormData({...formData, kategori: e.target.value})} />
                )}
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
              <button type="submit" disabled={saving} className={`w-full ${formData.jenis_transaksi === 'Masuk' ? 'bg-blue-600' : 'bg-red-600'} text-white font-black uppercase text-xs py-5 rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-95`}>
                {saving ? <Loader2 className="animate-spin" size={18} /> : (editingId ? 'Update Data' : 'Simpan Transaksi')}
              </button>
            </form>
          </div>
        </div>

        {/* Table Column with Pagination */}
        <div className="lg:col-span-8">
          <div className="bg-white/[0.02] border border-white/5 rounded-[2.5rem] overflow-hidden flex flex-col h-full">
            <div className="p-6 border-b border-white/5 flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-[0.3em] text-slate-500">History_Transactions.log</h3>
              <span className="text-[10px] text-zinc-500 font-bold uppercase">{filteredData.length} Total Entri</span>
            </div>
            
            <div className="flex-1 overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[10px] font-black uppercase tracking-widest text-slate-500 border-b border-white/5">
                    <th className="p-6">Transaksi</th>
                    <th className="p-6">Kategori</th>
                    <th className="p-6 text-right">Nominal</th>
                    <th className="p-6 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {loading ? (
                    <tr><td colSpan={4} className="p-20 text-center"><Loader2 className="animate-spin mx-auto text-blue-500" /></td></tr>
                  ) : currentItems.length === 0 ? (
                    <tr><td colSpan={4} className="p-20 text-center text-slate-600 text-xs uppercase font-bold tracking-widest">Tidak ada data</td></tr>
                  ) : currentItems.map((item) => (
                    <tr key={item.id} className="hover:bg-white/[0.02] transition-colors group">
                      <td className="p-6">
                        <p className="font-bold text-sm text-white uppercase truncate max-w-[150px] md:max-w-none">{item.nama_pembayar}</p>
                        <p className="text-[9px] text-slate-500 uppercase">{item.tanggal_transaksi} • {item.jenis_transaksi}</p>
                      </td>
                      <td className="p-6">
                        <span className={`px-3 py-1 rounded-full text-[8px] md:text-[9px] font-black uppercase border ${item.jenis_transaksi === 'Masuk' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'}`}>
                          {item.kategori}
                        </span>
                      </td>
                      <td className={`p-6 text-right font-black italic text-base md:text-lg ${item.jenis_transaksi === 'Masuk' ? 'text-emerald-400' : 'text-red-400'}`}>
                        Rp {item.jumlah_bayar.toLocaleString()}
                      </td>
                      <td className="p-6">
                        <div className="flex justify-center gap-2">
                          <button onClick={() => handleEdit(item)} className="p-2 bg-blue-500/10 text-blue-400 rounded-lg hover:bg-blue-500 hover:text-white transition-all"><Edit3 size={14}/></button>
                          <button onClick={async () => { if(confirm("Hapus?")) { await supabase.from('kas_pb').delete().eq('id', item.id); fetchData(); } }} className="p-2 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500 hover:text-white transition-all"><Trash2 size={14}/></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="p-6 border-t border-white/5 flex items-center justify-between bg-black/20">
                <p className="text-[10px] font-bold text-slate-500 uppercase">
                  Halaman {currentPage} dari {totalPages}
                </p>
                <div className="flex gap-2">
                  <button 
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(prev => prev - 1)}
                    className="p-2 border border-white/10 rounded-lg disabled:opacity-30 hover:bg-white/5 transition-all"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button 
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(prev => prev + 1)}
                    className="p-2 border border-white/10 rounded-lg disabled:opacity-30 hover:bg-white/5 transition-all"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}