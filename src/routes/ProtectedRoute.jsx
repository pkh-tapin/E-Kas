import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './context/AuthContext'; // Sesuaikan path AuthContext Anda

export default function ProtectedRoute({ allowedRoles, children }) {
  const { user, loading } = useAuth(); // Sesuaikan dengan state auth Anda

  if (loading) return <div>Loading...</div>;

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  // PENTING: Jika children tidak ada, gunakan <Outlet />
  return children ? children : <Outlet />;
}