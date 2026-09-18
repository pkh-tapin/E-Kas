import { useState, useEffect, useMemo } from 'react';
import * as XLSX from 'xlsx';
import Swal from 'sweetalert2';
import { 
  History, Search, Filter, ArrowDownToLine, ArrowUpFromLine, 
  Wallet, Download, ArrowUpDown, Calendar, Edit3, Trash2, X, Check, Save,
  ChevronLeft, ChevronRight, DatabaseBackup
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { 
  subscribeDashboardData, 
  subscribeSettings, 
  formatDateIndo, 
  parseTimestamp, 
  fetchAPI,
  getFromFirebase,
  saveToFirebase,
  migrateSpreadsheetToFirebase
} from '../services/api';

export default function RiwayatTransaksi() {
  const { role } = useAuth();
  const isSuperAdmin = role === 'superadmin';
  const isAdmin = role === 'admin' || isSuperAdmin;

  const [loadingSync, setLoadingSync] = useState(false);
  const [search, setSearch] = useState('');
  const [filterJenis, setFilterJenis] = useState('Semua');
  const [filterBendahara, setFilterBendahara] = useState('Semua');
  const [sortOrder, setSortOrder] = useState('terbaru');

  // State Pagination untuk menangani 700+ baris data agar cepat
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

  const [rawIn, setRawIn] = useState([]);
  const [rawOut, setRawOut] = useState([]);
  const [bendaharaOptions, setBendaharaOptions] = useState([]);

  // Modal Edit State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    id: '',
    tanggal: '',
    jenis: 'Pemasukan',
    kategori: 'Kantor',
    keperluan: '',
    nominal: 0,
    bendahara: 'Herni',
    originalJenis: 'Pemasukan'
  });

  useEffect(() => {
    const unsubSet = subscribeSettings((settings) => {
      if (settings && Array.isArray(settings.bendaharaList)) {
        setBendaharaOptions(settings.bendaharaList);
      }
    });

    const unsubDash = subscribeDashboardData((dashData) => {
      if (dashData) {
        setRawIn(dashData.fullIn || []);
        setRawOut(dashData.fullOut || []);
      }
    });

    return () => {
      if (typeof unsubSet === 'function') unsubSet();
      if (typeof unsubDash === 'function') unsubDash();
    };
  }, []);

  const formatRp = (val) => {
    if (!val && val !== 0) return 'Rp 0';
    const num = typeof val === 'string' ? parseInt(val.replace(/\D/g, ''), 10) : val;
    if (isNaN(num)) return 'Rp 0';
    return 'Rp ' + num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  const formatDateWithDay = (dateInput) => {
    if (!dateInput || dateInput === '-') return '-';
    let d = new Date(dateInput);
    if (isNaN(d.getTime())) {
      const parts = String(dateInput).split('T')[0].split('-');
      if (parts.length === 3) {
        d = new Date(parts[0], parts[1] - 1, parts[2]);
      }
    }
    if (isNaN(d.getTime())) return String(dateInput);

    const days = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
    const months = [
      "Januari", "Februari", "Maret", "April", "Mei", "Juni",
      "Juli", "Agustus", "September", "Oktober", "November", "Desember"
    ];

    const dayName = days[d.getDay()];
    const dayDate = String(d.getDate()).padStart(2, '0');
    const monthName = months[d.getMonth()];
    const year = d.getFullYear();

    return `${dayName}, ${dayDate} ${monthName} ${year}`;
  };

  // SINKRONISASI DATA MANUAL DARI GOOGLE SPREADSHEET
  const handleSyncData = async () => {
    setLoadingSync(true);
    Swal.fire({
      title: 'Menyinkronkan 700+ Data...',
      text: 'Menarik seluruh baris transaksi terbaru dari Google Spreadsheet',
      didOpen: () => Swal.showLoading()
    });

    const res = await migrateSpreadsheetToFirebase();
    setLoadingSync(false);

    if (res.success) {
      Swal.fire('Berhasil!', 'Seluruh riwayat transaksi telah disinkronkan.', 'success');
    } else {
      Swal.fire('Gagal Sync', res.error || 'Terjadi kesalahan jaringan.', 'error');
    }
  };

  // GABUNGKAN & MEMOIZE SELURUH LOG TRANSAKSI MASUK & KELUAR
  const allTransactions = useMemo(() => {
    const list = [];

    rawIn.forEach((row, idx) => {
      const id = row[0] || `IN-${idx}`;
      const tglRaw = row[1] || '-';
      const jenis = 'Pemasukan';
      const kat = row[3] || row[2] || 'Umum';
      const kep = row[4] || row[3] || '-';
      const nom = Number(row[6] || row[4] || 0);
      const bend = row[8] || row[7] || 'Herni';
      const time = row[9] || parseTimestamp(tglRaw);

      list.push({
        id,
        tglRaw,
        tglDisplay: formatDateWithDay(tglRaw),
        jenis,
        kategori: kat,
        keperluan: kep,
        nominal: nom,
        bendahara: bend,
        timestamp: time,
        rawRow: row
      });
    });

    rawOut.forEach((row, idx) => {
      const id = row[0] || `OUT-${idx}`;
      const tglRaw = row[1] || '-';
      const jenis = 'Pengeluaran';
      const kat = row[3] || row[2] || 'Umum';
      const kep = row[4] || row[3] || '-';
      const nom = Number(row[6] || row[4] || 0);
      const bend = row[8] || row[7] || 'Herni';
      const time = row[9] || parseTimestamp(tglRaw);

      list.push({
        id,
        tglRaw,
        tglDisplay: formatDateWithDay(tglRaw),
        jenis,
        kategori: kat,
        keperluan: kep,
        nominal: nom,
        bendahara: bend,
        timestamp: time,
        rawRow: row
      });
    });

    return list;
  }, [rawIn, rawOut]);

  // FILTERING & SORTING DATA 700+ BARIS
  const filteredList = useMemo(() => {
    let result = allTransactions.filter((item) => {
      const searchLower = search.toLowerCase();
      const matchSearch = 
        item.id.toLowerCase().includes(searchLower) ||
        item.kategori.toLowerCase().includes(searchLower) ||
        item.keperluan.toLowerCase().includes(searchLower) ||
        item.bendahara.toLowerCase().includes(searchLower);

      const matchJenis = filterJenis === 'Semua' ? true : item.jenis === filterJenis;
      const matchBendahara = filterBendahara === 'Semua' ? true : 
        item.bendahara.toLowerCase().trim() === filterBendahara.toLowerCase().trim();

      return matchSearch && matchJenis && matchBendahara;
    });

    result.sort((a, b) => {
      if (sortOrder === 'terbaru') {
        return b.timestamp - a.timestamp;
      } else if (sortOrder === 'terlama') {
        return a.timestamp - b.timestamp;
      } else if (sortOrder === 'nominal_terbesar') {
        return b.nominal - a.nominal;
      } else if (sortOrder === 'nominal_terkecil') {
        return a.nominal - b.nominal;
      }
      return b.timestamp - a.timestamp;
    });

    return result;
  }, [allTransactions, search, filterJenis, filterBendahara, sortOrder]);

  // RESET PAGE SAAT FILTER BERUBAH
  useEffect(() => {
    setCurrentPage(1);
  }, [search, filterJenis, filterBendahara, sortOrder, itemsPerPage]);

  // METRIK RINGKASAN
  const totalRecords = filteredList.length;
  const totalPemasukanFiltered = useMemo(() => {
    return filteredList.filter(i => i.jenis === 'Pemasukan').reduce((acc, curr) => acc + curr.nominal, 0);
  }, [filteredList]);

  const totalPengeluaranFiltered = useMemo(() => {
    return filteredList.filter(i => i.jenis === 'Pengeluaran').reduce((acc, curr) => acc + curr.nominal, 0);
  }, [filteredList]);

  // PAGINASI ULTRACAPAT UNTUK 700+ BARIS
  const totalPages = Math.ceil(totalRecords / itemsPerPage) || 1;
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredList.slice(start, start + itemsPerPage);
  }, [filteredList, currentPage, itemsPerPage]);

  // LOGIKA EDIT TRANSAKSI (SUPER ADMIN)
  const handleOpenEdit = (item) => {
    let dateVal = new Date().toISOString().split('T')[0];
    if (item.tglRaw && item.tglRaw !== '-') {
      const d = new Date(item.tglRaw);
      if (!isNaN(d.getTime())) {
        dateVal = d.toISOString().split('T')[0];
      }
    }

    setEditForm({
      id: item.id,
      tanggal: dateVal,
      jenis: item.jenis,
      kategori: item.kategori,
      keperluan: item.keperluan,
      nominal: item.nominal,
      bendahara: item.bendahara,
      originalJenis: item.jenis
    });
    setShowEditModal(true);
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    setShowEditModal(false);

    Swal.fire({
      title: 'Menyimpan Perubahan...',
      didOpen: () => Swal.showLoading()
    });

    try {
      const currentDash = (await getFromFirebase("dashboard_cache")) || {
        totals: { masuk: 0, keluar: 0, iuran: 0, herni: 0, sari: 0, dina: 0 },
        fullIn: [],
        fullOut: [],
        dashboardIn: [],
        dashboardOut: []
      };

      let newFullIn = (currentDash.fullIn || []).filter(r => r[0] !== editForm.id);
      let newFullOut = (currentDash.fullOut || []).filter(r => r[0] !== editForm.id);

      const tglFormatted = formatDateIndo(editForm.tanggal);
      const rawTime = parseTimestamp(editForm.tanggal);
      const nom = Number(editForm.nominal || 0);

      const rowFormat = [
        editForm.id,
        tglFormatted,
        editForm.jenis,
        editForm.kategori,
        editForm.keperluan,
        1,
        nom,
        '-',
        editForm.bendahara,
        rawTime
      ];

      if (editForm.jenis === 'Pemasukan') {
        newFullIn = [rowFormat, ...newFullIn];
      } else {
        newFullOut = [rowFormat, ...newFullOut];
      }

      let totalMasuk = 0, totalIuran = 0, totalKeluar = 0;
      let herni = 0, sari = 0, dina = 0;

      newFullIn.forEach(r => {
        const amount = Number(r[6] || r[4] || 0);
        const bend = String(r[8] || r[7] || '').toLowerCase();
        if (r[2] === 'Iuran' || r[3] === 'Iuran' || String(r[4]).includes('Iuran')) {
          totalIuran += amount;
        } else {
          totalMasuk += amount;
        }

        if (bend.includes('herni')) herni += amount;
        else if (bend.includes('sari')) sari += amount;
        else if (bend.includes('dina') || bend.includes('riris')) dina += amount;
      });

      newFullOut.forEach(r => {
        const amount = Number(r[6] || r[4] || 0);
        const bend = String(r[8] || r[7] || '').toLowerCase();
        totalKeluar += amount;

        if (bend.includes('herni')) herni -= amount;
        else if (bend.includes('sari')) sari -= amount;
        else if (bend.includes('dina') || bend.includes('riris')) dina -= amount;
      });

      currentDash.fullIn = newFullIn;
      currentDash.fullOut = newFullOut;
      currentDash.totals = {
        masuk: totalMasuk,
        keluar: totalKeluar,
        iuran: totalIuran,
        herni, sari, dina
      };

      await saveToFirebase("dashboard_cache", currentDash);

      Swal.fire({
        icon: 'success',
        title: 'Transaksi Diperbarui!',
        text: 'Data riwayat transaksi berhasil diubah.',
        timer: 1500,
        showConfirmButton: false
      });
    } catch (err) {
      Swal.fire('Gagal Edit', err.message || 'Terjadi kesalahan sistem.', 'error');
    }
  };

  // LOGIKA HAPUS TRANSAKSI (SUPER ADMIN)
  const handleDeleteTransaction = async (item) => {
    const confirm = await Swal.fire({
      title: 'Hapus Transaksi Ini?',
      text: `Yakin ingin menghapus ${item.jenis} "${item.keperluan}" sebesar ${formatRp(item.nominal)}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Ya, Hapus Permanen',
      cancelButtonText: 'Batal',
      confirmButtonColor: '#d33'
    });

    if (confirm.isConfirmed) {
      Swal.fire({
        title: 'Menghapus Transaksi...',
        didOpen: () => Swal.showLoading()
      });

      try {
        const currentDash = (await getFromFirebase("dashboard_cache")) || {
          totals: { masuk: 0, keluar: 0, iuran: 0, herni: 0, sari: 0, dina: 0 },
          fullIn: [],
          fullOut: []
        };

        let newFullIn = (currentDash.fullIn || []).filter(r => r[0] !== item.id);
        let newFullOut = (currentDash.fullOut || []).filter(r => r[0] !== item.id);

        let totalMasuk = 0, totalIuran = 0, totalKeluar = 0;
        let herni = 0, sari = 0, dina = 0;

        newFullIn.forEach(r => {
          const amount = Number(r[6] || r[4] || 0);
          const bend = String(r[8] || r[7] || '').toLowerCase();
          if (r[2] === 'Iuran' || r[3] === 'Iuran' || String(r[4]).includes('Iuran')) {
            totalIuran += amount;
          } else {
            totalMasuk += amount;
          }

          if (bend.includes('herni')) herni += amount;
          else if (bend.includes('sari')) sari += amount;
          else if (bend.includes('dina') || bend.includes('riris')) dina += amount;
        });

        newFullOut.forEach(r => {
          const amount = Number(r[6] || r[4] || 0);
          const bend = String(r[8] || r[7] || '').toLowerCase();
          totalKeluar += amount;

          if (bend.includes('herni')) herni -= amount;
          else if (bend.includes('sari')) sari -= amount;
          else if (bend.includes('dina') || bend.includes('riris')) dina -= amount;
        });

        currentDash.fullIn = newFullIn;
        currentDash.fullOut = newFullOut;
        currentDash.totals = {
          masuk: totalMasuk,
          keluar: totalKeluar,
          iuran: totalIuran,
          herni, sari, dina
        };

        await saveToFirebase("dashboard_cache", currentDash);

        Swal.fire('Terhapus!', 'Transaksi telah dihapus dari sistem.', 'success');
      } catch (err) {
        Swal.fire('Gagal Hapus', err.message || 'Terjadi kesalahan sistem.', 'error');
      }
    }
  };

  const handleExportExcel = () => {
    try {
      const exportData = filteredList.map((item, idx) => ({
        'No': idx + 1,
        'ID Transaksi': item.id,
        'Hari & Tanggal': item.tglDisplay,
        'Jenis Transaksi': item.jenis,
        'Kategori': item.kategori,
        'Keperluan / Nama Barang': item.keperluan,
        'Bendahara Pemroses': item.bendahara,
        'Nominal (Rp)': item.nominal
      }));

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Riwayat Transaksi");
      XLSX.writeFile(workbook, `Laporan_Riwayat_Transaksi_SDM_${new Date().toISOString().split('T')[0]}.xlsx`);

      Swal.fire('Export Berhasil', `File Excel berisi ${filteredList.length} transaksi telah terunduh.`, 'success');
    } catch (err) {
      Swal.fire('Gagal Export', 'Terjadi kesalahan saat mengunduh Excel.', 'error');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in relative z-10">
      {/* HEADER PAGE */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-800 flex items-center gap-2">
            <History className="w-7 h-7 text-green-700" />
            Riwayat Transaksi Kas
          </h1>
          <p className="text-gray-500 text-sm">Daftar lengkap seluruh jurnal pemasukan dan pengeluaran e-Kas SDM.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isAdmin && (
            <button
              onClick={handleSyncData}
              disabled={loadingSync}
              className="bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition cursor-pointer disabled:bg-gray-400"
            >
              <DatabaseBackup className="w-4 h-4" /> Sync Spreadsheet
            </button>
          )}

          <button
            onClick={handleExportExcel}
            className="bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition cursor-pointer"
          >
            <Download className="w-4 h-4" /> Export Excel ({filteredList.length})
          </button>
        </div>
      </div>

      {/* METRIC SUMMARY CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center font-black">
            <Wallet className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">TOTAL RECORD DITEMUKAN</span>
            <div className="text-2xl font-black text-gray-800">{totalRecords} <span className="text-xs font-normal text-gray-400">Transaksi</span></div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-green-50 text-green-600 rounded-2xl flex items-center justify-center font-black">
            <ArrowDownToLine className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">TOTAL PEMASUKAN FILTERED</span>
            <div className="text-xl font-black text-green-700">{formatRp(totalPemasukanFiltered)}</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center font-black">
            <ArrowUpFromLine className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">TOTAL PENGELUARAN FILTERED</span>
            <div className="text-xl font-black text-red-600">{formatRp(totalPengeluaranFiltered)}</div>
          </div>
        </div>
      </div>

      {/* CONTROL & FILTER PANEL */}
      <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm space-y-3">
        <div className="flex flex-col lg:flex-row gap-3">
          {/* SEARCH BAR */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Cari ID, Kategori, atau Keperluan Barang..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-green-600 font-medium"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* FILTER JENIS */}
            <div className="flex bg-gray-100 p-1 rounded-xl text-xs font-bold">
              {['Semua', 'Pemasukan', 'Pengeluaran'].map((j) => (
                <button
                  key={j}
                  onClick={() => setFilterJenis(j)}
                  className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                    filterJenis === j ? 'bg-white text-gray-800 shadow-sm font-black' : 'text-gray-500'
                  }`}
                >
                  {j}
                </button>
              ))}
            </div>

            {/* FILTER BENDAHARA */}
            <select
              value={filterBendahara}
              onChange={(e) => setFilterBendahara(e.target.value)}
              className="px-3 py-2 bg-gray-50 border rounded-xl text-xs font-bold text-gray-700 outline-none focus:ring-2 focus:ring-green-600 cursor-pointer"
            >
              <option value="Semua">Semua Bendahara</option>
              {bendaharaOptions.map((b) => (
                <option key={b.id} value={b.nama}>{b.nama}</option>
              ))}
            </select>

            {/* FILTER URUTAN (SORT ORDER) */}
            <div className="flex items-center gap-1.5 bg-green-50/80 border border-green-200 px-3 py-1.5 rounded-xl text-xs font-bold text-green-900">
              <ArrowUpDown className="w-3.5 h-3.5 text-green-700" />
              <span>Urutan:</span>
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                className="bg-transparent font-black outline-none cursor-pointer text-green-900"
              >
                <option value="terbaru">Terbaru → Terlama (Default)</option>
                <option value="terlama">Terlama → Terbaru</option>
                <option value="nominal_terbesar">Nominal Terbesar</option>
                <option value="nominal_terkecil">Nominal Terkecil</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* TABEL DATA RIWAYAT TRANSAKSI */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-green-50/50 text-green-900 border-b font-extrabold uppercase tracking-wider">
                <th className="p-4">Hari & Tanggal</th>
                <th className="p-4">Jenis</th>
                <th className="p-4">Kategori</th>
                <th className="p-4">Keperluan / Nama Barang</th>
                <th className="p-4">Bendahara</th>
                <th className="p-4 text-right">Nominal (Rp)</th>
                {isSuperAdmin && <th className="p-4 text-center">Aksi Super Admin</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={isSuperAdmin ? 7 : 6} className="text-center py-12 text-gray-400 font-medium">
                    Tidak ditemukan data riwayat transaksi yang sesuai.
                  </td>
                </tr>
              ) : (
                paginatedData.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="p-4 font-extrabold text-gray-700 whitespace-nowrap">
                      {item.tglDisplay}
                    </td>

                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                        item.jenis === 'Pemasukan'
                          ? 'bg-green-100 text-green-700 border border-green-200'
                          : 'bg-red-100 text-red-600 border border-red-200'
                      }`}>
                        {item.jenis}
                      </span>
                    </td>

                    <td className="p-4 font-black text-gray-800 uppercase">
                      {item.kategori}
                    </td>

                    <td className="p-4 font-medium text-gray-700">
                      {item.keperluan}
                    </td>

                    <td className="p-4 font-bold text-gray-800">
                      {item.bendahara}
                    </td>

                    <td className={`p-4 text-right font-black ${
                      item.jenis === 'Pemasukan' ? 'text-green-700' : 'text-red-600'
                    }`}>
                      {formatRp(item.nominal)}
                    </td>

                    {/* AKSI SUPER ADMIN (EDIT & HAPUS) */}
                    {isSuperAdmin && (
                      <td className="p-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleOpenEdit(item)}
                            className="p-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg transition cursor-pointer"
                            title="Edit Transaksi"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteTransaction(item)}
                            className="p-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition cursor-pointer"
                            title="Hapus Transaksi"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* BAR PAGINASI NAVIGASI UNTUK 700+ DATA */}
        {totalRecords > 0 && (
          <div className="p-4 border-t border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs font-bold text-gray-600">
            <div className="flex items-center gap-2">
              <span>Tampilkan per halaman:</span>
              <select
                value={itemsPerPage}
                onChange={(e) => setItemsPerPage(Number(e.target.value))}
                className="bg-white border rounded-lg px-2 py-1 outline-none font-bold cursor-pointer"
              >
                <option value={25}>25 Baris</option>
                <option value={50}>50 Baris</option>
                <option value={100}>100 Baris</option>
                <option value={200}>200 Baris</option>
              </select>
              <span className="text-gray-400 font-normal">
                (Menampilkan {Math.min((currentPage - 1) * itemsPerPage + 1, totalRecords)} - {Math.min(currentPage * itemsPerPage, totalRecords)} dari {totalRecords} total transaksi)
              </span>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="p-2 bg-white border rounded-xl hover:bg-gray-100 transition disabled:opacity-40 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              
              <span className="px-3 py-1 bg-green-700 text-white rounded-xl font-extrabold">
                Halaman {currentPage} dari {totalPages}
              </span>

              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="p-2 bg-white border rounded-xl hover:bg-gray-100 transition disabled:opacity-40 cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* MODAL EDIT TRANSAKSI (SUPER ADMIN) */}
      {showEditModal && isSuperAdmin && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-100 space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-black text-lg text-gray-800 flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-blue-600" /> Edit Transaksi
              </h3>
              <button onClick={() => setShowEditModal(false)} className="text-gray-400 hover:text-gray-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Tanggal Transaksi</label>
                <input
                  type="date"
                  required
                  value={editForm.tanggal}
                  onChange={(e) => setEditForm({ ...editForm, tanggal: e.target.value })}
                  className="w-full p-3 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Jenis Transaksi</label>
                <select
                  required
                  value={editForm.jenis}
                  onChange={(e) => setEditForm({ ...editForm, jenis: e.target.value })}
                  className="w-full p-3 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-600 font-bold cursor-pointer"
                >
                  <option value="Pemasukan">Pemasukan</option>
                  <option value="Pengeluaran">Pengeluaran</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Kategori</label>
                <input
                  type="text"
                  required
                  value={editForm.kategori}
                  onChange={(e) => setEditForm({ ...editForm, kategori: e.target.value })}
                  className="w-full p-3 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Keperluan / Nama Barang</label>
                <input
                  type="text"
                  required
                  value={editForm.keperluan}
                  onChange={(e) => setEditForm({ ...editForm, keperluan: e.target.value })}
                  className="w-full p-3 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Bendahara Pemroses</label>
                <select
                  required
                  value={editForm.bendahara}
                  onChange={(e) => setEditForm({ ...editForm, bendahara: e.target.value })}
                  className="w-full p-3 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-600 font-bold cursor-pointer"
                >
                  {bendaharaOptions.length === 0 ? (
                    <option value="Herni">Herni</option>
                  ) : (
                    bendaharaOptions.map((b) => (
                      <option key={b.id} value={b.nama}>{b.nama}</option>
                    ))
                  )}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Nominal Transaksi (Rp)</label>
                <input
                  type="number"
                  required
                  value={editForm.nominal}
                  onChange={(e) => setEditForm({ ...editForm, nominal: e.target.value })}
                  className="w-full p-3 border rounded-xl text-lg font-black text-blue-700 outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div className="pt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-bold text-sm cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold text-sm hover:bg-blue-700 shadow-md shadow-blue-600/20 cursor-pointer"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
