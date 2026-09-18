import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

export default function ProtectedRoute({ allowedRoles, children }) {
  const { user, loading } = useAuth();

  if (loading) return <div>Loading...</div>;

  // Jika belum login, lempar ke halaman login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Jika role pengguna tidak sesuai, lempar ke dashboard
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  // Mengembalikan children (jika ada) ATAU Outlet untuk nested routes
  return children ? children : <Outlet />;
}