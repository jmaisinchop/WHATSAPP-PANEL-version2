// src/components/Header.jsx

import { useLocation, useNavigate } from 'react-router-dom';
import { Bell, LogOut, Moon, Sun, User, LifeBuoy } from 'lucide-react';

// Hooks
import { useAuthStore } from '../store/authStore';
import { useNotificationStore } from '../store/notificationStore';
import { useTheme } from '../contexts/ThemeContext';

// Componentes de UI
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import NotificationPanel from './NotificationPanel';

// Mapa para obtener el título de la página según la ruta
const getTitleFromPathname = (pathname) => {
    if (pathname.startsWith('/chat')) return 'Conversaciones';
    if (pathname.startsWith('/admin/users')) return 'Administración de Usuarios';
    if (pathname.startsWith('/dashboard')) return 'Dashboard';
    return 'W-Panel';
};


export default function Header() {
  const { user, logout } = useAuthStore();
  const { unreadCount } = useNotificationStore();
  const { setTheme, theme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation(); // Hook para obtener la ruta actual

  const pageTitle = getTitleFromPathname(location.pathname);
  const userInitial = user?.firstName ? user.firstName[0] : (user?.email ? user.email[0] : '?');

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b bg-background px-6 sticky top-0 z-30">
      {/* Título de la Página (Izquierda) */}
      <div className="flex items-center">
        <h1 className="text-xl font-semibold text-foreground">{pageTitle}</h1>
      </div>

      {/* Acciones (Derecha) */}
      <div className="flex items-center gap-3">
        {/* Botón de Tema */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          aria-label="Toggle theme"
        >
          <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        </Button>

        {/* Menú de Notificaciones */}
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative rounded-full">
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                        <span className="absolute top-1 right-1 flex h-2.5 w-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                        </span>
                    )}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-80" align="end">
                <NotificationPanel />
            </DropdownMenuContent>
        </DropdownMenu>

        {/* Menú de Usuario (reemplaza el del sidebar) */}
        {/* Ya no es necesario tenerlo en el sidebar si está aquí */}
      </div>
    </header>
  );
}