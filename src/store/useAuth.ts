import { create } from "zustand";
import { authService, LoginCredentials } from "../services/authService";

interface UserPerfil {
  nombres?: string;
  apellidos?: string;
  foto_perfil?: string | null;
}

interface User {
  id: number;
  username: string;
  name: string;
  email: string;
  role: "admin" | "employee";
  roles: string[];
  perfil: UserPerfil | null;
}

interface AuthState {
  user: User | null;
  role: "admin" | "employee" | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
  setRole: (role: "admin" | "employee") => void;
  initAuth: () => void;
  hasRole: (role: string) => boolean;
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  role: null,
  token: null,
  isLoading: false,
  error: null,

  // Iniciar sesión con credenciales reales
  login: async (credentials: LoginCredentials) => {
    set({ isLoading: true, error: null });
    try {
      const response = await authService.login(credentials);
      set({
        user: response.user,
        role: response.user.role,
        token: response.token,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Error al iniciar sesión";
      set({
        user: null,
        role: null,
        token: null,
        isLoading: false,
        error: errorMessage,
      });
      throw error;
    }
  },

  // Cerrar sesión
  logout: () => {
    authService.logout();
    set({
      user: null,
      role: null,
      token: null,
      error: null,
    });
  },

  // Mantener compatibilidad con el método anterior (para desarrollo)
  setRole: (role) => set({ role }),

  // Inicializar autenticación desde localStorage
  initAuth: () => {
    const user = authService.getUser();
    const token = authService.getToken();
    if (user && token) {
      set({
        user,
        role: user.role,
        token,
      });
    }
  },

  // Verificar si el usuario tiene un rol específico
  hasRole: (role: string) => {
    const state = useAuth.getState();
    return state.user?.roles?.includes(role) ?? state.user?.role === role;
  },
}));
