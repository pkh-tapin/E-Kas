import { createContext, useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState({ name: 'User', role: 'user' });
  const [role, setRole] = useState('user'); 
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const loginAsUser = () => {
    setUser({ name: 'User', role: 'user' });
    setRole('user');
    navigate('/dashboard');
  };

  const loginAsAdmin = (password) => {
    if (password === 'SAdmin321') {
      setUser({ name: 'Super Admin', role: 'superadmin' });
      setRole('superadmin');
      navigate('/dashboard');
      return { success: true };
    } else if (password === 'Admin321') {
      setUser({ name: 'Administrator', role: 'admin' });
      setRole('admin');
      navigate('/dashboard');
      return { success: true };
    }
    return { success: false, message: 'Kode Password Salah!' };
  };

  const logout = () => {
    setUser({ name: 'User', role: 'user' });
    setRole('user');
    navigate('/dashboard');
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