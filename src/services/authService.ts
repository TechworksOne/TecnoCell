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
    role: string;
    roles: string[];
    perfil: {
      nombres?: string;
      apellidos?: string;
      foto_perfil?: string | null;
    } | null;
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

      let data: LoginResponse | ApiError;

      try {
        data = await response.json();
      } catch {
        throw new Error('Respuesta inválida del servidor');
      }

      if (!response.ok) {
        const error = data as ApiError;
        throw new Error(error.message || 'Error al iniciar sesión');
      }

      const loginData = data as LoginResponse;

      if (!loginData.token) {
        throw new Error('El servidor no devolvió token de autenticación');
      }

      const user = loginData.user;

      /**
       * Guardar sesión en localStorage.
       * Esto es importante porque DashboardPage y otros módulos leen:
       * localStorage.getItem('token')
       */
      localStorage.setItem('token', loginData.token);
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('userName', user?.name || user?.username || user?.email || 'Usuario');
      localStorage.setItem('role', user?.role || '');

      /**
       * Limpiar sessionStorage viejo para evitar conflictos.
       */
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('user');
      sessionStorage.removeItem('userName');
      sessionStorage.removeItem('role');

      window.dispatchEvent(new Event('auth-change'));

      return loginData;
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
    localStorage.removeItem('userName');
    localStorage.removeItem('role');

    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
    sessionStorage.removeItem('userName');
    sessionStorage.removeItem('role');

    window.dispatchEvent(new Event('auth-change'));
  },

  /**
   * Obtener token almacenado
   */
  getToken(): string | null {
    return localStorage.getItem('token') || sessionStorage.getItem('token');
  },

  /**
   * Obtener usuario almacenado
   */
  getUser(): LoginResponse['user'] | null {
    const userStr = localStorage.getItem('user') || sessionStorage.getItem('user');

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