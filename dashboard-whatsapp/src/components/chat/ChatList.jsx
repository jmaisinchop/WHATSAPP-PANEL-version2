import { useState } from 'react';
import { useChatStore } from '../../store/chatStore';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { format, isToday, isYesterday } from 'date-fns';
import { es } from 'date-fns/locale';
import { Badge } from "@/components/ui/badge"; // ✅ 1. Importar el componente Badge

const formatTimestamp = (date) => {
  const d = new Date(date);
  if (isToday(d)) return format(d, 'HH:mm');
  if (isYesterday(d)) return 'Ayer';
  return format(d, 'dd/MM/yy');
};

const ChatListItem = ({ chat, onClick, isActive }) => {
  // Guardián para evitar errores si un chat es inválido
  if (!chat) {
    return null;
  }

  const fallback = chat.customerName?.[0] || chat.contactNumber?.[0] || '#';

  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-4 p-3 w-full text-left transition-colors duration-150 ease-in-out border-b ${isActive
        ? 'bg-primary/10 border-l-4 border-primary'
        : 'hover:bg-muted/50 border-l-4 border-transparent'
        }`}
    >
      <Avatar className="h-10 w-10">
        <AvatarFallback>{fallback.toUpperCase()}</AvatarFallback>
      </Avatar>
      <div className="flex-1 overflow-hidden">
        <div className="flex justify-between items-center mb-1">
          <p className="font-semibold truncate text-foreground">{chat.customerName || chat.contactNumber}</p>
          <time className="text-xs text-muted-foreground whitespace-nowrap">{formatTimestamp(chat.updatedAt)}</time>
        </div>
        <div className="flex justify-between items-center">
          <p className="text-sm text-muted-foreground truncate">
            {chat.assignedTo ? `Asignado a: ${chat.assignedTo.firstName || 'Agente'}` : 'Sin asignar'}
          </p>

          {/* ✅ 2. LÓGICA PARA MOSTRAR EL CONTADOR DE MENSAJES NO LEÍDOS */}
          {chat.unreadCount > 0 && (
            <Badge className="h-5 min-w-[1.25rem] px-1.5 flex items-center justify-center bg-green-500 text-white hover:bg-green-600">
              {chat.unreadCount}
            </Badge>
          )}
        </div>
      </div>
    </button>
  );
};

export default function ChatList() {
  const { chats, fetchChatById, activeChat } = useChatStore();
  const [searchTerm, setSearchTerm] = useState('');

  const filteredChats = chats.filter(chat =>
    chat &&
    ((chat.customerName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      chat.contactNumber.includes(searchTerm))
  );

  return (
    <div className="hidden lg:flex h-full w-80 xl:w-96 flex-col border-r bg-background">
      <div className="p-4 border-b space-y-3">
        <h2 className="text-xl font-bold">Conversaciones</h2>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por nombre o número..." className="pl-9 h-9" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
      </div>
      <ScrollArea className="flex-1">
        {filteredChats.length > 0 ? (
          filteredChats.map(chat => (<ChatListItem key={chat?.id || Math.random()} chat={chat} isActive={activeChat?.id === chat?.id} onClick={() => fetchChatById(chat.id)} />))
        ) : (<div className="p-4 text-center text-sm text-muted-foreground mt-4">No se encontraron conversaciones.</div>)}
      </ScrollArea>
    </div>
  );
}