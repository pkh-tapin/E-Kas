import { useState } from 'react';
import { Key, Eye, EyeOff, X, LogOut, UserCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Swal from 'sweetalert2';

export default function Topbar({ onMenuClick }) {
  const { role, loginAdmin, logoutAdmin } = useAuth();
  const isAdmin = role === 'admin' || role === 'superadmin';

  const [showModal, setShowModal] = useState(false);
  const [passInput, setPassInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleLoginSubmit = (e) => {
    e.preventDefault();
    if (typeof loginAdmin !== 'function') {
      Swal.fire('Error Sistem', 'Fungsi loginAdmin tidak ditemukan.', 'error');
      return;
    }

    const success = loginAdmin(passInput);

    if (success) {
      setShowModal(false);
      setPassInput('');
      Swal.fire({
        icon: 'success',
        title: 'Akses Admin Berhasil',
        text: 'Anda sekarang dalam mode Administrator.',
        timer: 1500,
        showConfirmButton: false
      });
    } else {
      Swal.fire('Password Salah', 'Kode password admin tidak sesuai.', 'error');
    }
  };

  return (
    <header className="bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between z-10">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-xl"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <span className="font-extrabold text-gray-800 text-sm hidden sm:inline-block">
          e-Kas SDM PKH Tapin
        </span>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-2xl border border-gray-100">
          <UserCheck className="w-4 h-4 text-green-700" />
          <div className="text-left">
            <p className="text-[10px] text-gray-400 leading-tight font-bold">Status Akses</p>
            <p className="text-xs font-black text-gray-700 uppercase">
              {isAdmin ? 'Administrator' : 'User Biasa'}
            </p>
          </div>
        </div>

        {!isAdmin ? (
          <button
            onClick={() => setShowModal(true)}
            className="bg-amber-500 hover:bg-amber-600 text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition"
          >
            <Key className="w-3.5 h-3.5" /> Login Admin
          </button>
        ) : (
          <button
            onClick={logoutAdmin}
            className="bg-red-50 hover:bg-red-100 text-red-600 px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
          >
            <LogOut className="w-3.5 h-3.5" /> Keluar Admin
          </button>
        )}
      </div>

      {/* MODAL PASSWORD ADMIN */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-gray-100 relative space-y-4">
            <button
              onClick={() => {
                setShowModal(false);
                setPassInput('');
              }}
              className="absolute top-5 right-5 text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 text-gray-800 font-extrabold text-base border-b pb-3">
              <Key className="w-5 h-5 text-amber-500" /> Masuk Akses Admin
            </div>

            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Kode Password Admin
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={passInput}
                    onChange={(e) => setPassInput(e.target.value)}
                    placeholder="Masukkan password admin..."
                    className="w-full p-3 pr-10 border rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3.5 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-amber-500 text-white py-3 rounded-xl font-bold text-sm hover:bg-amber-600 transition shadow-md shadow-amber-500/20"
              >
                Verifikasi Akses
              </button>
            </form>
          </div>
        </div>
      )}
    </header>
  );
}