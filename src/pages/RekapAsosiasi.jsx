import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import Swal from 'sweetalert2';
import { 
  Gift, Users, Search, Wallet, Download, DatabaseBackup 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { subscribeRekapAsosiasi, migrateSpreadsheetToFirebase, formatDateIndo, parseTimestamp } from '../services/api';

export default function RekapAsosiasi() {
  const { role } = useAuth();
  const isAdmin = role === 'admin' || role === 'superadmin';

  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [rekapList, setRekapList] = useState([]);

  useEffect(() => {
    const unsub = subscribeRekapAsosiasi((data) => {
      if (Array.isArray(data)) {
        // Urutkan Tanggal Terbaru di Atas
        const sortedData = [...data].sort((a, b) => {
          const tA = parseTimestamp(a.rawDate || a.tanggal);
          const tB = parseTimestamp(b.rawDate || b.tanggal);
          return tB - tA;
        });
        setRekapList(sortedData);
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

  const handleTriggerMigrasi = async () => {
    setLoading(true);
    Swal.fire({
      title: 'Menyinkronkan Data...',
      text: 'Menarik seluruh data rekap pencairan dari Google Spreadsheet ke Firebase',
      didOpen: () => Swal.showLoading()
    });

    const res = await migrateSpreadsheetToFirebase();
    setLoading(false);

    if (res.success) {
      Swal.fire('Berhasil!', 'Data Rekap Asosiasi telah diperbarui dari Spreadsheet.', 'success');
    } else {
      Swal.fire('Gagal Migrasi', res.error || 'Terjadi kesalahan jaringan.', 'error');
    }
  };

  const handleExportExcel = () => {
    try {
      const exportData = filteredList.map((item, idx) => ({
        'No': idx + 1,
        'Tanggal Pencairan': formatDateIndo(item.tanggal),
        'Nama Penerima SDM': item.nama || '-',
        'Sumber Dana': item.sumber || 'Asosiasi Kabupaten',
        'Keterangan Klaim': item.keterangan || '-',
        'Nominal Pencairan (Rp)': Number(item.nominal) || 0
      }));

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Rekap Klaim Asosiasi");
      XLSX.writeFile(workbook, `Rekap_Klaim_Asosiasi_SDM_${new Date().toISOString().split('T')[0]}.xlsx`);

      Swal.fire('Export Berhasil', 'File Excel rekap pencairan telah diunduh.', 'success');
    } catch (err) {
      Swal.fire('Gagal Export', 'Terjadi kesalahan saat mengunduh Excel.', 'error');
    }
  };

  const filteredList = rekapList.filter((item) => {
    const namaStr = String(item.nama || '').toLowerCase();
    const sumberStr = String(item.sumber || '').toLowerCase();
    const ketStr = String(item.keterangan || '').toLowerCase();
    const searchStr = search.toLowerCase();

    return namaStr.includes(searchStr) || sumberStr.includes(searchStr) || ketStr.includes(searchStr);
  });

  const totalPencairan = filteredList.reduce((acc, curr) => acc + (Number(curr.nominal) || 0), 0);
  const totalPenerima = filteredList.length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* HEADER PAGE */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-800 flex items-center gap-2">
            <Gift className="w-7 h-7 text-purple-700" />
            Rekap Penerima Asosiasi (Klaim)
          </h1>
          <p className="text-gray-500 text-sm">Daftar personil SDM PKH yang telah menerima pencairan dana Asosiasi.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isAdmin && (
            <>
              <button
                onClick={handleTriggerMigrasi}
                disabled={loading}
                className="bg-blue-600 text-white hover:bg-blue-700 px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition disabled:bg-gray-400"
              >
                <DatabaseBackup className="w-4 h-4" /> Sync Spreadsheet
              </button>

              <button
                onClick={handleExportExcel}
                className="bg-purple-700 text-white hover:bg-purple-800 px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition"
              >
                <Download className="w-4 h-4" /> Export Excel
              </button>
            </>
          )}
        </div>
      </div>

      {/* METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-gradient-to-br from-purple-800 to-indigo-900 text-white p-5 rounded-3xl shadow-lg relative overflow-hidden">
          <div className="flex items-center gap-2 text-purple-200 mb-1">
            <Wallet className="w-5 h-5" />
            <span className="text-xs font-bold uppercase tracking-wider">Total Dana Asosiasi Diterima SDM</span>
          </div>
          <div className="text-2xl lg:text-3xl font-extrabold tracking-tight">
            {formatRp(totalPencairan)}
          </div>
          <p className="text-[11px] text-purple-200 mt-2 font-medium">Pencairan resmi yang tercatat di sistem.</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-gray-400 mb-1">
              <Users className="w-5 h-5 text-purple-600" />
              <span className="text-xs font-bold uppercase tracking-wider">Total SDM Penerima</span>
            </div>
            <div className="text-xl lg:text-2xl font-black text-gray-800">
              {totalPenerima} <span className="text-gray-400 text-sm font-normal">Orang</span>
            </div>
          </div>
          <p className="text-[11px] text-purple-700 mt-2 font-bold">Penerima Manfaat Pencairan Asosiasi</p>
        </div>
      </div>

      {/* SEARCH BAR */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
        <div className="relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Cari nama penerima, sumber dana, atau keterangan..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-purple-700 font-medium"
          />
        </div>
      </div>

      {/* TABEL DATA KLAIM */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-purple-50 text-purple-900 border-b font-extrabold uppercase tracking-wider">
                <th className="p-4">Tanggal</th>
                <th className="p-4">Nama Penerima SDM</th>
                <th className="p-4">Sumber Dana</th>
                <th className="p-4">Keterangan Klaim Asosiasi</th>
                <th className="p-4 text-right">Nominal Pencairan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan="5" className="text-center py-12 text-gray-400 font-medium">
                    Belum ada data pencairan rekap asosiasi.
                  </td>
                </tr>
              ) : (
                filteredList.map((item, idx) => (
                  <tr key={idx} className="hover:bg-gray-50/80 transition-colors">
                    <td className="p-4 font-bold text-gray-600 whitespace-nowrap">{formatDateIndo(item.tanggal)}</td>
                    <td className="p-4 font-black text-gray-800">{item.nama}</td>
                    <td className="p-4">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-purple-100 text-purple-700 border border-purple-200">
                        {item.sumber}
                      </span>
                    </td>
                    <td className="p-4 font-medium text-gray-700">{item.keterangan}</td>
                    <td className="p-4 text-right font-black text-purple-700">{formatRp(item.nominal)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}