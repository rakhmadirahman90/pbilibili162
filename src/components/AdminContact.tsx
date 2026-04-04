import React, { useState, useEffect } from 'react';
import { supabase } from "../supabase";
import { Save, MapPin, Phone, Mail, Link as LinkIcon, Loader2, CheckCircle2, Clock, Globe, Zap } from 'lucide-react';

export default function AdminContact() {
  const [loading, setLoading] = useState(true);
  const [issaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  
  const [contactData, setContactData] = useState({
    address: '',
    phone: '',
    email: '',
    maps_url: '', 
    maps_iframe: '', 
    operating_hours: 'Senin - Sabtu: 08.00 - 22.00 WITA' 
  });

  useEffect(() => {
    fetchContact();
  }, []);

  async function fetchContact() {
    try {
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      if (data) setContactData(data);
    } catch (err: any) {
      console.error("Error fetch contact:", err.message);
    } finally {
      setLoading(false);
    }
  }

  // --- FUNGSI PEMBERSIH URL IFRAME (DI PERBARUI) ---
  const extractSrcFromIframe = (input: string) => {
    if (input.includes('<iframe')) {
      const regex = /src="([^"]+)"/;
      const match = input.match(regex);
      return match ? match[1] : input;
    }
    return input;
  };

  // Handler khusus untuk input iframe agar Preview langsung update
  const handleIframeInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    const cleanUrl = extractSrcFromIframe(rawValue);
    setContactData({ ...contactData, maps_iframe: cleanUrl });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      // Data sudah bersih karena diproses di handleIframeInput
      const { error } = await supabase
        .from('contacts')
        .upsert({ id: 1, ...contactData });

      if (error) throw error;
      
      setSuccessMsg("Informasi Berhasil Disinkronkan!");
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      if (err.message.includes("column")) {
        alert("ERROR DATABASE: Kolom baru belum ditambahkan di Supabase. Silakan jalankan perintah SQL ALTER TABLE.");
      } else {
        alert("Gagal menyimpan: " + err.message);
      }
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) return (
    <div className="flex h-[60vh] items-center justify-center">
      <div className="relative">
        <Loader2 className="animate-spin text-blue-500" size={48} />
        <div className="absolute inset-0 blur-xl bg-blue-500/20 animate-pulse"></div>
      </div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto p-4 lg:p-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {successMsg && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[200] bg-emerald-500 text-white px-8 py-3 rounded-2xl font-black text-xs uppercase flex items-center gap-3 shadow-[0_20px_50px_rgba(16,185,129,0.3)] border border-white/20">
          <CheckCircle2 size={18} /> {successMsg}
        </div>
      )}

      {/* Header Section */}
      <div className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-white/5 pb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-600/10 rounded-lg">
              <Zap className="text-blue-500" size={20} />
            </div>
            <span className="text-[10px] font-black text-blue-500 uppercase tracking-[0.3em]">System Configuration</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black italic tracking-tighter uppercase leading-none text-white">
            CONTACT <span className="text-blue-600 underline decoration-blue-900/50">MANAGEMENT</span>
          </h1>
          <p className="text-zinc-500 text-xs font-medium mt-3 max-w-md uppercase tracking-wider">
            Sinkronisasi data alamat, kontak person, dan lokasi peta secara real-time ke landing page.
          </p>
        </div>
        <div className="bg-zinc-900/80 backdrop-blur-md border border-white/5 p-4 rounded-3xl flex items-center gap-4">
          <div className="h-3 w-3 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_15px_rgba(16,185,129,0.5)]"></div>
          <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Database: Connected</span>
        </div>
      </div>

      <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* KOLOM KIRI: Informasi Utama */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-zinc-900/30 backdrop-blur-sm p-6 lg:p-8 rounded-[2.5rem] border border-white/10 shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
              <Mail size={120} />
            </div>
            
            <h2 className="text-xl font-black uppercase italic text-white mb-8 flex items-center gap-3">
              <span className="h-1 w-8 bg-blue-600 rounded-full"></span>
              Core Information
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="group/field space-y-2">
                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest flex items-center gap-2 ml-1">
                  <Mail size={12} className="text-blue-500"/> Official Email
                </label>
                <input 
                  className="w-full bg-zinc-950/50 border border-white/10 rounded-2xl p-4 text-sm outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 transition-all font-semibold text-zinc-200 placeholder:text-zinc-700"
                  value={contactData.email}
                  onChange={e => setContactData({...contactData, email: e.target.value})}
                  placeholder="e.g. hello@pbus162.com"
                />
              </div>

              <div className="group/field space-y-2">
                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest flex items-center gap-2 ml-1">
                  <Phone size={12} className="text-emerald-500"/> WhatsApp Center
                </label>
                <input 
                  className="w-full bg-zinc-950/50 border border-white/10 rounded-2xl p-4 text-sm outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 transition-all font-semibold text-zinc-200 placeholder:text-zinc-700"
                  value={contactData.phone}
                  onChange={e => setContactData({...contactData, phone: e.target.value})}
                  placeholder="e.g. 62812345678"
                />
              </div>
            </div>

            <div className="space-y-2 mb-6">
              <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest flex items-center gap-2 ml-1">
                <MapPin size={12} className="text-red-500"/> HQ Address
              </label>
              <textarea 
                rows={3}
                className="w-full bg-zinc-950/50 border border-white/10 rounded-2xl p-4 text-sm outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 transition-all font-semibold text-zinc-200 resize-none leading-relaxed"
                value={contactData.address}
                onChange={e => setContactData({...contactData, address: e.target.value})}
                placeholder="Masukkan alamat lengkap..."
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest flex items-center gap-2 ml-1">
                <Clock size={12} className="text-amber-500"/> Service Hours
              </label>
              <input 
                className="w-full bg-zinc-950/50 border border-emerald-500/20 rounded-2xl p-4 text-sm outline-none focus:border-emerald-500 transition-all font-bold text-emerald-400"
                value={contactData.operating_hours}
                onChange={e => setContactData({...contactData, operating_hours: e.target.value})}
              />
            </div>
          </div>
        </div>

        {/* KOLOM KANAN: Maps & Preview */}
        <div className="lg:col-span-5 space-y-6 flex flex-col">
          <div className="bg-zinc-900/30 p-6 rounded-[2.5rem] border border-white/10 space-y-5 shadow-xl">
            <h2 className="text-xl font-black uppercase italic text-white mb-2 flex items-center gap-3">
              <span className="h-1 w-8 bg-emerald-600 rounded-full"></span>
              Map Assets
            </h2>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest flex items-center gap-2 ml-1">
                <LinkIcon size={12} className="text-blue-500"/> Google Maps URL
              </label>
              <input 
                className="w-full bg-zinc-950/50 border border-white/5 rounded-2xl p-4 text-[11px] outline-none focus:border-blue-600 transition-all font-mono text-blue-400"
                value={contactData.maps_url}
                onChange={e => setContactData({...contactData, maps_url: e.target.value})}
                placeholder="https://goo.gl/maps/..."
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest flex items-center gap-2 ml-1">
                <Globe size={12} className="text-zinc-500"/> Embed Source (Iframe)
              </label>
              <input 
                className="w-full bg-zinc-950/50 border border-white/5 rounded-2xl p-4 text-[11px] outline-none focus:border-blue-600 transition-all font-mono text-zinc-400"
                value={contactData.maps_iframe}
                onChange={handleIframeInput}
                placeholder='Tempel seluruh <iframe src="..." > di sini'
              />
              <p className="text-[8px] text-zinc-600 font-bold uppercase tracking-tighter px-1">Tip: Sistem akan otomatis mengambil link "src" dari kode iframe.</p>
            </div>
          </div>

          {/* Map Preview Box */}
          <div className="flex-1 bg-zinc-950 rounded-[2.5rem] overflow-hidden border-4 border-zinc-900 shadow-inner relative group min-h-[250px]">
            <div className="absolute top-4 left-4 z-10 bg-zinc-950/80 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/10">
               <span className="text-[9px] font-black text-white uppercase tracking-tighter italic">Live Preview</span>
            </div>
            
            {contactData.maps_iframe ? (
              <iframe 
                src={contactData.maps_iframe} 
                width="100%" 
                height="100%" 
                style={{ border: 0, filter: 'grayscale(1) invert(0.9) contrast(1.2)' }} 
                className="opacity-80 group-hover:opacity-100 transition-opacity duration-500"
                loading="lazy" 
                title="Preview"
              />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-800 gap-4">
                <Globe size={48} strokeWidth={1}/>
                <span className="text-[10px] uppercase font-black tracking-[0.3em]">No Map Configured</span>
              </div>
            )}
          </div>

          <button 
            type="submit"
            disabled={issaving}
            className="group relative w-full py-6 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-[2rem] font-black uppercase text-xs tracking-[0.2em] flex items-center justify-center gap-4 transition-all shadow-[0_20px_40px_rgba(37,99,235,0.2)] hover:shadow-[0_20px_40px_rgba(37,99,235,0.4)] active:scale-[0.98] overflow-hidden"
          >
            <div className="absolute inset-0 w-1/2 h-full bg-white/10 -skew-x-[20deg] -translate-x-full group-hover:translate-x-[250%] transition-transform duration-1000"></div>
            {issaving ? <Loader2 className="animate-spin" size={20}/> : (
              <>
                <Save size={20} className="group-hover:rotate-12 transition-transform"/>
                <span>Sync to Landing Page</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}