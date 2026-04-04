import React, { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { 
  Plus, Trash2, Image as ImageIcon, Save, 
  Loader2, Power, PowerOff, Upload, X, Camera, Edit3, GripVertical, FileText, Download, ExternalLink 
} from 'lucide-react';
import Swal from 'sweetalert2';

// --- TAMBAHAN IMPORT UNTUK DRAG & DROP ---
import {
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface PopupConfig {
  id: string;
  url_gambar: string;
  judul: string;
  deskripsi: string;
  is_active: boolean;
  urutan: number;
  file_url?: string; 
}

// --- FUNGSI HELPER: DETEKSI & FORMAT LINK OTOMATIS (VERSI PERBAIKAN FINAL) ---
const renderDescriptionWithLinks = (text: string) => {
  if (!text) return null;
  const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/g;
  
  return text.split('\n').map((line, i) => (
    /* PERBAIKAN: break-words dan whitespace-normal memastikan baris baru tercipta */
    <p key={i} className="mb-1 last:mb-0 break-words overflow-hidden text-left whitespace-normal">
      {line.split(urlRegex).map((part, index) => {
        if (part.match(urlRegex)) {
          const cleanUrl = part.startsWith('www.') ? `https://${part}` : part;
          return (
            <a 
              key={index} 
              href={cleanUrl} 
              target="_blank" 
              rel="noopener noreferrer" 
              /* PERBAIKAN UTAMA: 
                 1. inline: agar mengalir seperti teks biasa
                 2. break-all: memutus karakter link di mana saja saat mencapai batas 
              */
              className="text-blue-400 underline hover:text-blue-300 inline break-all whitespace-normal"
            >
              {part} <ExternalLink size={10} className="inline-block mb-0.5 shrink-0" />
            </a>
          );
        }
        return <span key={index} className="break-words">{part}</span>;
      })}
    </p>
  ));
};

// --- KOMPONEN: SORTABLE ITEM ---
function SortablePopupItem({ item, toggleStatus, startEdit, handleDelete }: any) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 'auto',
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      className={`group relative bg-[#0F172A] rounded-[2.5rem] border-2 overflow-hidden transition-all duration-500 ${item.is_active ? 'border-blue-500/30' : 'border-white/5 opacity-60 grayscale hover:grayscale-0'}`}
    >
      <div className="aspect-[4/5] overflow-hidden relative bg-black">
        <div 
          {...attributes} {...listeners}
          className="absolute top-5 right-5 z-40 p-2 bg-black/50 backdrop-blur-md rounded-xl cursor-grab active:cursor-grabbing text-white/50 hover:text-blue-500 transition-colors"
        >
          <GripVertical size={20} />
        </div>

        <img 
            src={item.url_gambar} 
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
            alt={item.judul} 
        />
        <div className="absolute inset-0 z-20 bg-gradient-to-t from-[#0F172A] via-transparent to-transparent opacity-80" />
        <div className="absolute top-5 left-5 z-30 flex flex-col gap-2">
          <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest backdrop-blur-md border ${item.is_active ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-slate-900/50 text-white/50 border-white/10'}`}>
            {item.is_active ? `• POSISI ${item.urutan + 1}` : 'NON-AKTIF'}
          </span>
          {item.file_url && (
            <span className="px-3 py-1 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-full text-[8px] font-black uppercase tracking-widest backdrop-blur-md flex items-center gap-1">
              <Download size={10} /> File Attached
            </span>
          )}
        </div>
      </div>

      <div className="p-7 relative z-30 -mt-20">
        <h4 className="text-white font-black uppercase text-sm mb-2 italic line-clamp-1 tracking-tight">{item.judul || 'TANPA JUDUL'}</h4>
        {/* PERBAIKAN: Menambah break-all pada grid view */}
        <div className="text-white/50 text-[11px] font-medium mb-6 line-clamp-2 leading-relaxed min-h-[2rem] break-all">
            {item.deskripsi}
        </div>
        
        <div className="grid grid-cols-4 gap-2">
          <button onClick={() => toggleStatus(item.id, item.is_active)} className={`col-span-1 py-3 rounded-xl flex items-center justify-center transition-all ${item.is_active ? 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white' : 'bg-white/5 text-white/40 hover:bg-blue-600 hover:text-white'}`}>
            {item.is_active ? <Power size={16}/> : <PowerOff size={16}/>}
          </button>
          <button onClick={() => startEdit(item)} className="col-span-2 py-3 bg-blue-600 text-white hover:bg-blue-500 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-900/20">
            <Edit3 size={14} /> EDIT
          </button>
          <button onClick={() => handleDelete(item.id)} className="col-span-1 py-3 bg-rose-600/10 text-rose-500 hover:bg-rose-600 hover:text-white rounded-xl transition-all flex items-center justify-center">
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminPopup() {
  const [popups, setPopups] = useState<PopupConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isFileUploading, setIsFileUploading] = useState(false);
  const [newPopup, setNewPopup] = useState({ url_gambar: '', judul: '', deskripsi: '', file_url: '' });
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const fetchPopups = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('konfigurasi_popup')
      .select('*')
      .order('urutan', { ascending: true });
    
    if (!error && data) setPopups(data);
    setLoading(false);
  };

  useEffect(() => { fetchPopups(); }, []);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = popups.findIndex((p) => p.id === active.id);
    const newIndex = popups.findIndex((p) => p.id === over.id);

    const newOrder = arrayMove(popups, oldIndex, newIndex);
    setPopups(newOrder);

    const updates = newOrder.map((popup, index) => ({
      id: popup.id,
      urutan: index,
      judul: popup.judul,
      deskripsi: popup.deskripsi,
      url_gambar: popup.url_gambar,
      is_active: popup.is_active,
      file_url: popup.file_url
    }));

    const { error } = await supabase.from('konfigurasi_popup').upsert(updates);
    if (error) {
        Swal.fire('Gagal mengurutkan', error.message, 'error');
        fetchPopups();
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPreviewImage(URL.createObjectURL(file));
    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `popup-${Date.now()}.${fileExt}`;
      const filePath = `promosi/${fileName}`;
      const { error: uploadError } = await supabase.storage.from('identitas-atlet').upload(filePath, file);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('identitas-atlet').getPublicUrl(filePath);
      setNewPopup({ ...newPopup, url_gambar: publicUrl });
      Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Gambar berhasil diunggah', showConfirmButton: false, timer: 2000 });
    } catch (err: any) {
      Swal.fire('Gagal', err.message, 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsFileUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `doc-${Date.now()}.${fileExt}`;
      const filePath = `dokumen-popup/${fileName}`;
      const { error: uploadError } = await supabase.storage.from('identitas-atlet').upload(filePath, file);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('identitas-atlet').getPublicUrl(filePath);
      
      setNewPopup(prev => ({ ...prev, file_url: publicUrl }));
      
      Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'File lampiran diunggah', showConfirmButton: false, timer: 2000 });
    } catch (err: any) {
      Swal.fire('Gagal upload file', err.message, 'error');
    } finally {
      setIsFileUploading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPopup.url_gambar) return Swal.fire('Opps!', 'Harap unggah gambar terlebih dahulu', 'warning');

    setIsSaving(true);
    
    const payload = {
      judul: newPopup.judul,
      deskripsi: newPopup.deskripsi,
      url_gambar: newPopup.url_gambar,
      file_url: newPopup.file_url || null,
      is_active: true
    };

    try {
      if (editingId) {
        const { error } = await supabase
          .from('konfigurasi_popup')
          .update(payload)
          .eq('id', editingId);
          
        if (error) throw error;
        Swal.fire({ title: 'Berhasil', text: 'Pop-up diperbarui', icon: 'success', background: '#0F172A', color: '#fff' });
        setEditingId(null);
      } else {
        const { error } = await supabase
          .from('konfigurasi_popup')
          .insert([{
            ...payload,
            urutan: popups.length
          }]);
          
        if (error) throw error;
        Swal.fire({ title: 'Berhasil', text: 'Pop-up baru diaktifkan', icon: 'success', background: '#0F172A', color: '#fff' });
      }

      setNewPopup({ url_gambar: '', judul: '', deskripsi: '', file_url: '' });
      setPreviewImage(null);
      fetchPopups();
    } catch (err: any) {
      Swal.fire('Error saat menyimpan', err.message, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const startEdit = (item: PopupConfig) => {
    setEditingId(item.id);
    setNewPopup({ 
      judul: item.judul, 
      deskripsi: item.deskripsi, 
      url_gambar: item.url_gambar, 
      file_url: item.file_url || '' 
    });
    setPreviewImage(item.url_gambar);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setNewPopup({ url_gambar: '', judul: '', deskripsi: '', file_url: '' });
    setPreviewImage(null);
  };

  const toggleStatus = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase.from('konfigurasi_popup').update({ is_active: !currentStatus }).eq('id', id);
    if (!error) fetchPopups();
  };

  const handleDelete = async (id: string) => {
    const res = await Swal.fire({
      title: 'Hapus Pop-up?',
      text: "Tindakan ini tidak dapat dibatalkan!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#1e293b',
      confirmButtonText: 'Ya, Hapus!',
      background: '#0F172A',
      color: '#fff'
    });
    if (res.isConfirmed) {
      await supabase.from('konfigurasi_popup').delete().eq('id', id);
      fetchPopups();
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto min-h-screen bg-[#050505]">
      <header className="mb-10 flex justify-between items-end">
        <div>
            <h1 className="text-3xl md:text-4xl font-black text-white uppercase italic tracking-tighter">
            Kelola <span className="text-blue-500">Pop-up Promo</span>
            </h1>
            <p className="text-white/40 font-bold text-xs uppercase tracking-[0.3em] mt-2">Atur tampilan & lampiran landing page</p>
        </div>
        {editingId && (
            <button onClick={cancelEdit} className="px-6 py-2 bg-rose-600/10 text-rose-500 rounded-full text-[10px] font-black uppercase tracking-widest border border-rose-500/20 hover:bg-rose-600 hover:text-white transition-all">
                Batal Edit
            </button>
        )}
      </header>

      {/* FORM INPUT */}
      <div className={`bg-[#0F172A] rounded-[2.5rem] border transition-all duration-500 ${editingId ? 'border-blue-500/50 shadow-blue-500/10' : 'border-white/5 shadow-2xl'} mb-12 overflow-hidden`}>
        <div className="grid grid-cols-1 lg:grid-cols-5">
          <div className="lg:col-span-2 bg-black/40 flex items-center justify-center relative overflow-hidden">
            <div className="w-full h-full min-h-[400px] lg:min-h-full relative flex items-center justify-center">
              {previewImage ? (
                <div className="w-full h-full absolute inset-0 group">
                  <img src={previewImage} className="absolute inset-0 w-full h-full object-cover blur-2xl opacity-40 scale-110" alt="" />
                  <img src={previewImage} className="relative z-10 w-full h-full object-cover" alt="Preview" />
                  <div className="absolute inset-0 z-20 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <label className="cursor-pointer p-4 bg-white/10 backdrop-blur-md rounded-full border border-white/20 hover:bg-blue-600 transition-colors">
                      <Camera className="text-white" size={24} />
                      <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={isUploading} />
                    </label>
                  </div>
                  <button onClick={() => {setPreviewImage(null); setNewPopup({...newPopup, url_gambar: ''})}} className="absolute top-6 right-6 z-30 p-2 bg-rose-600 text-white rounded-full shadow-2xl hover:scale-110 transition-transform">
                    <X size={18} />
                  </button>
                </div>
              ) : (
                <label className="w-full h-full cursor-pointer flex flex-col items-center justify-center group gap-4 p-8">
                  <div className="p-6 bg-blue-600/10 rounded-full text-blue-500 border border-blue-500/20 group-hover:scale-110 group-hover:bg-blue-600 group-hover:text-white transition-all duration-500">
                    <Upload size={32} />
                  </div>
                  <div className="text-center">
                    <span className="block text-white font-black text-xs uppercase tracking-widest mb-1">Klik Untuk Unggah Poster</span>
                    <span className="text-white/30 text-[9px] uppercase tracking-tighter italic">Disarankan aspek rasio 4:5</span>
                  </div>
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={isUploading} />
                </label>
              )}
            </div>
          </div>
          <form onSubmit={handleSave} className="lg:col-span-3 p-8 lg:p-12 space-y-6 flex flex-col justify-center border-l border-white/5">
            <div className="space-y-4">
              <input required className="w-full bg-black/30 border border-white/10 rounded-2xl p-4 text-white font-bold outline-none focus:border-blue-500 transition-all" placeholder="Judul Promosi" value={newPopup.judul} onChange={e => setNewPopup({...newPopup, judul: e.target.value})} />
              
              <div className="relative group">
                <textarea 
                   className="w-full bg-black/30 border border-white/10 rounded-2xl p-4 text-white font-bold outline-none focus:border-blue-500 h-32 resize-none transition-all scrollbar-hide" 
                   placeholder="Deskripsi Informasi (Link akan otomatis terdeteksi)" 
                   value={newPopup.deskripsi} 
                   onChange={e => setNewPopup({...newPopup, deskripsi: e.target.value})} 
                />
                {/* PREVIEW TEKS REALTIME DI BAWAH INPUT (DIPERBAIKI UNTUK WRAPPING) */}
                <div className="mt-2 p-4 bg-blue-500/5 rounded-xl border border-blue-500/10 overflow-hidden w-full">
                    <p className="text-[9px] font-black uppercase tracking-widest text-blue-400 mb-2">Live Preview Deskripsi:</p>
                    <div className="text-[11px] text-white/60 leading-relaxed font-medium break-words w-full whitespace-normal">
                       {renderDescriptionWithLinks(newPopup.deskripsi) || <span className="italic opacity-30">Belum ada deskripsi...</span>}
                    </div>
                </div>
              </div>
              
              {/* INPUT FILE DOWNLOAD */}
              <div className="relative group">
                <div className={`flex items-center gap-4 p-4 rounded-2xl border-2 border-dashed transition-all ${newPopup.file_url ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-white/10 bg-black/20'}`}>
                  <div className={`p-3 rounded-xl ${newPopup.file_url ? 'bg-emerald-500 text-white' : 'bg-white/5 text-white/20'}`}>
                    <FileText size={20} />
                  </div>
                  <div className="flex-1">
                    <p className="text-white text-[10px] font-black uppercase tracking-widest">
                      {newPopup.file_url ? 'File Terlampir' : 'Lampiran Dokumen (Opsional)'}
                    </p>
                    <p className="text-white/30 text-[9px] italic">PDF, DOCX, atau Gambar</p>
                  </div>
                  <label className="cursor-pointer bg-white/5 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-[9px] font-black transition-all">
                    {isFileUploading ? 'UPLOADING...' : newPopup.file_url ? 'GANTI FILE' : 'PILIH FILE'}
                    <input type="file" className="hidden" onChange={handleFileUpload} disabled={isFileUploading} />
                  </label>
                </div>
                {newPopup.file_url && (
                  <button type="button" onClick={() => setNewPopup({...newPopup, file_url: ''})} className="absolute -top-2 -right-2 p-1 bg-rose-600 text-white rounded-full">
                    <X size={12} />
                  </button>
                )}
              </div>
            </div>

            <button type="submit" disabled={isSaving || isUploading || isFileUploading} className={`w-full py-5 rounded-2xl font-black uppercase text-[11px] tracking-[0.3em] transition-all shadow-2xl flex items-center justify-center gap-3 text-white ${editingId ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-blue-600 hover:bg-blue-700'}`}>
              {isSaving ? <Loader2 className="animate-spin" /> : editingId ? 'PERBARUI POP-UP' : 'AKTIFKAN POP-UP'}
            </button>
          </form>
        </div>
      </div>

      <div className="flex items-center gap-4 mb-8">
        <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-white/10"></div>
        <h2 className="text-white/40 font-black text-[10px] uppercase tracking-[0.5em] whitespace-nowrap">Tahan & Geser Ikon Grip Untuk Urutan</h2>
        <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent to-white/10"></div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-blue-500" size={40} /></div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={popups.map(p => p.id)} strategy={verticalListSortingStrategy}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {popups.map(item => (
                <SortablePopupItem 
                  key={item.id} 
                  item={item} 
                  toggleStatus={toggleStatus} 
                  startEdit={startEdit} 
                  handleDelete={handleDelete} 
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}