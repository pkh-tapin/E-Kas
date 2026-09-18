import { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import { Save, Users, Gift, ArrowDownToLine, ArrowUpFromLine } from 'lucide-react';
import { 
  fetchAPI, 
  subscribeSDMData, 
  subscribeSettings, 
  getFastRekapAsosiasi, 
  saveRekapAsosiasiToDatabase,
  subscribeRekapAsosiasi
} from '../services/api';

export default function TambahData() {
  const [activeTab, setActiveTab] = useState('pemasukan');
  const [loading, setLoading] = useState(false);
  const [pegawaiList, setPegawaiList] = useState([]);
  const [rekapClaims, setRekapClaims] = useState([]);
  const [maxKlaimTahunan, setMaxKlaimTahunan] = useState(1);

  const getTodayDate = () => new Date().toISOString().split('T')[0];

  const formatRp = (val) => {
    if (!val && val !== 0) return 'Rp 0';
    const num = typeof val === 'string' ? parseInt(val.replace(/\D/g, ''), 10) : val;
    if (isNaN(num)) return 'Rp 0';
    return 'Rp ' + num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  const [formDana, setFormDana] = useState({
    bendahara: 'Herni',
    tanggal: getTodayDate(),
    jenis: 'Pemasukan',
    kategori: 'Kantor',
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
    const payload = { ...formDana, jenis: jenisTransaksi };

    try {
      await fetchAPI('simpanDana', payload);
      Swal.fire({
        icon: 'success',
        title: 'Berhasil Disimpan!',
        text: `Transaksi ${jenisTransaksi} sebesar ${formatRp(formDana.nominal)} berhasil direkam.`,
        confirmButtonColor: '#15803d'
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
      Swal.fire('Peringatan', 'Silakan pilih Nama SDM terlebih dahulu.', 'warning');
      return;
    }

    setLoading(true);
    try {
      await fetchAPI('simpanIuran', formIuran);
      Swal.fire({
        icon: 'success',
        title: 'Pembayaran Tercatat!',
        text: `Iuran a.n ${formIuran.nama} sebesar ${formatRp(formIuran.nominal)} berhasil disimpan.`,
        confirmButtonColor: '#15803d'
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
        ...formKlaim
      };

      const updatedList = [newRecord, ...existingRekap];
      await saveRekapAsosiasiToDatabase(updatedList, newRecord);

      Swal.fire({
        icon: 'success',
        title: 'Pencairan Disimpan!',
        text: `Klaim ${formKlaim.sumber} a.n ${formKlaim.nama} sebesar ${formatRp(formKlaim.nominal)} berhasil dicatat.`,
        confirmButtonColor: '#15803d'
      });
      setFormKlaim(prev => ({ ...prev, nama: '' }));
    } catch (err) {
      Swal.fire('Error', 'Gagal mencatat rekap pencairan.', 'error');
    }
    setLoading(false);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      <div className="text-center max-w-xl mx-auto">
        <h1 className="text-2xl font-black text-gray-800">Pusat Tambah Data (Administrator)</h1>
        <p className="text-gray-500 text-sm mt-1">Catat seluruh transaksi kas, iuran, dan klaim pencairan secara terpusat.</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <button
          onClick={() => setActiveTab('pemasukan')}
          className={`py-3 px-3 font-bold text-xs sm:text-sm rounded-2xl flex flex-col sm:flex-row items-center justify-center gap-1.5 transition ${
            activeTab === 'pemasukan' ? 'bg-green-700 text-white shadow-md font-extrabold' : 'bg-white border text-gray-600 hover:bg-gray-50'
          }`}
        >
          <ArrowDownToLine className="w-4 h-4 text-green-300" /> Pemasukan Kas
        </button>

        <button
          onClick={() => setActiveTab('pengeluaran')}
          className={`py-3 px-3 font-bold text-xs sm:text-sm rounded-2xl flex flex-col sm:flex-row items-center justify-center gap-1.5 transition ${
            activeTab === 'pengeluaran' ? 'bg-red-600 text-white shadow-md font-extrabold' : 'bg-white border text-gray-600 hover:bg-gray-50'
          }`}
        >
          <ArrowUpFromLine className="w-4 h-4 text-red-200" /> Pengeluaran Kas
        </button>

        <button
          onClick={() => setActiveTab('iuran')}
          className={`py-3 px-3 font-bold text-xs sm:text-sm rounded-2xl flex flex-col sm:flex-row items-center justify-center gap-1.5 transition ${
            activeTab === 'iuran' ? 'bg-amber-600 text-white shadow-md font-extrabold' : 'bg-white border text-gray-600 hover:bg-gray-50'
          }`}
        >
          <Users className="w-4 h-4 text-amber-200" /> Bayar Asosiasi
        </button>

        <button
          onClick={() => setActiveTab('klaim')}
          className={`py-3 px-3 font-bold text-xs sm:text-sm rounded-2xl flex flex-col sm:flex-row items-center justify-center gap-1.5 transition ${
            activeTab === 'klaim' ? 'bg-purple-700 text-white shadow-md font-extrabold' : 'bg-white border text-gray-600 hover:bg-gray-50'
          }`}
        >
          <Gift className="w-4 h-4 text-purple-200" /> Rekap Klaim
        </button>
      </div>

      {(activeTab === 'pemasukan' || activeTab === 'pengeluaran') && (
        <form 
          onSubmit={(e) => handleSubmitDana(e, activeTab === 'pemasukan' ? 'Pemasukan' : 'Pengeluaran')}
          className={`bg-white rounded-3xl shadow-sm border p-6 space-y-4 border-t-4 ${
            activeTab === 'pemasukan' ? 'border-t-green-700' : 'border-t-red-600'
          }`}
        >
          <h2 className="text-lg font-black text-gray-800 mb-4 border-b pb-2">
            Catat {activeTab === 'pemasukan' ? 'Pemasukan' : 'Pengeluaran'} Kas Umum
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1">Tanggal</label>
              <input
                type="date"
                required
                value={formDana.tanggal}
                onChange={(e) => setFormDana({ ...formDana, tanggal: e.target.value })}
                className="w-full p-3 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-green-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1">Bendahara (Posisi Uang)</label>
              <select
                required
                value={formDana.bendahara}
                onChange={(e) => setFormDana({ ...formDana, bendahara: e.target.value })}
                className="w-full p-3 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-green-600"
              >
                <option value="Herni">Herni</option>
                <option value="Sari">Sari</option>
                <option value="DINA RIRIS YANTI">DINA RIRIS YANTI</option>
              </select>
            </div>

            <div className="col-span-2">
              <label className="block text-xs font-bold text-gray-600 mb-1">Kategori Transaksi</label>
              <select
                required
                value={formDana.kategori}
                onChange={(e) => setFormDana({ ...formDana, kategori: e.target.value })}
                className="w-full p-3 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-green-600"
              >
                <option value="Kantor">Kantor</option>
                <option value="Rapat">Rapat</option>
                <option value="Hadiah">Hadiah</option>
                <option value="Acara">Acara</option>
                <option value="Lainnya">Lainnya</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1">Keperluan / Keterangan Barang</label>
            <input
              type="text"
              required
              placeholder="Keterangan transaksi..."
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
            <p className="text-xs font-extrabold text-gray-500 mt-1.5 bg-gray-50 p-2 rounded-lg border inline-block">
              Terbilang: <span className="text-green-700">{formatRp(formDana.nominal)}</span>
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full text-white py-3.5 rounded-2xl font-bold transition disabled:bg-gray-400 mt-4 flex justify-center items-center gap-2 shadow-md ${
              activeTab === 'pemasukan' ? 'bg-green-700 hover:bg-green-800' : 'bg-red-600 hover:bg-red-700'
            }`}
          >
            {loading ? 'Menyimpan Transaksi...' : <><Save className="w-5 h-5" /> Simpan {activeTab === 'pemasukan' ? 'Pemasukan' : 'Pengeluaran'}</>}
          </button>
        </form>
      )}

      {activeTab === 'iuran' && (
        <form onSubmit={handleSubmitIuran} className="bg-white rounded-3xl shadow-sm border p-6 space-y-4 border-t-4 border-t-amber-600">
          <h2 className="text-lg font-black text-gray-800 mb-4 border-b pb-2">Catat Penyetoran Iuran Asosiasi</h2>

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
              <label className="block text-xs font-bold text-gray-600 mb-1">Penerima Uang (Bendahara)</label>
              <select
                required
                value={formIuran.bendahara}
                onChange={(e) => setFormIuran({ ...formIuran, bendahara: e.target.value })}
                className="w-full p-3 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-amber-600"
              >
                <option value="Herni">Herni</option>
                <option value="Sari">Sari</option>
                <option value="DINA RIRIS YANTI">DINA RIRIS YANTI</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1">Atas Nama SDM (Dropdown)</label>
            <select
              required
              value={formIuran.nama}
              onChange={(e) => setFormIuran({ ...formIuran, nama: e.target.value })}
              className="w-full p-3 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-amber-600 font-bold"
            >
              <option value="">-- Pilih Nama SDM --</option>
              {pegawaiList.map((p, idx) => {
                const nameStr = typeof p === 'object' ? p.nama : p;
                return <option key={idx} value={nameStr}>{nameStr}</option>;
              })}
            </select>
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
            <p className="text-xs font-extrabold text-gray-500 mt-1.5 bg-gray-50 p-2 rounded-lg border inline-block">
              Terbilang: <span className="text-amber-600">{formatRp(formIuran.nominal)}</span>
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-amber-600 text-white py-3.5 rounded-2xl font-bold hover:bg-amber-700 transition disabled:bg-gray-400 mt-4 flex justify-center items-center gap-2 shadow-md shadow-amber-600/20"
          >
            {loading ? 'Merekam Iuran...' : <><Save className="w-5 h-5" /> Simpan Penyetoran Asosiasi</>}
          </button>
        </form>
      )}

      {activeTab === 'klaim' && (
        <form onSubmit={handleSubmitKlaim} className="bg-white rounded-3xl shadow-sm border p-6 space-y-4 border-t-4 border-t-purple-700">
          <h2 className="text-lg font-black text-gray-800 mb-2 border-b pb-2">Catat Rekap Pencairan / Klaim Asosiasi</h2>
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
              <label className="block text-xs font-bold text-gray-600 mb-1">Nama Penerima SDM</label>
              <select
                required
                value={formKlaim.nama}
                onChange={(e) => handleNamaKlaimChange(e.target.value)}
                className="w-full p-3 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-purple-700 font-bold"
              >
                <option value="">-- Pilih Nama SDM Penerima --</option>
                {availablePegawaiForKlaim.map((p, idx) => {
                  const nameStr = typeof p === 'object' ? p.nama : p;
                  return <option key={idx} value={nameStr}>{nameStr}</option>;
                })}
              </select>
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
              <p className="text-xs font-extrabold text-gray-500 mt-1.5 bg-gray-50 p-2 rounded-lg border inline-block">
                Terbilang: <span className="text-purple-700">{formatRp(formKlaim.nominal)}</span>
              </p>
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
            className="w-full bg-purple-700 text-white py-3.5 rounded-2xl font-bold hover:bg-purple-800 transition disabled:bg-gray-400 mt-4 flex justify-center items-center gap-2 shadow-md shadow-purple-700/20"
          >
            {loading ? 'Menyimpan Pencairan...' : <><Save className="w-5 h-5" /> Catat Rekap Pencairan Asosiasi</>}
          </button>
        </form>
      )}
    </div>
  );
}