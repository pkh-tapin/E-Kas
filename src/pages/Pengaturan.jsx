import { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import { 
  Settings, UserCheck, Plus, Trash2, Save, ShieldCheck, Wallet, DollarSign 
} from 'lucide-react';
import { subscribeSettings, saveSettingsToDatabase } from '../services/api';

export default function Pengaturan() {
  const [settings, setSettings] = useState({
    asosiasi: {
      namaAsosiasi: 'Asosiasi SDM PKH Tapin',
      nominalIuran: 35000,
      targetTahunan: 300000
    },
    bendaharaList: []
  });

  const [newBendaharaName, setNewBendaharaName] = useState('');

  useEffect(() => {
    const unsub = subscribeSettings((data) => {
      if (data) {
        setSettings(data);
      }
    });

    return () => {
      if (typeof unsub === 'function') unsub();
    };
  }, []);

  const handleSaveAsosiasiSettings = async (e) => {
    e.preventDefault();
    await saveSettingsToDatabase(settings);
    Swal.fire({
      icon: 'success',
      title: 'Pengaturan Disimpan!',
      text: 'Parameter Asosiasi berhasil diperbarui.',
      timer: 1500,
      showConfirmButton: false
    });
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
    await saveSettingsToDatabase(newSettings);

    Swal.fire({
      icon: 'success',
      title: 'Bendahara Ditambahkan',
      text: `Bendahara "${newBendahara.nama}" siap digunakan pada form transaksi.`,
      timer: 1500,
      showConfirmButton: false
    });
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
      await saveSettingsToDatabase(newSettings);

      Swal.fire('Terhapus', `Bendahara ${nama} telah dihapus dari opsi aktif.`, 'success');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
      {/* HEADER PAGE */}
      <div>
        <h1 className="text-2xl font-black text-gray-800 flex items-center gap-2">
          <Settings className="w-7 h-7 text-green-700" />
          Pengaturan Sistem & Bendahara
        </h1>
        <p className="text-gray-500 text-sm">Kelola daftar Bendahara aktif dan parameter iuran Asosiasi (Khusus Super Admin).</p>
      </div>

      {/* SEKSI 1: MANAJEMEN BENDAHARA */}
      <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-4">
        <div className="flex justify-between items-center border-b pb-3">
          <h2 className="text-base font-black text-gray-800 flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-green-700" />
            Kelola Daftar Bendahara Aktif
          </h2>
          <span className="text-xs bg-green-100 text-green-800 font-bold px-2.5 py-1 rounded-full">
            {settings.bendaharaList?.length || 0} Terdaftar
          </span>
        </div>

        <p className="text-xs text-gray-500 font-medium">
          Daftar ini akan muncul pada pilihan Bendahara saat pencatatan Pemasukan/Iuran. Riwayat transaksi terdahulu tetap terjaga lengkap walau nama bendahara dihapus dari daftar ini.
        </p>

        {/* FORM TAMBAH BENDAHARA */}
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

        {/* LIST BENDAHARA AKTIF */}
        <div className="divide-y divide-gray-100 pt-2">
          {(!settings.bendaharaList || settings.bendaharaList.length === 0) ? (
            <p className="text-center py-6 text-xs text-gray-400 font-medium">Belum ada bendahara terdaftar.</p>
          ) : (
            settings.bendaharaList.map((b) => (
              <div key={b.id} className="py-3 flex justify-between items-center hover:bg-gray-50/80 px-2 rounded-xl transition">
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

      {/* SEKSI 2: PARAMETER ASOSIASI */}
      <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-4">
        <h2 className="text-base font-black text-gray-800 flex items-center gap-2 border-b pb-3">
          <Wallet className="w-5 h-5 text-green-700" />
          Parameter Nominal Asosiasi
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
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              className="bg-green-700 hover:bg-green-800 text-white px-6 py-3 rounded-xl font-bold text-xs flex items-center gap-2 shadow-md shadow-green-700/20 transition"
            >
              <Save className="w-4 h-4" /> Simpan Perubahan Parameter
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}