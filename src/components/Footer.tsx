import { useState, useEffect } from 'react';
import { Facebook, Instagram, Twitter, Youtube, Mail, Phone, MapPin, Loader2 } from 'lucide-react';
import { supabase } from '../supabase'; 

export default function Footer() {
  // --- KODE BARU: State untuk Data Dinamis Sesuai AdminFooter ---
  const [config, setConfig] = useState({
    site_name: 'PB US 162 BILIBILI',
    site_name_highlight: 'Bilibili',
    logo_url: '', // Tambahan untuk logo dinamis
    description: 'Membina legenda masa depan dengan fasilitas standar nasional dan sport-science.',
    address: 'Jl. Andi Makkasau No. 171, Parepare, Indonesia',
    copyright: `© ${new Date().getFullYear()} PB US 162 Bilibili. All rights reserved.`,
    phone: '+62 812 1902 7234',
    email: 'info@pbus162bilibili.id',
    navigation: [
      { name: 'Beranda', id: 'home' },
      { name: 'Berita', id: 'news' },
      { name: 'Atlet', id: 'players' },
      { name: 'Peringkat', id: 'rankings' },
      { name: 'Galeri', id: 'gallery' },
      { name: 'Tentang', id: 'about' }
    ],
    socials: {
      facebook: '',
      instagram: '',
      twitter: '',
      youtube: ''
    }
  });
  const [loading, setLoading] = useState(true);

  // --- KODE BARU: Fetching data berdasarkan SETTINGS_KEY 'footer_settings' ---
  useEffect(() => {
    async function loadFooterData() {
      try {
        const { data, error } = await supabase
          .from('site_settings')
          .select('footer_config')
          .eq('key', 'footer_settings') // Sesuai dengan SETTINGS_KEY di AdminFooter
          .maybeSingle();

        if (data?.footer_config) {
          const fc = data.footer_config;
          setConfig({
            site_name: fc.site_name || config.site_name,
            site_name_highlight: fc.site_name_highlight || config.site_name_highlight,
            logo_url: fc.logo_url || config.logo_url,
            description: fc.description || config.description,
            address: fc.address || config.address,
            copyright: fc.copyright || config.copyright,
            phone: fc.phone || config.phone,
            email: fc.email || config.email,
            navigation: fc.navigation || config.navigation,
            socials: { ...config.socials, ...(fc.socials || {}) }
          });
        }
      } catch (err) {
        console.error("Error loading footer config:", err);
      } finally {
        setLoading(false);
      }
    }
    loadFooterData();
  }, []);

  const scrollToSection = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    const element = document.getElementById(id);
    if (element) {
      const offset = 80; 
      const bodyRect = document.body.getBoundingClientRect().top;
      const elementRect = element.getBoundingClientRect().top;
      const elementPosition = elementRect - bodyRect;
      const offsetPosition = elementPosition - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  };

  return (
    <footer className="bg-slate-900 text-white pt-16 pb-8 relative z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-4 gap-8 mb-12">
          
          {/* Brand & Deskripsi */}
          <div className="animate-in fade-in duration-700">
            <div className="flex items-center space-x-3 mb-4">
              {/* FIXED LOGO: Tetap bulat presisi dengan aspect-square dan object-cover */}
              <div className="w-14 h-14 shrink-0 overflow-hidden rounded-full border-2 border-slate-700 bg-white">
                <img
                  src={config.logo_url || "/photo_2026-02-03_00-32-07.jpg"}
                  alt="Logo PB US 162"
                  className="w-full h-full object-cover" 
                />
              </div>
              <h3 className="text-xl font-bold italic tracking-tighter uppercase leading-tight">
                {config.site_name.replace(config.site_name_highlight, '')}
                <span className="text-blue-500">{config.site_name_highlight}</span>
              </h3>
            </div>
            <p className="text-gray-400 text-sm leading-relaxed">
              {config.description}
            </p>
          </div>

          {/* Navigasi Dinamis - Terhubung dengan Admin */}
          <div>
            <h4 className="text-lg font-bold mb-6 text-blue-400 uppercase tracking-widest text-xs">Navigasi</h4>
            <ul className="space-y-3">
              {config.navigation.map((item, idx) => (
                <li key={idx}>
                  <a 
                    href={`#${item.id}`}
                    onClick={(e) => scrollToSection(e, item.id)}
                    className="text-gray-400 hover:text-white hover:translate-x-2 transition-all duration-300 text-sm inline-block cursor-pointer font-medium"
                  >
                    {item.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Kontak Dinamis */}
          <div>
            <h4 className="text-lg font-bold mb-6 text-blue-400 uppercase tracking-widest text-xs">Hubungi Kami</h4>
            <ul className="space-y-4">
              <li className="flex items-start space-x-3 group">
                <MapPin size={18} className="text-blue-500 mt-1 shrink-0 group-hover:scale-110 transition-transform" />
                <span className="text-gray-400 text-sm">
                  {config.address}
                </span>
              </li>
              <li className="flex items-center space-x-3 group">
                <Phone size={18} className="text-blue-500 shrink-0 group-hover:scale-110 transition-transform" />
                <a href={`tel:${config.phone.replace(/\s+/g, '')}`} className="text-gray-400 hover:text-white text-sm transition-colors">
                  {config.phone}
                </a>
              </li>
              <li className="flex items-center space-x-3 group">
                <Mail size={18} className="text-blue-500 shrink-0 group-hover:scale-110 transition-transform" />
                <a href={`mailto:${config.email}`} className="text-gray-400 hover:text-white text-sm transition-colors">
                  {config.email}
                </a>
              </li>
            </ul>
          </div>

          {/* Social Media Dinamis */}
          <div>
            <h4 className="text-lg font-bold mb-6 text-blue-400 uppercase tracking-widest text-xs">Ikuti Kami</h4>
            <div className="flex flex-wrap gap-4">
              {[
                { Icon: Facebook, link: config.socials.facebook },
                { Icon: Instagram, link: config.socials.instagram },
                { Icon: Twitter, link: config.socials.twitter },
                { Icon: Youtube, link: config.socials.youtube }
              ].map((social, index) => (
                social.link && (
                  <a
                    key={index}
                    href={social.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-slate-800 hover:bg-blue-600 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg hover:-translate-y-1"
                  >
                    <social.Icon size={18} />
                  </a>
                )
              ))}
            </div>
            
            {loading && (
              <div className="mt-4 flex items-center gap-2 text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                <Loader2 size={10} className="animate-spin" /> Syncing Data...
              </div>
            )}
          </div>

        </div>

        {/* Bottom Footer Dinamis */}
        <div className="border-t border-slate-800 pt-8 text-center">
          <p className="text-gray-500 text-[10px] font-bold uppercase tracking-[0.2em]">
            {config.copyright}
          </p>
        </div>
      </div>
    </footer>
  );
}