import API_URL from './config';

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: {
    id: number;
    username: string;
    name: string;
    email: string;
    role: 'admin' | 'employee';
    roles: string[];
    perfil: { nombres?: string; apellidos?: string; foto_perfil?: string | null } | null;
  };
}

export interface ApiError {
  message: string;
}

/**
 * Servicio de autenticación
 */
export const authService = {
  /**
   * Iniciar sesión
   */
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      if (!response.ok) {
        const error: ApiError = await response.json();
        throw new Error(error.message || 'Error al iniciar sesión');
      }

      const data: LoginResponse = await response.json();

      // Guardar token en localStorage
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      return data;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Error de conexión con el servidor');
    }
  },

  /**
   * Cerrar sesión
   */
  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },

  /**
   * Obtener token almacenado
   */
  getToken(): string | null {
    return localStorage.getItem('token');
  },

  /**
   * Obtener usuario almacenado
   */
  getUser(): LoginResponse['user'] | null {
    const userStr = localStorage.getItem('user');
    if (!userStr) return null;
    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  },

  /**
   * Verificar si el usuario está autenticado
   */
  isAuthenticated(): boolean {
    return !!this.getToken() && !!this.getUser();
  },
};
