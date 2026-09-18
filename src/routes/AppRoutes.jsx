import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import MainLayout from '../layouts/MainLayout';

import Dashboard from '../pages/Dashboard';
import TambahData from '../pages/TambahData';
import Login from '../pages/Login';
import Asosiasi from '../pages/Asosiasi';
import DatabaseSDM from '../pages/DatabaseSDM';
import Pengaturan from '../pages/Pengaturan';
import RekapAsosiasi from '../pages/RekapAsosiasi';
import RiwayatTransaksi from '../pages/RiwayatTransaksi';

export default function AppRoutes() {
  return (
    <Routes>
      {/* Route Login (Tanpa Sidebar/Topbar) */}
      <Route path="/login" element={<Login />} />

      <Route path="/" element={<Navigate to="/dashboard" replace />} />

      {/* Semua halaman yang membutuhkan Sidebar & Topbar */}
      <Route element={<ProtectedRoute allowedRoles={['user', 'admin', 'superadmin']} />}>
        <Route element={<MainLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/asosiasi" element={<Asosiasi />} />
          <Route path="/database-sdm" element={<DatabaseSDM />} />
          <Route path="/rekap-asosiasi" element={<RekapAsosiasi />} />
          <Route path="/riwayat-transaksi" element={<RiwayatTransaksi />} />

          {/* Halaman Khusus Admin & Superadmin */}
          <Route element={<ProtectedRoute allowedRoles={['admin', 'superadmin']} />}>
            <Route path="/tambah-data" element={<TambahData />} />
            <Route path="/pengaturan" element={<Pengaturan />} />
          </Route>
        </Route>
      </Route>

      {/* Redirect jika URL salah */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}