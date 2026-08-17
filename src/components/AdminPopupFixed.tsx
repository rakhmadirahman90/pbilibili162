import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../supabase';
import Swal from 'sweetalert2';
import { Edit3, Image as ImageIcon, Loader2, Power, Trash2, Upload, X, RefreshCw } from 'lucide-react';

type PopupConfig = { id: string; url_gambar: string; judul: string | null; deskripsi: string | null; is_active: boolean; urutan: number; file_url?: string | null; created_at?: string };
const emptyForm = { judul: '', deskripsi: '', url_gambar: '', file_url: '' };
const isUuid = (v: unknown): v is string => typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
const errorText = (e: any) => e?.message || e?.details || e?.hint || 'Operasi Supabase gagal.';

export default function AdminPopupFixed() {
  const [popups, setPopups] = useState<PopupConfig[]>([]), [loading, setLoading] = useState(true), [saving, setSaving] = useState(false), [uploading, setUploading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null), [preview, setPreview] = useState<string | null>(null), [form, setForm] = useState(emptyForm);
  const nextOrder = useMemo(() => popups.length ? Math.max(...popups.map(p => Number.isFinite(p.urutan) ? p.urutan : -1)) + 1 : 0, [popups]);

  const load = async (showError = true) => {
    setLoading(true);
    try { const { data, error } = await supabase.from('konfigurasi_popup').select('*').order('urutan', { ascending: true }).order('created_at', { ascending: false }); if (error) throw error; setPopups((data || []) as PopupConfig[]); }
    catch (e: any) { console.error('[Popup] load', e); if (showError) await Swal.fire('Gagal memuat', errorText(e), 'error'); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);

  const reset = () => { setEditingId(null); setPreview(null); setForm({ ...emptyForm }); };
  const upload = async (file: File) => {
    setUploading(true);
    try {
      if (!file.type.startsWith('image/')) throw new Error('File harus berupa gambar.');
      if (file.size > 10 * 1024 * 1024) throw new Error('Ukuran gambar maksimal 10 MB.');
      const ext = file.name.split('.').pop()?.toLowerCase() || 'png', path = `promosi/popup-${Date.now()}-${Math.random().toString(36).slice(2,8)}.${ext}`;
      const { error } = await supabase.storage.from('identitas-atlet').upload(path, file, { upsert: false, cacheControl: '3600' }); if (error) throw error;
      const { data } = supabase.storage.from('identitas-atlet').getPublicUrl(path); if (!data.publicUrl) throw new Error('URL gambar tidak berhasil dibuat.');
      setForm(p => ({ ...p, url_gambar: data.publicUrl })); setPreview(data.publicUrl);
    } catch (e: any) { await Swal.fire('Upload gagal', errorText(e), 'error'); } finally { setUploading(false); }
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault(); if (saving || uploading) return;
    const judul = form.judul.trim(), deskripsi = form.deskripsi.trim(), url = form.url_gambar.trim(), fileUrl = form.file_url.trim() || null;
    if (!judul) return void Swal.fire('Perhatian', 'Judul pop-up wajib diisi.', 'warning');
    if (!url) return void Swal.fire('Perhatian', 'Poster/gambar wajib diunggah.', 'warning');
    setSaving(true);
    try {
      const { data, error } = await supabase.rpc('pb162_popup_upsert', { p_id: editingId && isUuid(editingId) ? editingId : null, p_url_gambar: url, p_judul: judul, p_deskripsi: deskripsi, p_file_url: fileUrl, p_urutan: editingId ? (popups.find(p => p.id === editingId)?.urutan ?? nextOrder) : nextOrder });
      if (error) throw error;
      if (!data?.id || !isUuid(data.id)) throw new Error('RPC tidak mengembalikan ID pop-up yang valid.');
      const { data: verified, error: verifyError } = await supabase.from('konfigurasi_popup').select('*').eq('id', data.id).maybeSingle();
      if (verifyError) throw verifyError; if (!verified) throw new Error('Row tidak ditemukan saat verifikasi ulang dari Supabase.'); if (!verified.is_active) throw new Error('Pop-up tersimpan tetapi tidak aktif.');
      await load(false); reset();
      await Swal.fire({ title: 'Berhasil', text: editingId ? 'Pop-up diperbarui dan diverifikasi dari Supabase.' : 'Pop-up baru ditambahkan, diaktifkan, dan diverifikasi dari Supabase.', icon: 'success', background: '#0F172A', color: '#fff' });
    } catch (e: any) { console.error('[Popup] save', e); await Swal.fire('Gagal menyimpan', errorText(e), 'error'); }
    finally { setSaving(false); }
  };

  const edit = (p: PopupConfig) => { if (!isUuid(p.id)) return void Swal.fire('Gagal edit', 'ID pop-up tidak valid.', 'error'); setEditingId(p.id); setForm({ judul: p.judul || '', deskripsi: p.deskripsi || '', url_gambar: p.url_gambar || '', file_url: p.file_url || '' }); setPreview(p.url_gambar || null); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const activate = async (p: PopupConfig) => { try { const { data, error } = await supabase.rpc('pb162_popup_set_active', { p_id: p.id }); if (error) throw error; if (!data?.id) throw new Error('Pop-up aktif tidak dikembalikan Supabase.'); await load(false); await Swal.fire({ toast:true, position:'top-end', icon:'success', title:'Pop-up aktif diperbarui', showConfirmButton:false, timer:1500 }); } catch(e:any) { await Swal.fire('Gagal mengaktifkan', errorText(e), 'error'); } };
  const remove = async (p: PopupConfig) => {
    const r = await Swal.fire({ title:'Hapus Pop-up?', text:'Data akan dihapus permanen dari Supabase.', icon:'warning', showCancelButton:true, confirmButtonText:'Ya, hapus', cancelButtonText:'Batal', confirmButtonColor:'#e11d48', background:'#0F172A', color:'#fff' }); if (!r.isConfirmed) return;
    try { const { error } = await supabase.rpc('pb162_popup_delete', { p_id:p.id }); if (error) throw error; await load(false); if (editingId === p.id) reset(); await Swal.fire({ toast:true, position:'top-end', icon:'success', title:'Pop-up dihapus', showConfirmButton:false, timer:1500 }); } catch(e:any) { await Swal.fire('Gagal menghapus', errorText(e), 'error'); }
  };

  return <div className="min-h-screen bg-[#070d1a] text-white p-3 sm:p-6 overflow-y-auto"><div className="max-w-7xl mx-auto space-y-6">
    <div className="flex items-center justify-between gap-3"><div><h1 className="text-2xl sm:text-3xl font-black uppercase italic">Kelola <span className="text-blue-500">Pop-up Promo</span></h1><p className="text-white/40 text-xs mt-1">CRUD atomik + verifikasi langsung ke Supabase.</p></div>{editingId && <button type="button" onClick={reset} className="px-4 py-2 rounded-xl bg-rose-600/20 text-rose-400 border border-rose-500/30">Batal Edit</button>}</div>
    <form onSubmit={save} className="bg-[#0F172A] border border-white/10 rounded-3xl p-4 sm:p-7"><div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
      <div className="lg:col-span-2 min-h-[260px] rounded-2xl bg-black/40 border border-white/10 flex items-center justify-center overflow-hidden relative">{preview ? <><img src={preview} alt="Preview pop-up" className="w-full h-full object-contain max-h-[460px]"/><button type="button" onClick={()=>{setPreview(null);setForm(p=>({...p,url_gambar:''}));}} className="absolute top-3 right-3 p-2 rounded-full bg-rose-600"><X size={16}/></button></> : <label className="cursor-pointer flex flex-col items-center gap-3 p-8 text-center"><Upload size={32} className="text-blue-500"/><span className="font-bold text-sm">Unggah Poster Pop-up</span><input type="file" accept="image/*" className="hidden" disabled={uploading||saving} onChange={e=>{const f=e.target.files?.[0];if(f)void upload(f);e.currentTarget.value='';}}/></label>}{uploading&&<div className="absolute inset-0 bg-black/70 flex items-center justify-center"><Loader2 className="animate-spin"/></div>}</div>
      <div className="lg:col-span-3 space-y-4"><input required value={form.judul} onChange={e=>setForm({...form,judul:e.target.value})} placeholder="Judul Promosi" className="w-full rounded-2xl bg-black/30 border border-white/10 p-4 outline-none focus:border-blue-500"/><textarea value={form.deskripsi} onChange={e=>setForm({...form,deskripsi:e.target.value})} placeholder="Deskripsi informasi" className="w-full h-40 rounded-2xl bg-black/30 border border-white/10 p-4 outline-none focus:border-blue-500 resize-none"/><input value={form.file_url} onChange={e=>setForm({...form,file_url:e.target.value})} placeholder="URL lampiran dokumen (opsional)" className="w-full rounded-2xl bg-black/30 border border-white/10 p-4 outline-none focus:border-blue-500"/><button type="submit" disabled={saving||uploading} className="w-full py-4 rounded-2xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 font-black uppercase flex items-center justify-center gap-2">{saving?<Loader2 className="animate-spin"/>:editingId?<><Edit3 size={17}/> PERBARUI POP-UP</>:<><ImageIcon size={17}/> TAMBAH POP-UP</>}</button></div>
    </div></form>
    <div className="flex items-center justify-between"><h2 className="font-black uppercase tracking-widest text-sm text-white/60">Data Pop-up di Supabase ({popups.length})</h2><button type="button" onClick={()=>void load()} className="text-xs text-blue-400 flex items-center gap-1"><RefreshCw size={13}/> Refresh</button></div>
    {loading?<div className="py-16 flex justify-center"><Loader2 className="animate-spin text-blue-500" size={36}/></div>:popups.length===0?<div className="py-16 text-center text-white/30 border border-dashed border-white/10 rounded-3xl">Belum ada pop-up di database Supabase.</div>:<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">{popups.map(p=><div key={p.id} className="bg-[#0F172A] border border-white/10 rounded-3xl overflow-hidden"><div className="aspect-[4/5] bg-black"><img src={p.url_gambar} alt={p.judul||'Pop-up'} className="w-full h-full object-cover"/></div><div className="p-5 space-y-3"><span className={`inline-block text-[10px] font-black uppercase px-3 py-1 rounded-full ${p.is_active?'bg-emerald-500/20 text-emerald-400':'bg-white/10 text-white/40'}`}>{p.is_active?'AKTIF':'NON-AKTIF'}</span><h3 className="font-black uppercase text-sm line-clamp-2">{p.judul||'Tanpa judul'}</h3><p className="text-xs text-white/40 line-clamp-3">{p.deskripsi||'-'}</p><div className="grid grid-cols-3 gap-2"><button type="button" disabled={p.is_active} onClick={()=>void activate(p)} className="py-3 rounded-xl bg-white/5 hover:bg-blue-600 disabled:opacity-40 flex justify-center"><Power size={16}/></button><button type="button" onClick={()=>edit(p)} className="py-3 rounded-xl bg-blue-600 flex justify-center"><Edit3 size={16}/></button><button type="button" onClick={()=>void remove(p)} className="py-3 rounded-xl bg-rose-600/20 text-rose-400 hover:bg-rose-600 hover:text-white flex justify-center"><Trash2 size={16}/></button></div></div></div>)}</div>}
  </div></div>;
}
