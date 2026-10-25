// src/components/ProtectedRoute.jsx
import { Navigate, useLocation } from 'react-router-dom';

export function ProtectedRoute({ children }) {
  const location = useLocation();
  const token = localStorage.getItem('access_token');

  if (!token) {
    // Guarda la ruta original para volver a ella después del login
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return children;
}
