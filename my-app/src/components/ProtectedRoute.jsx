import { Navigate } from 'react-router-dom';

export default function ProtectedRoute({ children }) {
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role');

  // Kiểm tra xem người dùng có token và role là admin không
  if (!token || role !== 'admin') {
    return <Navigate to="/login" replace />;
  }

  return children;
}
