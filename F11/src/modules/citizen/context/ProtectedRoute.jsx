import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import PageLoader from '../components/Loading/Loading';

export default function ProtectedRoute({ children }) {
  const { user, isReady } = useAuth();

  if (!isReady) return <PageLoader />;
  if (!user) return <Navigate to="/" replace />;
  return children;
}
