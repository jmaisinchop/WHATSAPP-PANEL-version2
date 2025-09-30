import { create } from 'zustand';
import apiService from '../api/apiService';
import toast from 'react-hot-toast';

export const useChatStore = create((set, get) => ({
  chats: [],
  activeChat: null,
  loading: false,

  fetchChats: async () => {
    try {
      const response = await apiService.get('/chats');
      set({ chats: response.data });
    } catch (error) {
      console.error("Error al obtener los chats:", error);
      toast.error("No se pudo actualizar la lista de chats.");
    }
  },

  fetchChatById: async (chatId) => {
    const currentState = get();
    const chatInList = currentState.chats.find(c => c.id === chatId);
    if (currentState.activeChat?.id === chatId && chatInList?.unreadCount === 0) {
      return;
    }
    set({ loading: true, activeChat: null });
    try {
      await apiService.patch(`/chats/${chatId}/read`);
      set(state => ({
        chats: state.chats.map(chat =>
          chat.id === chatId ? { ...chat, unreadCount: 0 } : chat
        )
      }));
      const response = await apiService.get(`/chats/${chatId}`);
      set({ activeChat: response.data, loading: false });
    } catch (error) {
      set({ loading: false });
      console.error(`Error al obtener el chat ${chatId}:`, error);
      get().fetchChats();
    }
  },

  addOptimisticMessage: (chatId, messageContent, user, timestamp) => {
    const tempMessage = {
      id: `optimistic-${Date.now()}`,
      content: messageContent,
      sender: 'AGENT',
      senderId: user.id,
      senderName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || `Agente (${user.email})`,
      timestamp: timestamp, // Usa el timestamp que recibe
      isOptimistic: true,
    };
    set((state) => ({
      activeChat: state.activeChat?.id === chatId
        ? { ...state.activeChat, messages: [...state.activeChat.messages, tempMessage] }
        : state.activeChat,
    }));
  },


  addMessageToActiveChat: (payload) => {
    const { chatId, message } = payload;
    set(state => {
      const newChats = state.chats.map(chat =>
        chat.id === chatId ? { ...chat, updatedAt: message.timestamp } : chat
      ).sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

      if (state.activeChat?.id !== chatId) {
        return { chats: newChats };
      }
      const nonOptimisticMessages = state.activeChat.messages.filter(m => !m.isOptimistic);
      const messageExists = nonOptimisticMessages.some(m => m.id === message.id);
      if (!messageExists) {
        nonOptimisticMessages.push(message);
      }
      const newActiveChat = { ...state.activeChat, messages: nonOptimisticMessages };
      return { chats: newChats, activeChat: newActiveChat };
    });
  },

  addNewChatToList: (newChat) => {
    set((state) => {
      const chatExists = state.chats.some(c => c.id === newChat.id);
      if (chatExists) { return {}; }
      const chatWithCounter = { ...newChat, unreadCount: 0 };
      const newChats = [chatWithCounter, ...state.chats];
      return { chats: newChats.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)) };
    });
  },

  updateSingleChat: (updatedChat) => {
    set(state => {
      const newChats = state.chats.map(c =>
        c.id === updatedChat.id ? updatedChat : c
      ).sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
      const newActiveChat = state.activeChat?.id === updatedChat.id
        ? { ...state.activeChat, ...updatedChat }
        : state.activeChat;
      return {
        chats: newChats,
        activeChat: newActiveChat
      };
    });
  },

  assignChatToAgent: async (chatId, agentId) => {
    const toastId = toast.loading('Asignando chat...');
    try {
      await apiService.patch(`/chats/${chatId}/assign`, { agentId });
      toast.success('Chat asignado correctamente.', { id: toastId });
      return { success: true };
    } catch (error) {
      toast.error(error.response?.data?.message || 'No se pudo asignar el chat.', { id: toastId });
      return { success: false };
    }
  },

  assignChatToSelf: async (chatId) => {
    try {
      await apiService.patch(`/chats/${chatId}/assign`, {});
      toast.success('Chat asignado a ti');
    } catch (error) {
      toast.error(error.response?.data?.message || 'No se pudo asignar el chat');
    }
  },

  releaseChat: async (chatId) => {
    try {
      await apiService.patch(`/chats/${chatId}/release`);
      toast.success('Chat liberado');
    } catch (error) {
      toast.error(error.response?.data?.message || 'No se pudo liberar el chat');
    }
  },

  unassignChat: async (chatId) => {
    const toastId = toast.loading('Quitando asignación...');
    try {
      await apiService.patch(`/chats/${chatId}/unassign`);
      toast.success('Asignación quitada.', { id: toastId });
      return { success: true };
    } catch (error) {
      toast.error(error.response?.data?.message || 'No se pudo quitar la asignación.', { id: toastId });
      return { success: false };
    }
  },

  addInternalNote: async (chatId, content, timestamp) => {
    try {
      await apiService.post(`/chats/${chatId}/notes`, { content, timestamp });
      return { success: true };
    } catch (error) {
      toast.error(error.response?.data?.message || 'No se pudo guardar la nota.');
      return { success: false };
    }
  },

  addOptimisticNote: (chatId, content, author, timestamp) => {
    const tempNote = {
      id: `optimistic-${Date.now()}`,
      content: content,
      author: author,
      createdAt: timestamp,
      isOptimistic: true,
    };
    set(state => {
      if (state.activeChat?.id === chatId) {
        const newNotes = state.activeChat.notes ? [...state.activeChat.notes, tempNote] : [tempNote];
        return {
          activeChat: { ...state.activeChat, notes: newNotes }
        };
      }
      return state;
    });
  },

  addRealtimeNoteToChat: (payload) => {
    const { chatId, note } = payload;
    set(state => {
      if (state.activeChat?.id === chatId) {
        const nonOptimisticNotes = state.activeChat.notes?.filter(n => !n.isOptimistic) || [];
        const noteExists = nonOptimisticNotes.some(n => n.id === note.id);
        if (!noteExists) {
          nonOptimisticNotes.push(note);
        }
        const newActiveChat = {
          ...state.activeChat,
          notes: nonOptimisticNotes.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)),
        };
        return { activeChat: newActiveChat };
      }
      return state;
    });
  },
}));