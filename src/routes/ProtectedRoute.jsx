import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './context/AuthContext'; // Sesuaikan path AuthContext kamu

export default function ProtectedRoute({ allowedRoles, children }) {
  const { user, loading } = useAuth();

  // 1. Jika masih loading status auth, tampilkan indikator (jangan return null)
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <p className="text-gray-500 font-bold">Memuat halaman...</p>
      </div>
    );
  }

  // 2. Jika belum login, tendang ke halaman login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // 3. Jika role tidak sesuai, tendang ke dashboard
  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  // 4. PENTING: Jika ada children (seperti <MainLayout />), kembalikan children.
  // Jika tidak ada children (seperti nested Route), kembalikan <Outlet />
  return children ? children : <Outlet />;
}