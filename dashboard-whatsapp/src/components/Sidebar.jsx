import { useMemo } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  MessageSquare,
  Users,
  Settings,
  LogOut,
  BarChart2,
  CheckCircle,
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useChatStore } from '../store/chatStore';
import { usePanelStore } from '../store/panelStore';
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

const NavItem = ({ to, icon: Icon, children, badgeCount }) => {
  const baseClasses = "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary";
  const activeClasses = "bg-muted text-primary";

  return (
    <NavLink
      to={to}
      className={({ isActive }) => `${baseClasses} ${isActive ? activeClasses : ''}`}
    >
      <Icon className="h-4 w-4" />
      {children}
      {badgeCount > 0 && (
        <Badge className="ml-auto flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
          {badgeCount}
        </Badge>
      )}
    </NavLink>
  );
};

export default function Sidebar() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const chats = useChatStore((state) => state.chats);
  const botProfilePicUrl = usePanelStore((state) => state.botProfilePicUrl);

  // ✅ 1. Calculamos el total de mensajes no leídos sumando los contadores de todos los chats.
  // Usamos useMemo para optimizar y que este cálculo solo se rehaga cuando la lista de chats cambie.
  const totalUnread = useMemo(() => {
    return chats.reduce((acc, chat) => acc + (chat.unreadCount || 0), 0);
  }, [chats]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isAdmin = user?.role === 'admin';

  return (
    <div className="hidden border-r bg-card lg:block w-64">
      <div className="flex h-full max-h-screen flex-col gap-2">
        <div className="flex h-14 items-center border-b px-4">
          <NavLink to="/" className="flex items-center gap-2 font-semibold">
            <Avatar className="h-8 w-8">
              <AvatarImage src={botProfilePicUrl} alt="Bot" />
              <AvatarFallback>🤖</AvatarFallback>
            </Avatar>
            <span>KIKA Dashboard</span>
          </NavLink>
        </div>
        <div className="flex-1">
          <nav className="grid items-start px-2 text-sm font-medium">
            <NavItem to="/dashboard" icon={BarChart2}>Dashboard</NavItem>

            {/* ✅ 2. Pasamos el contador total al componente del enlace de "Conversaciones" */}
            <NavItem to="/chat" icon={MessageSquare} badgeCount={totalUnread}>
              Conversaciones
            </NavItem>

            {isAdmin && (
              <>
                <NavItem to="/admin/users" icon={Users}>Usuarios</NavItem>
                <NavItem to="/admin/connected-agents" icon={CheckCircle}>Agentes Conectados</NavItem>
                <NavItem to="/admin/settings" icon={Settings}>Ajustes del Bot</NavItem>
              </>
            )}
          </nav>
        </div>
        <div className="mt-auto p-4 border-t">
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9">
              <AvatarFallback>{user?.firstName?.[0] || 'U'}</AvatarFallback>
            </Avatar>
            <div className="flex-1 overflow-hidden">
              <p className="font-semibold truncate">{user?.firstName} {user?.lastName}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}