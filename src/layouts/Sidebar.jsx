import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  LayoutDashboard, Users, Award, History, Database, PlusCircle, Settings, ShieldAlert, X 
} from 'lucide-react';

export default function Sidebar({ onClose }) {
  const { role } = useAuth();
  const isSuperAdmin = role === 'superadmin';
  const isAdmin = role === 'admin' || isSuperAdmin;

  // MENU UNTUK SEMUA ROLE (USER BIASA, ADMIN, SUPER ADMIN)
  const menuUser = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Asosiasi', path: '/asosiasi', icon: Users },
    { name: 'Rekap Asosiasi', path: '/rekap-asosiasi', icon: Award },
  ];

  // MENU UNTUK ADMIN & SUPER ADMIN
  const menuAdmin = [
    { name: 'Riwayat Transaksi', path: '/riwayat', icon: History },
    { name: 'Tambah Data', path: '/tambah-data', icon: PlusCircle },
  ];

  // MENU KHUSUS SUPER ADMIN
  const menuSuperAdmin = [
    { name: 'Database SDM', path: '/database-sdm', icon: Database },
    { name: 'Pengaturan', path: '/pengaturan', icon: Settings },
  ];

  const handleMenuClick = () => {
    if (onClose) onClose();
  };

  return (
    <aside className="w-64 h-full bg-green-800 text-white flex flex-col justify-between shadow-xl z-20 shrink-0">
      <div>
        {/* LOGO & TOMBOL CLOSE MOBILE */}
        <div className="p-6 border-b border-green-700/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white/10 p-2 rounded-2xl">
              <LayoutDashboard className="w-6 h-6 text-green-300" />
            </div>
            <div>
              <h1 className="font-black text-lg tracking-tight">e-Kas SDM</h1>
              <p className="text-[10px] text-green-200 font-semibold tracking-wider uppercase">PKH Kab. Tapin</p>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="lg:hidden text-green-200 hover:text-white p-1 rounded-lg"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* LIST MENU */}
        <nav className="p-4 space-y-1.5">
          <div className="px-3 text-[10px] font-black text-green-300/80 uppercase tracking-wider mb-2">
            Menu Utama
          </div>

          {menuUser.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={handleMenuClick}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all ${
                    isActive
                      ? 'bg-white text-green-800 shadow-md shadow-black/10'
                      : 'text-green-100 hover:bg-green-700/60 hover:text-white'
                  }`
                }
              >
                <Icon className="w-5 h-5" />
                {item.name}
              </NavLink>
            );
          })}

          {isAdmin && (
            <>
              <div className="px-3 text-[10px] font-black text-green-300/80 uppercase tracking-wider mt-6 mb-2">
                Administrator
              </div>
              {menuAdmin.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={handleMenuClick}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all ${
                        isActive
                          ? 'bg-white text-green-800 shadow-md shadow-black/10'
                          : 'text-green-100 hover:bg-green-700/60 hover:text-white'
                      }`
                    }
                  >
                    <Icon className="w-5 h-5" />
                    {item.name}
                  </NavLink>
                );
              })}
            </>
          )}

          {isSuperAdmin && (
            <>
              <div className="px-3 text-[10px] font-black text-green-300/80 uppercase tracking-wider mt-6 mb-2">
                Super Admin
              </div>
              {menuSuperAdmin.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={handleMenuClick}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all ${
                        isActive
                          ? 'bg-white text-green-800 shadow-md shadow-black/10'
                          : 'text-green-100 hover:bg-green-700/60 hover:text-white'
                      }`
                    }
                  >
                    <Icon className="w-5 h-5" />
                    {item.name}
                  </NavLink>
                );
              })}
            </>
          )}
        </nav>
      </div>

      {/* ROLE FOOTER */}
      <div className="p-4 border-t border-green-700/50">
        <div className="bg-green-900/60 p-3 rounded-2xl border border-green-700/50 flex items-center gap-2.5">
          <ShieldAlert className="w-4 h-4 text-amber-400" />
          <div>
            <p className="text-[10px] text-green-200 font-medium">Akses Login:</p>
            <p className="text-xs font-black uppercase text-white">
              {role === 'superadmin' ? 'Super Admin' : role === 'admin' ? 'Admin' : 'User Biasa'}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}