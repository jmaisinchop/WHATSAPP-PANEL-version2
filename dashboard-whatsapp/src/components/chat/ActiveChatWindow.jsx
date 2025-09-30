import { useEffect, useRef, useState } from 'react';
import { Send, Paperclip, X, File as FileIcon, UserCheck, UserX, Users, Replace, LogOut, MessageSquarePlus, StickyNote, MessageCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useChatStore } from '../../store/chatStore';
import { useAuthStore } from '../../store/authStore';
import apiService from '../../api/apiService';
import MessageBubble from './MessageBubble';
import InternalNoteItem from './InternalNoteItem';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { format, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';
import CustomerProfileSidebar from './CustomerProfileSidebar';
import AssignChatModal from './AssignChatModal';

// --- Sub-componente para la cabecera del chat ---
const ChatHeader = ({ chat, currentUser, onAssignToSelf, onRelease, onReassign, onUnassign, onHeaderClick }) => {
  const isAssigned = !!chat.assignedTo;
  const isAssignedToMe = isAssigned && chat.assignedTo.id === currentUser.id;
  const isAdmin = currentUser.role === 'admin';
  return (
    <div className="flex items-center justify-between border-b p-3 bg-background/90 backdrop-blur-sm sticky top-0 z-10 min-h-[73px]">
      <button className="flex items-center gap-3 text-left hover:bg-muted/50 transition-colors p-2 rounded-lg -m-2" onClick={onHeaderClick}>
        <Avatar className="h-10 w-10"><AvatarFallback>{chat.customerName?.[0] || '#'}</AvatarFallback></Avatar>
        <div>
          <h2 className="font-bold text-lg text-foreground">{chat.customerName || chat.contactNumber}</h2>
          {isAssigned ? (<span className="text-xs font-medium text-green-500">Asignado a: {isAssignedToMe ? 'Ti' : chat.assignedTo.firstName}</span>) : (<span className="text-xs font-medium text-amber-500">Sin asignar</span>)}
        </div>
      </button>
      <div className="flex items-center space-x-2">
        {isAdmin ? (<>{!isAssigned ? (<><Button size="sm" variant="outline" onClick={onAssignToSelf}><UserCheck className="mr-2 h-4 w-4" /> Asignármelo</Button><Button size="sm" onClick={onReassign}><Users className="mr-2 h-4 w-4" /> Asignar a...</Button></>) : (<><Button size="sm" variant="secondary" onClick={onReassign}><Replace className="mr-2 h-4 w-4" /> Reasignar</Button><Button size="sm" variant="outline" onClick={onUnassign}><LogOut className="mr-2 h-4 w-4" /> Quitar Asignación</Button></>)}</>) : (<>{!isAssigned && (<Button size="sm" variant="outline" onClick={onAssignToSelf}><UserCheck className="mr-2 h-4 w-4" /> Asignármelo</Button>)} {isAssignedToMe && (<Button size="sm" variant="destructive" onClick={onRelease}><UserX className="mr-2 h-4 w-4" /> Liberar Chat</Button>)}</>)}
      </div>
    </div>
  );
};

// --- Sub-componente para cuando no hay chat seleccionado ---
const EmptyChatPlaceholder = () => ( <div className="flex h-full flex-1 flex-col items-center justify-center bg-muted/30 p-4 text-center"><MessageSquarePlus className="h-16 w-16 text-muted-foreground/50" /><p className="mt-4 text-lg font-medium text-muted-foreground">Selecciona un chat</p><p className="text-sm text-muted-foreground/80">Elige una conversación de la lista para ver los mensajes y responder.</p></div>);

// --- Sub-componente para la vista previa del archivo ---
const FilePreview = ({ file, onRemove }) => { const isImage = file.type.startsWith('image/'); return (<div className="relative p-2 bg-muted/50 border-b rounded-t-lg"><div className="flex items-center gap-3">{isImage ? (<img src={URL.createObjectURL(file)} alt="Preview" className="h-14 w-14 rounded-md object-cover" />) : (<div className="h-14 w-14 flex items-center justify-center bg-muted rounded-md"><FileIcon className="h-8 w-8 text-muted-foreground" /></div>)}<div className="overflow-hidden"><p className="text-sm font-medium text-foreground truncate">{file.name}</p><p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(2)} KB</p></div></div><Button variant="ghost" size="icon" className="absolute top-1 right-1 h-7 w-7 rounded-full" onClick={onRemove}><X className="h-4 w-4" /></Button></div>);};


// =================================================================================
// --- Componente Principal ---
// =================================================================================
export default function ActiveChatWindow() {
  const { activeChat, addOptimisticMessage, assignChatToSelf, releaseChat, unassignChat, addInternalNote, addOptimisticNote } = useChatStore();
  const currentUser = useAuthStore((state) => state.user);
  
  const [newMessage, setNewMessage] = useState('');
  const [newNote, setNewNote] = useState('');
  const [stagedFile, setStagedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isAssignModalOpen, setAssignModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('messages');

  const fileInputRef = useRef(null);
  const messagesScrollRef = useRef(null);
  const notesScrollRef = useRef(null);

  useEffect(() => {
    if (messagesScrollRef.current) {
      const viewport = messagesScrollRef.current.querySelector('div[data-radix-scroll-area-viewport]');
      if (viewport) viewport.scrollTop = viewport.scrollHeight;
    }
  }, [activeChat?.messages]);

  useEffect(() => {
    if (notesScrollRef.current) {
      const viewport = notesScrollRef.current.querySelector('div[data-radix-scroll-area-viewport]');
      if (viewport) viewport.scrollTop = viewport.scrollHeight;
    }
  }, [activeChat?.notes]);

  const handleSaveNote = async (e) => {
    e.preventDefault();
    if (!newNote.trim()) return;
    
    // ✅ 1. Genera un timestamp válido
    const timestamp = new Date().toISOString();
    
    // ✅ 2. Pasa el timestamp a la acción optimista para evitar el error
    addOptimisticNote(activeChat.id, newNote, currentUser, timestamp);
    
    const contentToSave = newNote;
    setNewNote('');

    // ✅ 3. Pasa el timestamp al backend
    const result = await addInternalNote(activeChat.id, contentToSave, timestamp);
    
    if (!result.success) {
      toast.error('La nota no se pudo guardar.');
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() && !stagedFile) return;

    const timestamp = new Date().toISOString();

    if (stagedFile) {
      // (La lógica de archivos usa el timestamp del backend por simplicidad, pero se podría adaptar)
      setIsUploading(true);
      const loadingToast = toast.loading('Enviando archivo...');
      const formData = new FormData();
      formData.append('file', stagedFile);
      formData.append('caption', newMessage);
      try {
          await apiService.post(`/chats/${activeChat.id}/media`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
          toast.dismiss(loadingToast);
      } catch (error) {
          toast.dismiss(loadingToast);
          toast.error(error.response?.data?.message || 'No se pudo enviar el archivo.');
      } finally {
          setIsUploading(false);
          setStagedFile(null);
          setNewMessage('');
      }
    } else {
      // ✅ 2. Pasa el timestamp a la acción optimista
      addOptimisticMessage(activeChat.id, newMessage, currentUser, timestamp);
      const content = newMessage;
      setNewMessage('');
      try {
        // ✅ 3. Pasa el timestamp al backend
        await apiService.post(`/chats/${activeChat.id}/message`, { content, timestamp });
      } catch (error) {
        toast.error('No se pudo enviar el mensaje.');
      }
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
        setStagedFile(file);
    }
    e.target.value = '';
  };

  if (!activeChat) {
    return <EmptyChatPlaceholder />;
  }

  return (
    <div className="flex h-full flex-1 flex-col bg-background relative">
      <ChatHeader 
        chat={activeChat} 
        currentUser={currentUser} 
        onAssignToSelf={() => assignChatToSelf(activeChat.id)}
        onRelease={() => releaseChat(activeChat.id)}
        onReassign={() => setAssignModalOpen(true)}
        onUnassign={() => unassignChat(activeChat.id)}
        onHeaderClick={() => setIsProfileOpen(true)}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="mx-3 mt-2 shrink-0">
            <TabsTrigger value="messages" className="flex-1">
              <MessageCircle className="mr-2 h-4 w-4" />
              Mensajes ({activeChat.messages?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="notes" className="flex-1">
              <StickyNote className="mr-2 h-4 w-4" />
              Notas Internas ({activeChat.notes?.length || 0})
            </TabsTrigger>
          </TabsList>
          <TabsContent value="messages" className="flex-1 overflow-y-auto bg-muted/20">
            <ScrollArea className="h-full" ref={messagesScrollRef}>
              <div className="p-4 md:p-6 space-y-2">
                {activeChat.messages.map((msg, index) => {
                  const prevMsg = activeChat.messages[index - 1];
                  const showDateDivider = !prevMsg || !isSameDay(new Date(msg.timestamp), new Date(prevMsg.timestamp));
                  return (
                    <div key={msg.id || `optimistic-${index}`}>
                      {showDateDivider && (
                        <div className="flex items-center justify-center my-4">
                          <span className="text-xs text-muted-foreground bg-background px-3 py-1 rounded-full border">
                            {format(new Date(msg.timestamp), "eeee, d 'de' MMMM", { locale: es })}
                          </span>
                        </div>
                      )}
                      <MessageBubble message={msg} />
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </TabsContent>
          <TabsContent value="notes" className="flex-1 overflow-y-auto bg-muted/20">
            <ScrollArea className="h-full" ref={notesScrollRef}>
              <div className="p-4 md:p-6">
                {activeChat.notes && activeChat.notes.length > 0 ? (
                  activeChat.notes.map(note => <InternalNoteItem key={note.id} note={note} />)
                ) : (
                  <div className="text-center text-sm text-muted-foreground py-10">
                    No hay notas internas en este chat.
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
        <div className="border-t bg-background p-4 shrink-0">
          {activeTab === 'messages' ? (
            <>
              {stagedFile && <FilePreview file={stagedFile} onRemove={() => setStagedFile(null)} />}
              <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
              <form onSubmit={handleSend} className="relative flex items-center gap-2 pt-2">
                <Button type="button" variant="ghost" size="icon" className="flex-shrink-0" onClick={() => fileInputRef.current.click()} disabled={isUploading}><Paperclip className="h-5 w-5 text-muted-foreground" /></Button>
                <Input value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder={stagedFile ? "Añade un comentario..." : "Escribe un mensaje..."} className="flex-1 h-11 rounded-full" disabled={isUploading}/>
                <Button type="submit" size="icon" className="w-9 h-9 rounded-full flex-shrink-0" disabled={(!newMessage.trim() && !stagedFile) || isUploading}><Send className="h-5 w-5" /></Button>
              </form>
            </>
          ) : (
            <form onSubmit={handleSaveNote} className="space-y-3">
              <label htmlFor="internal-note" className="font-semibold text-sm">Añadir Nueva Nota Interna</label>
              <Textarea id="internal-note" placeholder="Escribe un comentario visible solo para tu equipo..." value={newNote} onChange={(e) => setNewNote(e.target.value)} className="min-h-[80px]"/>
              <div className="flex justify-end">
                <Button type="submit" disabled={!newNote.trim()}><StickyNote className="mr-2 h-4 w-4" />Guardar Nota</Button>
              </div>
            </form>
          )}
        </div>
      </div>
      <AssignChatModal isOpen={isAssignModalOpen} onClose={() => setAssignModalOpen(false)} chatId={activeChat.id} />
      {isProfileOpen && (<CustomerProfileSidebar contactId={activeChat.contactNumber} onClose={() => setIsProfileOpen(false)}/>)}
    </div>
  );
}