import { useAuthStore } from "../../store/authStore";
import { Bot, Info, User, File as FileIcon } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const formatTime = (timestamp) => new Date(timestamp).toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' });
const apiUrl = import.meta.env.VITE_API_URL;

export default function MessageBubble({ message }) {
  const currentUser = useAuthStore((state) => state.user);
  
  const isSystemMessage = message.sender === 'SYSTEM';
  const isAgentMessage = message.sender === 'AGENT';
  const isOwnMessage = isAgentMessage && message.senderId === currentUser?.id;
  const isBotMessage = message.sender === 'BOT';
  const isCustomerMessage = message.sender === 'CUSTOMER';

  if (isSystemMessage) {
    return (
      <div className="flex items-center justify-center gap-2 my-3 text-center text-xs text-muted-foreground">
        <Info size={14} /><span>{message.content}</span>
      </div>
    );
  }

  const senderName = isOwnMessage ? 'Tú' : (message.senderName || 'Desconocido');
  const fallback = senderName[0] || '#';
  const avatar = isBotMessage ? <Bot size={18}/> : (isCustomerMessage ? <User size={18} /> : fallback.toUpperCase());

  const isImage = message.mimeType?.startsWith('image/');
  const isFile = !!message.mediaUrl && !isImage;
  
  return (
    <div className={`flex w-full my-1 gap-3 items-end ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
      {!isOwnMessage && (<Avatar className="h-8 w-8 self-end"><AvatarFallback className="bg-muted text-muted-foreground">{avatar}</AvatarFallback></Avatar>)}

      <div className={`flex flex-col max-w-sm md:max-w-lg rounded-xl px-3.5 py-2.5 ${isOwnMessage ? 'bg-primary text-primary-foreground rounded-br-none' : 'bg-card border rounded-bl-none'}`}>
        {!isOwnMessage && <span className="text-xs font-bold mb-1 text-primary">{senderName}</span>}

        {isImage && (<img src={`${apiUrl}${message.mediaUrl}`} alt="Imagen adjunta" className="rounded-md my-1 max-w-xs cursor-pointer" onClick={() => window.open(`${apiUrl}${message.mediaUrl}`, '_blank')} />)}

        {isFile && (<a href={`${apiUrl}${message.mediaUrl}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 bg-muted/50 p-2 rounded-md my-1 hover:bg-muted"><FileIcon className="h-6 w-6 text-primary" /><span className="text-sm text-foreground truncate">{message.content}</span></a>)}

        {(message.content && (!isFile || isImage)) && <p className="text-sm break-words whitespace-pre-wrap">{message.content}</p>}

        <span className="text-xs self-end mt-1.5 opacity-70">{formatTime(message.timestamp)}</span>
      </div>
    </div>
  );
}