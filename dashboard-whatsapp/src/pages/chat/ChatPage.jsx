import ChatList from '../../components/chat/ChatList';
import ActiveChatWindow from '../../components/chat/ActiveChatWindow';

export default function ChatPage() {
  // ✅ SE ELIMINÓ EL useEffect QUE LLAMABA A fetchChats().
  // La carga de datos ahora es global, haciendo este componente más simple y eficiente.

  return (
    <div className="flex h-[calc(100vh-4rem)] w-full bg-card text-card-foreground shadow-xl rounded-lg overflow-hidden border">
      <ChatList />
      <ActiveChatWindow />
    </div>
  );
}