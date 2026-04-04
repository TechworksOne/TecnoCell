// Configuración de la API
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// Base URL para archivos estáticos (sin el sufijo /api)
// En prod Docker con VITE_API_URL=/api → UPLOADS_BASE_URL=''
// En dev local con VITE_API_URL=http://localhost:3000/api → UPLOADS_BASE_URL='http://localhost:3000'
export const UPLOADS_BASE_URL = API_URL.replace(/\/api$/, '');

export const API_BASE_URL = API_URL;
export default API_URL;
