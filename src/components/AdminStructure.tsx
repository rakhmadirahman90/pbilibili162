import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { supabase } from '../supabase';
import { 
  Plus, Trash2, Shield, Edit3, X, Upload, Loader2, 
  ImageIcon, Search, ChevronLeft, ChevronRight, 
  CheckCircle2, AlertCircle, Save, GripVertical, Eye,
  Award, ShieldCheck, Users, ChevronDown, Star, Briefcase, Target,
  Eraser, RefreshCw
} from 'lucide-react';
import Cropper from 'react-easy-crop';

// --- IMPORT LIBRARY DND-KIT ---
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DefaultAnnouncements
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';

// --- KOMPONEN NOTIFIKASI (TOAST) ---
const Toast = ({ message, type, onClose }: { message: string, type: 'success' | 'error', onClose: () => void }) => (
  <motion.div 
    initial={{ opacity: 0, y: -20, scale: 0.9 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    exit={{ opacity: 0, scale: 0.9 }}
    className={`fixed top-5 right-5 z-[1000] flex items-center gap-3 px-6 py-4 rounded-2xl border shadow-2xl ${
    type === 'success' ? 'bg-[#0F172A] border-emerald-500/50 text-emerald-400' : 'bg-[#0F172A] border-red-500/50 text-red-400'
  }`}>
    {type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
    <span className="text-[10px] font-black uppercase tracking-widest">{message}</span>
    <button onClick={onClose} className="ml-4 hover:opacity-70 transition-opacity">
      <X size={14} />
    </button>
  </motion.div>
);

// --- KOMPONEN SORTABLE ITEM UNTUK LIST ---
function SortableMemberRow({ member, onEdit, onDelete }: any) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ 
    id: member.id 
  });
  
  const style = { 
    transform: CSS.Transform.toString(transform), 
    transition, 
    zIndex: isDragging ? 100 : 1,
    opacity: isDragging ? 0.5 : 1
  };

  return (
    <div ref={setNodeRef} style={style} className={`flex items-center gap-3 p-3 mb-2 rounded-2xl border ${isDragging ? 'bg-blue-600/20 border-blue-500 shadow-2xl' : 'bg-white/5 border-white/5'} group transition-all`}>
      <button {...attributes} {...listeners} className="p-2 text-slate-600 hover:text-white cursor-grab active:cursor-grabbing">
        <GripVertical size={16} />
      </button>
      <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-800 shrink-0">
        <img 
          src={member.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name)}`} 
          className="w-full h-full object-cover" 
          onError={(e: any) => { e.target.src = "https://ui-avatars.com/api/?name=Error"; }}
        />
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="text-[11px] font-black uppercase italic truncate">{member.name}</h4>
        <p className="text-[9px] text-blue-400 font-bold uppercase tracking-tighter">{member.role} (Lvl {member.level})</p>
      </div>
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={() => onEdit(member)} className="p-2 text-amber-500 hover:bg-amber-500/10 rounded-lg transition-colors"><Edit3 size={14} /></button>
        <button onClick={() => onDelete(member)} className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"><Trash2 size={14} /></button>
      </div>
    </div>
  );
}

export default function AdminStructure() {
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{msg: string, type: 'success' | 'error'} | null>(null);
  const [isSavingOrder, setIsSavingOrder] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);

  const [formData, setFormData] = useState({
    name: '', role: '', category: 'Seksi', level: 1, photo_url: ''
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }), 
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => { fetchMembers(); }, []);
  useEffect(() => { if (toast) { const t = setTimeout(() => setToast(null), 4000); return () => clearTimeout(t); } }, [toast]);

  const fetchMembers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('organizational_structure')
        .select('*')
        .order('sort_order', { ascending: true });

      if (error) throw error;
      setMembers(data || []);
    } catch (err: any) { 
      console.error("Fetch error:", err);
      setToast({ msg: 'GAGAL MEMUAT DATA: ' + err.message, type: 'error' });
    } finally { 
      setLoading(false); 
    }
  };

  // Cleaner dimatikan karena domain pbus162.com mati
  const runCleaner = () => {
    setToast({ msg: 'FITUR CLEANER PHP NONAKTIF (DOMAIN EXPIRED)', type: 'error' });
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) {
        setToast({ msg: 'FILE TERLALU BESAR (MAX 5MB)', type: 'error' });
        return;
      }
      const reader = new FileReader();
      reader.onload = () => setImageSrc(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const onCropComplete = useCallback((_: any, pixels: any) => { setCroppedAreaPixels(pixels); }, []);

  // --- FIX: MENGGUNAKAN SUPABASE STORAGE SEBAGAI PENGGANTI PHP ---
  const handleProcessImage = async () => {
    if (!imageSrc || !croppedAreaPixels) return;
    setUploading(true);
    try {
      const canvas = document.createElement('canvas');
      const image = new Image();
      image.src = imageSrc;
      await new Promise((resolve, reject) => {
        image.onload = resolve;
        image.onerror = reject;
      });

      const ctx = canvas.getContext('2d');
      canvas.width = 400; 
      canvas.height = 400;
      
      if (ctx) {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(
          image, 
          croppedAreaPixels.x, croppedAreaPixels.y, 
          croppedAreaPixels.width, croppedAreaPixels.height, 
          0, 0, 400, 400
        );
      }

      const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/jpeg', 0.85));
      if (!blob) throw new Error("Gagal membuat blob");
      
      const fileName = `branding/member_${Date.now()}.jpg`;

      // Upload ke Supabase Storage (Bucket: assets)
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('assets')
        .upload(fileName, blob, {
          contentType: 'image/jpeg',
          upsert: true
        });

      if (uploadError) throw uploadError;

      // Ambil URL Publik
      const { data: publicUrlData } = supabase.storage
        .from('assets')
        .getPublicUrl(fileName);
      
      const finalUrl = publicUrlData.publicUrl;

      setFormData(prev => ({ ...prev, photo_url: finalUrl }));
      setImageSrc(null);
      setToast({ msg: 'FOTO BERHASIL DIUPLOAD KE STORAGE', type: 'success' });
      
    } catch (err: any) { 
      setToast({ msg: 'UPLOAD ERROR: ' + err.message, type: 'error' }); 
    } finally { 
      setUploading(false); 
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.role) return;

    setLoading(true);
    try {
      if (editingId) {
        const { error } = await supabase
          .from('organizational_structure')
          .update({
            name: formData.name,
            role: formData.role,
            category: formData.category,
            level: formData.level,
            photo_url: formData.photo_url
          })
          .eq('id', editingId);
        
        if (error) throw error;
        setToast({ msg: 'DATA BERHASIL DIPERBARUI!', type: 'success' });
        setEditingId(null);
      } else {
        const { error } = await supabase
          .from('organizational_structure')
          .insert([{
            ...formData, 
            sort_order: members.length 
          }]);
        
        if (error) throw error;
        setToast({ msg: 'PENGURUS BERHASIL DITAMBAHKAN!', type: 'success' });
      }
      
      setFormData({ name: '', role: '', category: 'Seksi', level: 1, photo_url: '' });
      await fetchMembers();
    } catch (err: any) { 
      setToast({ msg: 'DB ERROR: ' + err.message, type: 'error' }); 
    } finally { 
      setLoading(false); 
    }
  };

  const startEdit = (m: any) => {
    setEditingId(m.id);
    setFormData({ 
      name: m.name, 
      role: m.role, 
      category: m.category || 'Seksi', 
      level: m.level, 
      photo_url: m.photo_url || '' 
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setMembers((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const saveNewOrder = async () => {
    if (members.length === 0) return;
    setIsSavingOrder(true);
    try {
      const updates = members.map((m, index) => ({ 
        id: m.id, 
        sort_order: index, 
        name: m.name, 
        level: m.level, 
        role: m.role, 
        category: m.category,
        photo_url: m.photo_url 
      }));
      
      const { error } = await supabase.from('organizational_structure').upsert(updates);
      if (error) throw error;
      setToast({ msg: 'URUTAN BERHASIL DIPUBLIKASIKAN!', type: 'success' });
    } catch (err: any) { 
      setToast({ msg: 'GAGAL MENYIMPAN: ' + err.message, type: 'error' }); 
    } finally { 
      setIsSavingOrder(false); 
    }
  };

  const filteredMembers = useMemo(() => 
    members.filter(m => m.name?.toLowerCase().includes(searchTerm.toLowerCase())),
    [members, searchTerm]
  );

  const groupedFields = useMemo(() => {
    const fields: { [key: string]: any[] } = {};
    members.filter(m => m.level === 7).forEach(m => {
      const role = m.role.toLowerCase();
      let fieldName = "Lainnya";
      if (role.includes("humas")) fieldName = "Bidang Humas";
      else if (role.includes("pertandingan") || role.includes("wasit")) fieldName = "Bidang Pertandingan";
      else if (role.includes("sarana") || role.includes("prasarana")) fieldName = "Bidang Sarpras";
      else if (role.includes("prestasi") || role.includes("binpres")) fieldName = "Bidang Pembinaan Prestasi";
      else if (role.includes("pendanaan") || role.includes("usaha")) fieldName = "Bidang Dana & Usaha";
      else if (role.includes("organisasi")) fieldName = "Bidang Organisasi";
      else if (role.includes("umum")) fieldName = "Bidang Umum";
      else if (role.includes("kesehatan") || role.includes("medis")) fieldName = "Bidang Kesehatan";

      if (!fields[fieldName]) fields[fieldName] = [];
      fields[fieldName].push(m);
    });
    return fields;
  }, [members]);

  const MemberCard = ({ member, size = 'md' }: { member: any, size?: 'lg' | 'md' | 'sm' }) => (
    <motion.div 
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`bg-white rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.04)] border border-blue-50/50 flex flex-col items-center p-8 transition-all duration-500 hover:shadow-2xl ${size === 'lg' ? 'w-80' : 'w-72'}`}
    >
      <div className={`${size === 'lg' ? 'w-36 h-36' : 'w-28 h-28'} rounded-[2.2rem] overflow-hidden mb-6 bg-slate-50 border-[6px] border-white shadow-inner`}>
        <img 
          src={member.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name)}&background=0D8ABC&color=fff`} 
          className="w-full h-full object-cover" 
          alt={member.name} 
        />
      </div>
      <h3 className="text-slate-900 font-black italic uppercase text-center leading-tight tracking-tighter mb-3" style={{ fontSize: size === 'lg' ? '18px' : '15px' }}>{member.name}</h3>
      <div className="bg-amber-500 px-5 py-2 rounded-full shadow-lg shadow-amber-500/20">
        <span className="text-white font-black uppercase tracking-[0.15em]" style={{ fontSize: '9px' }}>{member.role}</span>
      </div>
    </motion.div>
  );

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-[#050505] text-white font-sans overflow-hidden">
      <AnimatePresence>
        {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      </AnimatePresence>

      {/* --- MODAL CROPPER --- */}
      {imageSrc && (
        <div className="fixed inset-0 z-[1001] bg-black/95 flex flex-col items-center justify-center p-6 backdrop-blur-sm">
          <div className="relative w-full max-w-lg aspect-square bg-[#0F172A] rounded-3xl overflow-hidden border border-white/10 shadow-2xl">
            <Cropper 
              image={imageSrc} 
              crop={crop} 
              zoom={zoom} 
              aspect={1} 
              onCropChange={setCrop} 
              onCropComplete={onCropComplete} 
              onZoomChange={setZoom} 
            />
          </div>
          <div className="mt-8 w-full max-w-lg space-y-6 bg-[#0F172A] p-6 rounded-3xl border border-white/5">
            <div className="flex items-center gap-4">
              <span className="text-[10px] font-bold text-slate-500">ZOOM</span>
              <input type="range" value={zoom} min={1} max={3} step={0.1} onChange={(e) => setZoom(Number(e.target.value))} className="flex-1 accent-blue-600" />
            </div>
            <div className="flex gap-4">
              <button onClick={() => setImageSrc(null)} className="flex-1 py-4 rounded-2xl bg-white/5 font-black uppercase text-[10px] tracking-widest hover:bg-white/10 transition-colors">Batal</button>
              <button onClick={handleProcessImage} disabled={uploading} className="flex-1 py-4 rounded-2xl bg-blue-600 font-black uppercase text-[10px] tracking-widest flex justify-center items-center gap-2 hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20 disabled:opacity-50">
                {uploading ? <Loader2 className="animate-spin" size={16} /> : 'Terapkan & Upload'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- PANEL KIRI: EDITOR --- */}
      <div className="w-full lg:w-[450px] h-screen overflow-y-auto border-r border-white/5 bg-[#0A0A0A] p-6 custom-scrollbar relative z-20">
        <header className="flex items-center gap-4 mb-8">
          <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-600/20"><Shield size={20} /></div>
          <div>
            <h1 className="text-xl font-black italic uppercase tracking-tighter">Structure Editor</h1>
            <p className="text-slate-500 text-[9px] font-black uppercase tracking-widest">Database Management</p>
          </div>
        </header>

        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
          <input 
            type="text" 
            placeholder="CARI NAMA..." 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
            className="w-full bg-[#0F172A] border border-white/5 rounded-xl py-3 pl-10 pr-4 text-[10px] font-black uppercase tracking-widest outline-none focus:border-blue-500/50 transition-all" 
          />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 mb-10 p-5 bg-[#0F172A] rounded-3xl border border-white/5 shadow-xl">
          <div className="space-y-1">
            <label className="text-[9px] font-black uppercase text-slate-500 ml-1">Nama Lengkap</label>
            <input 
              required 
              value={formData.name} 
              onChange={e => setFormData({...formData, name: e.target.value})} 
              className="w-full bg-[#050505] border border-white/10 rounded-xl px-4 py-3 text-xs focus:border-blue-500 outline-none transition-all" 
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase text-slate-500 ml-1">Jabatan</label>
              <input 
                required 
                value={formData.role} 
                onChange={e => setFormData({...formData, role: e.target.value})} 
                className="w-full bg-[#050505] border border-white/10 rounded-xl px-4 py-3 text-xs focus:border-blue-500 outline-none transition-all" 
              />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase text-slate-500 ml-1">Hierarki</label>
              <select 
                value={formData.level} 
                onChange={e => setFormData({...formData, level: parseInt(e.target.value)})} 
                className="w-full bg-[#050505] border border-white/10 rounded-xl px-4 py-3 text-[10px] font-bold outline-none cursor-pointer"
              >
                <option value={1}>Lvl 1: Png Jawab</option>
                <option value={2}>Lvl 2: Penasehat</option>
                <option value={3}>Lvl 3: Pembina</option>
                <option value={4}>Lvl 4: Ketua Umum</option>
                <option value={5}>Lvl 5: Pengurus Inti</option>
                <option value={6}>Lvl 6: K. Pelatih</option>
                <option value={7}>Lvl 7: Bidang/Anggota</option>
              </select>
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[9px] font-black uppercase text-slate-500 ml-1">Foto Profil (Auto Crop 1:1)</label>
            <div className="flex gap-3">
              <div className="flex-1 relative group h-12">
                <input type="file" accept="image/*" onChange={onFileChange} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                <div className="w-full h-full bg-[#050505] border border-dashed border-white/20 rounded-xl flex items-center justify-center text-[9px] font-black uppercase text-slate-500 group-hover:border-blue-500/50 transition-all">
                  <Upload size={14} className="mr-2" /> Pilih Foto
                </div>
              </div>
              <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 overflow-hidden shrink-0 shadow-inner flex items-center justify-center">
                {formData.photo_url ? (
                  <img src={formData.photo_url} className="w-full h-full object-cover" />
                ) : (
                  <ImageIcon className="text-slate-700" size={18}/>
                )}
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-2 pt-2">
            <button 
              type="submit" 
              disabled={loading || uploading} 
              className={`w-full py-4 rounded-xl font-black uppercase text-[10px] tracking-widest flex justify-center items-center gap-2 shadow-lg transition-all active:scale-95 disabled:opacity-50 ${editingId ? 'bg-amber-600 shadow-amber-600/20' : 'bg-blue-600 shadow-blue-600/20'}`}
            >
              {loading ? <Loader2 className="animate-spin" size={16} /> : (editingId ? 'Update Data' : 'Tambah Pengurus')}
            </button>
            {editingId && (
              <button 
                type="button" 
                onClick={() => {
                  setEditingId(null); 
                  setFormData({name:'', role:'', category:'Seksi', level:1, photo_url:''})
                }} 
                className="w-full py-2 text-[9px] font-black uppercase text-red-500 hover:text-red-400 transition-colors"
              >
                Batalkan Edit
              </button>
            )}
          </div>
        </form>

        <div className="space-y-2">
          <div className="flex items-center justify-between mb-4 px-2">
              <h3 className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Urutan Management</h3>
              <div className="flex gap-2">
                <button 
                  onClick={fetchMembers} 
                  title="Refresh Data"
                  className="p-2 bg-white/5 text-slate-400 border border-white/10 rounded-full hover:bg-white/10 transition-all"
                >
                  <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
                </button>
                <button onClick={runCleaner} title="Cleaner Nonaktif" className="p-2 bg-slate-800 text-slate-500 border border-white/10 rounded-full cursor-not-allowed">
                  <Eraser size={12} />
                </button>
                <button 
                  onClick={saveNewOrder} 
                  disabled={isSavingOrder || loading || members.length === 0} 
                  className="px-4 py-2 bg-emerald-600 text-white rounded-full text-[9px] font-black uppercase shadow-lg shadow-emerald-600/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                >
                  {isSavingOrder ? <Loader2 className="animate-spin" size={12}/> : 'Publish Sequence'}
                </button>
              </div>
          </div>
          
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={members.map(m => m.id)} strategy={verticalListSortingStrategy}>
              {filteredMembers.length > 0 ? (
                filteredMembers.map(m => (
                  <SortableMemberRow 
                    key={m.id} 
                    member={m} 
                    onEdit={startEdit} 
                    onDelete={async (member: any) => { 
                      if(confirm(`Hapus ${member.name}? Data akan dihapus permanen.`)) { 
                        try {
                          const { error } = await supabase.from('organizational_structure').delete().eq('id', member.id); 
                          if (error) throw error;
                          setToast({msg:'DATA DIHAPUS!', type:'success'}); 
                          fetchMembers(); 
                        } catch (err: any) {
                          setToast({msg: 'GAGAL HAPUS: ' + err.message, type: 'error'});
                        }
                      } 
                    }} 
                  />
                ))
              ) : (
                <div className="py-20 text-center border border-dashed border-white/5 rounded-2xl">
                  <p className="text-[9px] font-black uppercase text-slate-600 tracking-[0.2em]">
                    {searchTerm ? 'Data tidak ditemukan' : 'Database Kosong'}
                  </p>
                </div>
              )}
            </SortableContext>
          </DndContext>
        </div>
      </div>

      {/* --- PANEL KANAN: LIVE PREVIEW --- */}
      <div className="flex-1 h-screen overflow-y-auto bg-[#FBFCFE] relative custom-scrollbar z-10">
        <div className="sticky top-0 z-50 p-4 flex justify-center pointer-events-none">
            <div className="bg-white/90 backdrop-blur-md px-6 py-2 rounded-full border border-slate-200 shadow-xl flex items-center gap-3 pointer-events-auto">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Eye size={12}/> Live Preview Mode
              </span>
            </div>
        </div>

        <div className="max-w-6xl mx-auto px-6 pb-64 pt-32">
          <div className="text-center mb-40">
            <div className="inline-block px-5 py-1.5 bg-blue-50 text-blue-600 rounded-full text-[10px] font-black uppercase tracking-[0.3em] mb-6">Organizational Profile</div>
            <h1 className="text-7xl font-black text-slate-900 italic tracking-tighter mb-8 uppercase leading-none">Struktur <span className="text-blue-600">Organisasi</span></h1>
            <div className="w-32 h-2 bg-blue-600 mx-auto rounded-full mb-8"></div>
            <p className="text-slate-400 font-bold text-sm uppercase tracking-[0.4em]">PB BILI BILI 162 • Periode 2024 - 2028</p>
          </div>

          <div className="relative flex flex-col items-center">
            <div className="absolute top-0 bottom-0 w-[2px] bg-gradient-to-b from-blue-100 via-blue-200 to-transparent left-1/2 -translate-x-1/2 -z-0"></div>

            <LayoutGroup>
              {/* LEVEL 1: PENANGGUNG JAWAB */}
              <div className="relative z-10 flex flex-col items-center mb-24 w-full">
                <div className="bg-amber-500 text-white p-4 rounded-3xl mb-12 shadow-2xl ring-[12px] ring-amber-500/10 flex items-center gap-3"><ShieldCheck size={24} /><span className="text-[10px] font-black uppercase tracking-widest">Penanggung Jawab</span></div>
                <div className="flex justify-center flex-wrap gap-8">
                  {members.filter(m => m.level === 1).map(m => (<MemberCard key={m.id} member={m} size="lg" />))}
                </div>
              </div>

              {/* LEVEL 2-6: Hierarki Utama */}
              {[
                { lvl: 2, icon: Award, label: 'Jajaran Penasehat', color: 'bg-blue-600' },
                { lvl: 3, icon: Star, label: 'Jajaran Pembina', color: 'bg-indigo-600' },
                { lvl: 4, icon: Target, label: 'Ketua Umum', color: 'bg-emerald-600', size: 'lg' as const },
                { lvl: 5, icon: Briefcase, label: 'Pengurus Inti', color: 'bg-slate-800' },
                { lvl: 6, icon: Users, label: 'Kepala Pelatih', color: 'bg-orange-600' }
              ].map((section) => {
                const filtered = members.filter(m => m.level === section.lvl);
                if (filtered.length === 0) return null;
                
                return (
                  <div key={section.lvl} className="relative z-10 flex flex-col items-center mb-24 w-full">
                    <div className={`${section.color} text-white p-3 rounded-2xl mb-10 shadow-xl ring-8 ring-white flex items-center gap-3`}>
                      <section.icon size={20} /><span className="text-[10px] font-black uppercase tracking-widest">{section.label}</span>
                    </div>
                    <div className="flex flex-wrap justify-center gap-12">
                      {filtered.map(m => (<MemberCard key={m.id} member={m} size={section.size} />))}
                    </div>
                  </div>
                );
              })}

              {/* LEVEL 7: KOORDINATOR & ANGGOTA BIDANG */}
              {Object.keys(groupedFields).length > 0 && (
                <div className="relative z-10 flex flex-col items-center w-full">
                  <div className="bg-slate-400 text-white p-3 rounded-2xl mb-20 shadow-xl ring-8 ring-white flex items-center gap-3"><Users size={20} /><span className="text-[10px] font-black uppercase tracking-widest">Koordinator & Anggota Bidang</span></div>
                  <div className="space-y-32 w-full flex flex-col items-center">
                    {Object.entries(groupedFields).map(([fieldName, fieldMembers]) => {
                      const coordinator = fieldMembers.find(m => m.role.toLowerCase().includes("koordinator"));
                      const staffs = fieldMembers.filter(m => !m.role.toLowerCase().includes("koordinator"));
                      return (
                        <motion.div layout key={fieldName} className="flex flex-col items-center w-full">
                          <div className="bg-white px-8 py-2 rounded-full border border-slate-200 shadow-sm mb-12"><h2 className="text-blue-600 font-black italic uppercase text-[12px] tracking-[0.2em]">{fieldName}</h2></div>
                          {coordinator && (
                            <div className="mb-16 relative">
                              <MemberCard member={coordinator} />
                              {staffs.length > 0 && (<div className="absolute top-full left-1/2 -translate-x-1/2 w-[2px] h-16 bg-blue-100"></div>)}
                            </div>
                          )}
                          <div className="flex flex-wrap justify-center gap-6 px-4 max-w-6xl">
                            {staffs.map(m => (
                              <motion.div layout key={m.id} className="bg-white p-4 rounded-[1.8rem] shadow-sm border border-slate-100 flex items-center gap-4 w-72 hover:shadow-md transition-all hover:-translate-y-1">
                                <div className="w-14 h-14 rounded-2xl overflow-hidden bg-slate-50 border-2 border-white shadow-sm shrink-0">
                                  <img 
                                    src={m.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(m.name)}`} 
                                    className="w-full h-full object-cover" 
                                    alt={m.name}
                                  />
                                </div>
                                <div className="flex flex-col min-w-0">
                                  <h4 className="font-black text-slate-900 text-[11px] uppercase italic leading-tight truncate">{m.name}</h4>
                                  <p className="text-blue-600 font-bold text-[8px] uppercase tracking-widest mt-1">{m.role}</p>
                                </div>
                              </motion.div>
                            ))}
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              )}
            </LayoutGroup>
          </div>
        </div>
      </div>
      
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 20px; }
        .lg\\:w-\\[450px\\].custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(59,130,246,0.3); }
        select { -webkit-appearance: none; -moz-appearance: none; appearance: none; }
      `}</style>
    </div>
  );
}