import React, { useState } from 'react';
import { supabase } from '../supabase'; 
import { 
  Loader2, Send, CheckCircle2, User, Phone, 
  MapPin, Award, Image as ImageIcon, ChevronDown, 
  Users, Trophy 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function RegistrationForm() {
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  
  const kategoriUmur = [
    "Pra Dini (U-9)", "Usia Dini (U-11)", "Anak-anak (U-13)", 
    "Pemula (U-15)", "Remaja (U-17)", "Taruna (U-19)", 
    "Dewasa / Umum", "Veteran (35+ / 40+)"
  ];

  const [formData, setFormData] = useState({
    nama: '',
    whatsapp: '',
    jenis_kelamin: 'Putra',
    kategori: kategoriUmur[0],
    domisili: '',
    pengalaman: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!formData.nama || !formData.whatsapp || !formData.domisili) {
        throw new Error("Mohon lengkapi semua kolom yang wajib diisi.");
      }

      const listMuda = [
        "Pra Dini (U-9)", "Usia Dini (U-11)", "Anak-anak (U-13)", 
        "Pemula (U-15)", "Remaja (U-17)", "Taruna (U-19)"
      ];
      const kategori_atlet = listMuda.includes(formData.kategori) ? 'MUDA' : 'SENIOR';

      let publicUrl = "";
      
      if (file) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${fileExt}`;
        const filePath = `identitas/${fileName}`;
        
        const { error: uploadError } = await supabase.storage
          .from('identitas-atlet')
          .upload(filePath, file);
          
        if (uploadError) throw new Error("Gagal upload foto: " + uploadError.message);
        
        const { data: urlData } = supabase.storage
          .from('identitas-atlet')
          .getPublicUrl(filePath);
          
        publicUrl = urlData.publicUrl;
      }

      const { error: dbError } = await supabase
        .from('pendaftaran')
        .insert([{ 
          nama: formData.nama.toUpperCase().trim(), 
          whatsapp: formData.whatsapp.trim(), 
          jenis_kelamin: formData.jenis_kelamin,
          kategori: formData.kategori,
          kategori_atlet: kategori_atlet,
          domisili: formData.domisili.toUpperCase().trim(),
          pengalaman: formData.pengalaman || "-", 
          foto_url: publicUrl 
        }]);

      if (dbError) {
        if (dbError.message.includes("pengalaman")) {
          throw new Error("Kolom 'pengalaman' belum ada di database. Silakan jalankan query: ALTER TABLE pendaftaran ADD COLUMN pengalaman TEXT;");
        }
        throw dbError;
      }

      const adminPhoneNumber = "6281219027234";
      const waMessage = window.encodeURIComponent(
        `*PENDAFTARAN ATLET BARU*\n\n` +
        `*Nama:* ${formData.nama.toUpperCase()}\n` +
        `*Gender:* ${formData.jenis_kelamin}\n` +
        `*Kategori:* ${formData.kategori}\n` +
        `*Kelompok:* ${kategori_atlet}\n` +
        `*Domisili:* ${formData.domisili.toUpperCase()}\n` +
        `*Pengalaman:* ${formData.pengalaman || '-'}\n` +
        `*Link Foto:* ${publicUrl || 'Tidak ada foto'}`
      );
      
      window.open(`https://wa.me/${adminPhoneNumber}?text=${waMessage}`, '_blank');
      setSubmitted(true);
      
    } catch (err: any) {
      console.error("Registration Error:", err);
      alert("Kesalahan: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#0b0e14] flex items-center justify-center p-6">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full p-12 bg-[#1a1d26] rounded-[3.5rem] border border-emerald-500/30 text-center shadow-[0_0_50px_rgba(16,185,129,0.1)]"
        >
          <div className="w-24 h-24 bg-emerald-600 rounded-full flex items-center justify-center mx-auto mb-8 shadow-lg shadow-emerald-600/20">
              <CheckCircle2 size={48} className="text-white" />
          </div>
          <h2 className="text-3xl font-black text-white mb-4 tracking-tighter uppercase italic">PENDAFTARAN BERHASIL!</h2>
          <p className="text-zinc-400 mb-10 font-medium leading-relaxed">Data Anda telah tersimpan. Admin <span className="text-blue-500 font-bold">PB Bilibili 162</span> akan segera melakukan verifikasi berkas.</p>
          <button 
              onClick={() => { setSubmitted(false); setFile(null); setFormData({ nama: '', whatsapp: '', jenis_kelamin: 'Putra', kategori: kategoriUmur[0], domisili: '', pengalaman: '' }); }} 
              className="w-full bg-white text-black px-10 py-5 rounded-[1.5rem] font-black uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all shadow-2xl active:scale-95"
          >
              Daftar Atlet Lain
          </button>
        </motion.div>
      </div>
    );
  }

  const inputClass = "w-full pl-14 pr-6 py-5 rounded-2xl bg-[#0b0e14] border border-white/5 text-white font-bold outline-none focus:border-blue-600/50 focus:ring-4 focus:ring-blue-600/5 transition-all placeholder:text-zinc-600 placeholder:font-normal";

  return (
    <section className="py-20 px-4 bg-[#0b0e14] min-h-screen flex flex-col items-center justify-center relative overflow-hidden">
      {/* Background Ornaments */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/5 blur-[120px] rounded-full -mr-64 -mt-64" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-indigo-600/5 blur-[120px] rounded-full -ml-64 -mb-64" />

      <motion.form 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        onSubmit={handleSubmit} 
        className="w-full max-w-lg p-8 md:p-14 bg-[#1a1d26] rounded-[3.5rem] shadow-2xl border border-white/5 relative z-10"
      >
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-1.5 bg-blue-600 rounded-b-full shadow-[0_0_15px_rgba(37,99,235,0.5)]"></div>
        
        <div className="mb-12 text-center">
            <h2 className="text-4xl font-black text-white mb-3 uppercase italic tracking-tighter">Registrasi <span className="text-blue-600">Atlet</span></h2>
            <p className="text-zinc-500 font-black text-[10px] uppercase tracking-[0.3em]">Official PB Bilibili 162 Form</p>
        </div>
        
        <div className="space-y-6">
          {/* Nama */}
          <div className="relative group">
            <User className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-blue-500 transition-colors" size={22} />
            <input required value={formData.nama} className={inputClass} placeholder="NAMA LENGKAP ATLET" onChange={e => setFormData({...formData, nama: e.target.value})} />
          </div>

          {/* Gender Selection */}
          <div className="space-y-3">
            <label className="text-[10px] font-black text-zinc-500 uppercase ml-2 tracking-[0.2em] italic">Jenis Kelamin</label>
            <div className="grid grid-cols-2 gap-4">
              {['Putra', 'Putri'].map((gender) => (
                <label key={gender} className={`flex items-center justify-center gap-3 p-5 rounded-2xl border cursor-pointer font-black transition-all active:scale-95 ${formData.jenis_kelamin === gender ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-600/20' : 'bg-[#0b0e14] border-white/5 text-zinc-500 hover:border-blue-600/30'}`}>
                  <input type="radio" className="hidden" name="jenis_kelamin" value={gender} checked={formData.jenis_kelamin === gender} onChange={e => setFormData({...formData, jenis_kelamin: e.target.value})} />
                  <Users size={20} /> {gender.toUpperCase()}
                </label>
              ))}
            </div>
          </div>

          {/* WhatsApp */}
          <div className="relative group">
            <Phone className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-blue-500 transition-colors" size={22} />
            <input required type="tel" value={formData.whatsapp} className={inputClass} placeholder="WHATSAPP (628...)" onChange={e => setFormData({...formData, whatsapp: e.target.value})} />
          </div>

          {/* Domisili */}
          <div className="relative group">
            <MapPin className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-blue-500 transition-colors" size={22} />
            <input required value={formData.domisili} className={inputClass} placeholder="KOTA DOMISILI" onChange={e => setFormData({...formData, domisili: e.target.value})} />
          </div>

          {/* Kategori */}
          <div className="space-y-3">
            <label className="text-[10px] font-black text-zinc-500 uppercase ml-2 tracking-[0.2em] italic">Kategori Pertandingan</label>
            <div className="relative group">
              <Award className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-blue-500 transition-colors" size={22} />
              <select value={formData.kategori} className={`${inputClass} appearance-none cursor-pointer`} onChange={e => setFormData({...formData, kategori: e.target.value})}>
                {kategoriUmur.map((kat) => <option key={kat} value={kat} className="bg-[#1a1d26]">{kat}</option>)}
              </select>
              <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 text-zinc-600 pointer-events-none" size={20} />
            </div>
          </div>

          {/* Pengalaman */}
          <div className="relative group">
            <Trophy className="absolute left-5 top-6 text-zinc-600 group-focus-within:text-blue-500 transition-colors" size={22} />
            <textarea 
              value={formData.pengalaman} 
              className={`${inputClass} min-h-[140px] pt-5 resize-none`} 
              placeholder="PENGALAMAN BERTANDING / PRESTASI" 
              onChange={e => setFormData({...formData, pengalaman: e.target.value})}
            />
          </div>

          {/* Upload File */}
          <div className="space-y-3">
            <label className="text-[10px] font-black text-zinc-500 uppercase ml-2 tracking-[0.2em] italic">Berkas Identitas (KK/AKTE/KIA)</label>
            <div className="relative group">
              <input required type="file" accept="image/*" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" onChange={e => setFile(e.target.files?.[0] || null)} />
              <div className={`w-full px-6 py-6 rounded-2xl border-2 border-dashed flex items-center justify-between transition-all ${file ? 'bg-emerald-600/10 border-emerald-500 shadow-inner' : 'bg-[#0b0e14] border-white/5 group-hover:border-blue-600/50'}`}>
                <div className="flex items-center gap-4 overflow-hidden">
                    <ImageIcon size={22} className={file ? "text-emerald-500" : "text-zinc-600"} />
                    <span className={`text-sm font-bold truncate ${file ? 'text-emerald-400' : 'text-zinc-500'}`}>
                        {file ? file.name : "UNGGAH FOTO IDENTITAS"}
                    </span>
                </div>
                {file && <CheckCircle2 size={20} className="text-emerald-500 flex-shrink-0" />}
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-6">
            <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-white hover:text-black text-white py-6 rounded-[1.5rem] font-black uppercase text-xs tracking-[0.3em] shadow-xl shadow-blue-600/10 transition-all flex items-center justify-center gap-4 active:scale-95 disabled:bg-zinc-800 disabled:text-zinc-600">
              {loading ? (
                <><Loader2 className="animate-spin" size={20} /> SEDANG MENGIRIM...</>
              ) : (
                <><Send size={18} /> KONFIRMASI & DAFTAR</>
              )}
            </button>
            <p className="text-[9px] text-center text-zinc-600 mt-6 font-black uppercase tracking-[0.2em]">Data akan diverifikasi oleh Admin PB Bilibili 162</p>
          </div>
        </div>
      </motion.form>
    </section>
  );
}