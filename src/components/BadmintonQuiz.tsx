import React, { useState } from 'react';

const BadmintonQuiz: React.FC = () => {
  // Definisi Grid (10x10) - 'X' adalah blok hitam, huruf adalah jawaban
  const initialGrid = [
    ['S', 'E', 'R', 'V', 'I', 'C', 'E', 'X', 'X', 'X'],
    ['X', 'X', 'A', 'X', 'X', 'X', 'X', 'X', 'X', 'X'],
    ['X', 'X', 'K', 'X', 'X', 'X', 'X', 'X', 'X', 'X'],
    ['N', 'E', 'T', 'T', 'I', 'N', 'G', 'X', 'X', 'X'],
    ['X', 'X', 'X', 'X', 'X', 'X', 'X', 'X', 'X', 'X'],
    ['S', 'M', 'A', 'S', 'H', 'X', 'X', 'X', 'X', 'X'],
    ['X', 'X', 'X', 'H', 'X', 'X', 'X', 'R', 'X', 'X'],
    ['X', 'X', 'D', 'E', 'U', 'C', 'E', 'A', 'X', 'X'],
    ['X', 'X', 'X', 'X', 'X', 'X', 'X', 'K', 'X', 'X'],
    ['X', 'X', 'X', 'X', 'X', 'X', 'X', 'E', 'T', 'X'],
  ];

  const [userGrid, setUserGrid] = useState(
    initialGrid.map(row => row.map(cell => (cell === 'X' ? 'X' : '')))
  );

  const handleInput = (r: number, c: number, val: string) => {
    const newGrid = [...userGrid];
    newGrid[r][c] = val.toUpperCase().slice(-1);
    setUserGrid(newGrid);
  };

  const checkAnswers = () => {
    let correct = true;
    for (let r = 0; r < 10; r++) {
      for (let c = 0; c < 10; c++) {
        if (initialGrid[r][c] !== 'X' && userGrid[r][c] !== initialGrid[r][c]) {
          correct = false;
          break;
        }
      }
    }
    alert(correct ? "🎉 Luar biasa! Jawaban Anda Benar!" : "❌ Ups! Ada jawaban yang masih salah.");
  };

  return (
    <section className="py-16 bg-[#0b0e14] text-white">
      <div className="max-w-5xl mx-auto px-4">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold text-[#3b82f6] mb-2">🏸 Badminton Brain Teaser</h2>
          <p className="text-gray-400">Uji wawasan bulutangkis Anda dan buktikan Anda atlet sejati!</p>
        </div>

        <div className="flex flex-col md:flex-row gap-8 items-start justify-center">
          {/* Grid TTS */}
          <div className="grid grid-cols-10 gap-1 bg-[#1e293b] p-3 rounded-lg shadow-2xl border border-[#3b82f6]/30">
            {userGrid.map((row, rIdx) =>
              row.map((cell, cIdx) => (
                <div key={`${rIdx}-${cIdx}`} className={`w-8 h-8 md:w-10 md:h-10 flex items-center justify-center rounded-sm ${cell === 'X' ? 'bg-[#020617]' : 'bg-[#0f172a] border border-[#334155]'}`}>
                  {cell !== 'X' && (
                    <input
                      type="text"
                      value={cell}
                      onChange={(e) => handleInput(rIdx, cIdx, e.target.value)}
                      className="w-full h-full bg-transparent text-center focus:outline-none focus:bg-[#3b82f6]/20 font-bold text-blue-400 uppercase"
                    />
                  )}
                </div>
              ))
            )}
          </div>

          {/* Pertanyaan */}
          <div className="flex-1 space-y-6 bg-[#0f172a] p-6 rounded-xl border border-[#334155]">
            <div>
              <h3 className="text-lg font-semibold text-[#3b82f6] border-b border-[#334155] pb-2 mb-3">Mendatar</h3>
              <ul className="text-sm space-y-2 text-gray-300">
                <li><span className="font-bold text-white">1.</span> Pukulan awal untuk memulai game.</li>
                <li><span className="font-bold text-white">4.</span> Pukulan tipis di depan net.</li>
                <li><span className="font-bold text-white">6.</span> Pukulan keras menukik tajam.</li>
                <li><span className="font-bold text-white">8.</span> Skor sama kuat 20-20.</li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-[#3b82f6] border-b border-[#334155] pb-2 mb-3">Menurun</h3>
              <ul className="text-sm space-y-2 text-gray-300">
                <li><span className="font-bold text-white">2.</span> Alat pemukul kok.</li>
                <li><span className="font-bold text-white">3.</span> Bola bulutangkis.</li>
                <li><span className="font-bold text-white">7.</span> Pukulan melambung ke belakang.</li>
              </ul>
            </div>
            <button 
              onClick={checkAnswers}
              className="w-full py-3 bg-[#3b82f6] hover:bg-blue-600 text-white font-bold rounded-lg transition-all transform hover:scale-[1.02]"
            >
              Cek Jawaban
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default BadmintonQuiz;