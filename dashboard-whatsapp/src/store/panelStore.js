import { create } from 'zustand';
import apiService from '../api/apiService';

export const usePanelStore = create((set) => ({
  botProfilePicUrl: null,
  fetchBotProfile: async () => {
    try {
      const response = await apiService.get('/admin/bot-profile');
      set({ botProfilePicUrl: response.data.profilePicUrl });
    } catch (error) {
      console.error('No se pudo obtener la foto de perfil del bot:', error);
      set({ botProfilePicUrl: null });
    }
  },
}));