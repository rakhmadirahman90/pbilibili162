import React, { useEffect, useMemo, useState } from 'react';
import { Wallet, FileText, Loader2, ArrowUpCircle, ArrowDownCircle, Calendar, ChevronLeft, ChevronRight, Search, Info, TrendingUp, TrendingDown, Package, Zap } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase } from '../supabase';

const PB_LOGO_URL = 'https://missjyvqfehamtpyodjr.supabase.co/storage/v1/object/public/assets/logo1.png';
const INCOME_CATEGORIES = ['Iuran Bulanan Tetap (10k)', 'Pembayaran Iuran Binaan', 'Pembayaran Shuttlecock', 'Pendaftaran Atlet Baru', 'Sumbangan Sukarela'];

type KasEntry = { id: string; tanggal_transaksi: string; nama_pembayar: string; kategori: string; jumlah_bayar: number; jumlah_bola: number; jenis_transaksi: 'Masuk' | 'Keluar' };

export default function PublicKasView() {
  const [loading, setLoading] = useState(true);
  const [kasData, setKasData] = useState<KasEntry[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const today = new Date().toISOString().split('T')[0];
  const firstDay = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
  const [startDate, setStartDate] = useState(firstDay);
  const [endDate, setEndDate] = useState(today);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('kas_pb').select('*').order('tanggal_transaksi', { ascending: false });
      if (error) throw error;
      setKasData((data || []) as KasEntry[]);
    } catch (error) { console.error('Error fetching kas:', error); }
    finally { setLoading(false); }
  };
  useEffect(() => { fetchData(); }, []);

  const globalStats = useMemo(() => kasData.reduce((acc, item) => { const type = INCOME_CATEGORIES.includes(item.kategori) ? 'Masuk' : item.jenis_transaksi; if (type === 'Masuk') acc.income += Number(item.jumlah_bayar || 0); else acc.expense += Number(item.jumlah_bayar || 0); return acc; }, { income: 0, expense: 0 }), [kasData]);
  const filteredData = useMemo(() => kasData.filter(item => { const date = item.tanggal_transaksi?.slice(0, 10); const q = searchTerm.trim().toLowerCase(); return date >= startDate && date <= endDate && ((!q) || (item.nama_pembayar || '').toLowerCase().includes(q) || (item.kategori || '').toLowerCase().includes(q)); }).map(item => ({ ...item, jenis_transaksi: (INCOME_CATEGORIES.includes(item.kategori) ? 'Masuk' : item.jenis_transaksi) as 'Masuk' | 'Keluar' })), [kasData, startDate, endDate, searchTerm]);
  const stats = useMemo(() => filteredData.reduce((acc, item) => { if (item.jenis_transaksi === 'Masuk') acc.income += Number(item.jumlah_bayar || 0); else acc.expense += Number(item.jumlah_bayar || 0); return acc; }, { income: 0, expense: 0 }), [filteredData]);
  const totalPages = Math.max(1, Math.ceil(filteredData.length / itemsPerPage));
  const currentItems = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const globalBalance = globalStats.income - globalStats.expense;

  const formatRupiah = (value: number) => `Rp ${Number(value || 0).toLocaleString('id-ID')}`;
  const formatDate = (value: string) => new Date(value).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });

  const exportToPDF = async () => {
    const doc = new jsPDF('p', 'mm', 'a4');
    try {
      const img = new Image(); img.crossOrigin = 'anonymous'; img.src = PB_LOGO_URL;
      await new Promise<void>((resolve, reject) => { img.onload = () => resolve(); img.onerror = () => reject(); });
      const canvas = document.createElement('canvas'); canvas.width = img.width; canvas.height = img.height; canvas.getContext('2d')?.drawImage(img, 0, 0);
      doc.addImage(canvas.toDataURL('image/png'), 'PNG', 15, 12, 22, 22);
    } catch { /* PDF remains valid without logo */ }
    doc.setFont('helvetica', 'bold').setFontSize(22).setTextColor(30, 64, 175); doc.text('PB. BILI BILI 162', 42, 20);
    doc.setFontSize(9).setFont('helvetica', 'normal').setTextColor(100); doc.text('Sekretariat: Jl. Andi Makkasau No.171, Ujung Lare, Kec. Soreang, Parepare 91131', 42, 25); doc.text('Laporan transparansi kas klub', 42, 30); doc.setDrawColor(30, 64, 175).setLineWidth(.8).line(15, 38, 195, 38);
    doc.setFontSize(14).setFont('helvetica', 'bold').setTextColor(40); doc.text('LAPORAN PERTANGGUNGJAWABAN KEUANGAN KAS', 105, 50, { align: 'center' }); doc.setFontSize(10).setFont('helvetica', 'normal').setTextColor(120); doc.text(`Periode: ${startDate} s/d ${endDate}`, 105, 56, { align: 'center' });
    autoTable(doc, { startY: 65, head: [['Tanggal', 'Nama', 'Jenis', 'Kategori', 'Bola', 'Nominal']], body: filteredData.map(item => [formatDate(item.tanggal_transaksi), item.nama_pembayar || '-', item.jenis_transaksi, item.kategori || '-', item.jumlah_bola > 0 ? `${item.jumlah_bola}` : '-', formatRupiah(item.jumlah_bayar)]), headStyles: { fillColor: [30, 64, 175], fontSize: 9, halign: 'center' }, styles: { fontSize: 8, cellPadding: 3, valign: 'middle' } });
    const y = ((doc as any).lastAutoTable?.finalY || 65) + 10; doc.setFontSize(9).setFont('helvetica', 'bold').setTextColor(100); doc.text(`Pemasukan Periode: ${formatRupiah(stats.income)}`, 120, y); doc.text(`Pengeluaran Periode: ${formatRupiah(stats.expense)}`, 120, y + 7); doc.setTextColor(30, 64, 175); doc.text(`Saldo Global: ${formatRupiah(globalBalance)}`, 120, y + 14); doc.save(`LPJ_KAS_PB162_${startDate}_TO_${endDate}.pdf`);
  };

  return <section className="w-full py-8 sm:py-12 lg:py-16 px-3 sm:px-0 text-slate-900">
    <div className="max-w-7xl mx-auto bg-white rounded-[2rem] sm:rounded-[2.5rem] shadow-2xl border border-slate-100 overflow-hidden">
      <div className="p-5 sm:p-8 lg:p-10"><div className="flex flex-col lg:flex-row justify-between items-start gap-5 lg:gap-8 mb-8 sm:mb-10"><div className="min-w-0"><div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[9px] font-black uppercase tracking-widest border border-blue-100 mb-3"><Zap size={12} fill="currentColor" /> Live Financial Report</div><h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-800 tracking-tighter flex items-center gap-3 italic"><span className="p-2 bg-blue-600 rounded-2xl text-white"><Wallet size={24} /></span> TRANSPARANSI KAS</h2><p className="text-slate-500 mt-2 text-sm font-medium flex items-start gap-2"><Info size={16} className="text-blue-500 shrink-0 mt-0.5" /> Pemantauan saldo dan mutasi dana PB. Bili Bili 162 secara terbuka.</p></div><button onClick={exportToPDF} className="w-full lg:w-auto flex items-center justify-center gap-3 px-6 sm:px-8 py-3.5 sm:py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] sm:text-[11px] tracking-[0.15em] hover:bg-blue-600 transition-all shadow-2xl"><FileText size={18} /> UNDUH LAPORAN PDF</button></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 mb-8"><FilterInput label="Cari Atlet / Kategori"><div className="relative"><Search className="absolute left-4 top-3.5 text-slate-400" size={18} /><input value={searchTerm} onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }} placeholder="Nama atau kategori..." className="w-full pl-11 pr-4 py-3.5 rounded-2xl border border-slate-200 outline-none focus:ring-4 focus:ring-blue-100 font-bold text-sm" /></div></FilterInput><FilterInput label="Periode Awal"><input type="date" value={startDate} onChange={e => { setStartDate(e.target.value); setCurrentPage(1); }} className="w-full px-4 py-3.5 rounded-2xl border border-slate-200 outline-none focus:ring-4 focus:ring-blue-100 font-bold text-sm" /></FilterInput><FilterInput label="Periode Akhir"><input type="date" value={endDate} onChange={e => { setEndDate(e.target.value); setCurrentPage(1); }} className="w-full px-4 py-3.5 rounded-2xl border border-slate-200 outline-none focus:ring-4 focus:ring-blue-100 font-bold text-sm" /></FilterInput></div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-8"><StatCard label="Pemasukan Periode" value={formatRupiah(stats.income)} tone="green" icon={<TrendingUp size={80} />} /><StatCard label="Pengeluaran Periode" value={formatRupiah(stats.expense)} tone="red" icon={<TrendingDown size={80} />} /><StatCard label="Total Saldo Kas Global" value={formatRupiah(globalBalance)} tone="blue" icon={<Wallet size={80} />} /></div>

        <div className="hidden md:block border border-slate-100 rounded-[2rem] overflow-hidden shadow-sm"><div className="overflow-x-auto"><table className="w-full min-w-[800px] text-left border-collapse"><thead><tr className="bg-slate-900 text-white">{['Waktu','Nama / Keterangan','Kategori Transaksi','Ket / Bola','Tipe','Nominal'].map((h, i) => <th key={h} className={`p-5 text-[10px] font-black uppercase tracking-widest ${i > 2 ? 'text-center' : ''} ${i === 5 ? 'text-right' : ''}`}>{h}</th>)}</tr></thead><tbody className="divide-y divide-slate-50">{loading ? <tr><td colSpan={6} className="p-24 text-center"><Loader2 className="animate-spin text-blue-600 mx-auto" size={42} /></td></tr> : currentItems.map(item => <tr key={item.id} className="hover:bg-slate-50 transition-colors"><td className="p-5 text-xs font-bold text-slate-500"><Calendar size={13} className="inline mr-2 text-blue-500" />{formatDate(item.tanggal_transaksi)}</td><td className="p-5 font-black text-xs uppercase">{item.nama_pembayar || '-'}</td><td className="p-5"><span className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-xl text-[9px] font-black uppercase">{item.kategori}</span></td><td className="p-5 text-center">{item.jumlah_bola > 0 ? <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-amber-50 text-amber-700 rounded-xl text-[9px] font-black"><Package size={12} /> {item.jumlah_bola} Pcs</span> : '--'}</td><td className="p-5 text-center"><TypeBadge type={item.jenis_transaksi} /></td><td className={`p-5 text-right font-black text-sm ${item.jenis_transaksi === 'Masuk' ? 'text-emerald-600' : 'text-rose-600'}`}>{item.jenis_transaksi === 'Masuk' ? '+' : '-'} {formatRupiah(item.jumlah_bayar)}</td></tr>)}{!loading && currentItems.length === 0 && <tr><td colSpan={6} className="p-20 text-center text-slate-400 font-black uppercase text-xs">Tidak ada transaksi pada periode yang dipilih.</td></tr>}</tbody></table></div></div>

        <div className="md:hidden space-y-3">{loading ? <div className="py-20 text-center"><Loader2 className="animate-spin text-blue-600 mx-auto" size={38} /></div> : currentItems.map(item => <article key={item.id} className="p-4 rounded-2xl border border-slate-100 bg-slate-50/60"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-[9px] text-slate-400 font-black uppercase tracking-widest">{formatDate(item.tanggal_transaksi)}</p><h3 className="font-black text-sm uppercase mt-1 break-words">{item.nama_pembayar || '-'}</h3><p className="text-[10px] text-slate-500 mt-1 break-words">{item.kategori}</p></div><TypeBadge type={item.jenis_transaksi} /></div><div className="mt-4 flex items-end justify-between gap-3"><div>{item.jumlah_bola > 0 && <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-700 rounded-lg text-[9px] font-black"><Package size={11} /> {item.jumlah_bola} Pcs</span>}</div><strong className={`text-base ${item.jenis_transaksi === 'Masuk' ? 'text-emerald-600' : 'text-rose-600'}`}>{item.jenis_transaksi === 'Masuk' ? '+' : '-'} {formatRupiah(item.jumlah_bayar)}</strong></div></article>)}{!loading && currentItems.length === 0 && <div className="py-16 text-center text-slate-400 font-black uppercase text-xs">Tidak ada transaksi pada periode yang dipilih.</div>}</div>

        <div className="mt-6 p-4 sm:p-6 bg-slate-50 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4"><p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">{filteredData.length ? `${(currentPage - 1) * itemsPerPage + 1} - ${Math.min(currentPage * itemsPerPage, filteredData.length)} dari ${filteredData.length} transaksi` : '0 transaksi'}</p><div className="flex items-center gap-2"><button disabled={currentPage === 1} onClick={() => setCurrentPage(p => Math.max(1, p - 1))} className="p-3 bg-white border rounded-xl disabled:opacity-30" aria-label="Halaman sebelumnya"><ChevronLeft size={16} /></button><span className="text-xs font-black text-slate-700 px-2">{filteredData.length ? `${currentPage}/${totalPages}` : '0/0'}</span><button disabled={currentPage >= totalPages || !filteredData.length} onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} className="p-3 bg-white border rounded-xl disabled:opacity-30" aria-label="Halaman berikutnya"><ChevronRight size={16} /></button></div></div>
      </div>
    </div>
  </section>;
}

function FilterInput({ label, children }: { label: string; children: React.ReactNode }) { return <div className="space-y-2"><label className="text-[9px] font-black uppercase text-slate-400 tracking-[.2em]">{label}</label>{children}</div>; }
function TypeBadge({ type }: { type: 'Masuk' | 'Keluar' }) { const income = type === 'Masuk'; return <span className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-[9px] font-black uppercase ${income ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>{income ? <ArrowUpCircle size={11} /> : <ArrowDownCircle size={11} />}{type}</span>; }
function StatCard({ label, value, tone, icon }: { label: string; value: string; tone: 'green' | 'red' | 'blue'; icon: React.ReactNode }) { const cls = tone === 'green' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : tone === 'red' ? 'bg-rose-50 text-rose-700 border-rose-100' : 'bg-blue-600 text-white border-blue-600'; return <div className={`p-5 sm:p-7 rounded-[1.5rem] sm:rounded-[2rem] border relative overflow-hidden ${cls}`}><div className="relative z-10"><p className="text-[9px] font-black uppercase tracking-[.2em] opacity-80 mb-2">{label}</p><p className="text-2xl sm:text-3xl font-black tracking-tight break-words">{value}</p></div><div className="absolute -right-4 -bottom-4 opacity-10">{icon}</div></div>; }
