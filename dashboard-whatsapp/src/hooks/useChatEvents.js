import { useEffect } from 'react';
import toast from 'react-hot-toast';
import { useChatStore } from '../store/chatStore';
import { useAuthStore } from '../store/authStore';
import { useNotificationStore } from '../store/notificationStore';
import { usePresenceStore } from '../store/presenceStore';
import { useDashboardStore } from '../store/dashboardStore';
import { notificationService } from '../lib/notificationService';

export const useChatEvents = (socket) => {
  const {
    activeChat,
    addMessageToActiveChat,
    fetchChats,
    updateSingleChat, // La función clave
    addRealtimeNoteToChat,
  } = useChatStore();

  const { addNotification } = useNotificationStore();
  const { updateConnectedAgents } = usePresenceStore();
  const { fetchSurveyStats } = useDashboardStore();
  const currentUser = useAuthStore((state) => state.user);

  useEffect(() => {
    if (!socket) return;

    // --- HANDLERS PARA CADA EVENTO ---

    const handleNewMessage = (payload) => {
      const { chatId, message } = payload;
      if (message.sender === 'CUSTOMER') {
        fetchChats();
        if (chatId !== activeChat?.id) {
          notificationService.showNotification(
            `Nuevo mensaje de: ${message.senderName}`,
            { body: message.content, icon: '/kika.png' }
          );
        } else {
          notificationService.playSound();
        }
      }
      addMessageToActiveChat(payload);
    };

    // ✅ MANEJADOR PARA EVENTOS DE ASIGNACIÓN/LIBERACIÓN
    const handleChatUpdate = (updatedChat) => {
      console.log('📢 Evento de actualización de chat recibido, actualizando UI:', updatedChat);
      updateSingleChat(updatedChat);
    };

    const handleNewChat = () => {
      fetchChats();
    };

    const handlePrivateAssignment = (chat) => {
      const message = `Se le asignó el chat de: ${chat.customerName || chat.contactNumber}`;
      toast.success(message, { duration: 6000, position: 'top-center', icon: '🔔' });
      addNotification({ id: Date.now(), type: 'ASSIGNMENT', message });
    };

    const handlePresenceUpdate = (agentList) => { updateConnectedAgents(agentList); };
    const handleDashboardUpdate = () => { fetchSurveyStats(); toast('¡El dashboard se ha actualizado!', { icon: '📊' }); };

    const handleNewInternalNote = (payload) => {
      addRealtimeNoteToChat(payload);
      fetchChats();
    };

    // --- SUSCRIPCIÓN A LOS EVENTOS ---
    socket.on('newMessage', handleNewMessage);
    socket.on('newChat', handleNewChat);
    socket.on('assignedChat', handleChatUpdate);
    socket.on('releasedChat', handleChatUpdate);
    socket.on('assignment-notification', handlePrivateAssignment);
    socket.on('presenceUpdate', handlePresenceUpdate);
    socket.on('dashboard:surveyUpdate', handleDashboardUpdate);
    socket.on('chat:newInternalNote', handleNewInternalNote);

    // --- LIMPIEZA ---
    return () => {
      socket.off('newMessage', handleNewMessage);
      socket.off('newChat', handleNewChat);
      socket.off('assignedChat', handleChatUpdate);
      socket.off('releasedChat', handleChatUpdate);
      socket.off('assignment-notification', handlePrivateAssignment);
      socket.off('presenceUpdate', handlePresenceUpdate);
      socket.off('dashboard:surveyUpdate', handleDashboardUpdate);
      socket.off('chat:newInternalNote', handleNewInternalNote);
    };

  }, [
    activeChat,
    fetchChats,
    updateSingleChat,
    socket,
    addMessageToActiveChat,
    addNotification,
    updateConnectedAgents,
    currentUser,
    fetchSurveyStats,
    addRealtimeNoteToChat,
  ]);
};