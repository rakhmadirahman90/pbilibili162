import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { FileText, Plus, Trash2, Download, Search, Loader2, UploadCloud } from 'lucide-react';

export default function ManajemenDokumen() {
  const [docs, setDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({ title: '', description: '' });

  useEffect(() => { fetchDocs(); }, []);

  const fetchDocs = async () => {
    const { data } = await supabase.from('documents').select('*').order('created_at', { ascending: false });
    setDocs(data || []);
    setLoading(false);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !formData.title) return alert("Isi judul dan pilih file!");

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `docs/${fileName}`;

      let { error: uploadError } = await supabase.storage.from('assets').upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('assets').getPublicUrl(filePath);

      await supabase.from('documents').insert([{
        title: formData.title,
        description: formData.description,
        file_url: publicUrl,
        file_type: fileExt
      }]);

      setFormData({ title: '', description: '' });
      fetchDocs();
    } catch (error: any) {
      alert(error.message);
    } finally {
      setUploading(false);
    }
  };

  const deleteDoc = async (id: string) => {
    if (!confirm("Hapus dokumen ini?")) return;
    await supabase.from('documents').delete().eq('id', id);
    fetchDocs();
  };

  return (
    <div className="p-8 bg-[#050505] min-h-screen text-white">
      <h1 className="text-3xl font-black italic uppercase mb-8">Manajemen <span className="text-blue-600">Dokumen</span></h1>

      <div className="bg-zinc-900/50 p-6 rounded-3xl border border-zinc-800 mb-8">
        <div className="grid md:grid-cols-2 gap-4 mb-4">
          <input 
            type="text" placeholder="Judul Dokumen" 
            className="bg-black border border-zinc-800 p-4 rounded-xl outline-none focus:border-blue-600"
            value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})}
          />
          <input 
            type="text" placeholder="Keterangan Singkat" 
            className="bg-black border border-zinc-800 p-4 rounded-xl outline-none focus:border-blue-600"
            value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})}
          />
        </div>
        <label className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 p-4 rounded-xl cursor-pointer font-bold transition-all">
          {uploading ? <Loader2 className="animate-spin" /> : <UploadCloud size={20} />}
          {uploading ? 'UPLOADING...' : 'PILIH & UPLOAD FILE'}
          <input type="file" hidden onChange={handleUpload} disabled={uploading} />
        </label>
      </div>

      <div className="grid gap-4">
        {docs.map(doc => (
          <div key={doc.id} className="flex items-center justify-between bg-zinc-900/30 border border-zinc-800 p-5 rounded-2xl">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-600/10 rounded-xl flex items-center justify-center text-blue-500">
                <FileText />
              </div>
              <div>
                <h4 className="font-bold uppercase tracking-tight">{doc.title}</h4>
                <p className="text-xs text-zinc-500">{doc.description || 'Tidak ada deskripsi'}</p>
              </div>
            </div>
            <button onClick={() => deleteDoc(doc.id)} className="text-zinc-600 hover:text-red-500 transition-colors">
              <Trash2 size={20} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
