import React, { useState, useMemo, useRef, useEffect } from 'react';
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
  Award,
  Zap,
  Loader2,
  User,
  Star,
  Target,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react';

const Players: React.FC<{ initialFilter?: string }> = ({
  initialFilter = 'Semua',
}) => {
  const [currentAgeGroup, setCurrentAgeGroup] = useState(initialFilter);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPlayer, setSelectedPlayer] = useState<any | null>(null);
  const [dbPlayers, setDbPlayers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Swiper Navigation Refs
  const prevRef = useRef<HTMLButtonElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const [swiperLoaded, setSwiperLoaded] = useState(false);

  /**
   * FIX: Re-update Swiper Navigation
   */
  useEffect(() => {
    if (!isLoading) {
      setSwiperLoaded(true);
    }
  }, [isLoading]);

  /**
   * FIX 1: Sinkronisasi currentAgeGroup dengan initialFilter prop
   */
  useEffect(() => {
    if (initialFilter) {
      const formatted =
        initialFilter.charAt(0).toUpperCase() +
        initialFilter.slice(1).toLowerCase();
      setCurrentAgeGroup(formatted);
    }
  }, [initialFilter]);

  /**
   * Listener untuk menangkap event filter dari Navbar/App
   */
  useEffect(() => {
    const handleFilterEvent = (event: any) => {
      const category = event.detail;
      if (category) {
        const formattedCategory =
          category.charAt(0).toUpperCase() + category.slice(1).toLowerCase();
        setCurrentAgeGroup(formattedCategory);
      }
    };

    window.addEventListener('filterAtlet', handleFilterEvent);
    return () => {
      window.removeEventListener('filterAtlet', handleFilterEvent);
    };
  }, []);

  const fetchPlayersFromDB = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase.from('atlet_stats').select(
        `
          *, 
          pendaftaran ( 
            nama, 
            foto_url, 
            kategori,
            kategori_atlet 
          )
        `
      );
      // Kita tidak melakukan order di query karena points+total_points harus dihitung di client
      // agar sortingnya akurat berdasarkan akumulasi terbaru.

      if (error) throw error;
      setDbPlayers(data || []);
    } catch (err) {
      console.error('Database Error:', err);
    } finally {
      setTimeout(() => setIsLoading(false), 500);
    }
  };

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
  }, []);

  const processedPlayers = useMemo(() => {
    if (!dbPlayers) return [];

    const mapped = dbPlayers.map((p) => {
      const info = p.pendaftaran || {};
      const name = info.nama || 'Atlet PB US';
      const photo = info.foto_url || null;

      // PERBAIKAN: Kalkulasi Total Poin (points + total_points)
      const calculatedPoints =
        (Number(p.points) || 0) + (Number(p.total_points) || 0);

      const dbCategory = info.kategori_atlet;
      let ageGroup = 'Senior';

      if (dbCategory) {
        ageGroup =
          dbCategory.charAt(0).toUpperCase() +
          dbCategory.slice(1).toLowerCase();
      } else {
        const categoryRaw = (info.kategori || '').toUpperCase();
        if (
          categoryRaw.includes('MUDA') ||
          ['U-9', 'U-11', 'U-13', 'U-15', 'U-17', 'U-19'].some((u) =>
            categoryRaw.includes(u)
          )
        ) {
          ageGroup = 'Muda';
        }
      }

      return {
        ...p,
        name,
        img: photo,
        ageGroup,
        displayPoints: calculatedPoints, // Menggunakan hasil penjumlahan
        displaySeed: p.seed || 'UNSEEDED',
        bio:
          p.bio ||
          'Dedikasi dan semangat tinggi untuk membawa nama baik PB US 162 Bilibili di kancah nasional.',
      };
    });

    // Sorting berdasarkan akumulasi poin tertinggi
    return mapped.sort((a, b) => b.displayPoints - a.displayPoints);
  }, [dbPlayers]);

  const counts = useMemo(
    () => ({
      all: processedPlayers.length,
      senior: processedPlayers.filter((p) => p.ageGroup === 'Senior').length,
      muda: processedPlayers.filter((p) => p.ageGroup === 'Muda').length,
    }),
    [processedPlayers]
  );

  const filteredPlayers = useMemo(() => {
    return processedPlayers.filter((p) => {
      const matchesSearch = p.name
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
      const matchesAge =
        currentAgeGroup === 'Semua' || p.ageGroup === currentAgeGroup;
      return matchesSearch && matchesAge;
    });
  }, [searchTerm, currentAgeGroup, processedPlayers]);

  return (
    <section
      id="atlet"
      className="py-24 bg-[#050505] text-white min-h-screen relative overflow-hidden font-sans"
    >
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/10 blur-[150px] rounded-full -z-10" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-indigo-600/10 blur-[150px] rounded-full -z-10" />

      {/* MODAL DETAIL */}
      {selectedPlayer && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 md:p-8">
          <div
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
            onClick={() => setSelectedPlayer(null)}
          />
          <div className="relative bg-[#0f0f0f] border border-white/10 w-full max-w-5xl rounded-[2.5rem] overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)] animate-in fade-in zoom-in duration-300">
            <div className="flex flex-col md:flex-row h-full">
              <div className="w-full md:w-[45%] relative bg-gradient-to-b from-zinc-800 to-black overflow-hidden group">
                {selectedPlayer.img ? (
                  <img
                    src={selectedPlayer.img}
                    className="w-full h-full object-cover object-top scale-105"
                    alt={selectedPlayer.name}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-zinc-900">
                    <User size={120} className="text-zinc-800" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-[#0f0f0f] via-transparent to-transparent" />
                <div className="absolute top-8 left-8 bg-blue-600 px-6 py-2 rounded-2xl border border-white/20 shadow-xl">
                  <p className="text-[10px] font-black uppercase tracking-tighter text-blue-100">
                    Global Rank
                  </p>
                  <p className="text-3xl font-black italic">
                    #
                    {processedPlayers.findIndex(
                      (x) => x.id === selectedPlayer.id
                    ) + 1}
                  </p>
                </div>
              </div>

              <div className="flex-1 p-8 md:p-14 flex flex-col justify-center relative">
                <button
                  onClick={() => setSelectedPlayer(null)}
                  className="absolute top-8 right-8 w-12 h-12 flex items-center justify-center bg-white/5 rounded-full hover:bg-white/10 text-zinc-400 hover:text-white transition-all"
                >
                  <X size={24} />
                </button>
                <div className="flex items-center gap-3 mb-6">
                  <span className="px-4 py-1.5 bg-blue-600 text-white rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                    <ShieldCheck size={14} />{' '}
                    {selectedPlayer.ageGroup.toUpperCase()}
                  </span>
                  <span className="px-4 py-1.5 bg-white/5 border border-white/10 text-zinc-400 rounded-full text-[10px] font-black uppercase tracking-widest">
                    {selectedPlayer.displaySeed}
                  </span>
                </div>
                <h2 className="text-5xl md:text-6xl font-black uppercase italic mb-6 leading-none tracking-tighter">
                  {selectedPlayer.name.split(' ')[0]} <br />
                  <span className="text-blue-600">
                    {selectedPlayer.name.split(' ').slice(1).join(' ')}
                  </span>
                </h2>
                <div className="relative mb-10">
                  <div className="absolute -left-4 top-0 bottom-0 w-1 bg-blue-600 rounded-full" />
                  <p className="text-zinc-400 text-lg italic leading-relaxed pl-4">
                    "{selectedPlayer.bio}"
                  </p>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="bg-white/5 border border-white/5 p-6 rounded-[2rem] group hover:border-blue-500/50 transition-all">
                    <Trophy className="text-yellow-500 mb-3" size={24} />
                    <p className="text-[10px] text-zinc-500 uppercase font-black mb-1">
                      Total Points
                    </p>
                    <p className="text-2xl font-black text-white">
                      {selectedPlayer.displayPoints.toLocaleString()}
                    </p>
                  </div>
                  <div className="bg-white/5 border border-white/5 p-6 rounded-[2rem] group hover:border-blue-500/50 transition-all">
                    <Star className="text-blue-500 mb-3" size={24} />
                    <p className="text-[10px] text-zinc-500 uppercase font-black mb-1">
                      Win Rate
                    </p>
                    <p className="text-2xl font-black text-white">88%</p>
                  </div>
                  <div className="bg-white/5 border border-white/5 p-6 rounded-[2rem] group hover:border-blue-500/50 transition-all md:col-span-1 col-span-2">
                    <TrendingUp className="text-green-500 mb-3" size={24} />
                    <p className="text-[10px] text-zinc-500 uppercase font-black mb-1">
                      Status
                    </p>
                    <p className="text-2xl font-black text-white uppercase italic">
                      Active
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="flex flex-col md:flex-row justify-between items-end gap-6 mb-12">
          <div>
            <h2 className="text-4xl md:text-5xl font-black italic uppercase tracking-tighter">
              PROFIL <span className="text-blue-600">PEMAIN</span>
            </h2>
            <p className="text-zinc-500 text-xs font-bold tracking-[0.2em] uppercase">
              Data Sinkron dengan Manajemen Atlet
            </p>
          </div>
          <div className="relative w-full md:w-80">
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600"
              size={16}
            />
            <input
              type="text"
              placeholder="Cari nama atlet..."
              className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl py-4 pl-12 pr-4 text-xs focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-all outline-none"
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* TABS */}
        <div className="flex bg-zinc-900/50 p-1.5 rounded-full border border-zinc-800 w-fit mb-16 backdrop-blur-sm">
          {[
            { id: 'Semua', label: 'SEMUA', count: counts.all },
            { id: 'Senior', label: 'SENIOR', count: counts.senior },
            { id: 'Muda', label: 'MUDA', count: counts.muda },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setCurrentAgeGroup(tab.id)}
              className={`px-8 py-3.5 rounded-full text-[11px] font-black transition-all flex items-center gap-3 ${
                currentAgeGroup === tab.id
                  ? 'bg-blue-600 text-white shadow-[0_4px_20px_rgba(37,99,235,0.4)]'
                  : 'text-zinc-500 hover:text-white'
              }`}
            >
              {tab.label}
              <span
                className={`text-[10px] px-2 py-0.5 rounded-lg ${
                  currentAgeGroup === tab.id
                    ? 'bg-white/20 text-white'
                    : 'bg-zinc-800 text-zinc-600'
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="py-20 flex flex-col items-center gap-6">
            <div className="relative">
              <Loader2 className="animate-spin text-blue-600" size={50} />
              <div className="absolute inset-0 bg-blue-600 blur-2xl opacity-20 animate-pulse" />
            </div>
            <p className="text-xs font-black uppercase tracking-widest text-zinc-500">
              Menghubungkan Server...
            </p>
          </div>
        ) : (
          <div className="relative group/slider">
            {filteredPlayers.length > 0 ? (
              <Swiper
                key={`${currentAgeGroup}-${filteredPlayers.length}`}
                modules={[Navigation, Pagination, Autoplay]}
                spaceBetween={25}
                slidesPerView={1.2}
                navigation={{
                  prevEl: prevRef.current,
                  nextEl: nextRef.current,
                }}
                onSwiper={(swiper) => {
                  setTimeout(() => {
                    if (
                      swiper.params.navigation &&
                      typeof swiper.params.navigation !== 'boolean'
                    ) {
                      swiper.params.navigation.prevEl = prevRef.current;
                      swiper.params.navigation.nextEl = nextRef.current;
                      swiper.navigation.destroy();
                      swiper.navigation.init();
                      swiper.navigation.update();
                    }
                  });
                }}
                breakpoints={{
                  640: { slidesPerView: 2.5 },
                  1024: { slidesPerView: 4 },
                }}
                className="!pb-20"
              >
                {filteredPlayers.map((player) => (
                  <SwiperSlide key={player.id}>
                    <div
                      onClick={() => setSelectedPlayer(player)}
                      className="group cursor-pointer relative aspect-[3/4.2] rounded-[3rem] overflow-hidden bg-zinc-900 border border-zinc-800 hover:border-blue-600/50 transition-all duration-700 shadow-2xl"
                    >
                      {player.img ? (
                        <img
                          src={player.img}
                          className="w-full h-full object-cover grayscale-[0.3] group-hover:grayscale-0 group-hover:scale-110 transition-all duration-1000"
                          alt={player.name}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-zinc-800 text-zinc-700">
                          <User size={60} />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-90 group-hover:opacity-100 transition-opacity" />
                      <div className="absolute bottom-8 left-8 right-8 transform group-hover:-translate-y-2 transition-transform duration-500">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                          <p className="text-blue-500 text-[9px] font-black uppercase tracking-widest">
                            {player.ageGroup.toUpperCase()}
                          </p>
                        </div>
                        <h3 className="text-2xl font-black uppercase italic mb-4 leading-tight group-hover:text-blue-500 transition-colors line-clamp-2">
                          {player.name}
                        </h3>
                        <div className="flex justify-between items-center text-[10px] font-black pt-4 border-t border-white/10">
                          <span className="text-white/30 uppercase tracking-tighter">
                            {player.displaySeed}
                          </span>
                          <span className="bg-white/5 px-2 py-1 rounded-md">
                            {player.displayPoints.toLocaleString()} PTS
                          </span>
                        </div>
                      </div>
                    </div>
                  </SwiperSlide>
                ))}
              </Swiper>
            ) : (
              <div className="py-32 text-center">
                <Search className="mx-auto text-zinc-800 mb-4" size={48} />
                <p className="text-zinc-600 font-black uppercase italic tracking-widest">
                  Atlet "{searchTerm || currentAgeGroup}" tidak ditemukan
                </p>
              </div>
            )}

            <button
              ref={prevRef}
              className="absolute -left-6 top-1/2 -translate-y-1/2 z-20 w-14 h-14 bg-zinc-900/80 backdrop-blur-md border border-white/10 rounded-full flex items-center justify-center opacity-0 group-hover/slider:opacity-100 transition-all hover:bg-blue-600 hover:scale-110 text-white shadow-xl disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={28} />
            </button>
            <button
              ref={nextRef}
              className="absolute -right-6 top-1/2 -translate-y-1/2 z-20 w-14 h-14 bg-zinc-900/80 backdrop-blur-md border border-white/10 rounded-full flex items-center justify-center opacity-0 group-hover/slider:opacity-100 transition-all hover:bg-blue-600 hover:scale-110 text-white shadow-xl disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight size={28} />
            </button>
          </div>
        )}
      </div>
    </section>
  );
};

export default Players;
