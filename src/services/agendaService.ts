import axios from 'axios';
import type { EntregaAgenda } from '../types/agenda';
import API_URL from './config';

const api = axios.create({ baseURL: API_URL });

api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('token') || localStorage.getItem('token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ─── Obtener entregas para la Agenda ─────────────────────────────────────────
export interface GetEntregasParams {
  fecha_inicio?: string; // YYYY-MM-DD
  fecha_fin?: string;    // YYYY-MM-DD
  estado?: string;       // coma-separado si múltiple
}

export const getEntregas = async (params?: GetEntregasParams): Promise<EntregaAgenda[]> => {
  const response = await api.get('/agenda/entregas', { params });
  return response.data.data as EntregaAgenda[];
};

// ─── Asignar / actualizar fecha de entrega en una reparación ─────────────────
export interface PatchFechaEntregaPayload {
  fecha_entrega_programada: string; // ISO datetime  e.g. "2026-05-25T14:00:00"
  nota_entrega_programada?: string;
}

export const patchFechaEntrega = async (
  reparacionId: string,
  payload: PatchFechaEntregaPayload
): Promise<void> => {
  await api.patch(`/reparaciones/${reparacionId}/fecha-entrega`, payload);
};

// ─── Eliminar fecha de entrega programada ────────────────────────────────────
export const deleteFechaEntrega = async (reparacionId: string): Promise<void> => {
  await api.delete(`/reparaciones/${reparacionId}/fecha-entrega`);
};
