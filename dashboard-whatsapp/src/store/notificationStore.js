import { create } from 'zustand';

export const useNotificationStore = create((set) => ({
  notifications: [],
  unreadCount: 0,

  addNotification: (notification) => {
    set((state) => ({
      // Añadimos la nueva notificación al principio de la lista
      notifications: [notification, ...state.notifications],
      unreadCount: state.unreadCount + 1,
    }));
  },

  markAllAsRead: () => {
    set((state) => ({
      // Marcamos todas como leídas (puedes añadir una propiedad 'read' si quieres más complejidad)
      unreadCount: 0,
    }));
  },
  
  clearNotifications: () => set({ notifications: [], unreadCount: 0 }),
}));