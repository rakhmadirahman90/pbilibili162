import React, { useState } from 'react';
import { supabase } from '../supabase'; 
import { 
  Loader2, Send, CheckCircle2, User, Phone, 
  MapPin, Award, Image as ImageIcon, ChevronDown, 
  Users, Trophy 
} from 'lucide-react';

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
      // 1. Validasi Sederhana
      if (!formData.nama || !formData.whatsapp || !formData.domisili) {
        throw new Error("Mohon lengkapi semua kolom yang wajib diisi.");
      }

      // --- KODE BARU: Logika Penentuan kategori_atlet ---
      const listMuda = [
        "Pra Dini (U-9)", "Usia Dini (U-11)", "Anak-anak (U-13)", 
        "Pemula (U-15)", "Remaja (U-17)", "Taruna (U-19)"
      ];
      const kategori_atlet = listMuda.includes(formData.kategori) ? 'MUDA' : 'SENIOR';

      let publicUrl = "";
      
      // 2. Proses Upload File jika ada
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

      // 3. Insert ke Database
      // Menambahkan kolom kategori_atlet hasil logika di atas
      const { error: dbError } = await supabase
        .from('pendaftaran')
        .insert([{ 
          nama: formData.nama.toUpperCase().trim(), 
          whatsapp: formData.whatsapp.trim(), 
          jenis_kelamin: formData.jenis_kelamin,
          kategori: formData.kategori,
          kategori_atlet: kategori_atlet, // DATA BARU DISINI
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

      // 4. Kirim Notifikasi WhatsApp
      const adminPhoneNumber = "6281219027234";
      const waMessage = window.encodeURIComponent(
        `*PENDAFTARAN ATLET BARU*\n\n` +
        `*Nama:* ${formData.nama.toUpperCase()}\n` +
        `*Gender:* ${formData.jenis_kelamin}\n` +
        `*Kategori:* ${formData.kategori}\n` +
        `*Kelompok:* ${kategori_atlet}\n` + // Info tambahan di WA
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
      <div className="max-w-md mx-auto my-12 p-10 bg-green-50 rounded-[3rem] border-2 border-green-200 text-center shadow-xl animate-in fade-in zoom-in duration-500">
        <div className="w-20 h-20 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-green-200">
            <CheckCircle2 size={40} className="text-white" />
        </div>
        <h2 className="text-3xl font-black text-slate-900 mb-4 tracking-tighter">PENDAFTARAN BERHASIL!</h2>
        <p className="text-slate-700 mb-8 font-bold leading-relaxed">Data Anda telah aman tersimpan di sistem kami. Admin akan segera memproses pendaftaran Anda.</p>
        <button 
            onClick={() => { setSubmitted(false); setFile(null); setFormData({ nama: '', whatsapp: '', jenis_kelamin: 'Putra', kategori: kategoriUmur[0], domisili: '', pengalaman: '' }); }} 
            className="bg-slate-900 text-white px-10 py-4 rounded-full font-black uppercase tracking-widest hover:bg-blue-600 hover:scale-105 transition-all shadow-xl active:scale-95"
        >
            Daftar Atlet Lain
        </button>
      </div>
    );
  }

  const inputClass = "w-full pl-12 pr-4 py-4 rounded-2xl bg-slate-50 border-2 border-slate-200 text-slate-900 font-bold outline-none focus:border-blue-600 focus:bg-white focus:ring-4 focus:ring-blue-50 transition-all placeholder:text-slate-300 placeholder:font-normal";

  return (
    <section className="py-12 px-4 bg-slate-50 min-h-screen flex items-center justify-center">
      <form onSubmit={handleSubmit} className="w-full max-w-md p-8 md:p-10 bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-2 bg-blue-600"></div>
        
        <div className="mb-10 text-center">
            <h2 className="text-3xl font-black text-slate-900 mb-2 uppercase italic tracking-tighter">Registrasi <span className="text-blue-600">Atlet</span></h2>
            <div className="w-12 h-1 bg-blue-600 mx-auto rounded-full mb-3"></div>
            <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Formulir Pendaftaran Resmi</p>
        </div>
        
        <div className="space-y-5">
          <div className="relative group">
            <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={20} />
            <input required value={formData.nama} className={inputClass} placeholder="NAMA LENGKAP ATLET" onChange={e => setFormData({...formData, nama: e.target.value})} />
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-black text-slate-500 uppercase ml-2 tracking-[0.2em] italic">Jenis Kelamin</label>
            <div className="grid grid-cols-2 gap-3">
              {['Putra', 'Putri'].map((gender) => (
                <label key={gender} className={`flex items-center justify-center gap-2 p-4 rounded-2xl border-2 cursor-pointer font-black transition-all active:scale-95 ${formData.jenis_kelamin === gender ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-100' : 'bg-slate-50 border-slate-200 text-slate-400 hover:border-blue-300'}`}>
                  <input type="radio" className="hidden" name="jenis_kelamin" value={gender} checked={formData.jenis_kelamin === gender} onChange={e => setFormData({...formData, jenis_kelamin: e.target.value})} />
                  <Users size={18} /> {gender.toUpperCase()}
                </label>
              ))}
            </div>
          </div>

          <div className="relative group">
            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={20} />
            <input required type="tel" value={formData.whatsapp} className={inputClass} placeholder="NOMOR WHATSAPP (CONTOH: 628...)" onChange={e => setFormData({...formData, whatsapp: e.target.value})} />
          </div>

          <div className="relative group">
            <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={20} />
            <input required value={formData.domisili} className={inputClass} placeholder="KOTA DOMISILI SAAT INI" onChange={e => setFormData({...formData, domisili: e.target.value})} />
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-black text-slate-500 uppercase ml-2 tracking-[0.2em] italic">Kategori Pertandingan</label>
            <div className="relative group">
              <Award className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={20} />
              <select value={formData.kategori} className={`${inputClass} appearance-none cursor-pointer`} onChange={e => setFormData({...formData, kategori: e.target.value})}>
                {kategoriUmur.map((kat) => <option key={kat} value={kat}>{kat}</option>)}
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={20} />
            </div>
          </div>

          <div className="relative group">
            <Trophy className="absolute left-4 top-5 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={20} />
            <textarea 
              value={formData.pengalaman} 
              className={`${inputClass} min-h-[120px] pt-4 resize-none`} 
              placeholder="PENGALAMAN BERTANDING / PRESTASI (JIKA ADA)" 
              onChange={e => setFormData({...formData, pengalaman: e.target.value})}
            />
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-black text-slate-500 uppercase ml-2 tracking-[0.2em] italic">Berkas Identitas (KK/AKTE/KIA)</label>
            <div className="relative group">
              <input required type="file" accept="image/*" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" onChange={e => setFile(e.target.files?.[0] || null)} />
              <div className={`w-full px-5 py-5 rounded-2xl border-2 border-dashed flex items-center justify-between transition-all ${file ? 'bg-emerald-50 border-emerald-500 shadow-inner' : 'bg-slate-50 border-slate-300 group-hover:border-blue-500'}`}>
                <div className="flex items-center gap-3 overflow-hidden">
                    <ImageIcon size={20} className={file ? "text-emerald-600" : "text-slate-400"} />
                    <span className={`text-sm font-bold truncate ${file ? 'text-emerald-700' : 'text-slate-400'}`}>
                        {file ? file.name : "UNGGAH FOTO IDENTITAS"}
                    </span>
                </div>
                {file && <CheckCircle2 size={18} className="text-emerald-600 flex-shrink-0" />}
              </div>
            </div>
          </div>

          <div className="pt-4">
            <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-slate-900 text-white py-5 rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-xl shadow-blue-100 hover:shadow-slate-200 transition-all flex items-center justify-center gap-3 active:scale-95 disabled:bg-slate-300 disabled:shadow-none">
              {loading ? (
                <><Loader2 className="animate-spin" size={20} /> SEDANG MENGIRIM...</>
              ) : (
                <><Send size={18} /> KONFIRMASI & DAFTAR</>
              )}
            </button>
            <p className="text-[9px] text-center text-slate-400 mt-4 font-bold uppercase tracking-widest">Dengan mendaftar, data Anda akan diverifikasi oleh admin</p>
          </div>
        </div>
      </form>
    </section>
  );
}