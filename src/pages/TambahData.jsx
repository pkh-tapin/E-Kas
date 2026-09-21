import { useState, useEffect, useRef } from 'react';
import Swal from 'sweetalert2';
import { 
  Save, Users, Gift, Plus, Trash2, Lock, Search, ChevronDown,
  Coins, Banknote, ArrowDownCircle, ArrowUpCircle, Info, HelpCircle
} from 'lucide-react';
import { 
  fetchAPI, 
  subscribeSDMData, 
  subscribeSettings, 
  getFastRekapAsosiasi, 
  saveRekapAsosiasiToDatabase,
  subscribeRekapAsosiasi,
  saveSettingsToDatabase
} from '../services/api';

export default function TambahData({ userRole = 'super_admin' }) {
  const [activeTab, setActiveTab] = useState('pemasukan');
  const [loading, setLoading] = useState(false);
  const [pegawaiList, setPegawaiList] = useState([]);
  const [rekapClaims, setRekapClaims] = useState([]);
  const [maxKlaimTahunan, setMaxKlaimTahunan] = useState(1);

  // Kategori Dinamis Pengeluaran & Pengaturan Kunci Bendahara
  const [kategoriPengeluaran, setKategoriPengeluaran] = useState(['Kantor', 'Rapat', 'Hadiah', 'Acara', 'Lainnya']);
  const [newKategoriInput, setNewKategoriInput] = useState('');
  const [showAddKategori, setShowAddKategori] = useState(false);
  const [bendaharaLocks, setBendaharaLocks] = useState({
    pemasukan: '',
    pengeluaran: '',
    iuran: ''
  });

  const getTodayDate = () => new Date().toISOString().split('T')[0];

  // Format Rupiah dengan Titik Ribuan dan Koma Desimal (,00)
  const formatRp = (val) => {
    if (!val && val !== 0) return 'Rp 0,00';
    const num = typeof val === 'string' ? parseInt(val.replace(/\D/g, ''), 10) : val;
    if (isNaN(num)) return 'Rp 0,00';
    return 'Rp ' + num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ',00';
  };

  const [formDana, setFormDana] = useState({
    bendahara: 'Herni',
    tanggal: getTodayDate(),
    jenis: 'Pemasukan',
    kategori: 'Pemasukan',
    nama_barang: '',
    nominal: ''
  });

  const [formIuran, setFormIuran] = useState({
    bendahara: 'Herni',
    tanggal: getTodayDate(),
    nama: '',
    nominal: 35000
  });

  const [formKlaim, setFormKlaim] = useState({
    tanggal: getTodayDate(),
    nama: '',
    nominal: 5000000,
    sumber: 'Asosiasi Kabupaten',
    keterangan: 'Pencairan Klaim Asosiasi'
  });

  useEffect(() => {
    const unsubSDM = subscribeSDMData((sdmList) => {
      if (Array.isArray(sdmList)) setPegawaiList(sdmList);
    });

    const unsubSettings = subscribeSettings((settings) => {
      if (settings?.asosiasi) {
        if (settings.asosiasi.nominalIuran) {
          setFormIuran(prev => ({ ...prev, nominal: settings.asosiasi.nominalIuran }));
        }
        if (settings.asosiasi.nominalMaksimalKlaim) {
          setFormKlaim(prev => ({ ...prev, nominal: settings.asosiasi.nominalMaksimalKlaim }));
        }
        if (settings.asosiasi.jumlahMaksimalKlaimTahunan !== undefined) {
          setMaxKlaimTahunan(settings.asosiasi.jumlahMaksimalKlaimTahunan);
        }
      }
      if (settings?.kategoriPengeluaran && Array.isArray(settings.kategoriPengeluaran)) {
        setKategoriPengeluaran(settings.kategoriPengeluaran);
      }
      if (settings?.bendaharaLocks) {
        setBendaharaLocks(settings.bendaharaLocks);
        if (settings.bendaharaLocks.pemasukan) {
          setFormDana(prev => ({ ...prev, bendahara: settings.bendaharaLocks.pemasukan }));
        }
        if (settings.bendaharaLocks.iuran) {
          setFormIuran(prev => ({ ...prev, bendahara: settings.bendaharaLocks.iuran }));
        }
      }
    });

    getFastRekapAsosiasi((data) => {
      if (Array.isArray(data)) setRekapClaims(data);
    });

    const unsubRekap = subscribeRekapAsosiasi((data) => {
      if (Array.isArray(data)) setRekapClaims(data);
    });

    return () => {
      if (typeof unsubSDM === 'function') unsubSDM();
      if (typeof unsubSettings === 'function') unsubSettings();
      if (typeof unsubRekap === 'function') unsubRekap();
    };
  }, []);

  useEffect(() => {
    if (activeTab === 'pemasukan') {
      setFormDana(prev => ({ 
        ...prev, 
        bendahara: bendaharaLocks.pemasukan || prev.bendahara, 
        kategori: 'Pemasukan' 
      }));
    } else if (activeTab === 'pengeluaran') {
      setFormDana(prev => ({ 
        ...prev, 
        bendahara: bendaharaLocks.pengeluaran || prev.bendahara,
        kategori: kategoriPengeluaran[0] || 'Umum'
      }));
    } else if (activeTab === 'iuran') {
      setFormIuran(prev => ({ 
        ...prev, 
        bendahara: bendaharaLocks.iuran || prev.bendahara 
      }));
    }
  }, [activeTab, bendaharaLocks, kategoriPengeluaran]);

  const handleAddKategori = async () => {
    if (!newKategoriInput.trim()) return;
    const updated = [...new Set([...kategoriPengeluaran, newKategoriInput.trim()])];
    setKategoriPengeluaran(updated);
    setNewKategoriInput('');
    setShowAddKategori(false);
    try {
      await saveSettingsToDatabase({ kategoriPengeluaran: updated });
      Swal.fire({ icon: 'success', title: 'Kategori Ditambahkan', timer: 1200, showConfirmButton: false });
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteKategori = async (katToDelete) => {
    const updated = kategoriPengeluaran.filter(k => k !== katToDelete);
    setKategoriPengeluaran(updated);
    try {
      await saveSettingsToDatabase({ kategoriPengeluaran: updated });
      Swal.fire({ icon: 'success', title: 'Kategori Dihapus', timer: 1200, showConfirmButton: false });
    } catch (err) {
      console.error(err);
    }
  };

  const getClaimStats = (namaSDM, tahun) => {
    if (!namaSDM) return { kabCount: 0, provCount: 0 };
    
    const kabCount = rekapClaims.filter(
      item => item.nama === namaSDM && 
              (item.sumber === 'Asosiasi Kabupaten' || !item.sumber) && 
              (item.tanggal || '').startsWith(tahun)
    ).length;

    const provCount = rekapClaims.filter(
      item => item.nama === namaSDM && 
              item.sumber === 'Asosiasi Provinsi' && 
              (item.tanggal || '').startsWith(tahun)
    ).length;

    return { kabCount, provCount };
  };

  const currentKlaimYear = (formKlaim.tanggal || getTodayDate()).split('-')[0];

  const availablePegawaiForKlaim = pegawaiList.filter((p) => {
    const nameStr = typeof p === 'object' ? p.nama : p;
    const { kabCount, provCount } = getClaimStats(nameStr, currentKlaimYear);
    return kabCount < maxKlaimTahunan || provCount < maxKlaimTahunan;
  });

  const selectedStats = getClaimStats(formKlaim.nama, currentKlaimYear);
  const isKabLocked = selectedStats.kabCount >= maxKlaimTahunan;
  const isProvLocked = selectedStats.provCount >= maxKlaimTahunan;

  const handleNamaKlaimChange = (namaVal) => {
    const { kabCount, provCount } = getClaimStats(namaVal, currentKlaimYear);
    let defaultSumber = formKlaim.sumber;

    if (defaultSumber === 'Asosiasi Kabupaten' && kabCount >= maxKlaimTahunan) {
      defaultSumber = 'Asosiasi Provinsi';
    } else if (defaultSumber === 'Asosiasi Provinsi' && provCount >= maxKlaimTahunan) {
      defaultSumber = 'Asosiasi Kabupaten';
    }

    setFormKlaim({
      ...formKlaim,
      nama: namaVal,
      sumber: defaultSumber
    });
  };

  const handleSubmitDana = async (e, jenisTransaksi) => {
    e.preventDefault();
    if (!formDana.nominal || Number(formDana.nominal) <= 0) {
      Swal.fire('Perhatian', 'Isi nominal transaksi dengan benar.', 'warning');
      return;
    }

    setLoading(true);
    const payload = { 
      ...formDana, 
      jenis: jenisTransaksi,
      kategori: jenisTransaksi === 'Pemasukan' ? 'Pemasukan' : formDana.kategori,
      autoSyncSheet: true 
    };

    try {
      await fetchAPI('simpanDana', payload);
      fetchAPI('syncToSpreadsheet', payload).catch(() => {});

      Swal.fire({
        icon: 'success',
        title: 'Berhasil Disimpan & Disinkron!',
        text: `Transaksi ${jenisTransaksi} sebesar ${formatRp(formDana.nominal)} berhasil tersimpan.`,
        confirmButtonColor: '#15803d',
        timer: 1800
      });
      setFormDana({ ...formDana, nama_barang: '', nominal: '' });
    } catch (err) {
      Swal.fire('Error', 'Gagal menyimpan transaksi.', 'error');
    }
    setLoading(false);
  };

  const handleSubmitIuran = async (e) => {
    e.preventDefault();
    if (!formIuran.nama) {
      Swal.fire('Peringatan', 'Silakan pilih atau cari Nama SDM terlebih dahulu.', 'warning');
      return;
    }

    setLoading(true);
    try {
      const payload = { ...formIuran, autoSyncSheet: true };
      await fetchAPI('simpanIuran', payload);
      fetchAPI('syncToSpreadsheet', payload).catch(() => {});

      Swal.fire({
        icon: 'success',
        title: 'Pembayaran Tercatat!',
        text: `Iuran a.n ${formIuran.nama} sebesar ${formatRp(formIuran.nominal)} berhasil disimpan.`,
        confirmButtonColor: '#15803d',
        timer: 1800
      });
      setFormIuran(prev => ({ ...prev, nama: '' }));
    } catch (err) {
      Swal.fire('Error', 'Gagal merekam iuran.', 'error');
    }
    setLoading(false);
  };

  const handleSubmitKlaim = async (e) => {
    e.preventDefault();
    if (!formKlaim.nama) {
      Swal.fire('Peringatan', 'Silakan pilih Nama Penerima SDM.', 'warning');
      return;
    }

    const { kabCount, provCount } = getClaimStats(formKlaim.nama, currentKlaimYear);
    
    if (formKlaim.sumber === 'Asosiasi Kabupaten' && kabCount >= maxKlaimTahunan) {
      Swal.fire('Klaim Ditolak', `Jatah pencairan Asosiasi Kabupaten untuk SDM a.n ${formKlaim.nama} pada tahun ${currentKlaimYear} sudah habis (${maxKlaimTahunan}x/tahun).`, 'error');
      return;
    }

    if (formKlaim.sumber === 'Asosiasi Provinsi' && provCount >= maxKlaimTahunan) {
      Swal.fire('Klaim Ditolak', `Jatah pencairan Asosiasi Provinsi untuk SDM a.n ${formKlaim.nama} pada tahun ${currentKlaimYear} sudah habis (${maxKlaimTahunan}x/tahun).`, 'error');
      return;
    }

    setLoading(true);
    try {
      const existingRekap = await getFastRekapAsosiasi();
      const newRecord = {
        id: `KLAIM-${Date.now()}`,
        ...formKlaim,
        autoSyncSheet: true
      };

      const updatedList = [newRecord, ...existingRekap];
      await saveRekapAsosiasiToDatabase(updatedList, newRecord);
      fetchAPI('syncToSpreadsheet', newRecord).catch(() => {});

      Swal.fire({
        icon: 'success',
        title: 'Pencairan Disimpan!',
        text: `Klaim ${formKlaim.sumber} a.n ${formKlaim.nama} sebesar ${formatRp(formKlaim.nominal)} berhasil dicatat.`,
        confirmButtonColor: '#15803d',
        timer: 1800
      });
      setFormKlaim(prev => ({ ...prev, nama: '' }));
    } catch (err) {
      Swal.fire('Error', 'Gagal mencatat rekap pencairan.', 'error');
    }
    setLoading(false);
  };

  const isBendaharaLockedCurrentTab = 
    (activeTab === 'pemasukan' && Boolean(bendaharaLocks.pemasukan)) ||
    (activeTab === 'pengeluaran' && Boolean(bendaharaLocks.pengeluaran)) ||
    (activeTab === 'iuran' && Boolean(bendaharaLocks.iuran));

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      <div className="text-center max-w-xl mx-auto">
        <h1 className="text-2xl font-black text-gray-800">Pusat Tambah Data (Administrator)</h1>
        <p className="text-gray-500 text-sm mt-1">Catat transaksi kas, iuran, dan klaim pencairan secara terpusat (Auto-Sync Database).</p>
      </div>

      {/* PILIHAN MENU TRANSAKSI DENGAN ICON DAN WARNA JELAS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <button
          onClick={() => setActiveTab('pemasukan')}
          className={`py-3.5 px-3 font-bold text-xs sm:text-sm rounded-2xl flex flex-col sm:flex-row items-center justify-center gap-2 transition cursor-pointer border-2 ${
            activeTab === 'pemasukan' 
              ? 'bg-green-700 border-green-800 text-white shadow-lg font-black scale-[1.02]' 
              : 'bg-white border-green-200 text-green-800 hover:bg-green-50/70'
          }`}
        >
          <div className="flex items-center gap-1 bg-green-800/30 p-1.5 rounded-xl">
            <Coins className="w-5 h-5 text-green-300" />
            <ArrowDownCircle className="w-4 h-4 text-green-200" />
          </div>
          <span className="tracking-tight">Uang Masuk</span>
        </button>

        <button
          onClick={() => setActiveTab('pengeluaran')}
          className={`py-3.5 px-3 font-bold text-xs sm:text-sm rounded-2xl flex flex-col sm:flex-row items-center justify-center gap-2 transition cursor-pointer border-2 ${
            activeTab === 'pengeluaran' 
              ? 'bg-red-600 border-red-700 text-white shadow-lg font-black scale-[1.02]' 
              : 'bg-white border-red-200 text-red-700 hover:bg-red-50/70'
          }`}
        >
          <div className="flex items-center gap-1 bg-red-800/30 p-1.5 rounded-xl">
            <Banknote className="w-5 h-5 text-red-200" />
            <ArrowUpCircle className="w-4 h-4 text-red-100" />
          </div>
          <span className="tracking-tight">Uang Keluar</span>
        </button>

        <button
          onClick={() => setActiveTab('iuran')}
          className={`py-3.5 px-3 font-bold text-xs sm:text-sm rounded-2xl flex flex-col sm:flex-row items-center justify-center gap-2 transition cursor-pointer border-2 ${
            activeTab === 'iuran' 
              ? 'bg-amber-600 border-amber-700 text-white shadow-lg font-black scale-[1.02]' 
              : 'bg-white border-amber-200 text-amber-800 hover:bg-amber-50/70'
          }`}
        >
          <Users className="w-5 h-5 text-amber-200" />
          <span>Bayar Asosiasi</span>
        </button>

        <button
          onClick={() => setActiveTab('klaim')}
          className={`py-3.5 px-3 font-bold text-xs sm:text-sm rounded-2xl flex flex-col sm:flex-row items-center justify-center gap-2 transition cursor-pointer border-2 ${
            activeTab === 'klaim' 
              ? 'bg-purple-700 border-purple-800 text-white shadow-lg font-black scale-[1.02]' 
              : 'bg-white border-purple-200 text-purple-800 hover:bg-purple-50/70'
          }`}
        >
          <Gift className="w-5 h-5 text-purple-200" />
          <span>Rekap Klaim</span>
        </button>
      </div>

      {/* KOTAK PETUNJUK MEMILIH TRANSAKSI AGAR TIDAK TERTUKAR */}
      <div className="bg-blue-50/90 border-l-4 border-blue-600 p-4 rounded-2xl shadow-sm space-y-2">
        <div className="flex items-center gap-2 text-blue-900 font-extrabold text-xs sm:text-sm">
          <Info className="w-4 h-4 text-blue-600 flex-shrink-0" />
          <span>Petunjuk Pemilihan Jenis Transaksi (Agar Tidak Tertukar):</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          <div className="bg-white p-2.5 rounded-xl border border-green-200 text-green-900 flex items-center gap-2">
            <Coins className="w-4 h-4 text-green-600 flex-shrink-0" />
            <div>
              <span className="font-black text-green-700 uppercase">Uang Masuk (Hijau):</span>
              <p className="text-[11px] text-gray-600">Dipilih jika <strong>KAS BERTAMBAH</strong> (contoh: Hibah, Donasi, Transfer Dana Masuk).</p>
            </div>
          </div>

          <div className="bg-white p-2.5 rounded-xl border border-red-200 text-red-900 flex items-center gap-2">
            <Banknote className="w-4 h-4 text-red-600 flex-shrink-0" />
            <div>
              <span className="font-black text-red-600 uppercase">Uang Keluar (Merah):</span>
              <p className="text-[11px] text-gray-600">Dipilih jika <strong>KAS BERKURANG</strong> (contoh: Belanja ATK, Konsumsi, Acara).</p>
            </div>
          </div>
        </div>
      </div>

      {(activeTab === 'pemasukan' || activeTab === 'pengeluaran') && (
        <form 
          onSubmit={(e) => handleSubmitDana(e, activeTab === 'pemasukan' ? 'Pemasukan' : 'Pengeluaran')}
          className={`bg-white rounded-3xl shadow-sm border p-6 space-y-4 border-t-4 ${
            activeTab === 'pemasukan' ? 'border-t-green-700' : 'border-t-red-600'
          }`}
        >
          <h2 className="text-lg font-black text-gray-800 mb-4 border-b pb-2 flex justify-between items-center">
            <span className="flex items-center gap-2">
              {activeTab === 'pemasukan' ? (
                <>
                  <Coins className="w-6 h-6 text-green-700" />
                  <span>Catat Uang Masuk (Pemasukan Kas)</span>
                </>
              ) : (
                <>
                  <Banknote className="w-6 h-6 text-red-600" />
                  <span>Catat Uang Keluar (Pengeluaran Kas)</span>
                </>
              )}
            </span>
            <span className={`text-xs px-2.5 py-1 rounded-full font-extrabold ${
              activeTab === 'pemasukan' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
              Auto-Sync Active
            </span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1">Tanggal Transaksi</label>
              <input
                type="date"
                required
                value={formDana.tanggal}
                onChange={(e) => setFormDana({ ...formDana, tanggal: e.target.value })}
                className="w-full p-3 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-green-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1 flex items-center gap-1">
                Bendahara (Posisi Uang) {isBendaharaLockedCurrentTab && <Lock className="w-3 h-3 text-red-500" />}
              </label>
              <select
                required
                disabled={isBendaharaLockedCurrentTab}
                value={formDana.bendahara}
                onChange={(e) => setFormDana({ ...formDana, bendahara: e.target.value })}
                className={`w-full p-3 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-green-600 ${
                  isBendaharaLockedCurrentTab ? 'bg-gray-100 font-bold text-gray-700 cursor-not-allowed' : ''
                }`}
              >
                <option value="Herni">Herni</option>
                <option value="Sari">Sari</option>
                <option value="DINA RIRIS YANTI">DINA RIRIS YANTI</option>
              </select>
            </div>

            {/* Kategori hanya tampil pada Uang Keluar */}
            {activeTab === 'pengeluaran' && (
              <div className="col-span-2">
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-bold text-gray-600">Kategori Transaksi Pengeluaran</label>
                  {userRole === 'super_admin' && (
                    <button
                      type="button"
                      onClick={() => setShowAddKategori(!showAddKategori)}
                      className="text-xs text-blue-600 font-bold flex items-center gap-0.5 hover:underline"
                    >
                      <Plus className="w-3 h-3" /> Kelola Kategori
                    </button>
                  )}
                </div>

                {userRole === 'super_admin' && showAddKategori && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl mb-2 space-y-2">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Nama Kategori Baru..."
                        value={newKategoriInput}
                        onChange={(e) => setNewKategoriInput(e.target.value)}
                        className="flex-1 p-2 border rounded-lg text-xs"
                      />
                      <button
                        type="button"
                        onClick={handleAddKategori}
                        className="bg-blue-600 text-white text-xs px-3 py-2 rounded-lg font-bold hover:bg-blue-700"
                      >
                        Tambah
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {kategoriPengeluaran.map((kat, idx) => (
                        <span key={idx} className="bg-white border text-xs px-2 py-1 rounded-md flex items-center gap-1 font-semibold">
                          {kat}
                          <Trash2 
                            className="w-3 h-3 text-red-500 cursor-pointer hover:text-red-700" 
                            onClick={() => handleDeleteKategori(kat)}
                          />
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <select
                  required
                  value={formDana.kategori}
                  onChange={(e) => setFormDana({ ...formDana, kategori: e.target.value })}
                  className="w-full p-3 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-green-600"
                >
                  {kategoriPengeluaran.map((kat, idx) => (
                    <option key={idx} value={kat}>{kat}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1">
              {activeTab === 'pemasukan' ? 'Sumber Uang Pemasukan (Dari Mana)' : 'Keperluan / Keterangan Barang'}
            </label>
            <input
              type="text"
              required
              placeholder={activeTab === 'pemasukan' ? 'Contoh: Kas Daerah, Donasi, Transfer Masuk, dll...' : 'Keterangan transaksi pengeluaran...'}
              value={formDana.nama_barang}
              onChange={(e) => setFormDana({ ...formDana, nama_barang: e.target.value })}
              className="w-full p-3 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-green-600"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1">Nominal (Rp)</label>
            <input
              type="number"
              required
              placeholder="0"
              value={formDana.nominal}
              onChange={(e) => setFormDana({ ...formDana, nominal: e.target.value })}
              className={`w-full p-3 border rounded-xl text-lg font-black outline-none ${
                activeTab === 'pemasukan' ? 'text-green-700' : 'text-red-600'
              }`}
            />
            <div className="mt-2 bg-gray-50 p-2.5 rounded-xl border">
              <p className="text-xs font-extrabold text-gray-600">
                Format Tertera: <span className={activeTab === 'pemasukan' ? 'text-green-700 font-black' : 'text-red-600 font-black'}>{formatRp(formDana.nominal)}</span>
              </p>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full text-white py-3.5 rounded-2xl font-bold transition disabled:bg-gray-400 mt-4 flex justify-center items-center gap-2 shadow-md cursor-pointer ${
              activeTab === 'pemasukan' ? 'bg-green-700 hover:bg-green-800' : 'bg-red-600 hover:bg-red-700'
            }`}
          >
            {loading ? 'Menyimpan...' : <><Save className="w-5 h-5" /> Simpan {activeTab === 'pemasukan' ? 'Uang Masuk' : 'Uang Keluar'}</>}
          </button>
        </form>
      )}

      {activeTab === 'iuran' && (
        <form onSubmit={handleSubmitIuran} className="bg-white rounded-3xl shadow-sm border p-6 space-y-4 border-t-4 border-t-amber-600">
          <h2 className="text-lg font-black text-gray-800 mb-4 border-b pb-2 flex items-center gap-2">
            <Users className="w-6 h-6 text-amber-600" />
            <span>Catat Penyetoran Iuran Asosiasi</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1">Tanggal Pembayaran</label>
              <input
                type="date"
                required
                value={formIuran.tanggal}
                onChange={(e) => setFormIuran({ ...formIuran, tanggal: e.target.value })}
                className="w-full p-3 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-amber-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1 flex items-center gap-1">
                Penerima Uang (Bendahara) {bendaharaLocks.iuran && <Lock className="w-3 h-3 text-red-500" />}
              </label>
              <select
                required
                disabled={Boolean(bendaharaLocks.iuran)}
                value={formIuran.bendahara}
                onChange={(e) => setFormIuran({ ...formIuran, bendahara: e.target.value })}
                className={`w-full p-3 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-amber-600 ${
                  bendaharaLocks.iuran ? 'bg-gray-100 font-bold text-gray-700 cursor-not-allowed' : ''
                }`}
              >
                <option value="Herni">Herni</option>
                <option value="Sari">Sari</option>
                <option value="DINA RIRIS YANTI">DINA RIRIS YANTI</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1">Atas Nama SDM (Ketik / Pilih Nama)</label>
            <SearchableSDMSelect 
              options={pegawaiList}
              value={formIuran.nama}
              onChange={(namaVal) => setFormIuran({ ...formIuran, nama: namaVal })}
              placeholder="Cari atau pilih nama SDM..."
              accentColor="amber"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1">Nominal Setor (Rp)</label>
            <input
              type="number"
              required
              value={formIuran.nominal}
              onChange={(e) => setFormIuran({ ...formIuran, nominal: e.target.value })}
              className="w-full p-3 border rounded-xl text-lg font-black text-amber-600 outline-none"
            />
            <div className="mt-2 bg-gray-50 p-2.5 rounded-xl border">
              <p className="text-xs font-extrabold text-gray-600">
                Format Tertera: <span className="text-amber-600 font-black">{formatRp(formIuran.nominal)}</span>
              </p>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-amber-600 text-white py-3.5 rounded-2xl font-bold hover:bg-amber-700 transition disabled:bg-gray-400 mt-4 flex justify-center items-center gap-2 shadow-md shadow-amber-600/20 cursor-pointer"
          >
            {loading ? 'Merekam...' : <><Save className="w-5 h-5" /> Simpan Penyetoran Asosiasi</>}
          </button>
        </form>
      )}

      {activeTab === 'klaim' && (
        <form onSubmit={handleSubmitKlaim} className="bg-white rounded-3xl shadow-sm border p-6 space-y-4 border-t-4 border-t-purple-700">
          <h2 className="text-lg font-black text-gray-800 mb-2 border-b pb-2 flex items-center gap-2">
            <Gift className="w-6 h-6 text-purple-700" />
            <span>Catat Rekap Pencairan / Klaim Asosiasi</span>
          </h2>
          <p className="text-xs text-purple-700 font-bold bg-purple-50 p-2.5 rounded-xl border border-purple-100 mb-4">
            Pengaturan Batas Klaim Aktif: Maksimal {maxKlaimTahunan}x per sumber dana (Kabupaten / Provinsi) dalam 1 tahun.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1">Tanggal Pencairan</label>
              <input
                type="date"
                required
                value={formKlaim.tanggal}
                onChange={(e) => setFormKlaim({ ...formKlaim, tanggal: e.target.value })}
                className="w-full p-3 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-purple-700"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1">Nama Penerima SDM (Ketik / Pilih)</label>
              <SearchableSDMSelect 
                options={availablePegawaiForKlaim}
                value={formKlaim.nama}
                onChange={(namaVal) => handleNamaKlaimChange(namaVal)}
                placeholder="Cari penerima klaim..."
                accentColor="purple"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1">Sumber Dana Asosiasi</label>
              <select
                required
                value={formKlaim.sumber}
                onChange={(e) => setFormKlaim({ ...formKlaim, sumber: e.target.value })}
                className="w-full p-3 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-purple-700 font-bold"
              >
                <option value="Asosiasi Kabupaten" disabled={isKabLocked}>
                  Asosiasi Kabupaten {isKabLocked ? '(Terkunci - Sudah Klaim)' : ''}
                </option>
                <option value="Asosiasi Provinsi" disabled={isProvLocked}>
                  Asosiasi Provinsi {isProvLocked ? '(Terkunci - Sudah Klaim)' : ''}
                </option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1">Nominal Dicairkan (Rp)</label>
              <input
                type="number"
                required
                value={formKlaim.nominal}
                onChange={(e) => setFormKlaim({ ...formKlaim, nominal: e.target.value })}
                className="w-full p-3 border rounded-xl text-lg font-black text-purple-700 outline-none"
              />
              <div className="mt-2 bg-gray-50 p-2.5 rounded-xl border">
                <p className="text-xs font-extrabold text-gray-600">
                  Format Tertera: <span className="text-purple-700 font-black">{formatRp(formKlaim.nominal)}</span>
                </p>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1">Keterangan Klaim Asosiasi</label>
            <input
              type="text"
              required
              placeholder="Contoh: Klaim Dana Duka, Pernikahan, Sakit..."
              value={formKlaim.keterangan}
              onChange={(e) => setFormKlaim({ ...formKlaim, keterangan: e.target.value })}
              className="w-full p-3 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-purple-700 font-medium"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-purple-700 text-white py-3.5 rounded-2xl font-bold hover:bg-purple-800 transition disabled:bg-gray-400 mt-4 flex justify-center items-center gap-2 shadow-md shadow-purple-700/20 cursor-pointer"
          >
            {loading ? 'Menyimpan...' : <><Save className="w-5 h-5" /> Catat Rekap Pencairan Asosiasi</>}
          </button>
        </form>
      )}
    </div>
  );
}

// Sub-komponen Searchable Select SDM Nama (Bisa Ketik & Pilih Dropdown)
function SearchableSDMSelect({ options = [], value, onChange, placeholder, accentColor = 'amber' }) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const wrapperRef = useRef(null);

  useEffect(() => {
    setSearchTerm(value || '');
  }, [value]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = options.filter(p => {
    const nameStr = typeof p === 'object' ? p.nama : p;
    return nameStr.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const focusRingClass = accentColor === 'purple' ? 'focus-within:ring-purple-700' : 'focus-within:ring-amber-600';

  return (
    <div ref={wrapperRef} className="relative w-full">
      <div className={`flex items-center border rounded-xl px-3 py-2 bg-white focus-within:ring-2 ${focusRingClass}`}>
        <Search className="w-4 h-4 text-gray-400 mr-2 flex-shrink-0" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            onChange(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className="w-full text-sm font-bold text-gray-800 outline-none bg-transparent"
        />
        <ChevronDown 
          className="w-4 h-4 text-gray-400 cursor-pointer flex-shrink-0 ml-1" 
          onClick={() => setIsOpen(!isOpen)}
        />
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-56 overflow-y-auto">
          {filteredOptions.length > 0 ? (
            filteredOptions.map((p, idx) => {
              const nameStr = typeof p === 'object' ? p.nama : p;
              return (
                <div
                  key={idx}
                  onClick={() => {
                    onChange(nameStr);
                    setSearchTerm(nameStr);
                    setIsOpen(false);
                  }}
                  className="px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-100 cursor-pointer transition border-b last:border-b-0"
                >
                  {nameStr}
                </div>
              );
            })
          ) : (
            <div className="px-4 py-3 text-xs text-gray-400 font-medium text-center">
              Nama tidak ditemukan (Tetap digunakan sebagai input nama baru)
            </div>
          )}
        </div>
      )}
    </div>
  );
}
