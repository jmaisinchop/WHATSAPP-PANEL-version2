// src/store/presenceStore.js
import { create } from 'zustand';
import apiService from '../api/apiService';

export const usePresenceStore = create((set) => ({
  connectedAgents: [],
  loading: false,

  // Acción para obtener la lista inicial de agentes
  fetchConnectedAgents: async () => {
    set({ loading: true });
    try {
      const response = await apiService.get('/admin/connected-agents');
      set({ connectedAgents: response.data, loading: false });
    } catch (error) {
      console.error("Error al obtener agentes conectados:", error);
      set({ loading: false });
    }
  },

  // Acción para actualizar la lista desde un evento de socket
  updateConnectedAgents: (agentList) => {
    set({ connectedAgents: agentList });
  },
}));