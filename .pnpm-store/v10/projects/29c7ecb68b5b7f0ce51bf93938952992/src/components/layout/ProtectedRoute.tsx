import { useSelector } from 'react-redux';
import { Navigate } from 'react-router-dom';
import { type RootState } from '../../app/store';
import type { Role } from '../../types';

interface Props {
  children: React.ReactNode;
  roles:    Role[];
}

export default function ProtectedRoute({ children, roles }: Props) {
  const { user, accessToken } = useSelector((s: RootState) => s.auth);

  if (!accessToken) return <Navigate to="/login" replace />;
  if (user && !roles.includes(user.role)) {
    if (user.role === 'STAFF') return <Navigate to="/kitchen" replace />;
    if (user.role === 'ADMIN') return <Navigate to="/admin" replace />;
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}