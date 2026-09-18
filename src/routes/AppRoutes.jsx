import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';

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
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />

      <Route element={<ProtectedRoute allowedRoles={['user', 'admin', 'superadmin']} />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/asosiasi" element={<Asosiasi />} />
        <Route path="/database-sdm" element={<DatabaseSDM />} />
        <Route path="/rekap-asosiasi" element={<RekapAsosiasi />} />
        <Route path="/riwayat-transaksi" element={<RiwayatTransaksi />} />
      </Route>

      <Route element={<ProtectedRoute allowedRoles={['admin', 'superadmin']} />}>
        <Route path="/tambah-data" element={<TambahData />} />
        <Route path="/pengaturan" element={<Pengaturan />} />
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}