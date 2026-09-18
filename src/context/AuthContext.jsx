import { createContext, useState, useContext, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  // Ambil sesi terakhir dari localStorage agar saat refresh tidak kembali ke awal
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('ekas_user');
    return savedUser ? JSON.parse(savedUser) : { name: 'User', role: 'user' };
  });
  
  const [role, setRole] = useState(() => {
    const savedRole = localStorage.getItem('ekas_role');
    return savedRole ? savedRole : 'user';
  });

  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    localStorage.setItem('ekas_user', JSON.stringify(user));
    localStorage.setItem('ekas_role', role);
  }, [user, role]);

  const loginAsUser = () => {
    const defaultUser = { name: 'User', role: 'user' };
    setUser(defaultUser);
    setRole('user');
    localStorage.setItem('ekas_user', JSON.stringify(defaultUser));
    localStorage.setItem('ekas_role', 'user');
    navigate('/dashboard');
  };

  const loginAsAdmin = (password) => {
    if (password === 'SAdmin321') {
      const superAdminUser = { name: 'Super Admin', role: 'superadmin' };
      setUser(superAdminUser);
      setRole('superadmin');
      localStorage.setItem('ekas_user', JSON.stringify(superAdminUser));
      localStorage.setItem('ekas_role', 'superadmin');
      navigate(location.pathname !== '/login' ? location.pathname : '/dashboard');
      return { success: true };
    } else if (password === 'Admin321') {
      const adminUser = { name: 'Administrator', role: 'admin' };
      setUser(adminUser);
      setRole('admin');
      localStorage.setItem('ekas_user', JSON.stringify(adminUser));
      localStorage.setItem('ekas_role', 'admin');
      navigate(location.pathname !== '/login' ? location.pathname : '/dashboard');
      return { success: true };
    }
    return { success: false, message: 'Kode Password Salah!' };
  };

  const logout = () => {
    const defaultUser = { name: 'User', role: 'user' };
    setUser(defaultUser);
    setRole('user');
    localStorage.removeItem('ekas_user');
    localStorage.removeItem('ekas_role');
    navigate('/login');
  };

  const loginAdmin = (password) => {
    const res = loginAsAdmin(password);
    return res.success;
  };
  const logoutAdmin = logout;

  return (
    <AuthContext.Provider value={{ 
      user, 
      role, 
      loading,
      loginAsUser, 
      loginAsAdmin, 
      loginAdmin, 
      logout, 
      logoutAdmin 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
