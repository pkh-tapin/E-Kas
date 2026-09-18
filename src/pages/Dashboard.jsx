import { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import { 
  Wallet, ArrowDownToLine, ArrowUpFromLine, Users, RefreshCw, FileText
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
    <div className="space-y-6 animate-fade-in">
      {/* HEADER DASHBOARD */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-800">Dashboard e-Kas SDM</h1>
          <p className="text-gray-500 text-sm">Ringkasan arus kas, iuran, dan saldo bendahara PKH Kab. Tapin.</p>
        </div>

        <button
          onClick={handleSyncSpreadsheet}
          disabled={loadingSync}
          className="bg-green-700 hover:bg-green-800 text-white px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 shadow-md transition disabled:bg-gray-400"
        >
          <RefreshCw className={`w-4 h-4 ${loadingSync ? 'animate-spin' : ''}`} />
          Sinkronkan Spreadsheet
        </button>
      </div>

      {/* METRICS SALDO UTAMA */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* SALDO KAS UTAMA */}
        <div className="bg-gradient-to-br from-green-800 to-emerald-900 text-white p-5 rounded-3xl shadow-lg relative overflow-hidden">
          <div className="flex items-center gap-2 text-green-200 mb-1">
            <Wallet className="w-5 h-5" />
            <span className="text-xs font-bold uppercase tracking-wider">Saldo Kas Utama</span>
          </div>
          <div className="text-2xl lg:text-3xl font-extrabold tracking-tight">
            {formatRp(saldoKasUtama)}
          </div>
          <p className="text-[11px] text-green-200 mt-2 font-medium">
            Total Pemasukan & Iuran dikurangi Pengeluaran
          </p>
        </div>

        {/* TOTAL PEMASUKAN */}
        <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-gray-400 mb-1">
              <ArrowDownToLine className="w-5 h-5 text-green-600" />
              <span className="text-xs font-bold uppercase tracking-wider">Total Pemasukan</span>
            </div>
            <div className="text-xl lg:text-2xl font-black text-green-700">
              {formatRp(totalPemasukanKeseluruhan)}
            </div>
          </div>
          <p className="text-[11px] text-gray-400 mt-2 font-medium">
            Umum: {formatRp(totals.masuk)} | Iuran: {formatRp(totals.iuran)}
          </p>
        </div>

        {/* TOTAL PENGELUARAN */}
        <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-gray-400 mb-1">
              <ArrowUpFromLine className="w-5 h-5 text-red-600" />
              <span className="text-xs font-bold uppercase tracking-wider">Total Pengeluaran</span>
            </div>
            <div className="text-xl lg:text-2xl font-black text-red-600">
              {formatRp(totalPengeluaranKeseluruhan)}
            </div>
          </div>
          <p className="text-[11px] text-gray-400 mt-2 font-medium">
            Total dana keluar untuk keperluan kantor/acara
          </p>
        </div>

        {/* SISA TARGET IURAN */}
        <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-gray-400 mb-1">
              <Users className="w-5 h-5 text-amber-500" />
              <span className="text-xs font-bold uppercase tracking-wider">Sisa Belum Terbayar</span>
            </div>
            <div className="text-xl lg:text-2xl font-black text-amber-600">
              {formatRp(dashData.totalSisaIuran || 0)}
            </div>
          </div>
          <p className="text-[11px] text-gray-400 mt-2 font-medium">
            Piutang kewajiban iuran SDM yang belum lunas
          </p>
        </div>
      </div>

      {/* RINCIAN POSISI KAS BENDAHARA */}
      <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-4">
        <h2 className="text-base font-black text-gray-800 flex items-center gap-2 border-b pb-3">
          <Wallet className="w-5 h-5 text-green-700" />
          Rincian Posisi Kas Bendahara
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 bg-green-50/60 rounded-2xl border border-green-100">
            <p className="text-xs font-bold text-green-800 mb-1">Bendahara Herni</p>
            <p className="text-lg font-black text-green-900">{formatRp(totals.herni)}</p>
          </div>

          <div className="p-4 bg-blue-50/60 rounded-2xl border border-blue-100">
            <p className="text-xs font-bold text-blue-800 mb-1">Bendahara Sari</p>
            <p className="text-lg font-black text-blue-900">{formatRp(totals.sari)}</p>
          </div>

          <div className="p-4 bg-purple-50/60 rounded-2xl border border-purple-100">
            <p className="text-xs font-bold text-purple-800 mb-1">Bendahara Dina Riris Yanti</p>
            <p className="text-lg font-black text-purple-900">{formatRp(totals.dina)}</p>
          </div>
        </div>
      </div>

      {/* RINCIAN TRANSAKSI TERBARU (BULAN INI) */}
      <div className="space-y-3">
        <h2 className="text-base font-black text-gray-800 flex items-center gap-2">
          <FileText className="w-5 h-5 text-green-700" />
          Rincian Transaksi Terbaru (Bulan Ini)
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* TABEL PEMASUKAN */}
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100 bg-green-50/50 flex items-center gap-2 text-green-800 font-extrabold text-sm">
              <ArrowDownToLine className="w-4 h-4 text-green-600" /> Data Pemasukan
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-green-50/30 text-green-900 border-b font-extrabold uppercase">
                    <th className="p-3">Tanggal</th>
                    <th className="p-3">Kategori</th>
                    <th className="p-3">Keperluan / Nama Barang</th>
                    <th className="p-3 text-right">Nominal</th>
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
                          <td className="p-3 font-bold text-gray-700">{kat}</td>
                          <td className="p-3 text-gray-800 font-medium">{kep}</td>
                          <td className="p-3 text-right font-black text-green-700">{formatRp(nom)}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* TABEL PENGELUARAN */}
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100 bg-red-50/50 flex items-center gap-2 text-red-700 font-extrabold text-sm">
              <ArrowUpFromLine className="w-4 h-4 text-red-600" /> Data Pengeluaran
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-red-50/30 text-red-900 border-b font-extrabold uppercase">
                    <th className="p-3">Tanggal</th>
                    <th className="p-3">Kategori</th>
                    <th className="p-3">Keperluan / Nama Barang</th>
                    <th className="p-3 text-right">Nominal</th>
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
                          <td className="p-3 font-bold text-gray-700">{kat}</td>
                          <td className="p-3 text-gray-800 font-medium">{kep}</td>
                          <td className="p-3 text-right font-black text-red-600">{formatRp(nom)}</td>
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