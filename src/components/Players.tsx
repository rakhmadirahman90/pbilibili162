import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination, Autoplay } from 'swiper/modules';
import { supabase } from '../supabase';

import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';

import {
  X,
  Search,
  Trophy,
  ChevronLeft,
  ChevronRight,
  User,
  Star,
  Loader2,
  ShieldCheck,
  TrendingUp,
  Award,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Players: React.FC<{ initialFilter?: string }> = ({
  initialFilter = 'Semua',
}) => {
  const normalizeFilter = (val: string) => {
    if (!val || val.toLowerCase() === 'all' || val.toLowerCase() === 'semua') return 'Semua';
    return val.charAt(0).toUpperCase() + val.slice(1).toLowerCase();
  };

  const [currentAgeGroup, setCurrentAgeGroup] = useState(normalizeFilter(initialFilter));
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPlayer, setSelectedPlayer] = useState<any | null>(null);
  const [dbPlayers, setDbPlayers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const prevRef = useRef<HTMLButtonElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);

  const fetchPlayersFromDB = useCallback(async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase.from('atlet_stats').select(
        `
          *, 
          pendaftaran ( 
            id,
            nama, 
            foto_url, 
            kategori,
            kategori_atlet 
          )
        `
      );

      if (error) throw error;
      setDbPlayers(data || []);
    } catch (err) {
      console.error('Database Error:', err);
    } finally {
      setTimeout(() => setIsLoading(false), 500);
    }
  }, []);

  useEffect(() => {
    fetchPlayersFromDB();
    const channel = supabase
      .channel('atlet_changes')
      .on(
        'postgres_changes',
        { event: '*', table: 'atlet_stats', schema: 'public' },
        () => fetchPlayersFromDB()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchPlayersFromDB]);

  const processedPlayers = useMemo(() => {
    if (!dbPlayers) return [];
    const uniquePlayersMap = new Map();

    dbPlayers.forEach((p) => {
      const info = p.pendaftaran || {};
      const uniqueKey = info.id || p.id;
      if (uniquePlayersMap.has(uniqueKey)) return;

      const name = info.nama || 'Atlet PB 162';
      const photo = info.foto_url || null;
      const calculatedPoints = (Number(p.points) || 0) + (Number(p.total_points) || 0);
      const dbCategory = info.kategori_atlet;
      
      let ageGroup = 'Senior';
      if (dbCategory) {
        ageGroup = normalizeFilter(dbCategory);
      } else {
        const categoryRaw = (info.kategori || '').toUpperCase();
        if (categoryRaw.includes('MUDA') || ['U-9', 'U-11', 'U-13', 'U-15', 'U-17', 'U-19'].some((u) => categoryRaw.includes(u))) {
          ageGroup = 'Muda';
        }
      }

      uniquePlayersMap.set(uniqueKey, {
        ...p,
        name,
        img: photo,
        ageGroup,
        displayPoints: calculatedPoints,
        displaySeed: p.seed || 'UNSEEDED',
        bio: p.bio || 'Dedikasi dan semangat tinggi untuk membawa nama baik PB 162 Bilibili di kancah nasional.',
      });
    });

    return Array.from(uniquePlayersMap.values()).sort((a, b) => b.displayPoints - a.displayPoints);
  }, [dbPlayers]);

  const counts = useMemo(() => ({
    all: processedPlayers.length,
    senior: processedPlayers.filter((p) => p.ageGroup === 'Senior').length,
    muda: processedPlayers.filter((p) => p.ageGroup === 'Muda').length,
  }), [processedPlayers]);

  const filteredPlayers = useMemo(() => {
    return processedPlayers.filter((p) => {
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesAge = currentAgeGroup === 'Semua' || p.ageGroup === currentAgeGroup;
      return matchesSearch && matchesAge;
    });
  }, [searchTerm, currentAgeGroup, processedPlayers]);

  return (
    <section id="atlet" className="w-full bg-[#0b0e14] text-white min-h-screen relative overflow-hidden font-sans py-12 md:py-20">
      {/* Background Ornaments */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-600/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-indigo-600/5 blur-[120px] rounded-full pointer-events-none" />

      {/* MODAL DETAIL - Menggunakan Framer Motion untuk transisi halus */}
      <AnimatePresence>
        {selectedPlayer && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 md:p-8">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/90 backdrop-blur-xl" 
              onClick={() => setSelectedPlayer(null)} 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-[#12141c] border border-white/10 w-full max-w-5xl rounded-[2.5rem] overflow-hidden shadow-[0_30px_100px_rgba(0,0,0,0.8)] z-10"
            >
              <div className="flex flex-col md:flex-row h-full">
                <div className="w-full md:w-[45%] relative bg-[#1a1d26] overflow-hidden min-h-[350px]">
                  {selectedPlayer.img ? (
                    <img src={selectedPlayer.img} className="w-full h-full object-cover object-top scale-105" alt={selectedPlayer.name} />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-zinc-900"><User size={120} className="text-zinc-800" /></div>
                  )}
                  <div className="absolute top-8 left-8 bg-blue-600 px-6 py-2 rounded-2xl border border-white/20 shadow-xl">
                    <p className="text-[10px] font-black uppercase tracking-tighter text-blue-100">Global Rank</p>
                    <p className="text-3xl font-black italic">#{processedPlayers.findIndex((x) => x.id === selectedPlayer.id) + 1}</p>
                  </div>
                </div>

                <div className="flex-1 p-8 md:p-14 flex flex-col justify-center relative bg-[#0b0e14]">
                  <button onClick={() => setSelectedPlayer(null)} className="absolute top-8 right-8 w-12 h-12 flex items-center justify-center bg-white/5 rounded-full text-zinc-400 hover:text-white transition-all"><X size={24} /></button>
                  <div className="flex items-center gap-3 mb-6">
                    <span className="px-4 py-1.5 bg-blue-600 text-white rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-blue-600/20"><ShieldCheck size={14} /> {selectedPlayer.ageGroup.toUpperCase()}</span>
                    <span className="px-4 py-1.5 bg-white/5 border border-white/10 text-zinc-400 rounded-full text-[10px] font-black uppercase tracking-widest">{selectedPlayer.displaySeed}</span>
                  </div>
                  <h2 className="text-4xl md:text-6xl font-black uppercase italic mb-6 leading-none tracking-tighter">
                    {selectedPlayer.name.split(' ')[0]} <br />
                    <span className="text-blue-600">{selectedPlayer.name.split(' ').slice(1).join(' ')}</span>
                  </h2>
                  <div className="relative mb-10">
                    <div className="absolute -left-4 top-0 bottom-0 w-1 bg-blue-600 rounded-full shadow-[0_0_15px_rgba(37,99,235,0.5)]" />
                    <p className="text-zinc-400 text-lg italic leading-relaxed pl-4">"{selectedPlayer.bio}"</p>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="bg-[#1a1d26] border border-white/5 p-6 rounded-[2rem] hover:border-blue-600/30 transition-colors">
                      <Trophy className="text-yellow-500 mb-3" size={24} />
                      <p className="text-[10px] text-zinc-500 uppercase font-black mb-1">Total Points</p>
                      <p className="text-2xl font-black text-white">{selectedPlayer.displayPoints.toLocaleString()}</p>
                    </div>
                    <div className="bg-[#1a1d26] border border-white/5 p-6 rounded-[2rem] hover:border-blue-600/30 transition-colors">
                      <Star className="text-blue-500 mb-3" size={24} />
                      <p className="text-[10px] text-zinc-500 uppercase font-black mb-1">Win Rate</p>
                      <p className="text-2xl font-black text-white">88%</p>
                    </div>
                    <div className="bg-[#1a1d26] border border-white/5 p-6 rounded-[2rem] md:col-span-1 col-span-2 hover:border-blue-600/30 transition-colors">
                      <TrendingUp className="text-green-500 mb-3" size={24} />
                      <p className="text-[10px] text-zinc-500 uppercase font-black mb-1">Status</p>
                      <p className="text-2xl font-black text-white uppercase italic">Active</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="flex flex-col md:flex-row justify-between items-end gap-6 mb-12">
          <div>
            <motion.h2 initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="text-4xl md:text-5xl font-black italic uppercase tracking-tighter">PROFIL <span className="text-blue-600">PEMAIN</span></motion.h2>
            <p className="text-zinc-500 text-xs font-bold tracking-[0.2em] uppercase mt-2">Data Sinkron dengan Manajemen Atlet</p>
          </div>
          <div className="relative w-full md:w-80 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-blue-600 transition-colors" size={16} />
            <input 
              type="text" 
              placeholder="Cari nama atlet..." 
              className="w-full bg-[#1a1d26] border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-xs outline-none focus:border-blue-600/50 transition-all text-white placeholder:text-zinc-600" 
              onChange={(e) => setSearchTerm(e.target.value)} 
            />
          </div>
        </div>

        {/* TABS DENGAN DARK THEME */}
        <div className="flex bg-[#1a1d26] p-1.5 rounded-full border border-white/5 w-fit mb-16 backdrop-blur-md shadow-2xl">
          {[
            { id: 'Semua', label: 'SEMUA', count: counts.all },
            { id: 'Senior', label: 'SENIOR', count: counts.senior },
            { id: 'Muda', label: 'MUDA', count: counts.muda },
          ].map((tab) => (
            <button 
              key={tab.id} 
              onClick={() => setCurrentAgeGroup(tab.id)} 
              className={`px-6 md:px-8 py-3 rounded-full text-[10px] md:text-[11px] font-black transition-all flex items-center gap-3 ${currentAgeGroup === tab.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-zinc-500 hover:text-white'}`}
            >
              {tab.label} <span className={`text-[9px] px-2 py-0.5 rounded-lg ${currentAgeGroup === tab.id ? 'bg-white/20 text-white' : 'bg-zinc-800 text-zinc-600'}`}>{tab.count}</span>
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="py-20 flex flex-col items-center gap-6">
            <div className="relative">
              <Loader2 className="animate-spin text-blue-600" size={50} />
              <div className="absolute inset-0 blur-xl bg-blue-600/20 animate-pulse" />
            </div>
            <p className="text-xs font-black uppercase tracking-widest text-zinc-500">Sinkronisasi Database...</p>
          </div>
        ) : (
          <div className="relative group/slider">
            {filteredPlayers.length > 0 ? (
              <Swiper
                key={`${currentAgeGroup}-${filteredPlayers.length}`}
                modules={[Navigation, Pagination, Autoplay]}
                spaceBetween={25}
                slidesPerView={1.2}
                autoplay={{ delay: 4000, disableOnInteraction: false }}
                navigation={{ prevEl: prevRef.current, nextEl: nextRef.current }}
                onBeforeInit={(swiper) => {
                  // @ts-ignore
                  swiper.params.navigation.prevEl = prevRef.current;
                  // @ts-ignore
                  swiper.params.navigation.nextEl = nextRef.current;
                }}
                breakpoints={{ 640: { slidesPerView: 2.5 }, 1024: { slidesPerView: 4 } }}
                className="!pb-20"
              >
                {filteredPlayers.map((player) => (
                  <SwiperSlide key={player.id}>
                    <motion.div 
                      whileHover={{ y: -10 }}
                      onClick={() => setSelectedPlayer(player)} 
                      className="group cursor-pointer relative aspect-[3/4.2] rounded-[2.5rem] overflow-hidden bg-[#1a1d26] border border-white/5 hover:border-blue-600/50 transition-all duration-500 shadow-2xl"
                    >
                      {player.img ? (
                        <img src={player.img} className="w-full h-full object-cover grayscale-[0.2] group-hover:grayscale-0 group-hover:scale-110 transition-all duration-700" alt={player.name} />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-[#1a1d26] text-zinc-800"><User size={60} /></div>
                      )}
                      
                      {/* Overlay Gradient Elegan */}
                      <div className="absolute inset-0 bg-gradient-to-t from-[#0b0e14] via-[#0b0e14]/20 to-transparent opacity-90 group-hover:opacity-100 transition-opacity" />
                      
                      <div className="absolute bottom-8 left-8 right-8 transform group-hover:-translate-y-2 transition-transform duration-500">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-2 h-2 rounded-full bg-blue-600 shadow-[0_0_8px_rgba(37,99,235,0.8)]" />
                          <p className="text-blue-500 text-[9px] font-black uppercase tracking-widest">{player.ageGroup.toUpperCase()}</p>
                        </div>
                        <h3 className="text-xl md:text-2xl font-black uppercase italic mb-4 leading-tight group-hover:text-blue-500 transition-colors line-clamp-2">{player.name}</h3>
                        <div className="flex justify-between items-center text-[10px] font-black pt-4 border-t border-white/5">
                          <span className="text-white/30 uppercase tracking-tighter">{player.displaySeed}</span>
                          <span className="bg-blue-600/10 text-blue-500 px-3 py-1 rounded-full border border-blue-600/20">{player.displayPoints.toLocaleString()} PTS</span>
                        </div>
                      </div>
                    </motion.div>
                  </SwiperSlide>
                ))}
              </Swiper>
            ) : (
              <div className="py-32 text-center bg-[#1a1d26]/50 rounded-[3rem] border border-white/5">
                <Search className="mx-auto text-zinc-800 mb-4" size={48} />
                <p className="text-zinc-600 font-black uppercase italic tracking-widest">Atlet tidak ditemukan</p>
                <button onClick={() => {setCurrentAgeGroup('Semua'); setSearchTerm('');}} className="mt-6 px-8 py-3 bg-blue-600 text-white rounded-full text-[10px] font-black uppercase hover:bg-blue-700 transition-all shadow-xl shadow-blue-600/20">Lihat Semua Atlet</button>
              </div>
            )}
            
            {/* Navigasi Custom */}
            <button ref={prevRef} className="absolute -left-4 md:-left-6 top-1/2 -translate-y-1/2 z-20 w-12 md:w-14 h-12 md:h-14 bg-[#1a1d26]/80 backdrop-blur-md border border-white/10 rounded-full flex items-center justify-center opacity-0 group-hover/slider:opacity-100 transition-all hover:bg-blue-600 text-white shadow-2xl"><ChevronLeft size={28} /></button>
            <button ref={nextRef} className="absolute -right-4 md:-right-6 top-1/2 -translate-y-1/2 z-20 w-12 md:w-14 h-12 md:h-14 bg-[#1a1d26]/80 backdrop-blur-md border border-white/10 rounded-full flex items-center justify-center opacity-0 group-hover/slider:opacity-100 transition-all hover:bg-blue-600 text-white shadow-2xl"><ChevronRight size={28} /></button>
          </div>
        )}
      </div>
    </section>
  );
};

export default Players;