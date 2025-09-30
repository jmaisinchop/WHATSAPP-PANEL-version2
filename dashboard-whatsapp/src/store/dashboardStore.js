import { create } from 'zustand';
import apiService from '../api/apiService';
import toast from 'react-hot-toast';

export const useDashboardStore = create((set) => ({
  stats: null,
  loading: false,

  fetchSurveyStats: async () => {
    set({ loading: true });
    try {
      const response = await apiService.get('/dashboard/survey-analytics');
      set({ stats: response.data, loading: false });
    } catch (error) {
      toast.error('No se pudieron cargar las estadísticas del dashboard.');
      console.error("Error fetching dashboard stats:", error);
      set({ loading: false });
    }
  },
}));