import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import MainLayout from '../layouts/MainLayout';
import Login from '../pages/Login';
import Dashboard from '../pages/Dashboard';
import TambahData from '../pages/TambahData';
import DatabaseSDM from '../pages/DatabaseSDM';
import Asosiasi from '../pages/Asosiasi';
import RekapAsosiasi from '../pages/RekapAsosiasi';
import RiwayatTransaksi from '../pages/RiwayatTransaksi';
import Pengaturan from '../pages/Pengaturan';

export default function AppRoutes() {
  return (
    <Routes>
      {/* 1. Halaman Login */}
      <Route path="/login" element={<Login />} />
      
      {/* 2. Layout Utama (Membutuhkan Login) */}
      <Route path="/" element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        
        {/* DAPAT DIAKSES OLEH SEMUA ROLE (User Biasa, Admin, & Superadmin) */}
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="asosiasi" element={<Asosiasi />} />
        <Route path="rekap-asosiasi" element={<RekapAsosiasi />} />
        
        {/* KHUSUS ROLE ADMIN & SUPERADMIN */}
        <Route element={<ProtectedRoute allowedRoles={['admin', 'superadmin']} />}>
          <Route path="riwayat" element={<RiwayatTransaksi />} />
          <Route path="tambah-data" element={<TambahData />} />
          <Route path="tambah" element={<Navigate to="/tambah-data" replace />} />
        </Route>

        {/* KHUSUS ROLE SUPERADMIN */}
        <Route element={<ProtectedRoute allowedRoles={['superadmin']} />}>
          <Route path="database-sdm" element={<DatabaseSDM />} />
          <Route path="pengaturan" element={<Pengaturan />} />
        </Route>
      </Route>

      {/* Fallback Jika Route Tidak Ditemukan */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}