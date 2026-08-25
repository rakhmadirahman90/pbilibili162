import React, { useEffect, useRef, useState } from 'react';
import { Edit, Eye, FileText, Image as ImageIcon, Loader2, Mail, MessageCircle, Move, Plus, Printer, Send, Trash2, Upload, UploadCloud, X } from 'lucide-react';
import Swal from 'sweetalert2';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { supabase } from '../supabase';

type Surat = any;
type LayoutField = 'stempel' | 'ttd_ketua' | 'ttd_sekretaris';
type Pos = { x: number; y: number };

const today = () => new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
const DEFAULT_POS: Record<LayoutField, Pos> = {
  stempel: { x: -40, y: 0 },
  ttd_ketua: { x: 0, y: 0 },
  ttd_sekretaris: { x: 0, y: 0 },
};
const DEFAULT_SCALE: Record<LayoutField, number> = { stempel: 100, ttd_ketua: 100, ttd_sekretaris: 100 };
const emptyForm: Surat = {
  nomor_surat: '', lampiran: '-', perihal: '', tempat_tanggal: `Parepare, ${today()}`,
  tujuan_yth: '', jabatan_tujuan: '', isi_surat: '', nama_ketua: 'H. Wawan', nama_sekretaris: 'H. Barhaman Muin S.Ag',
  logo_url: '', ttd_ketua_url: '', ttd_sekretaris_url: '', cap_stempel_url: '', document_html: '',
  source_file_url: '', source_file_name: '', source_file_type: '', source_file_size: null,
  logo_scale: 100, ttd_ketua_scale: 100, ttd_sekretaris_scale: 100, stempel_scale: 100,
  logo_pos: { x: 0, y: 0 }, ...Object.fromEntries(Object.entries(DEFAULT_POS).map(([k, v]) => [`${k}_pos`, v])),
};

const clonePos = (value: any, field: LayoutField): Pos => ({
  x: Number.isFinite(Number(value?.x)) ? Number(value.x) : DEFAULT_POS[field].x,
  y: Number.isFinite(Number(value?.y)) ? Number(value.y) : DEFAULT_POS[field].y,
});
const scaleValue = (value: any, field: LayoutField) => {
  const n = Number(value);
  return Number.isFinite(n) ? Math.min(220, Math.max(40, n)) : DEFAULT_SCALE[field];
};
const latestFirst = (rows: Surat[]) => [...rows].sort((a, b) => new Date(b.updated_at || b.created_at || 0).getTime() - new Date(a.updated_at || a.created_at || 0).getTime());

const sanitizeImportedHtml = (html: string) => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  doc.querySelectorAll('script,iframe,object,embed,form,link,meta,style').forEach((el) => el.remove());
  doc.querySelectorAll('*').forEach((el) => {
    [...el.attributes].forEach((attr) => {
      if (attr.name.toLowerCase().startsWith('on')) el.removeAttribute(attr.name);
      if ((attr.name === 'href' || attr.name === 'src') && /^\s*javascript:/i.test(attr.value)) el.removeAttribute(attr.name);
    });
  });
  return doc.body.innerHTML;
};

const loadScript = (id: string, src: string) => new Promise<void>((resolve, reject) => {
  const existing = document.getElementById(id) as HTMLScriptElement | null;
  if (existing) {
    if ((existing as any).dataset.loaded === '1') return resolve();
    existing.addEventListener('load', () => resolve(), { once: true });
    existing.addEventListener('error', () => reject(new Error(`Gagal memuat ${id}`)), { once: true });
    return;
  }
  const script = document.createElement('script');
  script.id = id;
  script.src = src;
  script.async = true;
  script.onload = () => { (script as any).dataset.loaded = '1'; resolve(); };
  script.onerror = () => reject(new Error(`Gagal memuat mesin import dokumen. Periksa koneksi internet.`));
  document.head.appendChild(script);
});

const textToHtml = (text: string) => text.split(/\n{2,}/).map((block) => `<p>${block.trim().replace(/\n/g, '<br/>')}</p>`).filter((x) => x !== '<p></p>').join('');

export function KelolaSurat() {
  const [suratList, setSuratList] = useState<Surat[]>([]);
  const [formData, setFormData] = useState<Surat>(emptyForm);
  const [editId, setEditId] = useState<string | null>(null);
  const [previewOnly, setPreviewOnly] = useState(false);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [layoutSaving, setLayoutSaving] = useState(false);
  const [documentSaving, setDocumentSaving] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importStatus, setImportStatus] = useState('');
  const [search, setSearch] = useState('');
  const printRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const documentTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const layoutRef = useRef<Surat>(emptyForm);
  const [dragging, setDragging] = useState<LayoutField | null>(null);
  const dragLast = useRef<{ x: number; y: number } | null>(null);

  const fetchSurat = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('arsip_surat').select('*').order('updated_at', { ascending: false });
    if (error) console.error(error);
    setSuratList(data || []);
    setLoading(false);
  };
  useEffect(() => { fetchSurat(); }, []);
  useEffect(() => { layoutRef.current = formData; }, [formData]);
  useEffect(() => () => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    if (documentTimer.current) clearTimeout(documentTimer.current);
  }, []);

  const normalizeLayout = (source: Surat) => ({
    ...source,
    stempel_pos: clonePos(source.stempel_pos, 'stempel'),
    ttd_ketua_pos: clonePos(source.ttd_ketua_pos, 'ttd_ketua'),
    ttd_sekretaris_pos: clonePos(source.ttd_sekretaris_pos, 'ttd_sekretaris'),
    stempel_scale: scaleValue(source.stempel_scale, 'stempel'),
    ttd_ketua_scale: scaleValue(source.ttd_ketua_scale, 'ttd_ketua'),
    ttd_sekretaris_scale: scaleValue(source.ttd_sekretaris_scale, 'ttd_sekretaris'),
  });

  const applyLatestIdentity = (base: Surat, source: Surat | undefined) => source ? normalizeLayout({
    ...base,
    logo_url: source.logo_url || '', ttd_ketua_url: source.ttd_ketua_url || '', ttd_sekretaris_url: source.ttd_sekretaris_url || '', cap_stempel_url: source.cap_stempel_url || '',
    nama_ketua: source.nama_ketua || base.nama_ketua, nama_sekretaris: source.nama_sekretaris || base.nama_sekretaris,
    logo_scale: source.logo_scale ?? 100, logo_pos: source.logo_pos || { x: 0, y: 0 },
  }) : normalizeLayout(base);

  const prepareNew = () => {
    const latest = latestFirst(suratList)[0];
    const last = latest?.nomor_surat || '000/PB-Bilibili162/VIII/2026';
    const n = parseInt(last.split('/')[0], 10);
    const next = Number.isFinite(n) ? String(n + 1).padStart(3, '0') : '001';
    const suffix = last.includes('/') ? last.substring(last.indexOf('/')) : '/PB-Bilibili162/VIII/2026';
    setEditId(null); setPreviewOnly(false); setFormData(applyLatestIdentity({ ...emptyForm, nomor_surat: `${next}${suffix}` }, latest)); setOpen(true);
  };

  const edit = (s: Surat) => { setEditId(s.id); setPreviewOnly(false); setFormData(normalizeLayout({ ...emptyForm, ...s })); setOpen(true); };
  const preview = (s: Surat) => { setEditId(s.id); setPreviewOnly(false); setFormData(normalizeLayout({ ...emptyForm, ...s })); setOpen(true); };

  const persistLayout = async (next: Surat, showSuccess = false) => {
    if (!editId) return;
    const layoutPayload = {
      stempel_pos: clonePos(next.stempel_pos, 'stempel'), ttd_ketua_pos: clonePos(next.ttd_ketua_pos, 'ttd_ketua'), ttd_sekretaris_pos: clonePos(next.ttd_sekretaris_pos, 'ttd_sekretaris'),
      stempel_scale: scaleValue(next.stempel_scale, 'stempel'), ttd_ketua_scale: scaleValue(next.ttd_ketua_scale, 'ttd_ketua'), ttd_sekretaris_scale: scaleValue(next.ttd_sekretaris_scale, 'ttd_sekretaris'),
    };
    setLayoutSaving(true);
    const { error } = await supabase.from('arsip_surat').update(layoutPayload).eq('id', editId);
    setLayoutSaving(false);
    if (error) { console.error('Gagal menyimpan layout surat:', error); if (showSuccess) Swal.fire('Gagal', `Ukuran/posisi belum tersimpan: ${error.message}`, 'error'); return false; }
    setSuratList((rows) => rows.map((row) => row.id === editId ? { ...row, ...layoutPayload } : row));
    if (showSuccess) Swal.fire({ toast: true, position: 'top-end', timer: 1200, showConfirmButton: false, icon: 'success', title: 'Posisi & ukuran tersimpan' });
    return true;
  };

  const scheduleLayoutSave = (next: Surat) => {
    layoutRef.current = next;
    if (!editId) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => { void persistLayout(layoutRef.current); }, 450);
  };

  const updateLayout = (field: LayoutField, patch: Partial<Pos> = {}, scale?: number) => {
    const posKey = `${field}_pos`; const scaleKey = `${field}_scale`; const current = layoutRef.current;
    const next = normalizeLayout({ ...current, [posKey]: { ...clonePos(current[posKey], field), ...patch }, ...(scale !== undefined ? { [scaleKey]: scaleValue(scale, field) } : {}) });
    setFormData(next); scheduleLayoutSave(next);
  };

  const handleDragStart = (field: LayoutField, e: React.MouseEvent) => {
    if (previewOnly || !editId) return;
    e.preventDefault(); e.stopPropagation(); setDragging(field); dragLast.current = { x: e.clientX, y: e.clientY };
  };
  const handlePreviewMove = (e: React.MouseEvent) => {
    if (!dragging || previewOnly) return;
    const last = dragLast.current; if (!last) return;
    const dx = e.clientX - last.x, dy = e.clientY - last.y; if (!dx && !dy) return;
    dragLast.current = { x: e.clientX, y: e.clientY };
    const p = clonePos(layoutRef.current[`${dragging}_pos`], dragging);
    updateLayout(dragging, { x: p.x + dx, y: p.y + dy });
  };
  const handlePreviewUp = () => {
    if (!dragging) return;
    setDragging(null); dragLast.current = null;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    void persistLayout(layoutRef.current, true);
  };

  const uploadImage = (e: React.ChangeEvent<HTMLInputElement>, field: string) => {
    if (previewOnly) return;
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader(); reader.onload = () => setFormData((p: Surat) => ({ ...p, [field]: reader.result })); reader.readAsDataURL(file);
  };

  const scheduleDocumentSave = (html: string) => {
    if (!editId) return;
    const clean = sanitizeImportedHtml(html);
    const plain = new DOMParser().parseFromString(clean, 'text/html').body.textContent?.trim() || '';
    setFormData((p: Surat) => ({ ...p, document_html: clean, isi_surat: plain }));
    if (documentTimer.current) clearTimeout(documentTimer.current);
    documentTimer.current = setTimeout(async () => {
      setDocumentSaving(true);
      const { error } = await supabase.from('arsip_surat').update({ document_html: clean, isi_surat: plain }).eq('id', editId);
      setDocumentSaving(false);
      if (error) console.error('Gagal autosave dokumen import:', error);
      else setSuratList((rows) => rows.map((row) => row.id === editId ? { ...row, document_html: clean, isi_surat: plain } : row));
    }, 700);
  };

  const extractWord = async (file: File) => {
    await loadScript('pb162-mammoth', 'https://cdn.jsdelivr.net/npm/mammoth@1.12.1/mammoth.browser.min.js');
    const mammoth = (window as any).mammoth;
    if (!mammoth) throw new Error('Mesin Word tidak tersedia.');
    const result = await mammoth.convertToHtml({ arrayBuffer: await file.arrayBuffer() });
    return sanitizeImportedHtml(result.value || '<p></p>');
  };

  const extractPdf = async (file: File) => {
    await loadScript('pb162-pdfjs', 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js');
    const pdfjsLib = (window as any).pdfjsLib;
    if (!pdfjsLib) throw new Error('Mesin PDF tidak tersedia.');
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
    const pdf = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
    const pages: string[] = [];
    for (let pageNo = 1; pageNo <= pdf.numPages; pageNo += 1) {
      setImportStatus(`Membaca halaman ${pageNo} dari ${pdf.numPages}…`);
      const page = await pdf.getPage(pageNo);
      const content = await page.getTextContent();
      const items = (content.items || []) as any[];
      let lines: string[] = [];
      let lastY: number | null = null;
      let line = '';
      items.forEach((item) => {
        const y = Number(item.transform?.[5] || 0);
        const text = String(item.str || '').trim();
        if (!text) return;
        if (lastY !== null && Math.abs(y - lastY) > 4) { if (line.trim()) lines.push(line.trim()); line = ''; }
        line += `${line ? ' ' : ''}${text}`;
        lastY = y;
      });
      if (line.trim()) lines.push(line.trim());
      pages.push(`<div class="pdf-import-page" data-page="${pageNo}">${textToHtml(lines.join('\n\n'))}</div>`);
    }
    return sanitizeImportedHtml(pages.join('<div style="page-break-after:always"></div>'));
  };

  const importDocument = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    if (file.size > 15 * 1024 * 1024) { Swal.fire('File terlalu besar', 'Maksimal 15 MB per dokumen.', 'warning'); e.target.value = ''; return; }
    const lower = file.name.toLowerCase();
    const isWord = lower.endsWith('.docx'); const isPdf = lower.endsWith('.pdf');
    if (!isWord && !isPdf) { Swal.fire('Format tidak didukung', 'Gunakan Word (.docx) atau PDF (.pdf).', 'warning'); e.target.value = ''; return; }
    setImporting(true); setImportStatus('Mengunggah dokumen asli ke Supabase…');
    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, '-');
      const path = `import/${new Date().toISOString().slice(0,10)}/${crypto.randomUUID()}-${safeName}`;
      const upload = await supabase.storage.from('surat-pdf').upload(path, file, { contentType: file.type || (isPdf ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'), upsert: false });
      if (upload.error) throw upload.error;
      const publicUrl = supabase.storage.from('surat-pdf').getPublicUrl(path).data.publicUrl;
      setImportStatus(isWord ? 'Mengonversi Word menjadi dokumen editable…' : 'Mengekstrak teks PDF menjadi dokumen editable…');
      const html = isWord ? await extractWord(file) : await extractPdf(file);
      const plain = new DOMParser().parseFromString(html, 'text/html').body.textContent?.trim() || '';
      if (!plain && !html.replace(/<[^>]+>/g, '').trim()) throw new Error('Dokumen tidak memiliki teks yang dapat diedit. PDF hasil scan/gambar memerlukan OCR.');
      const latest = latestFirst(suratList)[0];
      const last = latest?.nomor_surat || '000/PB-Bilibili162/VIII/2026';
      const n = parseInt(last.split('/')[0], 10);
      const next = Number.isFinite(n) ? String(n + 1).padStart(3, '0') : '001';
      const suffix = last.includes('/') ? last.substring(last.indexOf('/')) : '/PB-Bilibili162/VIII/2026';
      const payload = normalizeLayout({ ...applyLatestIdentity({ ...emptyForm, nomor_surat: `${next}${suffix}` }, latest), perihal: `Import: ${file.name}`, isi_surat: plain, document_html: html, source_file_url: publicUrl, source_file_name: file.name, source_file_type: file.type || (isPdf ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'), source_file_size: file.size });
      setImportStatus('Menyimpan dokumen editable ke Supabase…');
      const { data, error } = await supabase.from('arsip_surat').insert([payload]).select('*').single();
      if (error) throw error;
      setSuratList((rows) => [data, ...rows]);
      setEditId(data.id); setPreviewOnly(false); setFormData(data); setImportOpen(false); setOpen(true);
      Swal.fire({ toast: true, position: 'top-end', timer: 1800, showConfirmButton: false, icon: 'success', title: 'Surat berhasil diimport & tersimpan' });
    } catch (error: any) {
      console.error(error); Swal.fire('Import gagal', error?.message || 'Dokumen tidak dapat diproses.', 'error');
    } finally { setImporting(false); setImportStatus(''); e.target.value = ''; }
  };

  const save = async () => {
    setSaving(true);
    try {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      if (documentTimer.current) clearTimeout(documentTimer.current);
      const normalized = normalizeLayout(formData);
      const payload = { ...normalized };
      delete payload.id; delete payload.created_at; delete payload.updated_at;
      const result = editId ? await supabase.from('arsip_surat').update(payload).eq('id', editId) : await supabase.from('arsip_surat').insert([payload]);
      if (result.error) throw result.error;
      await fetchSurat(); setOpen(false); Swal.fire('Berhasil', editId ? 'Surat dan isi dokumen tersimpan.' : 'Surat disimpan.', 'success');
    } catch (e: any) { Swal.fire('Gagal menyimpan', e.message, 'error'); }
    finally { setSaving(false); }
  };

  const closeEditor = async () => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    if (documentTimer.current) clearTimeout(documentTimer.current);
    if (editId && !previewOnly) {
      await persistLayout(layoutRef.current);
      if (formData.document_html) await supabase.from('arsip_surat').update({ document_html: sanitizeImportedHtml(formData.document_html), isi_surat: formData.isi_surat || '' }).eq('id', editId);
    }
    setOpen(false); setDragging(null);
  };

  const remove = async (id: string) => {
    const r = await Swal.fire({ title: 'Hapus Surat?', icon: 'warning', showCancelButton: true, confirmButtonText: 'Ya, Hapus' });
    if (!r.isConfirmed) return;
    await supabase.from('arsip_surat').delete().eq('id', id); fetchSurat();
  };

  const print = () => {
    if (!printRef.current) return;
    const w = window.open('', '_blank'); if (!w) return;
    w.document.write(`<html><head><title>Surat PB Bilibili 162</title><style>@page{size:A4;margin:0}body{margin:0;font-family:'Times New Roman',serif}.no-print{display:none!important}.imported-doc img{max-width:100%}.imported-doc table{border-collapse:collapse;width:100%}.imported-doc td,.imported-doc th{padding:4px}.pdf-import-page{break-after:page;page-break-after:always}</style></head><body><div>${printRef.current.innerHTML}</div><script>window.onload=()=>setTimeout(()=>{window.print();window.close()},500)</script></body></html>`); w.document.close();
  };

  const whatsapp = async () => {
    if (!printRef.current) return;
    if (editId) { await persistLayout(layoutRef.current); if (documentTimer.current) clearTimeout(documentTimer.current); if (formData.document_html) await supabase.from('arsip_surat').update({ document_html: sanitizeImportedHtml(formData.document_html), isi_surat: formData.isi_surat || '' }).eq('id', editId); }
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

  const imported = Boolean(formData.document_html);
  const filtered = suratList.filter(s => `${s.nomor_surat || ''} ${s.perihal || ''} ${s.source_file_name || ''}`.toLowerCase().includes(search.toLowerCase()));
  return <div className="p-6 md:p-10 text-white max-w-7xl mx-auto min-h-screen font-sans">
    <div className="flex flex-wrap justify-between gap-4 items-center mb-8"><div className="flex gap-4 items-center"><Mail size={32} className="text-blue-400"/><div><h1 className="text-3xl font-black italic uppercase">Administrasi Surat</h1><p className="text-slate-400">PB Bilibili 162 Parepare</p></div></div><div className="flex gap-2"><button onClick={()=>setImportOpen(true)} className="px-5 py-3 bg-emerald-600 rounded-xl font-bold flex gap-2 items-center"><UploadCloud size={18}/> Import Word/PDF</button><button onClick={prepareNew} className="px-5 py-3 bg-blue-600 rounded-xl font-bold flex gap-2 items-center"><Plus size={18}/> Buat Surat Baru</button></div></div>
    <div className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden"><div className="p-5"><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Cari nomor, perihal, atau file import..." className="w-full max-w-md p-3 bg-slate-900/60 rounded-xl border border-white/10"/></div><div className="overflow-x-auto"><table className="w-full"><thead><tr className="bg-white/5 text-xs text-slate-400"><th className="p-4 text-left">No. Surat</th><th className="p-4 text-left">Perihal / Dokumen</th><th className="p-4 text-left">Terakhir Diubah</th><th className="p-4 text-right">Aksi</th></tr></thead><tbody>{filtered.map(s=><tr key={s.id} className="border-t border-white/5"><td className="p-4 font-bold text-blue-400">{s.nomor_surat}</td><td className="p-4 text-slate-300"><div>{s.perihal}</div>{s.source_file_name&&<div className="text-[10px] text-emerald-400 mt-1 flex items-center gap-1"><FileText size={12}/>{s.source_file_name}</div>}</td><td className="p-4 text-slate-500 text-xs">{new Date(s.updated_at || s.created_at).toLocaleString('id-ID')}</td><td className="p-4"><div className="flex justify-end gap-2"><button onClick={()=>preview(s)} className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg"><Eye size={15}/></button><button onClick={()=>edit(s)} className="p-2 bg-blue-500/10 text-blue-400 rounded-lg"><Edit size={15}/></button><button onClick={()=>remove(s.id)} className="p-2 bg-rose-500/10 text-rose-400 rounded-lg"><Trash2 size={15}/></button></div></td></tr>)}</tbody></table>{!filtered.length&&!loading&&<p className="p-10 text-center text-slate-500">Belum ada data surat.</p>}</div></div>

    {importOpen&&<div className="fixed inset-0 z-[1000] bg-black/90 flex items-center justify-center p-4"><div className="w-full max-w-lg bg-[#0F172A] border border-white/10 rounded-3xl p-6"><div className="flex justify-between items-center mb-5"><div><h2 className="text-xl font-black">Import Surat</h2><p className="text-xs text-slate-400 mt-1">Word (.docx) atau PDF (.pdf), maksimal 15 MB</p></div><button disabled={importing} onClick={()=>setImportOpen(false)}><X/></button></div><label className="block border-2 border-dashed border-emerald-500/30 rounded-2xl p-8 text-center cursor-pointer hover:bg-emerald-500/5"><UploadCloud size={38} className="mx-auto text-emerald-400 mb-3"/><b className="block">Pilih file Word / PDF</b><span className="text-xs text-slate-500">Dokumen akan diunggah ke Supabase dan dikonversi menjadi editable</span><input disabled={importing} type="file" accept=".docx,.pdf,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" className="hidden" onChange={importDocument}/></label>{importing&&<div className="mt-5 p-4 rounded-xl bg-white/5 flex items-center gap-3"><Loader2 size={18} className="animate-spin text-emerald-400"/><span className="text-sm">{importStatus||'Memproses…'}</span></div>}<div className="mt-5 text-[11px] text-slate-500 leading-relaxed">Word mempertahankan struktur HTML seperti paragraf, heading, daftar, tabel, gambar, bold, italic, underline, dan link sejauh didukung format sumber. PDF teks diubah menjadi paragraf editable; PDF hasil scan/gambar membutuhkan OCR.</div></div></div>}

    {open&&<div className="fixed inset-0 z-[999] bg-black/95 flex items-center justify-center p-4 overflow-auto"><div className="bg-[#0F172A] w-full max-w-[96%] h-[92vh] rounded-3xl overflow-hidden flex flex-col md:flex-row">
      {!previewOnly&&<div className="w-full md:w-1/3 p-5 overflow-y-auto border-r border-white/10"><div className="flex justify-between mb-4"><b>{editId?'Edit Surat':'Buat Surat Baru'}</b><button onClick={closeEditor}><X/></button></div>
        {imported&&<div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs"><div className="font-bold text-emerald-300">Dokumen hasil import</div><div className="text-slate-400 mt-1 truncate">{formData.source_file_name}</div>{formData.source_file_url&&<a href={formData.source_file_url} target="_blank" rel="noreferrer" className="text-blue-400 inline-block mt-2">Buka file asli</a>}</div>}
        <div className="grid grid-cols-2 gap-2 mb-4">{[['logo_url','Logo Kop',ImageIcon],['cap_stempel_url','Cap Stempel',Upload],['ttd_ketua_url','TTD Ketua',Upload],['ttd_sekretaris_url','TTD Sekretaris',Upload]].map(([field,label,Icon]:any)=><label key={field} className="p-3 border border-dashed border-white/10 rounded-xl text-center cursor-pointer"><Icon size={16} className="mx-auto mb-1"/><span className="text-[9px] block">{label}</span><input type="file" accept="image/*" className="hidden" onChange={e=>uploadImage(e,field)}/></label>)}</div>
        {[['nomor_surat','Nomor Surat'],['nama_ketua','Ketua'],['nama_sekretaris','Sekretaris'],['tujuan_yth','Tujuan (Yth)'],['jabatan_tujuan','Jabatan Tujuan'],['perihal','Perihal']].map(([field,label])=><label key={field} className="block text-[10px] font-bold text-slate-400 uppercase mb-3">{label}<input value={formData[field]||''} onChange={e=>setFormData({...formData,[field]:e.target.value})} className="mt-1 w-full p-2.5 bg-white/5 border border-white/10 rounded-lg text-sm normal-case font-normal"/></label>)}
        {!imported&&<label className="block text-[10px] font-bold text-slate-400 uppercase mb-4">Isi Surat<textarea value={formData.isi_surat||''} onChange={e=>setFormData({...formData,isi_surat:e.target.value})} className="mt-1 w-full h-32 p-2.5 bg-white/5 border border-white/10 rounded-lg text-sm normal-case font-normal"/></label>}
        <div className="flex gap-2"><button disabled={saving||documentSaving} onClick={save} className="flex-1 p-3 bg-blue-600 rounded-xl font-bold flex justify-center gap-2">{saving?<Loader2 className="animate-spin" size={16}/>:<Send size={16}/>} Simpan</button><button onClick={print} className="p-3 bg-slate-700 rounded-xl"><Printer size={16}/></button></div>
      </div>}
      <div className="flex-1 bg-slate-800 p-6 overflow-auto relative" onMouseMove={handlePreviewMove} onMouseUp={handlePreviewUp} onMouseLeave={handlePreviewUp}>
        <div className="absolute right-6 top-5 z-50 flex gap-2 no-print"><button onClick={whatsapp} disabled={saving||layoutSaving||documentSaving} className="px-3 py-2 bg-green-600 rounded-lg text-xs font-bold"><MessageCircle size={14} className="inline mr-1"/> WA</button><button onClick={print} className="px-3 py-2 bg-blue-600 rounded-lg text-xs font-bold"><Printer size={14} className="inline mr-1"/> PDF</button><button onClick={closeEditor} className="p-2 bg-white/10 rounded-lg"><X size={18}/></button></div>
        <div className="absolute left-6 top-5 z-50 no-print text-[10px] px-3 py-2 rounded-lg bg-black/50 text-slate-300">{documentSaving ? 'Menyimpan isi dokumen…' : layoutSaving ? 'Menyimpan posisi & ukuran…' : editId ? imported ? 'Isi & layout autosave realtime ke Supabase' : 'Perubahan layout otomatis tersimpan' : 'Simpan surat untuk mengunci layout'}</div>
        <div ref={printRef} className="bg-white text-black p-[1.5cm] mx-auto w-[21cm] min-h-[29.7cm] font-serif text-[11pt] leading-relaxed relative">
          {imported ? <div ref={editorRef} contentEditable={!previewOnly} suppressContentEditableWarning onInput={(e)=>scheduleDocumentSave(e.currentTarget.innerHTML)} className="imported-doc outline-none min-h-[24cm] [&_img]:max-w-full [&_table]:border-collapse [&_table]:w-full [&_td]:border [&_td]:border-gray-400 [&_th]:border [&_th]:border-gray-400 [&_td]:p-1 [&_th]:p-1" dangerouslySetInnerHTML={{ __html: sanitizeImportedHtml(formData.document_html || '<p></p>') }} /> : <>
            <div className="flex items-center border-b-4 border-black pb-2 mb-6"><div className="w-24 h-24 mr-4 flex items-center justify-center">{formData.logo_url?<img src={formData.logo_url} className="w-full h-full object-contain"/>:<b className="text-3xl border-4 border-black rounded-full p-3">PB</b>}</div><div className="text-center flex-1"><h1 className="text-2xl font-bold">PB BILIBILI 162</h1><p className="text-[8pt]">Sekretariat: Jl. Andi Makkasau No.171, Ujung Lare, Kec. Soreang, Kota Parepare, Sulawesi Selatan 91131</p><p className="text-[8pt]">Telepon: 081219027234 | Email: pbilibili162@gmail.com</p></div></div>
            <div className="flex justify-between mb-6"><div><p>Nomor : {formData.nomor_surat}</p><p>Lampiran : {formData.lampiran}</p><p>Perihal : <b>{formData.perihal}</b></p></div><p>{formData.tempat_tanggal}</p></div>
            <div className="mb-6"><p>Kepada Yth.</p><p className="font-bold">{formData.tujuan_yth}</p><p>{formData.jabatan_tujuan}</p><p>Di - Tempat</p></div>
            <div className="space-y-4 text-justify"><p>Assalamu'alaikum Warahmatullahi Wabarakatuh,</p><p className="font-bold">Dengan hormat,</p><p className="whitespace-pre-line">{formData.isi_surat}</p></div>
          </>}
          <div className="mt-12 flex justify-between px-10 no-print-signatures">
            <div className="text-center w-48 relative"><p className="mb-16">Ketua,</p>{formData.ttd_ketua_url&&<div onMouseDown={(e)=>handleDragStart('ttd_ketua',e)} style={{transform:`translate(${clonePos(formData.ttd_ketua_pos,'ttd_ketua').x}px,${clonePos(formData.ttd_ketua_pos,'ttd_ketua').y}px)`,width:`${scaleValue(formData.ttd_ketua_scale,'ttd_ketua')/100*7}rem`,height:`${scaleValue(formData.ttd_ketua_scale,'ttd_ketua')/100*5}rem`}} className="absolute top-6 left-1/2 -translate-x-1/2 cursor-move z-10"><img src={formData.ttd_ketua_url} className="w-full h-full object-contain mix-blend-multiply"/>{!previewOnly&&<Move size={14} className="absolute top-0 right-0 text-blue-500 no-print"/>}</div>}{formData.cap_stempel_url&&<div onMouseDown={(e)=>handleDragStart('stempel',e)} style={{transform:`translate(${clonePos(formData.stempel_pos,'stempel').x}px,${clonePos(formData.stempel_pos,'stempel').y}px)`,width:`${scaleValue(formData.stempel_scale,'stempel')/100*7}rem`,height:`${scaleValue(formData.stempel_scale,'stempel')/100*7}rem`}} className="absolute top-4 left-1/2 cursor-move z-20"><img src={formData.cap_stempel_url} className="w-full h-full object-contain opacity-80 mix-blend-darken"/>{!previewOnly&&<Move size={14} className="absolute top-1 right-1 text-blue-500 no-print"/>}</div>}<p className="font-bold underline uppercase">{formData.nama_ketua}</p></div>
            <div className="text-center w-48 relative"><p className="mb-16">Sekretaris,</p>{formData.ttd_sekretaris_url&&<div onMouseDown={(e)=>handleDragStart('ttd_sekretaris',e)} style={{transform:`translate(${clonePos(formData.ttd_sekretaris_pos,'ttd_sekretaris').x}px,${clonePos(formData.ttd_sekretaris_pos,'ttd_sekretaris').y}px)`,width:`${scaleValue(formData.ttd_sekretaris_scale,'ttd_sekretaris')/100*7}rem`,height:`${scaleValue(formData.ttd_sekretaris_scale,'ttd_sekretaris')/100*5}rem`}} className="absolute top-6 left-1/2 -translate-x-1/2 cursor-move z-10"><img src={formData.ttd_sekretaris_url} className="w-full h-full object-contain mix-blend-multiply"/>{!previewOnly&&<Move size={14} className="absolute top-0 right-0 text-blue-500 no-print"/>}</div>}<p className="font-bold underline uppercase">{formData.nama_sekretaris}</p></div>
          </div>
        </div>
      </div>
    </div></div>}
  </div>;
}
