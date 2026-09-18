import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import Swal from 'sweetalert2';
import { 
  Users, Search, CheckCircle2, XCircle, DollarSign, 
  Award, History, LayoutGrid, Calendar, PlusCircle, Download, X, DatabaseBackup
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { 
  subscribeDashboardData, 
  subscribeSDMData, 
  subscribeSettings, 
  fetchAPI, 
  migrateSpreadsheetToFirebase, 
  formatDateIndo, 
  parseTimestamp 
} from '../services/api';


export default function Asosiasi() {
  const { role } = useAuth();
  const isAdmin = role === 'admin' || role === 'superadmin';

  const [activeSubMenu, setActiveSubMenu] = useState('cards');
  const [loading, setLoading] = useState(false);
  const [dataSDM, setDataSDM] = useState([]);
  const [pegawaiOptions, setPegawaiOptions] = useState([]);
  const [riwayatList, setRiwayatList] = useState([]);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('Semua');

  const [asoSettings, setAsoSettings] = useState({
    targetTahunan: 300000,
    nominalIuran: 35000,
    namaAsosiasi: 'Asosiasi SDM PKH Tapin'
  });

  const [bendaharaOptions, setBendaharaOptions] = useState([]);

  const [showBayarModal, setShowBayarModal] = useState(false);
  const [formBayar, setFormBayar] = useState({
    tanggal: new Date().toISOString().split('T')[0],
    bendahara: 'Herni',
    nama: '',
    nominal: 35000
  });

  useEffect(() => {
    let masterSDMList = [];
    let currentDashData = null;
    let targetTahunanVal = 300000;

    const buildUnifiedSDM = (sdmList, dashData, targetVal) => {
      const statusMap = dashData?.statusIuran || [];
      const statusObjMap = {};

      statusMap.forEach(item => {
        if (item && item.nama) {
          const cleanKey = String(item.nama).trim().toLowerCase();
          statusObjMap[cleanKey] = item;
        }
      });

      let rawList = (Array.isArray(sdmList) && sdmList.length > 0) ? sdmList : DEFAULT_SDM_NAMES;

      let result = rawList.map((sdm, idx) => {
        let namaSDM = typeof sdm === 'object' ? (sdm.nama || sdm[0]) : sdm;
        if (!namaSDM || !isNaN(Number(namaSDM)) || String(namaSDM).trim() === "300000") {
          namaSDM = DEFAULT_SDM_NAMES[idx % DEFAULT_SDM_NAMES.length];
        }

        const cleanKey = String(namaSDM).trim().toLowerCase();
        const statusItem = statusObjMap[cleanKey];

        let sisa = statusItem?.sisa !== undefined ? Number(statusItem.sisa) : targetVal;

        if (dashData?.fullIn && Array.isArray(dashData.fullIn)) {
          let paidInFullIn = 0;
          dashData.fullIn.forEach(r => {
            const kep = String(r[4] || r[3] || '');
            const nom = Number(r[6] || r[4] || 0);
            if (cleanKey && kep.toLowerCase().includes(cleanKey) && (kep.toLowerCase().includes('iuran') || r[2] === 'Iuran' || r[3] === 'Iuran')) {
              paidInFullIn += nom;
            }
          });
          if (paidInFullIn > (targetVal - sisa)) {
            sisa = Math.max(0, targetVal - paidInFullIn);
          }
        }

        const terbayar = Math.max(0, targetVal - sisa);

        return {
          nama: namaSDM,
          wajibBayar: targetVal,
          sudahBayar: terbayar,
          sisaBayar: sisa,
          isLunas: sisa <= 0
        };
      });

      result.sort((a, b) => a.nama.localeCompare(b.nama));
      return result;
    };

    const unsubSettings = subscribeSettings((settings) => {
      if (settings) {
        if (settings.asosiasi) {
          setAsoSettings(settings.asosiasi);
          targetTahunanVal = settings.asosiasi.targetTahunan || 300000;
          setFormBayar(prev => ({ ...prev, nominal: settings.asosiasi.nominalIuran || 35000 }));
        }

        if (Array.isArray(settings.bendaharaList) && settings.bendaharaList.length > 0) {
          setBendaharaOptions(settings.bendaharaList);
          setFormBayar(prev => ({ ...prev, bendahara: settings.bendaharaList[0].nama }));
        }

        const unified = buildUnifiedSDM(masterSDMList, currentDashData, targetTahunanVal);
        setDataSDM(unified);
      }
    });

    const unsubSDM = subscribeSDMData((sdmList) => {
      if (Array.isArray(sdmList)) {
        masterSDMList = sdmList;
        setPegawaiOptions(sdmList);
        const unified = buildUnifiedSDM(masterSDMList, currentDashData, targetTahunanVal);
        setDataSDM(unified);
      }
    });

    const unsubDash = subscribeDashboardData((dashData) => {
      if (dashData) {
        currentDashData = dashData;
        const unified = buildUnifiedSDM(masterSDMList, currentDashData, targetTahunanVal);
        setDataSDM(unified);

        const fullIn = dashData.fullIn || [];
        const riwayatIuran = fullIn.filter(row => 
          row[2] === 'Iuran' || 
          row[3] === 'Iuran' || 
          (row[3] && String(row[3]).includes('Iuran')) ||
          (row[4] && String(row[4]).includes('Iuran'))
        );

        riwayatIuran.sort((a, b) => {
          const tA = parseTimestamp(a[1] || a[0]);
          const tB = parseTimestamp(b[1] || b[0]);
          return tB - tA;
        });

        setRiwayatList(riwayatIuran);
      }
    });

    return () => {
      if (typeof unsubSettings === 'function') unsubSettings();
      if (typeof unsubSDM === 'function') unsubSDM();
      if (typeof unsubDash === 'function') unsubDash();
    };
  }, []);

  const handleTriggerMigrasi = async () => {
    setLoading(true);
    Swal.fire({
      title: 'Menyinkronkan Data...',
      text: 'Menarik seluruh data dari Google Spreadsheet ke Firebase',
      didOpen: () => Swal.showLoading()
    });

    const res = await migrateSpreadsheetToFirebase();
    setLoading(false);

    if (res.success) {
      Swal.fire('Berhasil!', 'Seluruh data Spreadsheet telah ter-sync ke Firebase.', 'success');
    } else {
      Swal.fire('Gagal Migrasi', res.error || 'Terjadi kesalahan jaringan.', 'error');
    }
  };

  const formatRp = (num) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(num || 0);
  };

  const handleSimpanBayarAsosiasi = async (e) => {
    e.preventDefault();
    if (!formBayar.nama || !formBayar.nominal) {
      Swal.fire('Perhatian', 'Pilih nama SDM dan nominal pembayaran.', 'warning');
      return;
    }

    setShowBayarModal(false);
    Swal.fire({
      icon: 'success',
      title: 'Pembayaran Tercatat Instan!',
      timer: 1200,
      showConfirmButton: false
    });

    await fetchAPI('simpanIuran', formBayar);

    setFormBayar({
      tanggal: new Date().toISOString().split('T')[0],
      bendahara: bendaharaOptions.length > 0 ? bendaharaOptions[0].nama : 'Herni',
      nama: '',
      nominal: asoSettings.nominalIuran || 35000
    });
  };

  const handleExportExcel = () => {
    try {
      const exportData = dataSDM.map((sdm, idx) => ({
        'No': idx + 1,
        'Nama SDM': sdm.nama,
        'Wajib Bayar Setahun': sdm.wajibBayar,
        'Sudah Dibayar': sdm.sudahBayar,
        'Sisa Menunggak': sdm.sisaBayar,
        'Status': sdm.isLunas ? 'LUNAS' : 'BELUM LUNAS'
      }));

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Asosiasi SDM");
      XLSX.writeFile(workbook, `Laporan_Asosiasi_SDM_PKH_${new Date().toISOString().split('T')[0]}.xlsx`);

      Swal.fire('Export Berhasil', 'File Excel telah terunduh ke perangkat Anda.', 'success');
    } catch (err) {
      Swal.fire('Gagal Export', 'Terjadi kesalahan saat mengunduh Excel.', 'error');
    }
  };

  const computedTotalTerkumpul = dataSDM.reduce((acc, item) => acc + item.sudahBayar, 0);
  const totalTerkumpul = computedTotalTerkumpul;
  const targetHarusnyaTerkumpul = dataSDM.length * (asoSettings.targetTahunan || 300000);
  const totalLunasCount = dataSDM.filter(item => item.isLunas).length;

  const filteredSDM = dataSDM.filter((item) => {
    const matchSearch = item.nama.toLowerCase().includes(search.toLowerCase());
    const matchFilter = 
      filterStatus === 'Semua' ? true :
      filterStatus === 'Lunas' ? item.isLunas : !item.isLunas;
    return matchSearch && matchFilter;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-800 tracking-tight flex items-center gap-2">
            <Users className="w-7 h-7 text-green-700" />
            {asoSettings.namaAsosiasi || 'Asosiasi SDM PKH Tapin'}
          </h1>
          <p className="text-gray-500 text-sm">Monitoring iuran tahunan pegawai dan riwayat transaksi penyetoran.</p>
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
                className="bg-emerald-700 text-white hover:bg-emerald-800 px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition"
              >
                <Download className="w-4 h-4" /> Export Excel
              </button>

              <button
                onClick={() => setShowBayarModal(true)}
                className="bg-green-700 text-white hover:bg-green-800 px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-md shadow-green-700/20 transition"
              >
                <PlusCircle className="w-4 h-4" /> Tambah Bayar Asosiasi
              </button>
            </>
          )}
        </div>
      </div>

      {/* SUMMARY CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-green-700 to-emerald-900 text-white p-5 rounded-3xl shadow-md border border-green-600/30">
          <div className="flex items-center gap-2 text-green-200 mb-1">
            <DollarSign className="w-5 h-5" />
            <span className="text-xs font-bold uppercase tracking-wider">Nominal Asosiasi Terkumpul</span>
          </div>
          <div className="text-2xl lg:text-3xl font-extrabold">{formatRp(totalTerkumpul)}</div>
          <p className="text-xs text-green-200 mt-2 font-medium">Dana iuran aktif yang telah disetor.</p>
        </div>

        <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 text-gray-500 mb-1">
            <Calendar className="w-5 h-5 text-blue-600" />
            <span className="text-xs font-bold uppercase tracking-wider">Target Harusnya Terkumpul Setahun</span>
          </div>
          <div className="text-2xl lg:text-3xl font-extrabold text-blue-600">{formatRp(targetHarusnyaTerkumpul)}</div>
          <p className="text-xs text-gray-400 mt-2 font-medium">Berdasarkan {dataSDM.length} SDM x {formatRp(asoSettings.targetTahunan)}</p>
        </div>

        <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 text-gray-500 mb-1">
            <Award className="w-5 h-5 text-amber-500" />
            <span className="text-xs font-bold uppercase tracking-wider">Status Kelunasan SDM</span>
          </div>
          <div className="text-2xl lg:text-3xl font-extrabold text-gray-800">
            {totalLunasCount} <span className="text-sm font-normal text-gray-400">/ {dataSDM.length} Lunas</span>
          </div>
          <p className="text-xs text-amber-600 mt-2 font-bold">{dataSDM.length - totalLunasCount} Orang Masih Menunggak</p>
        </div>
      </div>

      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveSubMenu('cards')}
          className={`flex items-center gap-2 py-3 px-6 font-bold text-sm border-b-2 transition-all ${
            activeSubMenu === 'cards'
              ? 'border-green-700 text-green-700'
              : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          <LayoutGrid className="w-4 h-4" /> Status Pembayaran SDM (Card Matrix)
        </button>
        <button
          onClick={() => setActiveSubMenu('riwayat')}
          className={`flex items-center gap-2 py-3 px-6 font-bold text-sm border-b-2 transition-all ${
            activeSubMenu === 'riwayat'
              ? 'border-green-700 text-green-700'
              : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          <History className="w-4 h-4" /> Riwayat Bayar Asosiasi
        </button>
      </div>

      {activeSubMenu === 'cards' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col sm:flex-row justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="Cari Nama SDM (Urut Abjad A-Z)..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-50 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-green-600"
              />
            </div>

            <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
              {['Semua', 'Lunas', 'Belum Lunas'].map((status) => (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status)}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition ${
                    filterStatus === status ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          {filteredSDM.length === 0 ? (
            <div className="bg-white p-12 rounded-3xl text-center border border-gray-100 space-y-3">
              <p className="text-gray-500 font-medium">Tidak ada data SDM yang sesuai.</p>
              {isAdmin && (
                <button
                  onClick={handleTriggerMigrasi}
                  className="bg-blue-600 text-white font-bold px-4 py-2 rounded-xl text-xs"
                >
                  Klik untuk Tarik Data Spreadsheet ke Firebase
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredSDM.map((sdm, idx) => (
                <div
                  key={idx}
                  className={`p-5 rounded-3xl transition-all duration-300 relative overflow-hidden ${
                    sdm.isLunas
                      ? 'bg-gradient-to-br from-green-600 to-emerald-800 text-white shadow-lg shadow-green-600/20 border-2 border-emerald-400'
                      : 'bg-white border border-gray-200 shadow-sm hover:shadow-md'
                  }`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className={`font-black text-lg ${sdm.isLunas ? 'text-white' : 'text-gray-800'}`}>
                        {sdm.nama}
                      </h3>
                      <p className={`text-xs ${sdm.isLunas ? 'text-green-100' : 'text-gray-400'}`}>
                        SDM PKH Kabupaten Tapin
                      </p>
                    </div>

                    <span
                      className={`px-3 py-1 rounded-full text-xs font-black flex items-center gap-1 ${
                        sdm.isLunas
                          ? 'bg-white text-green-800 shadow-md'
                          : 'bg-orange-100 text-orange-700 border border-orange-200'
                      }`}
                    >
                      {sdm.isLunas ? <CheckCircle2 className="w-3.5 h-3.5 text-green-600" /> : <XCircle className="w-3.5 h-3.5 text-orange-600" />}
                      {sdm.isLunas ? 'LUNAS' : 'MENUNGGAK'}
                    </span>
                  </div>

                  <div className="space-y-2 text-xs pt-2 border-t border-gray-100/20">
                    <div className="flex justify-between">
                      <span className={sdm.isLunas ? 'text-green-100' : 'text-gray-500'}>Wajib Bayar Setahun:</span>
                      <span className="font-bold">{formatRp(sdm.wajibBayar)}</span>
                    </div>

                    <div className="flex justify-between">
                      <span className={sdm.isLunas ? 'text-green-100' : 'text-gray-500'}>Sudah Bayar:</span>
                      <span className={`font-black ${sdm.isLunas ? 'text-white' : 'text-green-600'}`}>
                        {formatRp(sdm.sudahBayar)}
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className={sdm.isLunas ? 'text-green-100' : 'text-gray-500'}>Sisa Bayar:</span>
                      <span className={`font-black ${sdm.isLunas ? 'text-white' : 'text-red-500'}`}>
                        {formatRp(sdm.sisaBayar)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeSubMenu === 'riwayat' && (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-4 border-b bg-gray-50/50 flex justify-between items-center">
            <h3 className="font-bold text-gray-800 text-sm">Catatan Riwayat Penyetoran Iuran</h3>
            <span className="text-xs text-gray-500">{riwayatList.length} Transaksi Tercatat</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-green-50 text-green-900 border-b text-xs uppercase font-extrabold tracking-wider">
                  <th className="p-4">Tanggal</th>
                  <th className="p-4">Penerima (Bendahara)</th>
                  <th className="p-4">Keperluan / Keterangan Penyetor</th>
                  <th className="p-4 text-right">Nominal Setor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {riwayatList.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="text-center py-8 text-gray-400">
                      Belum ada riwayat transaksi pembayaran iuran.
                    </td>
                  </tr>
                ) : (
                  riwayatList.map((row, idx) => {
                    let tgl = formatDateIndo(row[1] || row[0]);
                    let bend = row[8] || row[1] || 'Herni';
                    let kep = row[4] || row[3] || '-';
                    let nom = Number(row[6] || row[4] || 0);

                    if (row.length === 5) {
                      tgl = formatDateIndo(row[0]);
                      bend = row[1];
                      kep = row[3];
                      nom = Number(row[4] || 0);
                    }

                    return (
                      <tr key={idx} className="hover:bg-gray-50/80 transition-colors">
                        <td className="p-4 font-bold text-gray-600 whitespace-nowrap">{tgl}</td>
                        <td className="p-4 font-bold text-gray-800">{bend}</td>
                        <td className="p-4 text-gray-600 font-medium">{kep}</td>
                        <td className="p-4 text-right font-black text-green-700">{formatRp(nom)}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showBayarModal && isAdmin && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-100 space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-black text-lg text-gray-800 flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-green-700" /> Catat Bayar Asosiasi
              </h3>
              <button onClick={() => setShowBayarModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSimpanBayarAsosiasi} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Tanggal Pembayaran</label>
                <input
                  type="date"
                  required
                  value={formBayar.tanggal}
                  onChange={(e) => setFormBayar({ ...formBayar, tanggal: e.target.value })}
                  className="w-full p-3 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-green-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Penerima Uang (Bendahara)</label>
                <select
                  required
                  value={formBayar.bendahara}
                  onChange={(e) => setFormBayar({ ...formBayar, bendahara: e.target.value })}
                  className="w-full p-3 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-green-600 font-bold"
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
                <label className="block text-xs font-bold text-gray-600 mb-1">Atas Nama SDM (Dropdown)</label>
                <select
                  required
                  value={formBayar.nama}
                  onChange={(e) => setFormBayar({ ...formBayar, nama: e.target.value })}
                  className="w-full p-3 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-green-600 font-bold"
                >
                  <option value="">-- Pilih Nama SDM --</option>
                  {pegawaiOptions.map((p, idx) => {
                    const nameStr = typeof p === 'object' ? p.nama : p;
                    return <option key={idx} value={nameStr}>{nameStr}</option>;
                  })}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Nominal Bayar (Rp)</label>
                <input
                  type="number"
                  required
                  value={formBayar.nominal}
                  onChange={(e) => setFormBayar({ ...formBayar, nominal: e.target.value })}
                  className="w-full p-3 border rounded-xl text-lg font-black text-green-700 outline-none focus:ring-2 focus:ring-green-600"
                />
              </div>

              <div className="pt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowBayarModal(false)}
                  className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-bold text-sm"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-green-700 text-white py-3 rounded-xl font-bold text-sm hover:bg-green-800 shadow-md shadow-green-700/20"
                >
                  Simpan Instan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}