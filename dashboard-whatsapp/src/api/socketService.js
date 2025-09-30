// src/api/socketService.js

import { io } from 'socket.io-client';
import { useAuthStore } from '../store/authStore';

/**
 * Clase Singleton para gestionar la conexión WebSocket en toda la aplicación.
 */
class SocketService {
  socket = null;

  /**
   * Establece o restablece la conexión con el servidor de WebSockets.
   * Envía el token de autenticación del usuario para que el backend
   * pueda registrar qué agente se ha conectado.
   */
  connect() {
    // Si ya estamos conectados, no hacemos nada.
    if (this.socket?.connected) {
      return;
    }

    // Obtenemos el token de autenticación del store de Zustand.
    const token = useAuthStore.getState().token;

    // Si no hay token (el usuario no está logueado), no intentamos conectar.
    if (!token) {
      console.warn('SocketService: No hay token, no se puede conectar al socket.');
      return;
    }

    // Si el socket no ha sido creado, lo inicializamos.
    if (!this.socket) {
      this.socket = io(import.meta.env.VITE_API_URL, { // URL de tu backend NestJS
        // Opción clave: pasamos el token en el handshake de la conexión.
        auth: {
          token: token,
        },
      });

      // Definimos los listeners básicos una sola vez.
      this.socket.on('connect', () =>
        console.log('🔌 Conexión con Sockets ESTABLECIDA. ID:', this.socket.id)
      );
      this.socket.on('disconnect', () =>
        console.log('🔌 Conexión con Sockets PERDIDA.')
      );

      this.registerEventListeners();
    } else {
      // Si el socket ya existe pero está desconectado,
      // actualizamos el token (por si el usuario ha vuelto a iniciar sesión) y reconectamos.
      this.socket.auth.token = token;
      this.socket.connect();
    }
  }

  /**
   * Desconecta el socket del servidor.
   */
  disconnect() {
    if (this.socket?.connected) {
      this.socket.disconnect();
    }
  }

  /**
   * Registra los listeners de eventos del servidor.
   * Escucha los eventos y los re-despacha como CustomEvents en el objeto `window`,
   * permitiendo que cualquier parte de la aplicación pueda escucharlos.
   */
  registerEventListeners() {
    // Eventos públicos (para actualizar la UI de todos)
    this.socket.on('newMessage', (payload) =>
      window.dispatchEvent(new CustomEvent('socket:newMessage', { detail: payload }))
    );
    this.socket.on('newChat', (payload) =>
      window.dispatchEvent(new CustomEvent('socket:newChat', { detail: payload }))
    );
    this.socket.on('assignedChat', (payload) =>
      window.dispatchEvent(new CustomEvent('socket:assignedChat', { detail: payload }))
    );
    this.socket.on('releasedChat', (payload) =>
      window.dispatchEvent(new CustomEvent('socket:releasedChat', { detail: payload }))
    );

    // Evento privado (solo para el agente asignado)
    this.socket.on('assignment-notification', (payload) =>
      window.dispatchEvent(new CustomEvent('socket:assignment-notification', { detail: payload }))
    );
  }
}

// Exportamos una única instancia de la clase para ser usada en toda la app.
export const socketService = new SocketService();