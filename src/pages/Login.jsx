// src/pages/Login.jsx
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { KeyRound, User, Wallet, Lock, ShieldCheck } from 'lucide-react';
import Swal from 'sweetalert2';

export default function Login() {
  const { loginAsUser, loginAsAdmin } = useAuth();
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [password, setPassword] = useState('');

  const handleAdminSubmit = (e) => {
    e.preventDefault();
    const result = loginAsAdmin(password);
    if (!result.success) {
      Swal.fire({
        icon: 'error',
        title: 'Akses Ditolak',
        text: result.message,
        confirmButtonColor: '#dc2626'
      });
    } else {
      Swal.fire({
        icon: 'success',
        title: 'Berhasil Login Admin',
        timer: 1200,
        showConfirmButton: false
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4 font-sans">
      <div className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-md text-center border border-gray-100">
        <div className="bg-green-100 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Wallet className="w-8 h-8 text-green-700" />
        </div>
        
        <h1 className="text-2xl font-extrabold text-gray-800 mb-1">e-Kas SDM</h1>
        <p className="text-gray-500 mb-6 text-sm">Pilih mode akses masuk sistem</p>

        {!isAdminMode ? (
          <div className="space-y-3">
            {/* Tombol User Biasa */}
            <button 
              onClick={loginAsUser}
              className="w-full bg-green-700 text-white p-3.5 rounded-xl font-bold hover:bg-green-800 flex items-center justify-center gap-2 shadow-sm transition-all"
            >
              <User className="w-5 h-5" /> Masuk sebagai User Biasa
            </button>

            {/* Icon Kunci untuk Login Admin */}
            <button 
              onClick={() => setIsAdminMode(true)}
              className="w-full bg-gray-100 text-gray-700 p-3.5 rounded-xl font-bold hover:bg-gray-200 flex items-center justify-center gap-2 transition-all border border-gray-200"
            >
              <KeyRound className="w-5 h-5 text-amber-600" /> Login Admin (Akses Penuh)
            </button>
          </div>
        ) : (
          <form onSubmit={handleAdminSubmit} className="space-y-4 animate-fade-in">
            <div className="text-left">
              <label className="block text-xs font-bold text-gray-600 mb-1 flex items-center gap-1">
                <Lock className="w-4 h-4 text-amber-600" /> Password Akses Admin
              </label>
              <input 
                type="password"
                required
                placeholder="Masukkan Kode Admin..."
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-green-600 text-center text-lg font-bold tracking-widest"
              />
            </div>

            <button 
              type="submit"
              className="w-full bg-amber-600 text-white p-3.5 rounded-xl font-bold hover:bg-amber-700 flex items-center justify-center gap-2 shadow-sm transition-all"
            >
              <ShieldCheck className="w-5 h-5" /> Verifikasi Admin
            </button>

            <button 
              type="button"
              onClick={() => setIsAdminMode(false)}
              className="text-sm text-gray-500 hover:text-gray-800 underline font-medium pt-2 block mx-auto"
            >
              Kembali ke Pilihan Role
            </button>
          </form>
        )}
      </div>
    </div>
  );
}