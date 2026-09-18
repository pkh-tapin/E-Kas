import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import Swal from 'sweetalert2';
import { Upload, RefreshCw, Search, UserCheck, Trash2, PlusCircle, CheckCircle2 } from 'lucide-react';
import { getFastPegawaiSDM, saveSDMToDatabase } from '../services/api';

export default function DatabaseSDM() {
  const [dataSDM, setDataSDM] = useState([]);
  const [search, setSearch] = useState('');
  const [loadingSync, setLoadingSync] = useState(true);

  // Form Tambah SDM Manual Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newSDM, setNewSDM] = useState({
    nik: '',
    nama: '',
    jabatan: 'Pendamping Sosial',
    kecamatan: '',
    status: 'Aktif'
  });

  useEffect(() => {
    loadSDMData();
  }, []);

  const loadSDMData = async () => {
    setLoadingSync(true);
    await getFastPegawaiSDM((latestSDM) => {
      if (Array.isArray(latestSDM)) {
        setDataSDM(latestSDM);
      }
      setLoadingSync(false);
    });
  };

  // 1. HANDLE UPLOAD EXCEL (Import langsung ke Firebase & Sync Spreadsheet)
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const parsedData = XLSX.utils.sheet_to_json(ws);

        if (parsedData.length === 0) {
          Swal.fire('File Kosong', 'Tidak ada data ditemukan dalam sheet Excel.', 'warning');
          return;
        }

        const formattedData = parsedData.map((item, index) => ({
          id: dataSDM.length + index + 1,
          nik: item.NIK || item.nik || `-`,
          nama: item.Nama || item.NAMA || item.nama || `Tanpa Nama`,
          jabatan: item.Jabatan || item.JABATAN || item.jabatan || `Pendamping Sosial`,
          kecamatan: item.Kecamatan || item.KECAMATAN || item.kecamatan || `-`,
          status: 'Aktif',
        }));

        const updatedList = [...dataSDM, ...formattedData];
        setDataSDM(updatedList);
        await saveSDMToDatabase(updatedList);

        Swal.fire({
          title: 'Import Berhasil!',
          text: `${formattedData.length} data SDM dimasukkan & disinkron ke Firebase/Spreadsheet.`,
          icon: 'success',
          confirmButtonColor: '#15803d',
        });
      } catch (err) {
        Swal.fire('Gagal!', 'Format file Excel tidak dapat diproses.', 'error');
      }
    };
    reader.readAsBinaryString(file);
  };

  // 2. HANDLE TAMBAH SDM MANUAL
  const handleAddManualSDM = async (e) => {
    e.preventDefault();
    if (!newSDM.nama) return;

    const addedItem = {
      id: Date.now(),
      ...newSDM
    };

    const updatedList = [...dataSDM, addedItem];
    setDataSDM(updatedList);
    await saveSDMToDatabase(updatedList);

    setShowAddModal(false);
    setNewSDM({ nik: '', nama: '', jabatan: 'Pendamping Sosial', kecamatan: '', status: 'Aktif' });

    Swal.fire('Berhasil!', 'SDM baru ditambahkan ke database.', 'success');
  };

  // 3. HANDLE HAPUS SDM
  const handleDeleteSDM = async (id, nama) => {
    const res = await Swal.fire({
      title: 'Hapus Data SDM?',
      text: `Apakah Anda yakin ingin menghapus ${nama}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      confirmButtonText: 'Ya, Hapus'
    });

    if (res.isConfirmed) {
      const updatedList = dataSDM.filter(item => item.id !== id);
      setDataSDM(updatedList);
      await saveSDMToDatabase(updatedList);
      Swal.fire('Terhapus!', 'Data SDM berhasil diperbarui.', 'success');
    }
  };

  // Filter Search
  const filteredSDM = dataSDM.filter(
    (item) =>
      item.nama.toLowerCase().includes(search.toLowerCase()) ||
      item.nik.includes(search) ||
      item.kecamatan.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* HEADER PAGE */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-800 tracking-tight flex items-center gap-2">
            <UserCheck className="w-7 h-7 text-green-700" /> Database SDM
          </h1>
          <p className="text-gray-500 text-sm">Kelola master data seluruh personil / anggota SDM PKH Tapin.</p>
        </div>

        {/* ACTION BUTTONS */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={loadSDMData}
            disabled={loadingSync}
            className="bg-blue-600 text-white px-4 py-2.5 rounded-xl text-xs font-bold hover:bg-blue-700 transition flex items-center gap-2 shadow-sm disabled:bg-gray-400"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingSync ? 'animate-spin' : ''}`} />
            {loadingSync ? 'Tarik Data...' : 'Tarik dari Database Spreadsheet'}
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="bg-gray-800 text-white px-4 py-2.5 rounded-xl text-xs font-bold hover:bg-gray-900 transition flex items-center gap-2 shadow-sm"
          >
            <PlusCircle className="w-3.5 h-3.5" /> Tambah SDM
          </button>

          <label className="bg-green-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold hover:bg-green-800 transition flex items-center gap-2 shadow-sm cursor-pointer">
            <Upload className="w-3.5 h-3.5" /> Upload dari Excel
            <input type="file" accept=".xlsx, .xls, .csv" onChange={handleFileUpload} className="hidden" />
          </label>
        </div>
      </div>

      {/* SEARCH BAR & TOTAL COUNT */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col sm:flex-row justify-between gap-4 items-center">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Cari NIK, Nama, atau Kecamatan..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-green-600 focus:bg-white transition"
          />
        </div>
        <div className="text-xs font-extrabold text-gray-500 uppercase tracking-wider">
          Total SDM Terdata: <span className="text-green-700 font-black text-sm ml-1">{filteredSDM.length} Orang</span>
        </div>
      </div>

      {/* TABEL MASTER SDM */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-green-50/80 text-green-900 border-b border-green-100 text-xs uppercase font-extrabold tracking-wider">
                <th className="p-4">NO</th>
                <th className="p-4">NIK</th>
                <th className="p-4">NAMA LENGKAP</th>
                <th className="p-4">JABATAN</th>
                <th className="p-4">KECAMATAN</th>
                <th className="p-4 text-center">STATUS</th>
                <th className="p-4 text-center">AKSI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {loadingSync && dataSDM.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-12 text-gray-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-green-600" />
                    Menyingkronkan Database dari Firebase & Spreadsheet...
                  </td>
                </tr>
              ) : filteredSDM.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-12 text-gray-400 font-medium">
                    Tidak ada data SDM ditemukan dalam database.
                  </td>
                </tr>
              ) : (
                filteredSDM.map((item, index) => (
                  <tr key={item.id || index} className="hover:bg-gray-50/80 transition-colors">
                    <td className="p-4 font-bold text-gray-400 text-xs">{index + 1}</td>
                    <td className="p-4 font-mono text-xs text-gray-600">{item.nik}</td>
                    <td className="p-4 font-black text-gray-800">{item.nama}</td>
                    <td className="p-4 text-gray-600 text-xs font-medium">{item.jabatan}</td>
                    <td className="p-4 text-gray-600 text-xs font-medium">{item.kecamatan}</td>
                    <td className="p-4 text-center">
                      <span className="bg-green-100 text-green-800 text-[11px] px-3 py-1 rounded-full font-black border border-green-200">
                        {item.status}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <button
                        onClick={() => handleDeleteSDM(item.id, item.nama)}
                        className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition"
                        title="Hapus SDM"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL FORM TAMBAH SDM MANUAL */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-100 space-y-4">
            <h3 className="text-lg font-black text-gray-800 border-b pb-2">Tambah SDM Baru</h3>
            <form onSubmit={handleAddManualSDM} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">NIK</label>
                <input
                  type="text"
                  placeholder="Nomor Induk Kependudukan"
                  value={newSDM.nik}
                  onChange={(e) => setNewSDM({ ...newSDM, nik: e.target.value })}
                  className="w-full p-2.5 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-green-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Nama Lengkap SDM</label>
                <input
                  type="text"
                  required
                  placeholder="Nama Lengkap Tanpa Gelar / Dengan Gelar"
                  value={newSDM.nama}
                  onChange={(e) => setNewSDM({ ...newSDM, nama: e.target.value })}
                  className="w-full p-2.5 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-green-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Jabatan</label>
                <input
                  type="text"
                  required
                  value={newSDM.jabatan}
                  onChange={(e) => setNewSDM({ ...newSDM, jabatan: e.target.value })}
                  className="w-full p-2.5 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-green-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Kecamatan Tugas</label>
                <input
                  type="text"
                  placeholder="Contoh: Tapin Utara"
                  value={newSDM.kecamatan}
                  onChange={(e) => setNewSDM({ ...newSDM, kecamatan: e.target.value })}
                  className="w-full p-2.5 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-green-600"
                />
              </div>

              <div className="pt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-xl font-bold text-sm hover:bg-gray-200 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-green-700 text-white py-2.5 rounded-xl font-bold text-sm hover:bg-green-800 transition"
                >
                  Simpan SDM
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}