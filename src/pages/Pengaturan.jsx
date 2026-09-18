import { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import { 
  Settings, UserCheck, Plus, Trash2, Save, Wallet, 
  Lock, Database, Folder, FileSpreadsheet, Link, Shield, Eye, EyeOff, RefreshCw 
} from 'lucide-react';
import { subscribeSettings, saveSettingsToDatabase, fetchAPI } from '../services/api';

export default function Pengaturan() {
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState({
    asosiasi: {
      namaAsosiasi: 'Asosiasi SDM PKH Tapin',
      nominalIuran: 35000,
      targetTahunan: 300000,
      nominalMaksimalKlaim: 5000000,
      jumlahMaksimalKlaimTahunan: 1
    },
    bendaharaList: [],
    bendaharaLocks: {
      pemasukan: '',
      pengeluaran: '',
      iuran: ''
    },
    systemKeys: {
      driveFolderId: '',
      spreadsheetId: '',
      gasWebAppUrl: ''
    },
    security: {
      adminPassword: '',
      superAdminPassword: ''
    }
  });

  const [newBendaharaName, setNewBendaharaName] = useState('');
  const [showAdminPass, setShowAdminPass] = useState(false);
  const [showSuperPass, setShowSuperPass] = useState(false);

  // Fungsi penarik data awal lengkap dari GAS & Firebase
  const loadAllSettingsFromGAS = async () => {
    setLoading(true);
    try {
      // Ambil konfigurasi bawaan/awal dari GAS WebApp
      const gasConfig = await fetchAPI('getGasConfig').catch(() => null);

      const unsub = subscribeSettings((data) => {
        if (data) {
          setSettings(prev => ({
            ...prev,
            ...data,
            asosiasi: { ...prev.asosiasi, ...(data.asosiasi || {}) },
            bendaharaList: data.bendaharaList || prev.bendaharaList,
            bendaharaLocks: { ...prev.bendaharaLocks, ...(data.bendaharaLocks || {}) },
            systemKeys: {
              driveFolderId: data.systemKeys?.driveFolderId || gasConfig?.driveFolderId || prev.systemKeys.driveFolderId,
              spreadsheetId: data.systemKeys?.spreadsheetId || gasConfig?.spreadsheetId || prev.systemKeys.spreadsheetId,
              gasWebAppUrl: data.systemKeys?.gasWebAppUrl || gasConfig?.gasWebAppUrl || prev.systemKeys.gasWebAppUrl
            },
            security: {
              adminPassword: data.security?.adminPassword || gasConfig?.adminPassword || 'admin123',
              superAdminPassword: data.security?.superAdminPassword || gasConfig?.superAdminPassword || 'superadmin123'
            }
          }));
        } else if (gasConfig) {
          // Jika database kosong, gunakan respon langsung dari GAS
          setSettings(prev => ({
            ...prev,
            systemKeys: {
              driveFolderId: gasConfig.driveFolderId || '',
              spreadsheetId: gasConfig.spreadsheetId || '',
              gasWebAppUrl: gasConfig.gasWebAppUrl || ''
            },
            security: {
              adminPassword: gasConfig.adminPassword || 'admin123',
              superAdminPassword: gasConfig.superAdminPassword || 'superadmin123'
            }
          }));
        }
        setLoading(false);
      });

      return unsub;
    } catch (err) {
      console.error('Gagal memuat pengaturan dari GAS:', err);
      setLoading(false);
    }
  };

  useEffect(() => {
    let unsubFn;
    loadAllSettingsFromGAS().then(unsub => { unsubFn = unsub; });

    return () => {
      if (typeof unsubFn === 'function') unsubFn();
    };
  }, []);

  // Simpan seluruh data & sinkronkan otomatis
  const saveAllSettings = async (updatedSettings, sectionTitle = 'Pengaturan') => {
    try {
      // 1. Simpan ke Database Utama
      await saveSettingsToDatabase(updatedSettings);

      // 2. Sinkronkan konfigurasi ke backend GAS secara real-time
      fetchAPI('syncGasConfig', {
        systemKeys: updatedSettings.systemKeys,
        security: updatedSettings.security,
        asosiasi: updatedSettings.asosiasi
      }).catch(() => {});

      Swal.fire({
        icon: 'success',
        title: `${sectionTitle} Disimpan!`,
        text: 'Data berhasil diperbarui dan disinkronkan otomatis ke Database & GAS Server.',
        timer: 1800,
        showConfirmButton: false
      });
    } catch (err) {
      Swal.fire('Error', 'Gagal menyimpan pengaturan ke database.', 'error');
    }
  };

  const handleAddBendahara = async (e) => {
    e.preventDefault();
    if (!newBendaharaName.trim()) return;

    const newBendahara = {
      id: Date.now(),
      nama: newBendaharaName.trim(),
      status: 'Aktif'
    };

    const updatedList = [...(settings.bendaharaList || []), newBendahara];
    const newSettings = { ...settings, bendaharaList: updatedList };

    setSettings(newSettings);
    setNewBendaharaName('');
    await saveAllSettings(newSettings, 'Daftar Bendahara');
  };

  const handleDeleteBendahara = async (id, nama) => {
    const confirm = await Swal.fire({
      title: `Hapus ${nama}?`,
      text: 'Penghapusan bendahara ini tidak akan menghapus riwayat transaksi terdahulu.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Ya, Hapus',
      cancelButtonText: 'Batal',
      confirmButtonColor: '#d33'
    });

    if (confirm.isConfirmed) {
      const updatedList = settings.bendaharaList.filter(b => b.id !== id);
      const newSettings = { ...settings, bendaharaList: updatedList };

      setSettings(newSettings);
      await saveAllSettings(newSettings, 'Hapus Bendahara');
    }
  };

  const handleSaveBendaharaLocks = async (e) => {
    e.preventDefault();
    await saveAllSettings(settings, 'Kunci Bendahara Menu');
  };

  const handleSaveAsosiasiSettings = async (e) => {
    e.preventDefault();
    await saveAllSettings(settings, 'Parameter Asosiasi');
  };

  const handleSaveSystemKeys = async (e) => {
    e.preventDefault();
    await saveAllSettings(settings, 'Integrasi System GAS & Drive');
  };

  const handleSaveSecurity = async (e) => {
    e.preventDefault();
    await saveAllSettings(settings, 'Keamanan Password');
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl mx-auto pb-10">
      {/* HEADER PAGE */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-800 flex items-center gap-2">
            <Settings className="w-7 h-7 text-green-700" />
            Pusat Pengaturan Sistem & Konfigurasi
          </h1>
          <p className="text-gray-500 text-sm">Kelola seluruh parameter sistem, limit klaim, penguncian bendahara, dan kunci GAS terpusat.</p>
        </div>
        <button
          onClick={loadAllSettingsFromGAS}
          className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Sinkron Ulang dari GAS
        </button>
      </div>

      {/* SEKSI 1: MANAJEMEN BENDAHARA & PENGUNCIAN PER-MENU */}
      <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-6">
        <div className="flex justify-between items-center border-b pb-3">
          <h2 className="text-base font-black text-gray-800 flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-green-700" />
            Kelola Daftar Bendahara & Penguncian Menu
          </h2>
          <span className="text-xs bg-green-100 text-green-800 font-bold px-2.5 py-1 rounded-full">
            {settings.bendaharaList?.length || 0} Terdaftar
          </span>
        </div>

        <div className="space-y-3">
          <label className="block text-xs font-bold text-gray-700">Tambah Bendahara Baru</label>
          <form onSubmit={handleAddBendahara} className="flex gap-2">
            <input
              type="text"
              required
              placeholder="Masukkan Nama Bendahara Baru..."
              value={newBendaharaName}
              onChange={(e) => setNewBendaharaName(e.target.value)}
              className="flex-1 p-3 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-green-600 font-medium"
            />
            <button
              type="submit"
              className="bg-green-700 hover:bg-green-800 text-white px-5 py-3 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-md shadow-green-700/20 transition"
            >
              <Plus className="w-4 h-4" /> Tambah
            </button>
          </form>

          <div className="divide-y divide-gray-100 pt-1">
            {(!settings.bendaharaList || settings.bendaharaList.length === 0) ? (
              <p className="text-center py-4 text-xs text-gray-400 font-medium">Belum ada bendahara terdaftar.</p>
            ) : (
              settings.bendaharaList.map((b) => (
                <div key={b.id} className="py-2.5 flex justify-between items-center hover:bg-gray-50/80 px-2 rounded-xl transition">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-green-100 text-green-800 flex items-center justify-center font-black text-xs">
                      {b.nama.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-extrabold text-gray-800 text-sm">{b.nama}</p>
                      <p className="text-[10px] text-gray-400 font-semibold">Pengelola Kas & Iuran</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDeleteBendahara(b.id, b.nama)}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition"
                    title="Hapus Bendahara"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* PENGUNCIAN BENDAHARA PER MENU */}
        <form onSubmit={handleSaveBendaharaLocks} className="pt-4 border-t space-y-4">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-amber-600" />
            <h3 className="text-xs font-black text-gray-800 uppercase tracking-wider">Kunci Bendahara Otomatis Per-Menu (Super Admin Lock)</h3>
          </div>
          <p className="text-xs text-gray-500">
            Pilih bendahara khusus yang dikunci pada tiap menu. Pilihan ini akan mengunci dropdown bendahara pada form input pengguna biasa.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1">Kunci Pemasukan</label>
              <select
                value={settings.bendaharaLocks?.pemasukan || ''}
                onChange={(e) => setSettings({
                  ...settings,
                  bendaharaLocks: { ...settings.bendaharaLocks, pemasukan: e.target.value }
                })}
                className="w-full p-2.5 border rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="">-- Bebas (Tidak Dikunci) --</option>
                {settings.bendaharaList?.map((b) => (
                  <option key={b.id} value={b.nama}>{b.nama}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1">Kunci Pengeluaran</label>
              <select
                value={settings.bendaharaLocks?.pengeluaran || ''}
                onChange={(e) => setSettings({
                  ...settings,
                  bendaharaLocks: { ...settings.bendaharaLocks, pengeluaran: e.target.value }
                })}
                className="w-full p-2.5 border rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="">-- Bebas (Tidak Dikunci) --</option>
                {settings.bendaharaList?.map((b) => (
                  <option key={b.id} value={b.nama}>{b.nama}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1">Kunci Bayar Asosiasi</label>
              <select
                value={settings.bendaharaLocks?.iuran || ''}
                onChange={(e) => setSettings({
                  ...settings,
                  bendaharaLocks: { ...settings.bendaharaLocks, iuran: e.target.value }
                })}
                className="w-full p-2.5 border rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="">-- Bebas (Tidak Dikunci) --</option>
                {settings.bendaharaList?.map((b) => (
                  <option key={b.id} value={b.nama}>{b.nama}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="bg-amber-600 hover:bg-amber-700 text-white px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-md transition"
            >
              <Save className="w-4 h-4" /> Simpan Penguncian Bendahara
            </button>
          </div>
        </form>
      </div>

      {/* SEKSI 2: PARAMETER ASOSIASI & BATAS KLAIM TAHUNAN */}
      <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-4">
        <h2 className="text-base font-black text-gray-800 flex items-center gap-2 border-b pb-3">
          <Wallet className="w-5 h-5 text-green-700" />
          Parameter Nominal & Limit Batas Klaim Asosiasi
        </h2>

        <form onSubmit={handleSaveAsosiasiSettings} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1">Nama Asosiasi</label>
              <input
                type="text"
                required
                value={settings.asosiasi?.namaAsosiasi || ''}
                onChange={(e) => setSettings({
                  ...settings,
                  asosiasi: { ...settings.asosiasi, namaAsosiasi: e.target.value }
                })}
                className="w-full p-3 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-green-600 font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1">Nominal Iuran Bulanan (Rp)</label>
              <input
                type="number"
                required
                value={settings.asosiasi?.nominalIuran || 35000}
                onChange={(e) => setSettings({
                  ...settings,
                  asosiasi: { ...settings.asosiasi, nominalIuran: Number(e.target.value) }
                })}
                className="w-full p-3 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-green-600 font-extrabold text-amber-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1">Target Iuran Setahun (Rp)</label>
              <input
                type="number"
                required
                value={settings.asosiasi?.targetTahunan || 300000}
                onChange={(e) => setSettings({
                  ...settings,
                  asosiasi: { ...settings.asosiasi, targetTahunan: Number(e.target.value) }
                })}
                className="w-full p-3 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-green-600 font-black text-green-700"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1">Nominal Maksimal Klaim Pencairan (Rp)</label>
              <input
                type="number"
                required
                value={settings.asosiasi?.nominalMaksimalKlaim || 5000000}
                onChange={(e) => setSettings({
                  ...settings,
                  asosiasi: { ...settings.asosiasi, nominalMaksimalKlaim: Number(e.target.value) }
                })}
                className="w-full p-3 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-green-600 font-black text-purple-700"
              />
            </div>

            <div className="sm:col-span-2 bg-purple-50 p-4 rounded-2xl border border-purple-100">
              <label className="block text-xs font-bold text-purple-900 mb-1">
                Batas Frekuensi Penerimaan Klaim per SDM (Jumlah Kali / Tahun)
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min="1"
                  max="10"
                  required
                  value={settings.asosiasi?.jumlahMaksimalKlaimTahunan ?? 1}
                  onChange={(e) => setSettings({
                    ...settings,
                    asosiasi: { ...settings.asosiasi, jumlahMaksimalKlaimTahunan: Number(e.target.value) }
                  })}
                  className="w-28 p-2.5 border rounded-xl text-center text-lg font-black text-purple-800 bg-white outline-none focus:ring-2 focus:ring-purple-600"
                />
                <p className="text-xs text-purple-700 font-semibold">
                  Kali pencairan per sumber dana (Kabupaten / Provinsi) dalam 1 periode tahun anggaran.
                </p>
              </div>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              className="bg-green-700 hover:bg-green-800 text-white px-6 py-3 rounded-xl font-bold text-xs flex items-center gap-2 shadow-md transition"
            >
              <Save className="w-4 h-4" /> Simpan Parameter Asosiasi
            </button>
          </div>
        </form>
      </div>

      {/* SEKSI 3: INTEGRASI KUNCI SISTEM GAS, DRIVE & SPREADSHEET (Auto-Ditarik dari GAS) */}
      <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-4">
        <div className="flex justify-between items-center border-b pb-3">
          <h2 className="text-base font-black text-gray-800 flex items-center gap-2">
            <Database className="w-5 h-5 text-blue-600" />
            Integrasi ID GAS, Spreadsheet & Drive (Terisi Otomatis)
          </h2>
          <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded-md">
            Auto-Fetched from GAS
          </span>
        </div>

        <form onSubmit={handleSaveSystemKeys} className="space-y-4">
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1 flex items-center gap-1.5">
                <Folder className="w-3.5 h-3.5 text-amber-500" /> ID Google Drive Folder (Penyimpanan Berkas)
              </label>
              <input
                type="text"
                required
                placeholder="Memuat Folder ID dari GAS..."
                value={settings.systemKeys?.driveFolderId || ''}
                onChange={(e) => setSettings({
                  ...settings,
                  systemKeys: { ...settings.systemKeys, driveFolderId: e.target.value }
                })}
                className="w-full p-3 border rounded-xl text-xs font-mono font-bold text-gray-800 bg-gray-50/50 outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1 flex items-center gap-1.5">
                <FileSpreadsheet className="w-3.5 h-3.5 text-green-600" /> ID Google Spreadsheet (Database & Backup Sheet)
              </label>
              <input
                type="text"
                required
                placeholder="Memuat Spreadsheet ID dari GAS..."
                value={settings.systemKeys?.spreadsheetId || ''}
                onChange={(e) => setSettings({
                  ...settings,
                  systemKeys: { ...settings.systemKeys, spreadsheetId: e.target.value }
                })}
                className="w-full p-3 border rounded-xl text-xs font-mono font-bold text-gray-800 bg-gray-50/50 outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1 flex items-center gap-1.5">
                <Link className="w-3.5 h-3.5 text-blue-500" /> URL Web App Google Apps Script (GAS Server)
              </label>
              <input
                type="url"
                required
                placeholder="https://script.google.com/macros/s/.../exec"
                value={settings.systemKeys?.gasWebAppUrl || ''}
                onChange={(e) => setSettings({
                  ...settings,
                  systemKeys: { ...settings.systemKeys, gasWebAppUrl: e.target.value }
                })}
                className="w-full p-3 border rounded-xl text-xs font-mono font-bold text-gray-800 bg-gray-50/50 outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold text-xs flex items-center gap-2 shadow-md transition"
            >
              <Save className="w-4 h-4" /> Simpan Integrasi Server
            </button>
          </div>
        </form>
      </div>

      {/* SEKSI 4: KEAMANAN & PASSWORD AWAL ADMIN / SUPER ADMIN (Auto-Ditarik dari GAS) */}
      <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-4">
        <div className="flex justify-between items-center border-b pb-3">
          <h2 className="text-base font-black text-gray-800 flex items-center gap-2">
            <Shield className="w-5 h-5 text-red-600" />
            Pengaturan Password Akses (Auto-Ditarik dari GAS)
          </h2>
          <span className="text-[10px] bg-red-100 text-red-800 font-bold px-2 py-0.5 rounded-md">
            Security Active
          </span>
        </div>

        <form onSubmit={handleSaveSecurity} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1">Password Akses Admin</label>
              <div className="relative">
                <input
                  type={showAdminPass ? "text" : "password"}
                  required
                  placeholder="Password Admin..."
                  value={settings.security?.adminPassword || ''}
                  onChange={(e) => setSettings({
                    ...settings,
                    security: { ...settings.security, adminPassword: e.target.value }
                  })}
                  className="w-full p-3 pr-10 border rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-red-600"
                />
                <button
                  type="button"
                  onClick={() => setShowAdminPass(!showAdminPass)}
                  className="absolute right-3 top-3.5 text-gray-400 hover:text-gray-600"
                >
                  {showAdminPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1">Password Akses Super Admin</label>
              <div className="relative">
                <input
                  type={showSuperPass ? "text" : "password"}
                  required
                  placeholder="Password Super Admin..."
                  value={settings.security?.superAdminPassword || ''}
                  onChange={(e) => setSettings({
                    ...settings,
                    security: { ...settings.security, superAdminPassword: e.target.value }
                  })}
                  className="w-full p-3 pr-10 border rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-red-600"
                />
                <button
                  type="button"
                  onClick={() => setShowSuperPass(!showSuperPass)}
                  className="absolute right-3 top-3.5 text-gray-400 hover:text-gray-600"
                >
                  {showSuperPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-xl font-bold text-xs flex items-center gap-2 shadow-md transition"
            >
              <Save className="w-4 h-4" /> Simpan Password Keamanan
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
