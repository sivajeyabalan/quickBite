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
  if (user && !roles.includes(user.role)) return <Navigate to="/" replace />;

  return <>{children}</>;
}