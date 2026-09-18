import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import Swal from 'sweetalert2';
import { 
  Gift, Users, Search, Wallet, Download, DatabaseBackup,
  Plus, Edit, Trash2, X, Save
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { 
  subscribeRekapAsosiasi, 
  migrateSpreadsheetToFirebase, 
  formatDateIndo, 
  parseTimestamp,
  saveRekapAsosiasiToDatabase,
  fetchAPI
} from '../services/api';

export default function RekapAsosiasi() {
  const { role } = useAuth();
  const isAdmin = role === 'admin' || role === 'superadmin' || role === 'super_admin';
  const isSuperAdmin = role === 'superadmin' || role === 'super_admin';

  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [rekapList, setRekapList] = useState([]);

  // Modal State untuk CRUD Super Admin
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [formData, setFormData] = useState({
    tanggal: new Date().toISOString().split('T')[0],
    nama: '',
    sumber: 'Asosiasi Kabupaten',
    keterangan: '',
    nominal: ''
  });

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

  // Format Rupiah Presisi dengan ,00
  const formatRp = (val) => {
    if (!val && val !== 0) return 'Rp 0,00';
    const num = typeof val === 'string' ? parseInt(val.replace(/\D/g, ''), 10) : val;
    if (isNaN(num)) return 'Rp 0,00';
    return 'Rp ' + num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ',00';
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

  // --- HENDLER CRUD SUPER ADMIN ---
  const handleOpenModal = (item = null) => {
    if (item) {
      setEditItem(item);
      setFormData({
        tanggal: item.tanggal || new Date().toISOString().split('T')[0],
        nama: item.nama || '',
        sumber: item.sumber || 'Asosiasi Kabupaten',
        keterangan: item.keterangan || '',
        nominal: item.nominal || ''
      });
    } else {
      setEditItem(null);
      setFormData({
        tanggal: new Date().toISOString().split('T')[0],
        nama: '',
        sumber: 'Asosiasi Kabupaten',
        keterangan: '',
        nominal: ''
      });
    }
    setShowModal(true);
  };

  const handleSaveData = async (e) => {
    e.preventDefault();
    if (!formData.nama.trim() || !formData.nominal) {
      Swal.fire('Peringatan', 'Lengkapi nama penerima dan nominal.', 'warning');
      return;
    }

    setLoading(true);
    try {
      let updatedList = [...rekapList];
      let recordToSave;

      if (editItem) {
        // Mode Update / Edit
        recordToSave = { ...editItem, ...formData, autoSyncSheet: true };
        updatedList = updatedList.map(r => r.id === editItem.id ? recordToSave : r);
      } else {
        // Mode Create / Tambah Baru
        recordToSave = {
          id: `KLAIM-${Date.now()}`,
          ...formData,
          autoSyncSheet: true
        };
        updatedList = [recordToSave, ...updatedList];
      }

      await saveRekapAsosiasiToDatabase(updatedList, recordToSave);
      fetchAPI('syncToSpreadsheet', recordToSave).catch(() => {});

      Swal.fire({
        icon: 'success',
        title: editItem ? 'Data Diperbarui!' : 'Klaim Ditambahkan!',
        text: 'Data rekap klaim berhasil tersimpan dan disinkronkan.',
        timer: 1800,
        showConfirmButton: false
      });

      setShowModal(false);
    } catch (err) {
      Swal.fire('Error', 'Gagal menyimpan data rekap klaim.', 'error');
    }
    setLoading(false);
  };

  const handleDeleteItem = async (item) => {
    const confirm = await Swal.fire({
      title: `Hapus Klaim ${item.nama}?`,
      text: 'Data yang dihapus tidak dapat dikembalikan.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Ya, Hapus',
      cancelButtonText: 'Batal',
      confirmButtonColor: '#d33'
    });

    if (confirm.isConfirmed) {
      try {
        const updatedList = rekapList.filter(r => r.id !== item.id);
        await saveRekapAsosiasiToDatabase(updatedList, null, { deletedId: item.id });

        Swal.fire('Terhapus!', 'Data klaim telah dihapus dari database.', 'success');
      } catch (err) {
        Swal.fire('Error', 'Gagal menghapus data.', 'error');
      }
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
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto px-2 sm:px-4">
      {/* HEADER PAGE */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-gray-800 flex items-center gap-2">
            <Gift className="w-6 h-6 sm:w-7 sm:h-7 text-purple-700 flex-shrink-0" />
            <span>Rekap Penerima Asosiasi (Klaim)</span>
          </h1>
          <p className="text-gray-500 text-xs sm:text-sm mt-0.5">
            Daftar personil SDM PKH yang telah menerima pencairan dana Asosiasi.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {isSuperAdmin && (
            <button
              onClick={() => handleOpenModal()}
              className="bg-green-700 hover:bg-green-800 text-white px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition w-full sm:w-auto justify-center"
            >
              <Plus className="w-4 h-4" /> Tambah Klaim
            </button>
          )}

          {isAdmin && (
            <>
              <button
                onClick={handleTriggerMigrasi}
                disabled={loading}
                className="bg-blue-600 text-white hover:bg-blue-700 px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition disabled:bg-gray-400 flex-1 sm:flex-none justify-center"
              >
                <DatabaseBackup className="w-4 h-4" /> Sync Sheet
              </button>

              <button
                onClick={handleExportExcel}
                className="bg-purple-700 text-white hover:bg-purple-800 px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition flex-1 sm:flex-none justify-center"
              >
                <Download className="w-4 h-4" /> Export Excel
              </button>
            </>
          )}
        </div>
      </div>

      {/* METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <div className="bg-gradient-to-br from-purple-800 to-indigo-900 text-white p-4 sm:p-5 rounded-2xl sm:rounded-3xl shadow-lg relative overflow-hidden">
          <div className="flex items-center gap-2 text-purple-200 mb-1">
            <Wallet className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider">Total Dana Asosiasi Diterima SDM</span>
          </div>
          <div className="text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight break-all">
            {formatRp(totalPencairan)}
          </div>
          <p className="text-[10px] sm:text-[11px] text-purple-200 mt-2 font-medium">Pencairan resmi yang tercatat di sistem.</p>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-gray-400 mb-1">
              <Users className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600 flex-shrink-0" />
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider">Total SDM Penerima</span>
            </div>
            <div className="text-lg sm:text-2xl font-black text-gray-800">
              {totalPenerima} <span className="text-gray-400 text-xs sm:text-sm font-normal">Orang</span>
            </div>
          </div>
          <p className="text-[10px] sm:text-[11px] text-purple-700 mt-2 font-bold">Penerima Manfaat Pencairan Asosiasi</p>
        </div>
      </div>

      {/* SEARCH BAR */}
      <div className="bg-white p-3 sm:p-4 rounded-2xl border border-gray-100 shadow-sm">
        <div className="relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Cari nama penerima, sumber dana, atau keterangan..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border rounded-xl text-xs sm:text-sm outline-none focus:ring-2 focus:ring-purple-700 font-medium"
          />
        </div>
      </div>

      {/* TABEL DATA KLAIM (PRESISI & TDK TERPOTONG PADA MOBILE) */}
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left border-collapse text-xs min-w-[650px]">
            <thead>
              <tr className="bg-purple-50 text-purple-900 border-b font-extrabold uppercase tracking-wider">
                <th className="p-3 sm:p-4 whitespace-nowrap">Tanggal</th>
                <th className="p-3 sm:p-4 min-w-[150px]">Nama Penerima SDM</th>
                <th className="p-3 sm:p-4 whitespace-nowrap">Sumber Dana</th>
                <th className="p-3 sm:p-4 min-w-[200px]">Keterangan Klaim Asosiasi</th>
                <th className="p-3 sm:p-4 text-right whitespace-nowrap">Nominal Pencairan</th>
                {isSuperAdmin && <th className="p-3 sm:p-4 text-center whitespace-nowrap">Aksi</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={isSuperAdmin ? 6 : 5} className="text-center py-10 text-gray-400 font-medium text-xs">
                    Belum ada data pencairan rekap asosiasi.
                  </td>
                </tr>
              ) : (
                filteredList.map((item, idx) => (
                  <tr key={idx} className="hover:bg-gray-50/80 transition-colors">
                    <td className="p-3 sm:p-4 font-bold text-gray-600 whitespace-nowrap">
                      {formatDateIndo(item.tanggal)}
                    </td>
                    <td className="p-3 sm:p-4 font-black text-gray-800 break-words">
                      {item.nama}
                    </td>
                    <td className="p-3 sm:p-4 whitespace-nowrap">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-purple-100 text-purple-700 border border-purple-200">
                        {item.sumber}
                      </span>
                    </td>
                    <td className="p-3 sm:p-4 font-medium text-gray-700 break-words max-w-xs">
                      {item.keterangan || '-'}
                    </td>
                    <td className="p-3 sm:p-4 text-right font-black text-purple-700 whitespace-nowrap">
                      {formatRp(item.nominal)}
                    </td>
                    {isSuperAdmin && (
                      <td className="p-3 sm:p-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleOpenModal(item)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                            title="Edit Klaim"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteItem(item)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition"
                            title="Hapus Klaim"
                          >
                            <Trash2 className="w-4 h-4" />
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
      </div>

      {/* MODAL CRUD SUPER ADMIN (TAMBAH / EDIT KLAIM) */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl border space-y-4 animate-scale-up">
            <div className="flex justify-between items-center border-b pb-3">
              <h2 className="text-base font-black text-gray-800 flex items-center gap-2">
                <Gift className="w-5 h-5 text-purple-700" />
                {editItem ? 'Edit Data Klaim Asosiasi' : 'Tambah Klaim Baru'}
              </h2>
              <button 
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveData} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Tanggal Pencairan</label>
                <input
                  type="date"
                  required
                  value={formData.tanggal}
                  onChange={(e) => setFormData({ ...formData, tanggal: e.target.value })}
                  className="w-full p-2.5 border rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-purple-700"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Nama Penerima SDM</label>
                <input
                  type="text"
                  required
                  placeholder="Nama Lengkap SDM..."
                  value={formData.nama}
                  onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                  className="w-full p-2.5 border rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-purple-700"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Sumber Dana Asosiasi</label>
                <select
                  required
                  value={formData.sumber}
                  onChange={(e) => setFormData({ ...formData, sumber: e.target.value })}
                  className="w-full p-2.5 border rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-purple-700"
                >
                  <option value="Asosiasi Kabupaten">Asosiasi Kabupaten</option>
                  <option value="Asosiasi Provinsi">Asosiasi Provinsi</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Keterangan Klaim</label>
                <input
                  type="text"
                  placeholder="Keterangan klaim..."
                  value={formData.keterangan}
                  onChange={(e) => setFormData({ ...formData, keterangan: e.target.value })}
                  className="w-full p-2.5 border rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-purple-700"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Nominal (Rp)</label>
                <input
                  type="number"
                  required
                  placeholder="0"
                  value={formData.nominal}
                  onChange={(e) => setFormData({ ...formData, nominal: e.target.value })}
                  className="w-full p-2.5 border rounded-xl text-sm font-black text-purple-700 outline-none focus:ring-2 focus:ring-purple-700"
                />
                <p className="text-[10px] font-bold text-purple-700 mt-1">
                  Format: {formatRp(formData.nominal)}
                </p>
              </div>

              <div className="pt-3 flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 text-xs font-bold rounded-xl hover:bg-gray-200 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 bg-purple-700 text-white text-xs font-bold rounded-xl hover:bg-purple-800 transition flex items-center gap-1.5 shadow-md shadow-purple-700/20"
                >
                  <Save className="w-4 h-4" /> Simpan Data
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
