import React, { useEffect, useState } from 'react';
import { supabase } from "../supabase"; // Tambahkan import supabase
import { MapPin, Clock, Phone, Mail, ExternalLink, Loader2 } from 'lucide-react';

export default function Contact() {
  // --- DATA BARU (STATE UNTUK SYNC ADMIN) ---
  const [contactData, setContactData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Link Embed Statis (Data lama Anda tetap dipertahankan sebagai fallback)
  const defaultMapEmbedUrl = "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3977.340274291079!2d119.62310187413628!3d-3.929532544265112!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x2d95bb1f2c5e6249%3A0xee8a433e727588ca!2sJl.%20Andi%20Makkasau%20No.171%2C%20Ujung%20Lare%2C%20Kec.%20Soreang%2C%20Kota%20Parepare%2C%20Sulawesi%20Selatan%2091131!5e0!3m2!1sid!2sid!4v1716543210987!5m2!1sid!2sid";
  const defaultMapsUrl = "https://www.google.com/maps?q=Jl.+Andi+Makkasau+No.171,+Parepare";

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
      console.error("Error fetching landing page contact:", err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section id="contact" className="py-24 bg-[#050505] text-white relative overflow-hidden scroll-mt-20">
      {/* Background Decor */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/10 blur-[120px] rounded-full -mr-64 -mt-64"></div>
      
      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-black mb-4 tracking-tight">
            HUBUNGI <span className="text-blue-500">KAMI</span>
          </h2>
          <p className="text-slate-400 max-w-2xl mx-auto uppercase tracking-widest text-[10px] md:text-xs font-bold">
            Kunjungi markas besar PB US 162 BILIBILI di Parepare
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
          
          {/* --- INFO CARD --- */}
          <div className="space-y-8">
            <div className="bg-slate-900/50 p-8 rounded-3xl border border-white/10 backdrop-blur-sm shadow-xl">
              <h3 className="text-2xl font-bold mb-6 flex items-center gap-3">
                <span className="w-2 h-8 bg-blue-500 rounded-full"></span>
                Informasi Markas Besar
              </h3>
              
              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="w-12 h-12 bg-blue-600/20 rounded-2xl flex items-center justify-center shrink-0 border border-blue-500/20">
                    <MapPin className="text-blue-400" size={24} />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-400 text-sm uppercase tracking-wider mb-1">Alamat Utama</h4>
                    <p className="text-slate-100 leading-relaxed italic md:not-italic">
                      {/* Menggunakan data dari Admin jika ada, jika tidak pakai data lama Anda */}
                      {contactData?.address || (
                        <>
                          Jl. Andi Makkasau No.171, Ujung Lare, <br />
                          Kec. Soreang, Kota Parepare, Sulawesi Selatan 91131
                        </>
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="w-12 h-12 bg-emerald-600/20 rounded-2xl flex items-center justify-center shrink-0 border border-emerald-500/20">
                    <Clock className="text-emerald-400" size={24} />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-400 text-sm uppercase tracking-wider mb-1">Jam Operasional</h4>
                    <p className="text-slate-100 font-medium">
                      {contactData?.operating_hours || "Senin - Sabtu: 08.00 - 22.00 WITA"}
                    </p>
                  </div>
                </div>

                {/* --- TAMBAHAN BARU: EMAIL & PHONE JIKA TERSEDIA --- */}
                {contactData?.email && (
                  <div className="flex gap-4">
                    <div className="w-12 h-12 bg-zinc-600/20 rounded-2xl flex items-center justify-center shrink-0 border border-white/10">
                      <Mail className="text-zinc-400" size={24} />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-400 text-sm uppercase tracking-wider mb-1">Official Email</h4>
                      <p className="text-slate-100 font-medium">{contactData.email}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <a 
              href={contactData?.maps_url || defaultMapsUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="w-full py-4 bg-blue-600 hover:bg-blue-500 rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-lg transition-all flex items-center justify-center gap-2 group active:scale-95"
            >
              BUKA DI GOOGLE MAPS <ExternalLink size={18} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
            </a>
          </div>

          {/* --- GOOGLE MAPS EMBED --- */}
          <div className="w-full h-[450px] lg:h-[500px] rounded-[2.5rem] overflow-hidden border border-white/10 shadow-2xl bg-slate-900 relative">
            {loading ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="animate-spin text-blue-500" size={32} />
              </div>
            ) : (
              <iframe 
                src={contactData?.maps_iframe || defaultMapEmbedUrl}
                width="100%" 
                height="100%" 
                style={{ border: 0, filter: contactData?.maps_iframe ? 'none' : 'grayscale(1) invert(0.9) contrast(1.2)' }} 
                allowFullScreen
                loading="lazy" 
                referrerPolicy="no-referrer-when-downgrade"
                title="Lokasi Markas Parepare"
              ></iframe>
            )}
          </div>

        </div>
      </div>
    </section>
  );
}