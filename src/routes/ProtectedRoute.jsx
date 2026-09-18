import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ allowedRoles, children }) {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen font-bold text-gray-600">
        Memuat data...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const currentRole = user?.role || role || 'user';

  if (allowedRoles && Array.isArray(allowedRoles) && !allowedRoles.includes(currentRole)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children ? children : <Outlet />;
}