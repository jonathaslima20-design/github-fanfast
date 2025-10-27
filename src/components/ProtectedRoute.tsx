import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader } from 'lucide-react';
import { isAuthenticated } from '@/lib/auth/simpleAuth';

export default function ProtectedRoute() {
  const { user, loading } = useAuth();
  const location = useLocation();

  // Additional check with simplified auth
  const isSimpleAuth = isAuthenticated();

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center">
        <Loader className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Se não houver usuário ou não estiver autenticado, redireciona para o login
  if (!user || !isSimpleAuth) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Se for admin, redireciona para o painel administrativo
  if (user.role === 'admin') {
    return <Navigate to="/admin" replace />;
  }

  // Se for parceiro, redireciona para a página de usuários
  if (user.role === 'parceiro') {
    return <Navigate to="/admin/users" replace />;
  }

  // Se for corretor, permite acesso ao dashboard
  if (user.role === 'corretor') {
    return <Outlet />;
  }

  // Fallback para role desconhecida
  return <Navigate to="/login" replace />;
}