import { useEffect, useRef } from 'react';
import { Outlet } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { socketService } from '../api/socketService';
import { useChatEvents } from '../hooks/useChatEvents';
import { usePanelStore } from '../store/panelStore';
import { useChatStore } from '../store/chatStore'; // ✅ 1. IMPORTAR chatStore
import { notificationService } from '../lib/notificationService';

export default function DashboardLayout() {
  const fetchBotProfile = usePanelStore((state) => state.fetchBotProfile);
  const fetchChats = useChatStore((state) => state.fetchChats); // ✅ 2. OBTENER LA ACCIÓN fetchChats

  const { socket } = socketService;

  // Hook que activa todos los listeners de eventos de Socket.IO
  useChatEvents(socket);

  const initialLoadDone = useRef(false);

  useEffect(() => {
    // Usamos useRef para asegurarnos de que esta lógica se ejecute una sola vez
    if (!initialLoadDone.current) {
      // 1. Conectar al servidor de WebSockets
      socketService.connect();

      // 2. Obtener la información del perfil del bot
      fetchBotProfile();

      // 3. Solicitar permiso para notificaciones
      notificationService.requestPermission();

      // ✅ 4. CARGAMOS LA LISTA DE CHATS DE FORMA GLOBAL AL INICIAR
      fetchChats();

      initialLoadDone.current = true;
    }
  }, [fetchBotProfile, fetchChats]); // ✅ 5. AÑADIR fetchChats a las dependencias

  return (
    <div className="flex h-screen bg-muted/40">
      <Toaster position="top-right" />
      <Sidebar />
      <div className="flex flex-col flex-1">
        <Header />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}