import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { FileDown, Search, Eye } from 'lucide-react';

export default function DokumenPenting() {
  const [docs, setDocs] = useState<any[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const getDocs = async () => {
      const { data } = await supabase.from('documents').select('*').order('created_at', { ascending: false });
      setDocs(data || []);
    };
    getDocs();
  }, []);

  const filteredDocs = docs.filter(d => d.title.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="max-w-6xl mx-auto px-6 py-20 min-h-screen text-white">
      <div className="text-center mb-16">
        <h2 className="text-5xl font-black italic uppercase tracking-tighter mb-4">Dokumen <span className="text-blue-600">Penting</span></h2>
        <p className="text-zinc-500 uppercase text-xs font-bold tracking-[0.3em]">Arsip Resmi PB Bilibili 162</p>
      </div>

      <div className="relative mb-12">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" size={20} />
        <input 
          type="text" placeholder="Cari dokumen..." 
          className="w-full bg-zinc-900/50 border border-zinc-800 rounded-2xl py-5 pl-14 pr-6 outline-none focus:border-blue-600 transition-all"
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {filteredDocs.map(doc => (
          <div key={doc.id} className="group bg-zinc-900/20 border border-zinc-800/50 p-6 rounded-[2rem] hover:border-blue-600/50 transition-all duration-500">
            <div className="flex justify-between items-start">
              <div className="flex items-start gap-5">
                <div className="w-14 h-14 bg-zinc-800 rounded-2xl flex items-center justify-center text-zinc-400 group-hover:text-blue-500 group-hover:bg-blue-600/10 transition-all">
                  <FileDown size={28} />
                </div>
                <div>
                  <h3 className="text-lg font-black uppercase italic leading-tight mb-1 group-hover:text-blue-400">{doc.title}</h3>
                  <p className="text-sm text-zinc-500 line-clamp-2 mb-4">{doc.description}</p>
                  <div className="flex gap-3">
                    <a href={doc.file_url} target="_blank" className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest bg-zinc-800 px-4 py-2 rounded-lg hover:bg-blue-600 transition-all">
                      <Eye size={12} /> View
                    </a>
                    <a href={doc.file_url} download className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest bg-blue-600 px-4 py-2 rounded-lg hover:bg-blue-700 transition-all">
                      <FileDown size={12} /> Download
                    </a>
                  </div>
                </div>
              </div>
              <span className="text-[10px] font-mono text-zinc-700 uppercase">{doc.file_type}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
