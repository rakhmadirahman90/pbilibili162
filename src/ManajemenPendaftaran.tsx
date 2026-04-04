import React, { useEffect, useState } from 'react';
import { supabase } from "./supabase";
import { 
  Trash2, 
  RefreshCcw, 
  Search, 
  Phone, 
  MapPin, 
  ChevronLeft,
  ChevronRight,
  Edit3,
  X,
  Save,
  User,
  Camera,
  Loader2,
  Users,
  FileSpreadsheet,
  FileText,
  Plus,
  Upload,
  Clock,
  Calendar,
  Download,
  Activity
} from 'lucide-react';

import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Swal from 'sweetalert2';

interface Registrant {
  id: string;
  created_at: string;
  nama: string;
  whatsapp: string;
  kategori: string;
  domisili: string;
  pengalaman: string;
  foto_url: string;
  jenis_kelamin: string;
  kategori_atlet: string; // NEW: Kolom kategori atlet sesuai DB
}

export default function ManajemenPendaftaran() {
  const [registrants, setRegistrants] = useState<Registrant[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Registrant | null>(null);
  const [newItem, setNewItem] = useState<Partial<Registrant>>({
    nama: '',
    whatsapp: '',
    kategori: 'Pra Dini (U-9)',
    domisili: '',
    jenis_kelamin: 'Putra',
    foto_url: '',
    kategori_atlet: 'Muda' // Default value
  });
  const [uploading, setUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  
  const itemsPerPage = 8; 

  const kategoriUmur = [
    "Pra Dini (U-9)", "Usia Dini (U-11)", "Anak-anak (U-13)", 
    "Pemula (U-15)", "Remaja (U-17)", "Taruna (U-19)", 
    "Dewasa / Umum", "Veteran (35+ / 40+)"
  ];

// --- MENGHITUNG JUMLAH PENDAFTAR (STATISTIK LENGKAP) ---
const totalPendaftar = registrants.length;

// Filter Jenis Kelamin Umum (Dipaksa Uppercase untuk keamanan)
const totalPutra = registrants.filter(r => (r.jenis_kelamin || '').toUpperCase().trim() === 'PUTRA').length;
const totalPutri = registrants.filter(r => (r.jenis_kelamin || '').toUpperCase().trim() === 'PUTRI').length;

// --- STATISTIK ATLET MUDA ---
const totalMuda = registrants.filter(r => (r.kategori_atlet || '').toUpperCase().trim() === 'MUDA').length;
const totalMudaPutra = registrants.filter(r => 
  (r.kategori_atlet || '').toUpperCase().trim() === 'MUDA' && (r.jenis_kelamin || '').toUpperCase().trim() === 'PUTRA'
).length;
const totalMudaPutri = registrants.filter(r => 
  (r.kategori_atlet || '').toUpperCase().trim() === 'MUDA' && (r.jenis_kelamin || '').toUpperCase().trim() === 'PUTRI'
).length;

// --- STATISTIK ATLET SENIOR ---
const totalSenior = registrants.filter(r => (r.kategori_atlet || '').toUpperCase().trim() === 'SENIOR').length;
const totalSeniorPutra = registrants.filter(r => 
  (r.kategori_atlet || '').toUpperCase().trim() === 'SENIOR' && (r.jenis_kelamin || '').toUpperCase().trim() === 'PUTRA'
).length;
const totalSeniorPutri = registrants.filter(r => 
  (r.kategori_atlet || '').toUpperCase().trim() === 'SENIOR' && (r.jenis_kelamin || '').toUpperCase().trim() === 'PUTRI'
).length;

  // --- UTILS ---
  const Toast = Swal.mixin({
    toast: true,
    position: "top-end",
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true,
  });

  const compressImage = (file: File): Promise<Blob> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 800;
          const scaleSize = MAX_WIDTH / img.width;
          canvas.width = MAX_WIDTH;
          canvas.height = img.height * scaleSize;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
          canvas.toBlob((blob) => {
            resolve(blob as Blob);
          }, 'image/jpeg', 0.8);
        };
      };
    });
  };

  // --- EXPORT & TEMPLATE FUNCTIONS ---
  const exportToExcel = () => {
    if (filteredData.length === 0) return Swal.fire("Opps!", "Tidak ada data untuk diekspor", "warning");
    const dataToExport = filteredData.map((item, index) => ({
      No: index + 1,
      Nama: (item.nama || '').toUpperCase(),
      Gender: item.jenis_kelamin || '-',
      Kategori_Umur: item.kategori || '-',
      Kategori_Atlet: item.kategori_atlet || '-',
      WhatsApp: item.whatsapp || '-',
      Domisili: item.domisili || '-',
      Tanggal_Daftar: item.created_at ? new Date(item.created_at).toLocaleDateString('id-ID') : '-',
      Waktu_Daftar: item.created_at ? new Date(item.created_at).toLocaleTimeString('id-ID') : '-'
    }));
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Data Pendaftar");
    XLSX.writeFile(workbook, `Data_Atlet_${Date.now()}.xlsx`);
  };

  const exportToPDF = () => {
    if (filteredData.length === 0) return Swal.fire("Opps!", "Tidak ada data untuk diekspor", "warning");
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("LAPORAN DATA PENDAFTARAN ATLET", 14, 15);
    const tableColumn = ["No", "Nama Atlet", "Gender", "Kat. Atlet", "Kat. Umur", "Domisili", "WhatsApp", "Tgl Daftar"];
    const tableRows = filteredData.map((item, index) => [
      index + 1,
      (item.nama || '').toUpperCase(),
      item.jenis_kelamin || '-',
      item.kategori_atlet || '-',
      item.kategori || '-',
      item.domisili || '-',
      item.whatsapp || '-',
      item.created_at ? new Date(item.created_at).toLocaleDateString('id-ID') : '-'
    ]);
    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 28,
      theme: 'grid',
      headStyles: { fillColor: [37, 99, 235], fontStyle: 'bold' },
    });
    doc.save(`Data_Atlet_${Date.now()}.pdf`);
  };

  const downloadTemplate = () => {
    const templateData = [
      { Nama: "Contoh Nama Atlet", WhatsApp: "081234567890", Kategori_Umur: "Dewasa / Umum", Kategori_Atlet: "Senior", Domisili: "Makassar", Gender: "Putra" },
      { Nama: "Susi Susanti", WhatsApp: "089876543210", Kategori_Umur: "Remaja (U-17)", Kategori_Atlet: "Muda", Domisili: "Jakarta", Gender: "Putri" }
    ];
    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Template");
    XLSX.writeFile(workbook, "Template_Import_Atlet.xlsx");
  };

  // --- IMPORT EXCEL ---
  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);

        if (data.length === 0) throw new Error("File kosong");

        const formattedData = data.map((item: any) => ({
          nama: (item.Nama || item.nama || '').toUpperCase(),
          whatsapp: String(item.WhatsApp || item.whatsapp || ''),
          kategori: item.Kategori_Umur || item.Kategori || item.kategori || 'Umum',
          kategori_atlet: item.Kategori_Atlet || item.kategori_atlet || 'Muda',
          domisili: (item.Domisili || item.domisili || '').toUpperCase(),
          jenis_kelamin: item.Gender || item.jenis_kelamin || 'Putra',
        }));

        const { error } = await supabase.from('pendaftaran').insert(formattedData);
        if (error) throw error;

        Toast.fire({ icon: 'success', title: `${data.length} Data berhasil diimport` });
        fetchData();
      } catch (err: any) {
        Swal.fire("Gagal Import", err.message, "error");
      }
      e.target.value = '';
    };
    reader.readAsBinaryString(file);
  };

  // --- CORE FUNCTIONS ---
  const fetchData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('pendaftaran')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setRegistrants(data || []);
    } catch (error: any) {
      console.error('Error fetching data:', error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const channel = supabase
      .channel('pendaftaran_changes')
      .on('postgres_changes', { event: '*', table: 'pendaftaran', schema: 'public' }, 
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setRegistrants((prev) => [payload.new as Registrant, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setRegistrants((prev) => prev.map((item) => item.id === payload.new.id ? (payload.new as Registrant) : item));
          } else if (payload.eventType === 'DELETE') {
            setRegistrants((prev) => prev.filter((item) => item.id !== payload.old.id));
          }
        }
      ).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const filteredData = (registrants || []).filter(item => 
    (item?.nama || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item?.domisili || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item?.kategori || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item?.kategori_atlet || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const currentItems = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const deleteOldFile = async (url: string) => {
    if (!url || !url.includes('identitas-atlet')) return;
    try {
      const parts = url.split('/');
      const fileName = parts[parts.length - 1];
      if (fileName) {
        await supabase.storage.from('identitas-atlet').remove([`identitas/${fileName}`]);
      }
    } catch (e) { console.error("Gagal hapus file lama", e); }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, mode: 'edit' | 'add') => {
    if (!e.target.files?.[0]) return;
    const file = e.target.files[0];
    setUploading(true);
    
    try {
      const compressedBlob = await compressImage(file);
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;
      const filePath = `identitas/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('identitas-atlet')
        .upload(filePath, compressedBlob, { contentType: 'image/jpeg' });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('identitas-atlet').getPublicUrl(filePath);

      if (mode === 'edit' && editingItem) {
        setEditingItem({ ...editingItem, foto_url: publicUrl });
      } else {
        setNewItem(prev => ({ ...prev, foto_url: publicUrl }));
      }
      
      Toast.fire({ icon: 'success', title: 'Foto berhasil diunggah' });
    } catch (error: any) { 
      Swal.fire("Gagal upload", error.message, "error");
    } finally { 
      setUploading(false); 
    }
  };

  const handleDelete = async (id: string, nama: string, foto_url: string) => {
    const result = await Swal.fire({
      title: 'Hapus Data?',
      text: `Apakah Anda yakin ingin menghapus data ${nama}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#e11d48',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Ya, Hapus!',
      cancelButtonText: 'Batal'
    });

    if (result.isConfirmed) {
      try {
        if (foto_url) await deleteOldFile(foto_url);
        const { error } = await supabase.from('pendaftaran').delete().eq('id', id);
        if (error) throw error;
        Toast.fire({ icon: 'success', title: 'Data berhasil dihapus' });
      } catch (error: any) { 
        Swal.fire('Gagal', error.message, 'error');
      }
    }
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const { error } = await supabase.from('pendaftaran').insert([{
        ...newItem,
        nama: (newItem.nama || '').toUpperCase(),
        domisili: (newItem.domisili || '').toUpperCase()
      }]);
      
      if (error) throw error;
      
      setIsAddModalOpen(false);
      setNewItem({ nama: '', whatsapp: '', kategori: 'Pra Dini (U-9)', domisili: '', jenis_kelamin: 'Putra', foto_url: '', kategori_atlet: 'Muda' });
      Toast.fire({ icon: 'success', title: 'Atlet baru berhasil ditambahkan' });
    } catch (error: any) {
      Swal.fire("Gagal", error.message, "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
  e.preventDefault();
  // Pastikan editingItem tidak null
  if (!editingItem || uploading) return;

  setIsSaving(true);
  try {
    const { error } = await supabase
      .from('pendaftaran')
      .update({
        // Tambahkan || '' agar jika null tetap terbaca sebagai string kosong
        nama: (editingItem.nama || '').toUpperCase(),
        whatsapp: editingItem.whatsapp,
        kategori: editingItem.kategori,
        // Pastikan kategori_atlet juga aman dari null
        kategori_atlet: (editingItem.kategori_atlet || 'MUDA').toUpperCase(), 
        domisili: (editingItem.domisili || '').toUpperCase(),
        pengalaman: (editingItem.pengalaman || '').toUpperCase(),
        jenis_kelamin: editingItem.jenis_kelamin,
        foto_url: editingItem.foto_url
      })
      .eq('id', editingItem.id);

    if (error) throw error;
    
    Swal.fire('Berhasil', 'Data berhasil diperbarui!', 'success');
    setIsEditModalOpen(false);
    fetchData(); 
  } catch (err: any) {
    Swal.fire('Gagal', err.message, 'error');
  } finally {
    setIsSaving(false);
  }
};
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-20">
      <div className="max-w-[1400px] mx-auto px-4 py-4 md:px-8">
        
        {/* HEADER */}
        <header className="flex flex-col lg:flex-row justify-between items-center gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-200">
              <Users className="text-white" size={24} />
            </div>
            <div>
              <h1 className="text-xl md:text-3xl font-black tracking-tight text-slate-900 uppercase italic leading-none">
                Manajemen <span className="text-blue-600">Pendaftaran</span>
              </h1>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Database & Administrasi Real-time</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2">
            <button onClick={() => setIsAddModalOpen(true)} className="flex items-center gap-2 bg-blue-600 text-white px-5 py-3 rounded-xl font-bold text-[10px] tracking-widest hover:bg-slate-900 transition-all active:scale-95 shadow-lg shadow-blue-100">
              <Plus size={16} /> TAMBAH ATLET
            </button>

            <button onClick={downloadTemplate} className="flex items-center gap-2 bg-indigo-500 text-white px-5 py-3 rounded-xl font-bold text-[10px] tracking-widest hover:bg-indigo-600 transition-all active:scale-95 shadow-lg shadow-indigo-100">
              <Download size={16} /> TEMPLATE IMPORT
            </button>

            <label className="flex items-center gap-2 bg-amber-500 text-white px-5 py-3 rounded-xl font-bold text-[10px] tracking-widest hover:bg-amber-600 transition-all active:scale-95 shadow-lg shadow-amber-100 cursor-pointer">
              <Upload size={16} /> IMPORT EXCEL
              <input type="file" className="hidden" accept=".xlsx, .xls" onChange={handleImportExcel} />
            </label>

            <div className="h-10 w-[1px] bg-slate-200 mx-1 hidden sm:block"></div>
             
            <button onClick={exportToExcel} className="p-3 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-600 hover:text-white transition-all" title="Export Excel">
              <FileSpreadsheet size={20} />
            </button>
            <button onClick={exportToPDF} className="p-3 bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-600 hover:text-white transition-all" title="Export PDF">
              <FileText size={20} />
            </button>

            <button onClick={fetchData} className="p-3 bg-slate-900 text-white rounded-xl hover:bg-blue-600 transition-all">
              <RefreshCcw size={20} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </header>

        {/* --- STATISTIK LENGKAP (RESPONSIVE GRID) --- */}
        <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 lg:gap-4 mb-6">
          {/* Card Total */}
          <div className="bg-white p-4 rounded-[1.2rem] border border-slate-100 shadow-sm flex items-center justify-between col-span-2 md:col-span-1">
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Total Pendaftar</p>
              <p className="text-2xl font-black text-slate-900 mt-0.5">{totalPendaftar}</p>
            </div>
            <div className="p-3 bg-slate-100 text-slate-600 rounded-xl">
              <Users size={20} />
            </div>
          </div>
          
          {/* Card Putra */}
          <div className="bg-white p-4 rounded-[1.2rem] border border-slate-100 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Atlet Putra</p>
              <p className="text-2xl font-black text-blue-600 mt-0.5">{totalPutra}</p>
            </div>
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
              <User size={20} />
            </div>
          </div>

          {/* Card Putri */}
          <div className="bg-white p-4 rounded-[1.2rem] border border-slate-100 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Atlet Putri</p>
              <p className="text-2xl font-black text-rose-600 mt-0.5">{totalPutri}</p>
            </div>
            <div className="p-3 bg-rose-50 text-rose-600 rounded-xl">
              <User size={20} />
            </div>
          </div>

          {/* Card Muda */}
          <div className="bg-white p-4 rounded-[1.2rem] border border-slate-100 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Atlet Muda</p>
              <p className="text-2xl font-black text-indigo-600 mt-0.5 leading-none">{totalMuda}</p>
              <p className="text-[8px] font-bold text-slate-400 mt-1 uppercase tracking-wider">PA: <span className="text-blue-500">{totalMudaPutra}</span> | PI: <span className="text-rose-500">{totalMudaPutri}</span></p>
            </div>
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
              <Activity size={20} />
            </div>
          </div>

          {/* Card Senior */}
          <div className="bg-white p-4 rounded-[1.2rem] border border-slate-100 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Atlet Senior</p>
              <p className="text-2xl font-black text-emerald-600 mt-0.5 leading-none">{totalSenior}</p>
              <p className="text-[8px] font-bold text-slate-400 mt-1 uppercase tracking-wider">PA: <span className="text-blue-500">{totalSeniorPutra}</span> | PI: <span className="text-rose-500">{totalSeniorPutri}</span></p>
            </div>
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
              <Activity size={20} />
            </div>
          </div>
        </section>

        {/* SEARCH BAR */}
        <section className="mb-6">
          <div className="relative rounded-2xl bg-white border border-slate-200 shadow-sm transition-all focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-50">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text"
              placeholder="Cari berdasarkan nama, kategori umur, atau kota domisili..."
              className="w-full pl-12 pr-6 py-3 bg-transparent outline-none font-bold text-sm placeholder:text-slate-300"
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            />
          </div>
        </section>

        {/* TABLE SECTION (RESPONSIVE NO SCROLL ON DESKTOP) */}
        <section className="bg-white rounded-[2rem] border border-slate-100 shadow-xl overflow-hidden mb-6">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-900 text-white whitespace-nowrap">
                  <th className="px-3 py-4 font-bold uppercase text-[9px] tracking-widest text-center w-10">No</th>
                  <th className="px-3 py-4 font-bold uppercase text-[9px] tracking-widest">Profil Atlet</th>
                  <th className="px-2 py-4 font-bold uppercase text-[9px] tracking-widest">Gender</th>
                  <th className="px-2 py-4 font-bold uppercase text-[9px] tracking-widest">Kategori Umur</th>
                  <th className="px-2 py-4 font-bold uppercase text-[9px] tracking-widest">Kategori Atlet</th>
                  <th className="px-2 py-4 font-bold uppercase text-[9px] tracking-widest">Kontak</th>
                  <th className="px-2 py-4 font-bold uppercase text-[9px] tracking-widest">Lokasi</th>
                  <th className="px-2 py-4 font-bold uppercase text-[9px] tracking-widest">Tgl Registrasi</th>
                  <th className="px-2 py-4 font-bold uppercase text-[9px] tracking-widest">Waktu Registrasi</th>
                  <th className="px-4 py-4 font-bold uppercase text-[9px] tracking-widest text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading && registrants.length === 0 ? (
                  <tr><td colSpan={10} className="py-20 text-center text-slate-400 font-bold uppercase text-[10px] tracking-widest">Memuat Database Atlet...</td></tr>
                ) : currentItems.length === 0 ? (
                  <tr><td colSpan={10} className="py-20 text-center text-slate-400 font-bold uppercase text-[10px] tracking-widest">Tidak ada data atlet ditemukan</td></tr>
                ) : currentItems.map((item, index) => (
                  <tr key={item.id} className="hover:bg-blue-50/40 even:bg-slate-50/30 transition-all duration-200 group">
                    
                    <td className="px-2 py-3 text-center">
                      <span className="text-[10px] font-black text-slate-300 group-hover:text-blue-600 transition-colors">
                        {String((currentPage - 1) * itemsPerPage + index + 1).padStart(2, '0')}
                      </span>
                    </td>
                    
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-3">
                        <div 
                          onClick={() => item.foto_url && setPreviewImage(item.foto_url)}
                          className="w-10 h-10 rounded-xl bg-slate-200 border border-slate-100 shadow-sm overflow-hidden flex-shrink-0 cursor-zoom-in hover:opacity-80 transition-opacity"
                        >
                          {item.foto_url ? (
                            <img src={item.foto_url} className="w-full h-full object-cover object-top" alt={item.nama} />
                          ) : (
                            <User className="m-auto mt-1.5 text-slate-400" size={20} />
                          )}
                        </div>
                        <div className="flex flex-col min-w-[100px] max-w-[180px]">
                          <h4 className="font-black text-slate-800 text-[11px] uppercase leading-tight truncate" title={item.nama}>{item.nama || 'No Name'}</h4>
                          <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">UID: {item.id.split('-')[0]}</span>
                        </div>
                      </div>
                    </td>

                    <td className="px-2 py-3 whitespace-nowrap">
                      <span className={`px-2.5 py-1 rounded-md text-[8px] font-black uppercase tracking-widest ${item.jenis_kelamin === 'Putra' ? 'bg-blue-100 text-blue-700' : 'bg-rose-100 text-rose-700'}`}>
                        {item.jenis_kelamin || '-'}
                      </span>
                    </td>

                    <td className="px-2 py-3 whitespace-nowrap">
                      <span className="text-[10px] font-bold text-slate-700 uppercase">
                        {item.kategori || '-'}
                      </span>
                    </td>

                    {/* KATEGORI ATLET (MUDA/SENIOR) */}
                    <td className="px-2 py-3 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-md text-[8px] font-black uppercase tracking-widest ${item.kategori_atlet === 'Muda' ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-700'}`}>
                        {item.kategori_atlet || 'MUDA'}
                      </span>
                    </td>

                    <td className="px-2 py-3 whitespace-nowrap">
                      <a href={`https://wa.me/${(item.whatsapp || '').replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 font-bold text-slate-600 hover:text-green-600 text-[10px] transition-colors">
                        <Phone size={10} className="text-green-500" /> {item.whatsapp || '-'}
                      </a>
                    </td>

                    <td className="px-2 py-3 max-w-[100px] truncate" title={item.domisili}>
                      <div className="inline-flex items-center gap-1.5 font-bold text-slate-400 uppercase text-[9px]">
                        <MapPin size={10} className="text-rose-500 shrink-0" /> {item.domisili || '-'}
                      </div>
                    </td>

                    <td className="px-2 py-3 whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5 text-slate-600 font-bold text-[9px] uppercase tracking-wider">
                        <Calendar size={10} className="text-blue-500" /> {new Date(item.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </div>
                    </td>

                    <td className="px-2 py-3 whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5 text-slate-400 font-bold text-[9px] uppercase tracking-wider">
                        <Clock size={10} /> {new Date(item.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
                      </div>
                    </td>

                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => { setEditingItem(item); setIsEditModalOpen(true); }} className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-600 hover:text-white transition-all shadow-sm">
                          <Edit3 size={14} />
                        </button>
                        <button onClick={() => handleDelete(item.id, item.nama, item.foto_url)} className="p-2 bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-600 hover:text-white transition-all shadow-sm">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* PAGINATION */}
        <footer className="flex flex-col sm:flex-row justify-between items-center gap-4 px-8 py-4 bg-slate-900 rounded-3xl text-white shadow-2xl">
          <div className="flex flex-col text-center sm:text-left">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400">Navigasi Data</p>
            <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">Halaman {currentPage} Dari {totalPages || 1}</p>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1} className="p-2 bg-white/10 rounded-xl disabled:opacity-20 hover:bg-white/20 transition-all active:scale-90">
              <ChevronLeft size={16} />
            </button>
            <div className="flex gap-1.5">
              {[...Array(totalPages || 0)].map((_, i) => (
                 <button key={i} onClick={() => setCurrentPage(i + 1)} className={`w-8 h-8 rounded-lg text-xs font-black transition-all ${currentPage === i + 1 ? 'bg-blue-600 text-white scale-110 shadow-lg shadow-blue-500/50' : 'bg-white/5 hover:bg-white/10 text-white/50'}`}>
                    {i + 1}
                 </button>
              ))}
            </div>
            <button onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages || totalPages === 0} className="p-2 bg-white/10 rounded-xl disabled:opacity-20 hover:bg-white/20 transition-all active:scale-90">
              <ChevronRight size={16} />
            </button>
          </div>
        </footer>
      </div>

      {/* ======================= MODAL TAMBAH (ADD) ======================= */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setIsAddModalOpen(false)} />
          <div className="relative bg-white w-full max-w-xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
            <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h2 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter">Tambah <span className="text-blue-600">Atlet Baru</span></h2>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Input data atlet resmi ke database</p>
              </div>
              <button onClick={() => setIsAddModalOpen(false)} className="p-2.5 bg-white border border-slate-200 hover:bg-rose-50 hover:text-rose-500 rounded-xl text-slate-400 transition-all"><X size={18}/></button>
            </div>
            
            <form onSubmit={handleAddSubmit} className="p-8 space-y-5">
              <div className="flex items-center gap-6 mb-2">
                <div className="relative">
                  <div className="w-24 h-24 rounded-[1.5rem] bg-slate-100 border-4 border-white shadow-xl overflow-hidden flex-shrink-0">
                    {newItem.foto_url ? (
                      <img src={newItem.foto_url} className="w-full h-full object-cover object-top" alt="preview" /> 
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-slate-300">
                        <User size={32} />
                        <span className="text-[7px] font-black uppercase mt-1">No Photo</span>
                      </div>
                    )}
                    {uploading && <div className="absolute inset-0 bg-white/90 flex items-center justify-center"><Loader2 className="animate-spin text-blue-600" size={20} /></div>}
                  </div>
                  <label className="absolute -bottom-2 -right-2 p-2.5 bg-blue-600 text-white rounded-xl shadow-xl cursor-pointer hover:bg-slate-900 transition-all border-4 border-white">
                    <Camera size={14} />
                    <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'add')} />
                  </label>
                </div>
                <div className="flex-1 space-y-4">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">Nama Lengkap</label>
                    <input className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold uppercase text-xs focus:border-blue-600 focus:bg-white outline-none transition-all" placeholder="CONTOH: BUDI SANTOSO" value={newItem.nama} onChange={e => setNewItem({...newItem, nama: e.target.value})} required />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">Kategori Atlet</label>
                  <div className="grid grid-cols-2 gap-2 bg-slate-50 p-1 rounded-xl border border-slate-200">
                    {['Muda', 'Senior'].map((k) => (
                      <button key={k} type="button" onClick={() => setNewItem({...newItem, kategori_atlet: k})} className={`py-2 rounded-lg font-black text-[9px] tracking-widest transition-all ${newItem.kategori_atlet === k ? (k === 'Muda' ? 'bg-indigo-600 text-white shadow-md' : 'bg-emerald-600 text-white shadow-md') : 'text-slate-400 hover:text-slate-600'}`}>
                        {k.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">Jenis Kelamin</label>
                  <div className="grid grid-cols-2 gap-2 bg-slate-50 p-1 rounded-xl border border-slate-200">
                    {['Putra', 'Putri'].map((g) => (
                      <button key={g} type="button" onClick={() => setNewItem({...newItem, jenis_kelamin: g})} className={`py-2 rounded-lg font-black text-[9px] tracking-widest transition-all ${newItem.jenis_kelamin === g ? (g === 'Putra' ? 'bg-blue-600 text-white shadow-md' : 'bg-rose-500 text-white shadow-md') : 'text-slate-400 hover:text-slate-600'}`}>
                        {g.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">Kategori Umur</label>
                  <select className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs outline-none focus:border-blue-600 focus:bg-white" value={newItem.kategori} onChange={e => setNewItem({...newItem, kategori: e.target.value})}>
                    {kategoriUmur.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">Nomor WhatsApp</label>
                  <input className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs outline-none focus:border-blue-600 focus:bg-white" placeholder="0812..." value={newItem.whatsapp} onChange={e => setNewItem({...newItem, whatsapp: e.target.value})} required />
                </div>
                <div className="col-span-2 space-y-1">
                  <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">Kota Domisili</label>
                  <input className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold uppercase text-xs outline-none focus:border-blue-600 focus:bg-white" placeholder="SURABAYA" value={newItem.domisili} onChange={e => setNewItem({...newItem, domisili: e.target.value})} required />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100">
                <button type="submit" disabled={isSaving || uploading} className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] shadow-xl shadow-blue-200 hover:bg-slate-900 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50">
                  {isSaving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                  Simpan Atlet ke Database
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================= MODAL EDIT ======================= */}
      {isEditModalOpen && editingItem && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setIsEditModalOpen(false)} />
          <div className="relative bg-white w-full max-w-xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300">
            <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h2 className="text-xl font-black text-slate-900 uppercase italic tracking-tighter">Edit Data <span className="text-blue-600">Atlet</span></h2>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Perbarui informasi database</p>
              </div>
              <button onClick={() => setIsEditModalOpen(false)} className="p-2.5 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl text-slate-400 transition-all"><X size={18}/></button>
            </div>
            
            <form onSubmit={handleUpdate} className="p-8 space-y-5">
              <div className="flex items-center gap-6 mb-2">
                <div className="relative">
                  <div className="w-24 h-24 rounded-[1.5rem] bg-slate-100 border-4 border-white shadow-xl overflow-hidden flex-shrink-0">
                    {editingItem.foto_url ? (
                      <img src={editingItem.foto_url} className="w-full h-full object-cover object-top" alt="preview" /> 
                    ) : (
                      <User size={32} className="m-auto mt-6 text-slate-200" />
                    )}
                    {uploading && <div className="absolute inset-0 bg-white/90 flex items-center justify-center"><Loader2 className="animate-spin text-blue-600" size={20} /></div>}
                  </div>
                  <label className="absolute -bottom-2 -right-2 p-2.5 bg-blue-600 text-white rounded-xl shadow-xl cursor-pointer hover:bg-slate-900 transition-all border-4 border-white">
                    <Camera size={14} />
                    <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'edit')} />
                  </label>
                </div>
                <div className="flex-1 space-y-1">
                  <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">Nama Lengkap</label>
                  <input className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold uppercase text-xs focus:border-blue-600 outline-none transition-all" value={editingItem.nama || ''} onChange={e => setEditingItem({...editingItem, nama: e.target.value})} required />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">Kategori Atlet</label>
                  <div className="grid grid-cols-2 gap-2 bg-slate-50 p-1 rounded-xl border border-slate-200">
                    {['Muda', 'Senior'].map((k) => (
                      <button key={k} type="button" onClick={() => setEditingItem({...editingItem, kategori_atlet: k})} className={`py-2 rounded-lg font-black text-[9px] tracking-widest transition-all ${editingItem.kategori_atlet === k ? (k === 'Muda' ? 'bg-indigo-600 text-white shadow-md' : 'bg-emerald-600 text-white shadow-md') : 'text-slate-400 hover:text-slate-600'}`}>
                        {k.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">Jenis Kelamin</label>
                  <div className="grid grid-cols-2 gap-2 bg-slate-50 p-1 rounded-xl border border-slate-200">
                    {['Putra', 'Putri'].map((g) => (
                      <button key={g} type="button" onClick={() => setEditingItem({...editingItem, jenis_kelamin: g})} className={`py-2 rounded-lg font-black text-[9px] tracking-widest transition-all ${editingItem.jenis_kelamin === g ? (g === 'Putra' ? 'bg-blue-600 text-white shadow-md' : 'bg-rose-500 text-white shadow-md') : 'text-slate-400 hover:text-slate-600'}`}>
                        {g.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">Kategori Umur</label>
                  <select className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs outline-none focus:border-blue-600" value={editingItem.kategori || ''} onChange={e => setEditingItem({...editingItem, kategori: e.target.value})}>
                    {kategoriUmur.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">WhatsApp</label>
                  <input className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs outline-none focus:border-blue-600" value={editingItem.whatsapp || ''} onChange={e => setEditingItem({...editingItem, whatsapp: e.target.value})} required />
                </div>
                <div className="col-span-2 space-y-1">
                  <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">Domisili</label>
                  <input className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold uppercase text-xs outline-none focus:border-blue-600" value={editingItem.domisili || ''} onChange={e => setEditingItem({...editingItem, domisili: e.target.value})} required />
                </div>
              </div>
              <div className="pt-4 border-t border-slate-100">
                <button type="submit" disabled={isSaving || uploading} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] shadow-xl hover:bg-blue-600 transition-all flex items-center justify-center gap-2 active:scale-95">
                  {isSaving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* LIGHTBOX PREVIEW */}
      {previewImage && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setPreviewImage(null)}>
          <div className="relative max-w-xl w-full">
            <button className="absolute -top-12 right-0 text-white hover:text-rose-500 transition-colors flex items-center gap-2 font-black uppercase text-[10px] tracking-widest">
              Tutup <X size={20} />
            </button>
            <img src={previewImage} className="w-full h-auto rounded-[2rem] border-4 border-white shadow-2xl animate-in zoom-in duration-300" alt="preview-large" />
          </div>
        </div>
      )}
    </div>
  );
}