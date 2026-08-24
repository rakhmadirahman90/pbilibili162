import React, { useEffect, useRef, useState } from 'react';
import { Edit, Eye, Image as ImageIcon, Loader2, Mail, MessageCircle, Move, Plus, Printer, Send, Trash2, Upload, X } from 'lucide-react';
import Swal from 'sweetalert2';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { supabase } from '../supabase';

type Surat = any;

const today = () => new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
const emptyForm: Surat = {
  nomor_surat: '', lampiran: '-', perihal: '', tempat_tanggal: `Parepare, ${today()}`,
  tujuan_yth: '', jabatan_tujuan: '', isi_surat: '', nama_ketua: 'H. Wawan', nama_sekretaris: 'H. Barhaman Muin S.Ag',
  logo_url: '', ttd_ketua_url: '', ttd_sekretaris_url: '', cap_stempel_url: '',
  logo_scale: 100, ttd_ketua_scale: 100, ttd_sekretaris_scale: 100, stempel_scale: 100,
  logo_pos: { x: 0, y: 0 }, ttd_ketua_pos: { x: 0, y: 0 }, ttd_sekretaris_pos: { x: 0, y: 0 }, stempel_pos: { x: -40, y: 0 },
};

const latestFirst = (rows: Surat[]) => [...rows].sort((a, b) => new Date(b.updated_at || b.created_at || 0).getTime() - new Date(a.updated_at || a.created_at || 0).getTime());

export function KelolaSurat() {
  const [suratList, setSuratList] = useState<Surat[]>([]);
  const [formData, setFormData] = useState<Surat>(emptyForm);
  const [editId, setEditId] = useState<string | null>(null);
  const [previewOnly, setPreviewOnly] = useState(false);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const printRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);

  const fetchSurat = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('arsip_surat').select('*').order('updated_at', { ascending: false });
    if (error) console.error(error);
    setSuratList(data || []);
    setLoading(false);
  };
  useEffect(() => { fetchSurat(); }, []);

  const applyLatestIdentity = (base: Surat, source: Surat | undefined) => source ? ({
    ...base,
    logo_url: source.logo_url || '', ttd_ketua_url: source.ttd_ketua_url || '', ttd_sekretaris_url: source.ttd_sekretaris_url || '', cap_stempel_url: source.cap_stempel_url || '',
    nama_ketua: source.nama_ketua || base.nama_ketua, nama_sekretaris: source.nama_sekretaris || base.nama_sekretaris,
    logo_scale: source.logo_scale ?? 100, ttd_ketua_scale: source.ttd_ketua_scale ?? 100, ttd_sekretaris_scale: source.ttd_sekretaris_scale ?? 100, stempel_scale: source.stempel_scale ?? 100,
    logo_pos: source.logo_pos || { x: 0, y: 0 }, ttd_ketua_pos: source.ttd_ketua_pos || { x: 0, y: 0 }, ttd_sekretaris_pos: source.ttd_sekretaris_pos || { x: 0, y: 0 }, stempel_pos: source.stempel_pos || { x: -40, y: 0 }
  }) : base;

  const prepareNew = () => {
    const latest = latestFirst(suratList)[0];
    const last = latest?.nomor_surat || '000/PB-Bilibili162/VIII/2026';
    const n = parseInt(last.split('/')[0], 10);
    const next = Number.isFinite(n) ? String(n + 1).padStart(3, '0') : '001';
    const suffix = last.includes('/') ? last.substring(last.indexOf('/')) : '/PB-Bilibili162/VIII/2026';
    setEditId(null); setPreviewOnly(false); setFormData(applyLatestIdentity({ ...emptyForm, nomor_surat: `${next}${suffix}` }, latest)); setOpen(true);
  };

  const edit = (s: Surat) => { setEditId(s.id); setPreviewOnly(false); setFormData({ ...emptyForm, ...s }); setOpen(true); };
  const preview = (s: Surat) => { setEditId(null); setPreviewOnly(true); setFormData({ ...emptyForm, ...s }); setOpen(true); };

  const uploadImage = (e: React.ChangeEvent<HTMLInputElement>, field: string) => {
    if (previewOnly) return;
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader(); reader.onload = () => setFormData((p: Surat) => ({ ...p, [field]: reader.result })); reader.readAsDataURL(file);
  };

  const save = async () => {
    setSaving(true);
    try {
      const payload = { ...formData, stempel_pos: formData.stempel_pos || { x: -40, y: 0 } };
      delete payload.id; delete payload.created_at; delete payload.updated_at;
      const result = editId ? await supabase.from('arsip_surat').update(payload).eq('id', editId) : await supabase.from('arsip_surat').insert([payload]);
      if (result.error) throw result.error;
      await fetchSurat(); setOpen(false); Swal.fire('Berhasil', editId ? 'Surat diperbarui dengan identitas terakhir.' : 'Surat disimpan.', 'success');
    } catch (e: any) { Swal.fire('Gagal menyimpan', e.message, 'error'); }
    finally { setSaving(false); }
  };

  const remove = async (id: string) => {
    const r = await Swal.fire({ title: 'Hapus Surat?', icon: 'warning', showCancelButton: true, confirmButtonText: 'Ya, Hapus' });
    if (!r.isConfirmed) return;
    await supabase.from('arsip_surat').delete().eq('id', id); fetchSurat();
  };

  const moveStamp = (e: React.MouseEvent) => {
    if (!dragging || previewOnly) return;
    const p = formData.stempel_pos || { x: -40, y: 0 };
    setFormData((f: Surat) => ({ ...f, stempel_pos: { x: p.x + e.movementX, y: p.y + e.movementY } }));
  };

  const print = () => {
    if (!printRef.current) return;
    const w = window.open('', '_blank'); if (!w) return;
    w.document.write(`<html><head><title>Surat PB Bilibili 162</title><script src="https://cdn.tailwindcss.com"></script><style>@page{size:A4;margin:0}body{margin:0;font-family:'Times New Roman',serif}.no-print{display:none!important}</style></head><body><div>${printRef.current.innerHTML}</div><script>window.onload=()=>setTimeout(()=>{window.print();window.close()},500)</script></body></html>`); w.document.close();
  };

  const whatsapp = async () => {
    if (!printRef.current) return;
    setSaving(true);
    try {
      const canvas = await html2canvas(printRef.current, { scale: 2, useCORS: true, backgroundColor: '#fff' });
      const pdf = new jsPDF('p', 'mm', 'a4'); const width = pdf.internal.pageSize.getWidth(); pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, width, canvas.height * width / canvas.width);
      const blob = pdf.output('blob'); const name = `surat_${(formData.nomor_surat || 'PB').replace(/[/\\?%*:|"<>]/g, '-')}_${Date.now()}.pdf`;
      const { error } = await supabase.storage.from('surat-pdf').upload(name, blob, { contentType: 'application/pdf', upsert: true }); if (error) throw error;
      const { data } = supabase.storage.from('surat-pdf').getPublicUrl(name);
      const msg = `*SURAT RESMI - PB BILIBILI 162*\n\nYth. *${formData.tujuan_yth || ''}*\n${formData.jabatan_tujuan || ''}\n\nBerikut surat resmi terkait *${formData.perihal || ''}*:\n${data.publicUrl}\n\nTerima kasih.\n*Admin PB Bilibili 162*`;
      window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
    } catch (e: any) { Swal.fire('Gagal', e.message, 'error'); } finally { setSaving(false); }
  };

  const filtered = suratList.filter(s => `${s.nomor_surat || ''} ${s.perihal || ''}`.toLowerCase().includes(search.toLowerCase()));
  return <div className="p-6 md:p-10 text-white max-w-7xl mx-auto min-h-screen font-sans">
    <div className="flex justify-between items-center mb-8"><div className="flex gap-4 items-center"><Mail size={32} className="text-blue-400"/><div><h1 className="text-3xl font-black italic uppercase">Administrasi Surat</h1><p className="text-slate-400">PB Bilibili 162 Parepare</p></div></div><button onClick={prepareNew} className="px-5 py-3 bg-blue-600 rounded-xl font-bold flex gap-2 items-center"><Plus size={18}/> Buat Surat Baru</button></div>
    <div className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden"><div className="p-5"><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Cari nomor atau perihal..." className="w-full max-w-md p-3 bg-slate-900/60 rounded-xl border border-white/10"/></div><div className="overflow-x-auto"><table className="w-full"><thead><tr className="bg-white/5 text-xs text-slate-400"><th className="p-4 text-left">No. Surat</th><th className="p-4 text-left">Perihal</th><th className="p-4 text-left">Terakhir Diubah</th><th className="p-4 text-right">Aksi</th></tr></thead><tbody>{filtered.map(s=><tr key={s.id} className="border-t border-white/5"><td className="p-4 font-bold text-blue-400">{s.nomor_surat}</td><td className="p-4 text-slate-300">{s.perihal}</td><td className="p-4 text-slate-500 text-xs">{new Date(s.updated_at || s.created_at).toLocaleString('id-ID')}</td><td className="p-4"><div className="flex justify-end gap-2"><button onClick={()=>preview(s)} className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg"><Eye size={15}/></button><button onClick={()=>edit(s)} className="p-2 bg-blue-500/10 text-blue-400 rounded-lg"><Edit size={15}/></button><button onClick={()=>remove(s.id)} className="p-2 bg-rose-500/10 text-rose-400 rounded-lg"><Trash2 size={15}/></button></div></td></tr>)}</tbody></table>{!filtered.length&&!loading&&<p className="p-10 text-center text-slate-500">Belum ada data surat.</p>}</div></div>
    {open&&<div className="fixed inset-0 z-[999] bg-black/95 flex items-center justify-center p-4 overflow-auto"><div className="bg-[#0F172A] w-full max-w-[96%] h-[92vh] rounded-3xl overflow-hidden flex flex-col md:flex-row">
      {!previewOnly&&<div className="w-full md:w-1/3 p-5 overflow-y-auto border-r border-white/10"><div className="flex justify-between mb-4"><b>{editId?'Edit Surat':'Buat Surat Baru'}</b><button onClick={()=>setOpen(false)}><X/></button></div>
        <div className="grid grid-cols-2 gap-2 mb-4">{[['logo_url','Logo Kop',ImageIcon],['cap_stempel_url','Cap Stempel',Upload],['ttd_ketua_url','TTD Ketua',Upload],['ttd_sekretaris_url','TTD Sekretaris',Upload]].map(([field,label,Icon]:any)=><label key={field} className="p-3 border border-dashed border-white/10 rounded-xl text-center cursor-pointer"><Icon size={16} className="mx-auto mb-1"/><span className="text-[9px] block">{label}</span><input type="file" accept="image/*" className="hidden" onChange={e=>uploadImage(e,field)}/></label>)}</div>
        {[['nomor_surat','Nomor Surat'],['nama_ketua','Ketua'],['nama_sekretaris','Sekretaris'],['tujuan_yth','Tujuan (Yth)'],['jabatan_tujuan','Jabatan Tujuan'],['perihal','Perihal']].map(([field,label])=><label key={field} className="block text-[10px] font-bold text-slate-400 uppercase mb-3">{label}<input value={formData[field]||''} onChange={e=>setFormData({...formData,[field]:e.target.value})} className="mt-1 w-full p-2.5 bg-white/5 border border-white/10 rounded-lg text-sm normal-case font-normal"/></label>)}
        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-4">Isi Surat<textarea value={formData.isi_surat||''} onChange={e=>setFormData({...formData,isi_surat:e.target.value})} className="mt-1 w-full h-32 p-2.5 bg-white/5 border border-white/10 rounded-lg text-sm normal-case font-normal"/></label>
        <div className="flex gap-2"><button disabled={saving} onClick={save} className="flex-1 p-3 bg-blue-600 rounded-xl font-bold flex justify-center gap-2">{saving?<Loader2 className="animate-spin" size={16}/>:<Send size={16}/>} Simpan</button><button onClick={print} className="p-3 bg-slate-700 rounded-xl"><Printer size={16}/></button></div>
      </div>}
      <div className="flex-1 bg-slate-800 p-6 overflow-auto relative" onMouseMove={moveStamp} onMouseUp={()=>setDragging(false)}><div className="absolute right-6 top-5 z-50 flex gap-2 no-print"><button onClick={whatsapp} disabled={saving} className="px-3 py-2 bg-green-600 rounded-lg text-xs font-bold"><MessageCircle size={14} className="inline mr-1"/> WA</button><button onClick={print} className="px-3 py-2 bg-blue-600 rounded-lg text-xs font-bold"><Printer size={14} className="inline mr-1"/> PDF</button><button onClick={()=>setOpen(false)} className="p-2 bg-white/10 rounded-lg"><X size={18}/></button></div>
        <div ref={printRef} className="bg-white text-black p-[1.5cm] mx-auto w-[21cm] min-h-[29.7cm] font-serif text-[11pt] leading-relaxed relative">
          <div className="flex items-center border-b-4 border-black pb-2 mb-6"><div className="w-24 h-24 mr-4 flex items-center justify-center">{formData.logo_url?<img src={formData.logo_url} className="w-full h-full object-contain"/>:<b className="text-3xl border-4 border-black rounded-full p-3">PB</b>}</div><div className="text-center flex-1"><h1 className="text-2xl font-bold">PB BILIBILI 162</h1><p className="text-[8pt]">Sekretariat: Jl. Andi Makkasau No.171, Ujung Lare, Kec. Soreang, Kota Parepare, Sulawesi Selatan 91131</p><p className="text-[8pt]">Telepon: 081219027234 | Email: pbilibili162@gmail.com</p></div></div>
          <div className="flex justify-between mb-6"><div><p>Nomor : {formData.nomor_surat}</p><p>Lampiran : {formData.lampiran}</p><p>Perihal : <b>{formData.perihal}</b></p></div><p>{formData.tempat_tanggal}</p></div>
          <div className="mb-6"><p>Kepada Yth.</p><p className="font-bold">{formData.tujuan_yth}</p><p>{formData.jabatan_tujuan}</p><p>Di - Tempat</p></div>
          <div className="space-y-4 text-justify"><p>Assalamu'alaikum Warahmatullahi Wabarakatuh,</p><p className="font-bold">Dengan hormat,</p><p className="whitespace-pre-line">{formData.isi_surat}</p></div>
          <div className="mt-12 flex justify-between px-10"><div className="text-center w-48 relative"><p className="mb-16">Ketua,</p>{formData.ttd_ketua_url&&<img src={formData.ttd_ketua_url} className="absolute top-6 left-1/2 -translate-x-1/2 h-20 object-contain mix-blend-multiply"/>}{formData.cap_stempel_url&&<div onMouseDown={()=>!previewOnly&&setDragging(true)} style={{transform:`translate(${formData.stempel_pos?.x||-40}px,${formData.stempel_pos?.y||0}px)`,width:`${(formData.stempel_scale||100)/100*7}rem`,height:`${(formData.stempel_scale||100)/100*7}rem`}} className="absolute top-4 left-1/2 cursor-move z-20"><img src={formData.cap_stempel_url} className="w-full h-full object-contain opacity-80 mix-blend-darken"/>{!previewOnly&&<Move size={14} className="absolute top-1 right-1 text-blue-500"/>}</div>}<p className="font-bold underline uppercase">{formData.nama_ketua}</p></div><div className="text-center w-48 relative"><p className="mb-16">Sekretaris,</p>{formData.ttd_sekretaris_url&&<img src={formData.ttd_sekretaris_url} className="absolute top-6 left-1/2 -translate-x-1/2 h-20 object-contain mix-blend-multiply"/>}<p className="font-bold underline uppercase">{formData.nama_sekretaris}</p></div></div>
        </div>
      </div>
    </div></div>}
  </div>;
}
