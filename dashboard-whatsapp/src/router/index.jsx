import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

// --- Importamos todos los Layouts y Páginas ---
import LoginPage from '../pages/auth/LoginPage';
import DashboardLayout from '../layouts/DashboardLayout';
import DashboardHomePage from '../pages/DashboardHomePage';
import ChatPage from '../pages/chat/ChatPage';
import UserListPage from '../pages/admin/users/UserListPage';
import SettingsPage from '../pages/admin/SettingsPage';
import ConnectedAgentsPage from '../pages/admin/ConnectedAgentsPage';


const ProtectedRoute = () => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <Outlet />;
};

/**
 * Componente Guardián de Rol:
 * Verifica si el usuario autenticado tiene el rol de 'admin'.
 * Si no lo tiene, lo redirige al dashboard principal.
 * Si lo tiene, muestra la página de administrador solicitada.
 */
const AdminRoute = () => {
  const user = useAuthStore((state) => state.user);
  if (user?.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }
  return <Outlet />;
};


// --- Configuración Principal del Router ---
export const router = createBrowserRouter([
  // Ruta pública para el Login
  {
    path: '/login',
    element: <LoginPage />,
  },
  // Grupo de rutas protegidas
  {
    path: '/',
    element: <ProtectedRoute />, // 1. Primero se asegura de que el usuario esté logueado
    children: [
      {
        element: <DashboardLayout />, // 2. Si está logueado, aplica el Layout con la barra lateral
        children: [
          {
            path: '/', // Redirige la ruta raíz hacia el dashboard
            element: <Navigate to="/dashboard" replace />,
          },
          {
            path: 'dashboard',
            element: <DashboardHomePage />,
          },
          {
            path: 'chat',
            element: <ChatPage />,
          },
          // Sub-grupo de rutas que requieren ser 'admin'
          {
            element: <AdminRoute />, // 3. Aplica el guardián de rol de administrador
            children: [
              {
                path: 'admin/users',
                element: <UserListPage />,
              },
              {
                path: 'admin/connected-agents',
                element: <ConnectedAgentsPage />,
              },
              {
                path: 'admin/settings',
                element: <SettingsPage />,
              },
            ],
          },
        ],
      },
    ],
  },
  // Ruta comodín para cualquier otra URL no definida, redirige a la raíz
  {
    path: '*',
    element: <Navigate to="/" replace />,
  }
]);