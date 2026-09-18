import { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import { 
  Wallet, ArrowDownToLine, ArrowUpFromLine, Users, RefreshCw, FileText,
  CreditCard, Info, CheckCircle2, ShieldAlert
} from 'lucide-react';
import { subscribeDashboardData, migrateSpreadsheetToFirebase, formatDateIndo } from '../services/api';

export default function Dashboard() {
  const [loadingSync, setLoadingSync] = useState(false);
  const [dashData, setDashData] = useState({
    totals: { masuk: 0, keluar: 0, iuran: 0, herni: 0, sari: 0, dina: 0 },
    saldo: 0,
    totalSisaIuran: 0,
    dashboardIn: [],
    dashboardOut: []
  });

  useEffect(() => {
    const unsub = subscribeDashboardData((data) => {
      if (data) {
        setDashData(data);
      }
    });

    return () => {
      if (typeof unsub === 'function') unsub();
    };
  }, []);

  const formatRp = (val) => {
    if (!val && val !== 0) return 'Rp 0';
    const num = typeof val === 'string' ? parseInt(val.replace(/\D/g, ''), 10) : val;
    if (isNaN(num)) return 'Rp 0';
    return 'Rp ' + num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  const handleSyncSpreadsheet = async () => {
    setLoadingSync(true);
    Swal.fire({
      title: 'Menyinkronkan Spreadsheet...',
      text: 'Mengambil data transaksi dan kas terbaru dari Google Spreadsheet ke Firebase',
      didOpen: () => Swal.showLoading()
    });

    const res = await migrateSpreadsheetToFirebase();
    setLoadingSync(false);

    if (res.success) {
      Swal.fire({
        icon: 'success',
        title: 'Sinkronisasi Berhasil!',
        text: 'Data Dashboard & Kas telah diperbarui.',
        timer: 1500,
        showConfirmButton: false
      });
    } else {
      Swal.fire('Gagal Sync', res.error || 'Terjadi kesalahan jaringan.', 'error');
    }
  };

  const totals = dashData.totals || { masuk: 0, keluar: 0, iuran: 0, herni: 0, sari: 0, dina: 0 };
  const totalPemasukanKeseluruhan = (totals.masuk || 0) + (totals.iuran || 0);
  const totalPengeluaranKeseluruhan = totals.keluar || 0;
  const saldoKasUtama = totalPemasukanKeseluruhan - totalPengeluaranKeseluruhan;

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto px-2 sm:px-4">
      {/* HEADER DASHBOARD */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-gray-800">Dashboard e-Kas SDM</h1>
          <p className="text-gray-500 text-xs sm:text-sm mt-0.5">Ringkasan arus kas, iuran Asosiasi, dan saldo bendahara PKH Kab. Tapin.</p>
        </div>

        <button
          onClick={handleSyncSpreadsheet}
          disabled={loadingSync}
          className="bg-green-700 hover:bg-green-800 text-white px-3.5 py-2.5 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 shadow-md transition disabled:bg-gray-400 w-full sm:w-auto"
        >
          <RefreshCw className={`w-4 h-4 ${loadingSync ? 'animate-spin' : ''}`} />
          <span>Sinkronkan Spreadsheet</span>
        </button>
      </div>

      {/* METRICS SALDO UTAMA */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* SALDO KAS UTAMA */}
        <div className="bg-gradient-to-br from-green-800 to-emerald-900 text-white p-4 sm:p-5 rounded-2xl sm:rounded-3xl shadow-lg relative overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-green-200 mb-1">
              <Wallet className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider">Saldo Kas Utama</span>
            </div>
            <div className="text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight break-all">
              {formatRp(saldoKasUtama)}
            </div>
          </div>
          <p className="text-[10px] sm:text-[11px] text-green-200 mt-2 font-medium">
            Total Pemasukan & Asosiasi dikurangi Pengeluaran
          </p>
        </div>

        {/* TOTAL PEMASUKAN */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-gray-400 mb-1">
              <ArrowDownToLine className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 flex-shrink-0" />
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider">Total Pemasukan</span>
            </div>
            <div className="text-lg sm:text-2xl font-black text-green-700 break-all">
              {formatRp(totalPemasukanKeseluruhan)}
            </div>
          </div>
          <p className="text-[10px] sm:text-[11px] text-gray-400 mt-2 font-medium truncate">
            Umum: {formatRp(totals.masuk)} | Asosiasi: {formatRp(totals.iuran)}
          </p>
        </div>

        {/* TOTAL PENGELUARAN */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-gray-400 mb-1">
              <ArrowUpFromLine className="w-4 h-4 sm:w-5 sm:h-5 text-red-600 flex-shrink-0" />
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider">Total Pengeluaran</span>
            </div>
            <div className="text-lg sm:text-2xl font-black text-red-600 break-all">
              {formatRp(totalPengeluaranKeseluruhan)}
            </div>
          </div>
          <p className="text-[10px] sm:text-[11px] text-gray-400 mt-2 font-medium">
            Total dana keluar untuk kantor/acara
          </p>
        </div>

        {/* SISA TARGET ASOSIASI */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-gray-400 mb-1">
              <Users className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500 flex-shrink-0" />
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider">Sisa Belum Terbayar</span>
            </div>
            <div className="text-lg sm:text-2xl font-black text-amber-600 break-all">
              {formatRp(dashData.totalSisaIuran || 0)}
            </div>
          </div>
          <p className="text-[10px] sm:text-[11px] text-gray-400 mt-2 font-medium">
            Piutang kewajiban Asosiasi SDM belum lunas
          </p>
        </div>
      </div>

      {/* RINCIAN POSISI KAS BENDAHARA */}
      <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-gray-100 shadow-sm space-y-4">
        <h2 className="text-sm sm:text-base font-black text-gray-800 flex items-center gap-2 border-b pb-3">
          <Wallet className="w-4 h-4 sm:w-5 sm:h-5 text-green-700 flex-shrink-0" />
          <span>Rincian Posisi Kas Bendahara</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          <div className="p-3.5 sm:p-4 bg-green-50/60 rounded-2xl border border-green-100">
            <p className="text-xs font-bold text-green-800 mb-1">Bendahara Herni</p>
            <p className="text-base sm:text-lg font-black text-green-900 break-all">{formatRp(totals.herni)}</p>
          </div>

          <div className="p-3.5 sm:p-4 bg-blue-50/60 rounded-2xl border border-blue-100">
            <p className="text-xs font-bold text-blue-800 mb-1">Bendahara Sari</p>
            <p className="text-base sm:text-lg font-black text-blue-900 break-all">{formatRp(totals.sari)}</p>
          </div>

          <div className="p-3.5 sm:p-4 bg-purple-50/60 rounded-2xl border border-purple-100">
            <p className="text-xs font-bold text-purple-800 mb-1">Bendahara Dina Riris Yanti</p>
            <p className="text-base sm:text-lg font-black text-purple-900 break-all">{formatRp(totals.dina)}</p>
          </div>
        </div>
      </div>

      {/* SEKSI INFORMASI PEMBAYARAN & KETENTUAN KLAIM ASOSIASI */}
      <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-amber-200/80 shadow-sm space-y-5 bg-gradient-to-b from-amber-50/30 to-white">
        <div className="flex items-center gap-2 border-b border-amber-200/60 pb-3">
          <CreditCard className="w-5 h-5 text-amber-700 flex-shrink-0" />
          <h2 className="text-sm sm:text-base font-black text-amber-900">Ketentuan Pembayaran & Klaim Suka Duka Asosiasi</h2>
        </div>

        {/* INFO REKENING PEMBAYARAN */}
        <div className="bg-amber-100/60 border border-amber-200 rounded-2xl p-4 space-y-2">
          <p className="text-xs font-black text-amber-900 flex items-center gap-1.5 uppercase tracking-wide">
            <Info className="w-4 h-4 text-amber-800 flex-shrink-0" />
            Pembayaran Asosiasi Ditolak / Ditransfer Ke:
          </p>
          <p className="text-xs font-extrabold text-amber-950">Atas Nama : <span className="text-green-800">ERMA FEBRIYANTI</span></p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 pt-1 text-xs font-bold text-gray-800">
            <div className="bg-white/80 p-2.5 rounded-xl border border-amber-200">
              <span className="text-[10px] text-gray-500 block uppercase">Bank MANDIRI</span>
              <span className="font-mono text-xs sm:text-sm font-black text-blue-900">310022083748</span>
            </div>
            <div className="bg-white/80 p-2.5 rounded-xl border border-amber-200">
              <span className="text-[10px] text-gray-500 block uppercase">Bank BRI</span>
              <span className="font-mono text-xs sm:text-sm font-black text-blue-900">78900100 0090 506</span>
            </div>
            <div className="bg-white/80 p-2.5 rounded-xl border border-amber-200">
              <span className="text-[10px] text-gray-500 block uppercase">Bank KALSEL</span>
              <span className="font-mono text-xs sm:text-sm font-black text-blue-900">2002081671</span>
            </div>
          </div>
        </div>

        {/* CATATAN DAN ATURAN KLAIM */}
        <div className="space-y-3 text-xs text-gray-700 leading-relaxed font-medium">
          <p className="font-black text-gray-900 uppercase text-[11px] tracking-wider flex items-center gap-1">
            <ShieldAlert className="w-4 h-4 text-amber-600 flex-shrink-0" />
            Catatan Penting Konfirmasi & Klaim:
          </p>
          
          <ul className="list-disc pl-5 space-y-1.5 text-gray-700">
            <li><strong>Konfirmasi Iuran:</strong> Iuran Asosiasi dikonfirmasi menggunakan bukti transfer dan informasi jumlah SDM yang dibayarkan beserta bulan pembayaran.</li>
            <li><strong>Pengajuan Dana Suka Duka:</strong> Mengirimkan list nama SDM yang akan diklaim beserta keterangan/info kondisi secara lengkap.</li>
            <li><strong>Dana Solidaritas:</strong> Rp 50.000 / SDM / Tahun akan ditagihkan setiap bulan <strong>JULI</strong>.</li>
            <li><strong>Batas Klaim:</strong> SDM hanya bisa mengklaim dana suka duka <strong>1x dalam 1 tahun</strong>.</li>
            <li><strong>Ketentuan Tunggakan:</strong> Apabila tidak melakukan pembayaran Asosiasi dalam waktu <strong>maksimal 3 bulan</strong>, maka Kab/Kota tidak bisa mengajukan klaim suka duka untuk SDM-nya.</li>
          </ul>

          <div className="pt-2">
            <p className="font-bold text-gray-900 mb-1.5">Kriteria Kejadian yang Bisa Diklaim:</p>
            <ol className="list-decimal pl-5 space-y-1 text-gray-700 font-medium">
              <li>SDM PKH / Istri / Suami / Anak masuk rumah sakit (opname rawat inap minimal 1 x 24 jam).</li>
              <li>Istri / SDM Melahirkan.</li>
              <li>SDM menikah untuk satu-satunya pasangan (bukan untuk istri ke-2 dan seterusnya).</li>
              <li>Orang tua kandung SDM (bukan mertua) meninggal dunia.</li>
              <li>Istri / Suami / Anak meninggal dunia.</li>
            </ol>
          </div>

          <div className="bg-purple-50 p-3.5 rounded-2xl border border-purple-100 text-purple-900 mt-2">
            <p className="font-bold mb-1 flex items-center gap-1 text-purple-950">
              <CheckCircle2 className="w-4 h-4 text-purple-700 flex-shrink-0" />
              Bukti Wajib Penyerahan Dana Suka Duka Kepada Pendamping:
            </p>
            <ol className="list-decimal pl-5 space-y-0.5 text-[11px] font-semibold text-purple-800">
              <li>Bukti Transfer ke Rekening yang bersangkutan, ATAU</li>
              <li>Foto penyerahan dana Asosiasi disertai geotag dan waktu penyerahan kepada ybs.</li>
            </ol>
          </div>
        </div>
      </div>

      {/* RINCIAN TRANSAKSI TERBARU (BULAN INI) */}
      <div className="space-y-3">
        <h2 className="text-sm sm:text-base font-black text-gray-800 flex items-center gap-2">
          <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-green-700 flex-shrink-0" />
          <span>Rincian Transaksi Terbaru (Bulan Ini)</span>
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* TABEL PEMASUKAN */}
          <div className="bg-white rounded-2xl sm:rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-3.5 sm:p-4 border-b border-gray-100 bg-green-50/50 flex items-center gap-2 text-green-800 font-extrabold text-xs sm:text-sm">
              <ArrowDownToLine className="w-4 h-4 text-green-600 flex-shrink-0" /> Data Pemasukan
            </div>
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left border-collapse text-xs min-w-[450px]">
                <thead>
                  <tr className="bg-green-50/30 text-green-900 border-b font-extrabold uppercase">
                    <th className="p-3 whitespace-nowrap">Tanggal</th>
                    <th className="p-3 whitespace-nowrap">Kategori</th>
                    <th className="p-3 min-w-[140px]">Keperluan / Barang</th>
                    <th className="p-3 text-right whitespace-nowrap">Nominal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {(!dashData.dashboardIn || dashData.dashboardIn.length === 0) ? (
                    <tr>
                      <td colSpan="4" className="text-center py-8 text-gray-400 font-medium">
                        Belum ada data pemasukan bulan ini.
                      </td>
                    </tr>
                  ) : (
                    dashData.dashboardIn.map((row, idx) => {
                      const tgl = formatDateIndo(row[0]);
                      const kat = row[1] || 'Umum';
                      const kep = row.length >= 4 ? row[2] : '-';
                      const nom = row.length >= 4 ? row[3] : row[2];

                      return (
                        <tr key={idx} className="hover:bg-gray-50/80 transition-colors">
                          <td className="p-3 text-gray-600 font-bold whitespace-nowrap">{tgl}</td>
                          <td className="p-3 font-bold text-gray-700 whitespace-nowrap">{kat}</td>
                          <td className="p-3 text-gray-800 font-medium break-words max-w-[160px]">{kep}</td>
                          <td className="p-3 text-right font-black text-green-700 whitespace-nowrap">{formatRp(nom)}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* TABEL PENGELUARAN */}
          <div className="bg-white rounded-2xl sm:rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-3.5 sm:p-4 border-b border-gray-100 bg-red-50/50 flex items-center gap-2 text-red-700 font-extrabold text-xs sm:text-sm">
              <ArrowUpFromLine className="w-4 h-4 text-red-600 flex-shrink-0" /> Data Pengeluaran
            </div>
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left border-collapse text-xs min-w-[450px]">
                <thead>
                  <tr className="bg-red-50/30 text-red-900 border-b font-extrabold uppercase">
                    <th className="p-3 whitespace-nowrap">Tanggal</th>
                    <th className="p-3 whitespace-nowrap">Kategori</th>
                    <th className="p-3 min-w-[140px]">Keperluan / Barang</th>
                    <th className="p-3 text-right whitespace-nowrap">Nominal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {(!dashData.dashboardOut || dashData.dashboardOut.length === 0) ? (
                    <tr>
                      <td colSpan="4" className="text-center py-8 text-gray-400 font-medium">
                        Belum ada data pengeluaran bulan ini.
                      </td>
                    </tr>
                  ) : (
                    dashData.dashboardOut.map((row, idx) => {
                      const tgl = formatDateIndo(row[0]);
                      const kat = row[1] || 'Umum';
                      const kep = row.length >= 4 ? row[2] : '-';
                      const nom = row.length >= 4 ? row[3] : row[2];

                      return (
                        <tr key={idx} className="hover:bg-gray-50/80 transition-colors">
                          <td className="p-3 text-gray-600 font-bold whitespace-nowrap">{tgl}</td>
                          <td className="p-3 font-bold text-gray-700 whitespace-nowrap">{kat}</td>
                          <td className="p-3 text-gray-800 font-medium break-words max-w-[160px]">{kep}</td>
                          <td className="p-3 text-right font-black text-red-600 whitespace-nowrap">{formatRp(nom)}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
