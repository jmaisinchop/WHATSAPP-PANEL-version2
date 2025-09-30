import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import apiService from '../api/apiService';
import { socketService } from '../api/socketService'; // ✅ 1. IMPORTA EL SERVICIO DE SOCKET

export const useAuthStore = create(
  persist(
    (set) => ({
      token: null,
      user: null,
      isAuthenticated: false,

      // Acción para iniciar sesión (sin cambios)
      login: async (email, password) => {
        try {
          const response = await apiService.post('/auth/login', { email, password });
          const { access_token } = response.data;
          const userPayload = JSON.parse(atob(access_token.split('.')[1]));

          set({
            token: access_token,
            user: {
              id: parseInt(userPayload.sub, 10),
              email: userPayload.email,
              role: userPayload.role,
              firstName: userPayload.firstName,
              lastName: userPayload.lastName
            },
            isAuthenticated: true
          });
          
          // Después de un login exitoso, conectamos el socket
          socketService.connect();

          return { success: true };
        } catch (error) {
          console.error("Error en el login:", error.response?.data?.message || error.message);
          set({ isAuthenticated: false, token: null, user: null });
          return { success: false, message: error.response?.data?.message || 'Error al iniciar sesión' };
        }
      },

      // ✅ ACCIÓN DE LOGOUT CORREGIDA
      logout: () => {
        // 1. Desconectamos el socket.
        socketService.disconnect();
        
        // 2. Limpiamos el estado de autenticación.
        set({ token: null, user: null, isAuthenticated: false });

        // Opcional: limpiar también otros stores si es necesario
        // useChatStore.getState().reset();
      },
    }),
    {
      name: 'auth-storage',
    }
  )
);