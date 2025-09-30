import axios from 'axios';
import { useAuthStore } from '../store/authStore';

const apiService = axios.create({
  baseURL: import.meta.env.VITE_API_UR, // La URL de tu backend NestJS
});

// ======================================================
// Interceptor 1: ANTES de cada petición (Request)
// (Este es el que ya tienes y está perfecto)
// ======================================================
apiService.interceptors.request.use(
  (config) => {
    // Obtenemos el token de nuestro store de Zustand
    const token = useAuthStore.getState().token;
    if (token) {
      // Si existe un token, lo añadimos a la cabecera de autorización
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// ======================================================
// ✅ Interceptor 2: DESPUÉS de cada respuesta (Response)
// (Esta es la parte nueva que maneja el token expirado)
// ======================================================
apiService.interceptors.response.use(
  // Si la respuesta es exitosa (código 2xx), no hacemos nada, solo la pasamos.
  (response) => response,

  // Si la respuesta del backend es un error...
  (error) => {
    // Verificamos si el error es un 401 Unauthorized.
    if (error.response && error.response.status === 401) {
      console.warn('Token expirado o inválido. Cerrando sesión automáticamente...');

      // Obtenemos la función de logout de nuestro store de Zustand.
      const { logout } = useAuthStore.getState();
      
      // Ejecutamos el logout para limpiar el token y los datos del usuario.
      logout();

      // Redirigimos al usuario a la página de login.
      // Usamos .replace() para que no pueda volver atrás en el historial del navegador.
      window.location.replace('/login');
    }

    // Devolvemos el error para que cualquier otra parte del código pueda manejarlo si es necesario.
    return Promise.reject(error);
  }
);

export default apiService;