import React, { useEffect, useState } from 'react';
import { supabase } from "../supabase"; 
import { MapPin, Clock, Phone, Mail, ExternalLink, Loader2, MessageSquare } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Contact() {
  const [contactData, setContactData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Link Embed Statis sebagai fallback
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
    <section id="contact" className="py-24 bg-[#0b0e14] text-white relative overflow-hidden scroll-mt-20">
      {/* Background Decor - Konsisten dengan komponen lain */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-600/5 blur-[120px] rounded-full pointer-events-none -mr-64 -mt-64" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-indigo-600/5 blur-[120px] rounded-full pointer-events-none -ml-32 -mb-32" />
      
      <div className="max-w-7xl mx-auto px-6 relative z-10">
        {/* Header Section */}
        <div className="text-center mb-20">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 bg-blue-600/10 border border-blue-500/20 px-4 py-2 rounded-full mb-6"
          >
            <MessageSquare size={16} className="text-blue-500" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400">Hubungi Kami</span>
          </motion.div>
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-6xl font-black mb-6 tracking-tighter italic uppercase"
          >
            MARKAS <span className="text-blue-600">BESAR</span>
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-zinc-500 max-w-2xl mx-auto uppercase tracking-widest text-[10px] md:text-xs font-bold leading-relaxed"
          >
            Kunjungi pusat pelatihan dan administrasi PB Bilibili 162 di Kota Parepare
          </motion.p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-stretch">
          
          {/* --- INFO CARD --- */}
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            className="flex flex-col gap-6"
          >
            <div className="flex-1 bg-[#1a1d26] p-8 md:p-12 rounded-[2.5rem] border border-white/5 backdrop-blur-md shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/5 blur-3xl group-hover:bg-blue-600/10 transition-colors" />
              
              <h3 className="text-2xl font-black mb-10 flex items-center gap-4 italic uppercase tracking-tight">
                <span className="w-2 h-10 bg-blue-600 rounded-full shadow-[0_0_15px_rgba(37,99,235,0.5)]"></span>
                Informasi Kontak
              </h3>
              
              <div className="space-y-10">
                <div className="flex gap-6">
                  <div className="w-14 h-14 bg-blue-600/10 rounded-2xl flex items-center justify-center shrink-0 border border-blue-500/20 shadow-lg group-hover:scale-110 transition-transform">
                    <MapPin className="text-blue-500" size={26} />
                  </div>
                  <div>
                    <h4 className="font-black text-zinc-500 text-[10px] uppercase tracking-[0.2em] mb-2">Alamat Utama</h4>
                    <p className="text-zinc-200 leading-relaxed font-medium text-lg">
                      {contactData?.address || (
                        <>
                          Jl. Andi Makkasau No.171, Ujung Lare, <br />
                          Kec. Soreang, Kota Parepare, Sulawesi Selatan 91131
                        </>
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex gap-6">
                  <div className="w-14 h-14 bg-emerald-600/10 rounded-2xl flex items-center justify-center shrink-0 border border-emerald-500/20 shadow-lg group-hover:scale-110 transition-transform">
                    <Clock className="text-emerald-500" size={26} />
                  </div>
                  <div>
                    <h4 className="font-black text-zinc-500 text-[10px] uppercase tracking-[0.2em] mb-2">Jam Operasional</h4>
                    <p className="text-zinc-200 font-black text-lg italic uppercase">
                      {contactData?.operating_hours || "Senin - Sabtu: 08.00 - 22.00 WITA"}
                    </p>
                  </div>
                </div>

                {contactData?.email && (
                  <div className="flex gap-6">
                    <div className="w-14 h-14 bg-purple-600/10 rounded-2xl flex items-center justify-center shrink-0 border border-purple-500/20 shadow-lg group-hover:scale-110 transition-transform">
                      <Mail className="text-purple-500" size={26} />
                    </div>
                    <div>
                      <h4 className="font-black text-zinc-500 text-[10px] uppercase tracking-[0.2em] mb-2">Official Email</h4>
                      <p className="text-zinc-200 font-bold text-lg">{contactData.email}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <motion.a 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              href={contactData?.maps_url || defaultMapsUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="w-full py-5 bg-white text-black hover:bg-blue-600 hover:text-white rounded-[1.5rem] font-black uppercase text-xs tracking-[0.3em] shadow-2xl transition-all flex items-center justify-center gap-3 group"
            >
              NAVIGASI GOOGLE MAPS <ExternalLink size={18} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
            </motion.a>
          </motion.div>

          {/* --- GOOGLE MAPS EMBED --- */}
          <motion.div 
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            className="w-full h-[500px] lg:h-full min-h-[500px] rounded-[3rem] overflow-hidden border border-white/5 shadow-[0_30px_100px_rgba(0,0,0,0.5)] bg-[#1a1d26] relative"
          >
            {loading ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                <Loader2 className="animate-spin text-blue-600" size={40} />
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Memuat Peta...</span>
              </div>
            ) : (
              <iframe 
                src={contactData?.maps_iframe || defaultMapEmbedUrl}
                width="100%" 
                height="100%" 
                style={{ 
                  border: 0, 
                  filter: 'grayscale(0.5) contrast(1.2) brightness(0.8)',
                  mixBlendMode: 'normal'
                }} 
                allowFullScreen
                loading="lazy" 
                referrerPolicy="no-referrer-when-downgrade"
                title="Lokasi Markas PB Bilibili 162"
              ></iframe>
            )}
            
            {/* Map Overlay Frame */}
            <div className="absolute inset-0 pointer-events-none border-[12px] border-[#1a1d26] rounded-[3rem]"></div>
          </motion.div>

        </div>
      </div>
    </section>
  );
}