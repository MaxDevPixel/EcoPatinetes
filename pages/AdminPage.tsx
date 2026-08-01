
import React from 'react';
import AdminDashboard from '../components/AdminDashboard';
import AdminLogin from '../components/AdminLogin';
import { useAuth } from '../hooks/useAuth';

const AdminPage: React.FC = () => {
  const { isAdmin } = useAuth();

  return (
    <div>
      {isAdmin ? <AdminDashboard /> : <AdminLogin />}
    </div>
  );
};

export default AdminPage;
