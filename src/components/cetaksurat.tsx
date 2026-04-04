// 1. TAMBAHKAN KONFIGURASI TTD (Ganti link di bawah dengan hasil upload atau Base64)
const ASSET_SURAT = {
  // Disarankan menggunakan Base64 string atau URL yang dapat diakses publik
  ttd_ketua: "https://vclmzvnyvdfxtvkmurxy.supabase.co/storage/v1/object/public/assets/ttd_ketua.png", 
  ttd_sekretaris: "https://vclmzvnyvdfxtvkmurxy.supabase.co/storage/v1/object/public/assets/ttd_sekre.png",
  stempel: "https://vclmzvnyvdfxtvkmurxy.supabase.co/storage/v1/object/public/assets/stempel.png"
};

const cetakSuratPDF = async (surat: any) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // --- LOGIKA HELPER UNTUK DRAW IMAGE (BARU) ---
  const addImageFromUrl = (url: string, x: number, y: number, w: number, h: number) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = url;
      img.crossOrigin = "Anonymous"; // Penting agar tidak kena CORS
      img.onload = () => {
        doc.addImage(img, 'PNG', x, y, w, h);
        resolve(true);
      };
      img.onerror = () => resolve(false); // Tetap lanjut jika gambar gagal muat
    });
  };

  // 1. KOP SURAT (Header) - TETAP
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("PENGURUS CABANG PERSATUAN BULUTANGKIS SELURUH INDONESIA", pageWidth / 2, 20, { align: "center" });
  doc.setFontSize(16);
  doc.text("PBSI KOTA / KABUPATEN ANDA", pageWidth / 2, 28, { align: "center" });
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Sekretariat: Jl. Alamat Lengkap No. 123, Email: pbsi@email.com, WA: 0812...", pageWidth / 2, 34, { align: "center" });
  
  // Garis Double Kop - TETAP
  doc.setLineWidth(0.8);
  doc.line(15, 37, pageWidth - 15, 37);
  doc.setLineWidth(0.2);
  doc.line(15, 38, pageWidth - 15, 38);

  // 2. BODY SURAT - TETAP
  doc.text(`Nomor  : ${surat.nomor_surat}`, 20, 50);
  doc.text(`Perihal : ${surat.perihal}`, 20, 56);
  
  // Format Tanggal Indonesia
  const tglFormatted = new Date(surat.tanggal_surat).toLocaleDateString('id-ID', {
    day: 'numeric', month: 'long', year: 'numeric'
  });
  doc.text(`Parepare, ${tglFormatted}`, pageWidth - 20, 50, { align: "right" });

  doc.text("Kepada Yth,", 20, 75);
  doc.setFont("helvetica", "bold");
  doc.text(surat.tujuan_instansi.toUpperCase(), 20, 81);
  
  doc.setFont("helvetica", "normal");
  doc.text("Dengan hormat,", 20, 95);
  const isiSplit = doc.splitTextToSize(surat.isi_surat, pageWidth - 40);
  doc.text(isiSplit, 20, 102);

  // 3. TANDA TANGAN (Footer) - DENGAN IMAGE (BARU)
  const footerY = 200;
  doc.text("Ketua Umum,", 30, footerY);
  doc.text("Sekretaris,", pageWidth - 70, footerY);

  // PROSES ADD TTD & STEMPEL SECARA ASYNC (BARU)
  // TTD Ketua
  await addImageFromUrl(ASSET_SURAT.ttd_ketua, 25, footerY + 2, 35, 25);
  // TTD Sekretaris
  await addImageFromUrl(ASSET_SURAT.ttd_sekretaris, pageWidth - 75, footerY + 2, 35, 25);
  // Stempel (Diposisikan agak menimpa TTD Ketua agar terlihat asli)
  await addImageFromUrl(ASSET_SURAT.stempel, 45, footerY + 5, 30, 30);

  doc.setFont("helvetica", "bold");
  doc.text(surat.nama_ketua.toUpperCase(), 30, footerY + 35);
  doc.text(surat.nama_sekretaris.toUpperCase(), pageWidth - 70, footerY + 35);

  // 4. LOGIKA KIRIM WHATSAPP (BARU)
  const kirimWhatsApp = () => {
    const pesan = `*SURAT KELUAR PBSI*%0A----------------------------%0A*No:* ${surat.nomor_surat}%0A*Perihal:* ${surat.perihal}%0A*Tujuan:* ${surat.tujuan_instansi}%0A%0ASurat resmi telah dibuat secara digital. Silahkan unduh dokumen pada sistem.`;
    window.open(`https://wa.me/?text=${pesan}`, '_blank');
  };

  // Simpan PDF
  doc.save(`Surat_${surat.nomor_surat}.pdf`);
  
  // Opsi: Tanya user apakah ingin langsung kirim WA
  Swal.fire({
    title: 'PDF Berhasil Dibuat',
    text: "Kirim notifikasi via WhatsApp?",
    icon: 'success',
    showCancelButton: true,
    confirmButtonText: 'Ya, Kirim WA',
    cancelButtonText: 'Tidak'
  }).then((result) => {
    if (result.isConfirmed) kirimWhatsApp();
  });
};