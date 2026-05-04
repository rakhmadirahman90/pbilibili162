import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertCircle, Trophy, ChevronRight, Lock } from 'lucide-react';

// Database Level 1 - 10
const LEVELS_DATA = [
  {
    level: 1,
    title: "Dasar Permainan",
    grid: [
      ['S', 'E', 'R', 'V', 'I', 'C', 'E', 'X', 'X', 'X'],
      ['X', 'X', 'A', 'X', 'X', 'X', 'X', 'X', 'X', 'X'],
      ['X', 'X', 'K', 'X', 'X', 'X', 'X', 'X', 'X', 'X'],
      ['N', 'E', 'T', 'T', 'I', 'N', 'G', 'X', 'X', 'X'],
      ['X', 'X', 'X', 'X', 'X', 'X', 'X', 'X', 'X', 'X'],
      ['S', 'M', 'A', 'S', 'H', 'X', 'X', 'X', 'X', 'X'],
      ['X', 'X', 'X', 'L', 'X', 'X', 'X', 'R', 'X', 'X'],
      ['X', 'X', 'D', 'E', 'U', 'C', 'E', 'A', 'X', 'X'],
      ['X', 'X', 'X', 'B', 'X', 'X', 'X', 'K', 'X', 'X'],
      ['X', 'X', 'X', 'X', 'X', 'X', 'X', 'E', 'T', 'X'],
    ],
    numbers: { "0-0": "1", "0-2": "3", "3-0": "4", "5-0": "6", "6-3": "7", "7-2": "8", "6-7": "2" },
    clues: {
      across: ["1. Pukulan awal memulai permainan.", "4. Pukulan tipis di depan net.", "6. Pukulan keras menukik tajam.", "8. Skor sama kuat 20-20."],
      down: ["2. Alat pemukul kok.", "3. Bola bulutangkis.", "7. Pukulan melambung ke belakang."]
    }
  },
  {
    level: 2,
    title: "Area Lapangan",
    grid: [
      ['B', 'A', 'S', 'E', 'L', 'I', 'N', 'E', 'X', 'X'],
      ['X', 'X', 'X', 'X', 'X', 'X', 'E', 'X', 'X', 'X'],
      ['X', 'X', 'X', 'S', 'I', 'D', 'E', 'L', 'I', 'N'],
      ['X', 'X', 'X', 'X', 'X', 'X', 'T', 'X', 'X', 'E'],
      ['X', 'X', 'X', 'X', 'X', 'X', 'X', 'X', 'X', 'X'],
    ],
    numbers: { "0-0": "1", "2-3": "2", "0-6": "3" },
    clues: {
      across: ["1. Garis paling belakang lapangan.", "2. Garis samping lapangan."],
      down: ["3. Area depan dekat net."]
    }
  },
  // Level 3-10 dapat ditambahkan dengan pola yang sama mengikuti tingkat kesulitan yang telah direncanakan
];

const BadmintonQuiz: React.FC = () => {
  const [currentLevel, setCurrentLevel] = useState(1);
  const [unlockedLevel, setUnlockedLevel] = useState(1);
  const [userGrid, setUserGrid] = useState<string[][]>([]);
  const [isFinished, setIsFinished] = useState(false);

  const activeLevelData = LEVELS_DATA.find(l => l.level === currentLevel) || LEVELS_DATA[0];

  // Inisialisasi grid saat level berubah
  useEffect(() => {
    const newGrid = activeLevelData.grid.map(row => 
      row.map(cell => (cell === 'X' ? 'X' : ''))
    );
    setUserGrid(newGrid);
    setIsFinished(false);
  }, [currentLevel]);

  // Cek validasi otomatis
  useEffect(() => {
    if (userGrid.length === 0) return;

    const checkAllCorrect = () => {
      for (let r = 0; r < activeLevelData.grid.length; r++) {
        for (let c = 0; c < activeLevelData.grid[r].length; c++) {
          if (activeLevelData.grid[r][c] !== 'X' && userGrid[r][c] !== activeLevelData.grid[r][c]) {
            return false;
          }
        }
      }
      return true;
    };

    if (checkAllCorrect()) {
      setIsFinished(true);
      if (currentLevel === unlockedLevel && unlockedLevel < 10) {
        setUnlockedLevel(prev => prev + 1);
      }
    }
  }, [userGrid]);

  const handleInput = (r: number, c: number, val: string) => {
    const newGrid = [...userGrid];
    newGrid[r][c] = val.toUpperCase().slice(-1);
    setUserGrid(newGrid);
  };

  const handleNextLevel = () => {
    if (currentLevel < 10) setCurrentLevel(prev => prev + 1);
  };

  return (
    <section className="py-16 bg-[#0b0e14] text-white overflow-hidden min-h-screen">
      <div className="max-w-6xl mx-auto px-4">
        
        {/* LEVEL SELECTOR */}
        <div className="flex flex-wrap justify-center gap-2 mb-10">
          {Array.from({ length: 10 }, (_, i) => i + 1).map((lvl) => (
            <button
              key={lvl}
              onClick={() => lvl <= unlockedLevel && setCurrentLevel(lvl)}
              className={`w-10 h-10 rounded-xl flex items-center justify-center font-black transition-all
                ${currentLevel === lvl ? 'bg-[#3b82f6] text-white scale-110 shadow-lg shadow-blue-500/40' : 
                  lvl <= unlockedLevel ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-900 text-slate-600 cursor-not-allowed opacity-50'}`}
            >
              {lvl <= unlockedLevel ? lvl : <Lock size={14} />}
            </button>
          ))}
        </div>

        <div className="text-center mb-10">
          <motion.div
            key={currentLevel}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <h2 className="text-3xl font-black italic uppercase tracking-tighter text-[#3b82f6] mb-1">
              Level {activeLevelData.level}: {activeLevelData.title}
            </h2>
            <p className="text-gray-400 italic text-sm">Selesaikan level ini untuk membuka tantangan berikutnya.</p>
          </motion.div>
        </div>

        <div className="flex flex-col lg:flex-row gap-8 items-start justify-center">
          {/* GRID TTS */}
          <div className="grid grid-cols-10 gap-1 bg-[#1e293b] p-4 rounded-3xl shadow-2xl border border-white/5">
            {userGrid.map((row, rIdx) =>
              row.map((cell, cIdx) => {
                const cellKey = `${rIdx}-${cIdx}`;
                const number = activeLevelData.numbers[cellKey as keyof typeof activeLevelData.numbers];
                const isCorrect = cell === activeLevelData.grid[rIdx][cIdx];
                const isEmpty = cell === '';
                const isBlock = cell === 'X';

                return (
                  <div 
                    key={cellKey} 
                    className={`relative w-8 h-8 sm:w-12 sm:h-12 flex items-center justify-center rounded-xl transition-all duration-300
                      ${isBlock ? 'bg-[#020617]' : 
                        isEmpty ? 'bg-[#0f172a] border border-slate-700' : 
                        isCorrect ? 'bg-emerald-500/20 border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.2)]' : 
                        'bg-rose-500/20 border-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.2)]'} 
                      ${!isBlock && 'border-2'}`}
                  >
                    {number && (
                      <span className="absolute top-1 left-1.5 text-[10px] font-bold text-[#3b82f6] z-10 select-none">
                        {number}
                      </span>
                    )}

                    {!isBlock && (
                      <input
                        type="text"
                        value={cell}
                        onChange={(e) => handleInput(rIdx, cIdx, e.target.value)}
                        className={`w-full h-full bg-transparent text-center focus:outline-none font-black uppercase text-base sm:text-xl transition-colors
                          ${isCorrect ? 'text-emerald-400' : 'text-rose-400'}`}
                        disabled={isFinished}
                      />
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* PANEL KONTROL & PERTANYAAN */}
          <div className="w-full lg:w-96 space-y-6">
            <AnimatePresence mode="wait">
              {isFinished ? (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-emerald-600 p-6 rounded-3xl flex flex-col items-center text-center gap-4 shadow-xl shadow-emerald-500/20"
                >
                  <div className="bg-white/20 p-3 rounded-full">
                    <Trophy className="text-white w-8 h-8" />
                  </div>
                  <div>
                    <h4 className="font-black uppercase italic tracking-widest text-white text-lg">Level Clear!</h4>
                    <p className="text-emerald-100 text-xs mt-1">Wawasan Anda luar biasa, Coach!</p>
                  </div>
                  
                  {currentLevel < 10 && (
                    <button 
                      onClick={handleNextLevel}
                      className="flex items-center gap-2 bg-white text-emerald-700 px-6 py-3 rounded-2xl font-black uppercase text-sm hover:bg-emerald-50 transition-all active:scale-95 shadow-lg"
                    >
                      Level Selanjutnya <ChevronRight size={18} />
                    </button>
                  )}
                </motion.div>
              ) : (
                <div className="bg-[#0f172a] p-6 rounded-3xl border border-slate-800 flex items-center gap-4 border-l-4 border-l-[#3b82f6]">
                  <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                    <AlertCircle className="text-[#3b82f6] w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black uppercase text-slate-500 tracking-wider">Status</h4>
                    <p className="text-white text-sm font-bold">Lengkapi kotak untuk lanjut...</p>
                  </div>
                </div>
              )}
            </AnimatePresence>

            {/* CLUES BOX */}
            <div className="bg-[#0f172a] p-8 rounded-3xl border border-slate-800 shadow-xl space-y-8">
              <div>
                <h3 className="text-xs font-black uppercase italic tracking-[0.2em] text-[#3b82f6] mb-4 flex items-center gap-3">
                  <div className="h-1 w-6 bg-[#3b82f6] rounded-full" /> Mendatar
                </h3>
                <ul className="text-sm space-y-4 text-slate-300">
                  {activeLevelData.clues.across.map((clue, idx) => (
                    <li key={idx} className="leading-relaxed"><span className="text-blue-500/50 font-mono mr-2">#</span>{clue}</li>
                  ))}
                </ul>
              </div>
              
              <div className="pt-6 border-t border-slate-800">
                <h3 className="text-xs font-black uppercase italic tracking-[0.2em] text-[#3b82f6] mb-4 flex items-center gap-3">
                  <div className="h-1 w-6 bg-[#3b82f6] rounded-full" /> Menurun
                </h3>
                <ul className="text-sm space-y-4 text-slate-300">
                  {activeLevelData.clues.down.map((clue, idx) => (
                    <li key={idx} className="leading-relaxed"><span className="text-blue-500/50 font-mono mr-2">#</span>{clue}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default BadmintonQuiz;