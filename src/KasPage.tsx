// src/pages/KasPage.tsx
import PublicKasView from '../components/PublicKasView';

export default function KasPage() {
  return (
    <div className="pt-24 pb-12 bg-slate-50 min-h-screen"> 
      {/* pt-24 agar konten tidak tertutup navbar fixed */}
      <PublicKasView />
    </div>
  );
}