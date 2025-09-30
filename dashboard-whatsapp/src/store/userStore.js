import { create } from 'zustand';
import apiService from '../api/apiService';
import toast from 'react-hot-toast';

export const useUserStore = create((set, get) => ({
  users: [],
  deactivatedUsers: [],
  agentList: [], // ✅ 1. AÑADIR NUEVO ESTADO PARA LA LISTA DE AGENTES
  loading: false,
  // --- ESTADOS PARA PAGINACIÓN Y BÚSQUEDA ---
  page: 1,
  limit: 10,
  totalPages: 1,
  totalUsers: 0,
  searchTerm: '',

  // --- ACCIÓN PARA OBTENER USUARIOS ACTIVOS ---
  fetchUsers: async () => {
    set({ loading: true });
    const { page, limit, searchTerm } = get();
    try {
      const response = await apiService.get(`/users?page=${page}&limit=${limit}&search=${searchTerm}`);
      set({
        users: response.data.data,
        totalPages: response.data.totalPages,
        totalUsers: response.data.total,
        page: response.data.page,
        loading: false,
      });
    } catch (error) {
      toast.error('No se pudo cargar la lista de usuarios.');
      set({ loading: false });
    }
  },

  // --- ACCIÓN PARA OBTENER USUARIOS DESACTIVADOS ---
  fetchDeactivatedUsers: async () => {
    try {
      const response = await apiService.get('/users/deactivated');
      set({ deactivatedUsers: response.data });
    } catch (error) {
      toast.error('No se pudo cargar la lista de usuarios desactivados.');
    }
  },

  // ✅ 2. AÑADIR NUEVA ACCIÓN PARA OBTENER LA LISTA SIMPLE DE AGENTES
  fetchAgentList: async () => {
    try {
      const response = await apiService.get('/users/list/agents');
      set({ agentList: response.data });
    } catch (error) {
      toast.error("No se pudo cargar la lista de agentes.");
    }
  },

  // --- ACCIONES PARA PAGINACIÓN Y BÚSQUEDA ---
  setPage: (newPage) => {
    if (newPage > 0 && newPage <= get().totalPages) {
      set({ page: newPage });
      get().fetchUsers();
    }
  },

  setSearchTerm: (term) => {
    set({ searchTerm: term, page: 1 });
    get().fetchUsers();
  },

  // --- ACCIONES CRUD ---
  createUser: async (userData) => {
    try {
      await apiService.post('/users/register', userData);
      toast.success('¡Usuario creado exitosamente!');
      get().fetchUsers();
      return { success: true };
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al crear el usuario.');
      return { success: false };
    }
  },

  updateUser: async (userId, userData) => {
    try {
      await apiService.patch(`/users/${userId}`, userData);
      toast.success('¡Usuario actualizado exitosamente!');
      get().fetchUsers();
      return { success: true };
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al actualizar el usuario.');
      return { success: false };
    }
  },

  deleteUser: async (userId) => {
    try {
      await apiService.delete(`/users/${userId}`);
      toast.success('Usuario desactivado.');
      get().fetchUsers();
      get().fetchDeactivatedUsers();
      return { success: true };
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al desactivar el usuario.');
      return { success: false };
    }
  },

  restoreUser: async (userId) => {
    const toastId = toast.loading('Reactivando usuario...');
    try {
      await apiService.post(`/users/${userId}/restore`);
      toast.success('¡Usuario reactivado exitosamente!', { id: toastId });
      get().fetchUsers();
      get().fetchDeactivatedUsers();
      return { success: true };
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al reactivar.', { id: toastId });
      return { success: false };
    }
  },
}));